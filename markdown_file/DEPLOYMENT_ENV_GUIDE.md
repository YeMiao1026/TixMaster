# 🚀 部署環境變數設定指南

## 📋 Crash API 環境保護說明

為了防止在生產環境被惡意觸發 `/api/crash` 端點，我們已經實作了**環境變數保護機制**。

---

## 🔒 保護機制

### 邏輯說明

```javascript
const isProduction = process.env.NODE_ENV === 'production';
const crashApiEnabled = process.env.ENABLE_CRASH_API === 'true';

if (isProduction && !crashApiEnabled) {
    // 拒絕請求，回傳 403 Forbidden
    return res.status(403).json({
        error: 'Forbidden',
        message: 'Crash API is disabled in production environment'
    });
}
```

### 行為矩陣

| NODE_ENV | ENABLE_CRASH_API | 是否允許 crash |
|----------|-----------------|--------------|
| `development` | 任何值 | ✅ 允許 |
| `production` | `true` | ✅ 允許（需明確設定） |
| `production` | `false` 或未設定 | ❌ **禁止** |
| `test` | 任何值 | ✅ 允許 |

---

## 🌐 各部署平台設定

### 1️⃣ Railway 部署

#### 方法 A: 透過 Dashboard 設定（推薦）

1. 前往 Railway Dashboard
2. 選擇你的 Project
3. 點擊 **Variables** 標籤
4. 加入以下環境變數：

```bash
NODE_ENV=production
ENABLE_CRASH_API=false
```

5. 點擊 **Deploy** 重新部署

#### 方法 B: 使用 Railway CLI

```bash
# 設定環境變數
railway variables set NODE_ENV=production
railway variables set ENABLE_CRASH_API=false

# 重新部署
railway up
```

#### 驗證設定

```bash
# 測試是否被阻擋
curl -X POST https://your-app.railway.app/api/crash

# 預期回應：
{
  "error": "Forbidden",
  "message": "Crash API is disabled in production environment",
  "hint": "This endpoint is only available in development or when ENABLE_CRASH_API=true"
}
```

---

### 2️⃣ Render 部署

#### 設定步驟

1. 前往 Render Dashboard
2. 選擇你的 Web Service
3. 點擊 **Environment** 標籤
4. 加入環境變數：

```bash
Key: NODE_ENV
Value: production

Key: ENABLE_CRASH_API
Value: false
```

5. 點擊 **Save Changes**（會自動觸發重新部署）

#### 使用 render.yaml（Infrastructure as Code）

```yaml
# render.yaml
services:
  - type: web
    name: tixmaster-backend
    env: node
    buildCommand: npm install
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: ENABLE_CRASH_API
        value: false
      - key: DATABASE_URL
        fromDatabase:
          name: tixmaster-db
          property: connectionString
```

---

### 3️⃣ Heroku 部署

```bash
# 使用 Heroku CLI 設定
heroku config:set NODE_ENV=production
heroku config:set ENABLE_CRASH_API=false

# 檢查設定
heroku config

# 查看日誌
heroku logs --tail
```

---

### 4️⃣ Docker / Docker Compose

#### docker-compose.yml

```yaml
version: '3.8'

services:
  backend:
    image: tixmaster:latest
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - ENABLE_CRASH_API=false
      - DATABASE_URL=${DATABASE_URL}
      - JWT_SECRET=${JWT_SECRET}
    restart: unless-stopped
```

#### 使用 .env 檔案

```bash
# .env.production
NODE_ENV=production
ENABLE_CRASH_API=false
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-key
```

啟動：
```bash
docker-compose --env-file .env.production up -d
```

---

### 5️⃣ Kubernetes

#### ConfigMap

```yaml
# k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: tixmaster-config
data:
  NODE_ENV: "production"
  ENABLE_CRASH_API: "false"
```

#### Deployment

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: tixmaster-backend
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: backend
        image: tixmaster:latest
        ports:
        - containerPort: 3000
        envFrom:
        - configMapRef:
            name: tixmaster-config
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: tixmaster-secrets
              key: database-url
```

部署：
```bash
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/deployment.yaml
```

---

## 🧪 測試環境保護

### 1. 本地開發環境（應該可以觸發）

```bash
# .env
NODE_ENV=development
ENABLE_CRASH_API=false  # 即使是 false，開發環境仍可觸發

# 測試
curl -X POST http://localhost:3000/api/crash

# 預期：伺服器會 crash 並重啟
```

### 2. 生產環境（應該被阻擋）

```bash
# 生產環境設定
NODE_ENV=production
ENABLE_CRASH_API=false

# 測試
curl -X POST https://your-production-url.com/api/crash

# 預期：收到 403 Forbidden
{
  "error": "Forbidden",
  "message": "Crash API is disabled in production environment"
}
```

### 3. 生產環境強制啟用（謹慎使用）

```bash
# 只在需要測試監控系統時使用
NODE_ENV=production
ENABLE_CRASH_API=true  # ⚠️ 危險！

# 測試
curl -X POST https://your-production-url.com/api/crash

# 預期：伺服器會 crash（請確保有自動重啟機制）
```

---

## 📊 日誌記錄

### 被阻擋時的日誌

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

### 允許時的日誌

```json
{
  "level": "error",
  "message": "💥 CRASH API called - Server will crash intentionally",
  "endpoint": "/api/crash",
  "method": "POST",
  "environment": "development",
  "ip": "127.0.0.1",
  "timestamp": "2025-11-30T12:00:00.000Z"
}
```

---

## 🚨 監控警報設定

建議在 Prometheus 中加入警報規則，監控 crash API 的呼叫嘗試：

```yaml
# prometheus/alerts.yml
groups:
  - name: security_alerts
    rules:
      - alert: CrashAPIBlocked
        expr: |
          increase(http_requests_total{
            route="/api/crash",
            status_code="403"
          }[5m]) > 5
        for: 1m
        labels:
          severity: warning
        annotations:
          summary: "多次嘗試呼叫 Crash API 被阻擋"
          description: "過去 5 分鐘內有 {{ $value }} 次嘗試呼叫 crash API"
```

---

## 🔧 故障排除

### 問題 1: 生產環境誤觸發 crash

**症狀**: 生產環境的應用被 crash API 觸發

**原因**:
- `NODE_ENV` 未正確設定
- `ENABLE_CRASH_API` 被誤設為 `true`

**解決方案**:
```bash
# 檢查環境變數
# Railway
railway variables

# Render
# 前往 Dashboard → Environment 檢查

# Heroku
heroku config

# 確保設定正確
NODE_ENV=production
ENABLE_CRASH_API=false
```

---

### 問題 2: 開發環境無法測試

**症狀**: 開發環境呼叫 crash API 被阻擋

**原因**: `.env` 中可能誤設 `NODE_ENV=production`

**解決方案**:
```bash
# 檢查 .env
cat backend/.env | grep NODE_ENV

# 應該是：
NODE_ENV=development

# 重啟服務
npm restart
```

---

### 問題 3: 不確定目前的保護狀態

**檢查方式**:

建立一個狀態檢查端點：

```javascript
// 在 server.js 加入
app.get('/api/crash/status', (req, res) => {
    res.json({
        environment: process.env.NODE_ENV,
        crashApiEnabled: process.env.ENABLE_CRASH_API === 'true',
        isProtected: process.env.NODE_ENV === 'production' &&
                     process.env.ENABLE_CRASH_API !== 'true'
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
  "isProtected": true  # ← 應該是 true
}
```

---

## ✅ 部署檢查清單

### 部署前檢查

- [ ] `.env.example` 已更新包含 `ENABLE_CRASH_API`
- [ ] 本地測試環境保護機制
- [ ] 確認 crash API 在開發環境可用
- [ ] Git 沒有 commit 含有敏感資訊的 `.env`

### 部署到生產環境

- [ ] 設定 `NODE_ENV=production`
- [ ] 設定 `ENABLE_CRASH_API=false`
- [ ] 測試 crash API 被正確阻擋
- [ ] 檢查日誌確認保護機制運作
- [ ] 設定監控警報

### 部署後驗證

```bash
# 1. 測試 crash API 被阻擋
curl -X POST https://your-app.com/api/crash

# 預期：403 Forbidden

# 2. 檢查狀態端點
curl https://your-app.com/api/crash/status

# 預期：isProtected: true

# 3. 檢查日誌
# 應該看到 "Crash API blocked" 的警告日誌
```

---

## 📚 相關文件

- [CRASH_API_ANALYSIS.md](CRASH_API_ANALYSIS.md) - 完整的 Crash API 分析
- [CRASH_API_USAGE.md](CRASH_API_USAGE.md) - 使用指南
- [RUNBOOK.md](RUNBOOK.md) - 故障排除手冊

---

## 🎯 總結

### ✅ 已實作的保護

1. **環境變數檢查** - `NODE_ENV === 'production'`
2. **明確啟用機制** - 需要 `ENABLE_CRASH_API=true`
3. **日誌記錄** - 所有嘗試都被記錄
4. **友善錯誤訊息** - 告知為何被阻擋

### 🔒 安全建議

| 環境 | NODE_ENV | ENABLE_CRASH_API | 說明 |
|------|----------|-----------------|------|
| **開發** | `development` | 任意 | 可自由測試 |
| **測試** | `test` | 任意 | CI/CD 測試用 |
| **生產** | `production` | `false` | ⭐ **強烈建議** |
| **生產（測試監控）** | `production` | `true` | ⚠️ 僅短期使用 |

---

**文件版本**: 1.0
**最後更新**: 2025-11-30
**維護者**: TixMaster DevOps Team
