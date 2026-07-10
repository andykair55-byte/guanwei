# Tasks

## P0 — 核心闭环

- [x] Task 1: 更新策划案文档
  - [x] SubTask 1.1: 更新「项目模块全景总览」— 模块归属表、优先级、路由表、MVP范围全部同步
  - [x] SubTask 1.2: 更新「AI创作助手策划案」— 路由从 /create 改为 /agent-world，合并入工作间，工具归属调整
  - [x] SubTask 1.3: 新增「工作间策划案」— AI创作为主+LLM求证嵌入+发布到瓜田/社区
  - [x] SubTask 1.4: 新增「trae宝策划案」— 右下角全局聊天agent，能力清单，页面上下文注入接口
  - [x] SubTask 1.5: 新增「娱乐大厅策划案」— 人机对决+多人辩论+AI斗蛐蛐
  - [x] SubTask 1.6: 更新「用户体系策划案」— 删除"砍掉私信"，补充通知/私信设计
  - [x] SubTask 1.7: 更新「求证工具集策划案」— 情绪检测归入trae宝，反向搜图/洗稿/多源验证砍掉
  - [x] SubTask 1.8: 更新「迭代开发计划」— Sprint计划同步新模块
  - [x] SubTask 1.9: 新增「侧边栏自定义功能设计」— 增删导航项，localStorage持久化

- [x] Task 2: callLLM 统一入口重构
  - [x] SubTask 2.1: aiJudgeService.ts 改用 llmStore.callLLM()，保留mock fallback
  - [x] SubTask 2.2: aiSummaryService.ts 改用 llmStore.callLLM()
  - [x] SubTask 2.3: aiTranslatorService.ts 改用 llmStore.callLLM()
  - [x] SubTask 2.4: emotionAnalysis.ts 改用 llmStore.callLLM()
  - [x] SubTask 2.5: 验证：切换provider后全部AI功能跟随切换，关闭key后降级到mock

- [x] Task 3: 顶部导航栏+侧边栏重构
  - [x] SubTask 3.1: TopNavbar.tsx 发布按钮改为搜索框
  - [x] SubTask 3.2: DesktopSidebar.tsx 新增"娱乐"导航项，默认导航项更新为：瓜田、社区、时间线、工作间、娱乐、设置
  - [x] SubTask 3.3: 新增 stores/sidebarStore.ts — 导航项配置localStorage持久化
  - [x] SubTask 3.4: DesktopSidebar.tsx 实现自定义增删（读取sidebarStore配置）
  - [x] SubTask 3.5: 设置页新增导航项配置面板

- [x] Task 4: 工作间搭建
  - [x] SubTask 4.1: routes.ts 工作间从 standaloneRoutes 移到 layoutRoutes，platform 改为 web
  - [x] SubTask 4.2: WebApp.tsx pageMap 同步（/agent-world 从 standaloneMap 移到 pageMap）
  - [x] SubTask 4.3: AgentWorldPage.tsx 从占位页重写为创作界面（结构化编辑器主体）
  - [x] SubTask 4.4: 新增 components/create/StructuredEditor.tsx — 标题+立场输入→骨架展示→逐段填充
  - [x] SubTask 4.5: 新增 components/create/AISkeletonPanel.tsx — AI骨架展示+接受/修改/删除节点
  - [x] SubTask 4.6: 新增 components/create/PublishTargetSelector.tsx — 选择发布到瓜田佐证/社区帖子
  - [x] SubTask 4.7: 新增 stores/creationStore.ts — 草稿+骨架+风格档案+发布目标，localStorage自动保存
  - [x] SubTask 4.8: 新增 services/creationService.ts — 骨架生成callLLM + 3个预设模板兜底
  - [x] SubTask 4.9: 工作间内嵌入LLM求证功能（ClaimVerifier组件，检测声明→标记→一键核查）
  - [x] SubTask 4.10: WebLayout.tsx 工作间不再触发沉浸式模式（从IMMERSIVE_ROUTES中移除/agent-world）

- [x] Task 5: trae宝全局组件
  - [x] SubTask 5.1: 新增 stores/traeBotStore.ts — 聊天历史+页面上下文+限流计数，跨页面保留
  - [x] SubTask 5.2: 新增 components/TraeBot.tsx — 右下角悬浮图标+弹出聊天面板（可拖拽调整大小）
  - [x] SubTask 5.3: trae宝聊天功能 — 调用callLLM，12秒超时降级
  - [x] SubTask 5.4: trae宝总结/提取关键事实 — 获取页面上下文→callLLM→展示结果
  - [x] SubTask 5.5: trae宝情绪检测 — 复用emotionAnalysis.ts，选中文本→分析→展示
  - [x] SubTask 5.6: 页面上下文注入接口 — 定义usePageContext() hook，瓜详情/社区帖子/热点详情页实现注入
  - [x] SubTask 5.7: trae宝限流 — 每用户每分钟3条消息上限
  - [x] SubTask 5.8: WebLayout.tsx 全局挂载TraeBot，工作间和娱乐大厅路由不显示

## P1 — 影响MVP可演示性

- [x] Task 6: 娱乐大厅入口页
  - [x] SubTask 6.1: 新增娱乐大厅入口页（3个模式卡片：人机对决/多人辩论/AI斗蛐蛐）
  - [x] SubTask 6.2: routes.ts 新增 /entertainment 路由
  - [x] SubTask 6.3: 多人辩论卡片标记"即将开放"
  - [x] SubTask 6.4: AI斗蛐蛐入口跳转现有 /ai-battle
  - [x] SubTask 6.5: 人机对决入口跳转现有 /debate-lobby（或新建页面）

- [x] Task 7: 瓜田种子内容供给
  - [x] SubTask 7.1: 用callLLM生成50条种子瓜数据（或手动编写高质量mock）
  - [x] SubTask 7.2: 种子瓜人工审核（确保无明显AI痕迹）
  - [x] SubTask 7.3: 种子瓜写入mockData

- [x] Task 8: PublishPage定位确认
  - [x] SubTask 8.1: PublishPage保留作为"快速发布"入口（无AI辅助）
  - [x] SubTask 8.2: 工作间发布流程中增加"快速发布"跳转链接
  - [x] SubTask 8.3: PublishPage发布目标选择器（选瓜/选社区）

- [x] Task 9: 右侧面板内容重定义
  - [x] SubTask 9.1: DesktopRightPanel.tsx 移除"智能体状态"假数据面板
  - [x] SubTask 9.2: 替换为热点摘要/推荐瓜/创作提示等实际内容
  - [x] SubTask 9.3: 或支持用户折叠隐藏右侧面板（已有折叠功能，确认可用）

## P2 — 提升方案完整性

- [x] Task 10: 工具页面清理
  - [x] SubTask 10.1: 反向搜图、洗稿检测、多源验证页面改为"即将开放"占位
  - [x] SubTask 10.2: 情绪检测路由从routes.ts移除（功能归入trae宝）
  - [x] SubTask 10.3: WebApp.tsx和MobileApp.tsx的pageMap同步清理
  - [x] SubTask 10.4: EXIF分析保持独立页确认
  - [x] SubTask 10.5: 时间线构建保持独立，确认与热点系统关联

- [x] Task 11: 降级预案完善
  - [x] SubTask 11.1: trae宝 LLM超时处理（12秒AbortSignal→友好提示）
  - [x] SubTask 11.2: 工作间骨架生成失败重试机制
  - [x] SubTask 11.3: 侧边栏导航项全部删除时的保底逻辑（至少保留1个）

- [x] Task 12: 新手引导设计
  - [x] SubTask 12.1: 首次进入默认展示瓜田
  - [x] SubTask 12.2: trae宝首次出现引导提示
  - [x] SubTask 12.3: "猜第一个瓜"完整循环引导

# Task Dependencies
- Task 2 (callLLM重构) 是 Task 4 (工作间) 和 Task 5 (trae宝) 的前置依赖
- Task 3 (侧边栏重构) 和 Task 2 可并行
- Task 4 (工作间) 依赖 Task 2 完成
- Task 5 (trae宝) 依赖 Task 2 完成
- Task 4 和 Task 5 可并行
- Task 6 (娱乐大厅) 独立，可与 Task 4/5 并行
- Task 7 (种子内容) 独立，可与任何任务并行
- Task 8 (PublishPage) 依赖 Task 4 完成（工作间发布流程）
- Task 9 (右侧面板) 独立
- Task 10-12 (P2) 依赖 P0 完成后进行
