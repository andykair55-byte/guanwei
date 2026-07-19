#!/bin/bash
set -e

echo "=== 停止观微开发环境 ==="
echo

echo "[1/1] 停止 Docker 服务..."
docker-compose down

echo
echo "=== 已停止所有 Docker 服务 ==="
echo "如需停止前端，请在前端终端按 Ctrl+C 或运行：pkill -f 'vite'"
