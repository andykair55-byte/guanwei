@echo off
chcp 65001 >nul
title 观微开发环境停止
echo === 停止观微开发环境 ===
echo.

echo [1/2] 停止 Docker 服务...
docker-compose down

echo.
echo [2/2] 尝试关闭前端窗口（如有）...
taskkill /FI "WINDOWTITLE eq 观微-前端*" /T /F 2>nul
if errorlevel 1 (
    echo     未找到前端窗口，可能已手动关闭
) else (
    echo     前端窗口已关闭
)

echo.
echo === 已停止所有服务 ===
pause
