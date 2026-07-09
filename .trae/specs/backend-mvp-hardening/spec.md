# 观微后端 MVP 加固工程 - Product Requirement Document

## Overview
- **Summary**: 对观微后端进行 MVP 阶段的工程化加固，确保 500-1000 用户规模下的稳定运行。核心包括数据库切换、缓存强制化、Pipeline 异步化、安全加固、服务层解耦、测试补齐六大方向。所有改造严格遵循"模块解耦、边界清晰"的架构原则，保持现有代码结构的干净状态。
- **Purpose**: 解决当前后端在并发写入、长任务阻塞、安全基线、代码耦合、测试覆盖不足等方面的隐患，为 MVP 测试提供稳定的地基。改造过程中不破坏现有模块划分（API路由、数据模型、服务层、管道管理、缓存、认证、LLM服务）的独立性。
- **Target Users**: 后端开发者、运维人员、评审评委
- **阶段目标**: 500-1000 用户 MVP 测试（非目标规模的改造一律不做）

## Goals
- 强制切换 PostgreSQL，解决 SQLite 并发写入瓶颈
- Redis 从可选依赖改为强制启用，建立缓存层
- Pipeline 长任务异步化，避免阻塞 API Worker
- 安全基线加固：SECRET_KEY 强制配置、登录接口限流
- 服务层重构：将业务逻辑从路由层抽离，降低耦合度
- 核心业务路径测试覆盖：Pipeline 流程、猜瓜完整流程、边界场景

## Architecture Principles（架构原则）
- **模块解耦**: API 路由层、业务服务层、数据模型层、缓存服务层、管道管理层保持独立，互不直接依赖内部实现
- **单一职责**: 每个服务/模块只负责一个业务领域，跨领域交互通过清晰的接口调用
- **向后兼容**: 所有 API 接口保持现有契约不变，前端无需同步修改
- **最小侵入**: 改造只触及必要的代码，不做"顺手优化"，不重构无关代码
- **可验证**: 每一项改造都有明确的验收标准和测试用例

## 改造分级策略
| 层级 | 含义 | 本项目处理方式 |
|------|------|----------------|
| **① 现在做** | MVP地基，直接影响500-1000用户能否稳定跑起来 | ✅ 纳入本 spec，立即排期 |
| **② 已决定维持现状** | 经过评估，当前阶段接受现状/风险 | ⚠️ 记录在案，不排期 |
| **③ 阶段2预留** | 1000-5000用户规模才需要 | 📝 仅认知储备，不写代码 |
| **④ 阶段3远期** | 5000-10000+用户的架构留白 | 🏗️ 仅设计思路，防止选型锁死未来 |

## Non-Goals (Out of Scope)
- 异步 SQLAlchemy 2.0 改造（阶段 2 预留 — 用户量明显增长、同步ORM出现明显延迟时再改）
- Celery 分布式任务队列引入（阶段 2 预留 — Pipeline任务量大到asyncio后台任务处理不过来时再上）
- JWT 有效期缩短 + Refresh Token 机制（② 维持现状 — 测试阶段7天对开发/测试体验更友好，接受已知风险）
- 微服务架构拆分（阶段 3 远期）
- Prometheus + Grafana 完整可观测性平台（仅保留轻量 metrics 端点，演示环境可单独搭 Grafana）
- 证据去重、LLM 调用费用监控（阶段 2 预留）
- 结构化日志（Loguru）（阶段 2 预留 — 排查问题效率下降时再上）

## Background & Context
- 项目当前使用 FastAPI + SQLAlchemy + LangGraph 技术栈
- 数据库默认 SQLite，支持 PostgreSQL 切换但未强制
- Redis 为可选依赖，服务可在无 Redis 情况下降级运行
- Pipeline 求证流程同步执行，单次可能耗时 30 秒+
- 路由层直接操作数据库和用户积分，业务逻辑耦合度高
- 测试覆盖不足，缺少核心业务路径和边界场景测试
- 决策依据：《观微后端技术审查报告（MVP阶段整理版）》

## Functional Requirements

### FR-1: PostgreSQL 强制切换与连接池调优
- 移除 SQLite 作为默认数据库选项
- 生产环境必须配置 PostgreSQL
- 连接池参数调整：pool_size=20, max_overflow=30
- 数据库 URL 必须通过环境变量配置

### FR-2: Redis 缓存强制启用
- Redis 从"可选依赖"改为强制启用
- 服务启动时检测 Redis 可用性，不可用则启动失败
- 现有缓存逻辑保持不变（瓜列表、用户积分、用户信息、段位配置）
- requirements.txt 中添加 redis 依赖

### FR-3: Pipeline 长任务异步化
- 求证接口改为提交任务后立即返回 pipeline_id 和 pending 状态
- 使用 asyncio.create_task 在后台执行 Pipeline
- 通过 WebSocket 推送执行进度和最终结果
- 新增 PipelineRun 数据模型持久化任务状态
- 新增查询任务状态的 API 端点

### FR-4: SECRET_KEY 安全加固
- 移除 SECRET_KEY 的默认值
- 生产环境未配置 SECRET_KEY 时启动失败并抛出明确错误
- 开发环境可使用默认值（需显式声明 DEV_MODE=true）

### FR-5: 登录接口速率限制
- 登录接口 60 秒内最多 5 次尝试
- 使用 Redis 作为限流存储后端
- 超出限制返回 429 状态码和明确提示

### FR-6: 服务层重构（业务逻辑抽离）
- 创建 GuessService：封装猜瓜完整业务流程
- 创建 UserService：封装用户积分、签到等业务
- 创建 MelonService：封装瓜的创建、统计等业务
- 路由层仅负责参数校验和调用服务层
- 保持现有 API 接口不变，内部实现重构

### FR-7: 测试补齐
- Pipeline 流程集成测试（优先级最高）
- 猜瓜完整流程集成测试
- 段位计算、积分计算单元测试
- 证据可信度计算单元测试
- 边界场景测试：重复猜瓜、积分透支、并发提交
- 测试数据工厂（fixtures）

## Non-Functional Requirements

### NFR-1: 并发性能
- 500 并发用户下，瓜田列表接口响应时间 < 200ms
- 500 并发用户下，登录接口响应时间 < 300ms
- Pipeline 任务不阻塞 API 请求

### NFR-2: 安全性
- 生产环境必须配置 SECRET_KEY，禁止使用默认值
- 登录接口具备速率限制，防止暴力破解
- 密码使用 bcrypt 哈希存储

### NFR-3: 可维护性
- 路由层不包含业务逻辑，仅做参数校验和服务调用
- 服务层单一职责，每个服务对应一个业务领域
- 核心业务路径有测试覆盖

### NFR-4: 兼容性
- 所有现有 API 接口保持向后兼容
- 前端代码无需修改即可适配后端改造

## Constraints
- **Technical**: FastAPI + SQLAlchemy（同步）+ LangGraph，不引入异步 ORM
- **Business**: 500-1000 用户 MVP 规模，不做过度设计
- **Dependencies**: PostgreSQL、Redis、fastapi-limiter
- **Module Boundaries**: 
  - API 路由层：仅参数校验、调用服务层、返回响应
  - 服务层（services/）：封装业务逻辑，不直接暴露路由
  - 数据模型层（models.py）：仅定义数据库结构，不包含业务逻辑
  - 管道管理层（pipeline/）：独立的 Agent 编排与容错，与业务服务层解耦
  - 缓存服务（services/cache.py）：统一的缓存抽象，业务层通过接口调用
  - LLM 服务（services/llm.py）：统一的模型调用抽象，与具体供应商解耦

## Key Decisions（关键决策记录）
| 问题 | 决定 | 原因 |
|------|------|------|
| 是否强制切换 PostgreSQL？ | ✅ 是 | SQLite 不支持并发写入，500-1000用户并发场景下是硬伤 |
| Pipeline任务队列：asyncio还是Celery？ | ✅ 当前阶段用asyncio后台任务 | 500-1000用户量级不需要Celery，改造成本远低于引入分布式任务队列 |
| 是否做异步SQLAlchemy 2.0改造？ | ❌ 暂不做，标记为阶段2 | 改造成本高，当前量级同步ORM+连接池完全够用 |
| JWT有效期是否缩短为2小时+Refresh Token？ | ❌ 不同意，测试阶段维持7天 | 测试阶段7天对开发/测试体验更友好，接受已知风险 |
| 登录接口是否加速率限制？ | ✅ 是 | 必要的安全措施，防止暴力破解 |
| 是否将业务逻辑从路由层抽到服务层？ | ✅ 是 | 降低耦合度，提升可维护性，现在改造成本低 |

## Assumptions
- 开发环境可通过 DEV_MODE=true 跳过部分强制检查
- 现有前端代码能正确处理异步 Pipeline 的返回格式
- WebSocket 连接已在前端实现或可快速适配
- 测试使用内存数据库或独立测试数据库

## Acceptance Criteria

### AC-1: PostgreSQL 强制切换
- **Given**: 服务在生产环境启动
- **When**: DATABASE_URL 未配置或指向 SQLite
- **Then**: 服务启动失败，抛出明确的错误信息
- **Verification**: `programmatic`
- **Notes**: DEV_MODE=true 时允许使用 SQLite 进行开发

### AC-2: Redis 强制启用
- **Given**: 服务启动时 Redis 不可用
- **When**: 服务尝试初始化
- **Then**: 服务启动失败，记录 Redis 连接错误
- **Verification**: `programmatic`
- **Notes**: DEV_MODE=true 时允许降级运行（输出警告）

### AC-3: Pipeline 异步执行
- **Given**: 用户提交求证请求
- **When**: 调用 /verify 接口
- **Then**: 立即返回 pipeline_id 和 pending 状态，后台异步执行
- **Verification**: `programmatic`
- **Notes**: 通过 WebSocket 推送进度事件和最终结果

### AC-4: SECRET_KEY 强制配置
- **Given**: 生产环境启动服务
- **When**: SECRET_KEY 环境变量未设置
- **Then**: 服务启动失败，抛出 RuntimeError
- **Verification**: `programmatic`

### AC-5: 登录接口限流
- **Given**: 同一 IP 地址
- **When**: 60 秒内调用登录接口超过 5 次
- **Then**: 返回 429 Too Many Requests
- **Verification**: `programmatic`

### AC-6: 服务层解耦
- **Given**: 路由层代码
- **When**: 审查路由函数实现
- **Then**: 路由函数不直接操作数据库，仅调用服务层方法
- **Verification**: `human-judgment`
- **Notes**: 检查 melon_routes.py 和 user_routes.py

### AC-7: 核心测试覆盖
- **Given**: 测试套件
- **When**: 运行 pytest
- **Then**: Pipeline 流程测试、猜瓜流程测试全部通过
- **Verification**: `programmatic`
- **Notes**: 测试文件数从 4 个增加到 8+ 个

### AC-8: API 向后兼容
- **Given**: 现有前端代码
- **When**: 调用所有现有 API 接口
- **Then**: 返回格式与改造前一致
- **Verification**: `programmatic`
- **Notes**: /verify 接口返回格式变更需单独确认

## Open Questions
- [ ] /verify 接口返回格式变更是否需要前端同步改造？当前假设前端已适配或可快速适配
- [ ] DEV_MODE 环境变量的命名和默认值是否需要调整？
- [ ] 登录限流的阈值（5次/60秒）是否合适？
- [ ] PipelineRun 数据模型是否需要关联用户 ID？
