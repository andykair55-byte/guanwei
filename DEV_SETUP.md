# 观微项目本地联调指南

本文档说明如何在本地一键启动 **前端 + 后端 + PostgreSQL + Redis** 完整开发环境，用于前后端联调。

> 本配置仅用于**本地开发与联调**，不适用于生产环境部署。

---

## 一、前置要求

| 工具 | 最低版本 | 说明 |
| --- | --- | --- |
| Docker Desktop | 最新稳定版 | 提供 Docker 引擎与 docker-compose |
| Node.js | 18+ | 前端构建（推荐 20 LTS） |
| npm | 9+ | 随 Node 安装 |
| Git | 任意 | 拉取代码 |

**Windows 用户**：确保 Docker Desktop 已切换到 Linux 容器模式（默认）。
**macOS / Linux 用户**：确保 `docker` 和 `docker-compose` 命令在 PATH 中可用。

---

## 二、一键启动（推荐）

### Windows
```bat
start-dev.bat
```

### macOS / Linux
```bash
chmod +x start-dev.sh   # 仅首次需要
./start-dev.sh
```

脚本会自动完成：
1. 从 `.env.example` 复制 `.env`（若不存在）
2. 从 `backend/.env.example` 复制 `backend/.env`（若不存在）
3. 启动 Docker 服务（PostgreSQL + Redis + Backend）
4. 等待后端 `/health` 返回 ok
5. 新开终端启动前端 `npm run dev`

启动完成后：
- 前端：http://localhost:5173
- 后端 Swagger：http://localhost:8000/docs
- 健康检查：http://localhost:8000/health

### 一键停止
```bat
:: Windows
stop-dev.bat
```
```bash
# macOS / Linux
./stop-dev.sh
```

---

## 三、手动启动步骤

如需逐步启动或排查问题，可按以下顺序操作：

### 1. 准备环境变量文件
```bash
# 根目录（前端 + LLM Keys）
cp .env.example .env
# 编辑 .env，填入你的 LLM API Key（如 DEEPSEEK_API_KEY）

# 后端目录
cp backend/.env.example backend/.env
```

### 2. 配置前端对接后端
```bash
cp .env.local.example .env.local
# .env.local 中已默认配置：
# VITE_API_BASE_URL=http://localhost:8000/api/v1
```

> 若不想对接后端，注释掉 `VITE_API_BASE_URL` 即可，前端会自动降级到 mock 数据。

### 3. 启动 Docker 服务
```bash
docker-compose up -d postgres redis backend
```

查看启动状态：
```bash
docker-compose ps
```
三个服务都应为 `healthy` 状态。

查看后端日志：
```bash
docker-compose logs -f backend
```

### 4. 安装前端依赖（首次）
```bash
npm install
```

### 5. 启动前端
```bash
npm run dev
```

### 6. 停止服务
```bash
docker-compose down          # 停止并删除容器
docker-compose down -v       # 同时删除数据卷（清空 PG 和 Redis 数据）
```

---

## 四、联调验证清单

启动完成后，逐项验证：

- [ ] 访问 http://localhost:8000/docs 看到 Swagger UI
- [ ] 访问 http://localhost:8000/health 返回 `{"status":"ok","database":"connected","redis":"connected"}`
- [ ] 访问 http://localhost:5173 前端首页正常加载
- [ ] 前端登录功能正常（走真实后端，非 mock）
  - 默认种子账号可在 `backend/seed_users.py` 中查看
- [ ] 前端「瓜田列表」加载正常（调用 `/api/v1/melons`）
- [ ] 前端控制台无 CORS 报错

---

## 五、常见问题排查

### 1. 端口冲突

**现象**：`docker-compose up` 报错 `port is already allocated` 或前端启动报 `port 5173 is in use`。

**解决**：
- 检查占用进程：
  ```bat
  :: Windows
  netstat -ano | findstr :8000
  netstat -ano | findstr :5432
  ```
  ```bash
  # macOS / Linux
  lsof -i :8000
  lsof -i :5432
  ```
- 结束占用进程，或修改 `docker-compose.yml` 中的端口映射（如 `"8001:8000"`）。
- 前端端口可在 `vite.config.ts` 中修改。

### 2. PostgreSQL 连接失败

**现象**：后端日志报 `connection refused` 或 `could not connect to server`。

**排查**：
```bash
docker-compose ps postgres    # 确认 postgres 状态为 healthy
docker-compose logs postgres  # 查看 PG 启动日志
```

**解决**：
- 确保 `docker-compose.yml` 中 backend 的 `DATABASE_URL` 用的是 `postgres:5432`（容器内网络），而不是 `localhost:5432`。
- 若本地也装了 PG 且占用 5432，停掉本地 PG 或改端口映射。

### 3. Redis 连接失败

**现象**：后端日志 `Redis 连接失败，缓存功能已禁用`，`/health` 返回 `redis: disconnected`。

**说明**：
- 开发模式（`DEV_MODE=true`）下 Redis 不可用不会阻塞启动，仅禁用缓存与速率限制。
- 若需启用，确认 redis 容器健康：`docker-compose ps redis`。
- `REDIS_URL` 在容器内应为 `redis://redis:6379/0`（用服务名 `redis`，不是 `localhost`）。

### 4. 前端跨域（CORS）报错

**现象**：浏览器控制台报 `Access to fetch ... has been blocked by CORS policy`。

**解决**：
- 后端 `CORS_ORIGINS` 已在 `docker-compose.yml` 配置为 `http://localhost:5173,http://localhost:4173`。
- 若前端跑在别的端口（如 3000），在 `docker-compose.yml` 的 backend 环境变量中追加该端口，然后 `docker-compose up -d backend` 重启。
- 若用 `npm run preview`（端口 4173）已包含在白名单内。

### 5. LLM API Key 未配置

**现象**：调用 `/api/v1/verify` 或 `/api/v1/moderate` 返回 500，后端日志报 LLM provider 错误。

**解决**：
- 编辑根目录 `.env`，填入至少一个 LLM API Key：
  ```
  DEEPSEEK_API_KEY=sk-your-real-key
  ```
- 重启 backend：`docker-compose restart backend`
- 查看 LLM 健康状态：访问 `/api/v1/admin/llm/health`（需管理员权限）或后端启动日志。

### 6. 后端容器反复重启

**现象**：`docker-compose ps` 显示 backend 状态反复 `restarting`。

**排查**：
```bash
docker-compose logs --tail=100 backend
```

常见原因：
- `requirements.txt` 依赖安装失败 → 检查 Dockerfile 构建日志：`docker-compose build backend`
- 数据库连接失败 → 见上文 PG 排查
- 代码语法错误 → 挂载了本地 `./backend` 目录，本地代码改动会实时同步进容器

### 7. 代码热重载不生效

**说明**：
- `docker-compose.yml` 已挂载 `./backend:/app` 并用 `--reload` 启动，修改 `backend/` 下 Python 文件会自动重载。
- 若修改 `requirements.txt`，需重新构建镜像：`docker-compose build backend && docker-compose up -d backend`。
- 前端 Vite 自带 HMR，无需额外配置。

### 8. Windows 下脚本执行报错

**现象**：`start-dev.bat` 报 `python 不是内部或外部命令`。

**解决**：健康检查依赖本机 Python。请确保 Python 已安装并加入 PATH，或手动访问 http://localhost:8000/health 确认后端就绪后再启动前端。

---

## 六、数据卷管理

```bash
# 查看数据卷
docker volume ls | grep jianwei

# 完全清空数据（PG + Redis），慎用
docker-compose down -v
```

---

## 七、架构总览

```
┌─────────────────────────────────────────────────────────┐
│  浏览器                                                  │
│  http://localhost:5173  (Vite dev server)               │
└────────────────────────┬────────────────────────────────┘
                         │  HTTP (CORS 白名单已配置)
                         ▼
┌─────────────────────────────────────────────────────────┐
│  Docker Compose 网络                                    │
│                                                         │
│  ┌──────────────┐   ┌──────────────┐   ┌────────────┐  │
│  │  postgres:15 │   │  redis:7     │   │  backend   │  │
│  │  :5432       │   │  :6379       │   │  :8000     │  │
│  └──────────────┘   └──────────────┘   └────────────┘  │
│         ▲                  ▲                ▲           │
│         └──────────────────┴────────────────┘           │
│              backend 通过服务名访问 PG / Redis           │
└─────────────────────────────────────────────────────────┘
```

- 前端 `VITE_API_BASE_URL=http://localhost:8000/api/v1` → 走宿主机 8000 端口
- 后端容器内 `DATABASE_URL=postgresql://...@postgres:5432/...` → 走 Docker 内部 DNS
- 后端容器内 `REDIS_URL=redis://redis:6379/0` → 走 Docker 内部 DNS
