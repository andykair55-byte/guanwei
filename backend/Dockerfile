# 见微后端 Dockerfile（本地联调用）
# 多阶段构建：builder 安装依赖到独立目录，runtime 只复制产物，精简最终镜像

# ===== Stage 1: builder =====
FROM python:3.11-slim AS builder
WORKDIR /build
COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# ===== Stage 2: runtime =====
FROM python:3.11-slim
WORKDIR /app
# 从 builder 复制已安装的依赖
COPY --from=builder /install /usr/local
# 复制项目代码
COPY . .
EXPOSE 8000
# 默认生产式启动（docker-compose 会覆盖为 --reload 开发模式）
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
