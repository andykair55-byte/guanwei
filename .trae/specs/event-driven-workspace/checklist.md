# Checklist

## P0 — 数据层+核心交互

### Workspace和Event类型
- [ ] `src/types/workspace.ts` 定义了 Workspace 接口和 WorkspaceStatus 类型
- [ ] `src/types/activity.ts` 定义了 EventType 枚举和 ActivityEvent 接口

### WorkspaceStore + ActivityStore
- [ ] `src/stores/workspaceStore.ts` 管理workspace列表和当前workspace
- [ ] 支持workspace CRUD（create/delete/rename/switch）
- [ ] 支持状态流转（active/draft/completed/favorite/archived）
- [ ] workspaceStore 使用 Zustand+persist
- [ ] `src/stores/activityStore.ts` 管理事件流
- [ ] addEvent 追加事件到当前workspace
- [ ] 切换workspace时切换events

### Commander服务层
- [ ] `src/services/commanderService.ts` 实现parseGoal（分析目标+识别缺失信息）
- [ ] Commander逐一向用户提问（不一次甩清单）
- [ ] buildPlan构建执行计划（步骤列表）
- [ ] Auto模式自动执行全管线
- [ ] Assist模式展示计划等待确认
- [ ] 集成现有agentService的5个Agent
- [ ] 每个Agent完成后push事件到activityStore

## P1 — UI组件

### EventCard
- [ ] 搜索完成卡片：绿色+结果数+"引用全部"/"查看结果"
- [ ] 观点提炼卡片：绿色+观点列表+"采纳观点"
- [ ] 存疑警告卡片：橙色+存疑条目+"重新核查"/"查看证据"
- [ ] 内容生成卡片：绿色+平台版本按钮
- [ ] Commander提问卡片：蓝色+问题+快速回复
- [ ] 执行计划卡片：蓝色+步骤列表+"开始执行"/"修改计划"
- [ ] 用户操作卡片：灰色+操作描述

### Activity Stream
- [ ] 右侧事件流容器
- [ ] 顶部筛选标签（全部/搜索员/研究员/指挥官/写作员/核查员）
- [ ] 事件卡片时间线按时间排列
- [ ] 自动滚动到最新事件
- [ ] Agent筛选功能可用

### CommanderInput
- [ ] 底部输入框
- [ ] placeholder"输入/触发技能，或 @Agent"
- [ ] 发送按钮
- [ ] 输入调用commanderService
- [ ] 始终可输入回复Commander提问

### VersionBar
- [ ] 底部版本历史条
- [ ] 显示最近版本（V5/V4/V3+时间）
- [ ] "查看全部"按钮
- [ ] 点击版本预览/恢复
- [ ] "自动保存已开启"指示

### WorkspaceSidebar
- [ ] 顶部Logo+"新建工作空间"按钮
- [ ] 进行中workspace列表
- [ ] 草稿workspace列表
- [ ] 收藏夹区域+"查看全部(N)"
- [ ] 归档区域+"查看全部(N)"
- [ ] 底部icon rail（瓜田/社区/时间线/工作间/技能库/设置+用户信息）

## P2 — 页面集成

### AgentWorldPage三栏布局
- [ ] 三栏flex布局（左220px/中flex-1/右340px）
- [ ] 中栏顶部工具栏（返回/面包屑/保存状态/撤销重做/模式切换）
- [ ] 平台tab栏（通用稿+5平台++/发布到）
- [ ] 状态栏（Agent连接数/字数/阅读时间/发布到）
- [ ] 编辑区MarkdownEditor
- [ ] 底部VersionBar+CommanderInput
- [ ] 右栏ActivityStream
- [ ] 新建Workspace显示欢迎事件
- [ ] 保留demo/melonId入口
- [ ] Auto模式全自动执行
- [ ] Assist模式展示计划等待确认
- [ ] `npx tsc --noEmit -p tsconfig.app.json` 零错误
