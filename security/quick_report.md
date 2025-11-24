# Security Quick Report (快速安全掃描報告範本)

此檔為當日快速安全掃描與檢查的報告範本，方便 Tester 在短時內產出可交付的安全摘要。

## 1. 報告摘要
- 報告日期：
- 掃描人員：
- 目標分支 / 環境：

## 2. 工具與指令
- 依賴性掃描（Node）：`npm audit --json > .reports/npm_audit.json`
- 依賴性掃描（Python）：`pip-audit --format=json > .reports/pip_audit.json`
- SAST（Semgrep）：`semgrep --config auto ./ > .reports/semgrep_report.txt`
- ESLint（若適用）：`npm run lint --if-present > .reports/eslint.txt`

## 3. 重要發現（High / Critical）
- [ ] 無

列出發現的高風險問題（每項包含：檔案/套件、風險等級、簡述、再現步驟、建議處理）。

## 4. 手動檢測結果
- Auth / Authorization (IDOR / role checks): PASS/FAIL
- Token / Session 流程: PASS/FAIL
- Input Validation (簡易 XSS / SQLi 測試): PASS/FAIL
- Logging (PII): PASS/FAIL

## 5. 結論與建議
- 立即處理（Blocker）:
- 優先處理（High）:
- 監控/可延後（Medium/Low）:

## 6. 附件與原始輸出
- `.reports/npm_audit.json`
- `.reports/pip_audit.json`
- `.reports/semgrep_report.txt`
- `.reports/eslint.txt`

---
填寫說明：請把工具輸出的原始檔案附上（或放到 CI artifacts），並在「重要發現」填寫具體條目與優先順序。
