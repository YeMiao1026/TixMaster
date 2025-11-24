# Test Matrix 範本

此檔為測試矩陣（Test Matrix）範本，請用於追蹤所有測試案例、優先順序與接受準則。可直接複製表格列到 CSV 或測試管理工具中。

欄位說明：
- Feature：功能名稱（例：Checkout）
- Component：組件/層級（Frontend / API / DB / Auth / Payment）
- Test Type：Unit / Integration / E2E / Manual / Security / Performance
- Priority：High / Medium / Low
- Preconditions：測試前置條件（資料、Toggle 狀態、mock）
- Steps：測試步驟（簡要列點）
- Expected：預期結果（明確可判定）
- Toggle State：Feature Toggle 狀態（On / Off / Gradual）
- Test Data：測試帳號、票種、卡號（若有）
- Owner：負責人
- Status：Not started / In progress / Passed / Failed

---

## Markdown 範例表格
| Feature | Component | Test Type | Priority | Preconditions | Steps | Expected | Toggle State | Test Data | Owner | Status |
|---|---|---:|---:|---|---|---|---|---|---|---|
| Checkout | API+Frontend | E2E | High | payment sandbox on; test user exists | 1. Login 2. Select ticket 3. Checkout 4. Verify order | HTTP 200; DB order row; email queued | checkout_v2 = Off | test_user_A, test_card | ww123 | Not started |
| Login | Auth | Integration | High | user account exists | 1. POST /login 2. receive token | 200 + JWT contains uid claim | none | test_user_A | ww123 | Passed |
| Seat Map | Frontend | Manual | Medium | seat data exists | 1. Open event page 2. Verify seat map renders | seat map visible; correct availability | seat_map_v2 = On | none | Alice | In progress |
| Order Query | API | Integration | Medium | existing order id | 1. GET /orders/{id} | returns correct order JSON | none | order123 | Bob | Not started |
| Refund | API | E2E | Medium | paid order exists | 1. POST /refund 2. check refund status | refund initiated; DB refunded flag set | refund_v2 = Off | order456 | Carol | Not started |

---

## CSV 範例（可匯入測試管理系統）
Feature,Component,Test Type,Priority,Preconditions,Steps,Expected,Toggle State,Test Data,Owner,Status
Checkout,API+Frontend,E2E,High,"payment sandbox on; test user exists","1. Login;2. Select ticket;3. Checkout;4. Verify order","HTTP 200; DB order row; email queued",checkout_v2=Off,"test_user_A;test_card",ww123,Not started

---

使用指南：
- 把各功能填入此矩陣，並在每次執行時更新 `Status` 與 `Expected` 的實際結果。若發現 Blocker（Security / High CVE / Authorization bypass），立即建立 issue 並標為 Blocker。
