@echo off
chcp 65001 >nul
title 观微开发环境启动
echo === 观微项目本地开发环境启动 ===
echo.

if not exist ".env" (
    copy ".env.example" ".env" >nul
    echo [INFO] 已从 .env.example 创建 .env，请编辑填入 LLM API Key
) else (
    echo [INFO] .env 已存在
)

if not exist "backend\.env" (
    copy "backend\.env.example" "backend\.env" >nul
    echo [INFO] 已从 backend/.env.example 创建 backend/.env
) else (
    echo [INFO] backend/.env 已存在
)

echo.
echo [1/3] 启动 Docker 服务（PostgreSQL + Redis + Backend）...
docker-compose up -d postgres redis backend
if errorlevel 1 (
    echo [ERROR] Docker 启动失败，请检查 Docker Desktop 是否运行
    pause
    exit /b 1
)

echo.
echo [2/3] 等待后端健康检查通过...
:wait
timeout /t 2 /nobreak >nul
python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" 2>nul
if errorlevel 1 (
    echo     ...后端尚未就绪，继续等待
    goto wait
)
echo     后端已就绪：http://localhost:8000/docs

echo.
echo [3/3] 启动前端...
start "观微-前端" cmd /k "npm run dev"

echo.
echo === 启动完成 ===
echo 前端：http://localhost:5173
echo 后端：http://localhost:8000/docs
echo 健康：http://localhost:8000/health
echo.
echo 停止服务请运行：stop-dev.bat
pause
