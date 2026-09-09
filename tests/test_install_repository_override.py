"""Regression: branded desktop bootstrap must be able to select its repository.

The desktop bootstrap can download an installer from a downstream repository
and pass it a downstream branch/commit.  The installer must then clone that
same repository instead of silently falling back to the upstream Hermes URL.
This test drives the real POSIX repository stage against a local bare Git
remote, so it does not depend on GitHub or the network.
"""

from __future__ import annotations

import os
import re
import shutil
import subprocess
from pathlib import Path

import pytest


REPO_ROOT = Path(__file__).resolve().parent.parent
INSTALL_SH = REPO_ROOT / "scripts" / "install.sh"
INSTALL_PS1 = REPO_ROOT / "scripts" / "install.ps1"

pytestmark = pytest.mark.skipif(
    shutil.which("git") is None or shutil.which("bash") is None,
    reason="needs git and bash",
)


def _git(cwd: Path, *args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [
            "git",
            "-c",
            "user.email=aino-test@example.invalid",
            "-c",
            "user.name=Aino installer test",
            *args,
        ],
        cwd=cwd,
        check=True,
        capture_output=True,
        text=True,
    )


def _make_remote(tmp_path: Path) -> Path:
    seed = tmp_path / "seed"
    seed.mkdir()
    _git(seed, "init")
    (seed / "origin-marker.txt").write_text("downstream repository\n", encoding="utf-8")
    _git(seed, "add", "origin-marker.txt")
    _git(seed, "commit", "-m", "downstream installer fixture")
    _git(seed, "branch", "-M", "downstream")

    remote = tmp_path / "downstream.git"
    _git(tmp_path, "init", "--bare", str(remote))
    _git(seed, "remote", "add", "origin", str(remote))
    _git(seed, "push", "-u", "origin", "downstream")
    return remote


def test_install_sh_repository_stage_uses_explicit_repository_urls(tmp_path: Path) -> None:
    remote = _make_remote(tmp_path)
    install_dir = tmp_path / "install"
    hermes_home = tmp_path / "home"

    env = os.environ.copy()
    env.update(
        {
            "HERMES_HOME": str(hermes_home),
            "HERMES_INSTALL_DIR": str(install_dir),
            "HERMES_INSTALL_REPOSITORY_URL": str(remote),
            "HERMES_INSTALL_REPOSITORY_SSH_URL": str(remote),
        }
    )

    result = subprocess.run(
        [
            "bash",
            str(INSTALL_SH),
            "--stage",
            "repository",
            "--non-interactive",
            "--json",
            "--branch",
            "downstream",
        ],
        cwd=REPO_ROOT,
        env=env,
        capture_output=True,
        text=True,
        check=False,
    )

    assert result.returncode == 0, result.stderr + "\n" + result.stdout
    assert (install_dir / "origin-marker.txt").read_text(encoding="utf-8") == "downstream repository\n"
    assert '"ok":true' in result.stdout.splitlines()[-1]


def test_install_ps1_repository_urls_have_explicit_environment_overrides() -> None:
    """Windows bootstrap must be able to clone the branded repository too.

    PowerShell cannot run on this macOS host, so this contract test checks the
    source-level assignment that is consumed by the Windows repository stage.
    The defaults remain upstream-compatible for direct Hermes CLI installs.
    """

    text = INSTALL_PS1.read_text(encoding="utf-8")

    assert re.search(
        r'\$RepoUrlSsh\s*=\s*if\s*\(\$env:HERMES_INSTALL_REPOSITORY_SSH_URL\)'
        r'[\s\S]{0,220}?git@github\.com:NousResearch/hermes-agent\.git',
        text,
    )
    assert re.search(
        r'\$RepoUrlHttps\s*=\s*if\s*\(\$env:HERMES_INSTALL_REPOSITORY_URL\)'
        r'[\s\S]{0,220}?https://github\.com/NousResearch/hermes-agent\.git',
        text,
    )

    archive_block = re.search(
        r"# Fallback: download ZIP archive[\s\S]*?(?=\n\s*\$zipPath\s*=)",
        text,
    )
    assert archive_block is not None
    assert "$archiveRepo = $RepoUrlHttps.TrimEnd('/') -replace '\\.git$', ''" in archive_block.group(0)
    assert '"$archiveRepo/archive/$Commit.zip"' in archive_block.group(0)
    assert '"$archiveRepo/archive/refs/tags/$Tag.zip"' in archive_block.group(0)
    assert '"$archiveRepo/archive/refs/heads/$Branch.zip"' in archive_block.group(0)
