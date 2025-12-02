@echo off
REM ====================================================
REM TixMaster Monitoring System Stop Script (Windows)
REM ====================================================

echo.
echo ========================================
echo   TixMaster Monitoring System Stop
echo ========================================
echo.

echo [1/1] Stopping Prometheus and Grafana...
docker-compose -f docker-compose.monitoring.yml down

if %errorlevel% neq 0 (
    echo ❌ Failed to stop
    pause
    exit /b 1
)

echo.
echo ========================================
echo   ✅ Monitoring System Stopped!
echo ========================================
echo.
echo 💡 Tip: Historical data is saved in Docker volumes
echo    To delete data, run:
echo    docker-compose -f docker-compose.monitoring.yml down -v
echo.
pause