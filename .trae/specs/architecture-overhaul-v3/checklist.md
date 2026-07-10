# Checklist

## P0 — 策划案文档
- [x] docs/plan 下模块归属表、路由表、MVP范围全部同步
- [x] 新增工作间策划案文档（AI创作+LLM求证嵌入+发布目标）
- [x] 新增trae宝策划案文档（能力清单+页面上下文注入接口+限流）
- [x] 新增娱乐大厅策划案文档（人机对决+多人辩论+AI斗蛐蛐）
- [x] 新增侧边栏自定义功能设计文档
- [x] 用户体系策划案删除"砍掉私信"，补充通知/私信设计
- [x] 求证工具集策划案标记情绪检测归入trae宝，反向搜图/洗稿/多源验证砍掉

## P0 — callLLM统一入口
- [x] aiJudgeService.ts 使用 llmStore.callLLM()，无hardcode Groq fetch
- [x] aiSummaryService.ts 使用 llmStore.callLLM()
- [x] aiTranslatorService.ts 使用 llmStore.callLLM()
- [x] emotionAnalysis.ts 使用 llmStore.callLLM()
- [x] 切换LLM provider后全部AI功能跟随切换
- [x] 关闭API key后降级到mock数据

## P0 — 顶部导航+侧边栏
- [x] TopNavbar.tsx 发布按钮已替换为搜索框
- [x] DesktopSidebar.tsx 新增"娱乐"导航项
- [x] 默认导航项为：瓜田、社区、时间线、工作间、娱乐、设置
- [x] sidebarStore.ts 实现导航项配置localStorage持久化
- [x] 用户可在设置页增删导航项
- [x] 至少保留1个导航项的保底逻辑

## P0 — 工作间
- [x] 工作间路由从standaloneRoutes移到layoutRoutes，platform为web
- [x] WebApp.tsx pageMap中/agent-world从standaloneMap移到pageMap
- [x] AgentWorldPage.tsx 不再是占位页，显示创作界面
- [x] StructuredEditor组件存在且可输入标题+立场+生成骨架+逐段填充
- [x] AISkeletonPanel组件展示骨架，支持接受/修改/删除节点
- [x] PublishTargetSelector组件支持选择瓜田佐证/社区帖子
- [x] creationStore.ts 实现草稿localStorage自动保存（每3秒）
- [x] creationService.ts 骨架生成调用callLLM
- [x] LLM不可用时降级为3个预设模板（事件分析/观点论述/对比评测）
- [x] 工作间内嵌入LLM求证功能（ClaimVerifier）
- [x] WebLayout.tsx中/agent-world不再触发沉浸式模式

## P0 — trae宝
- [x] TraeBot.tsx 全局组件存在，右下角悬浮图标
- [x] 点击图标弹出聊天面板，可输入消息
- [x] trae宝调用callLLM回复消息，12秒超时降级
- [x] 瓜详情页/社区帖子页/热点详情页实现页面上下文注入
- [x] trae宝可"总结当前文章"（获取页面上下文→callLLM→展示摘要）
- [x] trae宝可"提取关键事实"（获取页面上下文→callLLM→展示事实列表）
- [x] trae宝情绪检测功能（选中文本→分析→展示结果）
- [x] 会话跨页面保留（traeBotStore + localStorage）
- [x] 每用户每分钟3条消息限流
- [x] 工作间和娱乐大厅页面trae宝不显示

## P1 — 娱乐大厅
- [x] 娱乐大厅入口页存在，显示3个模式卡片
- [x] /entertainment路由已配置
- [x] 多人辩论卡片标记"即将开放"
- [x] AI斗蛐蛐入口跳转现有/ai-battle
- [x] 人机对决入口跳转现有/debate-lobby

## P1 — 种子内容
- [x] 至少50条种子瓜数据已写入mockData
- [x] 种子瓜无明显AI生成痕迹（人工审核）

## P1 — PublishPage
- [x] PublishPage保留作为快速发布入口
- [x] 工作间发布流程中有快速发布跳转链接
- [x] PublishPage发布目标选择器（选瓜/选社区）

## P1 — 右侧面板
- [x] "智能体状态"假数据面板已移除
- [x] 替换为热点摘要/推荐瓜/创作提示等实际内容
- [x] 右侧面板折叠功能正常

## P2 — 工具页面清理
- [x] 反向搜图/洗稿检测/多源验证页面为"即将开放"占位或路由已移除
- [x] 情绪检测独立路由已移除（功能归入trae宝）
- [x] WebApp.tsx和MobileApp.tsx的pageMap已同步清理
- [x] EXIF分析保持独立页
- [x] 时间线构建保持独立，与热点系统关联

## P2 — 降级预案
- [x] trae宝 LLM超时12秒AbortSignal→友好提示
- [x] 工作间骨架生成失败可重试
- [x] 侧边栏导航项全部删除时恢复默认

## P2 — 新手引导
- [x] 首次进入默认展示瓜田
- [x] trae宝首次出现引导提示
- [x] "猜第一个瓜"完整循环引导
