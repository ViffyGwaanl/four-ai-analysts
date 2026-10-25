export const DIMENSIONS = ["商业质量", "价格纪律", "风险边界", "长期耐心"];

export const GAME_DATA = [
  {
    "id": 1,
    "year": 1972,
    "title": "一颗糖果，值多少经济商誉？",
    "kicker": "喜诗糖果｜为无形资产付费",
    "context": "1972年，喜诗糖果年销售约3000万美元、税前利润不足500万美元，经营所需资本约800万美元。卖方要价3000万美元，而你坚持不超过2500万美元。行业增长并不快，你会怎么做？",
    "options": [
      {
        "title": "只按有形资产砍价",
        "desc": "无形资产难以丈量，价格必须贴近可辨认资产。",
        "score": 45,
        "dims": [
          55,
          90,
          65,
          40
        ]
      },
      {
        "title": "不超过2500万美元买下",
        "desc": "为持久品牌与定价权付费，同时守住价格上限。",
        "score": 100,
        "dims": [
          95,
          90,
          85,
          100
        ]
      },
      {
        "title": "行业不增长，直接放弃",
        "desc": "只有高销量增长才值得投入资本。",
        "score": 30,
        "dims": [
          40,
          70,
          55,
          25
        ]
      }
    ],
    "actual": 1,
    "actual_text": "通过Blue Chip Stamps以2500万美元买入喜诗。卖方最终接受了这一上限；巴菲特后来承认，自己险些因价格坚持而错失它。",
    "why": "关键不是糖果销量能否高速增长，而是品牌带来的定价权，以及利润增长时是否需要同比例追加资本。这是从“便宜资产”走向“优质企业”的重要一课。",
    "quote": "We bought See’s for $25 million when its sales were $30 million and pre-tax earnings were less than $5 million. The capital then required to conduct the business was $8 million.",
    "quote_year": 2007,
    "source": "材料/股东信/2007ltr.pdf，Dream Businesses / See’s Candy段",
    "lesson": "经济商誉：持久的定价权 + 较低的增量资本需求。",
    "shape": "candy",
    "color": "#ff8d7a"
  },
  {
    "id": 2,
    "year": 1983,
    "title": "买店，还是买下这支管理团队？",
    "kicker": "内布拉斯加家具城｜与经营者同行",
    "context": "1983年，Rose Blumkin家族经营的一家约20万平方英尺门店，年销售已超过1亿美元。创始人已90岁，成本低、顾客价值突出，家族希望解决所有权传承。你会如何安排交易？",
    "options": [
      {
        "title": "买90%，家族继续经营",
        "desc": "保留家族10%，并向关键年轻家族经理授予另外10%的选择权。",
        "score": 100,
        "dims": [
          100,
          80,
          90,
          100
        ]
      },
      {
        "title": "买100%，总部接管",
        "desc": "获得完整控制权，再派新团队替换原有管理层。",
        "score": 35,
        "dims": [
          45,
          65,
          40,
          35
        ]
      },
      {
        "title": "创始人高龄，放弃",
        "desc": "把年龄当作否决项，不评估团队与企业文化。",
        "score": 25,
        "dims": [
          35,
          55,
          60,
          20
        ]
      }
    ],
    "actual": 0,
    "actual_text": "收购90%，给经营家族保留10%，并向关键年轻家族经理授予另外10%的选择权；Blumkin家族继续管理。",
    "why": "巴菲特买下的不仅是门店，更是难以复制的低价运营能力、顾客信任和经营者文化。交易结构让原来的主人仍然有动力继续创造价值。",
    "quote": "One question I always ask myself in appraising a business is how I would like, assuming I had ample capital and skilled personnel, to compete with it. I’d rather wrestle grizzlies than compete with Mrs. B and her progeny.",
    "quote_year": 1983,
    "source": "材料/股东信/1983ltr.html，Nebraska Furniture Mart段",
    "lesson": "优秀企业的价值，常常写在“谁在读懂顾客、谁在长期经营”里。",
    "shape": "store",
    "color": "#f7b955"
  },
  {
    "id": 3,
    "year": 1988,
    "title": "看了五十年，终于看见什么？",
    "kicker": "可口可乐｜理解之后再行动",
    "context": "1988年，这种饮料你早已熟悉数十年。1981年后新管理层重新聚焦经营，海外销售加速；但企业的优点也并非无人知晓。你会如何决策？",
    "options": [
      {
        "title": "只因市场都知道，继续等待",
        "desc": "人尽皆知的优点不可能形成可投框架。",
        "score": 45,
        "dims": [
          65,
          80,
          65,
          55
        ]
      },
      {
        "title": "做短线，先赚预期差",
        "desc": "以季度消息决定进出，不准备长期持有。",
        "score": 25,
        "dims": [
          40,
          45,
          35,
          10
        ]
      },
      {
        "title": "理解焕新后的企业，开始买入",
        "desc": "看见产品优势与管理层执行形成合力，以长期企业所有者方式行动。",
        "score": 100,
        "dims": [
          100,
          75,
          80,
          100
        ]
      }
    ],
    "actual": 2,
    "actual_text": "1988年夏开始买入，年末持有14,172,500股；1989年继续增至23,350,000股，1989年末披露成本约10.239亿美元。",
    "why": "重要的不是“从未听过这家公司”，而是何时真正理解产品与管理层组合的经济意义。巴菲特在信中还自嘲，自己本可以更早想明白。",
    "quote": "What I then perceived was both clear and fascinating. After drifting somewhat in the 1970's, Coca-Cola had in 1981 become a new company with the move of Roberto Goizueta to CEO.",
    "quote_year": 1989,
    "source": "材料/股东信/1989ltr.html，Common Stocks / Coca-Cola段",
    "lesson": "认知到位比动作新奇更重要；熟悉不等于理解。",
    "shape": "bottle",
    "color": "#ff7f77"
  },
  {
    "id": 4,
    "year": 1993,
    "title": "好公司，可以用股票随便换吗？",
    "kicker": "Dexter鞋业｜一堂事后复盘课",
    "context": "1993年，Dexter管理优秀，年产超过750万双鞋；但美国鞋业正面对低工资地区进口竞争。卖方不想要现金，更希望换得伯克希尔股票。你会怎么做？",
    "options": [
      {
        "title": "完全拒绝研究这个行业",
        "desc": "进口压力已经说明一切，不需要评估具体企业。",
        "score": 40,
        "dims": [
          45,
          70,
          80,
          45
        ]
      },
      {
        "title": "坚持用现金，否则不做",
        "desc": "避免交出伯克希尔的股权，把支付货币当作风险边界。",
        "score": 65,
        "dims": [
          70,
          85,
          90,
          65
        ]
      },
      {
        "title": "发行25,203股A股收购",
        "desc": "按当时披露约4.33亿美元，以伯克希尔股票完成交易。",
        "score": 100,
        "dims": [
          70,
          35,
          35,
          85
        ]
      }
    ],
    "actual": 2,
    "actual_text": "发行25,203股伯克希尔A股收购，披露成本约4.33亿美元。后来Dexter竞争优势消失，巴菲特把这笔交易称为当时最糟糕的交易。",
    "why": "这一题故意保留“契合不等于正确”：管理层优秀不等于竞争优势持久；用本身很优质的股票支付，又放大了误判的代价。",
    "quote": "Finally, I made an even worse mistake when I said “yes” to Dexter, a shoe business I bought in 1993 for $433 million in Berkshire stock (25,203 shares of A). What I had assessed as durable competitive advantage vanished within a few years.",
    "quote_year": 2007,
    "source": "材料/股东信/2007ltr.pdf，Acquisition Mistakes / Dexter段",
    "lesson": "既要问“得到的值多少”，也要问“交出去的到底值多少”。",
    "shape": "shoe",
    "color": "#b28cff"
  },
  {
    "id": 5,
    "year": 1995,
    "title": "已经持有一半，还要买下其余吗？",
    "kicker": "GEICO｜低成本飞轮",
    "context": "1995年，伯克希尔已持有GEICO约51%。这家汽车保险公司以低成本运营形成低价格、留住客户、再降低获客费用的循环；剩余49%需要约23亿美元。你会怎么做？",
    "options": [
      {
        "title": "收购剩余49%",
        "desc": "把已理解多年的低成本优势完整纳入保险主业。",
        "score": 100,
        "dims": [
          100,
          80,
          85,
          100
        ]
      },
      {
        "title": "维持51%，不再投入",
        "desc": "已经控制，额外持股不会增加经济价值。",
        "score": 45,
        "dims": [
          65,
          75,
          65,
          55
        ]
      },
      {
        "title": "卖掉原有持股",
        "desc": "保险利润有波动，因此不再承担承保风险。",
        "score": 25,
        "dims": [
          30,
          40,
          50,
          15
        ]
      }
    ],
    "actual": 0,
    "actual_text": "同意以约23亿美元收购剩余49%，交易于1996年1月2日完成，GEICO成为全资子公司。",
    "why": "低成本不是静态标签，而是能自我强化的经营系统。长期跟踪降低了理解企业的难度，全资持有也让伯克希尔完整获得浮存金与经营成果。",
    "quote": "GEICO's sustainable cost advantage is what attracted me to the company way back in 1951, when the entire business was valued at $7 million. It is also why I felt Berkshire should pay $2.3 billion last year for the 49% of the company that we didn't then own.",
    "quote_year": 1996,
    "source": "材料/股东信/1996ltr.html，Insurance—GEICO and Other Primary Operations",
    "lesson": "低成本飞轮：成本、价格、客户留存与获客费用彼此强化。",
    "shape": "shield",
    "color": "#54c9e8"
  },
  {
    "id": 6,
    "year": 2006,
    "title": "一封短笺，能不能通向跨国收购？",
    "kicker": "Iscar｜客户成功与管理者",
    "context": "2005年，你收到一封约1.25页的介绍信：一家在61个国家经营的切削工具家族企业正在考虑传承。你从未收购过美国以外的企业，管理层看起来非常出色。下一步怎么做？",
    "options": [
      {
        "title": "不熟的地域一律回避",
        "desc": "不把学习税务、法律与商业环境列入流程。",
        "score": 35,
        "dims": [
          45,
          60,
          75,
          40
        ]
      },
      {
        "title": "研究后买80%，家族留20%",
        "desc": "先补齐跨国知识，再以约40亿美元收购并保留经营团队。",
        "score": 100,
        "dims": [
          100,
          80,
          90,
          100
        ]
      },
      {
        "title": "买100%并迅速整合",
        "desc": "消除家族影响，用统一总部流程改造企业。",
        "score": 40,
        "dims": [
          50,
          65,
          45,
          40
        ]
      }
    ],
    "actual": 1,
    "actual_text": "先学习税务和司法管辖事项，再于2006年7月5日以约40亿美元收购Iscar 80%；Wertheimer家族保留20%并继续经营。",
    "why": "能力圈可以通过学习拓展，而不是靠跳过尽调拓展。小型耗材帮助昂贵机床提高生产率，客户越成功，企业自身也越有价值。",
    "quote": "The result: ISCAR makes money because it enables its customers to make more money. There is no better recipe for continued success.",
    "quote_year": 2006,
    "source": "材料/股东信/2006ltr.pdf，Acquisitions / ISCAR段",
    "lesson": "好产品让客户更赚钱；好交易让原团队愿意继续留下。",
    "shape": "tool",
    "color": "#7ed6a5"
  },
  {
    "id": 7,
    "year": 2008,
    "title": "风暴中，现金要不要上场？",
    "kicker": "危机投资｜收益与安全边际",
    "context": "2008年金融市场承压， Wrigley、Goldman Sachs与General Electric能提供高当前收益率的固定收益工具，并附带额外股权参与。你拥有充足现金，但未来仍充满不确定性。",
    "options": [
      {
        "title": "全部现金，不做任何承诺",
        "desc": "只要环境不确定，就把等待本身当作唯一答案。",
        "score": 55,
        "dims": [
          55,
          80,
          95,
          70
        ]
      },
      {
        "title": "借款放大这类机会",
        "desc": "收益率已经很高，再加杠杆追求更大结果。",
        "score": 10,
        "dims": [
          45,
          30,
          0,
          20
        ]
      },
      {
        "title": "投入145亿美元，仍保留充裕现金",
        "desc": "要求高当前收益率与股权参与，同时不以牺牲流动性为代价。",
        "score": 100,
        "dims": [
          85,
          95,
          100,
          90
        ]
      }
    ],
    "actual": 2,
    "actual_text": "2008年合计投入145亿美元购买Wrigley、Goldman Sachs和General Electric的固定收益工具，并获得额外股权参与；同时坚持保留充裕现金。",
    "why": "危机本身不是行动理由，条款才是。高当前收益率提供基础回报，股权参与提供额外可能，而流动性底线避免把明天寄托于外部融资。",
    "quote": "On the plus side last year, we made purchases totaling $14.5 billion in fixed-income securities issued by Wrigley, Goldman Sachs and General Electric. We very much like these commitments, which carry high current yields that, in themselves, make the investments more than satisfactory.",
    "quote_year": 2008,
    "source": "材料/股东信/2008ltr.pdf，Investments段",
    "lesson": "既利用机会，也不拿一夜安眠去换额外利润。",
    "shape": "bolt",
    "color": "#ffd166"
  },
  {
    "id": 8,
    "year": 2009,
    "title": "一列火车，值得交出股票吗？",
    "kicker": "BNSF｜理解支付的真实成本",
    "context": "2009年，你考虑以每股100美元收购BNSF。铁路服务长期必需，但需要持续巨额资本投入；交易若全用股票会稀释伯克希尔，若全用现金又会压缩机动空间。",
    "options": [
      {
        "title": "混合支付，限制股票比例",
        "desc": "部署约220亿美元现金，整体约30%成本用股票支付，并保留长期经营团队。",
        "score": 100,
        "dims": [
          95,
          85,
          90,
          100
        ]
      },
      {
        "title": "全部用股票，现金一分不动",
        "desc": "把股票价格当作唯一成本，不考虑交出企业的内在价值。",
        "score": 30,
        "dims": [
          65,
          20,
          55,
          70
        ]
      },
      {
        "title": "资本密集，坚决不碰",
        "desc": "任何需要持续再投资的企业都不值得研究。",
        "score": 40,
        "dims": [
          45,
          60,
          75,
          45
        ]
      }
    ],
    "actual": 0,
    "actual_text": "按每股100美元推进收购，整体约30%成本以伯克希尔股票支付，并部署约220亿美元现金；交易于2010年完成，Matt Rose团队继续经营。",
    "why": "巴菲特并不喜欢发股，因此必须衡量换来的长期盈利与额外再投资机会是否足以抵消稀释。他明确说，如果需要使用更多股票，交易就不成立。",
    "quote": "In the end, Charlie and I decided that the disadvantage of paying 30% of the price through stock was offset by the opportunity the acquisition gave us to deploy $22 billion of cash in a business we understood and liked for the long term. It has the additional virtue of being run by Matt Rose, whom we trust and admire.",
    "quote_year": 2009,
    "source": "材料/股东信/2009ltr.pdf，An Inconvenient Truth (Boardroom Overheating)",
    "lesson": "支付工具也是交易价格的一部分；资本密集不等于没有合理回报。",
    "shape": "rail",
    "color": "#75a7ff"
  },
  {
    "id": 9,
    "year": 2015,
    "title": "精密零件，怎样变成长期现金机器？",
    "kicker": "Precision Castparts｜关键组件与经理人",
    "context": "2015年，Precision Castparts是航空零部件供应商，许多产品来自多年合同。CEO Mark Donegan把普通原材料变成高附加值组件；收购需要逾320亿美元现金。",
    "options": [
      {
        "title": "收购后由总部接管",
        "desc": "支付价格后，用集中管控取代原有管理层。",
        "score": 35,
        "dims": [
          55,
          65,
          40,
          35
        ]
      },
      {
        "title": "航空业有周期，直接放弃",
        "desc": "不评估产品关键性、合同与管理者，只看行业标签。",
        "score": 40,
        "dims": [
          45,
          60,
          70,
          40
        ]
      },
      {
        "title": "逾320亿美元现金收购并留任团队",
        "desc": "认可关键组件与经理人的组合，让Donegan继续配置经营资本。",
        "score": 100,
        "dims": [
          100,
          75,
          85,
          100
        ]
      }
    ],
    "actual": 2,
    "actual_text": "2015年宣布、2016年1月完成，以逾320亿美元现金收购PCC；Mark Donegan继续领导，并可利用伯克希尔资本进行后续收购。",
    "why": "产品虽小，却是大型飞机的关键组件；多年合同、制造能力与经理人共同构成经营质量。伯克希尔的角色不是接管日常经营，而是提供长期资本与自主空间。",
    "quote": "Under CEO Mark Donegan, PCC has become the world’s premier supplier of aerospace components (most of them destined to be original equipment, though spares are important to the company as well). Mark’s accomplishments remind me of the magic regularly performed by Jacob Harpaz at IMC, our remarkable Israeli manufacturer of cutting tools.",
    "quote_year": 2015,
    "source": "材料/股东信/2015ltr.pdf，Precision Castparts段",
    "lesson": "关键组件 + 优秀经理人 + 不轻易干预，是伯克希尔式收购组合。",
    "shape": "plane",
    "color": "#87d7f0"
  },
  {
    "id": 10,
    "year": 2020,
    "title": "没有大收购，资本还能去哪？",
    "kicker": "伯克希尔回购｜每股价值与流动性",
    "context": "2020年，伯克希尔没有完成大型收购，经营利润下降9%。管理层认为公司股票低于保守估计的内在价值，同时希望保留足以应对机会与问题的资金。你会怎么做？",
    "options": [
      {
        "title": "只要现金多就持续回购",
        "desc": "无需考虑价格，回购本身总能创造价值。",
        "score": 35,
        "dims": [
          45,
          10,
          55,
          55
        ]
      },
      {
        "title": "满足两个条件才回购",
        "desc": "提升持续股东的每股内在价值，并在回购后仍保留充裕资金。",
        "score": 100,
        "dims": [
          85,
          100,
          100,
          95
        ]
      },
      {
        "title": "为维持股价而借款回购",
        "desc": "把短期市场反应置于财务韧性之上。",
        "score": 5,
        "dims": [
          20,
          15,
          0,
          10
        ]
      }
    ],
    "actual": 1,
    "actual_text": "2020年回购80,998股A类等价股，耗资247亿美元；持续股东对伯克希尔各项业务的持股比例因此提高5.2%。",
    "why": "回购不是天然正确：价格必须低于保守内在价值，且不能耗尽应对风险与机会的资金。对持续股东而言，重点是每股所代表的企业权益是否增加。",
    "quote": "Last year we demonstrated our enthusiasm for Berkshire’s spread of properties by repurchasing the equivalent of 80,998 “A” shares, spending $24.7 billion in the process. That action increased your ownership in all of Berkshire’s businesses by 5.2% without requiring you to so much as touch your wallet.",
    "quote_year": 2020,
    "source": "材料/股东信/2020ltr.pdf，Share Repurchases段",
    "lesson": "回购的两道门：每股价值提升 + 回购后仍有充裕资金。",
    "shape": "repurchase",
    "color": "#f7c85e"
  }
];
