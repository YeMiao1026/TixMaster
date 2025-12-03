@echo off
REM ====================================================
REM TixMaster 監控系統停止腳本 (Windows)
REM ====================================================

echo.
echo ========================================
echo   TixMaster 監控系統停止
echo ========================================
echo.

echo [1/1] 停止 Prometheus 和 Grafana...
docker-compose -f docker-compose.monitoring.yml down

if %errorlevel% neq 0 (
    echo ❌ 停止失敗
    pause
    exit /b 1
)

echo.
echo ========================================
echo   ✅ 監控系統已停止！
echo ========================================
echo.
echo 💡 提示: 歷史數據已保存在 Docker volumes
echo    如需刪除數據，請執行:
echo    docker-compose -f docker-compose.monitoring.yml down -v
echo.
pause
