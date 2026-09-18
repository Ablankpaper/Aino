"""The desktop supervisor releases the old interpreter before runtime repair."""

from pathlib import Path
from types import SimpleNamespace
import json
import shutil
import subprocess
import venv

import pytest

from hermes_cli import update_runtime_launcher as launcher


def test_safe_runtime_keeps_the_live_update_path(tmp_path, monkeypatch):
    monkeypatch.setattr(
        launcher, "probe_sqlite_runtime", lambda _: SimpleNamespace(wal_reset_vulnerable=False)
    )
    monkeypatch.setattr(
        launcher.subprocess, "run", lambda *a, **kw: pytest.fail("safe runtime needs no staging")
    )

    assert launcher.prepare_runtime_repair(tmp_path / "venv/python", tmp_path) == {
        "repair_python": None, "cleanup": None,
    }
    assert not (tmp_path / ".hermes-runtime").exists()


@pytest.mark.parametrize("sync_fails", [False, True])
def test_vulnerable_runtime_stages_outside_live_and_preserves_it(tmp_path, monkeypatch, sync_fails):
    from hermes_cli import managed_uv

    live = tmp_path / "venv"
    live.mkdir()
    sentinel = live / "untouched"
    sentinel.write_text("live", encoding="utf-8")
    base = tmp_path / "base-python"
    base.touch()
    (tmp_path / "uv.lock").touch()
    monkeypatch.setattr(
        launcher, "probe_sqlite_runtime", lambda _: SimpleNamespace(wal_reset_vulnerable=True)
    )
    monkeypatch.setattr(managed_uv, "ensure_uv", lambda: "uv")
    monkeypatch.setenv("PYTHONPATH", str(live))
    monkeypatch.setenv("VIRTUAL_ENV", str(live))
    staged = []

    def run(command, **kwargs):
        if "sys._base_executable" in command[-1]:
            return SimpleNamespace(stdout=str(base) + "\n")
        environment = Path(kwargs["env"]["UV_PROJECT_ENVIRONMENT"])
        assert not environment.is_relative_to(live)
        assert "PYTHONPATH" not in kwargs["env"]
        assert "VIRTUAL_ENV" not in kwargs["env"]
        if command[1] == "venv":
            environment.mkdir()
            staged.append(environment)
        elif command[1] == "sync":
            assert "--locked" in command
            assert "UV_NO_CONFIG" not in kwargs["env"]
            if sync_fails:
                raise subprocess.CalledProcessError(3, command)
        else:
            pytest.fail(f"unexpected operation {command}")
        return SimpleNamespace(returncode=0)

    monkeypatch.setattr(launcher.subprocess, "run", run)
    if sync_fails:
        with pytest.raises(subprocess.CalledProcessError):
            launcher.prepare_runtime_repair(live / "Scripts/python.exe", tmp_path)
        assert not staged[0].exists()
    else:
        plan = launcher.prepare_runtime_repair(live / "Scripts/python.exe", tmp_path)
        assert Path(plan["repair_python"]).is_relative_to(staged[0])
        assert staged[0].is_relative_to(Path(plan["cleanup"]))
    assert sentinel.read_text(encoding="utf-8") == "live"


@pytest.mark.parametrize("status", ["skipped", "failed", "repaired"])
def test_external_repair_requires_a_verified_safe_live_runtime(tmp_path, monkeypatch, status):
    import hermes_cli.main  # noqa: F401
    from hermes_cli import managed_uv

    monkeypatch.setattr(managed_uv, "resolve_uv", lambda: "uv")
    monkeypatch.setattr(
        managed_uv, "repair_vulnerable_runtime",
        lambda *a, **kw: SimpleNamespace(status=status, detail="test failure"),
    )
    monkeypatch.setattr(
        launcher, "probe_sqlite_runtime", lambda _: SimpleNamespace(wal_reset_vulnerable=True)
    )
    with pytest.raises(RuntimeError):
        launcher.repair_runtime(tmp_path)
    if status == "repaired":
        monkeypatch.setattr(
            launcher, "probe_sqlite_runtime", lambda _: SimpleNamespace(wal_reset_vulnerable=False)
        )
        launcher.repair_runtime(tmp_path)


def test_real_uv_preparation_keeps_the_live_interpreter_out_of_the_runner(tmp_path, monkeypatch):
    from hermes_cli import managed_uv

    uv = shutil.which("uv")
    if uv is None:
        pytest.skip("uv is required for the isolated-environment integration probe")
    live = tmp_path / "venv"
    venv.EnvBuilder(with_pip=False).create(live)
    (tmp_path / "pyproject.toml").write_text(
        '[project]\nname = "runtime-repair-probe"\nversion = "0.0.0"\n'
        'requires-python = ">=3.11"\n[tool.uv]\npackage = false\n', encoding="utf-8",
    )
    subprocess.run([uv, "lock", "--offline"], cwd=tmp_path, check=True, capture_output=True)
    # This is input data for the preparation decision; the OS and both Python
    # processes remain real, and no runtime replacement is attempted here.
    monkeypatch.setattr(
        launcher, "probe_sqlite_runtime", lambda _: SimpleNamespace(wal_reset_vulnerable=True)
    )
    monkeypatch.setattr(managed_uv, "ensure_uv", lambda: uv)
    plan = launcher.prepare_runtime_repair(launcher.venv_python_path(live), tmp_path)
    try:
        result = subprocess.run(
            [plan["repair_python"], "-I", "-c",
             "import json, sys; print(json.dumps(dict(prefix=sys.prefix, path=sys.path)))"],
            text=True, capture_output=True, check=True,
        )
        actual = json.loads(result.stdout)
        assert Path(actual["prefix"]).is_relative_to(Path(plan["cleanup"]))
        assert all(not Path(p).is_relative_to(live) for p in actual["path"])
        assert launcher.venv_python_path(live).exists()
    finally:
        shutil.rmtree(plan["cleanup"])
