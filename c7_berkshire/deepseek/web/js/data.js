/* 历史决策数据：只讲历史，不涉及当下买卖任何股票。
   引用原文均来自任务提供的致股东信；每处不超过两句。 */
window.DECISIONS = [
  {
    id: 1,
    year: "1967",
    kicker: "从纺织到保险",
    title: "一家快倒闭的纺织厂，和一家待售的保险公司",
    situation: "1965 年，巴菲特合伙公司取得伯克希尔的控制权。它是一家新英格兰纺织企业，生意越来越难做，账上的现金却还能被重新配置。1967 年，奥马哈的国民赔偿公司（National Indemnity）待售，价格 860 万美元。",
    options: [
      { key: "A", label: "继续加码纺织", desc: "买新织机、扩产能，把纺织当成主业。", weight: 0.12, traits: ["能力圈"], verdict: "留在纺织，是把资本继续绑在一个没有定价权的商品生意上。" },
      { key: "B", label: "买下国民赔偿，转向保险", desc: "用纺织产生的现金买下保险公司，把浮存金拿去投资。", weight: 1.0, traits: ["资本配置", "长期主义"], verdict: "把资本从纺织转向保险浮存金，是伯克希尔真正的起点。" },
      { key: "C", label: "把多余现金分掉", desc: "不扩张，也不收购，直接把钱还给股东。", weight: 0.25, traits: ["资本配置", "风险控制"], verdict: "分红能取悦股东，但放弃了用浮存金复利的机会。" }
    ],
    actual: "B",
    actualTitle: "买下国民赔偿，把资源转向保险",
    why: "纺织是商品生意，设备、人工、价格都由行业决定，管理层再努力也很难获得超额回报。保险不一样：先收保费、后付赔款，中间形成可以投资的浮存金；只要承保不亏，这笔钱就是负成本的长期资金。国民赔偿有承保纪律，也有巴菲特熟悉的奥马哈网络。",
    quoteEn: "And then came a stroke of good luck: National Indemnity became available in 1967, and we shifted our resources toward insurance and other non-textile operations.",
    quoteZh: "然后好运来了：国民赔偿公司在 1967 年待售，我们把资源转向保险和其他非纺织业务。",
    quoteSrc: "2022 年致股东信 ·《58 Years》",
    outcome: "浮存金从 1967 年的起点增长到 2025 年的约 1,760 亿美元；保险成为伯克希尔的资本引擎。",
    source: "2021 年致股东信 p.5；2022 年致股东信《58 Years》"
  },
  {
    id: 2,
    year: "1972",
    kicker: "为品质付一次价",
    title: "喜诗糖果：3 倍有形资产，买不买？",
    situation: "喜诗糖果（See's Candies）年销售额 3,000 万美元，税前利润不到 500 万美元，经营所需的有形资本只有 800 万美元。卖方要价 3,000 万美元，巴菲特给自己定的上限是 2,500 万。",
    options: [
      { key: "A", label: "拒绝：3 倍有形资产太贵", desc: "按格雷厄姆的标准，超过净资产的报价不碰。", weight: 0.30, traits: ["风险控制", "能力圈"], verdict: "用有形资产做标尺，会错过品牌、定价权和低再投资需求带来的复利。" },
      { key: "B", label: "砍到 2,500 万，买下", desc: "接受溢价，但坚持自己的价格上限。", weight: 1.0, traits: ["能力圈", "长期主义"], verdict: "你买的是品牌、定价权和一门几乎不需要再投入的生意。" },
      { key: "C", label: "拿同样的钱买估值更低的纺织厂", desc: "买“看起来估值低”的资产，继续留在熟悉的制造业。", weight: 0.10, traits: ["风险控制", "资本配置"], verdict: "低估值但资本密集的资产，往往需要更多资本才能维持，回报率并不高。" }
    ],
    actual: "B",
    actualTitle: "以 2,500 万美元买下喜诗",
    why: "喜诗的价值不在厂房和设备，而在品牌、配方、门店网络和顾客心智。它每年能提价、能卖出现金、几乎不需要新增资本，税前回报率高达 60%。巴菲特后来承认，如果卖家坚持 3,000 万，他可能真的会错过；这笔交易让他从“捡烟蒂”转向“为品质付合理价格”。",
    quoteEn: "We bought See’s for $25 million when its sales were $30 million and pre-tax earnings were less than $5 million. The capital then required to conduct the business was $8 million.",
    quoteZh: "我们以 2,500 万美元买下喜诗，当时销售额 3,000 万美元、税前利润不到 500 万美元。经营这门生意所需的资本是 800 万美元。",
    quoteSrc: "2007 年致股东信 ·《See’s Candy》",
    outcome: "2007 年销售额 3.83 亿美元、税前利润 8,200 万美元；1972 年以来累计税前利润约 13.5 亿美元，只需再投入 3,200 万美元。",
    source: "2007 年致股东信《See’s Candy》"
  },
  {
    id: 3,
    year: "1976",
    kicker: "在恐惧里看见成本优势",
    title: "GEICO 快破产了，你敢买吗？",
    situation: "GEICO 在 1970 年代因准备金不足、定价错误陷入危机，1976 年濒临破产，股价暴跌。它的直接获客模式仍然拥有同业难以复制的成本优势；Jack Byrne 刚刚接手重整。",
    options: [
      { key: "A", label: "远离：保险公司快破产了", desc: "准备金黑洞看不清，先保住本金。", weight: 0.20, traits: ["风险控制"], verdict: "风险控制没错，但“看不清”有时是因为没有研究它的成本结构。" },
      { key: "B", label: "买入约 1/3，支持重整", desc: "在恐慌中买入大比例股权，但不干预经营。", weight: 1.0, traits: ["逆向思维", "能力圈", "长期主义"], verdict: "你在市场最恐惧的时候，买下了一个仍然完好的成本优势。" },
      { key: "C", label: "买下 100%，自己管", desc: "趁低估值直接控股，把公司纳入伯克希尔。", weight: 0.25, traits: ["资本配置", "风险控制"], verdict: "控股会带来整合与监管复杂度；先做重要股东，是更轻的下注方式。" }
    ],
    actual: "B",
    actualTitle: "买入约三分之一，支持 Jack Byrne 重整",
    why: "巴菲特 1951 年就研究过 GEICO，知道它的直销模式能省掉代理人成本。危机的原因是准备金和定价，不是商业模式本身；只要管理层纠正错误，成本优势还在。由于保险监管要求投票权交给独立方，伯克希尔当时只做财务投资者，但这并不影响经济价值。",
    quoteEn: "GEICO represents the best of all investment worlds - the coupling of a very important and very hard to duplicate business advantage with an extraordinary management whose skills in operations are matched by skills in capital allocation.",
    quoteZh: "GEICO 代表了所有投资世界中最好的组合——一项非常重要且极难复制的商业优势，加上一位在运营和资本配置上同样出色的非凡管理者。",
    quoteSrc: "1980 年致股东信 · GEICO 部分",
    outcome: "1996 年以 23 亿美元买下剩余 49%；GEICO 成为核心保险资产，2025 年税前承保利润 68.24 亿美元。",
    source: "1980 年致股东信 p.14；1996 年致股东信；2004 年致股东信"
  },
  {
    id: 4,
    year: "1985",
    kicker: "承认错误，关掉纺织厂",
    title: "已经投了二十年，还要再投一笔吗？",
    situation: "伯克希尔的纺织业务在 1965—1985 年间反复亏损。管理层多次追加设备投资，希望能降本、提效，但海外竞争和行业过剩让回报始终低于资本成本。1985 年，巴菲特必须决定：再投一次，还是关掉。",
    options: [
      { key: "A", label: "再投一笔，赌效率提升", desc: "买更先进的设备，相信规模和管理能扭转局面。", weight: 0.08, traits: ["能力圈"], verdict: "在商品行业里，用更多资本去追一个不存在的成本优势，是最贵的坚持。" },
      { key: "B", label: "关掉纺织厂，卖设备", desc: "停止失血，把资本转向保险和收购。", weight: 1.0, traits: ["纠错", "资本配置"], verdict: "承认沉没成本不是资产，把资本从低回报处拿走，是这次决定的核心。" },
      { key: "C", label: "卖给管理层或同行", desc: "找一个买家接盘，保留体面。", weight: 0.30, traits: ["资本配置", "风险控制"], verdict: "卖厂比关厂体面，但买家也清楚这门生意的回报，价格不会好看。" }
    ],
    actual: "B",
    actualTitle: "1985 年 7 月决定关闭纺织业务",
    why: "纺织是典型商品生意：产品同质、价格由全球供需决定、设备更新只会把更多资本锁进低回报资产。巴菲特在信里承认，自己早年因为“感情”和“希望”而没有及时退出；关掉工厂虽然痛苦，但释放出的资本可以在保险和其他收购里获得更高回报。",
    quoteEn: "In July we decided to close our textile operation, and by yearend this unpleasant job was largely completed.",
    quoteZh: "7 月我们决定关闭纺织业务，到年底这项不愉快的工作基本完成。",
    quoteSrc: "1985 年致股东信 ·《Shutdown of Textile Business》",
    outcome: "纺织退出释放了资本；巴菲特后来承认应更早退出，这是伯克希尔最重要的一次纠错。",
    source: "1985 年致股东信《Shutdown of Textile Business》"
  },
  {
    id: 5,
    year: "1988",
    kicker: "等了 52 年的一口可乐",
    title: "可口可乐：看过一辈子，什么时候买？",
    situation: "1980 年代，Roberto Goizueta 把可口可乐重新聚焦在浓缩液、品牌和全球市场，海外销售加速。1987 年股灾后，市场给了机会。巴菲特从 1936 年就开始卖可乐，却整整 52 年没有买过它的股票。",
    options: [
      { key: "A", label: "继续不买：消费股增长慢", desc: "它太成熟了，不如去找更快的生意。", weight: 0.15, traits: ["风险控制", "能力圈"], verdict: "成熟不等于没有复利；全球品牌和定价权可以在很长时间里慢慢滚。" },
      { key: "B", label: "大举买入，长期持有", desc: "在股灾后建仓，把可口可乐当成“永久持股”。", weight: 1.0, traits: ["长期主义", "能力圈"], verdict: "你买的是全球品牌、定价权和一代代消费者，而不是下一季度的销量。" },
      { key: "C", label: "买百事：估值更低", desc: "同样的赛道，选估值更低的那个。", weight: 0.35, traits: ["风险控制", "资本配置"], verdict: "低估值往往有原因；品牌强度、全球分销和资本回报才是长期变量。" }
    ],
    actual: "B",
    actualTitle: "1988 年大举买入，并长期持有",
    why: "可口可乐的配方、品牌和全球分销网络构成了极难复制的护城河。Goizueta 把公司从多元化的泥潭里拉回浓缩液主业，利润率、资本回报和海外增长同时改善。巴菲特在 1987 年股灾后买入，1988 年末持有 1,417 万股，1989 年末增至 2,335 万股。",
    quoteEn: "Only in the summer of 1988 did my brain finally establish contact with my eyes. What I then perceived was both clear and fascinating.",
    quoteZh: "直到 1988 年夏天，我的大脑才终于和眼睛建立了联系。我当时看到的东西既清晰又迷人。",
    quoteSrc: "1989 年致股东信 · Coca-Cola 部分",
    outcome: "成为伯克希尔“四大巨头”之一；2025 年末 4 亿股，成本 12.99 亿美元，市值 279.64 亿美元，年分红 8.16 亿美元。",
    source: "1989 年致股东信 p.14；2025 年致股东信 p.15"
  },
  {
    id: 6,
    year: "1998",
    kicker: "用股票买下再保险巨头",
    title: "General Re：220 亿美元，用现金还是用股票？",
    situation: "General Re 是美国最大的财产险再保险公司之一，业务遍及全球。1998 年，伯克希尔决定收购它，价格约 220 亿美元。当时伯克希尔的股价很高，用股票支付看起来“划算”；但股票也是真实的货币。",
    options: [
      { key: "A", label: "用现金慢慢买", desc: "不稀释股东，靠自有现金和分红完成。", weight: 0.35, traits: ["资本配置", "风险控制"], verdict: "现金更保守，但 220 亿美元的规模，靠自有现金很难一口气完成。" },
      { key: "B", label: "用伯克希尔股票换股", desc: "用高估值的股票作为货币，迅速完成大并购。", weight: 1.0, traits: ["资本配置", "长期主义"], verdict: "你用股票买到了全球再保险网络，但也把未来的复利分了一部分出去。" },
      { key: "C", label: "放弃：再保险周期不好", desc: "价格竞争激烈，等周期转好再说。", weight: 0.30, traits: ["风险控制"], verdict: "周期判断可能对，但也会错过建立全球再保险平台的时间窗口。" }
    ],
    actual: "B",
    actualTitle: "以约 220 亿美元换股并购 General Re",
    why: "General Re 给伯克希尔带来全球再保险的分销网络、承保人才和浮存金；伯克希尔则能给 General Re 提供不受公开市场短期波动约束的资本结构，让它承担更多波动、保留更多业务。用股票支付，是因为当时伯克希尔的股票被市场给了很高的估值，但这也意味着原有股东让出了一部分未来。",
    quoteEn: "On December 21, we completed our $22 billion acquisition of General Re Corp. But the most compelling reason for the merger is simply that General Re’s outstanding management can now do what it does best, unfettered by the constraints that have limited its growth.",
    quoteZh: "12 月 21 日，我们完成了对 General Re 的 220 亿美元收购。但合并最令人信服的理由很简单：General Re 出色的管理层现在可以不受限制地做他们最擅长的事。",
    quoteSrc: "1998 年致股东信 · General Re 部分",
    outcome: "整合初期承保与准备金问题频出，巴菲特一度自认“巨大错误”；2014 年称其已“成为宝石”。这笔交易也提醒：股票作为货币，并不低廉。",
    source: "1998 年致股东信《General Re》；2014 年致股东信"
  },
  {
    id: 7,
    year: "2008",
    kicker: "在冰冻的市场里提供资本",
    title: "金融危机：拿着现金，还是开条件？",
    situation: "2008 年秋天，信用市场冻结，Wrigley、Goldman Sachs、General Electric 等大公司急需资本。伯克希尔年初持有 443 亿美元现金等价物。巴菲特可以选择继续持币、买普通股，或者设计一种“高收益 + 股权参与”的交易。",
    options: [
      { key: "A", label: "持有现金，等估值更低", desc: "危机还没见底，现金为王。", weight: 0.30, traits: ["风险控制"], verdict: "现金能保命，但也可能错过别人最需要资本时给出的优厚条件。" },
      { key: "B", label: "买普通股抄底", desc: "直接买股票，赌市场反弹。", weight: 0.45, traits: ["逆向思维", "风险控制"], verdict: "普通股上行空间大，但没有下行保护，也没有谈判筹码。" },
      { key: "C", label: "买优先证券 + 股权参与", desc: "提供资本，换取高当前收益和认股权/转股权。", weight: 1.0, traits: ["逆向思维", "资本配置", "风险控制"], verdict: "你在别人最缺钱的时候提供资本，拿到了收益、保护和上行参与。" }
    ],
    actual: "C",
    actualTitle: "145 亿美元固定收益证券，附带股权参与",
    why: "伯克希尔要的不是“抄底”的快感，而是风险可控的回报：优先证券提供高当前收益率和清偿顺序，认股权证或转股权提供上行。对发行人来说，伯克希尔的钱到账快、不附加融资条件，这是稀缺品。对伯克希尔来说，即便股价不涨，利息也足够体面。",
    quoteEn: "On the plus side last year, we made purchases totaling $14.5 billion in fixed-income securities issued by Wrigley, Goldman Sachs and General Electric. We never want to count on the kindness of strangers in order to meet tomorrow’s obligations.",
    quoteZh: "去年好的一面是，我们购买了 145 亿美元由 Wrigley、Goldman Sachs 和 General Electric 发行的固定收益证券。我们永远不想在满足明天义务时依赖陌生人的仁慈。",
    quoteSrc: "2008 年致股东信 · Fixed-income investments",
    outcome: "三家后来都以溢价赎回；2011 年合计赎回 128 亿美元，此前每年贡献约 12 亿美元税前收益。",
    source: "2008 年致股东信 p.13；2010 年致股东信 p.17；2011 年致股东信 p.4"
  },
  {
    id: 8,
    year: "2009",
    kicker: "把现金变成一条铁路",
    title: "BNSF：已经持有 22.5%，要不要全买下来？",
    situation: "伯克希尔已经持有 BNSF 22.5% 的股份。2009 年，巴菲特决定以每股 100 美元买下剩余部分，总对价约 260 亿美元：其中约 40% 用伯克希尔股票支付、60% 用现金；加上此前用现金买入的 22.5%，整体约 30% 的成本用股票支付，现金约 220 亿美元。铁路是资本密集型的基础设施，回报不快，但很长久。",
    options: [
      { key: "A", label: "保持 22.5% 少数股权", desc: "已经够了，不必把这么多现金锁进铁路。", weight: 0.30, traits: ["能力圈"], verdict: "少数股权也能分享成长，但无法把 BNSF 的现金流全部纳入伯克希尔的配置池。" },
      { key: "B", label: "用现金 + 股票买下全部", desc: "把 BNSF 变成全资子公司，长期持有。", weight: 1.0, traits: ["资本配置", "长期主义", "能力圈"], verdict: "你把一大笔现金换成了不可替代的基础设施，也承担了资本开支的重。" },
      { key: "C", label: "等经济复苏再买", desc: "危机里先保住现金，等运费和 volume 回升。", weight: 0.20, traits: ["风险控制", "逆向思维"], verdict: "等复苏会降低不确定性，但价格也会跟着回升。" }
    ],
    actual: "B",
    actualTitle: "以 100 美元/股买下 BNSF，约 30% 用股票支付",
    why: "BNSF 是美国西部的干线铁路，网络、路权和线路位置很难复制；铁路运输的能源效率、土地占用和监管属性，使它更像受监管的基础设施。巴菲特把 BNSF 和 BHE 放在一起看：两者都需要长期、巨额的资本开支，也都提供社会必需的服务。用一部分股票支付，是在“不想过度稀释”和“不想错过”之间做的折中。",
    quoteEn: "In the end, Charlie and I decided that the disadvantage of paying 30% of the price through stock was offset by the opportunity the acquisition gave us to deploy $22 billion of cash in a business we understood and liked for the long term. But the final decision was a close one.",
    quoteZh: "最终，Charlie 和我决定，用 30% 的价格以股票支付的缺点，被这个机会抵消了——把 220 亿美元现金投入一家我们理解并长期看好的企业。但最终决定是艰难的。",
    quoteSrc: "2009 年致股东信 · BNSF 部分",
    outcome: "BNSF 成为伯克希尔最大非保险业务之一；2025 年税后利润 54.76 亿美元、营收 233.50 亿美元，但资本开支也很重。",
    source: "2009 年致股东信《BNSF》；2025 年 10-K p.K-42"
  },
  {
    id: 9,
    year: "2011",
    kicker: "一次走出能力圈的尝试",
    title: "IBM：科技股，买不买？",
    situation: "2011 年，IBM 拥有庞大的企业客户、稳定的软件与服务收入，以及持续回购股票的习惯。巴菲特一直说自己不碰科技股，但 IBM 的客户黏性和资本回报看起来更像“企业基础设施”。伯克希尔买入 6,390 万股，成本 109 亿美元，约 5.5% 股权。",
    options: [
      { key: "A", label: "不碰科技股，守住消费/金融", desc: "技术变化太快，不在能力圈里。", weight: 0.30, traits: ["风险控制", "能力圈"], verdict: "守住能力圈能避免大错，但也可能错过企业级科技的稳定现金流。" },
      { key: "B", label: "买入 IBM，押注黏性与回购", desc: "把 IBM 当成有护城河的企业服务公司。", weight: 1.0, traits: ["能力圈", "资本配置"], verdict: "你把 IBM 当成“企业基础设施”，但技术路线的变化比消费品牌更快。" },
      { key: "C", label: "买 Apple / Google 等消费科技", desc: "直接买更靠近消费者的科技巨头。", weight: 0.20, traits: ["能力圈", "逆向思维"], verdict: "消费科技的上行更大，但 2011 年的巴菲特还没有形成这套判断。" }
    ],
    actual: "B",
    actualTitle: "买入 IBM 约 5.5%，成本 109 亿美元",
    why: "IBM 的企业客户切换成本高，长期合同和软件服务带来可预测的现金流；公司用大量自由现金流回购股票，剩下股东的份额会自然增长。巴菲特在信里承认自己“来晚了”，但他认为 IBM 的护城河和资本回报足以抵消技术变化的担心。这笔投资后来成为他少见的科技股失误。",
    quoteEn: "As was the case with Coca-Cola in 1988 and the railroads in 2006, I was late to the IBM party. In the end, the success of our IBM investment will be determined primarily by its future earnings.",
    quoteZh: "就像 1988 年的可口可乐和 2006 年的铁路一样，我进入 IBM 派对太晚了。最终，我们 IBM 投资的成功主要取决于它未来的盈利。",
    quoteSrc: "2011 年致股东信 · IBM 部分",
    outcome: "IBM 后来在云计算转型中增长乏力，这笔投资没有达到信中设想；它成了巴菲特少见的科技股失误。",
    source: "2011 年致股东信《IBM》；后见为公开史实"
  },
  {
    id: 10,
    year: "2019—2020",
    kicker: "用日元买日本商社",
    title: "五家日本商社：要不要用日元债去买？",
    situation: "伊藤忠、丸红、三菱、三井、住友是五家高度多元化的日本综合商社，业务遍布能源、金属、食品、零售和基础设施。它们估值不高、分红慷慨、回购积极。伯克希尔有大量美元现金，也可以在日本发行低息日元债。",
    options: [
      { key: "A", label: "继续持现金/买美国指数", desc: "日本公司治理复杂，不如留在熟悉的市场。", weight: 0.25, traits: ["风险控制", "能力圈"], verdict: "留在熟悉市场没错，但也会错过用低成本日元负债买高分红资产的机会。" },
      { key: "B", label: "用日元债融资，买入五家并长期持有", desc: "每家约 5% 起步，后来提高到约 9%，承诺不超过 9.9%。", weight: 1.0, traits: ["逆向思维", "资本配置", "长期主义"], verdict: "你用负债的币种匹配资产的币种，把汇率风险降下来，同时买到一组分散的现金流。" },
      { key: "C", label: "只买一家，集中押注", desc: "选一家最看好的商社重仓。", weight: 0.35, traits: ["能力圈", "资本配置"], verdict: "集中可能提高回报，但也放弃了五家商社之间的分散和比较。" }
    ],
    actual: "B",
    actualTitle: "2019 年 7 月开始买入，2023 年持股约 9%",
    why: "五家商社的生意模式类似伯克希尔：高度分散、现金流稳定、管理层谨慎、股东友好。它们的估值低、分红高，伯克希尔又能在日本以很低的利率发行日元债，用日元负债匹配日元资产，汇率风险自然下降。巴菲特和 Abel 在 2023 年去东京与管理层见面，并把持股提高到约 9%，同时承诺不超过 9.9%。",
    quoteEn: "In certain important ways, all five companies – Itochu, Marubeni, Mitsubishi, Mitsui and Sumitomo – follow shareholder-friendly policies that are much superior to those customarily practiced in the U.S. Therefore, Berkshire has financed most of its Japanese position with the proceeds from ¥1.3 trillion of bonds.",
    quoteZh: "在某些重要方面，这五家公司——伊藤忠、丸红、三菱、三井、住友——奉行的股东友好政策远优于美国通常的做法。因此，伯克希尔用 1.3 万亿日元债券的收益为大部分日本头寸融资。",
    quoteSrc: "2023 年致股东信 · 日本商社部分",
    outcome: "2023 年末美元口径未实现收益约 61%（80 亿美元）；2025 年末五家市值 353.68 亿美元、年分红 8.62 亿美元。",
    source: "2023 年致股东信；2025 年致股东信 p.15"
  }
];

window.LEDGER = [
  { label: "2025 年营运利润", value: "444.86", unit: "亿美元", note: "2024 年 474.37 亿；同比 -6.2%" },
  { label: "2025 年末保险浮存金", value: "1,764", unit: "亿美元", note: "2026H1 为 1,775 亿" },
  { label: "2025 年末现金 + 短债", value: "3,733", unit: "亿美元", note: "合并口径；2026H1 为 3,655 亿" },
  { label: "2025 年末股票组合", value: "2,978", unit: "亿美元", note: "2026H1 为 3,238 亿" },
  { label: "2025 年每股账面价值", value: "498,823", unit: "美元", note: "2026H1 为 522,396 美元" },
  { label: "2025 年回购", value: "0", unit: "亿美元", note: "2026H1 为 44.44 亿（公告约 48 亿）" }
];

/* 把正确答案轮换到 A/B/C 不同位置，避免“总是 B”的节奏。
   选项内容、权重、标签不变，只重排显示顺序并重新编号。 */
(function normalizeOptionOrder() {
  const pattern = [0, 1, 2, 0, 1, 2, 0, 1, 2, 0];
  window.DECISIONS.forEach((d, i) => {
    const actual = d.options.find(o => o.key === d.actual);
    const others = d.options.filter(o => o !== actual);
    const pos = pattern[i % pattern.length];
    const arr = others.slice();
    arr.splice(pos, 0, actual);
    d.options = arr.map((o, j) => Object.assign({}, o, { key: "ABC"[j] }));
    d.actual = "ABC"[pos];
  });
})();
