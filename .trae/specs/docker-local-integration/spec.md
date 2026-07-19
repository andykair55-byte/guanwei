# spec-15 本地 Docker 联调

## 背景
项目已有 `docker-compose.yml`（PostgreSQL 15 + Redis 7），
但缺少后端 FastAPI 容器化配置和一键启动脚本。
前端 `api.ts` 已有 `withFallback` 机制（真实后端失败自动降级 mock），
需要配置 `VITE_API_BASE_URL` 让前端对接本地后端。

## 现状
- ✅ `docker-compose.yml`：PG + Redis 两个服务
- ✅ 前端 `api.ts`：`VITE_API_BASE_URL` 环境变量控制
- ✅ 后端 `.env.example`：所有环境变量已定义
- ❌ 缺少 `backend/Dockerfile`
- ❌ 缺少后端容器加入 docker-compose
- ❌ 缺少一键启动脚本
- ❌ 缺少前后端联调文档

## 任务范围

### 任务 1：后端 Dockerfile
- 新建 `backend/Dockerfile`
- 基础镜像：`python:3.11-slim`
- 多阶段构建：
  - Stage 1（builder）：安装依赖到 `/install` 目录
  - Stage 2（runtime）：复制 install + 代码，精简最终镜像
- 暴露端口 8000
- 启动命令：`uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4`
- 新建 `backend/.dockerignore`：排除 `__pycache__`、`.env`、`tests/`、`*.db`、`htmlcov/`

### 任务 2：完善 docker-compose.yml
- 在现有 `docker-compose.yml` 新增 `backend` 服务：
  ```yaml
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: jianwei-backend
    restart: unless-stopped
    ports:
      - "8000:8000"
    environment:
      - DEV_MODE=true
      - DATABASE_URL=postgresql://jianwei:jianwei_dev_password@postgres:5432/jianwei
      - REDIS_URL=redis://redis:6379/0
      - SECRET_KEY=dev-secret-key-change-in-production
      - LLM_PROVIDER=${LLM_PROVIDER:-deepseek}
      - CORS_ORIGINS=http://localhost:5173,http://localhost:4173
      # LLM API Keys（从 .env 读取）
      - DEEPSEEK_API_KEY=${DEEPSEEK_API_KEY:-}
      - GROQ_API_KEY=${GROQ_API_KEY:-}
      - OPENAI_API_KEY=${OPENAI_API_KEY:-}
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - ./backend:/app  # 开发模式热重载
    command: uvicorn main:app --host 0.0.0.0 --port 8000 --reload
  ```
- `depends_on` 用 `condition: service_healthy` 确保 PG/Redis 就绪后再启动
- 开发模式挂载代码卷 + `--reload` 热重载

### 任务 3：一键启动脚本
- 新建 `start-dev.bat`（Windows）和 `start-dev.sh`（macOS/Linux）
- 功能：
  1. 检查 `.env` 文件是否存在，不存在则从 `.env.example` 复制
  2. 检查 `backend/.env` 文件是否存在，不存在则从 `backend/.env.example` 复制
  3. 启动 docker-compose（PG + Redis + backend）
  4. 等待 backend 健康检查通过（`curl http://localhost:8000/`）
  5. 新终端启动前端 `npm run dev`
  6. 打印访问地址：前端 http://localhost:5173，后端 http://localhost:8000/docs
- 新建 `stop-dev.bat` 和 `stop-dev.sh`：`docker-compose down` + 停止前端

### 任务 4：前端环境配置
- 新建 `.env.local`（前端，gitignore 已忽略）：
  ```
  VITE_API_BASE_URL=http://localhost:8000/api/v1
  ```
- 新建 `.env.local.example`：
  ```
  # 前端对接本地后端
  VITE_API_BASE_URL=http://localhost:8000/api/v1
  # 留空则走 mock 数据
  # VITE_API_BASE_URL=
  ```
- 确认 `api.ts` 的 `BASE_URL` 正确拼接（`/api/v1` 前缀已在 main.py 的 router prefix）

### 任务 5：健康检查端点
- 后端新增 `GET /health` 端点（不需要认证）：
  ```python
  @app.get("/health")
  async def health_check():
      return {
          "status": "ok",
          "database": "connected" if db_healthy else "disconnected",
          "redis": "connected" if REDIS_AVAILABLE else "disconnected",
      }
  ```
- docker-compose 的 backend 服务加 healthcheck：
  ```yaml
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
    interval: 10s
    timeout: 5s
    retries: 5
  ```

### 任务 6：联调验证文档
- 在项目根目录新建 `DEV_SETUP.md`（仅文档，不算代码改动）
- 内容：
  - 前置要求：Docker Desktop、Node.js 18+
  - 一键启动：`./start-dev.sh` 或 `start-dev.bat`
  - 手动启动步骤
  - 常见问题排查：
    - 端口冲突
    - PG 连接失败
    - Redis 连接失败
    - 前端跨域
    - LLM API Key 未配置
  - 验证清单：
    - 访问 http://localhost:8000/docs 看到 Swagger
    - 访问 http://localhost:8000/health 返回 ok
    - 前端登录功能正常（走真实后端）
    - 前端瓜田列表加载正常

## 不做的事
- 不做生产环境 Docker 配置（用 Render 或其他平台部署）
- 不做 CI/CD pipeline
- 不做 Kubernetes 配置
- 不改后端代码逻辑（仅新增 /health 端点）
- 不改前端代码逻辑（仅新增 .env.local）

## 验收
- `docker-compose up -d` 能启动 PG + Redis + backend 三个服务
- `curl http://localhost:8000/health` 返回 `{"status":"ok",...}`
- `curl http://localhost:8000/docs` 返回 Swagger UI
- 前端配置 `VITE_API_BASE_URL=http://localhost:8000/api/v1` 后，登录功能走真实后端
- 前端不配置 `VITE_API_BASE_URL` 时，自动降级到 mock 数据
- `start-dev.bat` / `start-dev.sh` 一键启动成功
- `docker-compose down` 清理干净
