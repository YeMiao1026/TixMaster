# TixMaster - Hypothesis-Driven Development (HDD) 實作文檔

## 📋 目錄
- [專案概述](#專案概述)
- [商業假設](#商業假設)
- [Feature Toggles 架構](#feature-toggles-架構)
- [測試流程](#測試流程)
- [數據收集與分析](#數據收集與分析)
- [決策流程](#決策流程)

---

## 專案概述

TixMaster 是一個售票平台，透過 **Hypothesis-Driven Development (HDD)** 方法論來驗證產品假設，並根據數據做出產品決策。

### HDD 核心原則

1. **提出假設** - 基於用戶行為和商業目標
2. **設計實驗** - 使用 Feature Toggles 進行 A/B 測試
3. **收集數據** - 追蹤關鍵指標
4. **分析結果** - 數據驅動決策
5. **採取行動** - 保留、調整或捨棄功能

---

## 商業假設

### Hypothesis 1: Urgency Tactic (急迫感設計)

#### 💡 假設陳述
**「若在結帳頁面加入『倒數計時器』，將能製造稀缺感，進而提升用戶的結帳完成率。」**

#### 📊 關鍵指標 (Metric)
- **Primary Metric**: Payment Completion Rate (付款完成率)
  - 定義: 進入結帳頁面後成功完成付款的比例
  - 計算公式: `(完成付款人數 / 進入結帳頁人數) × 100%`

#### 🚩 Feature Toggle
- **Key**: `ENABLE_CHECKOUT_TIMER`
- **Description**: "Hypothesis 1: Urgency Tactic"

#### 🎯 成功標準
- 付款完成率提升 **≥ 10%**
- 結帳放棄率降低 **≥ 15%**
- 平均結帳時間縮短

#### 📈 預期結果
- **Control Group** (無倒數計時): 基準完成率 ~60%
- **Treatment Group** (有倒數計時): 目標完成率 ≥70%

#### 🔍 追蹤事件
```javascript
// 顯示倒數計時器
trackAnalytics('checkout_timer_shown', {
    eventId,
    quantity,
    totalAmount
});

// 用戶嘗試付款
trackAnalytics('payment_attempted', {
    eventId,
    quantity,
    totalAmount,
    timeSpent,
    hasTimer: true/false
});

// 付款完成
trackAnalytics('payment_completed', {
    eventId,
    quantity,
    totalAmount,
    timeSpent,
    hasTimer: true/false,
    paymentMethod
});

// 結帳逾時
trackAnalytics('checkout_timeout', {
    eventId,
    quantity,
    totalAmount,
    timeSpent: 900 // 15分鐘
});

// 放棄結帳
trackAnalytics('checkout_abandoned', {
    eventId,
    quantity,
    totalAmount,
    timeSpent,
    hasTimer: true/false
});
```

---

### Hypothesis 2: Social Proof (社交證明)

#### 💡 假設陳述
**「若在活動頁顯示『當前瀏覽人數』，利用從眾心理 (FOMO)，將能提升購票按鈕的點擊率。」**

#### 📊 關鍵指標 (Metric)
- **Primary Metric**: "Buy Now" Button Click-Through Rate (CTR)
  - 定義: 瀏覽活動頁面後點擊購票按鈕的比例
  - 計算公式: `(點擊購票按鈕人數 / 瀏覽活動頁人數) × 100%`

#### 🚩 Feature Toggle
- **Key**: `ENABLE_VIEWING_COUNT`
- **Description**: "Hypothesis 2: Social Proof"

#### 🎯 成功標準
- 購票按鈕 CTR 提升 **≥ 15%**
- 每活動頁面停留時間增加
- 跳出率降低

#### 📈 預期結果
- **Control Group** (無瀏覽人數): 基準 CTR ~8%
- **Treatment Group** (有瀏覽人數): 目標 CTR ≥9.2%

#### 🔍 追蹤事件
```javascript
// 進入活動頁面
trackAnalytics('event_page_view', {
    eventId,
    viewingCountShown: true/false
});

// 顯示瀏覽人數
trackAnalytics('viewing_count_displayed', {
    eventId,
    viewingCount: 127
});

// 點擊購票按鈕
trackAnalytics('buy_now_clicked', {
    eventId,
    quantity,
    viewingCountShown: true/false
});

// 離開活動頁面
trackAnalytics('event_page_exit', {
    eventId,
    timeSpent,
    viewingCountShown: true/false,
    purchased: true/false
});
```

---

## Feature Toggles 架構

### 系統組成

```
┌─────────────────────────────────────────────┐
│          PostgreSQL Database                │
│       feature_flags table                   │
│  (flag_key, flag_value, description)        │
└──────────────┬──────────────────────────────┘
               │
               ├──────────────┬───────────────┐
               │              │               │
               ▼              ▼               ▼
         ┌──────────┐  ┌──────────┐  ┌──────────┐
         │ Backend  │  │ Frontend │  │  Admin   │
         │   API    │  │   SDK    │  │Dashboard │
         └──────────┘  └──────────┘  └──────────┘
```

### 前端實作

#### 1. event-detail.html (活動詳情頁)
```javascript
// 檢查 ENABLE_VIEWING_COUNT
if (FeatureFlags.isEnabled('ENABLE_VIEWING_COUNT')) {
    showViewingCount();
} else {
    hideViewingCount();
}
```

#### 2. checkout.html (結帳頁面)
```javascript
// 檢查 ENABLE_CHECKOUT_TIMER
if (FeatureFlags.isEnabled('ENABLE_CHECKOUT_TIMER')) {
    startCountdownTimer();
}
```

### 後端實作

#### 1. Feature Flags API
- `GET /api/feature-flags` - 取得所有功能開關
- `GET /api/feature-flags/:key` - 取得單一功能開關
- `PUT /api/feature-flags/:key` - 更新功能開關 (管理員)

#### 2. Feature Flags Middleware
```javascript
// 每個請求都附加 feature flags
app.use(featureFlagsMiddleware.attachFeatureFlags);

// 在路由中使用
router.get('/some-route', (req, res) => {
    if (req.featureFlags.isEnabled('ENABLE_NEW_FEATURE')) {
        // 新功能邏輯
    } else {
        // 舊功能邏輯
    }
});
```

---

## 測試流程

### 階段 1: 準備期 (1 週)

1. **確認指標定義**
   - 定義 Payment Completion Rate
   - 定義 Buy Now CTR
   - 設定 Analytics 事件追蹤

2. **技術準備**
   - 部署 Feature Toggles 系統
   - 測試前後端整合
   - 驗證 Analytics 數據收集

3. **建立基準線 (Baseline)**
   - 收集 7 天的基準數據
   - 計算當前的完成率和 CTR
   - 記錄用戶行為模式

### 階段 2: 實驗期 (2-4 週)

#### Hypothesis 1 測試計畫

| 日期 | 狀態 | 說明 |
|------|------|------|
| Week 1 | Control (0%) | 所有用戶都看不到倒數計時器 |
| Week 2 | Treatment A (25%) | 25% 用戶看到倒數計時器 |
| Week 3 | Treatment B (50%) | 50% 用戶看到倒數計時器 |
| Week 4 | Treatment C (100%) | 所有用戶都看到倒數計時器 |

#### Hypothesis 2 測試計畫

| 日期 | 狀態 | 說明 |
|------|------|------|
| Week 1 | Control (0%) | 所有用戶都看不到瀏覽人數 |
| Week 2 | Treatment A (50%) | 50% 用戶看到瀏覽人數 |
| Week 3 | Treatment B (100%) | 所有用戶都看到瀏覽人數 |

### 階段 3: 分析期 (1 週)

1. **數據收集**
   - 從 `analytics_events` 表格匯出數據
   - 計算各組別的指標
   - 進行統計顯著性檢定

2. **結果分析**
   - 比較 Control vs Treatment 組
   - 計算提升幅度 (Lift %)
   - 檢查是否達成功標準

3. **決策制定**
   - 根據數據決定是否保留功能
   - 撰寫實驗報告
   - 規劃下一步行動

---

## 數據收集與分析

### SQL 查詢範例

#### 1. 計算 Payment Completion Rate

```sql
-- Hypothesis 1: 付款完成率
WITH checkout_sessions AS (
    SELECT
        session_id,
        (feature_flags->>'ENABLE_CHECKOUT_TIMER')::boolean as has_timer
    FROM analytics_events
    WHERE event_type = 'checkout_timer_shown'
      OR event_type = 'payment_attempted'
    GROUP BY session_id, feature_flags
),
payment_results AS (
    SELECT
        session_id,
        MAX(CASE WHEN event_type = 'payment_completed' THEN 1 ELSE 0 END) as completed
    FROM analytics_events
    GROUP BY session_id
)
SELECT
    c.has_timer,
    COUNT(*) as total_sessions,
    SUM(p.completed) as completed_payments,
    ROUND(SUM(p.completed)::decimal / COUNT(*) * 100, 2) as completion_rate
FROM checkout_sessions c
LEFT JOIN payment_results p ON c.session_id = p.session_id
GROUP BY c.has_timer;
```

**預期輸出:**
```
has_timer | total_sessions | completed_payments | completion_rate
----------|----------------|-------------------|----------------
false     | 1000           | 600               | 60.00
true      | 1000           | 720               | 72.00
```

#### 2. 計算 Buy Now CTR

```sql
-- Hypothesis 2: 購票按鈕點擊率
WITH page_views AS (
    SELECT
        session_id,
        (feature_flags->>'ENABLE_VIEWING_COUNT')::boolean as viewing_count_shown
    FROM analytics_events
    WHERE event_type = 'event_page_view'
),
button_clicks AS (
    SELECT
        session_id,
        MAX(CASE WHEN event_type = 'buy_now_clicked' THEN 1 ELSE 0 END) as clicked
    FROM analytics_events
    GROUP BY session_id
)
SELECT
    pv.viewing_count_shown,
    COUNT(*) as total_views,
    SUM(bc.clicked) as button_clicks,
    ROUND(SUM(bc.clicked)::decimal / COUNT(*) * 100, 2) as ctr
FROM page_views pv
LEFT JOIN button_clicks bc ON pv.session_id = bc.session_id
GROUP BY pv.viewing_count_shown;
```

**預期輸出:**
```
viewing_count_shown | total_views | button_clicks | ctr
--------------------|-------------|--------------|------
false               | 5000        | 400          | 8.00
true                | 5000        | 480          | 9.60
```

#### 3. 計算 Lift (提升幅度)

```sql
-- 計算相對提升
WITH metrics AS (
    SELECT
        has_feature,
        completion_rate
    FROM (
        -- 你的指標查詢...
    ) t
)
SELECT
    (treatment_rate - control_rate) / control_rate * 100 as lift_percentage
FROM (
    SELECT
        MAX(CASE WHEN has_feature = false THEN completion_rate END) as control_rate,
        MAX(CASE WHEN has_feature = true THEN completion_rate END) as treatment_rate
    FROM metrics
) t;
```

---

## 決策流程

### 決策樹

```
收集數據 2-4 週
    │
    ├─► 計算指標
    │       │
    │       ├─► Lift ≥ 目標 + 統計顯著
    │       │       │
    │       │       ├─► ✅ 保留功能
    │       │       │      ├─► 移除 Feature Toggle
    │       │       │      └─► 成為永久功能
    │       │       │
    │       │       └─► Lift < 目標 或 不顯著
    │       │              │
    │       │              ├─► 🔄 調整設計
    │       │              │      ├─► 修改參數 (如: 20分鐘計時器)
    │       │              │      └─► 重新測試
    │       │              │
    │       │              └─► ❌ 捨棄功能
    │       │                     └─► 停用 Feature Toggle
    │       │
    │       └─► 收集更多數據
    │
    └─► 產生實驗報告
```

### 決策標準

#### ✅ 保留功能的條件
1. Lift ≥ 目標提升幅度
2. 統計顯著性 (p-value < 0.05)
3. 樣本數足夠 (n ≥ 1000 per group)
4. 沒有負面影響 (如: 用戶抱怨增加)

#### 🔄 調整功能的條件
1. Lift 接近目標但未達標 (如: +8% vs 目標 +10%)
2. 用戶反饋正面但數據不夠強
3. 特定用戶群組表現良好

#### ❌ 捨棄功能的條件
1. Lift ≤ 0% (無改善或負面影響)
2. 實作成本高但效果不佳
3. 用戶反饋負面

---

## 實驗報告範本

### Hypothesis 1: Urgency Tactic 實驗報告

#### 實驗設計
- **測試期間**: 2025-XX-XX ~ 2025-XX-XX (4 週)
- **Control Group**: 無倒數計時器 (n=5000)
- **Treatment Group**: 有倒數計時器 (n=5000)

#### 結果

| 指標 | Control | Treatment | Lift | p-value |
|------|---------|-----------|------|---------|
| Payment Completion Rate | 60.0% | 72.0% | **+20.0%** | < 0.001 |
| Avg. Checkout Time | 8.5 min | 6.2 min | **-27.1%** | < 0.001 |
| Checkout Abandonment | 40.0% | 28.0% | **-30.0%** | < 0.001 |

#### 結論
✅ **保留功能** - 倒數計時器顯著提升付款完成率 20%，遠超目標 10%。

#### 下一步
1. 移除 `ENABLE_CHECKOUT_TIMER` Feature Toggle
2. 將倒數計時器設為預設功能
3. 監控長期指標變化

---

## 管理介面

### Admin Dashboard

1. **開啟管理後台**: [admin-dashboard.html](admin-dashboard.html)
2. **登入管理員帳號**: admin / admin123
3. **功能開關管理區塊**:
   - 切換 `ENABLE_CHECKOUT_TIMER`
   - 切換 `ENABLE_VIEWING_COUNT`
   - 查看最後更新時間

### 測試頁面

1. **測試工具**: [test-feature-flags.html](test-feature-flags.html)
2. **自動化測試**: `node test-toggle.js`
3. **結帳測試**: [checkout.html](checkout.html?eventId=1&quantity=2)

---

## 最佳實踐

### 1. Feature Toggle 生命週期

```
創建 → 測試 → 部署 → 監控 → 決策 → 清理
```

- **創建**: 在資料庫中新增 flag
- **測試**: 在測試環境驗證
- **部署**: 逐步推出 (0% → 25% → 50% → 100%)
- **監控**: 持續追蹤指標
- **決策**: 根據數據做決定
- **清理**: 移除不再需要的 toggle

### 2. 命名規範

```
ENABLE_<FEATURE_NAME>
```

例如:
- `ENABLE_CHECKOUT_TIMER`
- `ENABLE_VIEWING_COUNT`
- `ENABLE_NEW_PAYMENT_METHOD`

### 3. 文檔化

每個 Feature Toggle 都應該有:
- 清楚的假設陳述
- 明確的成功指標
- 預期的測試時長
- 負責人和截止日期

### 4. 定期清理

每個月檢查並清理:
- 已決策的 toggle (保留或捨棄)
- 超過 3 個月的 toggle
- 沒有追蹤數據的 toggle

---

## 相關資源

- [Feature Flags Guide](FEATURE_FLAGS_GUIDE.md) - 完整的 Feature Flags 使用指南
- [Usage Examples](backend/FEATURE_FLAGS_USAGE_EXAMPLES.md) - 實作範例
- [Test Toggle Script](test-toggle.js) - 自動化測試腳本

---

## 總結

透過 **Hypothesis-Driven Development** 和 **Feature Toggles**，TixMaster 能夠:

1. ✅ 快速驗證商業假設
2. ✅ 基於數據做產品決策
3. ✅ 降低新功能風險
4. ✅ 持續優化用戶體驗
5. ✅ 提升商業指標 (完成率、CTR)

記住: **"In God we trust, all others must bring data."** - W. Edwards Deming
