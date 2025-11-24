<#
Setup-Venv.ps1
用途：在 repo 根目錄建立或重新建立 Python virtual environment（`.venv`），並安裝 semgrep 與 pip-audit

使用方式（在 repo 根目錄執行）：
  pwsh> .\scripts\setup_venv.ps1            # 建立（如不存在則建立）
  pwsh> .\scripts\setup_venv.ps1 -Recreate  # 強制刪除並重新建立 .venv

此腳本會：
- 嘗試尋找系統上的 Python（`python`、`py -3`、`python3`）
- 若指定 `-Recreate`，會刪除現有的 `.venv` 再建立新的
- 安裝 `semgrep` 與 `pip-audit` 到 `.venv` 中
#>

Param(
    [switch]$Recreate
)

Write-Output "[INFO] Setting up Python virtual environment in ./.venv"

$root = Get-Location
$venvPath = Join-Path -Path $root -ChildPath ".venv"

# Locate a usable Python executable (try python, py, python3)
$pythonCandidates = @("python", "py -3", "python3")
$pythonExe = $null
foreach ($cand in $pythonCandidates) {
    try {
        $parts = $cand -split ' '
        if ($parts.Length -gt 1) {
            $cmd = $parts[0]
            $args = $parts[1..($parts.Length - 1)] -join ' '
            $check = Get-Command $cmd -ErrorAction SilentlyContinue
            if ($check) {
                # test running version
                $ver = & $cmd $args --version 2>&1
                if ($ver) { $pythonExe = "$cmd $args"; break }
            }
        } else {
            $check = Get-Command $cand -ErrorAction SilentlyContinue
            if ($check) {
                $ver = & $cand --version 2>&1
                if ($ver) { $pythonExe = $cand; break }
            }
        }
    } catch { }
}

if (-not $pythonExe) {
    Write-Error "[ERROR] No Python executable found. Please install Python 3 and ensure 'python' or 'py' is on PATH."
    Write-Output "[INFO] Diagnostic commands you can run:" 
    Write-Output "  Get-Command python; Get-Command py; python --version; py -3 --version"
    exit 1
}

Write-Output "[INFO] Using Python: $pythonExe"

if (Test-Path $venvPath) {
    if ($Recreate) {
        Write-Output "[INFO] Recreate requested. Removing existing .venv..."
        try {
            Remove-Item -LiteralPath $venvPath -Recurse -Force -ErrorAction Stop
            Write-Output "[INFO] Removed existing .venv"
        } catch {
            Write-Error "[ERROR] Failed to remove existing .venv: $_"
            exit 1
        }
    } else {
        Write-Output "[INFO] .venv already exists. Skipping creation."
    }
}

if (-not (Test-Path $venvPath)) {
    Write-Output "[INFO] Creating venv..."
    try {
        # Use the selected python executable to create the venv
        & $pythonExe -m venv $venvPath
        Write-Output "[INFO] venv created at $venvPath"
    } catch {
        Write-Error "[ERROR] Failed to create venv using '$pythonExe'. Ensure Python is functional. Error: $_"
        exit 1
    }
}

# Determine venv python path (Windows path)
$pyExePath = Join-Path -Path $venvPath -ChildPath "Scripts\python.exe"
if (-not (Test-Path $pyExePath)) {
    Write-Error "[ERROR] Python executable inside venv not found at $pyExePath"
    exit 1
}

Write-Output "[INFO] Upgrading pip inside venv"
& $pyExePath -m pip install --upgrade pip | Out-Null

Write-Output "[INFO] Installing semgrep and pip-audit inside venv"
try {
    & $pyExePath -m pip install semgrep pip-audit | Out-Null
    Write-Output "[INFO] Installed semgrep and pip-audit"
} catch {
    Write-Output "[WARN] Failed to install some packages: $_"
}

Write-Output "[INFO] Setup complete. To use the venv in PowerShell run:"
Write-Output "  .\.venv\Scripts\Activate.ps1"
Write-Output "[INFO] Or run tools directly via the venv python executable, e.g.:"
Write-Output "  .\.venv\Scripts\python.exe -m semgrep --config auto ./"
Write-Output "  .\.venv\Scripts\python.exe -m pip_audit --format=json > .reports/pip_audit.json"

if (Test-Path "package.json") {
    Write-Output "[INFO] package.json found. To install Node deps locally (no global), run in repo root: npm ci or npm install --no-audit"
} else {
    Write-Output "[INFO] No package.json found. Skipping Node guidance."
}
