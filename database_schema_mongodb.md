# TixMaster MongoDB Schema 設計

## 核心 Collections

### 1. users (使用者)
```javascript
{
  _id: ObjectId("..."),  // MongoDB 自動生成
  email: "user@example.com",  // 唯一索引
  password_hash: "bcrypt_hashed_password",
  name: "使用者姓名",
  phone: "0912345678",
  created_at: ISODate("2025-11-24T08:00:00Z"),
  updated_at: ISODate("2025-11-24T08:00:00Z"),
  
  // 嵌入式：登入 sessions（可選）
  sessions: [
    {
      session_token: "unique_token",
      ip_address: "192.168.1.1",
      user_agent: "Mozilla/5.0...",
      expires_at: ISODate("2025-11-25T08:00:00Z"),
      created_at: ISODate("2025-11-24T08:00:00Z")
    }
  ],
  
  // 嵌入式：OAuth 帳號（可選）
  oauth_accounts: [
    {
      provider: "google",  // 'google', 'facebook', 'line'
      provider_user_id: "123456789",
      access_token: "encrypted_token",
      refresh_token: "encrypted_refresh_token",
      token_expires_at: ISODate("2025-11-24T09:00:00Z"),
      created_at: ISODate("2025-11-24T08:00:00Z")
    }
  ]
}

// 索引
db.users.createIndex({ email: 1 }, { unique: true })
db.users.createIndex({ "sessions.session_token": 1 })
db.users.createIndex({ "sessions.expires_at": 1 })
```

---

### 2. events (活動)
```javascript
{
  _id: ObjectId("..."),
  title: "Neon Dreams 演唱會",
  description: "體驗未來音樂的視聽饗宴...",
  event_date: ISODate("2025-12-15T11:00:00Z"),
  location: "台北 Cyber Arena",
  image_url: "https://...",
  status: "published",  // 'draft', 'published', 'sold_out', 'cancelled'
  created_at: ISODate("2025-11-24T08:00:00Z"),
  updated_at: ISODate("2025-11-24T08:00:00Z"),
  
  // 嵌入式：票種資訊
  tickets: [
    {
      ticket_id: ObjectId("..."),
      ticket_type: "一般票",
      price: 2500,
      total_quantity: 1000,
      available_quantity: 850,
      created_at: ISODate("2025-11-24T08:00:00Z")
    },
    {
      ticket_id: ObjectId("..."),
      ticket_type: "VIP票",
      price: 5000,
      total_quantity: 100,
      available_quantity: 30,
      created_at: ISODate("2025-11-24T08:00:00Z")
    }
  ]
}

// 索引
db.events.createIndex({ status: 1 })
db.events.createIndex({ event_date: 1 })
db.events.createIndex({ "tickets.ticket_id": 1 })
```

---

### 3. orders (訂單)
```javascript
{
  _id: ObjectId("..."),
  order_number: "TM20251124-001",  // 唯一
  
  // 引用：使用者
  user_id: ObjectId("..."),  // 引用 users._id
  user_snapshot: {  // 冗餘資料，避免 JOIN
    name: "使用者姓名",
    email: "user@example.com"
  },
  
  // 引用：活動
  event_id: ObjectId("..."),  // 引用 events._id
  event_snapshot: {  // 冗餘資料
    title: "Neon Dreams 演唱會",
    event_date: ISODate("2025-12-15T11:00:00Z"),
    location: "台北 Cyber Arena"
  },
  
  // 引用：票種
  ticket_id: ObjectId("..."),
  ticket_snapshot: {  // 冗餘資料
    ticket_type: "一般票",
    price: 2500
  },
  
  quantity: 2,
  total_amount: 5000,
  status: "paid",  // 'pending', 'paid', 'cancelled', 'expired'
  payment_method: "信用卡",
  
  created_at: ISODate("2025-11-24T08:00:00Z"),
  paid_at: ISODate("2025-11-24T08:05:00Z"),
  expired_at: ISODate("2025-11-24T08:10:00Z"),  // 建立後 10 分鐘
  
  // 嵌入式：票券明細
  order_items: [
    {
      item_id: ObjectId("..."),
      ticket_code: "TM-ABC123",
      qr_code: "data:image/png;base64,...",
      status: "valid",  // 'valid', 'used', 'cancelled'
      used_at: null
    },
    {
      item_id: ObjectId("..."),
      ticket_code: "TM-ABC124",
      qr_code: "data:image/png;base64,...",
      status: "valid",
      used_at: null
    }
  ]
}

// 索引
db.orders.createIndex({ order_number: 1 }, { unique: true })
db.orders.createIndex({ user_id: 1 })
db.orders.createIndex({ event_id: 1 })
db.orders.createIndex({ status: 1 })
db.orders.createIndex({ created_at: 1 })
db.orders.createIndex({ "order_items.ticket_code": 1 }, { unique: true })
```

---

### 4. waiting_queue (等待隊列)
```javascript
{
  _id: ObjectId("..."),
  session_id: "unique_session_id",  // 唯一
  user_id: ObjectId("..."),  // 可選
  event_id: ObjectId("..."),  // 可選
  queue_position: 42,
  status: "waiting",  // 'waiting', 'processing', 'completed'
  created_at: ISODate("2025-11-24T08:00:00Z"),
  expires_at: ISODate("2025-11-24T08:10:00Z")
}

// 索引
db.waiting_queue.createIndex({ session_id: 1 }, { unique: true })
db.waiting_queue.createIndex({ event_id: 1 })
db.waiting_queue.createIndex({ status: 1 })
db.waiting_queue.createIndex({ expires_at: 1 })  // TTL 索引，自動刪除過期文件
```

---

### 5. feature_flags (功能開關)
```javascript
{
  _id: ObjectId("..."),
  flag_key: "ENABLE_CHECKOUT_TIMER",  // 唯一
  flag_value: true,
  description: "結帳倒數計時器",
  updated_at: ISODate("2025-11-24T08:00:00Z")
}

// 索引
db.feature_flags.createIndex({ flag_key: 1 }, { unique: true })
```

---

### 6. analytics_events (分析數據)
```javascript
{
  _id: ObjectId("..."),
  user_id: ObjectId("..."),  // 可選
  session_id: "session_token",
  event_type: "page_view",  // 'page_view', 'button_click', 'purchase'
  event_data: {  // 彈性結構
    page: "/events/1",
    button_id: "buy_button",
    custom_field: "any_value"
  },
  feature_flags: {  // 當時的功能開關狀態
    ENABLE_CHECKOUT_TIMER: true,
    ENABLE_VIEWING_COUNT: true
  },
  created_at: ISODate("2025-11-24T08:00:00Z")
}

// 索引
db.analytics_events.createIndex({ user_id: 1 })
db.analytics_events.createIndex({ event_type: 1 })
db.analytics_events.createIndex({ created_at: 1 })
```

---

## MongoDB 設計原則

### 1. 嵌入 vs 引用

#### 🟢 使用嵌入式（Embedded）
- **一對一關係**
- **一對少量關係**（例如：使用者的 2-3 個 sessions）
- **資料不常變動**
- **總是一起查詢的資料**

**範例：** `users` 集合中嵌入 `sessions` 陣列

#### 🟡 使用引用（Reference）
- **一對多關係**（數量不確定）
- **多對多關係**
- **資料經常變動**
- **資料量大**

**範例：** `orders` 引用 `user_id` 和 `event_id`

---

### 2. 資料冗餘（Denormalization）

MongoDB 鼓勵適度的資料冗餘，避免過多的 JOIN 查詢：

```javascript
// ✅ 好的做法：在 orders 中儲存 user_snapshot
{
  user_id: ObjectId("..."),
  user_snapshot: {  // 冗餘，但避免每次都要 JOIN users
    name: "使用者姓名",
    email: "user@example.com"
  }
}

// ❌ 不好的做法：完全正規化（需要多次查詢）
{
  user_id: ObjectId("...")  // 每次都要去 users 查詢
}
```

---

### 3. TTL 索引（自動刪除過期資料）

```javascript
// 過期的 session 自動刪除
db.users.createIndex(
  { "sessions.expires_at": 1 },
  { expireAfterSeconds: 0 }
)

// 過期的等待隊列自動刪除
db.waiting_queue.createIndex(
  { "expires_at": 1 },
  { expireAfterSeconds: 0 }
)
```

---

### 4. 交易（Transactions）

MongoDB 4.0+ 支援多文件交易：

```javascript
// 購票時需要交易，確保庫存和訂單一致
const session = client.startSession();
try {
  session.startTransaction();
  
  // 1. 扣除票券庫存
  await db.events.updateOne(
    { _id: eventId, "tickets.ticket_id": ticketId },
    { $inc: { "tickets.$.available_quantity": -quantity } },
    { session }
  );
  
  // 2. 建立訂單
  await db.orders.insertOne(orderData, { session });
  
  await session.commitTransaction();
} catch (error) {
  await session.abortTransaction();
  throw error;
} finally {
  session.endSession();
}
```

---

## SQL vs MongoDB 比較

| 功能 | SQL | MongoDB |
|-----|-----|---------|
| **Schema 彈性** | ❌ 固定，需要 migration | ✅ 彈性，可以不同結構 |
| **JOIN 查詢** | ✅ 強大 | ⚠️ 支援但效能較差 |
| **交易支援** | ✅ 完整 ACID | ⚠️ 有但較受限 |
| **水平擴展** | ⚠️ 較困難 | ✅ 容易 (Sharding) |
| **查詢速度** | ✅ 複雜查詢快 | ✅ 簡單查詢極快 |
| **學習曲線** | 陡峭 | 較平緩 |

---

## 建議

**使用 SQL 如果：**
- ✅ 需要複雜的關聯查詢
- ✅ 資料結構固定且複雜
- ✅ 需要嚴格的 ACID 交易
- ✅ 團隊熟悉 SQL

**使用 MongoDB 如果：**
- ✅ 需要快速開發和迭代
- ✅ 資料結構可能變動
- ✅ 需要水平擴展
- ✅ 主要是簡單的 CRUD 操作
- ✅ 處理大量非結構化資料

**對於 TixMaster：**
建議使用 **PostgreSQL**，因為：
1. 票券系統需要嚴格的交易控制（防止超賣）
2. 複雜的訂單關聯查詢
3. 資料結構相對固定
