# spec-12 认证与安全加固（补全）

## 背景
项目后端已有基础认证（JWT + bcrypt）和登录限流（fastapi-limiter），
但存在以下安全缺口需要补全：

1. **CORS 过于宽松**：`main.py:108` `allow_origins=["*"]`，生产环境需白名单
2. **缺少安全头中间件**：无 X-Content-Type-Options/X-Frame-Options 等 OWASP 推荐头
3. **密码强度无校验**：注册接口接受任意长度密码，甚至 1 位密码
4. **输入长度无限制**：Pydantic 模型字段未设 max_length，可能被超长输入攻击
5. **管理员端点无速率限制**：/admin/* 端点未加限流，可能被暴力探测

## 现状（已实现，不要重复）
- ✅ JWT 认证（`auth.py`，7 天有效期，DEV_MODE 跳过 SECRET_KEY 强制）
- ✅ bcrypt 密码哈希（`auth.py:42`）
- ✅ 登录限流（`user_routes.py:23`，`RateLimiter(times=5, seconds=60)`）
- ✅ SECRET_KEY 强制配置（`auth.py:23`，非 DEV_MODE 缺失则启动失败）
- ✅ PostgreSQL 强制（`database.py:17`）
- ✅ Redis 强制（`services/cache.py`）
- ✅ 统一错误响应（`main.py:42`）

## 任务范围

### 任务 1：CORS 白名单
- 文件：`backend/main.py`
- 当前：`allow_origins=["*"]`
- 改为：从环境变量 `CORS_ORIGINS` 读取，逗号分隔
  - 默认值（DEV_MODE）：`http://localhost:5173,http://localhost:4173,http://localhost:3000`
  - 生产环境必须显式配置
- `allow_credentials=True` 保持（JWT 需要）
- 新增 `CORS_ORIGINS` 到 `.env.example`

### 任务 2：安全头中间件
- 文件：`backend/main.py`
- 新增中间件，添加以下响应头：
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `X-XSS-Protection: 1; mode=block`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `X-Request-ID`（每请求生成 uuid，便于日志追踪）
- 不添加 CSP（Content-Security-Policy），因为前后端分离，CSP 应在前端 nginx/Pages 配置

### 任务 3：密码强度校验
- 文件：`backend/schemas.py`
- `UserCreate` 和 `UserLogin` 的 `password` 字段：
  - 最小长度 8（`min_length=8`）
  - 最大长度 128（`max_length=128`）
  - 新增 `validator` 检查：至少包含字母和数字（不支持纯数字或纯字母密码）
- `username` 字段：
  - `min_length=3`，`max_length=20`
  - 正则校验：只允许字母、数字、下划线（`pattern=r'^[a-zA-Z0-9_]+$'`）
- `nickname` 字段：
  - `min_length=1`，`max_length=20`
- 文件：`backend/services/user_service.py`
  - `register` 方法内新增密码强度二次校验（防御 Pydantic 被绕过的场景）

### 任务 4：输入长度限制
- 文件：`backend/api/routes.py`
- `VerifyRequest.content`：`max_length=2000`（已截断到 2000，但 Pydantic 层应显式拒绝超长）
- `ModerateRequest.text`：`max_length=5000`
- 文件：`backend/schemas.py`
- 所有 `MelonCreate`、`GuessCreate` 等用户输入字段补全 `max_length`
  - `MelonCreate.title`：`max_length=100`
  - `MelonCreate.description`：`max_length=2000`
  - `GuessCreate.evidence_content`：`max_length=1000`
- 评论相关 schema（若有）：`content` 字段 `max_length=500`

### 任务 5：管理员端点限流
- 文件：`backend/api/admin_routes.py`
- 所有写操作（POST/PUT/DELETE）端点加 `RateLimiter(times=20, seconds=60)`
- 读操作（GET）不限流（管理后台需要频繁查看）
- 已有的 `/admin/llm/health` 端点也要加限流

### 任务 6：更新 .env.example
- 新增 `CORS_ORIGINS=http://localhost:5173,http://localhost:4173`
- 注释说明生产环境必须配置为真实域名

## 不做的事
- 不改 JWT 有效期（维持 7 天，用户已决策）
- 不加 Refresh Token（用户已决策维持现状）
- 不加 CSRF Token（JWT + CORS 白名单已足够，前后端分离不需要）
- 不加 IP 黑名单（阶段 2 预留）
- 不加 WAF（阶段 2 预留）
- 不加审计日志（阶段 2 预留）
- 不改现有认证流程和接口签名

## 验收
- `CORS_ORIGINS` 未配置时，DEV_MODE 使用默认白名单，非 DEV_MODE 启动失败
- 响应头包含所有 5 个安全头 + X-Request-ID
- 注册时密码 < 8 位返回 422
- 注册时密码纯数字返回 422
- 注册时 username 含特殊字符返回 422
- `/verify` 传入 > 2000 字内容返回 422
- 管理员端点 60 秒内调用 > 20 次返回 429
- 现有 pytest 测试全部通过
- `python -m py_compile` 通过
