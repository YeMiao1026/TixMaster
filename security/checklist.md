# Security Checklist（快速檢查清單）

此清單為短時間（當日）可執行的安全檢查項目，優先檢查高風險區塊。

## 高優先（當日必做）
- [ ] 依賴性掃描（Node / Python）並記錄 High/Critical
- [ ] Semgrep/ESLint 快速 SAST 掃描（針對 `auth/`, `payment/`, `api/`）
- [ ] 檢查是否有硬編碼密鑰或敏感字串（repo grep / git-secrets）
- [ ] 手動授權測試：IDOR（嘗試存取別人的訂單）
- [ ] 檢查日誌：確認不紀錄信用卡、密碼等敏感資料
- [ ] 檢查配置：TLS、CORS、secure cookie、secure headers

## 中優先（若時間允許）
- [ ] 基本輸入驗證測試（XSS、簡單 SQLi payload）
- [ ] 檢查 JWT / session 的失效與重放情境
- [ ] 檢查 rate limiting 與 brute-force 防護

## 低優先（延後或交給 infra/安全團隊）
- [ ] DAST（OWASP ZAP）全面掃描於 staging
- [ ] 專業滲透測試 / PCI 合規測試

每項檢查完成後，將結果填入 `security/quick_report.md`，並把 High/Critical 的發現建立為 issue 並指派給相對的負責人。
