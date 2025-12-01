# 故障注入伺服器

`fault_injection_server.js` 是一個獨立的 Node.js 伺服器，用於模擬各種故障場景以進行測試和監控。此伺服器提供注入故障的端點，例如高延遲、超時、依賴失敗和資源尖峰。這是一個驗證應用程式韌性和穩健性的寶貴工具。

## 先決條件

- 系統已安裝 Node.js。
- 確保已安裝所需的依賴項，執行以下命令：
  ```bash
  npm install
  ```

## 啟動伺服器

要啟動故障注入伺服器，請使用以下命令：
```bash
node backend/scripts/fault_injection_server.js
```

或者，您可以使用 `package.json` 中定義的 npm 腳本：
```bash
npm run fault-server
```

伺服器預設會啟動在 `http://localhost:3999`。

## 環境變數

可以使用以下環境變數來控制故障注入伺服器的行為：

- `FAULT_SERVER_PORT`：伺服器運行的埠號（預設：`3999`）。
- `ENABLE_FAULT_INJECTION`：設置為 `true` 以啟用故障注入端點（預設：`false`）。

## 可用端點

### 1. 高延遲
- **端點**：`/api/fault/latency`
- **方法**：`GET`
- **查詢參數**：
  - `durationMs`：延遲的持續時間（毫秒）。
- **範例**：
  ```bash
  curl "http://localhost:3999/api/fault/latency?durationMs=3000"
  ```

### 2. 超時
- **端點**：`/api/fault/timeout`
- **方法**：`GET`
- **查詢參數**：
  - `durationMs`：超時的持續時間（毫秒）。
- **範例**：
  ```bash
  curl "http://localhost:3999/api/fault/timeout?durationMs=5000"
  ```

### 3. 依賴失敗
- **端點**：`/api/fault/dependency`
- **方法**：`GET`
- **查詢參數**：
  - `type`：要模擬失敗的依賴類型（例如：`db`、`http`）。
  - `mode`：失敗模式（例如：`simulate`）。
- **範例**：
  ```bash
  curl "http://localhost:3999/api/fault/dependency?type=db&mode=simulate"
  ```

### 4. 隨機錯誤
- **端點**：`/api/fault/random-error`
- **方法**：`GET`
- **範例**：
  ```bash
  curl "http://localhost:3999/api/fault/random-error"
  ```

### 5. CPU 尖峰
- **端點**：`/api/fault/cpu-spike`
- **方法**：`GET`
- **查詢參數**：
  - `durationMs`：CPU 尖峰的持續時間（毫秒）。
- **範例**：
  ```bash
  curl "http://localhost:3999/api/fault/cpu-spike?durationMs=5000"
  ```

### 6. 記憶體壓力
- **端點**：`/api/fault/memory-pressure`
- **方法**：`GET`
- **查詢參數**：
  - `sizeMb`：要分配的記憶體大小（MB）。
- **範例**：
  ```bash
  curl "http://localhost:3999/api/fault/memory-pressure?sizeMb=100"
  ```

### 7. HTTP 依賴失敗
- **端點**：`/api/fault/http-dependency`
- **方法**：`GET`
- **查詢參數**：
  - `url`：要模擬失敗的 HTTP 依賴 URL。
- **範例**：
  ```bash
  curl "http://localhost:3999/api/fault/http-dependency?url=http://example.com"
  ```

### 8. DNS 故障
- **端點**：`/api/fault/dns-failure`
- **方法**：`GET`
- **查詢參數**：
  - `hostname`：要模擬 DNS 故障的主機名稱。
- **範例**：
  ```bash
  curl "http://localhost:3999/api/fault/dns-failure?hostname=example.com"
  ```

## 注意事項

- 確保將 `ENABLE_FAULT_INJECTION` 環境變數設置為 `true` 才能使用這些端點。
- 請在受控的測試環境中負責任地使用這些端點。

## 貢獻

如果您希望為故障注入伺服器做出貢獻，請遵循主 `README.md` 文件中的指南。

## 授權

此專案採用 MIT 許可證授權。詳見 `LICENSE` 文件。