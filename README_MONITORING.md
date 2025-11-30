# 📊 TixMaster 監控系統快速指南

## 🚀 快速啟動

### Windows 用戶
```bash
# 啟動監控系統
start-monitoring.bat

# 停止監控系統
stop-monitoring.bat
```

### Mac/Linux 用戶
```bash
# 啟動監控系統
docker-compose -f docker-compose.monitoring.yml up -d

# 停止監控系統
docker-compose -f docker-compose.monitoring.yml down
```

---

## 📍 存取點

| 服務 | URL | 帳號密碼 |
|------|-----|----------|
| 🎯 Backend API | http://localhost:3000 | - |
| 📈 Metrics 端點 | http://localhost:3000/metrics | - |
| 🔍 Prometheus UI | http://localhost:9091 | - |
| 📊 Grafana Dashboard | http://localhost:3001 | admin / admin |

---

## 📈 儀表板包含內容

### 🎯 第一排 - 系統健康
- **CPU 使用率**: 即時 CPU 負載
- **記憶體使用量**: 記憶體消耗
- **HTTP 請求率**: 每秒請求數

### ⚡ 第二排 - 效能分析
- **HTTP 回應時間**: P50 和 P95 百分位數
- **HTTP 錯誤率**: 4xx 和 5xx 錯誤趨勢

### 📊 第三排 - 詳細統計
- **活躍請求數**: 當前正在處理的請求
- **總請求數**: 過去 1 小時總計
- **狀態碼分佈**: 各 HTTP 狀態碼比例

---

## 🧪 測試監控系統

### 產生正常流量
```bash
curl http://localhost:3000/health
curl http://localhost:3000/api/events
```

### 產生錯誤
```bash
# 404 錯誤
curl http://localhost:3000/api/nonexistent

# 批量請求
for i in {1..50}; do curl http://localhost:3000/health; done
```

### 觸發伺服器當機（測試用）
```bash
curl -X POST http://localhost:3000/api/crash
```

---

## 📚 詳細文件

- 📖 [完整設定指南](markdown_file/MONITORING_SETUP_GUIDE.md)
- 🎨 [儀表板設計說明](markdown_file/PHASE5_DASHBOARD_DESIGN_SUMMARY.md)
- ❓ [為什麼使用 Docker](markdown_file/為何開Prometheus_and_grafana_with_DK.md)

---

## 🛠️ 疑難排解

### Prometheus 顯示 Target DOWN
```bash
# 1. 確認 backend 正在運行
curl http://localhost:3000/metrics

# 2. 檢查 Docker 容器日誌
docker logs tixmaster-prometheus
```

### Grafana 沒有數據
```bash
# 1. 檢查 Prometheus 是否收集到數據
# 前往 http://localhost:9091/graph
# 執行查詢: http_requests_total

# 2. 產生一些流量
curl http://localhost:3000/health
```

### 重啟監控系統
```bash
docker-compose -f docker-compose.monitoring.yml restart
```

---

## 📁 重要檔案

```
TixMaster/
├── prometheus.yml                    # Prometheus 配置
├── docker-compose.monitoring.yml     # Docker Compose
├── start-monitoring.bat              # 啟動腳本 (Windows)
├── stop-monitoring.bat               # 停止腳本 (Windows)
├── backend/
│   ├── config/
│   │   ├── metrics.js               # Metrics 定義
│   │   └── logger.js                # Logger 配置
│   └── middleware/
│       └── metricsMiddleware.js     # Metrics 中間件
└── grafana/
    ├── provisioning/                 # 自動配置
    └── dashboards/
        └── tixmaster-overview.json  # 主儀表板
```

---

## 🎯 已完成的 Phase

- ✅ Phase 1: 日誌系統建置
- ✅ Phase 2: Crash API 實作
- ✅ Phase 3: Metrics 收集
- ✅ Phase 4: 監控系統設定
- ✅ Phase 5: 儀表板設計

---

**下一步**: Phase 6 - 系統架構圖 🏗️
