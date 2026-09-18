# The live-venv preparation process must finish before the external repair starts.
function Invoke-HermesRuntimeUpdate([string]$PythonExe, [string[]]$UpdateArgs) {
    $helper = Join-Path $InstallRoot "hermes_cli\update_runtime_launcher.py"
    if (-not (Test-Path -LiteralPath $helper)) {
        return Invoke-HermesStep $PythonExe $UpdateArgs "update"
    }
    $planPath = Join-Path $LogDir ("runtime-repair-" + [guid]::NewGuid().ToString("N") + ".json")
    $plan = $null
    try {
        $prepared = Invoke-HermesStep $PythonExe @(
            "-m", "hermes_cli.update_runtime_launcher", "prepare", "--python", $PythonExe, "--output", $planPath
        ) "runtime-prepare"
        if ($prepared.Code -ne 0) { return $prepared }
        $plan = Get-Content -LiteralPath $planPath -Raw -Encoding UTF8 | ConvertFrom-Json
        if ($plan.repair_python) {
            # -I prevents inherited PYTHONPATH/PYTHONHOME from loading native
            # modules from the live venv into the external repair process.
            $repaired = Invoke-HermesStep $plan.repair_python @(
                "-I", "-m", "hermes_cli.update_runtime_launcher", "repair"
            ) "runtime-repair"
            if ($repaired.Code -ne 0) { return $repaired }
        }
    } finally {
        if ($plan -and $plan.cleanup) {
            Remove-Item -LiteralPath $plan.cleanup -Recurse -Force -ErrorAction SilentlyContinue
        }
        Remove-Item -LiteralPath $planPath -Force -ErrorAction SilentlyContinue
    }
    return Invoke-HermesStep $PythonExe $UpdateArgs "update"
}
