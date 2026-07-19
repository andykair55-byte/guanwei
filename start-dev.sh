#!/bin/bash
set -e

echo "=== 观微项目本地开发环境启动 ==="
echo

# 1. 准备环境变量文件
[ ! -f ".env" ] && cp .env.example .env && echo "[INFO] 已创建 .env，请编辑填入 LLM API Key"
[ ! -f "backend/.env" ] && cp backend/.env.example backend/.env && echo "[INFO] 已创建 backend/.env"

# 2. 启动 Docker 服务
echo "[1/3] 启动 Docker 服务（PostgreSQL + Redis + Backend）..."
docker-compose up -d postgres redis backend

# 3. 等待后端就绪
echo "[2/3] 等待后端健康检查通过..."
attempt=0
until curl -sf http://localhost:8000/health > /dev/null 2>&1; do
    attempt=$((attempt + 1))
    if [ $attempt -gt 60 ]; then
        echo "[ERROR] 后端启动超时（120s），请检查日志：docker-compose logs backend"
        exit 1
    fi
    echo "    ...后端尚未就绪，继续等待（$attempt）"
    sleep 2
done
echo "    后端已就绪：http://localhost:8000/docs"

# 4. 启动前端
echo "[3/3] 启动前端..."
npm run dev &

echo
echo "=== 启动完成 ==="
echo "前端：http://localhost:5173"
echo "后端：http://localhost:8000/docs"
echo "健康：http://localhost:8000/health"
echo
echo "停止服务请运行：./stop-dev.sh"
