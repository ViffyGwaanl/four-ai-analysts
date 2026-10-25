window.MERGER_DATA = {
  "asOf": "2026-10-22",
  "pricingDate": "2026-10-21",
  "segments": [
    {
      "name": "Automotive",
      "company": "Tesla",
      "revenue": 91305,
      "gross": 16330,
      "op": null,
      "revenue_mix": 0.6732761608400375,
      "gross_mix": 0.42800230644231274,
      "zh": "汽车",
      "en": "AUTOMOTIVE",
      "desc": "规模化制造与出行服务，是合并后收入的压舱石。",
      "source": "Tesla 10-K Note 16；10-Q Note 14",
      "color": "#102A43"
    },
    {
      "name": "Energy",
      "company": "Tesla",
      "revenue": 12265,
      "gross": 3644,
      "op": null,
      "revenue_mix": 0.09044118189259141,
      "gross_mix": 0.09550767940451853,
      "zh": "能源",
      "en": "ENERGY",
      "desc": "储能、发电与电网基础设施，连接数据中心与电力需求。",
      "source": "Tesla 10-K Note 16；10-Q Note 14",
      "color": "#F2994A"
    },
    {
      "name": "Connectivity",
      "company": "SpaceX",
      "revenue": 16024,
      "gross": 8295,
      "op": 6487,
      "revenue_mix": 0.11815976344450753,
      "gross_mix": 0.2174083975467841,
      "zh": "连接",
      "en": "CONNECTIVITY",
      "desc": "卫星互联网与企业/政府连接，贡献高质量经营利润。",
      "source": "SpaceX招股书Note 19；Q3公告p.5",
      "color": "#00A6A6"
    },
    {
      "name": "SI",
      "company": "SpaceX",
      "revenue": 11862,
      "gross": 7021,
      "op": -5468,
      "revenue_mix": 0.08746949038808964,
      "gross_mix": 0.18401740315563245,
      "zh": "超级智能",
      "en": "SUPER INTELLIGENCE",
      "desc": "云算力、模型与应用；增长与资本强度同时上升。",
      "source": "SpaceX招股书Note 19；Q3公告p.6",
      "color": "#8064A2"
    },
    {
      "name": "Space",
      "company": "SpaceX",
      "revenue": 4157,
      "gross": 2864,
      "op": -1687,
      "revenue_mix": 0.030653403434773952,
      "gross_mix": 0.07506421345075222,
      "zh": "航天",
      "en": "SPACE",
      "desc": "发射、运载与航天基础设施，是通用火箭造型的灵感来源。",
      "source": "SpaceX招股书Note 19；Q3公告p.4",
      "color": "#56CCF2"
    }
  ],
  "methods": [
    {
      "key": "close",
      "name": "收盘市值法",
      "short": "收盘市值",
      "ratio": 2.425899190257988,
      "s_legacy": 0.5861103467180638,
      "t_legacy": 0.4138896532819363,
      "musk_post": 0.3351891743334383,
      "description": "2026-10-21已完成交易日收盘价；股数见持股页"
    },
    {
      "key": "vwap",
      "name": "20日成交量加权收盘价法",
      "short": "20日VWAP*",
      "ratio": 2.364570738602772,
      "s_legacy": 0.5923079155237547,
      "t_legacy": 0.40769208447624533,
      "musk_post": 0.33686203013424243,
      "description": "截至2026-10-21的20个交易日；收盘价×成交量/成交量，分析计算，非官方VWAP"
    },
    {
      "key": "revenue",
      "name": "LTM收入倍数法（假设）",
      "short": "收入倍数",
      "ratio": 3.4324280205312907,
      "s_legacy": 0.5002107609395209,
      "t_legacy": 0.4997892390604792,
      "musk_post": 0.3120030468596523,
      "description": "EV/LTM Revenue：SpaceX 6.0x、Tesla 2.0x；假设，非市场一致预期"
    },
    {
      "key": "ebitda",
      "name": "LTM调整后EBITDA倍数法（假设）",
      "short": "EBITDA倍数",
      "ratio": 3.297020919350414,
      "s_legacy": 0.5102714605496292,
      "t_legacy": 0.4897285394503708,
      "musk_post": 0.3147186439317596,
      "description": "共同EV/LTM Adj. EBITDA 20.0x；假设；两家公司非GAAP定义不完全可比"
    }
  ],
  "combined": {
    "revenue": 135613,
    "gross": 38154,
    "op": 2798,
    "net": 519,
    "cfo": 34472,
    "capex": 70367,
    "fcf": -35895,
    "ebitda": 29940,
    "cash": 135302,
    "debt": 48367,
    "equity": 266603,
    "net_cash": 86935,
    "gross_margin": 0.28134470884059787,
    "op_margin": 0.02063224027195033,
    "fcf_margin": -0.26468701378186454
  },
  "sx": {
    "revenue": 32043,
    "cost": 13863,
    "op": -668,
    "net": -2760,
    "net_common": -3431,
    "cfo": 15762,
    "capex": 54960,
    "ebitda": 14945,
    "gross": 18180,
    "fcf": -39198
  },
  "tesla": {
    "revenue": 103570,
    "cost": 83596,
    "op": 3466,
    "net": 3279,
    "net_common": 3218,
    "cfo": 18710,
    "capex": 15407,
    "ebitda": 14995,
    "gross": 19974,
    "fcf": 3303
  },
  "musk": {
    "spcxActualPct": 0.4469068057294352,
    "spcxIpoPct": 0.46116391597183437,
    "teslaProxyPct": 0.19824306701196492,
    "teslaSimplePct": 0.17698551025820894
  },
  "sources": [
    "SpaceX 2026Q3业绩公告（2026-10-22取数）",
    "Tesla 2026Q3业绩公告及季报（2026-10-22取数）",
    "Yahoo Finance Chart API（2026-10-22访问；定价日2026-10-21）"
  ]
};
