## PowerShell 腳本：run_security_scans.ps1
# 作用：對 repo 進行快速的依賴性掃描與 SAST，並把輸出放到 `.reports/`。

Param()

# 建立 reports 目錄
$reportsDir = Join-Path -Path (Get-Location) -ChildPath ".reports"
if (-not (Test-Path $reportsDir)) {
    New-Item -ItemType Directory -Path $reportsDir | Out-Null
}

Write-Output "[INFO] Reports directory: $reportsDir"

function Run-IfExists([string]$checkPath, [ScriptBlock]$action, [string]$name) {
    if (Test-Path $checkPath) {
        Write-Output "[INFO] Running $name..."
        try {
            & $action
            Write-Output "[INFO] $name finished."
        } catch {
            Write-Output "[WARN] $name failed: $_"
        }
    } else {
        Write-Output "[INFO] Skipping $name (not found: $checkPath)"
    }
}

# 1) Node/npm audit
Run-IfExists -checkPath "package.json" -action { 
    Write-Output "[INFO] Running npm install --no-audit"
    try { npm install --no-audit } catch { Write-Output "[WARN] npm install failed: $_" }
    Write-Output "[INFO] Running npm audit"
    try { npm audit --json > "$reportsDir\npm_audit.json" } catch { Write-Output "[WARN] npm audit failed: $_" }
} -name "npm audit"

# 2) Python pip-audit (if requirements.txt or pyproject.toml exists)
if (Test-Path "requirements.txt" -or Test-Path "pyproject.toml") {
    Write-Output "[INFO] Attempting pip-audit..."
    try {
        pip-audit --format=json > "$reportsDir\pip_audit.json"
        Write-Output "[INFO] pip-audit output -> $reportsDir\pip_audit.json"
    } catch {
        Write-Output "[WARN] pip-audit failed or not installed: $_"
    }
} else {
    Write-Output "[INFO] No Python dependency files found. Skipping pip-audit."
}

# 3) Semgrep (SAST)
try {
    Write-Output "[INFO] Running semgrep (if installed)"
    semgrep --config auto ./ > "$reportsDir\semgrep_report.txt" 2>&1
    Write-Output "[INFO] semgrep output -> $reportsDir\semgrep_report.txt"
} catch {
    Write-Output "[WARN] semgrep not available or failed: $_"
}

# 4) ESLint (if present)
try {
    Write-Output "[INFO] Running npm run lint --if-present"
    npm run lint --if-present > "$reportsDir\eslint.txt" 2>&1
    Write-Output "[INFO] eslint output -> $reportsDir\eslint.txt"
} catch {
    Write-Output "[WARN] eslint not available or lint script failed: $_"
}

Write-Output "[INFO] Quick security scans finished. Check the .reports directory for outputs."
