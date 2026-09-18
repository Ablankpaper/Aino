"""Desktop runtime repair waits for each process and propagates real failures."""

import json
import subprocess
from pathlib import Path

import pytest


HELPER = Path(__file__).resolve().parents[3] / "scripts/desktop-update/runtime-launch.ps1"


@pytest.mark.windows_only
@pytest.mark.parametrize("repair_code", [None, 0, 7])
def test_runtime_repair_precedes_update_and_propagates_failure(tmp_path, repair_code):
    root = str(tmp_path).replace("'", "''")
    helper = str(HELPER).replace("'", "''")
    repair_python = "$null" if repair_code is None else "'outside/python.exe'"
    command = f"""
        $InstallRoot = '{root}'
        $LogDir = '{root}'
        New-Item -ItemType Directory (Join-Path $InstallRoot 'hermes_cli') | Out-Null
        New-Item -ItemType File (Join-Path $InstallRoot 'hermes_cli/update_runtime_launcher.py') | Out-Null
        $script:steps = @()
        function Invoke-HermesStep([string]$Exe, [string[]]$HermesArgs, [string]$Tag) {{
            $script:steps += $Tag
            if ($Tag -eq 'runtime-prepare') {{
                @{{ repair_python = {repair_python}; cleanup = $null }} |
                    ConvertTo-Json | Set-Content -Encoding UTF8 $HermesArgs[-1]
            }}
            if ($Tag -eq 'runtime-repair') {{
                if ($Exe -ne 'outside/python.exe' -or $HermesArgs[0] -ne '-I') {{ throw 'not isolated' }}
                return @{{ Code = {repair_code or 0}; Output = 'repair result' }}
            }}
            if ($Tag -eq 'update') {{
                if ($Exe -ne 'live/python.exe' -or ($HermesArgs -join ' ') -ne '-m hermes_cli.main update') {{
                    throw 'the regular update command changed'
                }}
            }}
            return @{{ Code = 0; Output = 'step result' }}
        }}
        . '{helper}'
        $result = Invoke-HermesRuntimeUpdate 'live/python.exe' @('-m', 'hermes_cli.main', 'update')
        @{{ code = $result.Code; steps = $script:steps }} | ConvertTo-Json -Compress
    """
    result = subprocess.run(
        ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", command],
        capture_output=True, text=True, check=False, timeout=30,
    )
    assert result.returncode == 0, result.stdout + result.stderr
    expected = ["runtime-prepare"]
    if repair_code is not None:
        expected.append("runtime-repair")
    if not repair_code:
        expected.append("update")
    assert json.loads(result.stdout) == {"code": repair_code or 0, "steps": expected}
