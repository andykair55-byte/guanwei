import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import '../workspace.css'
import WorkspaceSidebar from '../components/workspace/WorkspaceSidebar'
import ActivityStream from '../components/workspace/ActivityStream'
import CommanderInput from '../components/workspace/CommanderInput'
import VersionBar from '../components/workspace/VersionBar'
import OnboardingGuide from '../components/workspace/OnboardingGuide'
import MarkdownEditor from '../components/create/MarkdownEditor'
import { useWorkspaceStore } from '../stores/workspaceStore'
import { useActivityStore } from '../stores/activityStore'
import { useCommanderStore } from '../stores/commanderStore'
import { useCanonicalStore } from '../stores/canonicalStore'
import { useSnapshotStore } from '../stores/snapshotStore'
import { handleUserInput, quickStart, confirmPlan, resetCommander } from '../services/commanderService'
import { PLATFORM_TEMPLATES, type PlatformId } from '../config/platformTemplates'
import { adaptToPlatform } from '../services/platformAdapter'
import type { ActivityEvent, EventType, AgentTypeLabel } from '../types/activity'
import type { WorkspaceStatus, WorkspaceTag } from '../types/workspace'

const PLATFORM_SHORT: Record<PlatformId, string> = {
  guanwei: '观', zhihu: '知', xiaohongshu: '红', weibo: '微', douyin: '抖', tieba: '贴'
}

const PLATFORM_BRAND_CLASS: Record<PlatformId, string> = {
  guanwei: 'brand-zhihu', zhihu: 'brand-zhihu', xiaohongshu: 'brand-xiaohongshu',
  weibo: 'brand-weibo', douyin: 'brand-douyin', tieba: 'brand-bilibili'
}

const PLATFORM_BRAND_BG: Record<PlatformId, string> = {
  guanwei: '#10b981', zhihu: '#0084ff', xiaohongshu: '#ff2442',
  weibo: '#e6162d', douyin: '#111111', tieba: '#00a1d6'
}

const DEMO_TOPIC = 'AI换脸诈骗频发：技术滥用下的信任危机'

export default function AgentWorldPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  const currentId = useWorkspaceStore(s => s.currentId)
  const workspaces = useWorkspaceStore(s => s.workspaces)
  const current = useMemo(() => workspaces.find(w => w.id === currentId) || null, [workspaces, currentId])
  const availablePlatforms = useMemo(
    () => (current?.platformOrder || ['guanwei']) as PlatformId[],
    [current?.platformOrder]
  )
  const createWorkspace = useWorkspaceStore(s => s.createWorkspace)
  const switchWorkspace = useWorkspaceStore(s => s.switchWorkspace)
  const updatePlatformContent = useWorkspaceStore(s => s.updatePlatformContent)
  const updateTopic = useWorkspaceStore(s => s.updateTopic)
  const onboardingCompleted = useWorkspaceStore(s => s.onboardingCompleted)
  const completeOnboarding = useWorkspaceStore(s => s.completeOnboarding)

  const mode = useCommanderStore(s => s.mode)
  const setMode = useCommanderStore(s => s.setMode)
  const pipelineStatus = useCommanderStore(s => s.pipelineStatus)

  const setCanonicalTopic = useCanonicalStore(s => s.setTopic)
  const createSnapshot = useSnapshotStore(s => s.createSnapshot)
  const addEventSimple = useActivityStore(s => s.addEventSimple)

  const [activePlatform, setActivePlatform] = useState<PlatformId>('guanwei')
  const [generatingPlatform, setGeneratingPlatform] = useState<PlatformId | null>(null)
  const [copied, setCopied] = useState(false)
  const [lastSaved, setLastSaved] = useState(Date.now())
  const [showPlatformMenu, setShowPlatformMenu] = useState(false)
  const [publishingPlatforms, setPublishingPlatforms] = useState<Set<string>>(new Set())
  const [saveLabel, setSaveLabel] = useState('已保存')
  const [dataPending, setDataPending] = useState(true)
  const initRef = useRef(false)

  useEffect(() => {
    const update = () => {
      const diff = Math.floor((Date.now() - lastSaved) / 1000)
      if (diff < 5) setSaveLabel('已保存')
      else if (diff < 60) setSaveLabel(`${diff}秒前保存`)
      else if (diff < 3600) setSaveLabel(`${Math.floor(diff / 60)}分钟前保存`)
      else setSaveLabel('已保存')
    }
    update()
    const t = setInterval(update, 3000)
    return () => clearInterval(t)
  }, [lastSaved])

  useEffect(() => {
    if (initRef.current) return
    initRef.current = true

    const titleParam = searchParams.get('title')
    const existingWorkspaces = useWorkspaceStore.getState().workspaces

    // ── 首次访问 / 强制 demo：自动填充 8 个真实工作空间和完整交互数据 ──
    // 检测脏数据：大量"新工作空间"标题的 workspace 视为无效旧数据
    const staleCount = existingWorkspaces.filter(w => w.title === '新工作空间' || w.title === '').length
    const isStaleData = existingWorkspaces.length > 10 && staleCount > existingWorkspaces.length * 0.8
    const isDemo = searchParams.get('demo') === 'true' || ((existingWorkspaces.length === 0 || isStaleData) && !titleParam)
    if (isDemo) {
      const wsStore = useWorkspaceStore.getState()
      const actStore = useActivityStore.getState()
      const snapStore = useSnapshotStore.getState()
      const now = Date.now()

      // 清空现有
      for (const w of existingWorkspaces) wsStore.deleteWorkspace(w.id)

      // 1. 创建 8 个工作空间
      const DEMO_WORKSPACES = [
        { title: 'AI换脸诈骗频发：技术滥用下的信任危机', status: 'active' as WorkspaceStatus, fav: true, tag: 'hotspot' as WorkspaceTag },
        { title: '南开大学 220 万诈骗案深度追踪', status: 'active' as WorkspaceStatus, fav: false, tag: 'hotspot' as WorkspaceTag },
        { title: '网红奶茶品牌陷食品安全风波', status: 'tracking' as WorkspaceStatus, fav: true },
        { title: 'AI 版权第一案：生成图片的权利边界', status: 'tracking' as WorkspaceStatus, fav: false, tag: 'science' as WorkspaceTag },
        { title: '高考作文题「人工智能」全网热议', status: 'completed' as WorkspaceStatus, fav: false, tag: 'opinion' as WorkspaceTag },
        { title: '2024 年度消费趋势报告解读', status: 'completed' as WorkspaceStatus, fav: false },
        { title: '新能源汽车补贴退坡影响分析', status: 'draft' as WorkspaceStatus, fav: false },
        { title: '量子计算工程化突破：1000 量子比特', status: 'draft' as WorkspaceStatus, fav: false, tag: 'science' as WorkspaceTag },
      ]

      for (const m of DEMO_WORKSPACES) {
        const w = wsStore.createWorkspace({ topic: m.title, tags: m.tag ? [m.tag] : undefined })
        wsStore.setStatus(w.id, m.status)
        if (m.fav) wsStore.toggleFavorite(w.id)
      }

      // 2. 切换到第一个工作空间（AI换脸）并填充完整数据
      const first = useWorkspaceStore.getState().workspaces[0]
      if (!first) return
      wsStore.switchWorkspace(first.id)
      setCanonicalTopic(DEMO_TOPIC)

      // 2a. 添加多个平台
      const platforms: PlatformId[] = ['zhihu', 'xiaohongshu', 'weibo', 'douyin', 'tieba']
      for (const p of platforms) {
        wsStore.addPlatform(first.id, p)
      }

      // 2b. 填充平台内容
      const guanweiContent = '近年来，AI换脸技术被不法分子用于诈骗、敲诈勒索、传播虚假信息等违法行为，案件数量呈上升趋势。从"换脸拟声"冒充亲友借钱，到伪造名人视频进行投资诈骗，受害者遍布各个年龄段，损失金额巨大。\n\n## 一、事件概述\n\n据公安部 2024 年数据显示，全国已侦破 AI 换脸相关诈骗案件 123 起，涉案金额超 2.3 亿元，同比增长 300%。受害者中，大学生和中老年人占比最高。\n\n<span class="highlight">这类诈骗的核心手法是利用 AI 换脸和拟声技术，伪造熟人或权威人士的形象和声音</span>，降低受害者的警惕性，从而达到骗取钱财或个人信息的目的。\n\n## 二、技术分析\n\n当前 AI 换脸技术已进入"平民化"阶段。开源工具如 DeepFaceLab、FaceSwap 等大幅降低了使用门槛，不法分子仅需数十张照片即可生成逼真的换脸视频。\n\n- **合成质量**：4K 分辨率下肉眼难以分辨\n- **成本**：单条视频制作成本已降至百元级别\n- **传播速度**：短视频平台 24 小时内可达百万播放'

      const zhihuContent = '# AI 换脸诈骗：技术越便利，信任越脆弱\n\n## 技术滥用的规模\n\n2024 年公安部数据显示，AI 换脸相关诈骗案件同比增长 300%，涉案金额超 2.3 亿元。\n\n## 普通人如何防范？\n\n1. 视频通话中要求对方做特定动作\n2. 设置"家庭暗号"\n3. 对涉及资金往来的信息保持警惕\n\n## 监管建议\n\n- 建立 AI 生成内容强制标识制度\n- 平台需承担审核责任\n- 技术企业应加强伦理审查'

      const xiaohongshuContent = '🚨 **AI换脸诈骗正在你身边发生！**\n\n姐妹们注意了！最近AI换脸诈骗太猖狂了😱\n\n💡 **3个必知防骗技巧**\n\n1️⃣ 视频通话要求对方**捏鼻子/捂嘴**\n   AI换脸做不到这些动作！\n\n2️⃣ 设置**家庭暗号**\n   随便问一句只有家人才知道的事\n\n3️⃣ **转账前电话确认**\n   别信视频！直接打电话\n\n📊 今年已发生123起，损失超2.3亿\n\n#AI换脸 #防诈骗 #网络安全 #科普'

      const weiboContent = '【AI换脸诈骗爆发：123起案件涉案2.3亿元】公安部最新数据显示，2024年AI换脸相关诈骗案同比增长300%。\n\n从"换脸拟声"冒充亲友到伪造名人投资视频，AI技术正在被不法分子大规模滥用。\n\n防范建议：\n1. 视频通话要求做特定动作\n2. 设置家庭暗号\n3. 涉及转账一定电话确认\n\n扩散提醒身边人！⚠️\n\n#AI换脸 #反诈 #科技伦理'

      const douyinContent = '[画面] 手机屏幕快速闪烁，一条视频通话请求弹出\n[口播] 你接到过"熟人"的视频借钱吗？小心！那可能根本不是真人！\n\n[画面] AI换脸技术演示，两张人脸快速融合\n[口播] 2024年，全国已侦破123起AI换脸诈骗案，涉案金额超过2.3个亿！\n\n[画面] 三个防范技巧以小标题形式弹出\n[口播] 记住三点：一、让对方捏鼻子——AI换脸做不到！二、设个家庭暗号。三、转账前一定电话确认！\n\n[画面] 关注按钮和转发提示\n[口播] 转发给你在乎的人，别让骗子得逞！'

      wsStore.updatePlatformContent('guanwei', { title: 'AI换脸诈骗频发：技术滥用下的信任危机与治理困境', content: guanweiContent, generated: true })
      wsStore.updatePlatformContent('zhihu', { title: 'AI 换脸诈骗深度分析：技术越便利，信任越脆弱', content: zhihuContent, generated: true })
      wsStore.updatePlatformContent('xiaohongshu', { title: '🚨AI换脸诈骗正在你身边发生！3个技巧保命', content: xiaohongshuContent, generated: true })
      wsStore.updatePlatformContent('weibo', { title: 'AI换脸诈骗爆发：123起案件涉案2.3亿元', content: weiboContent, generated: true })
      wsStore.updatePlatformContent('douyin', { title: 'AI换脸诈骗防骗指南｜1分钟学会3个技巧', content: douyinContent, generated: true })
      wsStore.updatePlatformContent('tieba', { title: '老哥们小心AI换脸诈骗，刚经历了一场', content: '刚差点被AI换脸骗了，发出来给老哥们提个醒。\n\n昨晚接到一个"朋友"的视频电话，声音画面都一模一样，说是急用钱要借5000。还好我多了个心眼，让他捏一下鼻子——结果画面直接卡住了。\n\n后来查了下才知道现在AI换脸技术已经这么发达了，几十张照片就能合成。公安部数据显示今年已经123起了，金额2.3亿。\n\n总结几个防骗经验：\n- 视频通话让对方做动作\n- 家里设个暗号\n- 涉及钱一定电话确认\n\n大家都小心点！', generated: true })

      // 2c. 添加活动事件（管线时间线，含 agent_started）
      const events = [
        { type: 'commander_plan' as EventType, agent: 'orchestrator' as AgentTypeLabel, title: '任务规划完成', content: '资料搜集 → 观点提炼 → 事实核查 → 多平台写作', offset: 660000 },
        { type: 'agent_started' as EventType, agent: 'search' as AgentTypeLabel, title: '正在搜集相关资料…', content: '', offset: 600000 },
        { type: 'search_complete' as EventType, agent: 'search' as AgentTypeLabel, title: '找到 8 篇报道和 12 个数据源', content: '覆盖公安部、工信部、学术论文及主流媒体报道', actions: [{ id: 'cite_all', label: '引用全部', style: 'primary' as const }], offset: 540000 },
        { type: 'agent_started' as EventType, agent: 'research' as AgentTypeLabel, title: '正在提炼核心观点…', content: '', offset: 510000 },
        { type: 'research_complete' as EventType, agent: 'research' as AgentTypeLabel, title: '提炼出 4 个核心观点', content: '技术滥用门槛降低、监管存在滞后性、平台责任边界模糊、公众防范意识不足', actions: [{ id: 'adopt_views', label: '采纳观点', style: 'primary' as const }], offset: 480000 },
        { type: 'agent_started' as EventType, agent: 'verify' as AgentTypeLabel, title: '正在核查关键声明…', content: '', offset: 450000 },
        { type: 'verify_warning' as EventType, agent: 'verify' as AgentTypeLabel, title: '2 条信息存疑', content: '某平台用户量数据无法验证；案件破获率数据存在差异', actions: [{ id: 'reverify', label: '重新核查' }], offset: 420000 },
        { type: 'agent_started' as EventType, agent: 'writing' as AgentTypeLabel, title: '正在生成各平台版本…', content: '', offset: 390000 },
        { type: 'writing_complete' as EventType, agent: 'writing' as AgentTypeLabel, title: '5 个平台版本已生成', content: '知乎、小红书、微博、抖音、贴吧均已适配', actions: [{ id: 'platform-zhihu', label: '知' }, { id: 'platform-xiaohongshu', label: '红' }, { id: 'platform-weibo', label: '微' }, { id: 'platform-douyin', label: '抖' }, { id: 'platform-tieba', label: '贴' }], offset: 360000 },
      ]

      for (const evt of events) {
        const event: ActivityEvent = {
          id: `demo-evt-${evt.offset}`,
          timestamp: now - evt.offset,
          type: evt.type,
          agentType: evt.agent,
          title: evt.title,
          content: evt.content,
          actions: (evt as any).actions,
        }
        actStore.addEvent(first.id, event)
      }

      // 2d. 创建快照版本
      snapStore.createSnapshot({ content: 'AI换脸诈骗的初步调查框架', draftTopic: 'AI换脸诈骗频发', label: 'V1 2小时前', locked: true })
      snapStore.createSnapshot({ content: 'AI换脸诈骗的数据搜集完成', draftTopic: 'AI换脸诈骗频发', label: 'V2 1小时前' })
      snapStore.createSnapshot({ content: 'AI换脸诈骗观点提炼完成', draftTopic: 'AI换脸诈骗频发', label: 'V3 25分钟前', locked: true })
      snapStore.createSnapshot({ content: 'AI换脸诈骗初稿完成', draftTopic: 'AI换脸诈骗频发', label: 'V4 10分钟前' })
      snapStore.createSnapshot({ content: guanweiContent, draftTopic: 'AI换脸诈骗频发', label: 'V5 2分钟前 (自动保存)' })

      return
    }

    if (existingWorkspaces.length > 0 && !titleParam) {
      const recent = existingWorkspaces[0]
      switchWorkspace(recent.id)
      return
    }

    const topic = titleParam || ''
    const ws = createWorkspace(topic)
    switchWorkspace(ws.id)

    if (topic) {
      setCanonicalTopic(topic)
      setTimeout(() => { quickStart(ws.id, topic, mode) }, 300)
    } else {
      setTimeout(() => {
        const { addEventSimple } = useActivityStore.getState()
        addEventSimple(
          ws.id, 'commander_welcome', 'orchestrator',
          '欢迎使用工作间',
          '我可以帮你把一个话题变成多个平台的内容。先告诉我你想写什么？'
        )
      }, 300)
    }
    resetCommander()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Mark data as ready after initial load (demo data + DOM paint)
  useEffect(() => {
    const id = requestAnimationFrame(() => setDataPending(false))
    return () => cancelAnimationFrame(id)
  }, [])

  const editorContent = current?.platformContents?.[activePlatform]?.content || ''
  const editorTitle = current?.platformContents?.[activePlatform]?.title || current?.title || ''

  const wordCount = editorContent.replace(/\s/g, '').length
  const readTime = Math.max(1, Math.ceil(wordCount / 400))

  const handleSend = useCallback(async (text: string) => {
    if (!currentId) return
    await handleUserInput(currentId, text, mode)
  }, [currentId, mode])

  const handleGeneratePlatform = useCallback(async (platform: PlatformId) => {
    if (!current) return
    setGeneratingPlatform(platform)
    try {
      const result = await adaptToPlatform(current.draft, platform)
      updatePlatformContent(platform, { content: result.content, title: result.title, generated: true })
      addEventSimple(currentId!, 'writing_complete', 'writing',
        `${PLATFORM_TEMPLATES[platform].name}版本已生成`,
        result.content.slice(0, 100) + '...',
        [{ id: `platform-${platform}`, label: '查看', style: 'primary' }]
      )
    } catch (e) {
      addEventSimple(currentId!, 'error', 'system', '生成失败', String(e))
    } finally {
      setGeneratingPlatform(null)
    }
  }, [current, updatePlatformContent, addEventSimple, currentId])

  const handleGenerateAll = useCallback(async () => {
    for (const p of availablePlatforms) {
      if (p !== 'guanwei') {
        await handleGeneratePlatform(p)
      }
    }
  }, [handleGeneratePlatform, availablePlatforms])

  const handleAction = useCallback(async (actionId: string, _event: ActivityEvent) => {
    if (!currentId) return
    if (actionId === 'confirm' || actionId === 'use_all' || actionId === 'adopt_views') {
      confirmPlan(currentId, mode)
    } else if (actionId === 'modify') {
      addEventSimple(currentId, 'commander_question', 'orchestrator', '修改计划', '你想怎么调整？可以告诉我需要修改的地方。')
    } else if (actionId.startsWith('platform-')) {
      const platform = actionId.replace('platform-', '') as PlatformId
      if (availablePlatforms.includes(platform)) setActivePlatform(platform)
    } else if (actionId === 'adapt_all') {
      handleGenerateAll()
    } else if (actionId === 'reverify') {
      addEventSimple(currentId, 'info', 'verify', '重新核查', '正在重新核查存疑信息...')
    }
  }, [currentId, mode, addEventSimple, availablePlatforms, handleGenerateAll])

  const handleEditorChange = useCallback((content: string) => {
    if (!currentId) return
    updatePlatformContent(activePlatform, { content })
    setLastSaved(Date.now())
  }, [currentId, activePlatform, updatePlatformContent])

  const handleTitleChange = useCallback((title: string) => {
    if (!currentId) return
    updatePlatformContent(activePlatform, { title })
    // 同步更新 workspace 标题（仅主稿平台时）
    if (activePlatform === 'guanwei') {
      useWorkspaceStore.getState().renameWorkspace(currentId, title)
    }
  }, [currentId, activePlatform, updatePlatformContent])

  const handlePlatformChange = useCallback((platform: PlatformId) => {
    setActivePlatform(platform)
  }, [])

  const handlePublish = useCallback(async (platform: PlatformId) => {
    const content = current?.platformContents?.[platform]?.content || ''
    if (content) {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
    const url = PLATFORM_TEMPLATES[platform].publishUrl
    if (url && url.startsWith('http')) {
      window.open(url, '_blank')
    }
    setPublishingPlatforms(prev => new Set(prev).add(platform))
  }, [current])

  const confirmPublished = useCallback(() => {
    if (!currentId) return
    useWorkspaceStore.getState().setStatus(currentId, 'published')
    setPublishingPlatforms(new Set())
  }, [currentId])

  useEffect(() => {
    if (!currentId || !editorContent.trim()) return
    const t = setTimeout(() => {
      createSnapshot({ content: editorContent, draftTopic: current?.topic || '', label: '自动保存' })
    }, 3000)
    return () => clearTimeout(t)
  }, [editorContent, currentId, current?.topic, createSnapshot])

  const handleRestore = useCallback((content: string, topic: string) => {
    if (!currentId) return
    updatePlatformContent(activePlatform, { content })
    if (topic) updateTopic(currentId, topic)
  }, [currentId, activePlatform, updatePlatformContent, updateTopic])

  if (!current) {
    return (
      <div className="h-dvh flex items-center justify-center bg-paper-50">
        <div style={{ width: 24, height: 24, border: '2px solid #10b981', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
      </div>
    )
  }

  return (
    <div className="workspace-app">
      <WorkspaceSidebar />

      {/* ══ Center Editor ═══ */}
      <main className="ws-center">
        <header className="ws-editor-header">
          <div className="ws-editor-breadcrumb">
            <button className="ws-editor-action-btn" title="返回" onClick={() => navigate(-1)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
            <span>工作间</span>
            <span className="bc-sep">/</span>
            <span className="bc-active">{current.title}</span>
            <span style={{ marginLeft: 12, fontSize: 11, color: 'var(--fg-muted)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
              最后保存 {saveLabel}
            </span>
          </div>
          <div className="ws-editor-actions">
            <div className="ws-mode-toggle">
              <button
                className={`ws-mode-btn${mode === 'assist' ? ' active' : ''}`}
                onClick={() => setMode('assist')}
              >
                Assist
              </button>
              <button
                className={`ws-mode-btn${mode === 'auto' ? ' active' : ''}`}
                onClick={() => setMode('auto')}
              >
                Auto
              </button>
            </div>
            <button className="ws-editor-action-btn" title="通知" style={{ position: 'relative' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
                <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
              </svg>
              <span style={{ position: 'absolute', top: 5, right: 5, width: 6, height: 6, borderRadius: '50%', background: 'var(--danger)', border: '1.5px solid var(--bg)' }} />
            </button>
            <div className="ws-user-avatar" style={{ width: 26, height: 26, fontSize: 11 }}>
              {current.title.charAt(0)}
            </div>
          </div>
        </header>

        {/* Platform Tabs */}
        <div className="ws-platform-bar">
          <button
            className={`ws-platform-tab${activePlatform === 'guanwei' ? ' active' : ''}`}
            onClick={() => handlePlatformChange('guanwei')}
          >
            <span className="ws-platform-dot green" />
            通用稿（主稿）
          </button>
          {availablePlatforms.filter(p => p !== 'guanwei').map(p => (
            <button
              key={p}
              className={`ws-platform-tab${activePlatform === p ? ' active' : ''}`}
              onClick={() => handlePlatformChange(p)}
            >
              <span className="ws-platform-icon" style={{ background: PLATFORM_BRAND_BG[p] }}>
                {PLATFORM_SHORT[p]}
              </span>
              {PLATFORM_TEMPLATES[p].name}
              {current?.platformContents?.[p]?.generated && (
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--status-active)" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>
          ))}
          <div className="ws-platform-dropdown-wrap">
            <button
              className="ws-platform-tab"
              style={{ border: '1.5px dashed var(--border)', color: 'var(--fg-placeholder)' }}
              onClick={() => setShowPlatformMenu(!showPlatformMenu)}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
            <div className={`ws-platform-dropdown${showPlatformMenu ? ' show' : ''}`}>
              {(['zhihu', 'xiaohongshu', 'weibo', 'douyin', 'tieba'] as PlatformId[])
                .filter(p => !availablePlatforms.includes(p))
                .map(p => (
                  <button
                    key={p}
                    className="ws-platform-dropdown-item"
                    onClick={() => {
                      if (currentId) {
                        useWorkspaceStore.getState().addPlatform(currentId, p)
                      }
                      setShowPlatformMenu(false)
                    }}
                  >
                    {PLATFORM_TEMPLATES[p].name}
                  </button>
                ))}
            </div>
          </div>
          <div className="ws-publish-confirm-bar">
            <span style={{ fontSize: 11, color: 'var(--fg-muted)' }}>发布到</span>
            {availablePlatforms.map(p => (
              <button
                key={p}
                className={`ws-publish-btn ${PLATFORM_BRAND_CLASS[p]}${publishingPlatforms.has(p) ? ' publishing' : ''}`}
                onClick={() => handlePublish(p)}
                title={`发布到${PLATFORM_TEMPLATES[p].name}`}
              >
                {PLATFORM_SHORT[p]}
              </button>
            ))}
            {publishingPlatforms.size > 0 && (
              <button className="ws-publish-confirm-btn" onClick={confirmPublished}>
                已完成发布 ({publishingPlatforms.size})
              </button>
            )}
          </div>
        </div>

        {/* Status Bar */}
        <div className="ws-status-bar">
          <span className="ws-status-indicator">
            <span className={`ws-status-dot-live${pipelineStatus === 'running' ? ' pulse' : ''}`} />
            {pipelineStatus === 'running' ? 'Agent运行中' : '已连接 5/5 Agent'}
          </span>
          <span>字数 {wordCount}</span>
          <span>预计阅读 {readTime}分钟</span>
          <div style={{ flex: 1 }} />
          {copied && (
            <span style={{ color: 'var(--primary-text)', display: 'inline-flex', alignItems: 'center', gap: 1 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
              </svg>
              已复制
            </span>
          )}
          {generatingPlatform && (
            <span style={{ color: 'var(--primary-text)', display: 'inline-flex', alignItems: 'center', gap: 1 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
              生成{PLATFORM_TEMPLATES[generatingPlatform].name}中
            </span>
          )}
        </div>

        {/* Editor Content */}
        <div className="ws-editor-body">
          <div className="ws-editor-content">
            <input
              className="ws-editor-title-input"
              value={editorTitle}
              onChange={e => handleTitleChange(e.target.value)}
              placeholder="输入标题"
            />
            <MarkdownEditor
              value={editorContent}
              onChange={handleEditorChange}
              textareaRef={textareaRef}
              placeholder="开始创作，或在下方输入框告诉Commander你想做什么…"
            />
          </div>
        </div>

        <VersionBar onRestore={handleRestore} />
        <CommanderInput onSend={handleSend} />
      </main>

      <ActivityStream
        onAction={handleAction}
      />

      {/* Toast Container */}
      <div className="ws-toast-container" id="ws-toast-container" />

      {/* First-time onboarding guide */}
      {!dataPending && !onboardingCompleted && (
        <OnboardingGuide onComplete={completeOnboarding} />
      )}
    </div>
  )
}