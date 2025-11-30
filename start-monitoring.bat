@echo off
REM ====================================================
REM TixMaster 監控系統啟動腳本 (Windows)
REM ====================================================

echo.
echo ========================================
echo   TixMaster 監控系統啟動
echo ========================================
echo.

REM 檢查 Docker 是否運行
echo [1/3] 檢查 Docker 狀態...
docker ps >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker 未運行！請先啟動 Docker Desktop
    echo.
    pause
    exit /b 1
)
echo ✅ Docker 正在運行

echo.
echo [2/3] 啟動 Prometheus 和 Grafana...
docker-compose -f docker-compose.monitoring.yml up -d
if %errorlevel% neq 0 (
    echo ❌ 監控系統啟動失敗
    pause
    exit /b 1
)

echo.
echo [3/3] 等待服務啟動...
timeout /t 5 /nobreak >nul

echo.
echo ========================================
echo   ✅ 監控系統已啟動！
echo ========================================
echo.
echo 📊 Prometheus: http://localhost:9091
echo 📈 Grafana:    http://localhost:3001
echo    帳號: admin / admin
echo.
echo 💡 提示: 請確保 Backend 在 http://localhost:3000 運行
echo.
echo 按任意鍵繼續...
pause >nul
