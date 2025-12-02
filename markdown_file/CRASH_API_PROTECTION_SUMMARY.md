# 🛡️ Crash API 環境保護實作總結

## ✅ 已完成的修改

### 1. **修改 server.js**

**檔案**: `backend/server.js` (第 195-236 行)

**核心邏輯**:
```javascript
app.post('/api/crash', (req, res) => {
    const isProduction = process.env.NODE_ENV === 'production';
    const crashApiEnabled = process.env.ENABLE_CRASH_API === 'true';

    // 生產環境且未明確啟用時，拒絕請求
    if (isProduction && !crashApiEnabled) {
        logger.warn('🚫 Crash API blocked in production', {
            endpoint: '/api/crash',
            environment: process.env.NODE_ENV,
            ip: req.ip
        });

        return res.status(403).json({
            error: 'Forbidden',
            message: 'Crash API is disabled in production environment'
        });
    }

    // 原有的 crash 邏輯...
});
```

---

### 2. **更新 .env 檔案**

**檔案**: `backend/.env`

**新增的環境變數**:
```bash
# === 環境設定 ===
NODE_ENV=development

# === Crash API 設定 ===
ENABLE_CRASH_API=false
```

---

### 3. **更新 .env.example**

**檔案**: `backend/.env.example`

加入完整的說明和範例值，方便團隊成員使用。

---

### 4. **建立部署指南**

**檔案**: `markdown_file/DEPLOYMENT_ENV_GUIDE.md`

包含：
- Railway、Render、Heroku、Docker、K8s 的設定方式
- 測試方法
- 故障排除
- 部署檢查清單

---

## 🔒 保護機制說明

### 環境變數控制邏輯

| 情境 | NODE_ENV | ENABLE_CRASH_API | 結果 |
|------|----------|-----------------|------|
| **本地開發** | `development` | 任意 | ✅ 允許 crash |
| **測試環境** | `test` | 任意 | ✅ 允許 crash |
| **生產環境（正常）** | `production` | `false` 或未設定 | ❌ **禁止 crash** |
| **生產環境（測試監控）** | `production` | `true` | ✅ 允許 crash |

---

## 🌐 部署平台設定

### Railway

```bash
# Dashboard 或 CLI 設定
NODE_ENV=production
ENABLE_CRASH_API=false
```

### Render

```bash
# Dashboard 設定
Key: NODE_ENV, Value: production
Key: ENABLE_CRASH_API, Value: false
```

### Heroku

```bash
heroku config:set NODE_ENV=production
heroku config:set ENABLE_CRASH_API=false
```

### Docker Compose

```yaml
environment:
  - NODE_ENV=production
  - ENABLE_CRASH_API=false
```

---

## 🧪 測試方法

### 測試 1: 開發環境（應該允許）

```bash
# 本地 .env
NODE_ENV=development
ENABLE_CRASH_API=false

# 測試
curl -X POST http://localhost:3000/api/crash

# 預期：伺服器會 crash 並重啟 ✅
```

---

### 測試 2: 生產環境（應該禁止）

```bash
# 部署環境設定
NODE_ENV=production
ENABLE_CRASH_API=false

# 測試
curl -X POST https://your-app.railway.app/api/crash

# 預期回應：
{
  "error": "Forbidden",
  "message": "Crash API is disabled in production environment",
  "hint": "This endpoint is only available in development or when ENABLE_CRASH_API=true"
}

# HTTP 狀態碼：403 Forbidden ✅
```

---

### 測試 3: 檢查日誌

被阻擋時會記錄警告：
```json
{
  "level": "warn",
  "message": "🚫 Crash API blocked in production",
  "endpoint": "/api/crash",
  "method": "POST",
  "environment": "production",
  "ip": "192.168.1.100",
  "timestamp": "2025-11-30T12:00:00.000Z"
}
```

---

## 📊 實際效果

### ❌ 修改前（不安全）

```bash
# 任何人都可以在生產環境觸發
curl -X POST https://your-production-app.com/api/crash

# 結果：
✗ 伺服器 crash
✗ 服務中斷 2-5 秒
✗ 可能造成 DoS 攻擊
```

---

### ✅ 修改後（安全）

```bash
# 生產環境被保護
curl -X POST https://your-production-app.com/api/crash

# 結果：
{
  "error": "Forbidden",
  "message": "Crash API is disabled in production environment"
}

✓ 請求被拒絕
✓ 服務正常運行
✓ 日誌記錄嘗試
✓ 防止 DoS 攻擊
```

---

## 🚀 部署到 Railway 的步驟

### 方法 1: Railway Dashboard

1. 登入 Railway → 選擇你的 Project
2. 點擊 **Variables** 標籤
3. 加入環境變數：
   ```
   NODE_ENV = production
   ENABLE_CRASH_API = false
   ```
4. 點擊 **Deploy** 或等待自動部署

### 方法 2: Railway CLI

```bash
# 設定環境變數
railway variables set NODE_ENV=production
railway variables set ENABLE_CRASH_API=false

# 驗證設定
railway variables

# 重新部署
railway up
```

### 驗證部署

```bash
# 測試 crash API 是否被阻擋
curl -X POST https://tixmaster-production.up.railway.app/api/crash

# 應該收到 403 Forbidden
```

---

## 🔍 故障排除

### 問題 1: 本地開發環境也被阻擋了

**原因**: `.env` 中誤設 `NODE_ENV=production`

**解決方案**:
```bash
# 檢查 backend/.env
cat backend/.env | grep NODE_ENV

# 應該是 development
NODE_ENV=development

# 重啟服務
npm restart
```

---

### 問題 2: 生產環境還是可以被觸發

**原因**: 環境變數未正確設定

**解決方案**:
```bash
# Railway
railway variables

# 檢查輸出，應該包含：
# NODE_ENV=production
# ENABLE_CRASH_API=false

# 如果沒有，重新設定
railway variables set NODE_ENV=production
railway variables set ENABLE_CRASH_API=false
```

---

### 問題 3: 不確定目前的保護狀態

**建議**:

可以加入一個狀態檢查端點（可選）：

```javascript
// 在 server.js 加入
app.get('/api/crash/status', (req, res) => {
    const isProduction = process.env.NODE_ENV === 'production';
    const crashApiEnabled = process.env.ENABLE_CRASH_API === 'true';

    res.json({
        environment: process.env.NODE_ENV,
        crashApiEnabled: crashApiEnabled,
        isProtected: isProduction && !crashApiEnabled,
        message: isProduction && !crashApiEnabled
            ? 'Crash API is protected ✓'
            : 'Crash API is accessible ⚠'
    });
});
```

測試：
```bash
curl https://your-app.com/api/crash/status

# 回應：
{
  "environment": "production",
  "crashApiEnabled": false,
  "isProtected": true,
  "message": "Crash API is protected ✓"
}
```

---

## 📋 部署檢查清單

部署前：
- [x] ✅ 修改 `server.js` 加入環境變數檢查
- [x] ✅ 更新 `.env` 加入 `NODE_ENV` 和 `ENABLE_CRASH_API`
- [x] ✅ 更新 `.env.example` 加入說明
- [ ] ⏳ 在本地測試保護機制

部署到 Railway：
- [ ] ⏳ 設定 `NODE_ENV=production`
- [ ] ⏳ 設定 `ENABLE_CRASH_API=false`
- [ ] ⏳ 部署應用
- [ ] ⏳ 測試 crash API 被阻擋
- [ ] ⏳ 檢查日誌

---

## 📚 相關文件

| 文件 | 說明 |
|------|------|
| [DEPLOYMENT_ENV_GUIDE.md](DEPLOYMENT_ENV_GUIDE.md) | 完整的部署環境變數設定指南 |
| [CRASH_API_ANALYSIS.md](CRASH_API_ANALYSIS.md) | Crash API 完整分析 |
| [CRASH_API_USAGE.md](CRASH_API_USAGE.md) | 使用指南與測試方法 |

---

## 🎯 總結

### 修改前的風險

- 🔴 **高風險**: 任何人都可以在生產環境觸發 crash
- 🔴 **DoS 攻擊**: 惡意使用者可重複呼叫造成服務中斷
- 🔴 **資料遺失**: 進行中的交易可能被中斷

### 修改後的保護

- ✅ **環境隔離**: 生產環境預設禁用
- ✅ **明確控制**: 需要明確設定才能啟用
- ✅ **審計日誌**: 所有嘗試都被記錄
- ✅ **友善錯誤**: 清楚告知為何被拒絕

### 最佳實踐

| 環境 | 建議設定 |
|------|---------|
| **本地開發** | `NODE_ENV=development`, `ENABLE_CRASH_API=false` |
| **CI/CD** | `NODE_ENV=test`, `ENABLE_CRASH_API=false` |
| **Staging** | `NODE_ENV=production`, `ENABLE_CRASH_API=false` |
| **Production** | `NODE_ENV=production`, `ENABLE_CRASH_API=false` ⭐ |

---

## 💡 下一步

1. ✅ **立即**: 本地測試修改是否正常運作
2. ✅ **今天**: 部署到 Railway 並驗證保護機制
3. ✅ **本週**: 通知團隊成員新的環境變數設定
4. ✅ **持續**: 監控日誌，確保沒有誤觸發

---

**實作完成時間**: 2025-11-30
**負責人**: TixMaster DevOps Team
**狀態**: ✅ 已實作，待部署驗證
