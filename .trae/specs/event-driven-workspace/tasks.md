# Tasks

## P0 — 数据层+核心交互

- [ ] Task 1: 定义Workspace和Event类型
  - [ ] SubTask 1.1: 创建 `src/types/workspace.ts` — Workspace接口（id/title/topic/status/createdAt/updatedAt/draft/events/platformContents），WorkspaceStatus类型（active/draft/completed/favorite/archived）
  - [ ] SubTask 1.2: 创建 `src/types/activity.ts` — EventType枚举（search_complete/research_complete/verify_warning/writing_complete/commander_question/commander_plan/user_action/error），ActivityEvent接口（id/timestamp/type/agentType/title/content/actions/data）

- [ ] Task 2: WorkspaceStore + ActivityStore
  - [ ] SubTask 2.1: 创建 `src/stores/workspaceStore.ts` — Zustand+persist，管理workspace列表、当前workspace、CRUD操作、状态流转（active/draft/completed/favorite/archived）
  - [ ] SubTask 2.2: 创建 `src/stores/activityStore.ts` — Zustand，管理当前workspace的事件流，addEvent/clearEvents/filterByAgent
  - [ ] SubTask 2.3: 每个workspace有独立的activity events，切换workspace时切换events

- [ ] Task 3: Commander服务层
  - [ ] SubTask 3.1: 创建 `src/services/commanderService.ts` — Commander核心逻辑：parseGoal（分析用户目标→识别缺失信息）、askQuestion（生成追问事件）、buildPlan（构建执行计划）、executePlan（Auto模式执行/Assist模式等待确认）
  - [ ] SubTask 3.2: 任务规格收集流程：用户输入goal→Commander识别需要补充的信息（目标平台/受众/深度/时间范围/是否需要联网）→逐一向用户提问（每次1-2个问题，不一次性甩清单）→收集完整后规划
  - [ ] SubTask 3.3: 执行计划格式：步骤列表（搜索/核查/提炼/写作/适配），每步有描述和预计时间
  - [ ] SubTask 3.4: 集成现有agentService的runSearchAgent/runResearchAgent/runVerifyAgent/runWritingAgent，每个Agent完成后push事件到activityStore

## P1 — UI组件

- [ ] Task 4: EventCard事件卡片组件
  - [ ] SubTask 4.1: 创建 `src/components/workspace/EventCard.tsx` — 根据EventType渲染不同卡片样式
  - [ ] SubTask 4.2: 搜索完成卡片（绿色）— 图标+标题+结果数+"引用全部"/"查看结果"按钮
  - [ ] SubTask 4.3: 观点提炼卡片（绿色）— 观点列表+"采纳观点"按钮
  - [ ] SubTask 4.4: 存疑警告卡片（橙色）— 存疑条目+"重新核查"/"查看证据"按钮
  - [ ] SubTask 4.5: 内容生成卡片（绿色）— 平台版本按钮组（知/红/微/抖/B）
  - [ ] SubTask 4.6: Commander提问卡片（蓝色）— 问题+选项/快速回复按钮+输入框
  - [ ] SubTask 4.7: 执行计划卡片（蓝色）— 步骤列表+"开始执行"/"修改计划"按钮
  - [ ] SubTask 4.8: 用户操作卡片（灰色）— 描述用户执行的操作（采纳/忽略等）

- [ ] Task 5: Activity Stream右栏
  - [ ] SubTask 5.1: 创建 `src/components/workspace/ActivityStream.tsx` — 右侧事件流容器
  - [ ] SubTask 5.2: 顶部标题"工作空间活动流"+筛选标签（全部/搜索员/研究员/指挥官/写作员/核查员）+筛选/设置图标
  - [ ] SubTask 5.3: 事件卡片时间线（按时间排列，最新在下）
  - [ ] SubTask 5.4: 自动滚动到最新事件
  - [ ] SubTask 5.5: Agent筛选功能

- [ ] Task 6: CommanderInput底部输入框
  - [ ] SubTask 6.1: 创建 `src/components/workspace/CommanderInput.tsx` — 底部输入框组件
  - [ ] SubTask 6.2: placeholder文字"输入/触发技能，或 @Agent"
  - [ ] SubTask 6.3: 发送按钮（箭头图标）
  - [ ] SubTask 6.4: 输入后调用commanderService处理
  - [ ] SubTask 6.5: 对Commander的提问直接在输入框回复（输入框始终可输入，不需要额外回复按钮）

- [ ] Task 7: VersionBar版本历史条
  - [ ] SubTask 7.1: 创建 `src/components/workspace/VersionBar.tsx` — 底部版本条
  - [ ] SubTask 7.2: 显示最近版本（V5 2分钟前/V4 10分钟前/V3 25分钟前）
  - [ ] SubTask 7.3: "查看全部"按钮展开版本列表
  - [ ] SubTask 7.4: 点击版本可预览/恢复
  - [ ] SubTask 7.5: "自动保存已开启"状态指示

- [ ] Task 8: WorkspaceSidebar左栏
  - [ ] SubTask 8.1: 创建 `src/components/workspace/WorkspaceSidebar.tsx` — 三栏布局左栏
  - [ ] SubTask 8.2: 顶部：观微Logo + "+ 新建工作空间"按钮
  - [ ] SubTask 8.3: 进行中列表：当前活跃workspace，显示标题+时间+"进行中"标签
  - [ ] SubTask 8.4: 草稿列表：未完成的workspace，显示"昨天/2天前/3天前"
  - [ ] SubTask 8.5: 收藏夹区域：标题+"查看全部(N)"
  - [ ] SubTask 8.6: 归档区域：标题+"查看全部(N)"
  - [ ] SubTask 8.7: 底部icon rail：瓜田/社区/时间线/工作间(高亮)/技能库/设置图标+用户头像/等级

## P2 — 页面集成

- [ ] Task 9: 重写AgentWorldPage为三栏布局
  - [ ] SubTask 9.1: 三栏flex布局（左栏220px固定/中栏flex-1/右栏340px固定）
  - [ ] SubTask 9.2: 中栏顶部：返回+面包屑+保存状态+撤销/重做+Assist/Auto切换+更多菜单
  - [ ] SubTask 9.3: 中栏平台tab：通用稿(主稿)带绿点/知乎/小红书/微博/抖音/B站+/发布到按钮
  - [ ] SubTask 9.4: 中栏状态栏：已连接5/5 Agent+字数+预计阅读时间+"发布到"+平台图标
  - [ ] SubTask 9.5: 中栏编辑区：MarkdownEditor集成，选中文字显示浮动AI操作菜单
  - [ ] SubTask 9.6: 中栏底部：VersionBar + CommanderInput
  - [ ] SubTask 9.7: 右栏：ActivityStream
  - [ ] SubTask 9.8: 新建Workspace时Commander显示欢迎事件（"你想创作什么内容？"）
  - [ ] SubTask 9.9: 保留现有入口（demo模式/melonId进入/示例样板）适配新架构
  - [ ] SubTask 9.10: Auto模式：Commander收集规格后自动执行全管线；Assist模式：展示计划等待确认

# Task Dependencies
- Task 1 → Task 2 (类型先于Store)
- Task 2 → Task 3 (Store先于Service)
- Task 1,2,3 → Task 4 (类型/Store/Service先于组件)
- Task 4 → Task 5,6,7,8 (EventCard是其他组件的基础)
- Task 5,6,7,8 → Task 9 (所有组件先于页面集成)
