# backend/tests/evaluation/workspace_eval_cases.py
"""工作间回归评测集 — 20 个固定主题 + golden_points

⚠️ 本文件由 LLM 生成草稿 + 人工审核锁定，后续回归测试用此版本，不重新生成。
修改本文件需同步更新 last_modified 并记录变更原因。

覆盖类型：
- 科技（5）：AI 伦理、芯片、量子计算、新能源、自动驾驶
- 社会（5）：教育、就业、养老、医疗、城市治理
- 娱乐（3）：影视、游戏、音乐
- 政策法规（4）：数据安全、平台反垄断、未成年人保护、知识产权
- 长尾/敏感（3）：争议性话题、小众领域、边界案例

golden_points 语义：产出必须覆盖的要点（检查清单），不是标准答案。
LLM-as-Judge 检查覆盖率，不是相似度。
"""

EVAL_CASES = [
    # === 科技（5） ===
    {
        "id": "tech-01",
        "topic": "AI 换脸技术滥用的治理困境",
        "category": "科技",
        "platforms": ["guanwei", "zhihu", "weibo"],
        "golden_points": [
            "提到技术平民化降低门槛",
            "包含具体案例或数据（如案件数）",
            "涉及防范建议（至少 3 条）",
            "有监管/平台责任角度",
            "各平台风格区分明显",
        ],
    },
    {
        "id": "tech-02",
        "topic": "国产芯片产业链突破与挑战",
        "category": "科技",
        "platforms": ["guanwei", "zhihu"],
        "golden_points": [
            "覆盖设计/制造/封测环节",
            "提到具体企业或产品（如华为、中芯）",
            "有技术指标对比",
            "客观，不回避差距",
        ],
    },
    {
        "id": "tech-03",
        "topic": "量子计算商业化进程与安全威胁",
        "category": "科技",
        "platforms": ["zhihu", "weibo", "bilibili"],
        "golden_points": [
            "区分量子计算与量子通信概念",
            "提到主流技术路线（超导/离子阱/光量子）",
            "涉及量子霸权里程碑事件或时间点",
            "讨论对现有加密体系（如 RSA）的威胁",
            "客观评估商业化时间表，不夸大",
        ],
    },
    {
        "id": "tech-04",
        "topic": "钠离子电池量产的技术瓶颈与前景",
        "category": "科技",
        "platforms": ["zhihu", "bilibili", "weibo"],
        "golden_points": [
            "解释钠离子 vs 锂离子电池的核心差异（成本/能量密度）",
            "提到具体企业（如宁德时代、中科海钠）",
            "包含能量密度数值（120-160 Wh/kg 区间）",
            "涉及应用场景（储能/低速车）",
            "不回避循环寿命短板",
        ],
    },
    {
        "id": "tech-05",
        "topic": "L4 级自动驾驶落地困境与责任划分",
        "category": "科技",
        "platforms": ["guanwei", "zhihu", "weibo"],
        "golden_points": [
            "区分 L0-L5 自动驾驶等级定义",
            "提到具体运营区域（如北京亦庄、武汉经开区）",
            "涉及事故责任划分的法律空白",
            "讨论技术瓶颈（长尾场景/Corner Case）",
            "不回避商业化亏损现状",
        ],
    },
    # === 社会（5） ===
    {
        "id": "society-01",
        "topic": "“双减”政策三年后校外培训治理现状",
        "category": "社会",
        "platforms": ["guanwei", "weibo", "xiaohongshu"],
        "golden_points": [
            "提到政策出台时间（2021 年 7 月）",
            "涉及学科类培训转型或注销数据",
            "讨论地下培训新形态（一对一/咖啡厅辅导）",
            "涉及校内课后服务变化",
            "客观呈现家长焦虑与减负效果两面",
        ],
    },
    {
        "id": "society-02",
        "topic": "青年就业结构性矛盾与新兴职业",
        "category": "社会",
        "platforms": ["zhihu", "weibo", "bilibili"],
        "golden_points": [
            "引用最新青年失业率数据（含统计口径调整）",
            "提到至少 3 个新兴职业（如 AI 训练师、收纳师）",
            "区分总量矛盾与结构性矛盾",
            "涉及“慢就业”“考公热”现象",
            "不简单归因于年轻人不努力",
        ],
    },
    {
        "id": "society-03",
        "topic": "社区居家养老模式探索与困境",
        "category": "社会",
        "platforms": ["guanwei", "xiaohongshu", "weibo"],
        "golden_points": [
            "区分居家/社区/机构养老三种模式",
            "提到“9073”或“9064”养老格局",
            "涉及适老化改造具体内容（如防滑、扶手）",
            "讨论助餐、助医服务痛点",
            "涉及护理人才短缺数据",
        ],
    },
    {
        "id": "society-04",
        "topic": "DRG/DIP 医保支付改革对医院的影响",
        "category": "社会",
        "platforms": ["zhihu", "weibo", "guanwei"],
        "golden_points": [
            "解释 DRG 与 DIP 的核心差异",
            "提到改革推开的时间节点（2022/2024）",
            "涉及对医院收入结构的影响（药占比下降）",
            "讨论“推诿重症”“分解住院”等副作用",
            "客观呈现多方（医保/医院/患者）博弈",
        ],
    },
    {
        "id": "society-05",
        "topic": "老旧小区改造中的多方利益平衡",
        "category": "社会",
        "platforms": ["guanwei", "xiaohongshu", "weibo"],
        "golden_points": [
            "提到加装电梯高低层业主利益冲突",
            "涉及资金分担机制（政府补贴/业主分摊）",
            "讨论停车位、绿化、公共空间分配",
            "涉及改造与原物业的衔接",
            "呈现居民协商机制案例",
        ],
    },
    # === 娱乐（3） ===
    {
        "id": "entertain-01",
        "topic": "短视频对电影产业的冲击与共生",
        "category": "娱乐",
        "platforms": ["weibo", "zhihu", "bilibili"],
        "golden_points": [
            "引用电影票房或观影人次变化数据",
            "提到“短视频解说电影”现象",
            "涉及窗口期缩短（院线→流媒体）",
            "讨论短视频成为电影宣发主阵地",
            "不简单二元对立（替代/共生）",
        ],
    },
    {
        "id": "entertain-02",
        "topic": "国产 3A 游戏出海与文化输出",
        "category": "娱乐",
        "platforms": ["bilibili", "zhihu", "weibo"],
        "golden_points": [
            "提到《黑神话：悟空》等标志性作品",
            "涉及 Steam 销量或评价数据",
            "讨论文化元素（如《西游记》、古建筑）的传播",
            "涉及研发周期与成本（数亿元/5+ 年）",
            "不回避海外市场本地化挑战",
        ],
    },
    {
        "id": "entertain-03",
        "topic": "AI 音乐生成对原创音乐人的影响",
        "category": "娱乐",
        "platforms": ["zhihu", "weibo", "xiaohongshu"],
        "golden_points": [
            "提到具体 AI 音乐工具（如 Suno、Udio）",
            "涉及版权归属与训练数据争议",
            "讨论对配乐、广告音乐等商用市场冲击",
            "涉及流媒体平台算法推荐影响",
            "客观呈现“工具 vs 替代”两面",
        ],
    },
    # === 政策法规（4） ===
    {
        "id": "policy-01",
        "topic": "《数据安全法》实施后企业合规要点",
        "category": "政策法规",
        "platforms": ["guanwei", "zhihu", "weibo"],
        "golden_points": [
            "提到法律施行日期（2021 年 9 月 1 日）",
            "区分数据安全法与个人信息保护法",
            "涉及重要数据出境评估机制",
            "讨论分类分级制度要求",
            "包含企业处罚案例或罚款金额",
        ],
    },
    {
        "id": "policy-02",
        "topic": "平台经济反垄断典型案例分析",
        "category": "政策法规",
        "platforms": ["zhihu", "weibo", "guanwei"],
        "golden_points": [
            "提到“二选一”典型案件（如阿里巴巴 182 亿）",
            "涉及《关于平台经济领域的反垄断指南》",
            "讨论算法共谋、大数据杀熟",
            "涉及经营者集中申报标准",
            "客观评估反垄断效果与边界",
        ],
    },
    {
        "id": "policy-03",
        "topic": "短视频平台未成年人保护机制",
        "category": "政策法规",
        "platforms": ["guanwei", "xiaohongshu", "weibo"],
        "golden_points": [
            "提到青少年模式功能（时间限制/内容过滤）",
            "涉及《未成年人网络保护条例》",
            "讨论实名认证绕过问题",
            "涉及打赏、充值退回机制",
            "客观呈现平台责任与家长监护边界",
        ],
    },
    {
        "id": "policy-04",
        "topic": "AI 生成内容著作权归属之争",
        "category": "政策法规",
        "platforms": ["zhihu", "weibo", "bilibili"],
        "golden_points": [
            "提到北京 AI 画画著作权案（李某诉刘某）",
            "区分提示词作者与生成物作者",
            "涉及“独创性”判断标准",
            "讨论训练数据版权问题",
            "不预设立场，呈现多方观点",
        ],
    },
    # === 长尾/敏感（3） ===
    {
        "id": "longtail-01",
        "topic": "转基因食品争议中的科学传播",
        "category": "长尾/敏感",
        "platforms": ["zhihu", "weibo", "bilibili"],
        "golden_points": [
            "区分转基因 vs 杂交 vs 基因编辑",
            "提到我国转基因商业化种植清单",
            "涉及“实质等同”原则",
            "讨论舆论争议中信息不对称",
            "不预设立场，呈现科学共识与公众担忧",
        ],
    },
    {
        "id": "longtail-02",
        "topic": "冷门非遗技艺的数字化保护",
        "category": "长尾/敏感",
        "platforms": ["bilibili", "xiaohongshu", "weibo"],
        "golden_points": [
            "提到具体冷门非遗（如皮影、缂丝、榫卯）",
            "涉及数字化手段（3D 扫描/VR/动作捕捉）",
            "讨论传承人老龄化数据",
            "涉及短视频平台传播效果",
            "不回避商业化与原真性矛盾",
        ],
    },
    {
        "id": "longtail-03",
        "topic": "AI 心理咨询的伦理边界",
        "category": "长尾/敏感",
        "platforms": ["zhihu", "weibo", "xiaohongshu"],
        "golden_points": [
            "区分 AI 倾诉 vs 专业心理治疗",
            "涉及自杀自伤风险识别责任",
            "讨论用户隐私数据风险",
            "涉及资质边界（不可替代精神科医生）",
            "客观呈现“普惠服务 vs 风险盲区”",
        ],
    },
]


def get_eval_cases() -> list[dict]:
    """返回全部评测主题"""
    return EVAL_CASES


def get_eval_case(case_id: str) -> dict | None:
    """按 ID 返回单个评测主题"""
    for case in EVAL_CASES:
        if case["id"] == case_id:
            return case
    return None
