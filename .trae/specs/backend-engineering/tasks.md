# Tasks

- [x] Task 1: 数据库迁移准备
  - [x] SubTask 1.1: 创建 PostgreSQL Docker 配置（docker-compose.yml）
  - [x] SubTask 1.2: 修改 database.py 支持 PostgreSQL 连接池
  - [x] SubTask 1.3: 创建数据迁移脚本（SQLite → PostgreSQL）
  - [x] SubTask 1.4: 添加环境变量配置（DATABASE_URL）

- [x] Task 2: 缓存服务实现
  - [x] SubTask 2.1: 创建 Redis Docker 配置（已在 Task 1 中完成）
  - [x] SubTask 2.2: 创建 cache.py 服务层
  - [x] SubTask 2.3: 实现瓜田列表缓存（5分钟 TTL）
  - [x] SubTask 2.4: 实现用户积分缓存（1分钟 TTL）
  - [x] SubTask 2.5: 实现缓存失效逻辑

- [x] Task 3: 证据链体系实现
  - [x] SubTask 3.1: 设计 Evidence 数据模型（models.py）
  - [x] SubTask 3.2: 创建 evidence.py 服务层
  - [x] SubTask 3.3: 实现证据链存储 API
  - [ ] SubTask 3.4: 前端证据链展示组件对接（待前端实现）
  - [x] SubTask 3.5: 可信度排序算法实现

- [x] Task 4: API 错误处理统一化
  - [x] SubTask 4.1: 创建统一错误响应格式
  - [x] SubTask 4.2: 实现全局异常处理器（FastAPI middleware）
  - [x] SubTask 4.3: 前端错误处理适配

- [x] Task 5: 后端单元测试
  - [x] SubTask 5.1: 配置 pytest + pytest-asyncio
  - [x] SubTask 5.2: 段位计算测试（ranks.py）
  - [x] SubTask 5.3: 积分计算测试（points.py）
  - [x] SubTask 5.4: 证据链服务测试（evidence.py）

- [x] Task 6: 后端 API 测试
  - [x] SubTask 6.1: 配置 FastAPI TestClient
  - [x] SubTask 6.2: 瓜田列表 API 测试
  - [x] SubTask 6.3: 猜瓜详情 API 测试
  - [x] SubTask 6.4: 用户信息 API 测试

- [x] Task 7: 前端测试框架配置
  - [x] SubTask 7.1: 配置 Vitest + React Testing Library
  - [x] SubTask 7.2: 段位组件测试
  - [x] SubTask 7.3: 积分组件测试

- [x] Task 8: 监控指标采集
  - [x] SubTask 8.1: 创建 metrics.py 服务层
  - [x] SubTask 8.2: 实现系统指标采集（API 响应时间、数据库连接数）
  - [x] SubTask 8.3: 实现业务指标采集（DAU、参与率）
  - [x] SubTask 8.4: 创建监控 API 端点

- [x] Task 9: 文档更新
  - [x] SubTask 9.1: 更新架构文档（证据链体系）
  - [x] SubTask 9.2: 更新部署文档（PostgreSQL + Redis）
  - [x] SubTask 9.3: 更新测试文档

# Task Dependencies
- Task 2 依赖 Task 1（缓存需要数据库迁移完成）
- Task 3 依赖 Task 1（证据链需要数据库模型）
- Task 5 依赖 Task 3（测试依赖功能实现）
- Task 6 依赖 Task 4（API 测试依赖错误处理）
- Task 7 独立（前端测试可并行）
- Task 8 独立（监控可并行）