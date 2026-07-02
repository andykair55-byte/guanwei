# 观微 (JianWei) - 项目Wiki

> 事实核查与辩论平台 | 技术复盘文档
> 
> 最后更新：2026-07-02

---

## 一、项目概述

### 1.1 产品定位

观微是一个**事实核查与社区辩论平台**，核心理念是"AI辅助人做判断"——不是AI替人做决定，而是AI提供证据和分析，人来做最终判断。

**核心功能模块**：
- **瓜田**：热点话题列表，用户可猜测真伪
- **辩论场**：针对热点话题的正反方辩论
- **求证工具箱**：6个独立工具（EXIF鉴定、情绪操控检测、反向搜图、时间线重建、洗稿检测、一键求证）
- **社区**：用户发帖、评论、互动
- **排行榜**：段位系统 + 积分激励

### 1.2 技术栈

| 层级 | 技术选型 |
|------|----------|
| **前端框架** | React 19 + TypeScript |
| **构建工具** | Vite 8 |
| **UI框架** | Tailwind CSS 4 |
| **状态管理** | Zustand |
| **路由** | React Router 7 |
| **后端框架** | FastAPI (Python) |
| **数据库** | SQLAlchemy + SQLite/PostgreSQL |
| **AI编排** | LangGraph |
| **LLM调用** | OpenAI兼容接口（支持12家供应商） |
| **认证** | JWT |
| **容器化** | Docker Compose |

### 1.3 项目结构

```
4-观微/
├── src/                          # 前端源码
│   ├── pages/                    # 页面组件（23个）
│   ├── components/               # 通用组件（22个）
│   ├── stores/                   # Zustand状态管理（6个）
│   ├── services/                 # 服务层（16个）
│   ├── types/                    # TypeScript类型定义
│   ├── config/                   # 配置文件（段位等）
│   ├── contexts/                 # React Context
│   └── utils/                    # 工具函数
├── backend/                      # 后端源码
│   ├── api/                      # FastAPI路由
│   ├── agents/                   # LangGraph Agent
│   ├── pipeline/                 # 编排器
│   ├── services/                 # 服务层
│   ├── models.py                 # SQLAlchemy模型
│   ├── schemas.py                # Pydantic模型
│   ├── auth.py                   # JWT认证
│   └── seed.py                   # 种子数据
├── server/                       # Node.js服务（实验性）
├── docs/                         # 文档
├── docker-compose.yml            # Docker配置
└── plan.md                       # 项目落地计划
```

---

## 二、核心功能详解

### 2.1 瓜田系统

**数据模型**：
```typescript
interface Melon {
  id: string
  title: string              // 标题
  description: string        // 描述
  coverImage: string         // 封面图
  category: MelonCategory    // 分类（娱乐/科技/生活科普/社会热点/历史/财经）
  difficulty: 1 | 2 | 3     // 难度
  trueCount: number          // 选真的人数
  falseCount: number         // 选假的人数
  totalParticipants: number  // 总参与人数
  revealTime: string         // 开奖时间
  status: 'pending' | 'revealed'  // 状态
  result?: boolean           // 开奖结果（true=真, false=假）
  report?: Report            // 实锤报告
}
```

**业务流程**：
```
创建瓜 → 用户猜测(真/假) → 提交佐证 → 到期开奖 → 生成实锤报告 → 积分结算
```

**API接口**：
- `GET /melons` - 瓜列表（支持分类筛选）
- `GET /melons/:id` - 瓜详情
- `POST /melons/:id/guess` - 提交猜测
- `GET /melons/:id/my-guess` - 我的猜测记录
- `GET /melons/:id/evidences` - 佐证列表
- `POST /melons/evidences/:id/upvote` - 点赞佐证
- `GET /melons/:id/report` - 获取实锤报告
- `POST /melons` - 创建瓜

### 2.2 段位系统

**7级段位**：

| 段位 | 图标 | 猜对次数 | 准确率 | 参与次数 |
|------|------|----------|--------|----------|
| 吃瓜群众 | 🌱 | 0 | 0% | 0 |
| 瓜田新手 | 🌿 | 10 | 25% | 30 |
| 鉴瓜学徒 | 🍀 | 30 | 35% | 80 |
| 瓜田侦探 | 🔍 | 80 | 45% | 180 |
| 鉴瓜达人 | 🎯 | 200 | 50% | 400 |
| 鉴瓜大师 | 🏆 | 400 | 55% | 800 |
| 见微先知 | ✨ | 800 | 60% | 1500 |

**计算逻辑**（`backend/ranks.py`）：
```python
def calculate_rank(correct_guesses, total_guesses):
    accuracy = correct_guesses / total_guesses
    # 从高到低遍历段位，满足条件即返回
    for rank in reversed(RANK_CONFIG):
        if (correct >= min_correct and 
            total >= min_total and 
            accuracy >= min_accuracy):
            return rank
    return "吃瓜群众"
```

**积分规则**：
- 新用户注册：+100分
- 每日签到：+10分
- 猜对瓜：+30分
- 提交佐证：+5分
- 佐证被点赞：+2分
- 佐证被选为最佳：+20分

### 2.3 一键求证

**核心流程**：
```
用户输入 → 内容审核 → 信息搜集 → 来源验证 → 深度分析 → 生成报告
```

**后端Pipeline**（LangGraph编排）：
```python
# backend/pipeline/orchestrator.py
class PipelineOrchestrator:
    def _build_graph(self):
        graph = StateGraph(PipelineState)
        
        # 4个节点
        graph.add_node("moderation", self._moderation_node)   # 审核
        graph.add_node("collector", self._collector_node)     # 搜集
        graph.add_node("verifier", self._verifier_node)       # 验证
        graph.add_node("analyzer", self._analyzer_node)       # 分析
        
        # 执行流程
        graph.set_entry_point("moderation")
        graph.add_conditional_edges("moderation", ...)  # 审核不通过则阻断
        graph.add_edge("collector", "verifier")
        graph.add_edge("verifier", "analyzer")
        graph.add_edge("analyzer", END)
```

**4个Agent**：
1. **Moderator（审核）**：检测政治敏感/暴力/色情/隐私泄露
2. **Collector（搜集）**：从搜索引擎抓取相关来源
3. **Verifier（验证）**：评估来源可信度（1-5星）
4. **Analyzer（分析）**：生成结构化报告（时间线+证据链+倾向判断）

**前端状态管理**（`verificationStore.ts`）：
```typescript
type AgentPhase = 'idle' | 'searching' | 'verifying' | 'analyzing' | 'done'

// 模拟多阶段进度
- searching: 逐步显示"正在搜索..."消息
- verifying: 显示"交叉验证来源可信度..."
- analyzing: 显示"正在生成求证报告..."
- done: 展示最终报告
```

### 2.4 辩论场

**辩论类型**：
- 瓜田辩论（`/debate/:melonId/:title`）
- AI对战（`/ai-arena/:topicId`）
- 圆桌讨论（`/round-table`）

**辩论数据模型**：
```typescript
interface DebateArgument {
  id: string
  camp: 'true' | 'false'     // 正方/反方
  author: string
  content: string
  votes: number
  timestamp: string
}
```

**AI辅助功能**：
- 润色论点（`polishArgument`）
- 生成争议报告（`generateDisputeReport`）

### 2.5 工具箱（6个工具）

| 工具 | 实现方式 | 技术要点 |
|------|----------|----------|
| **EXIF元数据分析** | 纯前端 | exifr库提取元数据，风险评估引擎 |
| **情绪操控检测** | 前端+LLM | 识别6种操控手法，逐句高亮+客观重述 |
| **一键求证** | 前端+后端Pipeline | LangGraph多Agent协作 |
| **反向搜图** | 纯前端 | 跳转Google/百度/Yandex/TinEye搜索 |
| **时间线重建** | 纯前端 | 正则提取日期，自动排序 |
| **洗稿检测** | 纯前端 | N-gram+Jaccard相似度算法 |

---

## 三、数据库设计

### 3.1 核心表结构

```sql
-- 用户表
CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    username VARCHAR(50) UNIQUE,
    nickname VARCHAR(50),
    password_hash VARCHAR(255),
    avatar VARCHAR(500),
    points INTEGER DEFAULT 100,
    rank VARCHAR(20) DEFAULT '吃瓜群众',
    total_guesses INTEGER DEFAULT 0,
    correct_guesses INTEGER DEFAULT 0,
    created_at TIMESTAMP
);

-- 瓜表
CREATE TABLE melons (
    id INTEGER PRIMARY KEY,
    title VARCHAR(200),
    description TEXT,
    cover_image VARCHAR(500),
    category VARCHAR(20),
    creator_id INTEGER REFERENCES users(id),
    result BOOLEAN,              -- NULL=待揭晓, TRUE=真, FALSE=假
    status VARCHAR(20),          -- pending/verified
    reveal_time TIMESTAMP,
    participant_count INTEGER DEFAULT 0,
    true_count INTEGER DEFAULT 0,
    false_count INTEGER DEFAULT 0,
    created_at TIMESTAMP
);

-- 猜测记录表
CREATE TABLE guesses (
    id INTEGER PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    melon_id INTEGER REFERENCES melons(id),
    choice BOOLEAN,              -- TRUE=真, FALSE=假
    is_correct BOOLEAN,
    points_earned INTEGER DEFAULT 0,
    guessed_at TIMESTAMP
);

-- 佐证表
CREATE TABLE evidences (
    id INTEGER PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    melon_id INTEGER REFERENCES melons(id),
    guess_id INTEGER REFERENCES guesses(id),
    content TEXT,
    upvotes INTEGER DEFAULT 0,
    downvotes INTEGER DEFAULT 0,
    is_best BOOLEAN DEFAULT FALSE,
    direction BOOLEAN,           -- TRUE=支持真, FALSE=支持假
    created_at TIMESTAMP
);

-- 实锤报告表
CREATE TABLE reports (
    id INTEGER PRIMARY KEY,
    melon_id INTEGER REFERENCES melons(id),
    timeline TEXT,               -- JSON
    evidence_chain TEXT,         -- JSON
    key_doubts TEXT,             -- JSON
    tendency VARCHAR(100),
    tendency_direction BOOLEAN,
    disclaimer VARCHAR(500),
    generated_at TIMESTAMP
);

-- 证据链表
CREATE TABLE evidence_chains (
    id INTEGER PRIMARY KEY,
    report_id INTEGER REFERENCES reports(id),
    source_url VARCHAR(1000),
    source_type VARCHAR(20),     -- official/media/social/forum
    credibility_level INTEGER DEFAULT 3,
    content_summary TEXT,
    relevance_score FLOAT DEFAULT 0.0,
    created_at TIMESTAMP
);

-- 积分记录表
CREATE TABLE points_records (
    id INTEGER PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    amount INTEGER,
    type VARCHAR(20),
    description VARCHAR(200),
    created_at TIMESTAMP
);
```

### 3.2 待新增表（社区功能）

```sql
-- 社区帖子表
CREATE TABLE posts (
    id INTEGER PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    title VARCHAR(200),
    content TEXT,
    images TEXT,                 -- JSON数组
    type VARCHAR(20),            -- normal/charity/help/hot
    tags TEXT,                   -- JSON数组
    like_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    is_top BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP
);

-- 帖子点赞表
CREATE TABLE post_likes (
    user_id INTEGER REFERENCES users(id),
    post_id INTEGER REFERENCES posts(id),
    PRIMARY KEY (user_id, post_id)
);
```

---

## 四、API设计

### 4.1 用户模块

| 接口 | 方法 | 说明 |
|------|------|------|
| `/users/register` | POST | 注册 |
| `/users/login` | POST | 登录，返回JWT |
| `/users/me` | GET | 获取当前用户信息 |
| `/users/me/stats` | GET | 获取用户统计数据 |
| `/users/me/points` | GET | 获取积分记录 |
| `/users/me/daily-login` | POST | 每日签到 |
| `/users/leaderboard` | GET | 排行榜（待实现） |

### 4.2 瓜田模块

| 接口 | 方法 | 说明 |
|------|------|------|
| `/melons` | GET | 瓜列表 |
| `/melons` | POST | 创建瓜 |
| `/melons/:id` | GET | 瓜详情 |
| `/melons/:id/guess` | POST | 提交猜测 |
| `/melons/:id/my-guess` | GET | 我的猜测 |
| `/melons/:id/evidences` | GET | 佐证列表 |
| `/melons/evidences/:id/upvote` | POST | 点赞佐证 |
| `/melons/evidences/:id/downvote` | POST | 踩佐证 |
| `/melons/:id/report` | GET | 获取实锤报告 |

### 4.3 求证模块

| 接口 | 方法 | 说明 |
|------|------|------|
| `/verify` | POST | 一键求证 |
| `/moderate` | POST | 内容审核 |
| `/evidence` | POST | 创建证据链 |
| `/evidence/report/:report_id` | GET | 获取报告证据链 |
| `/evidence/melon/:melon_id` | GET | 通过瓜ID获取证据链 |

### 4.4 系统模块

| 接口 | 方法 | 说明 |
|------|------|------|
| `/health` | GET | 健康检查 |
| `/models/providers` | GET | 获取可用模型提供商 |
| `/models/set-provider` | POST | 切换模型提供商 |
| `/metrics/system` | GET | 系统指标 |
| `/metrics/business` | GET | 业务指标 |

---

## 五、LLM服务架构

### 5.1 支持的模型供应商

| 类型 | 供应商 |
|------|--------|
| **国产** | DeepSeek、智谱GLM、通义千问、Kimi、豆包、MiniMax、阶跃星辰 |
| **国外** | OpenAI、Claude、Gemini、Groq |
| **自定义** | 支持OpenAI兼容接口 |

### 5.2 服务特性

- **统一接口**：全部使用OpenAI兼容SDK调用
- **自动降级**：主模型失败时自动尝试备用模型
- **JSON模式**：优先使用JSON mode，失败时回退到文本解析
- **环境变量配置**：通过`LLM_PROVIDER`指定主供应商

### 5.3 调用示例

```python
from services.llm import llm_service

# 文本生成
result = await llm_service.generate(
    prompt="分析以下信息的真伪...",
    system_prompt="你是一个事实核查专家",
    temperature=0.7
)

# JSON生成
result = await llm_service.generate_json(
    prompt="生成结构化分析报告...",
    system_prompt="请以JSON格式输出"
)
```

---

## 六、前端架构

### 6.1 路由设计

```typescript
// 主布局路由（带TabBar）
/melon          → 瓜田
/community      → 社区
/verify         → 求证
/profile        → 我的

// 独立页面（无TabBar）
/melon/:id              → 瓜详情
/publish                → 发布
/profile/ranks          → 段位说明
/profile/points         → 积分历史
/tools/exif             → EXIF鉴定
/tools/emotion          → 情绪操控检测
/tools/reverse-image    → 反向搜图
/tools/timeline         → 时间线重建
/tools/plagiarism       → 洗稿检测
/tools/multi-source     → 多源验证
/debate/:melonId/:title → 辩论场
/ai-arena/:topicId      → AI对战
/debates                → 辩论列表
/debate-lobby           → 辩论大厅
/debate-room/:roomId    → 辩论房间
/settings/llm           → LLM设置
```

### 6.2 状态管理（Zustand）

| Store | 职责 |
|-------|------|
| `authStore` | 用户认证状态 |
| `userStore` | 用户信息、段位、积分 |
| `verificationStore` | 求证流程状态 |
| `debateStore` | 辩论状态 |
| `evidenceStore` | 佐证状态 |
| `llmStore` | LLM配置（持久化到localStorage） |

### 6.3 布局策略

**PC端**（≥768px）：
- Twitter风格三栏布局
- 左侧导航栏（220px）
- 中间内容区（自适应）
- 右侧面板（260px）
- 全局字体放大（text-[9px]→11px等）

**移动端**（<768px）：
- 单列布局
- 底部TabBar
- 支持真机模拟（刘海屏适配）

### 6.4 Mock机制

```typescript
// api.ts - 带fallback的请求包装器
async function withFallback<T>(
  realCall: () => Promise<T>,
  mockCall: () => Promise<T>,
): Promise<T> {
  // 未配置API地址时直接走mock
  if (backendAvailable === false) return mockCall()
  
  // 首次探测
  try {
    const result = await realCall()
    backendAvailable = true
    return result
  } catch {
    backendAvailable = false
    return mockCall()
  }
}
```

---

## 七、部署方案

### 7.1 当前方案（零成本）

| 组件 | 部署位置 | 说明 |
|------|----------|------|
| 前端 | Cloudflare Pages | 静态托管，免费 |
| 后端 | Render.com | Python FastAPI，免费层750小时/月 |
| 数据库 | SQLite或Render PostgreSQL | SQLite配合持久化磁盘$0.25/GB/月 |

### 7.2 Docker Compose（本地开发）

```yaml
services:
  postgres:
    image: postgres:15-alpine
    ports: ["5432:5432"]
    environment:
      POSTGRES_USER: jianwei
      POSTGRES_PASSWORD: jianwei_dev_password
      POSTGRES_DB: jianwei

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
```

### 7.3 环境变量

```bash
# .env
DATABASE_URL=sqlite:///./jianwei.db
# DATABASE_URL=postgresql://jianwei:jianwei_dev_password@localhost:5432/jianwei

LLM_PROVIDER=deepseek
DEEPSEEK_API_KEY=xxx
OPENAI_API_KEY=xxx
GROQ_API_KEY=xxx
# ... 其他API Key
```

---

## 八、竞品分析

### 8.1 竞品对比

| 维度 | 观微 | 竞品（专业验证工具） |
|------|------|----------------------|
| **定位** | 社区化事实核查 | 专业验证工具 |
| **用户** | 普通网民 | 专业人士/记者 |
| **交互** | 猜测+佐证+报告 | 纯查询+报告 |
| **内容** | 瓜田+社区+排行榜 | 单次查询不保留 |
| **门槛** | 低（吃瓜社交） | 高（专业工具） |

### 8.2 差异化策略

**观微的独特价值**：
1. **社区化验证**：AI+众人共同验证，不是AI一个人说了算
2. **猜测+激励**：猜瓜机制、积分、排行榜、社交传播
3. **内容沉淀**：每次验证都在丰富平台知识库
4. **证据众包**：AI找证据 + 用户提交佐证 + 社区投票

### 8.3 竞品借鉴点

**可借鉴的工程化设计**：
- 流水线可视化（需求理解→编排派遣→证据收集→...）
- 实时工作流（Agent状态实时更新）
- 决策日志（为什么选择这个信源？）
- 可编辑报告（支持标注批改，给Agent返工）

---

## 九、当前状态与待办

### 9.1 完成度评估

| 模块 | 完成度 | 说明 |
|------|--------|------|
| 前端页面 | 85% | 23个页面，响应式布局完整 |
| 前端组件 | 90% | 22个组件，国风UI完成 |
| 后端API | 90% | 用户/瓜田/验证/审核/证据链 |
| 数据库 | 100% | 7个表，SQLite+PostgreSQL |
| 工具箱 | 100% | 6个工具前端实现完成 |
| AI Agent | 85% | 4个Agent+LangGraph编排 |
| 社区功能 | 30% | 前端mock，后端待实现 |
| 前后端联调 | 0% | 待完成 |
| 部署 | 0% | 待完成 |

### 9.2 待办事项

**P0 - 必须完成**：
- [ ] 前后端联调（配置API地址，替换mock数据）
- [ ] 部署到Cloudflare Pages + Render
- [ ] 核心流程测试（登录→瓜田→猜测→佐证→报告）

**P1 - 重要**：
- [ ] 社区功能实现（帖子CRUD + 评论 + 点赞）
- [ ] 排行榜API（用户排名查询）
- [ ] 一键求证优化（流式输出中间状态）

**P2 - 加分项**：
- [ ] 情绪操控检测优化（批量输入）
- [ ] 可编辑报告（支持标注批改）
- [ ] 流水线可视化（借鉴竞品）

### 9.3 种子数据

已创建扩展用户数据（`backend/seed_users.py`）：
- 10个模拟用户（不同等级/积分/准确率）
- 8条新瓜数据（含已揭晓状态）
- 总计20条瓜数据

---

## 十、关键设计决策

### 10.1 PC/Android布局解耦

**决策**：PC端和安卓端界面不能绑死
- 安卓端瓜田保持单列播放
- PC端采用多列布局（小红书五列瀑布流或推特单列feed）

**实现**：`useIsDesktop()` hook在768px断点切换

### 10.2 真机模拟刘海适配

**决策**：DeviceFrame通过Context传递`notchHeight`
- iPhone 15 Pro刘海34px
- 安全间距 = notchHeight + 8px

### 10.3 LLM模型自定义配置

**决策**：Zustand store + persist middleware持久化到localStorage
- 支持4个provider（Groq/OpenAI/DeepSeek/自定义）
- 切换provider时自动填充默认baseUrl和model
- 测试连接发送`Say "OK"`请求

### 10.4 前端正则审核降级

**决策**：`api.moderate`失败时降级到`contentFilter.ts`本地正则检测
- block/两级分类
- 覆盖政治敏感/暴力/色情/诈骗/虚假信息/健康谣言

---

## 十一、已知问题

1. **前后端割裂**：前端使用mock数据，后端运行在本地localhost
2. **一键求证无实时进度**：当前只调用API等待结果，缺少流式输出
3. **社区功能缺失**：帖子、评论、点赞等功能仅有前端mock
4. **排行榜未实现**：段位计算逻辑已有，但无用户排名查询API
5. **辩论场使用mock数据**：未接入真实后端

---

## 十二、后续规划

### 短期（1-2周）
1. 完成前后端联调
2. 部署上线
3. 核心流程测试

### 中期（2-4周）
1. 社区功能完整实现
2. 排行榜上线
3. 一键求证优化（流式进度）

### 长期（1-2月）
1. 借鉴竞品的工程化设计
2. 可编辑报告功能
3. 更多AI工具集成

---

## 十三、技术深度提升建议

### 13.1 问题诊断

- **纯前端工具（EXIF元数据分析、反向搜图、时间线重建、洗稿检测）**：这些是真实的工程实现——exifr元数据解析、正则+时间排序、N-gram+Jaccard相似度算法。这部分不存在"只是调API"的问题，是值得写进简历/展示给人看的硬技术。
- **AI Pipeline（moderation → collector → verifier → analyzer）**：这部分目前确实基本等于"LangGraph 搭个壳子 + 提示词工程 + 单次LLM调用"，技术深度主要在编排结构上，而不在每个节点内部的算法上。这是"纯调用API"这个感觉的真正来源。

不需要妄自菲薄整个项目，只需要精准地给 AI Pipeline 部分增加技术含量。

### 13.2 具体加深建议（按性价比排序）

| 优先级 | 建议 | 为什么这算"技术"而不只是调API |
|--------|------|-------------------------------|
| P0 | **Collector 节点接入真实搜索API并做结果去重/聚类**，而不是让LLM"回忆"或臆造信源 | 搜索结果去重（embedding聚类或SimHash）、多源合并排序是明确的工程问题，不是prompt能解决的 |
| P0 | **Verifier 节点建立可复现的可信度评分规则**（域名白名单/历史来源准确率/交叉引用数量加权），LLM只负责最后的语义判断，不负责打分本身 | 把"打几星"从纯LLM主观判断变成有权重公式的可解释系统，是典型的规则+模型混合架构，比单纯prompt LLM打分更有技术含量、也更可控 |
| P1 | **建立一个小型评测集**（例如20-50条已知真伪的历史"瓜"或新闻），量化Pipeline在准确率/召回率上的表现 | 这是从"看起来能用"到"能证明有多好用"的关键一步，也是能写进简历的量化指标 |
| P1 | **洗稿检测从N-gram+Jaccard升级为向量语义相似度**（如sentence embedding + cosine similarity） | 现有算法已经是真技术，升级到语义层面能进一步体现你在NLP工程上的能力，且这块完全不依赖LLM API调用 |
| P2 | **落地"一键求证"的流式中间状态**（当前计划里已列为P1待办） | 把黑盒的一次性LLM调用变成可观测的多阶段流水线，本身就是系统设计能力的体现，而不只是产品体验优化 |

### 13.3 一个具体的近期任务

如果只能先做一件事，建议先做 **Verifier 节点的规则化改造**：把"可信度评分"从"喂给LLM让它打1-5星"改成"域名信誉表 + 历史准确率统计 + 交叉引用数量"的加权公式，LLM只处理规则无法覆盖的语义判断部分。这个改动不需要大规模重构，但能直接把"纯调API"的核心节点变成一个有你自己设计的算法逻辑的组件——这也是判断你"技术力"最直接的证据。

### 13.4 补充建议：用“确定性工程”包裹“不确定性模型”

**死磕“流式输出”与“状态可视化”：** 已知问题中提到“一键求证无实时进度”和前端状态管理使用了模拟的多个阶段。把这里的体验做透：利用 WebSocket 或 SSE，将 LangGraph 中 Moderator、Collector、Verifier、Analyzer 四个节点 的状态流转、思考过程、甚至打回重试的动作，**实时、平滑地推送到前端**。构建一套健壮的实时可观测通信机制，绝对是硬核的全栈技术。  

**引入语义级“降本增效”缓存（Semantic Caching）：** 作为一个吃瓜平台，如果很多人对同一个热门“瓜”进行求证，每次都去跑一遍完整的 Agent Pipeline 是极其昂贵且缓慢的。引入一个基于轻量级向量检索（比如本地的 FAISS 或 Chroma）的缓存层。当用户提交的问题与历史求证相似度超过 95% 时，直接返回历史实锤报告。这不仅能体现你对系统性能优化的思考，也是实打实的架构设计。  

**防御性编程与兜底机制（Fallback）：** 目前你设计了前置的正则审核降级，这思路非常对。请将这种思维贯穿到整个 Pipeline 中。例如，当 LLM 无法按要求输出合规的 JSON 时该怎么办？当 12 家供应商的 API 因为网络波动全部超时，你的 Agent 是直接崩溃还是能优雅降级返回部分信息？完善这些边界条件的处理，是区分“Demo 玩具”和“生产级系统”的分水岭。

---

*本文档用于项目复盘和后续改进规划，请根据实际情况更新。*
