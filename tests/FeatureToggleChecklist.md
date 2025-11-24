# Feature Toggle 測試清單

此清單為 Feature Toggle（功能開關）測試範本，涵蓋 On / Off / 切換期間 / 漸進放行等情境，並提供可執行的案例範例。

## 1. Toggle 清單（範例）
- `checkout_v2` — 新的結帳流程（影響支付 API、order schema）
- `seat_map_v2` — 新座位圖顯示與互動行為
- `ENABLE_CHECKOUT_TIMER` — 在結帳顯示倒數計時器

## 2. 通用測試項目（每個 toggle 必做）
- Default state：驗證預設值（部署或重啟後）
- On-state 功能驗證：功能應正常運作（功能驗證 + metrics）
- Off-state fallback 驗證：應走舊流程或隱藏 UI
- 切換期間（Transaction）：在進行中切換，檢查資料一致性與 duplicate 風險
- Gradual rollout / Segmentation：驗證只對目標群生效
- Dependency/Interaction：多個 toggle 交互情境（A on & B off 等）
- Metrics & Telemetry：確認開關狀態有正確上報使用率/錯誤率
- Security / Auth：確認開啟新功能不會繞過授權

## 3. 範例測試案例：`checkout_v2`

Case A — Off（舊流程）
- Preconditions: `checkout_v2` = Off; payment sandbox enabled
- Steps:
  1. Login as test_user_A
  2. Select ticket and proceed to checkout
  3. Complete payment via sandbox
  4. Verify order and emails
- Expected:
  - System uses legacy checkout endpoint
  - Order created in DB with legacy schema
  - No `checkout_v2` metrics or logs
  - Pass if HTTP 200, DB order row exists, email queued

Case B — On（新流程）
- Preconditions: `checkout_v2` = On for test_user_B
- Steps:
  1. Login as test_user_B
  2. Checkout using same steps
  3. Inspect API calls, DB order schema, and metrics
- Expected:
  - New API endpoint invoked
  - New DB fields populated
  - Metric `checkout_v2_usage` increments

Case C — Transaction switch（切換期間）
- Preconditions: `checkout_v2` = On
- Steps:
  1. Start checkout and submit payment (simulate delay)
  2. While awaiting payment confirmation, flip `checkout_v2` to Off
  3. Complete payment callbacks
  4. Verify order final state and duplicates
- Expected:
  - No duplicate orders
  - Transaction either completes successfully or fails safely with a retryable error

Case D — Gradual rollout / Segmentation
- Preconditions: Toggle enabled for 50% rollout or specific group
- Steps:
  1. Attempt checkout with multiple test users
  2. Verify only targeted users hit new flow
- Expected:
  - New flow only for targeted users; others use legacy flow

## 4. 實作與自動化建議
- 自動化工具：Playwright（E2E）、Cypress（Browser）、Postman / Newman（API）
- Toggle 設定方法：若有 Admin API，可在測試前透過 API 設定 toggle；否則使用環境變數或測試配置檔
- 在 CI：把 On/Off 測試加入 PR gate 的 smoke tests（兩個小測試：Off 路徑與 On 路徑）

## 5. 記錄範例（測試報表）
- 撰寫測試日誌，包含：測試時間、執行者、Toggle key、環境、Steps、Observed result、Status、Artifacts（logs、request traces、DB checks）

---

使用提示：把每次測試結果回填到 `tests/TestMatrix.md` 對應的 Feature 行，並針對有問題的案例建立 issue 並標記為 Blocker（若為安全或資料一致性問題）。
