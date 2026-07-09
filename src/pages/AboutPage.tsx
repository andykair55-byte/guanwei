import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Sparkles, Shield, Search, Wheat, Users, Heart, Code2, Mail } from 'lucide-react'
import { usePlatform } from '../hooks/usePlatform'

function AboutPage() {
  const navigate = useNavigate()
  const { isWeb } = usePlatform()
  const wrap = isWeb ? 'max-w-3xl mx-auto px-8' : 'max-w-[480px] mx-auto px-5'

  return (
    <div className="min-h-full bg-paper-warm">
      {/* 顶部导航 — 极简 */}
      <div className="sticky top-0 z-20 glass border-b border-line/30">
        <div className={`flex items-center justify-between h-14 ${wrap}`}>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-ink-700 text-[14px] active:opacity-60 press-pop"
            aria-label="返回"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            <span>返回</span>
          </button>
          <span className="brand-serif text-[14px] font-bold text-ink-900 tracking-wide">关于观微</span>
          <span className="w-12" />
        </div>
      </div>

      <article className={`${wrap} py-12`}>
        {/* Hero — 大字标题 + 印章 + 引言 */}
        <header className="mb-16 animate-fade-in-up">
          <div className="flex items-center gap-3 mb-6">
            <span className="seal-stamp">观微</span>
            <span className="text-[11px] text-ink-400 font-medium tracking-[0.25em]">GUANWEI · EST. 2024</span>
          </div>

          <h1
            className="brand-serif text-ink-900 leading-[1.1] tracking-tight mb-6"
            style={{ fontSize: isWeb ? '52px' : '36px', textWrap: 'balance' }}
          >
            不信一家之言<span className="text-seal">。</span>
            <br />
            <span className="text-ink-500" style={{ fontSize: isWeb ? '32px' : '22px' }}>
              只信可追溯的证据。
            </span>
          </h1>

          <p className={`text-ink-700 leading-[1.8] mb-8 ${isWeb ? 'text-[17px]' : 'text-[15px]'}`}>
            我们是一群大学生。在信息洪流里，我们经常被反转打脸、被情绪裹挟、被营销话术PUA。
            所以我们做了观微——一个把"求证"这件事变得不那么累的社区。
          </p>

          <blockquote className="pull-quote">
            "见微知著，防微杜渐。"
            <footer className="text-[12px] text-ink-500 font-sans mt-3 not-italic">
              —— 《韩非子·喻老》，观微名字的来处
            </footer>
          </blockquote>
        </header>

        {/* 章节序号 01 — 我们在解决什么问题 */}
        <section className="mb-20 animate-fade-in-up" style={{ animationDelay: '60ms' }}>
          <div className="brush-divider mb-8" />
          <div className="flex items-baseline gap-4 mb-6">
            <span className="section-numeral" style={{ fontSize: '48px' }}>01</span>
            <h2 className="brand-serif text-[24px] font-bold text-ink-900">我们在解决什么</h2>
          </div>

          <div className="space-y-5 text-[15px] text-ink-700 leading-[1.85]">
            <p>
              打开手机，<strong className="text-ink-900">"震惊体"</strong>还在家族群横行，
              <strong className="text-ink-900"> AI 生成的假照片</strong>已经能骗过半个朋友圈，
              <strong className="text-ink-900">情绪操控话术</strong>藏在每一条带货文案里。
              年轻人不是不想求证——是求证太累了。
            </p>
            <p>
              要打开五个 App 交叉对比、要反搜图片、要查 EXIF、要拆解话术、要警惕流量号带节奏。
              <span className="brand-serif font-bold text-seal">求证的成本，远高于转发的成本。</span>
              所以谣言永远比真相跑得快。
            </p>
            <p>
              观微想做的不是又一个"事实核查机构"——而是一个让普通人也能参与求证、
              让每条信息都自带"证据链"的社区。
            </p>
          </div>
        </section>

        {/* 章节序号 02 — 我们提供什么 */}
        <section className="mb-20 animate-fade-in-up" style={{ animationDelay: '120ms' }}>
          <div className="brush-divider mb-8" />
          <div className="flex items-baseline gap-4 mb-6">
            <span className="section-numeral" style={{ fontSize: '48px' }}>02</span>
            <h2 className="brand-serif text-[24px] font-bold text-ink-900">我们提供什么</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FeatureCard
              icon={Wheat}
              title="瓜田"
              desc="提交一个热点事件，社区一起投票真假、提交佐证。开奖时看谁站对了边。"
              tint="seal"
            />
            <FeatureCard
              icon={Search}
              title="AI 求证"
              desc="粘贴一段文字或链接，AI 跨多源交叉验证，给出可信度评级和证据链。"
              tint="bamboo"
            />
            <FeatureCard
              icon={Shield}
              title="情绪检测"
              desc="拆解话术里的情绪操控套路，生成去除情绪的客观重述版本。"
              tint="gold"
            />
            <FeatureCard
              icon={Users}
              title="社区佐证"
              desc="类似 Twitter Community Notes，每条信息都能被用户贡献来源链接。"
              tint="seal"
            />
          </div>
        </section>

        {/* 章节序号 03 — 数据 */}
        <section className="mb-20 animate-fade-in-up" style={{ animationDelay: '180ms' }}>
          <div className="brush-divider mb-8" />
          <div className="flex items-baseline gap-4 mb-6">
            <span className="section-numeral" style={{ fontSize: '48px' }}>03</span>
            <h2 className="brand-serif text-[24px] font-bold text-ink-900">观微的此刻</h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard value="12" suffix="个" label="AI 求证工具" />
            <StatCard value="6" suffix="类" label="瓜田分类" />
            <StatCard value="∞" label="可接入的 LLM" />
            <StatCard value="0" suffix="元" label="永久免费" highlight />
          </div>

          <p className="text-[13px] text-ink-500 mt-6 leading-relaxed">
            * 数据为产品规划值，正在持续迭代中。观微是开源项目，欢迎在 GitHub 共建。
          </p>
        </section>

        {/* 章节序号 04 — 我们的立场 */}
        <section className="mb-20 animate-fade-in-up" style={{ animationDelay: '240ms' }}>
          <div className="brush-divider mb-8" />
          <div className="flex items-baseline gap-4 mb-6">
            <span className="section-numeral" style={{ fontSize: '48px' }}>04</span>
            <h2 className="brand-serif text-[24px] font-bold text-ink-900">我们的立场</h2>
          </div>

          <div className="space-y-4">
            <PrincipleRow num="i" title="不站队，只站证据">
              观微不为任何立场背书。我们只展示证据链，让你自己判断。
            </PrincipleRow>
            <PrincipleRow num="ii" title="AI 是工具，不是裁判">
              AI 会出错、会有偏差。求证结果仅供参考，最终判断权永远在你手里。
            </PrincipleRow>
            <PrincipleRow num="iii" title="隐私是底线">
              私信端到端加密，求证内容不上传训练。你的数据归你。
            </PrincipleRow>
            <PrincipleRow num="iv" title="开源、免费、共建">
              观微永远免费。代码在 GitHub，欢迎大学生开发者一起把它做得更好。
            </PrincipleRow>
          </div>
        </section>

        {/* 章节序号 05 — 致大学生 */}
        <section className="mb-20 animate-fade-in-up" style={{ animationDelay: '300ms' }}>
          <div className="brush-divider mb-8" />
          <div className="flex items-baseline gap-4 mb-6">
            <span className="section-numeral" style={{ fontSize: '48px' }}>05</span>
            <h2 className="brand-serif text-[24px] font-bold text-ink-900">写给大学生</h2>
          </div>

          <div className="paper-card-warm rounded-2xl p-6 noise-overlay">
            <div className="relative">
              <p className="brand-serif text-[18px] text-ink-900 leading-[1.8] mb-4">
                如果你曾在群里被长辈的"震惊体"轰炸过、
                <br />
                如果曾被一条带货文案PUA过、
                <br />
                如果曾为反转新闻打脸过——
              </p>
              <p className="text-[15px] text-ink-700 leading-[1.85] mb-4">
                那你就是我们要找的人。
              </p>
              <p className="text-[15px] text-ink-700 leading-[1.85] mb-6">
                大学生群体最该有批判性思维，却也最容易被信息流裹挟。
                我们希望观微能成为你手机里的一个"理性过滤器"——
                不是替你判断，而是帮你看清。
              </p>

              <div className="flex items-center gap-2 text-seal">
                <Heart size={16} className="fill-seal" aria-hidden="true" />
                <p className="brand-serif text-[15px] font-bold">
                  愿我们都不再轻信，也不冷漠。
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 章节序号 06 — 联系方式 */}
        <section className="mb-16 animate-fade-in-up" style={{ animationDelay: '360ms' }}>
          <div className="brush-divider mb-8" />
          <div className="flex items-baseline gap-4 mb-6">
            <span className="section-numeral" style={{ fontSize: '48px' }}>06</span>
            <h2 className="brand-serif text-[24px] font-bold text-ink-900">找到我们</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <ContactCard
              icon={Code2}
              title="GitHub"
              desc="开源代码 · 提 Issue · PR welcome"
              href="https://github.com"
            />
            <ContactCard
              icon={Mail}
              title="邮箱"
              desc="guanwei@example.com"
              href="mailto:guanwei@example.com"
            />
          </div>
        </section>

        {/* 结尾 — 大字签名 */}
        <footer className="pt-12 border-t border-line/40 animate-fade-in-up" style={{ animationDelay: '420ms' }}>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="brand-serif text-[20px] font-bold text-ink-900 mb-1">
                见微，知著<span className="text-seal">。</span>
              </p>
              <p className="text-[12px] text-ink-500 tracking-wider">
                © 2024 观微 GUANWEI · 不信一家之言
              </p>
            </div>
            <button
              onClick={() => navigate('/community')}
              className="group flex items-center gap-2 px-5 py-2.5 rounded-full bg-ink-900 text-white text-[13px] font-semibold hover:bg-seal transition-all press-pop"
            >
              进入社区
              <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </footer>
      </article>
    </div>
  )
}

// 子组件 — 特性卡片
function FeatureCard({
  icon: Icon,
  title,
  desc,
  tint,
}: {
  icon: typeof Sparkles
  title: string
  desc: string
  tint: 'seal' | 'bamboo' | 'gold'
}) {
  const tintMap = {
    seal: 'bg-seal/8 text-seal',
    bamboo: 'bg-bamboo/8 text-bamboo',
    gold: 'bg-gold/8 text-gold',
  }
  return (
    <div className="bg-surface rounded-2xl border border-line/30 p-5 hover:border-seal/30 hover:shadow-card-hover transition-all">
      <div className={`w-10 h-10 rounded-xl ${tintMap[tint]} flex items-center justify-center mb-3`}>
        <Icon size={18} aria-hidden="true" />
      </div>
      <h3 className="brand-serif text-[17px] font-bold text-ink-900 mb-1.5">{title}</h3>
      <p className="text-[13px] text-ink-600 leading-[1.7]">{desc}</p>
    </div>
  )
}

// 子组件 — 数据卡片
function StatCard({
  value,
  suffix,
  label,
  highlight,
}: {
  value: string
  suffix?: string
  label: string
  highlight?: boolean
}) {
  return (
    <div className={`rounded-2xl p-4 border ${
      highlight ? 'bg-seal text-white border-seal' : 'bg-surface border-line/30'
    }`}>
      <div className="flex items-baseline gap-0.5 mb-1">
        <span
          className={`brand-serif font-black leading-none ${highlight ? 'text-white' : 'text-ink-900'}`}
          style={{ fontSize: '32px' }}
        >
          {value}
        </span>
        {suffix && (
          <span className={`text-[13px] font-bold ${highlight ? 'text-white/80' : 'text-ink-500'}`}>
            {suffix}
          </span>
        )}
      </div>
      <p className={`text-[12px] font-medium ${highlight ? 'text-white/90' : 'text-ink-500'}`}>{label}</p>
    </div>
  )
}

// 子组件 — 原则行
function PrincipleRow({
  num,
  title,
  children,
}: {
  num: string
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="flex gap-4 py-4 border-b border-line/20 last:border-b-0">
      <span className="brand-serif text-[18px] font-bold text-seal italic flex-shrink-0 w-8">{num}.</span>
      <div className="flex-1">
        <h4 className="brand-serif text-[16px] font-bold text-ink-900 mb-1">{title}</h4>
        <p className="text-[14px] text-ink-600 leading-[1.75]">{children}</p>
      </div>
    </div>
  )
}

// 子组件 — 联系卡片
function ContactCard({
  icon: Icon,
  title,
  desc,
  href,
}: {
  icon: typeof Code2
  title: string
  desc: string
  href: string
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-3 p-4 bg-surface rounded-2xl border border-line/30 hover:border-seal/30 hover:shadow-card-hover transition-all press-pop"
    >
      <div className="w-10 h-10 rounded-xl bg-paper-dark group-hover:bg-seal/10 flex items-center justify-center transition-colors">
        <Icon size={18} className="text-ink-700 group-hover:text-seal transition-colors" aria-hidden="true" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="brand-serif text-[15px] font-bold text-ink-900">{title}</p>
        <p className="text-[12px] text-ink-500 truncate">{desc}</p>
      </div>
      <ArrowRight size={14} className="text-ink-400 group-hover:text-seal group-hover:translate-x-0.5 transition-all" />
    </a>
  )
}

export default AboutPage
