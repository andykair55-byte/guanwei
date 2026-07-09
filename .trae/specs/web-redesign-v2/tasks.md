# 观微 Web 端 UI 重构 v2 - 实施计划

## [x] Task 1: 创建全局顶部导航栏组件 (TopNavbar.tsx)
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 在 `src/components/` 下新建 `TopNavbar.tsx`
  - 高度 60px，flex 布局，白色背景，底部细边框（border-line/20）
  - 左侧：观微 Logo（用 Lucide Search 图标改色模拟设计稿中的放大镜logo，或用现有logo；文字"观微"font-bold text-[20px]）
  - 中间：搜索框，max-w-[480px] w-full mx-auto，圆角 full，bg-paper-dark，包含 Search 图标 + input，占位文字"搜索帖子、话题、用户..."
  - 右侧：发布按钮（bg-ink-900 text-white rounded-full px-5 py-2 flex items-center gap-1.5，Feather 图标 + "发布"文字）+ Bell 通知图标按钮 + 用户头像（圆形，w-9 h-9，seal/10 背景显示昵称首字）
  - 点击 Logo 导航到 /community；点击发布按钮导航到 /publish；点击头像导航到 /profile
  - 使用 `useNavigate` 和 `useAuthStore` 获取用户信息
  - 所有按钮包含 aria-label 和 press-pop 反馈
- **Acceptance Criteria Addressed**: AC-1, AC-10
- **Test Requirements**:
  - `human-judgement` TR-1.1: 顶栏固定在顶部，三个区域（左/中/右）布局正确，搜索框视觉居中
  - `human-judgement` TR-1.2: 发布按钮为黑底白字圆角胶囊，通知铃铛和头像正确显示
  - `human-judgement` TR-1.3: 各按钮有 hover/press 反馈，点击导航正确
  - `programmatic` TR-1.4: TypeScript 编译无错误，无缺失 import

## [x] Task 2: 重构 WebLayout 整合顶栏与三栏
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - 修改 `src/layouts/WebLayout.tsx`
  - 整体布局改为 flex-col：顶部 TopNavbar + 下方 flex 三栏（sidebar + main + rightPanel）
  - 外层 h-dvh flex flex-col overflow-hidden
  - TopNavbar 作为 flex-shrink-0 固定在顶
  - 下方三栏区域 flex-1 flex min-h-0：左侧栏 / 主内容区 / 右侧栏（或收起条）
  - 主内容区 overflow-y-auto 保持独立滚动
  - 保留 sidebarCollapsed 和 rightPanelHidden 状态及切换逻辑
  - 移除之前页面内的 sticky hero 顶栏逻辑（页面不再需要自己处理顶部吸附，全局顶栏已固定）
- **Acceptance Criteria Addressed**: AC-1, AC-3, AC-9
- **Test Requirements**:
  - `human-judgement` TR-2.1: 顶栏固定，下方三栏占满剩余高度，主内容区独立滚动不影响侧栏
  - `human-judgement` TR-2.2: 左侧栏收起/展开动画平滑，右侧栏隐藏/显示细条按钮工作正常
  - `programmatic` TR-2.3: 无布局错乱，TypeScript 编译通过

## [x] Task 3: 重构左侧导航栏 (DesktopSidebar.tsx)
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - 重写 `src/components/DesktopSidebar.tsx` 的菜单项
  - 展开宽度改为 `w-[200px]`（设计稿更窄），收起宽度保持 `w-[64px]`
  - 顶部不再显示大 Logo 和"不信一家之言"（Logo 已在顶栏），改为收起/展开按钮放在顶部
  - 新菜单项数组（icon 用 Lucide）：
    - { path: '/community', label: '推荐', icon: Star } — 默认激活
    - { path: '/community?tab=following', label: '关注', icon: Users }（先跳 /community，tab 状态后续可接入）
    - { path: '/verify', label: '求证', icon: Search }
    - { path: '/debate-lobby', label: '辩论场', icon: Swords }
    - { path: '/community?tab=hot', label: '吃瓜榜', icon: Flame }
    - { path: '/community?tab=welfare', label: '公益', icon: Heart }
    - { path: '/community?tab=topic', label: '话题', icon: Hash }
  - 分隔线后二级菜单：我的收藏（Star/Save 图标）、浏览历史（Clock 图标）、草稿箱（FileEdit/Inbox 图标）— 点击暂时 navigate('/profile')
  - 菜单项样式：展开态 px-3 py-2.5 text-[14px]，激活态 bg-red-50 text-red-600 font-medium 左侧 3px 红条（保留现有 nav-item-active 样式）；收起态 justify-center
  - 底部区域：
    - 数据卡片1："今日已求证" label + brand-mono 大号数字 128（text-[28px] font-bold text-ink-900）+ "较昨日 +23"（text-[11px] text-bamboo）+ 迷你红色折线趋势图（用 SVG 画一个简单上升波浪线）
    - 数据卡片2："AI 正在求证" label + brand-mono 大号数字 12 + "个话题" + 一个小机器人图标区域（用现有 Bot 图标或 Cpu 图标淡色圆形背景）
    - 最底部版权："观微 · 2024"（text-[11px] text-ink-400）+"AI 辅助求证社区"（text-[10px] text-ink-300）
  - 移除原有的"工具箱"分组、"关于观微"入口、参赛标签、Google 风格用户切换器（用户信息已在顶栏头像）
- **Acceptance Criteria Addressed**: AC-2, AC-3
- **Test Requirements**:
  - `human-judgement` TR-3.1: 菜单项顺序与设计一致（推荐/关注/求证/辩论场/吃瓜榜/公益/话题 + 收藏/历史/草稿箱）
  - `human-judgement` TR-3.2: 激活态为浅红底+左侧红条+红色文字，与设计一致
  - `human-judgement` TR-3.3: 底部数据卡片显示"128"和"12"大数字，有趋势图和机器人图标
  - `human-judgement` TR-3.4: 收起态只显示图标，布局不溢出；展开/收起切换动画正常
  - `programmatic` TR-3.5: 所有 Lucide 图标正确导入，TypeScript 无错误

## [x] Task 4: 重构右侧面板 (DesktopRightPanel.tsx)
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - 重写 `src/components/DesktopRightPanel.tsx`
  - 宽度保持 `w-[300px]`，白色背景，顶部保留 sticky 收起按钮
  - 模块一：正在激辩
    - 标题栏左侧小火焰图标 bg（红/橙色浅底）+ "正在激辩"文字 + 右侧"更多 >"链接
    - 列表：5 条，每条 flex 布局：编号（w-5 text-center，前3名 text-seal font-bold，后2名 text-ink-400）+ 辩题文字（line-clamp-2 text-[14px] text-ink-800）+ 下方"1.2w 人参与"（text-[12px] text-ink-400，用 Eye 图标）
    - 复用现有 hotDebates mock 数据，spectators 改为参与人数显示
  - 模块二：吃瓜榜（新增）
    - 标题栏左侧小 TrendingUp 图标 bg（金色浅底）+ "吃瓜榜"文字 + 右侧"更多 >"
    - 列表：5 条，类似正在激辩的编号+标题+热度
    - 第1名标题旁加一个小标签：🔥 "热"（bg-red-50 text-red-500 text-[10px] px-1.5 py-0.5 rounded）
    - 右侧显示 Eye 图标 + 数字（如 1.2w）
    - 数据从 mockData 中取 melons 前 5 条，或在组件内定义 mock 数组
  - 模块三：热门话题
    - 标题栏 Hash 图标 + "热门话题" + "更多 >"
    - 列表：每条 # 话题名（text-[14px] text-ink-700 font-medium）+ 右侧讨论数（text-[12px] text-ink-400，如"12.3w 讨论"）
  - 模块四：推荐用户（新增）
    - 标题栏 User 图标 + "推荐用户" + "更多 >"
    - 列表：3 个用户，flex 布局：圆形头像（w-10 h-10，首字背景色或默认头像）+ 用户信息区（昵称 text-[14px] font-medium text-ink-900 + 身份标签 text-[11px] text-ink-400，如"求证达人"/"辩论高手"/"科学科普博主"）+ 右侧红色"关注"按钮（bg-seal text-white text-[12px] px-3 py-1 rounded-full）
    - 关注按钮点击切换为"已关注"状态（bg-paper-dark text-ink-500）
  - 每个模块之间有分隔线 border-t border-line/15，p-4 内边距
  - 移除原有的"进入辩论大厅"按钮（入口已在导航）
- **Acceptance Criteria Addressed**: AC-4
- **Test Requirements**:
  - `human-judgement` TR-4.1: 四个模块顺序正确：正在激辩→吃瓜榜→热门话题→推荐用户
  - `human-judgement` TR-4.2: 正在激辩/吃瓜榜前3名编号为红色，吃瓜榜第1名带"热"标签
  - `human-judgement` TR-4.3: 推荐用户带红色"关注"按钮，点击可切换已关注状态
  - `human-judgement` TR-4.4: 各模块有"更多 >"入口，hover 时文字变 seal 色
  - `programmatic` TR-4.5: 所有 mock 数据正确定义，TypeScript 无错误

## [x] Task 5: 创建新的首页内容卡片组件 (HomeCard.tsx)
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 在 `src/components/` 下新建 `HomeCard.tsx`（统一的双列瀑布流卡片，替代 MelonCard 和 CommunityCard 在首页的使用）
  - Props 接口：
    ```ts
    interface HomeCardProps {
      id: string | number
      coverImage: string
      title: string
      category: string          // 如 "娱乐吃瓜"
      categoryColor?: string    // 可选标签色，默认淡色
      status: 'hot' | 'verified' | 'verifying' | 'debating'  // 状态
      timeAgo: string           // 如 "1小时前"
      author: { avatar?: string; nickname: string }
      likeCount: number
      isLiked?: boolean
      onClick?: () => void
      index?: number            // 用于 stagger 动画
    }
    ```
  - 布局：外层 div bg-white rounded-2xl overflow-hidden shadow-card hover:shadow-card-hover hover-lift cursor-pointer transition-all（不设边框，靠阴影分层）
  - 图片区：relative w-full，aspectRatio 随机或按图片设定（不固定比例，允许高度 160~260px 自然差异；为实现瀑布流可用 aspect-[4/3], aspect-[3/4], aspect-[16/10], aspect-[1/1] 等几种预设按 index 轮换模拟自然高度）
    - img: w-full h-full object-cover
    - 左上角状态标签：absolute top-3 left-3，px-2 py-1 rounded-lg text-[11px] font-semibold text-white，按状态变色：
      - hot → bg-gradient-to-r from-red-500 to-orange-500，文字 "🔥 热门"
      - verified → bg-bamboo，文字 "✅ 已求证"
      - verifying → bg-gold，文字 "🟡 求证中"
      - debating → bg-purple-500（可在主题中加紫色 token 或直接用 purple-500），文字 "💬 辩论中"
    - 右上角时间标签：absolute top-3 right-3，px-2 py-0.5 rounded-full text-[11px] text-white bg-black/30 backdrop-blur-sm
  - 内容区：p-3
    - 标题：text-[15px] font-semibold text-ink-900 line-clamp-2 leading-snug mb-2.5 hover-title
    - 底部栏：flex items-center justify-between
      - 左侧：flex items-center gap-2
        - 分类标签：px-2 py-0.5 rounded-md text-[11px] font-medium（按分类给浅色背景：娱乐吃瓜→bg-pink-50 text-pink-600；社会热点→bg-amber-50 text-amber-700；校园趣事→bg-green-50 text-green-700；科技数码→bg-blue-50 text-blue-600；生活分享→bg-violet-50 text-violet-600；默认→bg-ink-100 text-ink-600）
        - 作者信息：flex items-center gap-1 ml-1
          - 作者头像：w-5 h-5 rounded-full bg-seal/10 text-seal text-[10px] flex items-center justify-center（或 img 如果有 avatar URL）
          - 作者昵称：text-[11px] text-ink-500 max-w-[80px] truncate
      - 右侧：点赞按钮（Heart 图标 + 数字），点击可切换点赞状态，带心跳动效（复用 MelonCard 的点赞逻辑）
  - 卡片动画：animate-fade-in-up stagger-${Math.min(index+1, 8)}
- **Acceptance Criteria Addressed**: AC-5, AC-6
- **Test Requirements**:
  - `human-judgement` TR-5.1: 卡片为白底圆角阴影样式，图片在上文字在下
  - `human-judgement` TR-5.2: 状态标签在图片左上角，颜色分别为热(红橙)/已求证(绿)/求证中(金)/辩论中(紫)
  - `human-judgement` TR-5.3: 时间标签在图片右上角，白色半透明
  - `human-judgement` TR-5.4: 标题2行截断，下方是分类标签+作者+点赞
  - `human-judgement` TR-5.5: 点赞按钮可交互，点击心形变红填充
  - `programmatic` TR-5.6: Props 类型定义完整，TypeScript 无错误

## [x] Task 6: 重构首页 CommunityPage 内容区
- **Priority**: high
- **Depends On**: Task 2, Task 3, Task 4, Task 5
- **Description**:
  - 重写 `src/pages/CommunityPage.tsx`
  - 移除旧的 sticky hero 搜索区（搜索和顶栏已在全局），移除"关于我们"按钮入口（已在侧栏或后续页面）
  - 页面结构改为：
    1. 一级分类 Tab：px-6 pt-4 pb-1 flex items-center gap-6 border-b border-line/15
       - tabs: ['推荐', '热门', '求证', '辩论', '公益', '校园', '生活']
       - 激活项：text-seal font-bold text-[16px]，底部 3px 圆角红条（w-6 h-[3px] bg-seal rounded-full absolute bottom-[-6px] left-1/2 -translate-x-1/2）
       - 非激活项：text-ink-500 text-[15px] hover:text-ink-800
    2. Hero Banner：mx-6 mt-4 rounded-2xl p-6 relative overflow-hidden，背景渐变 from-indigo-100 via-purple-50 to-pink-50（或淡蓝紫渐变），flex items-center justify-between
       - 左侧文案区：
         - 标题：text-[22px] font-bold text-ink-900 mb-1 "观微 · 让信息更透明"
         - 副标题：text-[14px] text-ink-600 mb-3 "AI 辅助求证，和大家一起看清真相"
         - 按钮：px-5 py-2 bg-white rounded-full text-[13px] font-medium text-ink-900 shadow-sm hover:shadow-md press-pop，"了解观微"，点击 navigate('/about')
       - 右侧装饰区：w-[180px] h-[120px] flex items-center justify-center
         - 可用大放大镜图标（Search size={80} className="text-purple-300/60"）叠加几个柱状图矩形（CSS 方块），或放 hero.png
    3. 二级分类 Tab：px-6 pt-4 pb-2 flex items-center gap-2 overflow-x-auto scrollbar-none
       - tabs: ['全部', '娱乐吃瓜', '社会热点', '校园趣事', '科技数码', '生活分享']
       - 胶囊按钮样式：px-3.5 py-1.5 rounded-full text-[13px] transition-all
       - 激活：bg-ink-900 text-white
       - 非激活：bg-paper-dark text-ink-600 hover:bg-ink-100
       - 末尾右侧加一个 ChevronDown 按钮（w-8 h-8 rounded-full bg-paper-dark flex items-center justify-center text-ink-500）
    4. 内容区：px-6 py-4 pb-10
       - 双列瀑布流：grid grid-cols-2 gap-4
       - 将 getCommunityPosts 返回的数据和 melons 数据合并，转换为 HomeCard 所需格式
       - 左右交替排列，不同卡片用不同 aspect ratio（通过 index % 4 循环设置 aspect-[4/5], aspect-[1/1], aspect-[3/4], aspect-[16/10]）模拟自然高度差异
       - 底部："加载更多"按钮（w-full py-3 text-center text-[13px] text-ink-400 hover:text-ink-600 border-t border-line/10 mt-4）
  - 保留 selectedTab 状态管理，支持一级和二级分类切换
  - 移除旧的三列网格、移动端瀑布流（移动端由 MobileApp 单独处理，CommunityPage 现为 Web 端首页，移动端路由不变）
- **Acceptance Criteria Addressed**: AC-5, AC-6, AC-7
- **Test Requirements**:
  - `human-judgement` TR-6.1: 一级 Tab 横排，激活项红底粗字+下划线指示器
  - `human-judgement` TR-6.2: Hero Banner 为淡紫蓝渐变圆角卡片，文案和按钮正确
  - `human-judgement` TR-6.3: 二级分类为灰色胶囊，激活项为黑底白字
  - `human-judgement` TR-6.4: 内容区为等宽双列 grid，卡片自然错落高度
  - `human-judgement` TR-6.5: Tab 切换时内容对应更新（至少 UI 切换状态正确）
  - `programmatic` TR-6.6: TypeScript 编译通过，无未使用变量

## [x] Task 7: 补充 mock 数据并整合首页数据流
- **Priority**: medium
- **Depends On**: Task 5, Task 6
- **Description**:
  - 在 `src/services/mockData.ts` 中新增或补充首页推荐流的 mock 数据（如果现有 getCommunityPosts 数据不够丰富，补充到至少 12~16 条）
  - 确保每条数据都有：id, coverImage, title, category, status(hot/verified/verifying/debating), timeAgo, author{nickname,avatar?}, likeCount
  - 覆盖各种状态和分类：娱乐吃瓜(hot)、社会热点(verified)、校园趣事(verifying)、科技数码(debating) 等
  - 图片可使用 picsum.photos 或现有占位图，确保不同高度
  - 为右侧面板"吃瓜榜"和"推荐用户"准备 mock 数据：
    - 吃瓜榜：5条（可复用 melons 数据前5条）
    - 推荐用户：3个（昵称+身份标签）
- **Acceptance Criteria Addressed**: AC-4, AC-5
- **Test Requirements**:
  - `human-judgement` TR-7.1: 首页双列至少显示 8 张卡片，各种状态标签都有出现
  - `human-judgement` TR-7.2: 右侧面板吃瓜榜和推荐用户数据正常显示
  - `programmatic` TR-7.3: mock 数据格式一致，无类型错误

## [x] Task 8: 全局样式微调与响应式/动画保障
- **Priority**: medium
- **Depends On**: Task 1-6
- **Description**:
  - 在 `src/index.css` 中按需补充少量工具类（如果现有样式不够）：
    - 新增紫色状态色 token（如 --color-purple: #8b5cf6）用于辩论中标签；或直接用 Tailwind 内置 purple 类
    - 确保卡片 hover-lift 动画已有（确认已定义）
    - 确保搜索框 focus 样式
  - 检查主内容区滚动行为：主内容区独立滚动，滚动条样式美观（可加现有 scrollbar-none 或细滚动条）
  - 检查页面转场动画：`<Outlet />` 上的 animate-page-enter 保留
  - 确保 focus-visible 样式在顶栏和侧栏按钮上正常
  - 确保所有动画包含 prefers-reduced-motion 兜底（已有全局规则，无需额外改动）
- **Acceptance Criteria Addressed**: AC-10, NFR-1, NFR-2
- **Test Requirements**:
  - `human-judgement` TR-8.1: 卡片 hover 有轻微上移和阴影加深效果
  - `human-judgement` TR-8.2: 键盘 Tab 切换焦点时可见红色 outline
  - `programmatic` TR-8.3: 不添加覆盖 Tailwind 工具类的全局 CSS

## [x] Task 9: 适配检查与构建验证
- **Priority**: high
- **Depends On**: Task 1-8
- **Description**:
  - 运行 `npm run build`，修复所有 TypeScript 错误和构建警告
  - 逐个检查非首页路由页面在新布局下是否正常显示（无需改内容，只确保不白屏/不错位）：
    - /verify（求证页）
    - /debate-lobby（辩论大厅）
    - /profile（个人中心）
    - /melon/:id 和 /community/:id（详情页）
    - /publish（发布页）
    - /about（关于页）
    - /settings/llm（LLM设置）
    - /tools/*（工具页）
  - 如果这些页面内有硬编码的 padding-top 或与旧全局布局耦合的 sticky 元素，做最小必要调整使其在新布局下居中显示（主要是去除多余顶部间距，因为顶栏已独立）
  - 确保 MobileLayout 和 MobileApp 不受影响（移动端入口独立）
- **Acceptance Criteria Addressed**: AC-8, AC-9
- **Test Requirements**:
  - `programmatic` TR-9.1: `npm run build` 退出码为 0，构建成功
  - `human-judgement` TR-9.2: 各非首页页面在新三栏布局下正常显示，无明显错位/遮挡
  - `human-judgement` TR-9.3: 移动端（切换到移动视图）不受影响，TabBar 和原有移动端布局正常
