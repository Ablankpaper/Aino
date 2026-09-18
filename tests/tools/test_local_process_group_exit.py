"""Process-group cleanup must distinguish exited children from denied signals."""

import errno
import os
import shlex
import sys
import time
from types import SimpleNamespace

import psutil
import pytest

from tools.environments import local
from tools.environments.local import LocalEnvironment, _kill_process_group_posix
from tools.file_operations import ShellFileOperations


@pytest.mark.macos_only
@pytest.mark.parametrize("reap_before_cleanup", [False, True])
def test_native_search_cleans_up_exited_group(tmp_path, monkeypatch, reap_before_cleanup):
    """The search child can exit between its poll and process-group cleanup."""
    release = tmp_path / "release"
    script = (
        "import pathlib, sys, time\n"
        "print('match\\n' * 100, end='', flush=True)\n"
        "while not pathlib.Path(sys.argv[1]).exists():\n"
        "    time.sleep(0.01)\n"
    )
    env = LocalEnvironment(cwd=str(tmp_path))
    ops = ShellFileOperations(env, cwd=str(tmp_path))

    def cleanup_after_child_exit(proc):
        release.touch()
        try:
            child = psutil.Process(proc.pid)
            deadline = time.monotonic() + 5
            while child.status() != psutil.STATUS_ZOMBIE and time.monotonic() < deadline:
                time.sleep(0.01)
            assert child.status() == psutil.STATUS_ZOMBIE
            if reap_before_cleanup:
                proc.wait(timeout=5)

            _kill_process_group_posix(proc)

            assert proc.returncode == 0
            with pytest.raises(ProcessLookupError):
                os.killpg(proc.pid, 0)
        finally:
            proc.wait(timeout=5)

    monkeypatch.setattr(local, "_kill_process_group_posix", cleanup_after_child_exit)
    try:
        result = ops._run_rg_native(
            [shlex.quote(arg) for arg in (sys.executable, "-c", script, str(release))],
            fetch_limit=50, timeout=5,
        )

        assert result.exit_code == 0
        assert result.stdout.splitlines() == ["match"] * 50
    finally:
        release.touch()
        env.cleanup()


@pytest.mark.parametrize("probe_denied", [False, True])
def test_kill_process_group_preserves_denial_while_group_exists(monkeypatch, probe_denied):
    """A reaped leader does not prove that all its group members have exited."""
    proc = SimpleNamespace(pid=12345, poll=lambda: 0)
    denied = PermissionError(errno.EPERM, "signal denied")

    def killpg(pgid, sig):
        assert pgid == proc.pid
        if sig != 0 or probe_denied:
            raise denied

    monkeypatch.setattr(os, "getpgid", lambda pid: pid, raising=False)
    monkeypatch.setattr(os, "killpg", killpg, raising=False)
    monkeypatch.setattr(psutil, "Process", lambda pid: SimpleNamespace(children=lambda recursive: []))

    with pytest.raises(PermissionError) as caught:
        _kill_process_group_posix(proc)
    assert caught.value is denied
