"""Real Windows executable locks must be released before transactional venv cutover."""

import site
import subprocess
import venv
from pathlib import Path

import pytest

from hermes_cli.managed_uv import _cut_over_candidate
from hermes_cli.sqlite_runtime import probe_sqlite_runtime
from hermes_constants import venv_python_path


@pytest.mark.windows_only
def test_external_process_can_cut_over_only_after_live_interpreter_exits(tmp_path):
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
        [str(venv_python_path(live)), "-I", "-c",
         "import sys; print('ready', flush=True); sys.stdin.read()"],
        stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True,
    )
    try:
        assert holder.stdout.readline().strip() == "ready"
        changed, backup, _, detail = _cut_over_candidate(candidate, project_root=root, live=live)
        assert not changed and backup is None and "park" in detail
        assert sentinel.exists() and candidate.exists()
    finally:
        holder.communicate(timeout=15)

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
