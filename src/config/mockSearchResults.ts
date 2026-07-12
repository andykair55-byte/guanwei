export interface MockSearchResult {
  title: string
  snippet: string
  source: string
  url: string
  publishedAt?: string
}

// AI换脸诈骗 - 搜索结果集
const AI_FACE_SWAP_FRAUD: MockSearchResult[] = [
  {
    title: '公安部：AI换脸诈骗案件同比增长312% 涉案金额超15亿元 | 新华网',
    snippet: '公安部新闻发布会通报，2023年全国公安机关侦破利用AI换脸技术实施诈骗案件1.2万余起，同比增长312%，涉案金额超15亿元。犯罪分子通过社交软件获取受害人亲友影像资料，利用深度伪造技术生成逼真视频进行诈骗，单笔最高被骗金额达430万元。',
    source: '新华网',
    url: 'https://www.news.cn/legal/2024-01/15/c_1129451234.htm',
    publishedAt: '2024-01-15',
  },
  {
    title: '国家反诈中心：警惕"AI换脸"新型电信网络诈骗',
    snippet: '国家反诈中心发布紧急预警，近期多地出现利用AI换脸技术冒充熟人、领导实施诈骗的案件。反诈中心提示：视频通话中要求转账的，务必通过电话或面对面核实身份；可要求对方用手遮挡面部或做特定动作，AI换脸技术难以实时呈现自然交互。',
    source: '国家反诈中心',
    url: 'https://www.gjwzq.com/warn/2024/ai-face-swap-alert.html',
    publishedAt: '2024-02-20',
  },
  {
    title: '央视调查：10分钟被骗430万 AI换脸诈骗全程揭秘',
    snippet: '央视记者调查发现，江苏南京一位企业财务人员接到"老板"视频电话，对方面容、声音与真人无异，要求紧急转账430万元至指定账户。事后核实，不法分子仅用该老板公开演讲视频10秒素材，通过AI换脸与语音克隆技术即可完成伪造。',
    source: '央视新闻',
    url: 'https://news.cctv.com/2024/03/08/ARTI1234567890.shtml',
    publishedAt: '2024-03-08',
  },
  {
    title: '深度伪造技术滥用调查：AI换脸黑产链条浮出水面 | 澎湃新闻',
    snippet: '记者暗访发现，AI换脸黑产已形成完整链条：上游提供开源换脸模型与GPU算力租赁，中游提供"一键换脸"工具与教程，下游利用伪造视频实施诈骗、敲诈。一套换脸工具售价仅200-800元，技术门槛大幅降低，监管面临新挑战。',
    source: '澎湃新闻',
    url: 'https://www.thepaper.cn/newsDetail_forward_26543210',
    publishedAt: '2024-03-22',
  },
  {
    title: '人民日报评论：治理AI换脸诈骗需技术监管双管齐下',
    snippet: 'AI换脸技术本身是中性的，关键在于如何规范使用。建议从三方面入手：一是加快深度合成服务管理规定落地，要求AI生成内容显著标识；二是推动平台建立换脸视频检测能力；三是加强公众反诈教育，提升对AI伪造内容的辨识力。',
    source: '人民日报',
    url: 'http://paper.people.com.cn/rmrb/html/2024-04/02/nw.D110000renmrb_20240402_1-05.htm',
    publishedAt: '2024-04-02',
  },
  {
    title: '最高人民法院发布典型案例：AI换脸诈骗可构成诈骗罪从重处罚',
    snippet: '最高法发布第40批指导性案例，明确利用AI换脸技术实施诈骗，数额特别巨大或情节特别严重的，依法从重处罚。典型案例显示，被告人张某利用换脸技术冒充他人骗取钱款680万元，被判处有期徒刑13年并处罚金50万元。',
    source: '最高人民法院',
    url: 'https://www.court.gov.cn/zixun-xiangqing-4210987.html',
    publishedAt: '2024-04-18',
  },
]

// 大学专业裁撤 - 搜索结果集
const UNIVERSITY_MAJOR_CUT: MockSearchResult[] = [
  {
    title: '教育部：2023年度撤销本科专业点1670个 优化调整持续推进',
    snippet: '教育部公布2023年度普通高等学校本科专业备案和审批结果，本年度全国高校共撤销本科专业点1670个，新增备案本科专业点1456个。被撤销专业集中在公共事业管理、信息管理与信息系统、产品设计等专业，反映高校主动适应经济社会发展需求进行专业结构调整。',
    source: '教育部官网',
    url: 'http://www.moe.gov.cn/srcsite/A08/s7056/202403/t20240319_1121321.html',
    publishedAt: '2024-03-19',
  },
  {
    title: '新华网：五年间全国高校撤销专业点超9000个 专业"瘦身"背后的逻辑',
    snippet: '据新华网统计，2019-2023年全国高校累计撤销本科专业点9253个，涉及专业422种。公共事业管理专业被撤销次数最多，达221次。专家指出，专业裁撤主要源于就业率持续偏低、社会需求饱和、学科设置同质化严重等因素，是高校质量建设的主动作为。',
    source: '新华网',
    url: 'https://www.news.cn/edu/20240402/major-reform.html',
    publishedAt: '2024-04-02',
  },
  {
    title: '中国教育报：高校专业"加减法" 既要裁撤更要建设',
    snippet: '专业裁撤不是简单的"做减法"。受访高校管理者表示，撤销专业的同时必须做好"加法"：对接国家战略新增人工智能、集成电路、储能科学等紧缺专业；改造升级传统专业，融入数字化、智能化元素；建立专业动态调整长效机制，每三年开展一次专业评估。',
    source: '中国教育报',
    url: 'http://www.jyb.cn/rmtzcg/xwy/wzxw/202404/t20240415_1234567.html',
    publishedAt: '2024-04-15',
  },
  {
    title: '澎湃新闻：被撤销专业学生怎么办？高校承诺"老生老办法"平稳过渡',
    snippet: '面对专业被撤销，在读学生普遍担忧毕业与就业。多所高校明确表态，按照"老生老办法、新生新办法"原则，被撤销专业在校生可按原培养方案完成学业，毕业证书与学位证书不受影响；同时提供转专业机会，加强就业指导与实习推荐。',
    source: '澎湃新闻',
    url: 'https://www.thepaper.cn/newsDetail_forward_26789432',
    publishedAt: '2024-04-20',
  },
  {
    title: '经济观察报：专业裁撤潮背后的就业市场信号',
    snippet: '21世纪教育研究院报告显示，被撤销专业的共同特征是初次就业率连续三年低于70%。公共事业管理、信息管理与信息系统等专业一度是热门，但因开设院校过多、培养方案同质化、与岗位需求脱节，逐渐陷入"招生热、就业冷"困境。这为高考志愿填报敲响警钟。',
    source: '经济观察报',
    url: 'http://www.eeo.com.cn/2024/0425/543210.shtml',
    publishedAt: '2024-04-25',
  },
  {
    title: '光明日报评论：专业调整应避免"一撤了之"',
    snippet: '高校专业调整是常态，但应警惕"跟风撤销"。一些高校为追求就业率指标或专业排名，简单粗暴撤销"冷门"基础学科专业，可能造成长远的学科生态破坏。建议建立"红黄绿"专业预警机制，给予整改缓冲期，对撤销决策进行充分论证与公示。',
    source: '光明日报',
    url: 'https://epaper.gmw.cn/gmrb/html/2024-05/06/nw.D110000gmrb_20240506_1-11.htm',
    publishedAt: '2024-05-06',
  },
]

// 国产AI对比 - 搜索结果集
const DOMESTIC_AI_COMPARISON: MockSearchResult[] = [
  {
    title: '机器之心：2024年国产大模型综合评测报告 智谱GLM-4vs通义千问vs文心一言',
    snippet: '机器之心联合多家机构完成2024年国产大模型综合评测。结果显示：在MMLU中文榜单上，智谱GLM-4得分82.3分领先，通义千问Max 81.7分紧随，文心一言4.0达80.5分；代码生成任务中通义千问表现最优；多模态能力上文心一言在中文图文理解上具有优势。',
    source: '机器之心',
    url: 'https://www.jiqizhixin.com/articles/2024-04-10-6',
    publishedAt: '2024-04-10',
  },
  {
    title: '量子位：国产AI模型vs GPT-4o 实测百项任务 谁更懂中文？',
    snippet: '量子位选取智谱GLM-4、通义千问、文心一言、DeepSeek、Kimi五大国产模型与GPT-4o进行百项中文任务实测。在中文创作、古文理解、本土知识问答上，国产模型整体优于GPT-4o；在复杂推理与代码生成上GPT-4o仍领先，但差距较半年前明显缩小。',
    source: '量子位',
    url: 'https://www.qbitai.com/2024/04/domestic-ai-vs-gpt4o.html',
    publishedAt: '2024-04-22',
  },
  {
    title: '36氪：DeepSeek-V2崛起 国产AI进入"百模大战"下半场',
    snippet: 'DeepSeek-V2以236亿参数实现接近GPT-4的能力，API价格仅为GPT-4的百分之一，引发行业震动。分析认为，国产AI进入"百模大战"下半场，竞争焦点从参数规模转向性价比与垂直应用。智谱、月之暗面、MiniMax等纷纷推出低价策略，行业洗牌加速。',
    source: '36氪',
    url: 'https://36kr.com/p/2745632109876543',
    publishedAt: '2024-05-08',
  },
  {
    title: '新智元：国产大模型技术对比 架构创新成为差异化关键',
    snippet: '对比主流国产大模型技术架构发现：智谱GLM系列采用自研GLM架构，中文理解能力突出；通义千问基于Qwen架构，强化代码与数学能力；DeepSeek创新性采用MoE稀疏架构，推理效率提升40%；文心一言融合知识增强技术，在行业知识问答上表现稳定。',
    source: '新智元',
    url: 'https://www.xinzhiyuan.com/ai/2024/05/domestic-llm-tech.html',
    publishedAt: '2024-05-15',
  },
  {
    title: '钛媒体：国产AI商业化落地对比 谁在真正赚钱？',
    snippet: '财报数据显示，2024年Q1国产AI厂商商业化进展分化明显：百度文心一言API调用量同比增长5倍，企业客户超10万家；智谱AI营收同比增长超300%，服务央国企客户；月之暗面Kimi月活突破1500万但尚未盈利。整体看，B端变现快于C端，行业应用成主战场。',
    source: '钛媒体',
    url: 'https://www.tmtpost.com/7140987.html',
    publishedAt: '2024-05-28',
  },
  {
    title: '科技日报：国产AI大模型突围 开源生态成为新变量',
    snippet: '智谱AI开源GLM-4-9B、阿里开源Qwen2系列、DeepSeek开源DeepSeek-V2，国产AI开源生态快速壮大。专家指出，开源策略有助于降低行业使用门槛、构建开发者社区，但商业化变现压力增大。与Meta Llama相比，国产开源模型在中文场景具备天然优势。',
    source: '科技日报',
    url: 'http://digitalpaper.stdaily.com/http_www.kjrb.com/kjrb/html/2024-06/03/content_567890.htm',
    publishedAt: '2024-06-03',
  },
]

export const MOCK_SEARCH_RESULTS: Record<string, MockSearchResult[]> = {
  'AI换脸诈骗': AI_FACE_SWAP_FRAUD,
  'AI换脸诈骗频发': AI_FACE_SWAP_FRAUD,
  '大学专业裁撤': UNIVERSITY_MAJOR_CUT,
  '大学专业被裁撤': UNIVERSITY_MAJOR_CUT,
  '国产AI对比': DOMESTIC_AI_COMPARISON,
  '国产AI vs 海外AI': DOMESTIC_AI_COMPARISON,
}
