# Security Scans — README

此 README 說明 `security/` 與 `scripts/` 內檔案的用途、如何執行，以及每個腳本在做什麼，方便 Tester / Dev 在本地或 CI 上快速執行。

檔案列表
- `security/quick_report.md`：快速安全掃描報告範本。
- `security/checklist.md`：當日可執行的安全檢查清單。
- `scripts/run_security_scans.ps1`：Windows PowerShell 腳本，執行依賴性掃描與 SAST（Semgrep、ESLint）並輸出到 `.reports/`。

如何使用（本地快速執行）
1. 開啟 PowerShell 並切到 repo 根目錄（`c:\Users\User\TixMaster`）。
2. 若尚未安裝需要工具，可先安裝（視專案語言）：

```powershell
# 範例：安裝 semgrep 與 pip-audit（若使用 Python）
pip install --user semgrep pip-audit
npm install --no-audit   # 若為 Node 專案
```

3. 建立並使用 Python 虛擬環境（建議，避免污染全域環境）

建議先建立虛擬環境並在其中安裝 Semgrep / pip-audit。專案內已提供方便的腳本：

```powershell
# 在 repo 根目錄執行（會建立 .venv 並安裝 semgrep 與 pip-audit）
.\scripts\setup_venv.ps1
```

建立完畢後，你可以使用下列命令直接在 venv 中執行檢查（不需手動 Activate）：

```powershell
# 直接透過 venv 的 python 執行 semgrep
.\.venv\Scripts\python.exe -m semgrep --config auto ./ > .reports/semgrep_report.txt

# pip-audit（注意在某些系統，套件名稱可為 pip_audit 或 pip-audit）
.\.venv\Scripts\python.exe -m pip_audit --format=json > .reports/pip_audit.json
```

4. 執行自動掃描腳本（會產生 `.reports/` 目錄並放入輸出）：

```powershell
.\scripts\run_security_scans.ps1
```

腳本會嘗試做的事情（行為說明）
- 建立 `.reports/` 目錄以儲存所有工具輸出檔案。
- 檢查 `package.json`：若存在，則執行 `npm install --no-audit`（如未安裝依賴可能導致 audit 失敗），然後執行 `npm audit --json` 並將結果寫入 `.reports/npm_audit.json`。
- 檢查 Python 樣態（`requirements.txt` 或 `pyproject.toml`）：若存在，會嘗試執行 `pip-audit` 並把結果寫入 `.reports/pip_audit.json`。
- 嘗試執行 `semgrep --config auto ./` 並把輸出寫入 `.reports/semgrep_report.txt`（若 semgrep 可用）。
- 若專案有 `npm run lint`，會嘗試執行並輸出 `.reports/eslint.txt`。
- 每個階段腳本都會捕捉錯誤並在 console 顯示簡短摘要（實際原始輸出仍保存在 `.reports/`）。

補充說明
- 若 CI 已有 Snyk / Dependabot 等自動化工具，請參考其結果作為主資料來源；此腳本為本地快速評估工具。
- 對於 DAST（OWASP ZAP）或滲透測試，請在 staging 環境並排程執行，因為需要被掃描的 endpoint 與憑證。

如果你需要，我可以把腳本改成更保守（只輸出存在工具的結果），或增加 GitHub Actions 範例 workflow。
