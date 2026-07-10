import type { Melon, MelonCategory, VerificationResult, Evidence, Report } from '../types'

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
    const author = melonAuthors[i % melonAuthors.length]

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
      revealTime: generateRevealTime(),
      status: 'pending',
      createdAt,
      likeCount: randomInt(100, 5000),
      commentCount: randomInt(10, 500),
      evidenceCount: randomInt(5, 50),
      isLiked: false,
      author: { ...author },
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