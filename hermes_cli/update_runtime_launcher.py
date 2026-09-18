"""Prepare an external runtime-repair process before Windows starts its updater.

The preparer must exit before the repair starts: waiting here would keep the live
venv's python.exe mapped and make the transactional directory swap impossible.
"""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import tempfile
from pathlib import Path

from hermes_constants import venv_python_path
from hermes_cli.sqlite_runtime import isolated_interpreter_env, probe_sqlite_runtime


def prepare_runtime_repair(live_python: Path, project_root: Path) -> dict:
    info = probe_sqlite_runtime(live_python)
    if info is None:
        raise RuntimeError(f"Could not inspect SQLite in {live_python}")
    if not info.wal_reset_vulnerable:
        return {"repair_python": None, "cleanup": None}

    from hermes_cli.managed_uv import ensure_uv, managed_python_env

    uv = ensure_uv()
    if not uv:
        raise RuntimeError("Managed uv is unavailable for external runtime repair")
    base = subprocess.run(
        [str(live_python), "-I", "-c", "import sys; print(sys._base_executable)"],
        env=isolated_interpreter_env(), capture_output=True, text=True,
        check=True, timeout=30,
    )
    base_python = Path(base.stdout.strip()).resolve()
    live = live_python.parent.parent.resolve()
    if not base_python.is_file() or base_python.is_relative_to(live):
        raise RuntimeError("The base interpreter is missing or still inside the live venv")
    if not (project_root / "uv.lock").is_file():
        raise RuntimeError("Cannot prepare the updater without uv.lock")

    runtime_root = project_root / ".hermes-runtime"
    runtime_root.mkdir(parents=True, exist_ok=True)
    temporary = Path(tempfile.mkdtemp(prefix="updater-", dir=runtime_root))
    runner = temporary / "venv"
    python = venv_python_path(runner)
    env = managed_python_env(project_root)
    env.pop("UV_MANAGED_PYTHON", None)
    env.update({"UV_PROJECT_ENVIRONMENT": str(runner), "UV_PYTHON_DOWNLOADS": "never"})
    try:
        print("Preparing an external environment for SQLite runtime repair...", flush=True)
        subprocess.run(
            [str(uv), "venv", str(runner), "--python", str(base_python),
             "--no-python-downloads", "--no-config"],
            cwd=project_root, env=env, check=True, stderr=subprocess.STDOUT,
        )
        # Keep the project's lock and exclude-newer policy; only its core dependencies
        # are needed to import the existing updater and its process-holder checks.
        env.pop("UV_NO_CONFIG", None)
        subprocess.run(
            [str(uv), "sync", "--locked", "--no-dev", "--python", str(python)],
            cwd=project_root, env=env, check=True, stderr=subprocess.STDOUT,
        )
        return {"repair_python": str(python), "cleanup": str(temporary)}
    except BaseException:
        shutil.rmtree(temporary)
        raise


def repair_runtime(project_root: Path) -> None:
    # The normal updater owns process-holder detection. Import it in this external
    # environment so psutil and other native modules cannot pin the live venv.
    import hermes_cli.main  # noqa: F401
    from hermes_cli.managed_uv import repair_vulnerable_runtime, resolve_uv

    uv = resolve_uv()
    if not uv:
        raise RuntimeError("Managed uv disappeared before runtime repair")
    result = repair_vulnerable_runtime(uv, project_root=project_root)
    if result.status not in {"safe", "repaired"}:
        raise RuntimeError(f"SQLite runtime repair incomplete: {result.status}: {result.detail}")
    info = probe_sqlite_runtime(venv_python_path(project_root / "venv"))
    if info is None or info.wal_reset_vulnerable:
        raise RuntimeError("The repaired live venv did not pass SQLite verification")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    prepare = sub.add_parser("prepare")
    prepare.add_argument("--python", required=True, type=Path)
    prepare.add_argument("--output", required=True, type=Path)
    sub.add_parser("repair")
    args = parser.parse_args()
    project_root = Path(__file__).resolve().parents[1]
    if args.command == "prepare":
        result = prepare_runtime_repair(args.python, project_root)
        args.output.write_text(json.dumps(result), encoding="utf-8")
    else:
        repair_runtime(project_root)


if __name__ == "__main__":
    main()
