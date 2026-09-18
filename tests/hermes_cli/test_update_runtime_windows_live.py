"""Real Windows holder policy and directory sharing constraints during venv cutover."""

import json
import site
import subprocess
import venv
from pathlib import Path

import pytest

from hermes_cli.managed_uv import _cut_over_candidate, _windows_runtime_self_lock
from hermes_cli.sqlite_runtime import probe_sqlite_runtime
from hermes_constants import venv_python_path


# A stdlib venv launcher can redirect into an external base interpreter, and its
# running image alone did not block directory rename on the Windows CI host.
# Hold the directory itself without FILE_SHARE_DELETE so the premise is explicit.
_HOLDER_CODE = r"""
import ctypes
from ctypes import wintypes
import json
from pathlib import Path
import sys
from hermes_cli.managed_uv import _windows_runtime_self_lock

kernel = ctypes.WinDLL("kernel32", use_last_error=True)
kernel.CreateFileW.argtypes = [
    wintypes.LPCWSTR, wintypes.DWORD, wintypes.DWORD, wintypes.LPVOID,
    wintypes.DWORD, wintypes.DWORD, wintypes.HANDLE,
]
kernel.CreateFileW.restype = wintypes.HANDLE
kernel.CloseHandle.argtypes = [wintypes.HANDLE]
kernel.CloseHandle.restype = wintypes.BOOL
live = Path(sys.argv[1])
handle = kernel.CreateFileW(
    str(live), 0x80000000, 0x1 | 0x2, None, 3, 0x02000000, None,
)
if handle == wintypes.HANDLE(-1).value:
    raise ctypes.WinError(ctypes.get_last_error())
try:
    print(json.dumps({
        "executable": sys.executable,
        "base_executable": sys._base_executable,
        "self_lock": _windows_runtime_self_lock(live)[0],
    }), flush=True)
    sys.stdin.read()
finally:
    kernel.CloseHandle(handle)
"""


@pytest.mark.windows_only
def test_external_cutover_waits_for_a_real_directory_holder_and_checks_sqlite(tmp_path):
    root = tmp_path / "checkout"
    live = root / "venv"
    candidate = root / ".hermes-runtime" / "venv-candidate"
    for directory in (live, candidate):
        venv.EnvBuilder(with_pip=False).create(directory)
        packages = directory / "Lib" / "site-packages"
        # Reuse the test environment's real dependencies; none live in the venv
        # being replaced. The candidate smoke still performs actual imports.
        (packages / "test-dependencies.pth").write_text(
            "\n".join([*site.getsitepackages(), str(Path(__file__).resolve().parents[2])]) + "\n",
            encoding="utf-8",
        )
    info = probe_sqlite_runtime(venv_python_path(candidate))
    assert info is not None
    sentinel = live / "old-generation"
    sentinel.touch()
    holder = subprocess.Popen(
        [str(venv_python_path(live)), "-I", "-c", _HOLDER_CODE, str(live)],
        stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True,
    )
    try:
        line = holder.stdout.readline().strip()
        assert line, holder.stderr.read()
        topology = json.loads(line)
        assert Path(topology["executable"]).is_relative_to(live), topology
        assert not Path(topology["base_executable"]).is_relative_to(live), topology
        assert topology["self_lock"] is True, topology
        assert _windows_runtime_self_lock(live) == (False, "")
        # Prove the actual Win32 sharing violation before attributing a failed
        # transactional swap to the holder rather than the later SQLite probe.
        with pytest.raises(OSError):
            live.rename(root / "premise-rename")
        changed, backup, _, detail = _cut_over_candidate(candidate, project_root=root, live=live)
        assert not changed and backup is None and "park" in detail
        assert sentinel.exists() and candidate.exists()
    finally:
        holder.communicate(timeout=15)
    assert holder.returncode == 0

    changed, backup, _, detail = _cut_over_candidate(candidate, project_root=root, live=live)
    if info.wal_reset_vulnerable:
        # Some native CI hosts have old SQLite. Releasing the OS lock must
        # still reach the safety gate and roll back, never bless that runtime.
        assert not changed and "candidate still links vulnerable SQLite" in detail
        assert sentinel.exists()
    else:
        assert changed, detail
        assert backup is not None and (backup / sentinel.name).exists()
        assert not sentinel.exists()
        assert not candidate.exists()
