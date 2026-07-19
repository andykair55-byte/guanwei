import type { Melon, MelonCategory, VerificationResult, Evidence, Report, HotEventCard, HotEvent, TimelineNode } from '../types'

const melonTemplates: { title: string; description: string; category: MelonCategory; trueProbability: number }[] = [
  // ===== 娱乐 x15 =====
  {
    title: '某顶流男星被曝隐婚生子，孩子已上小学',
    description: '网友爆料称某顶流男星其实早已结婚，孩子已经上小学，并晒出疑似接送孩子放学的模糊照片。照片里的人戴着口罩看不清正脸，但身形和该明星高度相似。',
    category: '娱乐',
    trueProbability: 42,
  },
  {
    title: '某知名综艺节目被曝剧本造假，冠军早已内定',
    description: '前工作人员匿名爆料称节目组在录制前就已确定冠军人选，选手们的表现都是按剧本走的。还附带了一份录制前的选手排位表，和最终结果几乎一致。',
    category: '娱乐',
    trueProbability: 67,
  },
  {
    title: '某当红女演员被曝片酬高达8000万，远超限薪令',
    description: '一张疑似剧组财务表的截图在网上流传，显示某女演员单集片酬惊人。截图真实性存疑，但爆料人声称还有更多证据将陆续放出。',
    category: '娱乐',
    trueProbability: 55,
  },
  {
    title: '知名导演新作票房惨败，疑似投资人集体撤资',
    description: '某导演新片上映首日票房不足千万，业内传言多个投资方中途撤资。片方紧急回应称排片被恶意挤压，实际情况没那么夸张。',
    category: '娱乐',
    trueProbability: 30,
  },
  {
    title: '某选秀冠军被曝学历造假，实际只有初中学历',
    description: '有网友查到某选秀出道艺人的所谓海外名校学历根本查无此人，疑似花钱买的野鸡大学文凭。本人工作室发声明否认，称将起诉造谣者。',
    category: '娱乐',
    trueProbability: 72,
  },
  {
    title: '热播剧男主深夜被换，原定演员发文意味深长',
    description: '一部正在拍摄的古装剧突然官宣换男主，原定演员凌晨发了一条"有些事不是不报，时候未到"的微博后秒删。粉丝扒出疑似和资本介入有关。',
    category: '娱乐',
    trueProbability: 48,
  },
  {
    title: '某流量小生与经纪人关系暧昧，被拍同行出入酒店',
    description: '狗仔放出一段视频，某男星和女经纪人深夜同回酒店，期间举止亲密。视频时长较长但关键画面被打码，真实性引发网友争论。',
    category: '娱乐',
    trueProbability: 38,
  },
  {
    title: '综艺嘉宾现场发飙罢录，节目组紧急剪辑遮掩',
    description: '有网友发现某期综艺的镜头衔接十分生硬，疑似删除了嘉宾发飙的片段。现场观众爆料称当时场面一度失控，录制中断了近一小时。',
    category: '娱乐',
    trueProbability: 60,
  },
  {
    title: '某老戏骨代言的理财产品爆雷，受害者集体维权',
    description: '一款由老戏骨代言的理财App突然跑路，涉案金额上亿。受害者拉横幅维权，要求代言人承担责任。律师称代言人是否担责需看其是否知情。',
    category: '娱乐',
    trueProbability: 85,
  },
  {
    title: '知名歌手演唱会门票黄牛倒卖，官方票价翻五倍',
    description: '某歌手巡演开票即秒空，二手平台立刻出现大量溢价票，最高翻了五倍。主办方称已采用强实名制，但黄牛号称有技术手段绕过验证。',
    category: '娱乐',
    trueProbability: 90,
  },
  {
    title: '某女团成员宣布退团单飞，公司称未收到通知',
    description: '某女团成员在社交平台发文称将退出组合，引发粉丝震动。但所属公司随即发声明表示并未收到该成员的退团申请，双方各执一词。',
    category: '娱乐',
    trueProbability: 50,
  },
  {
    title: '网传某当红夫妻已秘密离婚，财产分割完毕',
    description: '有八卦博主爆料某对明星夫妻半年前已低调办理离婚手续，孩子归女方。两人近期确实零互动，连对方生日都没有公开祝福。',
    category: '娱乐',
    trueProbability: 35,
  },
  {
    title: '某真人秀被曝用替身完成危险动作，安全措施形同虚设',
    description: '一段幕后花絮显示，某户外真人秀的高空跳伞环节其实由专业替身完成，嘉宾本人全程在地面摆拍。节目组宣传的"真人挑战"被打脸。',
    category: '娱乐',
    trueProbability: 78,
  },
  {
    title: '知名编剧被指抄袭，原作者晒出创作时间线',
    description: '一部热播剧的原著作者发文，称剧中多个关键桥段与自己三年前发表的网文高度雷同，并贴出了详细的创作时间线对比图。',
    category: '娱乐',
    trueProbability: 65,
  },
  {
    title: '某童星被曝已出国留学，最后一部戏用替身完成',
    description: '有网友在海外偶遇某童星，称其已出国读书大半年。但其主演的剧集去年底才杀青，时间线对不上，疑似后期用了替身补拍。',
    category: '娱乐',
    trueProbability: 28,
  },

  // ===== 科技 x10 =====
  {
    title: '某国产手机品牌宣布自研芯片性能超越高通骁龙8 Gen 4',
    description: '官方发布数据显示，自研芯片在AI算力和能效比上全面超越高通最新旗舰芯片，引发行业震动。但跑分对比使用的测试项目被质疑有选择性。',
    category: '科技',
    trueProbability: 32,
  },
  {
    title: '人类首次实现室温超导？韩国团队论文引发全球热议',
    description: '韩国研究团队发表论文声称在常温常压下实现了超导现象，全球多家实验室正在进行复现验证。目前已有多组复现实验未能成功。',
    category: '科技',
    trueProbability: 12,
  },
  {
    title: '某大厂被曝将裁员30%，涉及多个核心部门',
    description: '匿名职场论坛出现爆料帖，称某互联网大厂将于下月启动大规模裁员，涉及产研等多个核心团队。内部人士透露已在统计优化名单。',
    category: '科技',
    trueProbability: 58,
  },
  {
    title: '国产大模型被曝评测数据作弊，刷榜行为被实锤',
    description: '有研究者发现某国产大模型在权威评测榜单上的成绩存在异常，疑似将测试集混入训练数据。该榜单已暂时下架其成绩并启动调查。',
    category: '科技',
    trueProbability: 70,
  },
  {
    title: '某品牌新款旗舰手机电池鼓包，官方称系个例',
    description: '多名用户在社交平台反映新机电池鼓包，部分甚至导致后盖翘起。官方回应称属个别案例，建议受影响用户联系售后检测更换。',
    category: '科技',
    trueProbability: 75,
  },
  {
    title: '网传某互联网巨头将收购一家传统车企，进军造车',
    description: '坊间流传某互联网公司将通过收购一家老牌车企的方式快速切入新能源汽车赛道。双方股价应声异动，但均未发布正式公告。',
    category: '科技',
    trueProbability: 25,
  },
  {
    title: '某AI生成视频以假乱真，骗过多名业内人士引发担忧',
    description: '一段用AI生成的名人演讲视频在圈内流传，多名资深从业者第一眼未能识别出是合成的。该视频暴露了深度伪造技术的成熟度。',
    category: '科技',
    trueProbability: 88,
  },
  {
    title: '5G基站辐射致癌？通信专家实测数据打脸传言',
    description: '网传某小区居民因5G基站辐射集体出现不适症状。通信专家实测基站周边电磁辐射值，远低于国家安全标准限值。',
    category: '科技',
    trueProbability: 8,
  },
  {
    title: '知名App被曝后台偷偷读取用户通讯录上传服务器',
    description: '安全团队发现某下载量过亿的App在用户未授权的情况下读取通讯录并加密上传。该行为隐藏在一段混淆代码中，普通用户难以察觉。',
    category: '科技',
    trueProbability: 82,
  },
  {
    title: '某国产电动车续航突破1000公里，实测打脸宣传数据',
    description: '某车企高调宣传新车续航破千公里，但媒体实测在冬季开暖风工况下实际续航仅六百出头。车企回应称测试条件不同导致差异。',
    category: '科技',
    trueProbability: 63,
  },

  // ===== 社会热点 x12（含体育、国际类） =====
  {
    title: '某城市地铁发生乘客集体晕厥事件，官方回应称系空调故障',
    description: '网传某城市地铁车厢内多名乘客突然晕倒，现场视频引发恐慌。官方发布初步调查说明称系空调故障导致闷热，但网友对说法存疑。',
    category: '社会热点',
    trueProbability: 52,
  },
  {
    title: '外卖小哥被小区保安殴打，物业公司称系个人冲突',
    description: '一段外卖骑手被保安殴打的视频在网络热传，物业公司回应称是双方个人冲突，与公司无关。骑手所在平台已介入协助处理。',
    category: '社会热点',
    trueProbability: 80,
  },
  {
    title: '某小区物业被曝挪用维修基金，业主集体抗议',
    description: '业主查账发现小区维修基金账户出现多笔不明支出，涉及金额上百万。物业负责人拒绝公开明细，业主已向住建部门投诉。',
    category: '社会热点',
    trueProbability: 74,
  },
  {
    title: '网传某地中考疑似泄题，教育局已介入调查',
    description: '考试期间有家长反映在社交媒体上看到了疑似考题截图，时间早于正式开考。教育局表示已启动调查程序，将公布结果。',
    category: '社会热点',
    trueProbability: 30,
  },
  {
    title: '外卖平台被曝压榨骑手，每单到手不足3元',
    description: '有骑手晒出后台流水，显示部分订单平台抽成后骑手到手不足3元。平台回应称单价受多重因素影响，整体收入仍有保障。',
    category: '社会热点',
    trueProbability: 68,
  },
  {
    title: '某地发生连环碰瓷事件，行车记录仪拍下全过程',
    description: '一段行车记录仪视频显示，同一人在不同路段多次故意摔倒碰擦车辆。车主将视频交至派出所，警方已立案调查。',
    category: '社会热点',
    trueProbability: 86,
  },
  {
    title: '网传某公司强制员工996且不给加班费，离职员工发声',
    description: '多名前员工爆料某公司要求员工签自愿放弃加班费协议，日均工作超12小时。劳动监察部门表示若属实将依法处理。',
    category: '社会热点',
    trueProbability: 77,
  },
  {
    title: '某地暴雨致严重内涝，市政排水系统遭质疑',
    description: '一场暴雨后某主干道积水没过车顶，多辆车泡水熄火。市民质疑城市排水系统年久失修，水务部门称降雨量超设计标准。',
    category: '社会热点',
    trueProbability: 90,
  },
  {
    title: '某国爆发大规模停电，波及多个城市超千万人',
    description: '外媒报道某国发生大面积停电事故，影响范围持续扩大。官方称系电网故障，正在抢修，但恢复时间尚不确定。',
    category: '社会热点',
    trueProbability: 83,
  },
  {
    title: '某球队被曝打假球，赌球集团浮出水面',
    description: '一场比赛的反常比分引发球迷质疑，警方顺藤摸瓜查出一个跨国赌球集团。多名球员已被带走调查，联赛官方暂未回应。',
    category: '社会热点',
    trueProbability: 45,
  },
  {
    title: '知名运动员被曝使用违禁药物，或面临终身禁赛',
    description: '某运动员赛后药检被检出违禁成分，B瓶样本复检结果仍为阳性。运动员本人坚称清白，称可能源于受污染的补剂。',
    category: '社会热点',
    trueProbability: 50,
  },
  {
    title: '某国宣布发现储量惊人稀土矿，或改变全球供应链格局',
    description: '某国地质部门公布发现一处大型稀土矿藏，预估储量可满足全球数十年需求。分析人士称可能重塑现有稀土贸易格局。',
    category: '社会热点',
    trueProbability: 40,
  },

  // ===== 生活科普 x5（含搞笑/猎奇） =====
  {
    title: '隔夜水和千滚水真的致癌吗？专家最新解读来了',
    description: '关于隔夜水和反复烧开的水会致癌的说法在网上广泛流传，营养学专家对此进行了详细分析。结论是亚硝酸盐含量远低于安全限值，纯属谣言。',
    category: '生活科普',
    trueProbability: 10,
  },
  {
    title: '每天走一万步能减肥？运动科学告诉你真相',
    description: '一万步理论源于日本计步器的营销，但最新研究表明并非步数越多越好，关键在于运动强度。慢走一万步的减脂效果远不如快走半小时。',
    category: '生活科普',
    trueProbability: 85,
  },
  {
    title: '喝骨头汤真的能补钙吗？营养师实验对比',
    description: '营养师将骨头汤和牛奶送检对比钙含量，结果显示骨头汤的钙含量仅为牛奶的几十分之一。所谓以形补形在营养学上站不住脚。',
    category: '生活科普',
    trueProbability: 92,
  },
  {
    title: '手机放枕头边睡觉会致癌？辐射专家实测打脸',
    description: '网传手机辐射会导致脑瘤，专家用专业设备实测手机辐射值，远低于可能产生危害的阈值。但睡前玩手机确实影响睡眠质量。',
    category: '生活科普',
    trueProbability: 6,
  },
  {
    title: '网传某地出现会发光的猫，疑似基因实验逃逸动物',
    description: '一段夜间拍到绿光眼睛猫咪的视频热传，配文称是某实验室的转基因猫逃逸。生物学者辟谣称夜视反光是正常现象，和转基因毫无关系。',
    category: '生活科普',
    trueProbability: 5,
  },

  // ===== 历史 x5 =====
  {
    title: '专家称发现了曹操墓的真正位置，与官方认定完全不同',
    description: '民间考古爱好者声称在河南安阳另一处发现了曹操墓的确凿证据，质疑现有安阳高陵的真实性。主流考古学界对其证据链持保留态度。',
    category: '历史',
    trueProbability: 22,
  },
  {
    title: '郑和船队是否真的到达过美洲？新证据引发争论',
    description: '有学者声称在北美发现明代瓷器残片，可能是郑和船队远航美洲的证据，历史学界争议不断。多数航海史专家认为证据不足以支撑结论。',
    category: '历史',
    trueProbability: 15,
  },
  {
    title: '史学家称发现新证据，秦始皇陵地宫入口疑似被定位',
    description: '一支考古团队使用遥感技术声称定位到了秦陵地宫的入口位置。但国家文物局明确表示未经批准不得发掘，相关说法仍属推测。',
    category: '历史',
    trueProbability: 35,
  },
  {
    title: '网传某地出土竹简改写先秦历史，专家存疑待鉴定',
    description: '网上流传一批竹简照片，称内容涉及未见于传世文献的重大史事。文博专家指出此类来路不明的藏品伪作居多，需碳14鉴定后才能下结论。',
    category: '历史',
    trueProbability: 18,
  },
  {
    title: '敦煌壁画修复被指破坏原貌，引发保护方式争论',
    description: '一组修复前后对比照引发争议，有网友认为修复后色彩过于鲜亮失真。修复团队回应称采用的是可逆材料，符合国际修复原则。',
    category: '历史',
    trueProbability: 55,
  },

  // ===== 财经 x5 =====
  {
    title: '某知名企业被曝财务造假，审计机构已宣布退出',
    description: '匿名举报称某上市公司存在大规模财务造假，其审计机构突然宣布终止合作，股价应声暴跌。证监会已介入调查。',
    category: '财经',
    trueProbability: 76,
  },
  {
    title: '楼市新政后房价将大幅反弹？业内专家意见两极分化',
    description: '最新一轮房地产调控政策出台后，有分析认为房价将迎来报复性反弹，而另一方则认为市场基本面不支持。双方各执一词，购房者陷入观望。',
    category: '财经',
    trueProbability: 38,
  },
  {
    title: '某新能源车企被曝库存积压，资金链紧张',
    description: '知情人士透露某新势力车企多地仓库爆满，经销商提货意愿低迷。公司账上现金已不足以支撑两个季度运营，正紧急寻求融资。',
    category: '财经',
    trueProbability: 60,
  },
  {
    title: '黄金价格将突破历史新高？分析师观点分歧',
    description: '金价持续走高引发市场关注，部分机构喊出新高在即，但也有分析师警告短期存在回调风险。央行购金需求是本轮上涨主要推手。',
    category: '财经',
    trueProbability: 50,
  },
  {
    title: '某知名电商平台被曝售假，品牌方已发律师函',
    description: '某国际品牌方抽检发现平台在售商品八成为假货，已发送律师函要求下架并索赔。平台称将配合调查，但拒绝承认监管失职。',
    category: '财经',
    trueProbability: 72,
  },

  // ===== 校园 x3 =====
  {
    title: '某高校被曝保研黑幕，辅导员泄露内定名单',
    description: '一张截图显示某高校辅导员在私聊中透露保研名单早已内定，引发学生强烈不满。校方回应称截图系伪造，已启动内部核查。',
    category: '校园',
    trueProbability: 45,
  },
  {
    title: '大学生兼职刷单被骗，涉案金额超百万',
    description: '多名大学生反映参与网络刷单兼职被骗取保证金，单笔损失数千至上万不等。警方已并案侦查，提醒刷单本身即属违法行为。',
    category: '校园',
    trueProbability: 88,
  },
  {
    title: '某地高考阅卷老师被曝批改随意，分数差距大',
    description: '有自称阅卷教师发帖称部分科目批改时间仓促，同一份试卷不同老师给分差距悬殊。考试院回应称阅卷有严格的双评机制和误差控制。',
    category: '校园',
    trueProbability: 28,
  },

  // ===== 健康 x3 =====
  {
    title: '某网红保健品被指虚假宣传，成本仅几块钱',
    description: '某热销代购保健品被查出核心成分和几十元的国产货并无区别，却以十倍价格售卖。市监局已立案，多地同步调查。',
    category: '健康',
    trueProbability: 80,
  },
  {
    title: '长期喝奶茶会得糖尿病？内分泌科医生解读',
    description: '网传每天一杯奶茶必然导致糖尿病，内分泌科医生表示因果没这么绝对。但高糖饮品长期摄入确实增加代谢疾病风险，建议控制频率。',
    category: '健康',
    trueProbability: 40,
  },
  {
    title: '某疫苗被曝生产数据造假，药监局已介入',
    description: '内部举报人称某疫苗企业在生产记录上做手脚，影响批次质量判定。药监局已派出检查组进驻企业，相关批次产品被要求暂停使用。',
    category: '健康',
    trueProbability: 55,
  },
]

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function generateRevealTime(): string {
  const hoursFromNow = randomInt(1, 24)
  const date = new Date(Date.now() + hoursFromNow * 60 * 60 * 1000)
  return date.toISOString()
}

const melonAuthors = [
  { id: '娱乐揭秘君', nickname: '娱乐揭秘君', avatar: 'https://picsum.photos/seed/ca1/80/80', rank: '鉴瓜达人' },
  { id: '真相猎人', nickname: '真相猎人', avatar: 'https://picsum.photos/seed/u1/80/80', rank: '鉴瓜大师' },
  { id: '吃瓜达人', nickname: '吃瓜达人', avatar: 'https://picsum.photos/seed/u2/80/80', rank: '瓜田侦探' },
  { id: '柯南附体', nickname: '柯南附体', avatar: 'https://picsum.photos/seed/u3/80/80', rank: '鉴瓜学徒' },
  { id: '福尔摩斯', nickname: '福尔摩斯', avatar: 'https://picsum.photos/seed/u4/80/80', rank: '鉴瓜大师' },
  { id: '八卦小子', nickname: '八卦小子', avatar: 'https://picsum.photos/seed/u5/80/80', rank: '瓜田新手' },
  { id: '鉴证实录', nickname: '鉴证实录', avatar: 'https://picsum.photos/seed/u6/80/80', rank: '见微先知' },
  { id: '理性吃瓜', nickname: '理性吃瓜', avatar: 'https://picsum.photos/seed/ca15/80/80', rank: '鉴瓜大师' },
  { id: '视频侦探', nickname: '视频侦探', avatar: 'https://picsum.photos/seed/ca20/80/80', rank: '鉴瓜大师' },
  { id: '辟谣小助手', nickname: '辟谣小助手', avatar: 'https://picsum.photos/seed/ca18/80/80', rank: '鉴瓜大师' },
  { id: '实验达人', nickname: '实验达人', avatar: 'https://picsum.photos/seed/ca9/80/80', rank: '瓜田侦探' },
  { id: 'AI鉴别师', nickname: 'AI鉴别师', avatar: 'https://picsum.photos/seed/ca11/80/80', rank: '鉴瓜大师' },
]

export function generateMelons(): Melon[] {
  return melonTemplates.map((tpl, i) => {
    const trueCount = randomInt(100, 5000)
    const falseCount = randomInt(100, 5000)
    const totalParticipants = trueCount + falseCount
    const daysAgo = randomInt(0, 5)
    const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString()
    // 约75%有作者，25%匿名
    const hasAuthor = (i % 4) !== 0
    const author = hasAuthor ? melonAuthors[i % melonAuthors.length] : undefined

    // 从第 5 个起，每隔一个瓜为已揭晓状态（约 40% 已揭晓）
    // 同时补充 result + report 字段，确保已揭晓瓜的种子数据完整
    const isRevealed = i >= 4 && i % 2 === 0
    const revealedResult = i % 4 === 0  // 真/假交替
    const status = isRevealed ? 'revealed' as const : 'pending' as const
    const revealTime = isRevealed
      ? new Date(Date.now() - Math.random() * 86400000).toISOString()
      : generateRevealTime()
    const result = isRevealed ? revealedResult : undefined
    const report = isRevealed ? generateMockReport(`melon-${i + 1}`, revealedResult) : undefined

    return {
      id: `melon-${i + 1}`,
      title: tpl.title,
      description: tpl.description,
      coverImage: `https://picsum.photos/seed/melon${i + 1}/400/200`,
      category: tpl.category,
      difficulty: randomInt(1, 3) as 1 | 2 | 3,
      trueCount,
      falseCount,
      totalParticipants,
      trueProbability: tpl.trueProbability,
      revealTime,
      status,
      result,
      report,
      createdAt,
      likeCount: randomInt(100, 5000),
      commentCount: randomInt(10, 500),
      evidenceCount: randomInt(5, 50),
      isLiked: false,
      author: author ? { ...author } : undefined,
    }
  })
}

// ===== AI 求证 Mock 数据 =====

const mockVerificationResults: VerificationResult[] = [
  {
    credibilityLevel: 5,
    summary: '该信息经过多方权威信源交叉验证，核心事实确凿，可作为可靠信息采信。',
    keyEvidence: [
      '新华社、人民日报等官方媒体已发布相关报道，内容一致',
      '政府官方渠道发布了正式公告，与信息核心内容吻合',
      '多位领域专家在公开场合确认了该信息的真实性',
      '相关学术论文中的数据与此信息相互印证',
    ],
    tendency: '经核实，该信息内容真实可信，核心事实与多方独立信源一致。',
  },
  {
    credibilityLevel: 4,
    summary: '主要事实基本可信，但部分细节存在夸大或表述不准确的情况，建议参考多方信源。',
    keyEvidence: [
      '主流媒体报道了相关事件，但部分数据存在出入',
      '当事人回应确认了事件主体，但否认了部分细节',
      '第三方机构的调查结果与主流媒体报道基本一致',
    ],
    tendency: '信息主体内容属实，但部分细节描述被夸大，建议以官方通报为准。',
  },
  {
    credibilityLevel: 3,
    summary: '信息真伪混杂，核心事实难以完全确认，需等待更多权威信源披露。',
    keyEvidence: [
      '部分关键信息仅来自单一匿名信源，无法交叉验证',
      '相关方对此事保持沉默，未作出任何回应',
      '网络上存在多种相互矛盾的说法，暂无定论',
    ],
    tendency: '目前证据不足以判断真伪，信息中既有可信成分也有可疑之处，建议保持关注。',
  },
  {
    credibilityLevel: 2,
    summary: '该信息存在多处疑点，与已知事实明显矛盾，可信度较低。',
    keyEvidence: [
      '信息中提到的关键时间节点与官方记录不符',
      '所谓"当事人"已被证实为虚构人物',
      '配图经反向搜索发现为旧闻图片，与事件无关',
      '相关领域专家明确表示该说法在科学上站不住脚',
    ],
    tendency: '该信息基本可以认定为不实信息，存在明显造谣痕迹，请勿传播。',
  },
  {
    credibilityLevel: 1,
    summary: '该信息已被权威机构明确辟谣，纯属虚假信息，请勿相信或传播。',
    keyEvidence: [
      '中国互联网联合辟谣平台已发布辟谣公告',
      '公安机关已对造谣者依法处理，案件通报已公开',
      '信息中引用的"研究"根本不存在，为凭空捏造',
      '多个事实核查平台一致判定该信息为谣言',
    ],
    tendency: '该信息为彻头彻尾的谣言，已被官方辟谣，造谣者已被依法追责。',
  },
]

export async function generateVerificationResult(content: string): Promise<VerificationResult> {
  // 随机延迟 1.5-3 秒模拟 AI 分析
  const delay = 1500 + Math.random() * 1500
  await new Promise((resolve) => setTimeout(resolve, delay))

  // 基于内容的哈希值决定结果，使得同一内容得到一致结果
  let hash = 0
  for (let i = 0; i < content.length; i++) {
    hash = ((hash << 5) - hash + content.charCodeAt(i)) | 0
  }

  const index = Math.abs(hash) % mockVerificationResults.length
  return { ...mockVerificationResults[index] }
}

// ===== 佐证 Mock 数据 =====

const evidenceUsers = [
  { id: 'u1', nickname: '真相猎人', avatar: 'https://picsum.photos/seed/u1/40/40' },
  { id: 'u2', nickname: '吃瓜达人', avatar: 'https://picsum.photos/seed/u2/40/40' },
  { id: 'u3', nickname: '柯南附体', avatar: 'https://picsum.photos/seed/u3/40/40' },
  { id: 'u4', nickname: '福尔摩斯', avatar: 'https://picsum.photos/seed/u4/40/40' },
  { id: 'u5', nickname: '八卦小子', avatar: 'https://picsum.photos/seed/u5/40/40' },
  { id: 'u6', nickname: '鉴证实录', avatar: 'https://picsum.photos/seed/u6/40/40' },
]

const evidenceContents = [
  '我查到这个明星去年确实领证了，民政局有记录可查',
  '图片是 PS 的，眼镜反光位置和官方图不一致',
  '当事人工作室已经发声明了，说是恶意造谣',
  '我找到了原图出处，这是 3 年前的旧闻重新炒作',
  '有记者拍到两人一起进出酒店，照片很清晰',
  '知名狗仔已经确认消息属实，内部消息',
  '这已经是第二次爆料了，上次被压下去了',
  '我朋友在该剧组工作，确实听到了一些消息',
]

export function generateMockEvidence(melonId: string): Evidence[] {
  // 返回 2-4 条佐证
  const count = randomInt(2, 4)
  const shuffledUsers = [...evidenceUsers].sort(() => Math.random() - 0.5)
  const shuffledContents = [...evidenceContents].sort(() => Math.random() - 0.5)

  return Array.from({ length: count }, (_, i) => {
    const direction = Math.random() > 0.5
    const upvotes = randomInt(5, 88)
    const downvotes = randomInt(0, 15)
    const hoursAgo = randomInt(1, 48)

    return {
      id: `ev_${melonId}_${i + 1}`,
      melonId,
      userId: shuffledUsers[i].id,
      userNickname: shuffledUsers[i].nickname,
      userAvatar: shuffledUsers[i].avatar,
      guessId: `guess_${melonId}_${shuffledUsers[i].id}`,
      direction,
      content: shuffledContents[i],
      upvotes,
      downvotes,
      isBest: false,
      // 前 2 条标记为 AI 辅助创作，用于演示来源标记
      aiAssisted: i < 2,
      createdAt: new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString(),
    }
  })
}

// ===== 社区帖子 Mock 数据 =====

export type CommunityPostType = 'normal' | 'charity' | 'help' | 'hot'

export interface CommunityPost {
  id: string
  type: CommunityPostType
  title: string
  image: string
  imageHeight: number  // 瀑布流不同高度
  authorName: string
  authorAvatar: string
  likes: number
  tags: string[]
  createdAt: string
}

const communityPosts: CommunityPost[] = [
  { id: 'cp1', type: 'hot', title: '震惊！某顶流明星竟然做出了这种事...', image: 'https://picsum.photos/seed/cp1/400/500', imageHeight: 220, authorName: '娱乐揭秘君', authorAvatar: 'https://picsum.photos/seed/ca1/40/40', likes: 12300, tags: ['娱乐', '热帖'], createdAt: new Date(Date.now() - 3600000).toISOString() },
  { id: 'cp2', type: 'normal', title: '今天地铁上看到的，大家帮忙判断一下真假', image: 'https://picsum.photos/seed/cp2/400/300', imageHeight: 160, authorName: '路人甲', authorAvatar: 'https://picsum.photos/seed/ca2/40/40', likes: 856, tags: ['社会'], createdAt: new Date(Date.now() - 7200000).toISOString() },
  { id: 'cp3', type: 'charity', title: '山区小学的孩子们需要过冬的棉衣，求转发', image: 'https://picsum.photos/seed/cp3/400/400', imageHeight: 200, authorName: '暖心公益', authorAvatar: 'https://picsum.photos/seed/ca3/40/40', likes: 3420, tags: ['公益'], createdAt: new Date(Date.now() - 10800000).toISOString() },
  { id: 'cp4', type: 'help', title: '这条朋友圈截图是真的吗？有人能帮忙看看吗', image: 'https://picsum.photos/seed/cp4/400/350', imageHeight: 180, authorName: '求助人', authorAvatar: 'https://picsum.photos/seed/ca4/40/40', likes: 234, tags: ['求助'], createdAt: new Date(Date.now() - 14400000).toISOString() },
  { id: 'cp5', type: 'normal', title: '科普一下：这个网红产品真的安全吗？我查了成分表', image: 'https://picsum.photos/seed/cp5/400/450', imageHeight: 240, authorName: '成分党', authorAvatar: 'https://picsum.photos/seed/ca5/40/40', likes: 5670, tags: ['科技', '科普'], createdAt: new Date(Date.now() - 18000000).toISOString() },
  { id: 'cp6', type: 'hot', title: '某上市公司被曝财务造假，散户血本无归', image: 'https://picsum.photos/seed/cp6/400/300', imageHeight: 150, authorName: '财经观察', authorAvatar: 'https://picsum.photos/seed/ca6/40/40', likes: 8900, tags: ['财经', '热帖'], createdAt: new Date(Date.now() - 21600000).toISOString() },
  { id: 'cp7', type: 'normal', title: '我花了三天时间查证了这个历史传闻，结果出乎意料', image: 'https://picsum.photos/seed/cp7/400/500', imageHeight: 260, authorName: '历史侦探', authorAvatar: 'https://picsum.photos/seed/ca7/40/40', likes: 2340, tags: ['历史'], createdAt: new Date(Date.now() - 25200000).toISOString() },
  { id: 'cp8', type: 'charity', title: '走失老人信息，请帮忙扩散！最后出现在朝阳区', image: 'https://picsum.photos/seed/cp8/400/350', imageHeight: 190, authorName: '寻亲志愿者', authorAvatar: 'https://picsum.photos/seed/ca8/40/40', likes: 15600, tags: ['公益', '寻人'], createdAt: new Date(Date.now() - 28800000).toISOString() },
  { id: 'cp9', type: 'normal', title: '实测：网上流传的这个生活小窍门到底靠不靠谱', image: 'https://picsum.photos/seed/cp9/400/400', imageHeight: 200, authorName: '实验达人', authorAvatar: 'https://picsum.photos/seed/ca9/40/40', likes: 1230, tags: ['生活科普'], createdAt: new Date(Date.now() - 32400000).toISOString() },
  { id: 'cp10', type: 'help', title: '家里老人被忽悠买保健品，怎么劝都不听', image: 'https://picsum.photos/seed/cp10/400/300', imageHeight: 155, authorName: '无奈子女', authorAvatar: 'https://picsum.photos/seed/ca10/40/40', likes: 456, tags: ['求助', '社会'], createdAt: new Date(Date.now() - 36000000).toISOString() },
  { id: 'cp11', type: 'normal', title: '深度分析：这个AI生成的视频到底哪里露馅了', image: 'https://picsum.photos/seed/cp11/400/450', imageHeight: 230, authorName: 'AI鉴别师', authorAvatar: 'https://picsum.photos/seed/ca11/40/40', likes: 7890, tags: ['科技'], createdAt: new Date(Date.now() - 39600000).toISOString() },
  { id: 'cp12', type: 'hot', title: '全网都在传的这段录音，我找到了原始出处', image: 'https://picsum.photos/seed/cp12/400/300', imageHeight: 165, authorName: '真相挖掘', authorAvatar: 'https://picsum.photos/seed/ca12/40/40', likes: 23400, tags: ['娱乐', '热帖'], createdAt: new Date(Date.now() - 43200000).toISOString() },
  { id: 'cp13', type: 'normal', title: '关于最近流感的传言，作为医学生说几句实话', image: 'https://picsum.photos/seed/cp13/400/400', imageHeight: 210, authorName: '医学生小王', authorAvatar: 'https://picsum.photos/seed/ca13/40/40', likes: 4560, tags: ['生活科普'], createdAt: new Date(Date.now() - 46800000).toISOString() },
  { id: 'cp14', type: 'charity', title: '爱心午餐：为留守老人送去一份温暖', image: 'https://picsum.photos/seed/cp14/400/500', imageHeight: 250, authorName: '阳光公益团', authorAvatar: 'https://picsum.photos/seed/ca14/40/40', likes: 6780, tags: ['公益'], createdAt: new Date(Date.now() - 50400000).toISOString() },
  { id: 'cp15', type: 'normal', title: '对比了五家媒体报道，发现这件事的真相被严重歪曲', image: 'https://picsum.photos/seed/cp15/400/350', imageHeight: 185, authorName: '理性吃瓜', authorAvatar: 'https://picsum.photos/seed/ca15/40/40', likes: 3210, tags: ['社会热点'], createdAt: new Date(Date.now() - 54000000).toISOString() },
  { id: 'cp16', type: 'help', title: '这个理财课程是不是骗局？交了好几千学费', image: 'https://picsum.photos/seed/cp16/400/300', imageHeight: 160, authorName: '迷茫小白', authorAvatar: 'https://picsum.photos/seed/ca16/40/40', likes: 789, tags: ['求助', '财经'], createdAt: new Date(Date.now() - 57600000).toISOString() },
  { id: 'cp17', type: 'normal', title: '我用AI工具还原了这张老照片，结果让人意外', image: 'https://picsum.photos/seed/cp17/400/450', imageHeight: 235, authorName: '技术宅', authorAvatar: 'https://picsum.photos/seed/ca17/40/40', likes: 1890, tags: ['科技', '历史'], createdAt: new Date(Date.now() - 61200000).toISOString() },
  { id: 'cp18', type: 'normal', title: '别再转发这条消息了，我帮你查证过了', image: 'https://picsum.photos/seed/cp18/400/300', imageHeight: 150, authorName: '辟谣小助手', authorAvatar: 'https://picsum.photos/seed/ca18/40/40', likes: 9870, tags: ['社会热点'], createdAt: new Date(Date.now() - 64800000).toISOString() },
  { id: 'cp19', type: 'charity', title: '流浪动物救助站急需物资支援，冬天快到了', image: 'https://picsum.photos/seed/cp19/400/400', imageHeight: 205, authorName: '毛孩子之家', authorAvatar: 'https://picsum.photos/seed/ca19/40/40', likes: 4320, tags: ['公益'], createdAt: new Date(Date.now() - 68400000).toISOString() },
  { id: 'cp20', type: 'hot', title: '全网热议的这段视频，逐帧分析后发现了三个疑点', image: 'https://picsum.photos/seed/cp20/400/500', imageHeight: 270, authorName: '视频侦探', authorAvatar: 'https://picsum.photos/seed/ca20/40/40', likes: 31200, tags: ['热帖', '社会'], createdAt: new Date(Date.now() - 72000000).toISOString() },
  { id: 'cp21', type: 'normal', title: '关于转基因食品，这篇科普值得每个人看看', image: 'https://picsum.photos/seed/cp21/400/350', imageHeight: 175, authorName: '科普中国', authorAvatar: 'https://picsum.photos/seed/ca21/40/40', likes: 6540, tags: ['生活科普'], createdAt: new Date(Date.now() - 75600000).toISOString() },
  { id: 'cp22', type: 'help', title: '有人知道这个偏方治咳嗽到底有没有用吗', image: 'https://picsum.photos/seed/cp22/400/300', imageHeight: 155, authorName: '咳嗽一个月', authorAvatar: 'https://picsum.photos/seed/ca22/40/40', likes: 345, tags: ['求助', '生活科普'], createdAt: new Date(Date.now() - 79200000).toISOString() },
]

export function getCommunityPosts(filter?: string, page = 0, pageSize = 9): { posts: CommunityPost[]; hasMore: boolean } {
  let source = communityPosts
  if (filter === '关注') source = communityPosts.slice(0, 8)
  else if (filter === '公益') source = communityPosts.filter(p => p.type === 'charity')
  else if (filter === '求助') source = communityPosts.filter(p => p.type === 'help')
  else if (filter === '热帖') source = communityPosts.filter(p => p.type === 'hot')

  const start = page * pageSize
  const end = start + pageSize
  // 循环取数据以模拟无限加载
  const result: CommunityPost[] = []
  for (let i = start; i < end; i++) {
    const src = source[i % source.length]
    result.push({
      ...src,
      id: page === 0 ? src.id : `${src.id}_p${page}_${i}`,
      likes: page === 0 ? src.likes : Math.floor(Math.random() * 5000) + 100,
    })
  }

  return { posts: result, hasMore: true }
}

// 推荐页硬编码的3条帖子（与设计图一致）
const featuredPosts: CommunityPost[] = [
  {
    id: '1',
    type: 'hot',
    title: '高考！紧张的情绪真的也日了这种事...',
    image: 'https://picsum.photos/seed/college/400/300',
    imageHeight: 200,
    authorName: '娱乐嗨将官',
    authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=entertainment',
    likes: 1800,
    tags: ['娱乐', '热帖'],
    createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
  },
  {
    id: '2',
    type: 'normal',
    title: '今天去爬上看日出，大家帮忙判断一下真伪',
    image: 'https://picsum.photos/seed/sunrise/400/300',
    imageHeight: 200,
    authorName: '路人甲',
    authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=passerby',
    likes: 128,
    tags: ['生活'],
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '3',
    type: 'charity',
    title: '山区小学的孩子们需要这些物资，求转发',
    image: 'https://picsum.photos/seed/mountain/400/300',
    imageHeight: 200,
    authorName: '暖心公益',
    authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=charity',
    likes: 513,
    tags: ['公益'],
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  },
]

// 硬编码帖子的完整内容（用于详情页）
const featuredPostContents: Record<string, { content: string; comments: number; collects: number }> = {
  '1': {
    content: '每年这个时候，都会想起当年高考的日子。紧张、期待，还有一点点的小确幸。分享一下我的故事...\n\n记得高考前一天晚上，我翻来覆去睡不着，脑子里全是公式和古诗文。第二天进考场的时候，手心全是汗。但是当真正拿起笔的那一刻，反而平静了下来。\n\n希望今年的考生们都能发挥出自己的水平，考上理想的大学！加油！',
    comments: 3700,
    collects: 1200,
  },
  '2': {
    content: '凌晨四点爬上山顶，等待日出的那一刻真的太美了！但不确定这是不是P图，求大佬帮忙看看~\n\n我用手机拍的，原图直出没有滤镜。太阳刚出来的时候整个天空都是橙红色的，特别壮观。\n\n有懂摄影的朋友帮忙鉴定一下吗？',
    comments: 256,
    collects: 856,
  },
  '3': {
    content: '我们正在为山区小学筹集学习用品和生活物资，您的每一次转发都可能改变一个孩子的未来...\n\n目前急需的物资：\n- 冬季棉衣（适合6-12岁儿童）\n- 课外读物（绘本、故事书等）\n- 文具用品（书包、铅笔、本子）\n- 体育器材（跳绳、毽子、篮球）\n\n如果您有闲置的物品想要捐赠，请私信联系我们。感谢每一位爱心人士！',
    comments: 1000,
    collects: 3400,
  },
}

export function getCommunityPostById(id: string): CommunityPost | undefined {
  // 先从硬编码推荐帖中查找
  const featured = featuredPosts.find(p => p.id === id)
  if (featured) return featured
  // 再从社区帖子中查找
  return communityPosts.find(p => p.id === id)
}

export function getFeaturedPosts(): CommunityPost[] {
  return featuredPosts
}

export function getFeaturedPostContent(id: string): { content: string; comments: number; collects: number } | undefined {
  return featuredPostContents[id]
}

export function createCommunityPost(data: { title: string; content: string; image?: string; tags?: string[] }): CommunityPost {
  const id = `cp${Date.now()}`
  const post: CommunityPost = {
    id,
    type: 'normal',
    title: data.title,
    image: data.image || `https://picsum.photos/seed/${id}/400/300`,
    imageHeight: 200,
    authorName: '我',
    authorAvatar: `https://picsum.photos/seed/me/40/40`,
    likes: 0,
    tags: data.tags || [],
    createdAt: new Date().toISOString(),
  }
  communityPosts.unshift(post)
  return post
}

// ===== 实锤报告 Mock 数据 =====

export function formatCount(n: number): string {
  if (n >= 10000) {
    return (n / 10000).toFixed(1) + '万'
  }
  if (n >= 1000) {
    return (n / 1000).toFixed(1) + 'k'
  }
  return n.toString()
}

export interface HotDebate {
  id: number
  topic: string
  participants: number
  roomId: string
}

export interface HotMelon {
  id: number
  title: string
  views: number
  isHot: boolean
  category?: string
  participants?: number
  comments?: number
  trending?: 'up' | 'down' | 'new' | 'stable' | 'rising' | 'hot'
  author?: {
    id: string
    nickname: string
    avatar: string
    rank: string
    points: number
  }
}

export interface HotTopic {
  id: number
  tag: string
  count: number
  description?: string
  trending?: 'new' | 'rising' | 'hot' | 'stable'
  relatedTags?: string[]
}

export interface RecommendUser {
  id: number
  nickname: string
  bio: string
  initial: string
  color: string
  avatar?: string
}

export const hotDebates: HotDebate[] = [
  { id: 1, topic: '短视频正在摧毁深度思考能力吗？', participants: 12000, roomId: 'room-melon' },
  { id: 2, topic: '大学学历在AI时代还有价值吗？', participants: 8563, roomId: 'room-ai-value' },
  { id: 3, topic: '远程办公是否降低了工作效率？', participants: 6421, roomId: 'room-remote' },
  { id: 4, topic: '网红带货是不是新型传销？', participants: 5234, roomId: 'room-influencer' },
  { id: 5, topic: '年轻人该不该躺平？', participants: 4123, roomId: 'room-lie-flat' },
]

export const hotMelons: HotMelon[] = [
  {
    id: 1, title: '某顶流明星隐婚生子，对象是圈外人士', views: 12000, isHot: true, category: '娱乐',
    participants: 5623, comments: 890, trending: 'up',
    author: { id: '娱乐揭秘君', nickname: '娱乐揭秘君', avatar: 'https://picsum.photos/seed/ca1/80/80', rank: '鉴瓜达人', points: 7800 },
  },
  {
    id: 2, title: '苹果将于明年发布折叠屏 iPhone，供应链已确认', views: 8563, isHot: true, category: '科技',
    participants: 5052, comments: 234, trending: 'up',
    author: { id: '真相猎人', nickname: '真相猎人', avatar: 'https://picsum.photos/seed/u1/80/80', rank: '鉴瓜大师', points: 12580 },
  },
  {
    id: 3, title: '央行将于下月降准 50 个基点，释放万亿流动性', views: 6421, isHot: false, category: '财经',
    participants: 4100, comments: 445, trending: 'new',
    author: { id: '财经观察', nickname: '财经观察', avatar: 'https://picsum.photos/seed/ca6/80/80', rank: '鉴瓜达人', points: 13400 },
  },
  {
    id: 4, title: '某地发生 5.2 级地震，官方尚未发布伤亡报告', views: 5234, isHot: false, category: '社会热点',
    participants: 7100, comments: 1230, trending: 'stable',
    author: { id: 'AI鉴别师', nickname: 'AI鉴别师', avatar: 'https://picsum.photos/seed/ca11/80/80', rank: '鉴瓜大师', points: 19800 },
  },
  {
    id: 5, title: '每天喝八杯水其实没有科学依据，可能反而有害', views: 4123, isHot: false, category: '生活科普',
    participants: 6300, comments: 567, trending: 'new',
    author: { id: '实验达人', nickname: '实验达人', avatar: 'https://picsum.photos/seed/ca9/80/80', rank: '瓜田侦探', points: 6800 },
  },
  {
    id: 6, title: 'OpenAI 正在开发能实时视频通话的 GPT-5', views: 3800, isHot: false, category: '科技',
    participants: 6500, comments: 780, trending: 'up',
    author: { id: 'AI鉴别师', nickname: 'AI鉴别师', avatar: 'https://picsum.photos/seed/ca11/80/80', rank: '鉴瓜大师', points: 19800 },
  },
]

export const hotTopics: HotTopic[] = [
  { id: 1, tag: '某顶流塌房实锤', count: 123000, description: '多位狗仔爆料，证据链逐步浮出水面', trending: 'hot', relatedTags: ['娱乐圈', '塌房', '实锤'] },
  { id: 2, tag: '短视频的危害', count: 87000, description: '深度思考能力正在被算法消解？', trending: 'rising', relatedTags: ['数字素养', '注意力', '算法'] },
  { id: 3, tag: '大学早操该不该取消', count: 62000, description: '多所高校学生发起联名请愿', trending: 'new', relatedTags: ['校园', '学生权益', '作息'] },
  { id: 4, tag: 'AI时代的就业焦虑', count: 51000, description: '文科生如何应对AI冲击', trending: 'hot', relatedTags: ['AI', '就业', '专业选择'] },
  { id: 5, tag: '淄博烧烤还行吗', count: 38000, description: '半年后回访：热度褪去后的真相', trending: 'stable', relatedTags: ['网红城市', '消费', '旅游'] },
]

export const recommendUsers: RecommendUser[] = [
  { id: 1, nickname: '真相观察员', bio: '求证达人', initial: '真', color: 'bg-red-50 text-red-600', avatar: 'https://picsum.photos/seed/user1/80/80' },
  { id: 2, nickname: '思辨者', bio: '辩论高手', initial: '思', color: 'bg-blue-50 text-blue-600', avatar: 'https://picsum.photos/seed/user2/80/80' },
  { id: 3, nickname: '喵喵研究所', bio: '科学科普博主', initial: '喵', color: 'bg-amber-50 text-amber-600', avatar: 'https://picsum.photos/seed/user3/80/80' },
]

export function generateMockReport(melonId: string, result: boolean): Report {
  return {
    id: `report-${melonId}`,
    melonId,
    timeline: [
      { time: '2024-01-15', event: '事件首次曝光', source: '微博热搜' },
      { time: '2024-01-16', event: '当事人回应', source: '工作室声明' },
      { time: '2024-01-18', event: '官方通报', source: '官方媒体' },
    ],
    evidenceChain: [
      {
        description: '官方媒体确认报道',
        source: '新华社',
        sourceUrl: 'https://xinhua.com',
        credibility: 5,
      },
      {
        description: '当事人工作室正式回应',
        source: '当事人微博',
        sourceUrl: 'https://weibo.com',
        credibility: 4,
      },
      {
        description: '第三方媒体跟进报道',
        source: '财经网',
        sourceUrl: 'https://caijing.com',
        credibility: 4,
      },
      {
        description: '相关知情人士确认',
        source: '匿名信源',
        sourceUrl: '',
        credibility: 2,
      },
    ],
    keyDoubts: ['部分细节存疑', '时间线有出入', '当事人未直接回应'],
    tendency: result ? '信息属实' : '信息存在虚假成分',
    tendencyDirection: result,
    disclaimer: 'AI核查仅供参考，不构成任何建议',
    generatedAt: new Date().toISOString(),
  }
}

// ===== 社区系统种子数据 =====

export type CommunityCategory = '科技' | '娱乐' | '社会' | '财经' | '教育' | '健康' | '游戏' | '体育' | '旅行' | '美食'

export interface Community {
  id: string
  name: string
  description: string
  icon: string  // emoji 图标
  category: CommunityCategory
  memberCount: number
  postCount: number
  coverImage: string
  createdAt: string
}

// 社区帖子（扩展自 CommunityPost，新增 communityId / content / views / comments 字段）
export interface CommunitySeedPost {
  id: string
  communityId: string
  type: CommunityPostType  // 'normal' | 'hot' | 'charity' | 'help'
  title: string
  content: string
  image?: string
  authorName: string
  authorAvatar: string
  likes: number
  comments: number
  views: number
  tags: string[]
  createdAt: string
}

// 单层评论
export interface CommunityComment {
  id: string
  postId: string
  userNickname: string
  userAvatar: string
  content: string
  likes: number
  isLiked: boolean
  createdAt: string
}

// ── 10 个官方社区 ──────────────────────────────────────

export const communities: Community[] = [
  {
    id: 'c-tech',
    name: '科技前沿',
    description: '聚焦 AI、芯片、新能源与前沿技术，理性探讨技术背后的逻辑与影响。',
    icon: '💡',
    category: '科技',
    memberCount: 128450,
    postCount: 8420,
    coverImage: 'https://picsum.photos/seed/tech-cover/600/300',
    createdAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'c-entertainment',
    name: '娱乐八卦',
    description: '娱乐圈最新动态、影视综艺讨论，理性吃瓜，不传未经证实的消息。',
    icon: '🎬',
    category: '娱乐',
    memberCount: 256780,
    postCount: 15600,
    coverImage: 'https://picsum.photos/seed/ent-cover/600/300',
    createdAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'c-society',
    name: '社会百态',
    description: '关注民生、法治与社会热点，用事实说话，传递有温度的社会观察。',
    icon: '🌍',
    category: '社会',
    memberCount: 189320,
    postCount: 11200,
    coverImage: 'https://picsum.photos/seed/society-cover/600/300',
    createdAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'c-finance',
    name: '财经观察',
    description: '宏观经济、资本市场与产业分析，分享有深度的财经洞察。投资有风险，讨论不构成建议。',
    icon: '📊',
    category: '财经',
    memberCount: 98670,
    postCount: 6780,
    coverImage: 'https://picsum.photos/seed/finance-cover/600/300',
    createdAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'c-education',
    name: '教育园地',
    description: 'K12、高校、留学与职业教育话题，分享学习经验，探讨教育公平与改革。',
    icon: '📚',
    category: '教育',
    memberCount: 145890,
    postCount: 9340,
    coverImage: 'https://picsum.photos/seed/edu-cover/600/300',
    createdAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'c-health',
    name: '健康生活',
    description: '医学科普、运动健身与心理健康，用循证医学对抗伪科学。本社区内容不替代专业医疗建议。',
    icon: '🌿',
    category: '健康',
    memberCount: 112340,
    postCount: 7820,
    coverImage: 'https://picsum.photos/seed/health-cover/600/300',
    createdAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'c-game',
    name: '游戏玩家',
    description: '主机、PC、手游与独立游戏讨论，分享游戏体验，抵制外挂与代练。',
    icon: '🎮',
    category: '游戏',
    memberCount: 167520,
    postCount: 12450,
    coverImage: 'https://picsum.photos/seed/game-cover/600/300',
    createdAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'c-sports',
    name: '体育竞技',
    description: '足球、篮球、电竞与传统体育赛事讨论，理性观赛，尊重裁判与运动员。',
    icon: '⚽',
    category: '体育',
    memberCount: 134260,
    postCount: 8960,
    coverImage: 'https://picsum.photos/seed/sports-cover/600/300',
    createdAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'c-travel',
    name: '旅行日记',
    description: '国内外旅行攻略、小众目的地与旅途故事，分享真实可复用的出行经验。',
    icon: '✈️',
    category: '旅行',
    memberCount: 87450,
    postCount: 5630,
    coverImage: 'https://picsum.photos/seed/travel-cover/600/300',
    createdAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'c-food',
    name: '美食探店',
    description: '探店实录、家常菜谱与食材科普，用味蕾丈量城市，用厨房治愈生活。',
    icon: '🍜',
    category: '美食',
    memberCount: 103780,
    postCount: 7240,
    coverImage: 'https://picsum.photos/seed/food-cover/600/300',
    createdAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
  },
]

// ── 社区种子帖子（10 社区 × 7 帖 = 70 帖，normal 60% / hot 25% / charity 15%） ──

function hoursAgo(h: number): string {
  return new Date(Date.now() - h * 60 * 60 * 1000).toISOString()
}

export const communitySeedPosts: CommunitySeedPost[] = [
  // ── 科技前沿 c-tech（7 帖：4 normal / 2 hot / 1 charity）──
  {
    id: 'sp-tech-1', communityId: 'c-tech', type: 'hot',
    title: '某国产大模型评测疑似刷榜，测试集被指混入训练数据',
    content: '今天业内一份技术报告显示，某国产大模型在 MMLU、GSM8K 等公开榜单上的成绩存在异常波动。研究者复现时发现，该模型对测试集中部分题目的回答与训练数据高度雷同，疑似发生了数据污染。\n\n具体证据：\n1. 在 5 道高难度数学题上，模型输出的解题步骤与某开源数据集完全一致，连标点符号都相同\n2. 对测试集做轻微改写（同义替换、数字微调）后，准确率从 92% 暴跌至 61%\n3. 该模型在自建封闭测试集上的表现明显低于公开榜单\n\n榜单方已暂时下架其成绩并启动调查。这事对国产大模型的声誉影响很大，希望更多团队愿意公开训练数据来源。',
    image: 'https://picsum.photos/seed/sp-tech-1/600/400',
    authorName: '硅谷晨光', authorAvatar: 'https://picsum.photos/seed/au2/80/80',
    likes: 3420, comments: 286, views: 28400, tags: ['AI', '大模型', '评测'],
    createdAt: hoursAgo(2),
  },
  {
    id: 'sp-tech-2', communityId: 'c-tech', type: 'normal',
    title: '自研芯片能效比超越骁龙 8 Gen 4？实测数据说话',
    content: '官方发布会宣称能效比领先 30%，但我拿到的工程机实测下来，GeekBench 多核跑分确实接近，但 GPU 满载功耗比官方数据高了 18%。\n\n测试环境：25℃ 恒温实验室，亮度 400nit，全程飞行模式。\n\n结论：CPU 单核表现亮眼，GPU 能效仍有差距，宣传的"全面超越"略夸张。不过作为第一代产品，这个水平已经相当能打了，期待下一代补齐 GPU 短板。',
    image: 'https://picsum.photos/seed/sp-tech-2/600/400',
    authorName: '芯片小笼包', authorAvatar: 'https://picsum.photos/seed/au4/80/80',
    likes: 1890, comments: 145, views: 15600, tags: ['芯片', '实测'],
    createdAt: hoursAgo(5),
  },
  {
    id: 'sp-tech-3', communityId: 'c-tech', type: 'normal',
    title: '某品牌新款旗舰电池鼓包，官方称个例但社区反馈已达三位数',
    content: '截至发帖，社区收集到的电池鼓包案例已有 127 例，涵盖三个批次。鼓包位置集中在电池中下部，部分用户反映后盖被顶起 1-2mm。\n\n官方客服统一回复"个别案例，建议送修"，但根据序列号分布，问题批次集中在 8-9 月生产。建议购买这两个批次的朋友留意电池健康度变化。\n\n目前已有人发起集体维权，律师表示如果属于设计缺陷，厂商应主动召回而非逐个处理。',
    image: 'https://picsum.photos/seed/sp-tech-3/600/400',
    authorName: '数码评测猿', authorAvatar: 'https://picsum.photos/seed/au1/80/80',
    likes: 2340, comments: 198, views: 19200, tags: ['手机', '品控'],
    createdAt: hoursAgo(9),
  },
  {
    id: 'sp-tech-4', communityId: 'c-tech', type: 'hot',
    title: 'AI 换脸视频已能骗过银行人脸识别，实测全过程曝光',
    content: '用开源的换脸模型 + 语音克隆，我成功在三家银行 App 上通过了人脸核身（已联系银行安全团队修复，本文不公开具体方法）。\n\n关键发现：\n1. 纯视频回放攻击已被主流方案拦截\n2. 但基于实时驱动的 3D 换脸仍能绕过活体检测\n3. 普通用户很难察觉合成视频的破绽\n\n这不是危言耸听，生物识别作为唯一认证因素的时代快结束了。建议各家银行尽快上线多因素认证，用户也要避免在公开平台大量发布正脸视频。',
    image: 'https://picsum.photos/seed/sp-tech-4/600/400',
    authorName: '极客村长', authorAvatar: 'https://picsum.photos/seed/au3/80/80',
    likes: 5670, comments: 412, views: 45600, tags: ['AI', '安全', '人脸识别'],
    createdAt: hoursAgo(14),
  },
  {
    id: 'sp-tech-5', communityId: 'c-tech', type: 'normal',
    title: '某 App 后台静默读取通讯录并加密上传，安全团队逆向还原',
    content: '安全团队在审计一款下载量过亿的社交 App 时发现，其在用户未授权的情况下，会在夜间静默读取通讯录并加密上传。\n\n关键代码隐藏在一段混淆的 native 库中，使用 RC4 加密，密钥硬编码在 .so 文件里。逆向后解密出的数据包包含姓名、手机号、备注信息。\n\n该行为明显违反《个人信息保护法》第十三条。目前证据已提交网信办，建议用户检查该 App 的通讯录权限是否被强制开启。',
    image: 'https://picsum.photos/seed/sp-tech-5/600/400',
    authorName: '代码搬运工', authorAvatar: 'https://picsum.photos/seed/au5/80/80',
    likes: 3120, comments: 234, views: 26800, tags: ['隐私', '安全'],
    createdAt: hoursAgo(20),
  },
  {
    id: 'sp-tech-6', communityId: 'c-tech', type: 'normal',
    title: '国产电动车冬季续航实测：宣传 700km，实测仅 420km',
    content: '组织了 12 位车主进行冬季实测，环境温度 -5℃ 到 5℃，开暖风 22℃，满电出发。\n\n实测结果：\n- 官方 CLTC 700km 的车型，实测平均 420km\n- 掉电最快的阶段是高速 120km/h 巡航，能耗比标称高 45%\n- 城市工况表现尚可，续航达成率约 72%\n\n车企回应称"测试条件不同导致差异"。但消费者买的是实际体验不是实验室数据，希望行业能推出更贴近真实工况的续航标准。',
    image: 'https://picsum.photos/seed/sp-tech-6/600/400',
    authorName: '数码评测猿', authorAvatar: 'https://picsum.photos/seed/au1/80/80',
    likes: 4280, comments: 367, views: 38500, tags: ['电动车', '续航'],
    createdAt: hoursAgo(28),
  },
  {
    id: 'sp-tech-7', communityId: 'c-tech', type: 'charity',
    title: '为山区学校搭建简易计算机教室，急需旧笔记本和显示器',
    content: '我们正在为云南怒江的一所村小搭建计算机教室，目前有 43 名学生但没有任何计算设备。\n\n急需物资：\n- 能正常开机的旧笔记本（i3 以上即可）\n- 19 寸以上显示器（HDMI 接口）\n- 鼠标键盘套装\n- 稳定的路由器\n\n我们承诺：所有设备登记造册，定期公示使用情况。物流和安装由志愿者团队负责，预计 3 月初完成部署。\n\n如果您有闲置设备，请私信联系。哪怕是一台旧电脑，也能让一个孩子第一次接触编程。',
    image: 'https://picsum.photos/seed/sp-tech-7/600/400',
    authorName: '暖心志愿者', authorAvatar: 'https://picsum.photos/seed/au27/80/80',
    likes: 8920, comments: 523, views: 64200, tags: ['公益', '教育'],
    createdAt: hoursAgo(36),
  },

  // ── 娱乐八卦 c-entertainment（7 帖）──
  {
    id: 'sp-ent-1', communityId: 'c-entertainment', type: 'hot',
    title: '某选秀冠军学历造假实锤，海外名校回应查无此人',
    content: '该选秀冠军此前在多次采访中自称毕业于某海外名校计算机专业。校方校友办今日正式回函确认：经核查，该姓名在 2015-2019 年间的毕业生名单中不存在，亦无任何选修记录。\n\n此前有网友扒出其所谓的学生证存在 PS 痕迹：\n1. 学位证书字体与校方官方模板不符\n2. 毕业时间与本人社交媒体记录矛盾（声称在校期间发的帖子定位在境内）\n3. 推荐人邮箱后缀为非官方域名\n\n工作室暂未回应。品牌方已开始评估合作风险，两个代言疑似即将宣布解约。',
    image: 'https://picsum.photos/seed/sp-ent-1/600/400',
    authorName: '深度调查员', authorAvatar: 'https://picsum.photos/seed/au7/80/80',
    likes: 12400, comments: 892, views: 98600, tags: ['娱乐圈', '学历'],
    createdAt: hoursAgo(1),
  },
  {
    id: 'sp-ent-2', communityId: 'c-entertainment', type: 'normal',
    title: '综艺冠军被曝提前内定，前工作人员晒出录制前排位表',
    content: '一位自称是该综艺前后期的工作人员放出了一份录制前的选手排位表，时间戳早于决赛录制两周。排位表上的最终三强与实际结果完全一致，连亚军、季军的顺序都对得上。\n\n关键疑点：\n1. 排位表使用的是节目组内部模板，带有水印\n2. 有一期明显表现更好的选手在排位表中排名靠后\n3. 该工作人员晒出了工牌和工作照作为佐证\n\n节目组回应称"系内部演练数据，非最终结果"。但业内多个制作人私下表示这种操作在行业里并不罕见，观众所谓的"投票"很多时候只是参考。',
    image: 'https://picsum.photos/seed/sp-ent-2/600/400',
    authorName: '理性吃瓜人', authorAvatar: 'https://picsum.photos/seed/au6/80/80',
    likes: 8760, comments: 645, views: 72300, tags: ['综艺', '内幕'],
    createdAt: hoursAgo(4),
  },
  {
    id: 'sp-ent-3', communityId: 'c-entertainment', type: 'normal',
    title: '热播剧男主深夜被换，原定演员凌晨发意味深长微博后秒删',
    content: '一部正在拍摄的古装剧突然官宣换男主，原定演员凌晨发了一条"有些事不是不报，时候未到"的微博后被迅速删除。粉丝截图存证后扒出更多细节：\n\n1. 该演员已完成 40% 的戏份，换人意味着重拍\n2. 新男主是某资本力捧的新人，此前作品评分均低于 5 分\n3. 原定演员在换人前一周取关了导演和制片人\n\n业内传言是投资方介入强行换人，但片方否认。这种操作对作品质量的影响显而易见，也暴露了资本对内容创作的过度干预。',
    image: 'https://picsum.photos/seed/sp-ent-3/600/400',
    authorName: '理性吃瓜人', authorAvatar: 'https://picsum.photos/seed/au6/80/80',
    likes: 6540, comments: 478, views: 54100, tags: ['影视', '资本'],
    createdAt: hoursAgo(8),
  },
  {
    id: 'sp-ent-4', communityId: 'c-entertainment', type: 'hot',
    title: '演唱会门票开票即秒空，黄牛溢价五倍声称有技术手段绕过实名',
    content: '某歌手巡演开票 3 秒即显示售罄，二手平台立刻出现大量溢价票，最高翻了五倍。主办方宣称采用强实名制，但多位黄牛向暗访记者表示"有技术手段绕过验证"。\n\n技术分析：\n1. 所谓绕过其实是利用抢票软件批量注册账号\n2. 部分门票通过"代拍"形式流出，黄牛收取 30% 服务费\n3. 强实名制下门票不可转赠，但"代拍"钻了"本人购票"的空子\n\n建议主办方增加人脸核验 + 限购 + 候补机制。也呼吁大家不要购买黄牛票，没有市场就没有伤害。',
    image: 'https://picsum.photos/seed/sp-ent-4/600/400',
    authorName: '深度调查员', authorAvatar: 'https://picsum.photos/seed/au7/80/80',
    likes: 9870, comments: 712, views: 81400, tags: ['演出', '黄牛'],
    createdAt: hoursAgo(13),
  },
  {
    id: 'sp-ent-5', communityId: 'c-entertainment', type: 'normal',
    title: '某童星被曝已出国留学半年，最后一部戏疑似大量用替身',
    content: '网友在海外偶遇某童星，称其已出国读书大半年。但其主演的剧集去年底才杀青，时间线对不上。\n\n扒出的细节：\n1. 最后三个月的通告该童星仅出席了 2 次\n2. 多场背影戏和远景戏身形与本人明显不同\n3. 杀青合照中该童星缺席\n\n如果属实，剧组涉嫌虚假宣传。未成年人演艺本就有严格工时限制，用替身补拍虽然不违规但应明示。观众有权知道自己看的是什么。',
    image: 'https://picsum.photos/seed/sp-ent-5/600/400',
    authorName: '理性吃瓜人', authorAvatar: 'https://picsum.photos/seed/au6/80/80',
    likes: 4320, comments: 298, views: 36700, tags: ['童星', '替身'],
    createdAt: hoursAgo(19),
  },
  {
    id: 'sp-ent-6', communityId: 'c-entertainment', type: 'normal',
    title: '某编剧被指抄袭，原作者晒出三年前创作时间线对比图',
    content: '一部热播剧的原著作者发文，称剧中多个关键桥段与自己三年前发表的网文高度雷同。贴出的对比图显示：\n\n1. 第 12 集的核心反转与原作第 47 章几乎逐句对应\n2. 人物关系的设定与原作高度相似\n3. 部分台词连标点符号都一样\n\n该编剧回应称"借鉴属于正常创作行为"。但法律上，实质性相似即构成侵权。原作者已委托律师取证，案件正在准备中。',
    image: 'https://picsum.photos/seed/sp-ent-6/600/400',
    authorName: '深度调查员', authorAvatar: 'https://picsum.photos/seed/au7/80/80',
    likes: 5670, comments: 389, views: 45200, tags: ['抄袭', '维权'],
    createdAt: hoursAgo(26),
  },
  {
    id: 'sp-ent-7', communityId: 'c-entertainment', type: 'charity',
    title: '为留守儿童筹建"星空影院"，每月一次露天电影陪伴',
    content: '我们在贵州黔东南的三个村子里运营"星空影院"项目，每月为留守儿童放映一场露天电影，至今已坚持 14 个月。\n\n孩子们最爱的片子是《哪吒之魔童降世》，放了三次场场爆满。有个孩子说："爸爸妈妈在广东打工，一年回来一次，但每个月的电影夜让我觉得有人陪着。"\n\n目前急需：\n- 投影仪（亮度 3000 流明以上）\n- 户外音响\n- 经典儿童电影片源授权\n\n您的每一份支持，都在为山里的孩子点亮一片星空。',
    image: 'https://picsum.photos/seed/sp-ent-7/600/400',
    authorName: '公益摆渡人', authorAvatar: 'https://picsum.photos/seed/au28/80/80',
    likes: 7230, comments: 412, views: 53800, tags: ['公益', '儿童'],
    createdAt: hoursAgo(34),
  },

  // ── 社会百态 c-society（7 帖）──
  {
    id: 'sp-soc-1', communityId: 'c-society', type: 'hot',
    title: '某小区物业被曝挪用维修基金上百万，业委会查账遭拒',
    content: '某小区业委会在例行查账时发现，维修基金账户过去三年出现 17 笔不明支出，总金额达 134 万元，收款方为三家关联空壳公司。\n\n物业负责人拒绝公开明细，称"属于商业机密"。业委会已向住建部门投诉，并启动审计程序。\n\n律师解读：根据《住宅专项维修资金管理办法》，物业无权单方面动用维修基金，必须经业主大会表决。已建议业委会报警处理。\n\n希望借此提醒所有业主：维修基金是大家的"房屋养老金"，定期查账是基本权利。',
    image: 'https://picsum.photos/seed/sp-soc-1/600/400',
    authorName: '深度调查员', authorAvatar: 'https://picsum.photos/seed/au7/80/80',
    likes: 6780, comments: 534, views: 58200, tags: ['民生', '物业'],
    createdAt: hoursAgo(3),
  },
  {
    id: 'sp-soc-2', communityId: 'c-society', type: 'normal',
    title: '外卖骑手晒流水：雨夜跑了 38 单到手 96 元，平台抽成引热议',
    content: '一位骑手晒出昨晚的流水：8 小时跑了 38 单，顾客支付总额 1240 元，骑手到手 96 元（含 12 元雨夜补贴）。\n\n明细拆解：\n- 平台基础抽成约 65%\n- 保险、装备费扣 18 元\n- 超时罚款 23 元（3 单因商家出餐慢超时）\n- 实际时薪约 12 元\n\n平台回应称"单价受多重因素影响，整体收入有保障"。但多位骑手反映，高峰期单价反而被压低，因为系统会派给距离更远的单。这种算法本质上是在压榨骑手的时间成本。',
    image: 'https://picsum.photos/seed/sp-soc-2/600/400',
    authorName: '理性吃瓜人', authorAvatar: 'https://picsum.photos/seed/au6/80/80',
    likes: 8920, comments: 678, views: 73400, tags: ['外卖', '算法'],
    createdAt: hoursAgo(7),
  },
  {
    id: 'sp-soc-3', communityId: 'c-society', type: 'normal',
    title: '某地暴雨致主干道积水没过车顶，市政排水系统遭质疑',
    content: '一场 3 小时降水量 85mm 的暴雨后，某主干道积水最深处达 1.6 米，多辆车泡水熄火，有车主被困车顶等待救援。\n\n现场问题：\n1. 路面排水口被树叶和垃圾堵塞，无人清理\n2. 排水泵站未及时启动，原因是"值班人员未到岗"\n3. 积水 2 小时后才开始消退\n\n水务部门回应称"降雨量超设计标准"。但资料显示该路段排水系统设计标准为"5 年一遇"，对应 1 小时 76mm，本次并未超标。\n\n城市内涝不能只怪天气，基础设施的维护管理同样关键。',
    image: 'https://picsum.photos/seed/sp-soc-3/600/400',
    authorName: '城市漫步者', authorAvatar: 'https://picsum.photos/seed/au24/80/80',
    likes: 5430, comments: 412, views: 46800, tags: ['市政', '内涝'],
    createdAt: hoursAgo(12),
  },
  {
    id: 'sp-soc-4', communityId: 'c-society', type: 'hot',
    title: '网传某公司强制员工签自愿放弃加班费协议，日均工作 12 小时',
    content: '多名前员工爆料某公司要求新员工入职时签署《自愿加班确认书》，内容包含"本人自愿放弃加班费，理解公司业务需要"等条款。\n\n实际情况：\n1. 工作时间 9:00-21:00，大小周\n2. 请假需提前 3 天审批，病假需三甲医院证明\n3. 离职时竞业协议覆盖全行业，补偿仅为最低工资\n\n劳动监察部门已介入。律师明确表示：即便员工签字，违反劳动法的协议条款也属无效。这种操作本质上是利用信息不对称和就业压力压榨劳动者。\n\n希望更多受害者站出来，证据确凿才能推动改变。',
    image: 'https://picsum.photos/seed/sp-soc-4/600/400',
    authorName: '深度调查员', authorAvatar: 'https://picsum.photos/seed/au7/80/80',
    likes: 11200, comments: 856, views: 92700, tags: ['职场', '劳动法'],
    createdAt: hoursAgo(16),
  },
  {
    id: 'sp-soc-5', communityId: 'c-society', type: 'normal',
    title: '连环碰瓷团伙落网，行车记录仪视频还原作案手法',
    content: '警方通报打掉一个跨省碰瓷团伙，该团伙在 6 个城市作案 23 起，涉案金额超 40 万元。\n\n作案手法（来自公布的行车记录仪视频）：\n1. 选定目标：通常是没有行车记录仪的老款车\n2. 制造接触：在路口减速时突然靠近，用工具自伤后倒地\n3. 施压私了：以报警相威胁，要求现场转账\n\n破案关键是一位车主的隐藏式记录仪拍到了全过程。建议所有车主安装前后双录记录仪，遇到可疑事故坚持报警处理。',
    image: 'https://picsum.photos/seed/sp-soc-5/600/400',
    authorName: '城市漫步者', authorAvatar: 'https://picsum.photos/seed/au24/80/80',
    likes: 4120, comments: 287, views: 34600, tags: ['法治', '安全'],
    createdAt: hoursAgo(22),
  },
  {
    id: 'sp-soc-6', communityId: 'c-society', type: 'normal',
    title: '外卖小哥被小区保安殴打，物业公司称"个人冲突"引发质疑',
    content: '一段外卖骑手被保安殴打的视频热传。视频显示骑手在小区门口登记时与保安发生口角，随后被三名保安推搡倒地并踢打。\n\n后续进展：\n1. 骑手被诊断为软组织挫伤，已做法医鉴定\n2. 涉事三名保安被行政拘留 10 日\n3. 物业公司回应称"个人冲突，与公司无关"\n\n但业主反映该小区保安多次对外卖员态度恶劣，曾发生过掀翻外卖箱事件。物业公司把系统性问题归咎于"个人冲突"显然是推卸责任。\n\n外卖平台已介入协助骑手维权，律师建议追究物业公司的管理责任。',
    image: 'https://picsum.photos/seed/sp-soc-6/600/400',
    authorName: '理性吃瓜人', authorAvatar: 'https://picsum.photos/seed/au6/80/80',
    likes: 7890, comments: 623, views: 65100, tags: ['民生', '维权'],
    createdAt: hoursAgo(30),
  },
  {
    id: 'sp-soc-7', communityId: 'c-society', type: 'charity',
    title: '走失老人救助网络：为阿尔茨海默症患者发放定位手环',
    content: '我们运营的"回家之路"项目，已为全国 17 个城市的 2300 位阿尔茨海默症患者免费发放了 GPS 定位手环。\n\n项目数据：\n- 累计协助找回走失老人 187 人次\n- 平均找回时间从 8 小时缩短至 45 分钟\n- 手环电池续航 7 天，防水等级 IP67\n\n一位家属的反馈让我们坚持至今："父亲走失那晚下了大雨，是手环定位帮我们在河边找到了他。"\n\n目前项目急需扩容，每位老人手环成本 280 元。您的 280 元，可能就是一个家庭的安全感。',
    image: 'https://picsum.photos/seed/sp-soc-7/600/400',
    authorName: '公益摆渡人', authorAvatar: 'https://picsum.photos/seed/au28/80/80',
    likes: 9870, comments: 567, views: 78400, tags: ['公益', '养老'],
    createdAt: hoursAgo(40),
  },

  // ── 财经观察 c-finance（7 帖）──
  {
    id: 'sp-fin-1', communityId: 'c-finance', type: 'hot',
    title: '某上市公司财务造假被实锤，审计机构突然辞职引爆雷',
    content: '某上市公司今日公告称，合作 12 年的审计机构已辞职。辞职函中明确表示"在审计过程中发现财务数据存在重大不一致，无法获取充分适当的审计证据"。\n\n关键信息：\n1. 该公司过去三年营收增长 180%，但应收账款周转天数从 45 天升至 187 天\n2. 前五大客户中有三家为注册不到一年的新公司\n3. 经营性现金流持续为负，但净利润为正\n\n证监会已立案调查。持有该股的投资者建议关注后续集体诉讼。这也再次提醒大家：审计机构突然变更往往是基本面恶化的先行信号。',
    image: 'https://picsum.photos/seed/sp-fin-1/600/400',
    authorName: '财经观察家', authorAvatar: 'https://picsum.photos/seed/au8/80/80',
    likes: 7890, comments: 534, views: 67200, tags: ['股市', '财务造假'],
    createdAt: hoursAgo(2),
  },
  {
    id: 'sp-fin-2', communityId: 'c-finance', type: 'normal',
    title: '黄金突破历史新高后回调 8%，现在还能上车吗？',
    content: '国际金价在创出历史新高后回调 8%，很多朋友问现在能否入场。我梳理了几组关键数据供参考：\n\n1. 本轮上涨主要推手是央行购金（去年全球央行净购金 1037 吨）\n2. 实际利率仍处于负区间，对黄金形成支撑\n3. 但投机性多头持仓处于历史 85 分位，短期有获利了结压力\n\n个人观点：长期配置逻辑成立，但不建议追高。定投或等待回调至 200 日均线附近分批建仓是更稳妥的策略。\n\n以上仅为个人分析，不构成投资建议。投资有风险，决策需谨慎。',
    image: 'https://picsum.photos/seed/sp-fin-2/600/400',
    authorName: '价值投资派', authorAvatar: 'https://picsum.photos/seed/au10/80/80',
    likes: 3450, comments: 298, views: 28900, tags: ['黄金', '投资'],
    createdAt: hoursAgo(6),
  },
  {
    id: 'sp-fin-3', communityId: 'c-finance', type: 'normal',
    title: '某新势力车企库存积压严重，账上现金仅够支撑两个季度',
    content: '根据内部人士透露和公开数据交叉验证，某新势力车企目前面临严重现金流压力：\n\n1. 全国 12 个仓库爆满，库存周转天数从 28 天升至 67 天\n2. 经销商提货意愿低迷，已取消三个区域的代理\n3. 三季度现金及等价物余额 28 亿，按月均消耗 14 亿计算，仅够支撑两个月\n4. 正在寻求 30 亿过桥贷款，但谈判进展不顺\n\n车企回应称"经营正常，资金充裕"。但供应商反映账期已从 60 天延长至 120 天，这是典型的资金链紧张信号。新能源洗牌期真的来了。',
    image: 'https://picsum.photos/seed/sp-fin-3/600/400',
    authorName: '牛熊之间', authorAvatar: 'https://picsum.photos/seed/au9/80/80',
    likes: 5670, comments: 423, views: 48600, tags: ['新能源', '资金链'],
    createdAt: hoursAgo(11),
  },
  {
    id: 'sp-fin-4', communityId: 'c-finance', type: 'hot',
    title: '某电商平台被曝售假，品牌方抽检八成为假货已发律师函',
    content: '某国际品牌方对该平台在售商品进行抽检，结果触目惊心：随机购买的 50 件商品中，42 件为假货，售假比例高达 84%。\n\n假货特征：\n1. 外包装印刷精度不足，色彩偏差明显\n2. 防伪标签为伪造，扫码后跳转至仿冒网站\n3. 产品批次号在品牌方系统中查无记录\n\n品牌方已发送律师函要求下架并索赔。平台回应称"将配合调查"，但拒绝承认监管失职。\n\n消费者维权建议：保留购买凭证和鉴定报告，可主张退一赔三。平台如明知售假而不作为，应承担连带责任。',
    image: 'https://picsum.photos/seed/sp-fin-4/600/400',
    authorName: '财经观察家', authorAvatar: 'https://picsum.photos/seed/au8/80/80',
    likes: 8920, comments: 645, views: 73800, tags: ['电商', '打假'],
    createdAt: hoursAgo(15),
  },
  {
    id: 'sp-fin-5', communityId: 'c-finance', type: 'normal',
    title: '楼市新政后一线城市成交回暖，但价格仍在磨底',
    content: '新政出台两周，一线城市新房和二手房成交数据出现分化：\n\n成交量：\n- 新房周成交环比 +32%\n- 二手房带看量环比 +45%，但成交仅 +18%\n\n价格：\n- 二手房挂牌价仍环比 -0.8%\n- 议价空间从 5% 扩大到 8%\n- 学区房降价幅度最大，部分小区同比 -15%\n\n这说明：政策释放了观望需求，但买方仍占据议价主动权。现在是"量增价稳"阶段，真正企稳还需观察就业和收入预期是否改善。\n\n刚需可以看起来，投资建议再等等。',
    image: 'https://picsum.photos/seed/sp-fin-5/600/400',
    authorName: '牛熊之间', authorAvatar: 'https://picsum.photos/seed/au9/80/80',
    likes: 4320, comments: 356, views: 37400, tags: ['楼市', '房地产'],
    createdAt: hoursAgo(21),
  },
  {
    id: 'sp-fin-6', communityId: 'c-finance', type: 'normal',
    title: '可转债打新还能玩吗？今年中签率已降至 0.02%',
    content: '统计了今年可转债打新的数据：\n\n- 平均中签率 0.02%（去年 0.08%）\n- 上市首日平均涨幅 18%（去年 24%）\n- 破发率 12%（去年 4%）\n\n收益测算：\n- 单签 10 张 = 1000 元\n- 中签后首日卖出平均赚 180 元\n- 但中签需申购 5000 次才能中 1 次\n\n结论：作为零成本博弈仍可参与，但不应作为主要策略。建议开通后自动打新，中了是惊喜，不中不亏。真正赚钱还是要靠基本面研究。\n\n免责声明：数据基于历史统计，不预示未来表现。',
    image: 'https://picsum.photos/seed/sp-fin-6/600/400',
    authorName: '价值投资派', authorAvatar: 'https://picsum.photos/seed/au10/80/80',
    likes: 2340, comments: 189, views: 19800, tags: ['可转债', '打新'],
    createdAt: hoursAgo(29),
  },
  {
    id: 'sp-fin-7', communityId: 'c-finance', type: 'charity',
    title: '为乡村小商户提供免息贷款，助力 100 个家庭创业',
    content: '我们的"微光计划"为偏远地区的乡村小商户提供 5000-20000 元免息贷款，已有 87 个家庭受益。\n\n项目模式：\n- 资金来源：爱心人士低息存款 + 企业配捐\n- 风控：当地合作社担保 + 分期还款（6-12 个月）\n- 还款率：98.6%（仅 1 户因家庭变故延期）\n\n典型案例：云南的王姐用 8000 元贷款扩大了她的手工米线作坊，现在月收入从 1200 元涨到 4500 元，还雇了两位村民帮忙。\n\n您的 100 元存款（可随时取出），就能让一个家庭看到改变的可能。',
    image: 'https://picsum.photos/seed/sp-fin-7/600/400',
    authorName: '公益摆渡人', authorAvatar: 'https://picsum.photos/seed/au28/80/80',
    likes: 6780, comments: 345, views: 51200, tags: ['公益', '普惠金融'],
    createdAt: hoursAgo(38),
  },

  // ── 教育园地 c-education（7 帖）──
  {
    id: 'sp-edu-1', communityId: 'c-education', type: 'hot',
    title: '某高校保研名单疑被提前内定，辅导员私聊截图流出',
    content: '一张聊天截图显示，某高校辅导员在保研结果公布前两周，私下告知学生 A "你今年没问题，好好准备复试就行"。而最终公示名单中，学生 A 确实在列。\n\n关键疑点：\n1. 该学生综合排名仅第 18 位，按规则无法获得保研资格\n2. 排名前 5 的学生中有 2 位未获保研，被"自愿放弃"\n3. 截图中的辅导员是保研工作组成员\n\n校方回应称"截图系伪造，已启动核查"。但多位学生反映曾收到类似"暗示"，因惧怕影响毕业不敢发声。\n\n保研本应是公平选拔，却成了部分人的"操作空间"。希望教育部门建立更透明的公示和申诉机制。',
    image: 'https://picsum.photos/seed/sp-edu-1/600/400',
    authorName: '教培观察', authorAvatar: 'https://picsum.photos/seed/au11/80/80',
    likes: 8920, comments: 678, views: 74500, tags: ['高校', '保研'],
    createdAt: hoursAgo(4),
  },
  {
    id: 'sp-edu-2', communityId: 'c-education', type: 'normal',
    title: '大学生兼职刷单被骗 2.3 万，警方提醒刷单本身就是违法',
    content: '某高校大三学生在社交平台看到"足不出户日赚 300"的兼职广告，扫码加入后按"导师"指引完成前三单任务，分别获得 15、28、45 元返利。\n\n第四单开始要求垫付 500 元，承诺返 650 元。学生转账后对方以"任务未完成"为由要求继续垫付，累计被骗 2.3 万元后才意识到上当。\n\n警方提醒：\n1. 刷单本身违反《反不正当竞争法》\n2. 任何要求先垫资的兼职都是诈骗\n3. 前几单返利是诱饵，目的是让你放松警惕\n\n请转发给身边的同学，不要相信"轻松赚钱"的鬼话。',
    image: 'https://picsum.photos/seed/sp-edu-2/600/400',
    authorName: '校园日记本', authorAvatar: 'https://picsum.photos/seed/au14/80/80',
    likes: 5430, comments: 412, views: 46800, tags: ['校园', '反诈'],
    createdAt: hoursAgo(9),
  },
  {
    id: 'sp-edu-3', communityId: 'c-education', type: 'normal',
    title: '高考志愿填报：计算机专业还值得报吗？3 年后的就业推演',
    content: '今年计算机专业报考热度首次下滑，很多人问"还能不能报"。我从三个维度分析：\n\n供给端：\n- 今年计算机相关毕业生 120 万，3 年后预计 180 万\n- 培训机构年输出 50 万转码人员\n\n需求端：\n- 互联网大厂校招名额较峰值缩减 40%\n- 但 AI、芯片、工业软件方向需求增长 65%\n- 传统行业数字化释放出大量中端岗位\n\n结论：\n1. 普通"会写代码"的程序员会内卷，薪资回归理性\n2. 但懂业务的复合型人才（AI + 医疗/金融/制造）依然稀缺\n3. 顶尖院校计算机仍是优质选择，普通院校需更注重项目实战\n\n专业没有死，只是门槛在提高。',
    image: 'https://picsum.photos/seed/sp-edu-3/600/400',
    authorName: '高考志愿君', authorAvatar: 'https://picsum.photos/seed/au12/80/80',
    likes: 6780, comments: 523, views: 58400, tags: ['高考', '志愿'],
    createdAt: hoursAgo(14),
  },
  {
    id: 'sp-edu-4', communityId: 'c-education', type: 'hot',
    title: '留学中介乱象：申请文书抄袭，同一模板用 200 人被海外名校拉黑',
    content: '某留学中介被曝用同一份文书模板服务 200+ 学生，仅替换姓名和专业。结果被某海外名校招生办识别，该中介服务的所有学生申请被标记为"诚信存疑"。\n\n曝光的问题：\n1. 文书中出现与其他申请人高度雷同的"个人故事"\n2. 所谓"定制化"只是关键词替换\n3. 推荐信由中介代笔，推荐人并不知情\n\n该校已将该中介列入黑名单，并向其他院校通报。受影响的学生可能面临禁申 3 年的处罚。\n\n建议留学申请一定要自己参与文书写作，中介只能辅助不能代劳。你的故事只有你自己能写好。',
    image: 'https://picsum.photos/seed/sp-edu-4/600/400',
    authorName: '海归学长', authorAvatar: 'https://picsum.photos/seed/au13/80/80',
    likes: 7230, comments: 567, views: 61200, tags: ['留学', '中介'],
    createdAt: hoursAgo(18),
  },
  {
    id: 'sp-edu-5', communityId: 'c-education', type: 'normal',
    title: '中小学课后服务被指变相补课，家长投诉量同比上升 67%',
    content: '教育部最新数据显示，关于课后服务的家长投诉同比上升 67%，主要集中在：\n\n1. 课后服务变成变相补课（43%）\n2. 强制参加，不参加被穿小鞋（28%）\n3. 收费不透明，明细不公示（19%）\n4. 服务质量差，老师放视频应付（10%）\n\n某家长反映：孩子学校的"课后服务"就是做题，老师讲新内容，不参加的孩子第二天跟不上进度。这明显违背了政策初衷。\n\n课后服务应是素质拓展而非变相加码。建议家长遇到类似情况向教育局举报，政策需要落地监督才有意义。',
    image: 'https://picsum.photos/seed/sp-edu-5/600/400',
    authorName: '教培观察', authorAvatar: 'https://picsum.photos/seed/au11/80/80',
    likes: 4560, comments: 389, views: 39200, tags: ['K12', '教育'],
    createdAt: hoursAgo(24),
  },
  {
    id: 'sp-edu-6', communityId: 'c-education', type: 'normal',
    title: '考研报名人数首降 36 万，读研性价比真的下降了吗？',
    content: '今年考研报名人数 388 万，较去年减少 36 万，是 9 年来首次下降。原因分析：\n\n1. 研究生扩招导致学历贬值，硕士不再是"金字招牌"\n2. 专硕学费上涨（部分院校 2 年制 20 万+）\n3. 读研 3 年的机会成本：少赚 3 年工资 + 失去 3 年工作经验\n4. 企业越来越看重实战能力而非学历\n\n但仍有几类人适合读研：\n- 想转行跨专业的（用硕士重塑方向）\n- 目标是科研或高校教职的\n- 目标岗位明确要求硕士的（如部分国企、公务员岗）\n\n读研不是逃避就业的避风港，而是职业规划的一环。想清楚为什么读，比读不读更重要。',
    image: 'https://picsum.photos/seed/sp-edu-6/600/400',
    authorName: '高考志愿君', authorAvatar: 'https://picsum.photos/seed/au12/80/80',
    likes: 5230, comments: 445, views: 43800, tags: ['考研', '就业'],
    createdAt: hoursAgo(32),
  },
  {
    id: 'sp-edu-7', communityId: 'c-education', type: 'charity',
    title: '为乡村教师提供在线培训，已有 1200 位老师受益',
    content: '"星火教师计划"为偏远地区乡村教师提供免费的在线培训课程，涵盖教学方法、心理健康、信息技术三大模块。\n\n项目成果（运营 18 个月）：\n- 覆盖 23 个省份的 470 所乡村学校\n- 培训教师 1200 人，完课率 82%\n- 学生满意度提升 34%\n\n一位云南老师的留言让我们动容："以前上课就是照本宣科，培训后学会了用故事引入，孩子们眼睛里有光了。"\n\n目前急需各学科一线名师加入讲师团队，每学期只需贡献 4 小时。您的一节课，可能改变上千个孩子的课堂体验。',
    image: 'https://picsum.photos/seed/sp-edu-7/600/400',
    authorName: '暖心志愿者', authorAvatar: 'https://picsum.photos/seed/au27/80/80',
    likes: 7890, comments: 423, views: 62500, tags: ['公益', '教育'],
    createdAt: hoursAgo(42),
  },

  // ── 健康生活 c-health（7 帖）──
  {
    id: 'sp-hea-1', communityId: 'c-health', type: 'hot',
    title: '某网红保健品被曝成本仅 8 元，售价 398 元暴利 50 倍',
    content: '市监局抽查某热销代购保健品，发现其核心成分与几十元的国产货并无区别，却以十倍价格售卖。\n\n检测报告显示：\n1. 主打成分"某专利提取物"实际含量仅为标称的 12%\n2. 辅料为常见的麦芽糊精和淀粉\n3. 生产成本核算：原料 4.2 元 + 包装 3.8 元 = 8 元\n4. 售价 398 元，毛利率高达 98%\n\n该产品已下架，立案调查中。律师提醒：跨境代购保健品如存在虚假宣传，消费者可主张退一赔三。\n\n记住一个常识：保健品不是药品，不能治疗疾病。任何宣称"根治""特效"的保健品都是骗局。',
    image: 'https://picsum.photos/seed/sp-hea-1/600/400',
    authorName: '医学科普君', authorAvatar: 'https://picsum.photos/seed/au15/80/80',
    likes: 8920, comments: 634, views: 74800, tags: ['保健品', '打假'],
    createdAt: hoursAgo(3),
  },
  {
    id: 'sp-hea-2', communityId: 'c-health', type: 'normal',
    title: '每天一杯奶茶真的会得糖尿病吗？内分泌科医生详解',
    content: '门诊经常被问到这个问题，统一回答一下：奶茶本身不是糖尿病的直接原因，但长期高频摄入高糖饮品确实显著增加风险。\n\n关键数据：\n1. 一杯全糖奶茶含糖量约 50-65g，超过 WHO 建议日摄入量（25g）的两倍\n2. 长期高糖摄入导致胰岛素抵抗，是 2 型糖尿病的前奏\n3. 但糖尿病是多重因素疾病，还与遗传、运动、睡眠有关\n\n实用建议：\n- 改无糖或三分糖，糖分降至 10g 以下\n- 每周不超过 2 次\n- 喝完适当运动消耗血糖\n\n结论：偶尔喝一杯没问题，天天喝就是在透支健康。不是奶茶的锅，是频率和剂量的锅。',
    image: 'https://picsum.photos/seed/sp-hea-2/600/400',
    authorName: '营养师小林', authorAvatar: 'https://picsum.photos/seed/au17/80/80',
    likes: 5670, comments: 423, views: 48600, tags: ['营养', '糖尿病'],
    createdAt: hoursAgo(8),
  },
  {
    id: 'sp-hea-3', communityId: 'c-health', type: 'normal',
    title: '每天走一万步能减肥？运动科学最新研究颠覆认知',
    content: '"日行万步"理论源自 1965 年日本计步器的营销口号，但最新运动科学研究表明：\n\n1. 步数与减脂效果不成线性关系，关键在于运动强度\n2. 慢走一万步消耗约 300 大卡，不如快走 30 分钟（450 大卡）\n3. 对中老年人，每天 7000-8000 步的死亡风险最低，再多收益递减\n4. 力量训练对长期代谢提升更有效，建议每周 2-3 次\n\n更科学的日常运动方案：\n- 每周 150 分钟中等强度有氧（快走、游泳、骑行）\n- 每周 2 次力量训练（深蹲、俯卧撑、哑铃）\n- 减少久坐，每 45 分钟起身活动 3 分钟\n\n别再执着于步数排行榜了，质量永远比数量重要。',
    image: 'https://picsum.photos/seed/sp-hea-3/600/400',
    authorName: '跑步达人', authorAvatar: 'https://picsum.photos/seed/au16/80/80',
    likes: 4320, comments: 312, views: 37400, tags: ['运动', '减肥'],
    createdAt: hoursAgo(13),
  },
  {
    id: 'sp-hea-4', communityId: 'c-health', type: 'hot',
    title: '某疫苗企业生产记录造假被查，相关批次产品暂停使用',
    content: '内部举报人披露某疫苗企业在生产记录上做手脚，影响批次质量判定。药监局已派出检查组进驻企业。\n\n初步调查结果：\n1. 3 个批次产品的温度记录被人工篡改\n2. 关键工艺参数未按批记录要求执行\n3. 涉事批次共 86 万剂，已流向 12 个省份\n\n药监局已要求暂停使用相关批次，并启动召回程序。接种过相关批次的人群可咨询当地疾控中心进行抗体检测。\n\n这件事对疫苗行业信心打击很大。但我们要分清：问题在于个别企业的管理，而非疫苗技术本身。按时接种正规渠道的疫苗仍然是保护健康的最有效方式。',
    image: 'https://picsum.photos/seed/sp-hea-4/600/400',
    authorName: '医学科普君', authorAvatar: 'https://picsum.photos/seed/au15/80/80',
    likes: 9870, comments: 723, views: 82400, tags: ['疫苗', '监管'],
    createdAt: hoursAgo(17),
  },
  {
    id: 'sp-hea-5', communityId: 'c-health', type: 'normal',
    title: '熬夜补觉能补回来吗？睡眠科医生的回答让人绝望',
    content: '直接说结论：补觉补不回来。睡眠负债造成的认知损伤是累积性的。\n\n实验数据：\n1. 连续 5 天每天少睡 2 小时，认知能力相当于醉酒状态（血液酒精 0.08%）\n2. 周末补觉虽能恢复部分主观感受，但反应速度和记忆测试仍显著低于正常\n3. 长期睡眠不足与阿尔茨海默症、心血管疾病、抑郁高度相关\n\n机制：睡眠时大脑通过"类淋巴系统"清除代谢废物（如 β 淀粉样蛋白），这个过程无法在补觉时加速。\n\n实用建议：\n- 工作日保证 7 小时基础睡眠\n- 午睡不超过 25 分钟（避免深度睡眠）\n- 固定作息比睡多久更重要\n\n身体不是银行，睡眠不能存取。',
    image: 'https://picsum.photos/seed/sp-hea-5/600/400',
    authorName: '医学科普君', authorAvatar: 'https://picsum.photos/seed/au15/80/80',
    likes: 6780, comments: 489, views: 57200, tags: ['睡眠', '健康'],
    createdAt: hoursAgo(23),
  },
  {
    id: 'sp-hea-6', communityId: 'c-health', type: 'normal',
    title: '体检报告这些指标异常不必慌，但有几个必须重视',
    content: '每年体检后都有朋友拿着报告问"要不要紧"。整理一下常见指标的解读：\n\n不必过度紧张的：\n- 轻度脂肪肝：调整饮食和运动可逆转\n- 结节小于 5mm：定期复查即可\n- 尿酸偏高但无痛风：控制饮食，多喝水\n- 轻度血脂异常：先尝试生活方式干预\n\n必须重视的：\n- 血压持续高于 140/90：需就医评估\n- 空腹血糖高于 7.0：警惕糖尿病\n- 大便潜血阳性：需肠镜检查排除肿瘤\n- 甲状腺结节伴钙化：需穿刺明确性质\n\n体检的意义在于早发现早干预。拿到报告建议找全科医生解读，不要自己百度吓自己，也不要讳疾忌医。',
    image: 'https://picsum.photos/seed/sp-hea-6/600/400',
    authorName: '营养师小林', authorAvatar: 'https://picsum.photos/seed/au17/80/80',
    likes: 5430, comments: 378, views: 45600, tags: ['体检', '科普'],
    createdAt: hoursAgo(31),
  },
  {
    id: 'sp-hea-7', communityId: 'c-health', type: 'charity',
    title: '为罕见病儿童筹款：每一份善意都在点亮希望',
    content: '我们协助的"蝴蝶之家"收住了 28 位罕见病儿童，他们患有脊髓性肌萎缩症（SMA）、庞贝病等罕见病。\n\n项目现状：\n- 每位孩子年均护理费用约 12 万元\n- 部分孩子已接受特效药治疗，病情稳定\n- 最小的孩子 8 个月大，最大的 7 岁\n\n一位妈妈的话："医生说孩子可能活不过 3 岁，但在蝴蝶之家，我们已经一起过了 5 个生日。"\n\n目前急需：\n- 特效药自费部分的资助（医保报销后仍有 3-8 万/年缺口）\n- 呼吸机和康复设备\n- 专业护理志愿者\n\n罕见病虽然"罕见"，但每个生命都值得被看见。',
    image: 'https://picsum.photos/seed/sp-hea-7/600/400',
    authorName: '公益摆渡人', authorAvatar: 'https://picsum.photos/seed/au28/80/80',
    likes: 8760, comments: 456, views: 68400, tags: ['公益', '罕见病'],
    createdAt: hoursAgo(44),
  },

  // ── 游戏玩家 c-game（7 帖）──
  {
    id: 'sp-gam-1', communityId: 'c-game', type: 'hot',
    title: '某 3A 大作发售即崩，优化太差被玩家集体退款',
    content: '某备受期待的 3A 大作昨日发售，但 Steam 好评率仅 38%，差评集中在：\n\n1. 帧率暴跌：RTX 4080 在 1080p 下仅 35 帧，2K 跌至 22 帧\n2. 内存泄漏：玩 40 分钟后内存占用从 8G 飙升至 16G\n3. Bug 满天飞：穿模、卡关、存档损坏、NPC 失踪\n4. 优化敷衍：设置选项几乎没有，DLSS 支持延迟\n\n开发商道歉称"将紧急修复"，但玩家不买账：Beta 测试时这些问题就反馈过，发售版本原样保留。\n\n目前退款申请已超 4 万份，创下该平台单日退款纪录。提醒大家：预购有风险，等发售后再决定不亏。',
    image: 'https://picsum.photos/seed/sp-gam-1/600/400',
    authorName: '主机玩家老K', authorAvatar: 'https://picsum.photos/seed/au18/80/80',
    likes: 7890, comments: 623, views: 65400, tags: ['3A', '优化'],
    createdAt: hoursAgo(2),
  },
  {
    id: 'sp-gam-2', communityId: 'c-game', type: 'normal',
    title: '某手游抽卡概率被质疑，648 元 90 抽零 SSR 实测',
    content: '某手游新卡池上线后，社区出现大量"90 抽零 SSR"的反馈。官方公示概率为 1.2%，按概率 90 抽至少出 1 个的概率应为 66%。\n\n但社区收集的 5400 次抽卡样本显示：\n1. 实际 SSR 出货率为 0.83%，低于公示值\n2. 90 抽未出 SSR 的比例为 49%，远高于理论值 34%\n3. 存在"新号欧、老号非"的显著差异\n\n这已经超出正常概率波动范围。建议玩家保留抽卡记录，可向消费者协会投诉要求第三方审计。\n\n抽卡本质是赌博，未成年人不要碰，成年人也要量力而行。648 元够买两个 3A 大作了。',
    image: 'https://picsum.photos/seed/sp-gam-2/600/400',
    authorName: '电竞前线', authorAvatar: 'https://picsum.photos/seed/au20/80/80',
    likes: 5430, comments: 478, views: 47200, tags: ['手游', '抽卡'],
    createdAt: hoursAgo(6),
  },
  {
    id: 'sp-gam-3', communityId: 'c-game', type: 'normal',
    title: '独立游戏开发日志：从 0 到上架 Steam 我踩过的 10 个坑',
    content: '我的独立游戏《星海拾遗》终于在 Steam 上架了，回顾两年开发过程，分享一些经验教训：\n\n1. 别一上来就做开放世界，先把 15 分钟的核心循环做扎实\n2. 美术外包一定要谈清楚修改次数，不然预算会爆炸\n3. Steam 商店页越早上越好，愿望单决定曝光量\n4. 不要在发售后第一周打折，会伤透原价购买者的心\n5. Bug 修复优先级：崩溃 > 存档丢失 > 流程卡死 > 体验问题\n6. 别和玩家吵架，哪怕他们真的不懂\n7. 评测区的差评比好评更有价值\n8. 本地化至少要做英文，能多 30% 收入\n9. 别迷信"主播带货"，转化率远低于想象\n10. 留够 6 个月生活费再全职开发\n\n希望对想入行的朋友有帮助。',
    image: 'https://picsum.photos/seed/sp-gam-3/600/400',
    authorName: '独立游戏开发者', authorAvatar: 'https://picsum.photos/seed/au19/80/80',
    likes: 4560, comments: 389, views: 38600, tags: ['独立游戏', '开发'],
    createdAt: hoursAgo(10),
  },
  {
    id: 'sp-gam-4', communityId: 'c-game', type: 'hot',
    title: '电竞战队疑似打假赛，盘口异常波动被博彩公司暂停投注',
    content: '一场某联赛的比赛中，某战队在领先 2 局的情况下连丢 3 局被逆转。博彩公司发现盘口异常后已暂停该战队相关投注。\n\n疑点分析：\n1. 第三局关键团战中，辅助"误操作"交出了关键技能\n2. 第四局经济领先 5000 时主动放弃大龙\n3. 第五局选手表情轻松，与落后方应有的紧张感不符\n4. 赛前有大额资金押注该战队"被逆转"\n\n警方已介入调查，涉事战队暂未回应。如果属实，将是中国电竞史上最大的假赛丑闻。\n\n电竞博彩规范化是好事，但也让假赛有了利益驱动。希望联赛方能建立更严格的监管机制，别让少数人毁了整个行业。',
    image: 'https://picsum.photos/seed/sp-gam-4/600/400',
    authorName: '电竞前线', authorAvatar: 'https://picsum.photos/seed/au20/80/80',
    likes: 8920, comments: 645, views: 73800, tags: ['电竞', '假赛'],
    createdAt: hoursAgo(15),
  },
  {
    id: 'sp-gam-5', communityId: 'c-game', type: 'normal',
    title: 'Switch 2 首批游戏阵容曝光，第三方支持力度超预期',
    content: '任天堂今日公布了 Switch 2 的首批游戏阵容，第三方支持力度明显加强：\n\n第一方：\n- 《马力欧新作》（首发）\n- 《塞尔达传说：编年史》（首发后 3 个月）\n- 《密特罗德 Prime 4》增强版\n\n第三方：\n- 《最终幻想 17》同步登陆\n- 《怪物猎人：荒野》移植版\n- 《艾尔登法环 2》特别版\n- 6 款独立游戏首发\n\n硬件规格：\n- 定制 T239 芯片，性能约为 Switch 的 4 倍\n- 8 英寸 LCD 屏，支持 1080p/60\n- 向下兼容 Switch 游戏\n\n发售日和价格尚未公布。个人预测定价 399 美元，3 月发售。各位的钱包准备好了吗？',
    image: 'https://picsum.photos/seed/sp-gam-5/600/400',
    authorName: '主机玩家老K', authorAvatar: 'https://picsum.photos/seed/au18/80/80',
    likes: 6780, comments: 534, views: 56200, tags: ['主机', '任天堂'],
    createdAt: hoursAgo(20),
  },
  {
    id: 'sp-gam-6', communityId: 'c-game', type: 'normal',
    title: '游戏外挂产业链调查：一套外挂月入百万，玩家苦不堪言',
    content: '暗访了某外挂开发团队，他们运营的某 FPS 游戏外挂月卡售价 198 元，活跃用户 5000+，月营收超百万。\n\n外挂功能：\n1. 自瞄：可设置命中部位、反应延迟伪装\n2. 透视：显示敌人位置、血量、装备\n3. 反检测：每次更新都先过反作弊系统的检测\n\n产业链结构：\n- 开发者（3-5 人）→ 卡密销售（分销商）→ 终端玩家\n- 利润分配：开发者拿 60%，分销商 40%\n\n游戏厂商的反作弊更新总是滞后于外挂更新。但有律师表示，制作销售游戏外挂可能构成"破坏计算机信息系统罪"，最高可判 5 年。\n\n作为玩家，遇到外挂请举报而非加入。毁掉一个游戏只需要一个赛季的外挂泛滥。',
    image: 'https://picsum.photos/seed/sp-gam-6/600/400',
    authorName: '电竞前线', authorAvatar: 'https://picsum.photos/seed/au20/80/80',
    likes: 5230, comments: 412, views: 44800, tags: ['外挂', 'FPS'],
    createdAt: hoursAgo(27),
  },
  {
    id: 'sp-gam-7', communityId: 'c-game', type: 'charity',
    title: '为住院儿童捐赠游戏机和游戏卡带，让治疗不再枯燥',
    content: '"游戏治愈计划"在全国 23 家儿童医院设置了游戏角，为长期住院的孩子们提供游戏设备和精选游戏。\n\n项目数据：\n- 累计服务住院儿童 8700 人次\n- 平均每名儿童每日游戏时间 45 分钟（护士监督下）\n- 家长反馈：孩子的治疗配合度提升 28%\n\n一位白血病患儿的话："打针的时候我就在想马里奥，等会就要去救公主了，就不那么疼了。"\n\n急需捐赠：\n- Nintendo Switch 主机（新二手均可）\n- 适合儿童的游戏卡带（马力欧、星之卡比、动森）\n- 便携显示器\n\n游戏不只是娱乐，它也能成为治愈的力量。',
    image: 'https://picsum.photos/seed/sp-gam-7/600/400',
    authorName: '暖心志愿者', authorAvatar: 'https://picsum.photos/seed/au27/80/80',
    likes: 7230, comments: 389, views: 56400, tags: ['公益', '儿童'],
    createdAt: hoursAgo(35),
  },

  // ── 体育竞技 c-sports（7 帖）──
  {
    id: 'sp-spo-1', communityId: 'c-sports', type: 'hot',
    title: '某足球联赛疑似假球，守门员三个离谱失误引质疑',
    content: '一场保级战中，某队守门员出现三个低级失误导致球队 0:3 输球。赛后博彩数据显示，赛前 2 小时有大额资金押注该队输 3 球以上。\n\n三个失误回放：\n1. 第 23 分钟：无人逼抢下将球停入自家球门\n2. 第 56 分钟：扑救时"滑倒"，目送球入网\n3. 第 78 分钟：开大脚直接传给对方前锋\n\n该守门员此前 50 场比赛零失误，本场比赛的表现反常。警方已调取其通讯和银行记录。\n\n如果属实，这将是近十年最大的假球案。中国足球的公信力经不起再来一次打击了。希望能彻查到底，给球迷一个交代。',
    image: 'https://picsum.photos/seed/sp-spo-1/600/400',
    authorName: '绿茵观察员', authorAvatar: 'https://picsum.photos/seed/au21/80/80',
    likes: 8920, comments: 678, views: 74500, tags: ['足球', '假球'],
    createdAt: hoursAgo(3),
  },
  {
    id: 'sp-spo-2', communityId: 'c-sports', type: 'normal',
    title: 'NBA 交易截止日大动作：某球星被交易至争冠球队',
    content: '交易截止日前最后 2 小时，某全明星球员被交易至西部争冠球队，换回两个首轮签 + 一名即战力球员 + 配薪空间。\n\n交易分析：\n1. 争冠球队得到二当家，阵容深度进一步提升\n2. 送走球员的原球队进入重建，未来 3 年有 11 个首轮签\n3. 工资帽角度：双方均避税\n\n各方反应：\n- 球迷：原球队球迷愤怒（认为价值被低估），新球队球迷兴奋\n- 媒体：普遍认为争冠球队成为最大赢家\n- 球员本人：社交媒体发了一个眼睛 emoji\n\n这笔交易改变了联盟格局。本赛季的总冠军争夺将更加激烈。',
    image: 'https://picsum.photos/seed/sp-spo-2/600/400',
    authorName: '篮球战术板', authorAvatar: 'https://picsum.photos/seed/au22/80/80',
    likes: 5430, comments: 423, views: 46800, tags: ['NBA', '交易'],
    createdAt: hoursAgo(7),
  },
  {
    id: 'sp-spo-3', communityId: 'c-sports', type: 'normal',
    title: '马拉松赛道补给不足引发争议，最后 5 公里无水站',
    content: '某城市马拉松被跑友集体吐槽：30 公里后的"撞墙期"竟然连续 5 公里没有水站，导致多人中暑退赛。\n\n问题汇总：\n1. 补给站数量：标准要求每 2.5 公里一个，实际平均 3.8 公里一个\n2. 后半程水站补给不足，部分站点仅剩温水\n3. 医疗站人员配备不足，等待救援超 20 分钟\n4. 成绩证书上的完赛时间与芯片记录不符\n\n赛事方回应称"超出预期的人数导致补给紧张"。但报名人数 1.8 万人早在赛前一个月就已锁定，这个解释站不住脚。\n\n建议跑友选择赛事时参考往届评价，不要只看赛事规格。也希望田协能加强赛事监管。',
    image: 'https://picsum.photos/seed/sp-spo-3/600/400',
    authorName: '跑步达人', authorAvatar: 'https://picsum.photos/seed/au16/80/80',
    likes: 3450, comments: 287, views: 29400, tags: ['马拉松', '赛事'],
    createdAt: hoursAgo(12),
  },
  {
    id: 'sp-spo-4', communityId: 'c-sports', type: 'hot',
    title: '某运动员药检阳性，B 瓶复检仍为阳性或面临终身禁赛',
    content: '某知名运动员赛外药检 A 瓶检出违禁成分，本人申请 B 瓶复检，结果今日公布：仍为阳性。\n\n关键信息：\n1. 检出成分为某新型合成代谢类固醇\n2. 该物质不在任何豁免清单内\n3. 浓度是正常人体水平的 47 倍\n\n运动员声明称"可能源于受污染的补剂"。但世界反兴奋剂机构规定，运动员对进入体内的物质负严格责任，"不知情"不构成豁免理由。\n\n如果最终裁定违规，该运动员将面临 4 年禁赛，届时已年满 35 岁，职业生涯基本结束。\n\n反兴奋剂是体育公平的底线，没有任何借口可以妥协。',
    image: 'https://picsum.photos/seed/sp-spo-4/600/400',
    authorName: '绿茵观察员', authorAvatar: 'https://picsum.photos/seed/au21/80/80',
    likes: 7890, comments: 567, views: 65200, tags: ['兴奋剂', '禁赛'],
    createdAt: hoursAgo(16),
  },
  {
    id: 'sp-spo-5', communityId: 'c-sports', type: 'normal',
    title: '中超新赛季规则调整：5 换人 + VAR 仅复核关键判罚',
    content: '中超联盟公布新赛季规则调整：\n\n1. 换人名额从 3 个增至 5 个（中场休息可额外换 1 个）\n2. VAR 仅用于进球、点球、红牌、错误身份四类情况\n3. 越位判定引入半自动技术，判定时间从 90 秒降至 15 秒\n4. 假摔将追溯处罚，赛后停赛 1 场\n\n5 换人规则利弊分析：\n- 利：减少伤病，提升比赛节奏\n- 弊：弱队"摆大巴"更易执行，比分差距可能拉大\n\nVAR 收窄是好现象，之前过度干预破坏了比赛流畅度。希望裁判能敢于做主，不要事事依赖 VAR。\n\n新赛季你看好哪支球队？',
    image: 'https://picsum.photos/seed/sp-spo-5/600/400',
    authorName: '绿茵观察员', authorAvatar: 'https://picsum.photos/seed/au21/80/80',
    likes: 4320, comments: 345, views: 36800, tags: ['中超', '规则'],
    createdAt: hoursAgo(22),
  },
  {
    id: 'sp-spo-6', communityId: 'c-sports', type: 'normal',
    title: '青少年体育培训乱象：教练无证上岗，场地不达标',
    content: '调查了某市 20 家青少年体育培训机构，发现普遍存在问题：\n\n1. 教练持证率仅 42%（要求是社会体育指导员证）\n2. 7 家场地无消防验收\n3. 12 家未购买学员意外险\n4. 收费 1-3 万/年，但合同中"不退费"条款普遍存在\n\n典型案例：一位家长反映，孩子篮球课上的"教练"是体育院校大三学生，无任何教学经验，孩子在训练中十字韧带撕裂后无人负责。\n\n建议家长选择培训机构时：\n- 查验教练资质和健康证\n- 确认场地有消防验收和保险\n- 合同中明确退费条款\n- 先试课再签约\n\n体育培训不能只看广告和装修，安全和专业才是底线。',
    image: 'https://picsum.photos/seed/sp-spo-6/600/400',
    authorName: '篮球战术板', authorAvatar: 'https://picsum.photos/seed/au22/80/80',
    likes: 4560, comments: 378, views: 38500, tags: ['青训', '安全'],
    createdAt: hoursAgo(30),
  },
  {
    id: 'sp-spo-7', communityId: 'c-sports', type: 'charity',
    title: '为残疾运动员提供训练装备，助力 50 人站上赛场',
    content: '"不设限运动计划"为残疾运动员提供专业训练装备和康复支持，已有 52 位运动员受益。\n\n项目成果：\n- 7 位运动员入选省队\n- 3 位在全国残运会获奖\n- 训练装备包括轮椅、假肢、护具等\n\n一位截肢跑者的故事："以前穿着普通假肢跑步，每一步都疼。换上运动假肢后，我第一次感受到了风的形状。"\n\n目前项目急需：\n- 碳纤维运动假肢（单只 2.8 万元）\n- 竞赛轮椅（1.5 万元/台）\n- 专业教练志愿者\n\n每一份支持，都在告诉他们：身体的限制，挡不住梦想的脚步。',
    image: 'https://picsum.photos/seed/sp-spo-7/600/400',
    authorName: '公益摆渡人', authorAvatar: 'https://picsum.photos/seed/au28/80/80',
    likes: 8230, comments: 423, views: 64700, tags: ['公益', '残疾人'],
    createdAt: hoursAgo(41),
  },

  // ── 旅行日记 c-travel（7 帖）──
  {
    id: 'sp-tra-1', communityId: 'c-travel', type: 'hot',
    title: '某网红景点被曝 PS 宣传图，实地像工地游客直呼上当',
    content: '某社交平台爆火的"天空之镜"景点被游客吐槽货不对板：宣传图是无边水镜，实地是块蓝色塑料布铺在泥地上。\n\n实地情况：\n1. 所谓"天空之镜"是 8×12 米的蓝色防水布\n2. "无边花海"是 200 平米的塑料假花\n3. "古风建筑"是铁皮棚喷漆仿木纹\n4. 门票 80 元，停车费 30 元，园内无厕所\n\n更离谱的是，景点要求游客拍视频打卡后才能领"赠送"的矿泉水，本质是利用游客做免费宣传。\n\n建议旅行前多看差评和实拍视频，别只看精修图。也呼吁平台对虚假宣传的景点进行流量限制。\n\n旅行不是打卡，是体验。被坑过的朋友评论区集合。',
    image: 'https://picsum.photos/seed/sp-tra-1/600/400',
    authorName: '背包客阿杰', authorAvatar: 'https://picsum.photos/seed/au23/80/80',
    likes: 7890, comments: 623, views: 65400, tags: ['避坑', '网红景点'],
    createdAt: hoursAgo(4),
  },
  {
    id: 'sp-tra-2', communityId: 'c-travel', type: 'normal',
    title: '云南 8 天自驾详细攻略：含路线、住宿、避坑全记录',
    content: '刚结束云南 8 天自驾，整理了一份可复用的攻略：\n\nDay 1-2 昆明：\n- 住翠湖附近，吃桥香园过桥米线（本地人推荐）\n- 石林半天够了，下午去九乡\n- 避坑：翠湖周边"鲜花饼"店比超市贵 3 倍\n\nDay 3-4 大理：\n- 环海路自驾 4 小时，建议逆时针避开旅行团\n- 住双廊，海景房淡季 300 元/晚\n- 避坑：出租车不打表，用滴滴\n\nDay 5-6 丽江：\n- 古城内住宿晚上吵，住古城外步行 5 分钟\n- 玉龙雪山提前 3 天预约大索道票\n- 避坑："茶马古道"骑马 580 元，全程 30 分钟\n\nDay 7-8 香格里拉：\n- 海拔 3300，提前吃红景天\n- 普达措徒步全程 3 小时，带件外套\n\n总花费约 4500 元/人，性价比超高。',
    image: 'https://picsum.photos/seed/sp-tra-2/600/400',
    authorName: '城市漫步者', authorAvatar: 'https://picsum.photos/seed/au24/80/80',
    likes: 8920, comments: 534, views: 72800, tags: ['云南', '攻略'],
    createdAt: hoursAgo(9),
  },
  {
    id: 'sp-tra-3', communityId: 'c-travel', type: 'normal',
    title: '某 OTA 平台大数据杀熟：同酒店老用户比新用户贵 40%',
    content: '测试了某 OTA 平台的酒店定价，同一酒店同房型：\n\n- 新注册账号：328 元\n- 使用 3 年的老账号：458 元\n- 朋友的白金会员账号：478 元\n\n三个账号同一时间查询，房型描述完全一致。客服回应称"价格受多重因素影响，每个用户看到的可能不同"——这就是典型的大数据杀熟。\n\n规避方法：\n1. 订房前用无痕模式对比价格\n2. 多平台比价（某程、某猪、某团）\n3. 直接联系酒店前台，常有更低价\n4. 发现杀熟可向 12315 投诉\n\n根据《个人信息保护法》第二十四条，自动化决策不得对用户实行不合理的差别待遇。保留截图证据，投诉一投一个准。',
    image: 'https://picsum.photos/seed/sp-tra-3/600/400',
    authorName: '背包客阿杰', authorAvatar: 'https://picsum.photos/seed/au23/80/80',
    likes: 6780, comments: 489, views: 57200, tags: ['OTA', '杀熟'],
    createdAt: hoursAgo(14),
  },
  {
    id: 'sp-tra-4', communityId: 'c-travel', type: 'hot',
    title: '某知名景区门票涨价 60% 引争议，当地居民：游客少了反而清净',
    content: '某 5A 景区门票从 120 元涨至 190 元，涨幅 58%。景区方解释为"用于生态保护和服务升级"。\n\n实地走访发现：\n1. 所谓"服务升级"是新增了 2 个厕所和 3 个休息亭\n2. 索道价格同步上涨 30 元\n3. 景区内餐饮价格翻倍（一碗面从 25 涨到 48）\n\n但有趣的是，当地居民并不反对：\n- 客流量下降 35%，环境压力减轻\n- 原本旺季堵车 2 小时，现在 20 分钟\n- 本地人免费入园政策不变\n\n游客的反应则两极分化：\n- 一部分觉得"不值这个价"\n- 一部分觉得"人少体验更好"\n\n景区定价应该在公益性和可持续性间找平衡。涨价可以，但要让人看到钱花在哪了。',
    image: 'https://picsum.photos/seed/sp-tra-4/600/400',
    authorName: '城市漫步者', authorAvatar: 'https://picsum.photos/seed/au24/80/80',
    likes: 5430, comments: 423, views: 46800, tags: ['景区', '门票'],
    createdAt: hoursAgo(19),
  },
  {
    id: 'sp-tra-5', communityId: 'c-travel', type: 'normal',
    title: '自驾西藏新手必读：318 川藏线常见问题和装备清单',
    content: '走过 3 次 318 川藏线，整理新手最关心的问题：\n\nQ：需要什么车？\nA：SUV 最佳，轿车也能走但通过性差。建议底盘高度 ≥ 18cm。\n\nQ：高反怎么办？\nA：提前 7 天吃红景天（心理作用为主），真正的关键是：\n- 第一天不洗澡（防感冒）\n- 多喝水（每天 3L）\n- 海拔超过 4000 米时走路放慢\n- 备便携氧气（不是为了吸，是心理安慰）\n\nQ：最佳季节？\nA：5-6 月（花季）和 9-10 月（秋色），避开 7-8 月雨季易塌方。\n\n装备清单：\n- 防滑链（10 月后必备）\n- 备用油桶（部分路段加油站间隔 300km+）\n- 保温壶、巧克力、葡萄糖\n- 身份证、驾驶证、行驶证、保险单\n\n全程约 15 天，人均花费 8000-12000 元。风景在路上，不在终点。',
    image: 'https://picsum.photos/seed/sp-tra-5/600/400',
    authorName: '背包客阿杰', authorAvatar: 'https://picsum.photos/seed/au23/80/80',
    likes: 7890, comments: 567, views: 64500, tags: ['西藏', '自驾'],
    createdAt: hoursAgo(25),
  },
  {
    id: 'sp-tra-6', communityId: 'c-travel', type: 'normal',
    title: '某民宿被曝卫生问题：毛巾擦完马桶擦杯子，监控拍下全过程',
    content: '某暗访记者在三家网红民宿安装了隐蔽摄像头，拍到的清洁流程让人窒息：\n\n1. 同一条毛巾先擦马桶，再擦洗手台，最后擦杯子\n2. 床单被套客人退房后未更换，只是"整理平整"\n3. 浴室地巾与擦脸巾混用\n4. 所谓"一客一换"的拖鞋，实际是喷点消毒水继续用\n\n三家民宿在某平台评分均 4.8 以上，好评多是"装修好看""出片"。\n\n住民宿建议：\n- 自带毛巾、浴巾、一次性床品\n- 用杯子前用开水烫 3 分钟\n- 检查床单是否有毛发、污渍\n- 选择有"卫生认证"标识的房源\n\n颜值和卫生不画等号。下次选民宿，先看差评里的"卫生"关键词。',
    image: 'https://picsum.photos/seed/sp-tra-6/600/400',
    authorName: '城市漫步者', authorAvatar: 'https://picsum.photos/seed/au24/80/80',
    likes: 5670, comments: 423, views: 48600, tags: ['民宿', '卫生'],
    createdAt: hoursAgo(33),
  },
  {
    id: 'sp-tra-7', communityId: 'c-travel', type: 'charity',
    title: '带乡村孩子看世界：暑期城市游学项目招募志愿者',
    content: '"走出大山"项目每年暑假组织偏远地区孩子到一线城市游学，今年已是第 6 届。\n\n项目内容：\n- 7 天 6 晚的游学行程（博物馆、大学、科技企业、城市探索）\n- 招募 40 名孩子（来自 12 所乡村学校）\n- 每个孩子配 1 名志愿者全程陪同\n\n往届反馈：\n- 87% 的孩子表示"想考上这里的大学"\n- 一位往届 participant 去年考上了上海交大\n\n志愿者要求：\n- 大学生或在职人士\n- 能全程参与 7 天\n- 通过背景调查\n- 报名截止 6 月 15 日\n\n您的一周陪伴，可能是孩子一生的转折点。',
    image: 'https://picsum.photos/seed/sp-tra-7/600/400',
    authorName: '暖心志愿者', authorAvatar: 'https://picsum.photos/seed/au27/80/80',
    likes: 6540, comments: 345, views: 52300, tags: ['公益', '游学'],
    createdAt: hoursAgo(43),
  },

  // ── 美食探店 c-food（7 帖）──
  {
    id: 'sp-fod-1', communityId: 'c-food', type: 'hot',
    title: '某连锁餐厅后厨暗访：过期食材循环使用，地沟油回炉',
    content: '暗访记者在某连锁餐厅后厨工作 12 天，拍到的画面触目惊心：\n\n1. 过期 3 天的肉片用红油浸泡后继续使用\n2. 隔夜汤底每日加料"续命"，最长一锅用了 7 天\n3. 顾客吃剩的辣椒、花椒沥干回锅\n4. 使用的"食用油"进价 3.2 元/斤，远低于正常大豆油成本\n\n更细思极恐的是：\n- 该品牌 200+ 门店使用统一供应链\n- 后厨无监控（"商业机密"）\n- 卫生检查前 1 小时会收到"通知"\n\n市监局已介入查封涉事门店。律师表示，使用地沟油可能构成"生产、销售有毒、有害食品罪"，最高可判死刑。\n\n外出就餐建议：\n- 选择开放式厨房的餐厅\n- 留意证照是否齐全（挂在显眼处是好的信号）\n- 异味、异常低价要警惕\n- 遇到问题保留小票和样品',
    image: 'https://picsum.photos/seed/sp-fod-1/600/400',
    authorName: '探店达人', authorAvatar: 'https://picsum.photos/seed/au25/80/80',
    likes: 9870, comments: 723, views: 82400, tags: ['餐饮', '食品安全'],
    createdAt: hoursAgo(2),
  },
  {
    id: 'sp-fod-2', communityId: 'c-food', type: 'normal',
    title: '正宗麻婆豆腐做法：3 个关键步骤大多数人做错',
    content: '做了 20 年川菜的老师傅教的方子，分享给大家：\n\n关键 1：豆腐要"飞水"\n- 嫩豆腐切 2cm 方块\n- 加盐的开水中焯烫 90 秒（去豆腥+定型）\n- 不要用凉水冲，自然沥干\n\n关键 2：炒豆瓣要"断生"\n- 郫县豆瓣酱剁细（原样太大块）\n- 小火慢炒 2 分钟，炒出红油\n- 炒到闻不到生豆味为止\n\n关键 3：勾芡要"三步"\n- 第一次：薄芡包裹豆腐\n- 第二次：在中途收浓\n- 第三次：起锅前锁味\n- 每次用 1 勺水淀粉，分三次下\n\n完整配方：\n- 豆腐 400g、牛肉末 80g、郫县豆瓣 2 勺\n- 花椒粉、蒜末、葱花、生抽适量\n- 牛肉末要炒到酥香，这是"麻婆"的"婆"\n\n这样做出来的麻婆豆腐：麻、辣、烫、香、酥、嫩、鲜，七味俱全。',
    image: 'https://picsum.photos/seed/sp-fod-2/600/400',
    authorName: '家庭煮夫', authorAvatar: 'https://picsum.photos/seed/au26/80/80',
    likes: 6780, comments: 423, views: 56800, tags: ['菜谱', '川菜'],
    createdAt: hoursAgo(7),
  },
  {
    id: 'sp-fod-3', communityId: 'c-food', type: 'normal',
    title: '某网红餐厅排队 3 小时实测：味道配得上等待吗？',
    content: '某网红餐厅在某书爆火，工作日中午排队 2 小时起。我专门去测了一下值不值：\n\n环境：\n- 装修很有特色（确实出片）\n- 桌间距 50cm，隔壁说话听得一清二楚\n- 音乐音量 78 分贝，聊天需要喊\n\n菜品实测：\n1. 招牌菜"某某鸡" 88 元：摆盘精致，但鸡肉偏柴，酱料是预制包装拆开浇的\n2. 网红甜品"云朵蛋糕" 48 元：拍照好看，口感就是普通戚风+奶油\n3. 主食"龙虾烩饭" 128 元：龙虾是冷冻的，米饭夹生\n4. 柠檬茶 28 元：便利店水准\n\n人均 280 元，口味打 60 分，环境打 80 分，性价比打 40 分。\n\n结论：适合拍照打卡，不适合认真吃饭。同样的钱在老字号能吃到更扎实的东西。\n\n排队 2 小时换一顿 60 分的饭，时间成本太高了。',
    image: 'https://picsum.photos/seed/sp-fod-3/600/400',
    authorName: '探店达人', authorAvatar: 'https://picsum.photos/seed/au25/80/80',
    likes: 5430, comments: 412, views: 46200, tags: ['探店', '测评'],
    createdAt: hoursAgo(11),
  },
  {
    id: 'sp-fod-4', communityId: 'c-food', type: 'hot',
    title: '预制菜进校园引争议，家长集体反对：孩子不是试验田',
    content: '某市 12 所中小学食堂改为中央厨房配送的预制菜，家长集体反对并要求恢复现场烹饪。\n\n争议焦点：\n1. 营养：预制菜经过二次加热，维生素损失 30-50%\n2. 安全：防腐剂和添加剂使用情况不透明\n3. 口感：孩子反映"难吃"，浪费率从 15% 升至 38%\n4. 成本：预制菜单份成本 8 元，现场烹饪 12 元，省下的钱去哪了？\n\n教育局回应称"统一配送保障食品安全"。但家长质疑：保障的是安全还是利润？\n\n对比日本学校午餐：\n- 现场烹饪，营养师配餐\n- 食材可溯源，校长先吃\n- 经费占教育预算 8%\n\n孩子的健康不是成本优化的对象。建议家长积极参与家委会监督，要求食材来源和加工过程透明化。',
    image: 'https://picsum.photos/seed/sp-fod-4/600/400',
    authorName: '家庭煮夫', authorAvatar: 'https://picsum.photos/seed/au26/80/80',
    likes: 8920, comments: 678, views: 74500, tags: ['预制菜', '校园'],
    createdAt: hoursAgo(16),
  },
  {
    id: 'sp-fod-5', communityId: 'c-food', type: 'normal',
    title: '同一种食材，贵的和便宜的差在哪？带你识破营销套路',
    content: '逛超市经常看到同一种食材价格差 3-10 倍，真的是一分钱一分货吗？\n\n案例 1：鸡蛋\n- 5 元/斤 vs 25 元/斤的"土鸡蛋"\n- 检测：蛋白质、脂肪、胆固醇含量几乎无差异\n- "土鸡蛋"蛋黄颜色深是因为饲料加了万寿菊提取物\n- 结论：营养无差异，颜色是营销\n\n案例 2：大米\n- 3 元/斤 vs 15 元/斤的"五常稻花香"\n- 真五常稻花香产量有限，市面 90% 是掺假\n- 认准：GB/T 19266 标准 + 二维码溯源\n- 结论：贵的不一定是真的\n\n案例 3：橄榄油\n- 30 元 vs 200 元\n- 关键看：酸度（≤0.8% 为特级初榨）、产地、生产日期\n- 很多"特级初榨"实为精炼油调色\n- 结论：看标签比看价格靠谱\n\n记住：贵的不等于好的，会看标签比会花钱更重要。',
    image: 'https://picsum.photos/seed/sp-fod-5/600/400',
    authorName: '探店达人', authorAvatar: 'https://picsum.photos/seed/au25/80/80',
    likes: 4560, comments: 345, views: 38900, tags: ['食材', '科普'],
    createdAt: hoursAgo(21),
  },
  {
    id: 'sp-fod-6', communityId: 'c-food', type: 'normal',
    title: '减脂期外卖怎么点？5 家连锁品牌热量实测排名',
    content: '买了 5 家常见连锁外卖的"轻食"产品，送检热量和营养成分：\n\n1. 某野家：麻辣鸡胸肉沙拉 380 大卡 ✅ 推荐\n   - 蛋白质 32g，碳水 18g，脂肪 12g\n   - 酱料单独装，可控制\n\n2. 某疆：番茄牛肉烩饭 620 大卡 ⚠️ 一般\n   - 米饭份量过大（280g）\n   - 建议留一半米饭\n\n3. 某绿：黑椒牛肉饭 780 大卡 ⚠️ 偏高\n   - 油量偏大，建议备注"少油"\n\n4. 某适：全麦三明治 450 大卡 ✅ 推荐\n   - 蛋白质充足，碳水适中\n   - 搭配无糖饮品更佳\n\n5. 某寿司：三文鱼卷 6 盒 540 大卡 ⚠️ 看似轻食实则高碳水\n   - 米饭占比 65%\n   - 建议点 4 盒 + 味噌汤\n\n减脂期点外卖核心原则：高蛋白、控碳水、少油盐。酱料永远是隐形热量炸弹。',
    image: 'https://picsum.photos/seed/sp-fod-6/600/400',
    authorName: '营养师小林', authorAvatar: 'https://picsum.photos/seed/au17/80/80',
    likes: 5230, comments: 389, views: 44200, tags: ['减脂', '外卖'],
    createdAt: hoursAgo(29),
  },
  {
    id: 'sp-fod-7', communityId: 'c-food', type: 'charity',
    title: '"爱心早餐"计划：为环卫工人送上一份热腾腾的早饭',
    content: '我们运营的"爱心早餐"项目已坚持 3 年，每天清晨为城市的环卫工人免费提供早餐。\n\n项目数据：\n- 覆盖 8 个城市的 47 个早餐点\n- 每日服务 1200+ 位环卫工人\n- 每份成本 6 元（包子 + 鸡蛋 + 豆浆）\n- 合作餐厅 23 家，均为成本价供应\n\n一位环卫工大姐的话："凌晨 4 点扫街，饿着肚子干到 8 点。现在有口热饭吃，干活都有劲了。"\n\n目前项目急需：\n- 每月 8 万元运营资金\n- 更多合作餐厅（早市摊点亦可）\n- 清晨配送志愿者（5:00-6:30）\n\n您的 6 元，就是一份热气腾腾的清晨。让这座城市最早醒来的人，也能最早感受到温暖。',
    image: 'https://picsum.photos/seed/sp-fod-7/600/400',
    authorName: '公益摆渡人', authorAvatar: 'https://picsum.photos/seed/au28/80/80',
    likes: 8920, comments: 456, views: 68400, tags: ['公益', '环卫工'],
    createdAt: hoursAgo(37),
  },
]

// ── 社区评论生成 ──────────────────────────────────────

const commentTemplates = [
  { nickname: '理性吃瓜人', avatar: 'https://picsum.photos/seed/cu1/80/80', content: '这个瓜保熟吗？等一个实锤再说' },
  { nickname: '真相猎人', avatar: 'https://picsum.photos/seed/cu2/80/80', content: '之前看到过类似的报道，感觉有几分可信' },
  { nickname: '围观群众甲', avatar: 'https://picsum.photos/seed/cu3/80/80', content: '坐等反转，每次都有反转' },
  { nickname: '逻辑怪', avatar: 'https://picsum.photos/seed/cu4/80/80', content: '从逻辑上看，这个说法站不住脚啊' },
  { nickname: '数据控', avatar: 'https://picsum.photos/seed/cu5/80/80', content: '我有朋友在相关行业，说确实如此' },
  { nickname: '深夜冲浪选手', avatar: 'https://picsum.photos/seed/cu6/80/80', content: '别急着下结论，等官方回应比较稳妥' },
  { nickname: '匿名用户', avatar: 'https://picsum.photos/seed/cu7/80/80', content: '这个时间线对不上吧，仔细看看' },
  { nickname: '老司机带带我', avatar: 'https://picsum.photos/seed/cu8/80/80', content: 'mark，持续关注中' },
  { nickname: '键盘侠克星', avatar: 'https://picsum.photos/seed/cu9/80/80', content: '建议发到观微求证一下，让AI帮忙分析' },
  { nickname: '吃瓜第一名', avatar: 'https://picsum.photos/seed/cu10/80/80', content: '蹲一个后续，希望有更多证据出来' },
  { nickname: '理性派代表', avatar: 'https://picsum.photos/seed/cu11/80/80', content: '信息量有点大，需要消化一下' },
  { nickname: '福尔摩斯附体', avatar: 'https://picsum.photos/seed/cu12/80/80', content: '第三张图的细节有问题，建议放大看' },
  { nickname: '资深瓜农', avatar: 'https://picsum.photos/seed/cu13/80/80', content: '这种事见多了，最后多半是和解收场' },
  { nickname: '路人甲乙丙', avatar: 'https://picsum.photos/seed/cu14/80/80', content: '感觉事情没那么简单，背后可能有更大的瓜' },
  { nickname: '深夜不睡觉', avatar: 'https://picsum.photos/seed/cu15/80/80', content: '求懂行的科普一下，这个到底严不严重' },
]

// 基于帖子 id 生成稳定的评论（同一帖子每次返回相同评论）
export function getCommunityPostComments(postId: string): CommunityComment[] {
  // 简单哈希，保证同一 postId 返回稳定结果
  let hash = 0
  for (let i = 0; i < postId.length; i++) {
    hash = ((hash << 5) - hash + postId.charCodeAt(i)) | 0
  }
  const seed = Math.abs(hash)
  // 生成 3-5 条评论
  const count = 3 + (seed % 3)
  const comments: CommunityComment[] = []
  const usedIndices = new Set<number>()
  for (let i = 0; i < count; i++) {
    let idx = (seed + i * 7) % commentTemplates.length
    while (usedIndices.has(idx)) {
      idx = (idx + 1) % commentTemplates.length
    }
    usedIndices.add(idx)
    const tpl = commentTemplates[idx]
    comments.push({
      id: `cm-${postId}-${i + 1}`,
      postId,
      userNickname: tpl.nickname,
      userAvatar: tpl.avatar,
      content: tpl.content,
      likes: ((seed + i * 13) % 80) + 5,
      isLiked: false,
      createdAt: hoursAgo(i * 2 + 1),
    })
  }
  return comments
}

// ── 社区数据访问函数 ──────────────────────────────────

export function getCommunities(): Community[] {
  return communities
}

export function getCommunityById(id: string): Community | undefined {
  return communities.find(c => c.id === id)
}

export function getCommunitySeedPosts(communityId: string): CommunitySeedPost[] {
  return communitySeedPosts.filter(p => p.communityId === communityId)
}

export function getCommunitySeedPostById(postId: string): CommunitySeedPost | undefined {
  return communitySeedPosts.find(p => p.id === postId)
}

// 热门公式：likes * 0.5 + comments * 0.3 + views * 0.2
export function getCommunityPostHotScore(post: CommunitySeedPost): number {
  return post.likes * 0.5 + post.comments * 0.3 + post.views * 0.2
}

// 创建新帖子（运行时动态添加到内存）
export function createCommunitySeedPost(data: {
  communityId: string
  title: string
  content: string
  image?: string
}): CommunitySeedPost {
  const id = `sp-new-${Date.now()}`
  const post: CommunitySeedPost = {
    id,
    communityId: data.communityId,
    type: 'normal',
    title: data.title,
    content: data.content,
    image: data.image || `https://picsum.photos/seed/${id}/600/400`,
    authorName: '我',
    authorAvatar: 'https://picsum.photos/seed/me/80/80',
    likes: 0,
    comments: 0,
    views: 0,
    tags: [],
    createdAt: new Date().toISOString(),
  }
  communitySeedPosts.unshift(post)
  return post
}

// ===== 热点事件种子数据（10 条，每条关联 1-2 个瓜） =====
// 关联瓜 ID 来自上方 melonTemplates（melon-1 ~ melon-50）

export const HOT_EVENT_SEEDS: HotEventCard[] = [
  {
    id: 1,
    title: '新能源车续航虚标事件',
    summary: '多位车主实测发现某品牌旗舰车型实际续航仅为官方标称的 60%，引发大规模维权。工信部已介入调查，第三方检测机构正在进行全面测试。',
    category: '科技',
    status: 'developing',
    followers: 128400,
    lastUpdate: '2 小时前',
    nodes: [
      { date: '03-12', label: '首批车主爆料', detail: '微博用户@车评人发布实测视频，对比官方续航数据', sources: ['微博@车评人', '抖音实测视频'], status: 'confirmed' },
      { date: '03-18', label: '品牌方回应', detail: '发布声明称"测试工况为理想条件，实际续航受多因素影响"', sources: ['官方声明', '新闻发布会'], status: 'disputed' },
      { date: '03-25', label: '工信部介入', detail: '宣布启动专项调查，要求企业提供完整测试数据', sources: ['工信部公告'], status: 'confirmed' },
      { date: '04-02', label: '第三方检测', detail: '国家级检测机构出具初步报告，确认低温衰减问题', sources: ['检测报告摘要'], status: 'confirmed' },
    ],
    totalNodes: 12,
    viewCount: 892000,
    date: '2025-03-12',
    coverImage: 'https://picsum.photos/seed/hot1/400/300',
    discussionCount: 89234,
    mediaCoverage: 156,
    relatedMelonIds: ['melon-20'],
  },
  {
    id: 2,
    title: '985 高校保研名额争议',
    summary: '某 985 高校被曝保研名额向特定生源倾斜，往届学生质疑公平性，教育部回应将开展专项核查，校方已成立独立调查组。',
    category: '校园',
    status: 'developing',
    followers: 96200,
    lastUpdate: '45 分钟前',
    nodes: [
      { date: '04-01', label: '长文首发', detail: '知乎用户发布万字长文，详细分析名额分配数据', sources: ['知乎原文', '数据截图'], status: 'unverified' },
      { date: '04-05', label: '校方声明', detail: '发布声明称"名额分配符合规定，不存在违规"', sources: ['校方公告'], status: 'disputed' },
      { date: '04-10', label: '教育部回应', detail: '宣布将开展专项核查，确保招生公平', sources: ['教育部公告'], status: 'confirmed' },
      { date: '04-15', label: '学生联名', detail: '超 500 名学生联名要求信息公开', sources: ['联名信截图'], status: 'confirmed' },
    ],
    totalNodes: 8,
    viewCount: 1240000,
    date: '2025-04-01',
    coverImage: 'https://picsum.photos/seed/hot2/400/300',
    discussionCount: 156789,
    mediaCoverage: 89,
    relatedMelonIds: ['melon-46'],
  },
  {
    id: 3,
    title: '网红餐厅预制菜事件',
    summary: '知名连锁品牌被曝全线使用预制菜却以"现炒"为卖点。市场监管总局发布预制菜标识新规征求意见稿，行业迎来规范化发展。',
    category: '生活科普',
    status: 'resolved',
    followers: 73500,
    lastUpdate: '1 天前',
    nodes: [
      { date: '01-20', label: '暗访视频曝光', detail: '自媒体发布暗访视频，揭示后厨真相', sources: ['暗访视频', '媒体报道'], status: 'confirmed' },
      { date: '02-03', label: '品牌道歉', detail: '发布道歉声明，承诺整改并透明标注', sources: ['道歉声明'], status: 'confirmed' },
      { date: '02-18', label: '行业自查', detail: '多家连锁品牌主动公布预制菜使用情况', sources: ['行业公告'], status: 'confirmed' },
      { date: '03-10', label: '新规出台', detail: '市场监管总局发布预制菜标识新规', sources: ['新规全文'], status: 'confirmed' },
    ],
    totalNodes: 15,
    viewCount: 2100000,
    date: '2025-01-20',
    coverImage: 'https://picsum.photos/seed/hot3/400/300',
    discussionCount: 234567,
    mediaCoverage: 234,
    relatedMelonIds: ['melon-20'],
  },
  {
    id: 4,
    title: '室温超导材料争议',
    summary: '国内某实验室宣称实现近常压室温超导，多个团队尝试复现结果不一。论文已启动撤稿审查，学界对此争议持续。',
    category: '科技',
    status: 'tracking',
    followers: 54300,
    lastUpdate: '6 小时前',
    nodes: [
      { date: '02-14', label: '论文预印本', detail: '研究团队在 arXiv 发布预印本论文', sources: ['arXiv 论文'], status: 'unverified' },
      { date: '03-01', label: '复现失败', detail: '多个国际团队公开表示复现实验未成功', sources: ['Nature 报道', 'Science 新闻'], status: 'disputed' },
      { date: '03-22', label: '撤稿审查', detail: '期刊启动撤稿审查程序，作者回应称仍在核实', sources: ['期刊公告'], status: 'disputed' },
    ],
    totalNodes: 6,
    viewCount: 670000,
    date: '2025-02-14',
    coverImage: 'https://picsum.photos/seed/hot4/400/300',
    discussionCount: 45678,
    mediaCoverage: 78,
    relatedMelonIds: ['melon-17'],
  },
  {
    id: 5,
    title: '某地暴雨救援时间线',
    summary: '连续暴雨导致城市内涝，救援力量调配、物资发放、灾后重建各阶段时间线梳理，记录了这场自然灾害中的关键节点。',
    category: '社会热点',
    status: 'resolved',
    followers: 210000,
    lastUpdate: '3 天前',
    nodes: [
      { date: '06-15', label: '暴雨预警', detail: '气象部门发布红色暴雨预警', sources: ['气象台公告'], status: 'confirmed' },
      { date: '06-16', label: '紧急救援', detail: '消防、武警、民间救援队连夜投入', sources: ['应急管理部', '现场报道'], status: 'confirmed', multiSource: true },
      { date: '06-18', label: '物资到位', detail: '灾区物资配送网络全面打通', sources: ['红十字会公告'], status: 'confirmed' },
      { date: '06-22', label: '积水退去', detail: '主城区积水基本排空，转入重建阶段', sources: ['市政通报'], status: 'confirmed' },
    ],
    totalNodes: 12,
    viewCount: 3400000,
    date: '2025-06-15',
    coverImage: 'https://picsum.photos/seed/hot5/400/300',
    discussionCount: 345678,
    mediaCoverage: 456,
    relatedMelonIds: ['melon-29'],
  },
  {
    id: 6,
    title: 'AI 生成内容版权诉讼',
    summary: '国内首例 AI 绘画版权案开庭，原告指控某平台生成图片侵犯其原创作品风格。判决结果将对 AI 产业发展产生深远影响。',
    category: '科技',
    status: 'developing',
    followers: 41800,
    lastUpdate: '30 分钟前',
    nodes: [
      { date: '03-28', label: '原告起诉', detail: '插画师向法院提起版权侵权诉讼', sources: ['起诉书摘要'], status: 'confirmed' },
      { date: '04-08', label: '法院受理', detail: '法院正式受理案件，定于 4 月 15 日开庭', sources: ['法院公告'], status: 'confirmed' },
      { date: '04-15', label: '首次开庭', detail: '庭审进行，双方激烈辩论', sources: ['庭审报道'], status: 'disputed' },
      { date: '04-20', label: '专家意见', detail: '知识产权专家发表观点文章', sources: ['专家文章'], status: 'unverified' },
    ],
    totalNodes: 6,
    viewCount: 530000,
    date: '2025-03-28',
    coverImage: 'https://picsum.photos/seed/hot6/400/300',
    discussionCount: 89012,
    mediaCoverage: 67,
    relatedMelonIds: ['melon-24'],
  },
  {
    id: 7,
    title: '某顶流男星隐婚生子风波',
    summary: '网友爆料称某顶流男星早已结婚生子，并晒出疑似接送孩子放学的模糊照片。工作室发声明否认，但网友扒出更多"蛛丝马迹"。',
    category: '娱乐',
    status: 'developing',
    followers: 285000,
    lastUpdate: '15 分钟前',
    nodes: [
      { date: '07-01', label: '爆料首发', detail: '娱乐博主放出模糊照片，配文"顶流秘密"', sources: ['微博爆料'], status: 'unverified' },
      { date: '07-02', label: '工作室声明', detail: '发布声明称"照片系恶意合成，将起诉造谣者"', sources: ['工作室声明'], status: 'disputed' },
      { date: '07-04', label: '网友扒细节', detail: '粉丝扒出该明星近年行程空白期与爆料时间吻合', sources: ['超话讨论', '时间线整理帖'], status: 'unverified', multiSource: true },
      { date: '07-06', label: '狗仔预告', detail: '知名狗仔预告将放出更清晰视频', sources: ['狗仔账号'], status: 'unverified' },
    ],
    totalNodes: 9,
    viewCount: 4200000,
    date: '2025-07-01',
    coverImage: 'https://picsum.photos/seed/hot7/400/300',
    discussionCount: 512000,
    mediaCoverage: 198,
    relatedMelonIds: ['melon-1', 'melon-12'],
  },
  {
    id: 8,
    title: '某大厂裁员 30% 传闻发酵',
    summary: '匿名职场论坛出现爆料帖，称某互联网大厂将于下月启动大规模裁员。内部人士透露已在统计优化名单，公司官方至今未回应。',
    category: '财经',
    status: 'tracking',
    followers: 87600,
    lastUpdate: '1 小时前',
    nodes: [
      { date: '05-10', label: '论坛爆料', detail: '脉脉匿名区出现裁员帖，附带疑似内部邮件截图', sources: ['脉脉匿名帖'], status: 'unverified' },
      { date: '05-12', label: '内部人士确认', detail: '多位自称员工的用户证实优化名单正在统计', sources: ['员工匿名采访'], status: 'unverified' },
      { date: '05-15', label: '官方沉默', detail: '公司官方账号未做任何回应，股价单日跌 4%', sources: ['股价数据'], status: 'confirmed' },
      { date: '05-20', label: '工会介入', detail: '公司工会发布公开信呼吁透明沟通', sources: ['工会公开信'], status: 'confirmed' },
    ],
    totalNodes: 7,
    viewCount: 980000,
    date: '2025-05-10',
    coverImage: 'https://picsum.photos/seed/hot8/400/300',
    discussionCount: 167000,
    mediaCoverage: 112,
    relatedMelonIds: ['melon-19'],
  },
  {
    id: 9,
    title: '网红保健品虚假宣传风波',
    summary: '某热销代购保健品被查出核心成分与几十元国产货无区别，却以十倍价格售卖。市监局已立案，多地同步调查。',
    category: '健康',
    status: 'developing',
    followers: 64300,
    lastUpdate: '4 小时前',
    nodes: [
      { date: '06-01', label: '成分检测曝光', detail: '第三方检测机构公布成分对比报告', sources: ['检测报告'], status: 'confirmed' },
      { date: '06-05', label: '博主集体发声', detail: '多位健康领域博主转发并质疑虚假宣传', sources: ['微博话题', 'B 站视频'], status: 'confirmed', multiSource: true },
      { date: '06-08', label: '市监局立案', detail: '多地市监部门同步立案调查', sources: ['官方通报'], status: 'confirmed' },
      { date: '06-12', label: '品牌方回应', detail: '品牌方下架相关产品，承诺配合调查', sources: ['品牌公告'], status: 'disputed' },
    ],
    totalNodes: 10,
    viewCount: 1320000,
    date: '2025-06-01',
    coverImage: 'https://picsum.photos/seed/hot9/400/300',
    discussionCount: 198000,
    mediaCoverage: 145,
    relatedMelonIds: ['melon-48'],
  },
  {
    id: 10,
    title: '外卖小哥被小区保安殴打事件',
    summary: '一段外卖骑手被保安殴打的视频在网络热传，物业公司回应称是双方个人冲突。骑手所在平台已介入协助处理。',
    category: '社会热点',
    status: 'tracking',
    followers: 152000,
    lastUpdate: '5 小时前',
    nodes: [
      { date: '06-20', label: '视频曝光', detail: '监控视频在短视频平台热传，播放量破亿', sources: ['短视频平台'], status: 'confirmed' },
      { date: '06-21', label: '物业回应', detail: '物业公司称系"个人冲突，与公司无关"', sources: ['物业声明'], status: 'disputed' },
      { date: '06-22', label: '平台介入', detail: '外卖平台宣布协助骑手维权，承担法律费用', sources: ['平台公告'], status: 'confirmed' },
      { date: '06-25', label: '警方通报', detail: '警方对涉事保安行政拘留 15 日', sources: ['警方通报'], status: 'confirmed' },
    ],
    totalNodes: 8,
    viewCount: 2650000,
    date: '2025-06-20',
    coverImage: 'https://picsum.photos/seed/hot10/400/300',
    discussionCount: 287000,
    mediaCoverage: 167,
    relatedMelonIds: ['melon-22'],
  },
]

// 卡片数据转详情数据
export function hotCardToDetail(card: HotEventCard): HotEvent {
  const statusMap: Record<string, '发酵中' | '已解决' | '持续追踪'> = {
    developing: '发酵中',
    resolved: '已解决',
    tracking: '持续追踪',
  }
  return {
    id: card.id,
    title: card.title,
    summary: card.summary,
    fullDescription: card.summary,
    category: card.category,
    status: statusMap[card.status],
    followers: card.followers,
    lastUpdate: card.lastUpdate,
    nodes: card.nodes,
    viewCount: card.viewCount,
    tags: [card.category],
    relatedEvents: [],
    keyFigures: [],
    mediaCoverage: card.mediaCoverage,
    discussionCount: card.discussionCount,
    coverImage: card.coverImage.replace('/400/300', '/800/600'),
    relatedMelonIds: card.relatedMelonIds,
  }
}

export function getHotEventById(id: number): HotEventCard | undefined {
  return HOT_EVENT_SEEDS.find(e => e.id === id)
}

// ===== 时间线生成 Mock 模板（TimelineBuilder 降级用） =====

export type TimelineTemplateType = 'product-launch' | 'person-resume' | 'controversy'

export interface TimelineTemplate {
  type: TimelineTemplateType
  label: string
  description: string
  keywords: string[] // 命中关键词则推荐此模板
  nodes: TimelineNode[]
}

export const TIMELINE_TEMPLATES: TimelineTemplate[] = [
  {
    type: 'product-launch',
    label: '产品发布事件',
    description: '发布 → 预热 → 泄露 → 官宣 → 发售 → 反馈',
    keywords: ['发布', '产品', '发售', '上市', '官宣', '预热', '发布会', '开售', '上架', '开箱'],
    nodes: [
      { date: 'T-30 天', label: '预热阶段', detail: '官方发布悬念海报，社交媒体开始造势', sources: ['官方账号'], status: 'confirmed' },
      { date: 'T-15 天', label: '信息泄露', detail: '核心参数与外观图在供应链渠道流出', sources: ['供应链消息'], status: 'unverified' },
      { date: 'T-7 天', label: '官宣定档', detail: '官方正式宣布发布会时间与产品名称', sources: ['官方公告'], status: 'confirmed' },
      { date: 'T 日', label: '发布会现场', detail: '产品正式发布，公布完整规格与售价', sources: ['发布会直播'], status: 'confirmed' },
      { date: 'T+3 天', label: '首批发售', detail: '产品开售，首批用户收到货并晒单', sources: ['电商平台', '用户晒单'], status: 'confirmed', multiSource: true },
      { date: 'T+15 天', label: '用户反馈', detail: '真实用户评测集中释出，口碑初步成型', sources: ['媒体评测', 'KOL 视频'], status: 'disputed', multiSource: true },
    ],
  },
  {
    type: 'person-resume',
    label: '人物履历',
    description: '出生 → 求学 → 出道 → 代表作 → 争议 → 现状',
    keywords: ['人物', '履历', '简历', '生平', '出道', '求学', '出生', '代表作', '经历', '明星', '企业家'],
    nodes: [
      { date: '出生', label: '出生与家庭', detail: '出生于普通家庭，家中排行老大', sources: ['公开资料'], status: 'confirmed' },
      { date: '求学', label: '求学经历', detail: '考入知名院校，主修相关专业', sources: ['校友录'], status: 'confirmed' },
      { date: '出道', label: '正式出道', detail: '毕业后进入行业，开始职业生涯', sources: ['行业报道'], status: 'confirmed' },
      { date: '代表作', label: '代表作诞生', detail: '凭借代表作品一举成名，获得行业关注', sources: ['作品发布'], status: 'confirmed' },
      { date: '争议', label: '争议事件', detail: '陷入某争议事件，舆论两极分化', sources: ['媒体报道'], status: 'disputed' },
      { date: '现状', label: '近期动向', detail: '近期转型新方向，关注度回升', sources: ['社交账号'], status: 'unverified' },
    ],
  },
  {
    type: 'controversy',
    label: '争议事件演变',
    description: '爆料 → 回应 → 反转 → 实锤 → 后续',
    keywords: ['争议', '爆料', '回应', '反转', '实锤', '风波', '事件', '曝光', '辟谣', '质疑'],
    nodes: [
      { date: '第 1 天', label: '爆料首发', detail: '匿名爆料人在社交平台放出首条信息', sources: ['匿名爆料'], status: 'unverified' },
      { date: '第 2 天', label: '当事人回应', detail: '当事人发布声明否认部分指控', sources: ['当事人声明'], status: 'disputed' },
      { date: '第 4 天', label: '剧情反转', detail: '新证据出现，事件走向与最初爆料相反', sources: ['新证据截图'], status: 'disputed' },
      { date: '第 7 天', label: '实锤落地', detail: '权威方介入或核心证据公开，事件定性', sources: ['官方通报', '权威媒体'], status: 'confirmed', multiSource: true },
      { date: '第 15 天', label: '后续影响', detail: '事件引发行业反思或政策调整', sources: ['行业评论'], status: 'confirmed' },
    ],
  },
]

// 根据输入文本匹配合适的模板
export function matchTimelineTemplate(text: string): TimelineTemplate {
  const lower = text.toLowerCase()
  let bestMatch = TIMELINE_TEMPLATES[0]
  let bestScore = 0
  for (const tpl of TIMELINE_TEMPLATES) {
    let score = 0
    for (const kw of tpl.keywords) {
      if (lower.includes(kw.toLowerCase())) score += 1
    }
    if (score > bestScore) {
      bestScore = score
      bestMatch = tpl
    }
  }
  return bestMatch
}