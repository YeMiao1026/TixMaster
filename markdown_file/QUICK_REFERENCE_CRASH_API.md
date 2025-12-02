# 🚀 Crash API 快速參考

## 📌 一分鐘了解

### 問題
- ❌ 原本任何人都可以在生產環境觸發 `/api/crash`
- ❌ 可能造成 DoS 攻擊

### 解決方案
- ✅ 使用環境變數 `NODE_ENV` 和 `ENABLE_CRASH_API` 控制
- ✅ 生產環境預設禁用

---

## ⚙️ 環境變數設定

### 開發環境（本地）
```bash
NODE_ENV=development
ENABLE_CRASH_API=false  # 任意值都可觸發
```

### 生產環境（Railway/Render）
```bash
NODE_ENV=production      # ⭐ 重要！
ENABLE_CRASH_API=false   # ⭐ 重要！
```

---

## 🧪 快速測試

### 測試保護是否生效

```bash
# 生產環境應該被阻擋
curl -X POST https://your-app.railway.app/api/crash

# 預期回應：403 Forbidden
{
  "error": "Forbidden",
  "message": "Crash API is disabled in production environment"
}
```

### 測試開發環境

```bash
# 本地應該可以觸發
curl -X POST http://localhost:3000/api/crash

# 預期：伺服器 crash 並自動重啟
```

---

## 🚀 Railway 部署設定

### 方法 1: Dashboard
1. Railway Dashboard → Variables
2. 加入：
   - `NODE_ENV` = `production`
   - `ENABLE_CRASH_API` = `false`
3. 部署

### 方法 2: CLI
```bash
railway variables set NODE_ENV=production
railway variables set ENABLE_CRASH_API=false
railway up
```

---

## 📋 檢查清單

部署前：
- [ ] 本地測試保護機制
- [ ] 確認 `.env` 有 `NODE_ENV=development`

部署後：
- [ ] Railway Variables 設定 `NODE_ENV=production`
- [ ] Railway Variables 設定 `ENABLE_CRASH_API=false`
- [ ] 測試 crash API 被阻擋（收到 403）
- [ ] 檢查日誌確認警告訊息

---

## 🔗 詳細文件

- 📖 [DEPLOYMENT_ENV_GUIDE.md](markdown_file/DEPLOYMENT_ENV_GUIDE.md) - 完整部署指南
- 📊 [CRASH_API_PROTECTION_SUMMARY.md](markdown_file/CRASH_API_PROTECTION_SUMMARY.md) - 實作總結
- 🔍 [CRASH_API_ANALYSIS.md](markdown_file/CRASH_API_ANALYSIS.md) - 完整分析

---

**快速參考版本**: 1.0
**最後更新**: 2025-11-30
