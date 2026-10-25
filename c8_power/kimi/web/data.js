export const APP_DATA = {
  "generated": "2026-10-22",
  "global": {
    "current2024": 415,
    "current2025": 485,
    "forecast2030": 950,
    "previousForecast2030": 945,
    "cagr": 0.14392189695148683,
    "increment": 465,
    "source2025": "IEA《Energy and AI》",
    "date2025": "2025-04-10",
    "source2026": "IEA《Key Questions on Energy and AI》",
    "date2026": "2026-04-16"
  },
  "energy": [
    {
      "id": "coal",
      "name": "煤电",
      "share": 0.3,
      "twh": 124.5,
      "color": "#40566C",
      "source": "IEA《Energy and AI》",
      "date": "2025-04-10",
      "note": "物理供电结构约份额"
    },
    {
      "id": "gas",
      "name": "天然气",
      "share": 0.26,
      "twh": 107.9,
      "color": "#4E7CFE",
      "source": "IEA《Energy and AI》",
      "date": "2025-04-10",
      "note": "物理供电结构约份额"
    },
    {
      "id": "renewables",
      "name": "可再生能源",
      "share": 0.27,
      "twh": 112.05000000000001,
      "color": "#16BFA8",
      "source": "IEA《Energy and AI》",
      "date": "2025-04-10",
      "note": "风、光、水等合计"
    },
    {
      "id": "nuclear",
      "name": "核电",
      "share": 0.15,
      "twh": 62.25,
      "color": "#F4B942",
      "source": "IEA《Energy and AI》",
      "date": "2025-04-10",
      "note": "物理供电结构约份额"
    },
    {
      "id": "other",
      "name": "其他",
      "share": 0.02,
      "twh": 8.3,
      "color": "#A8B7C6",
      "source": "IEA《Energy and AI》+剩余项公式",
      "date": "2025-04-10",
      "note": "1减四类约份额，含四舍五入影响"
    },
    {
      "id": "fusion",
      "name": "聚变（展示）",
      "share": 0,
      "twh": 0,
      "color": "#B59CFF",
      "source": "本研究展示假设",
      "date": "2026-10-22",
      "note": "IEA未单列商业聚变；0仅为展示，未来PPA不等于当前供电"
    }
  ],
  "capex": [
    {
      "name": "Meta",
      "value": 50.914000000000016,
      "source": "Meta 2026年三季度Form 10-Q",
      "date": "2026-10-21",
      "note": "含融资租赁本金；由9M减Q3"
    },
    {
      "name": "Alphabet",
      "value": 80.598,
      "source": "SEC Companyfacts：Alphabet",
      "date": "2026-07-23",
      "note": "购置物业及设备现金支出"
    },
    {
      "name": "Microsoft",
      "value": 66.67799999999998,
      "source": "SEC Companyfacts：Microsoft",
      "date": "2026-07-29",
      "note": "日历年Q1+FYQ4，公式拆分"
    },
    {
      "name": "Amazon",
      "value": 98.411,
      "source": "SEC Companyfacts：Amazon",
      "date": "2026-07-31",
      "note": "生产性资产购置现金支出"
    }
  ],
  "meta": {
    "dc2023TWh": 14.975435,
    "dc2024TWh": 18.061781,
    "growth": 0.20609391313173875,
    "avgMW": 2056.213683970856,
    "pue2024": 1.08,
    "source": "Meta 2025 Environmental Data Index",
    "date": "2025-10-17"
  },
  "scenario": {
    "low": 760.0,
    "base": 950,
    "high": 1140.0,
    "fusion2030": 0
  },
  "example": {
    "facilityMW": 130.0,
    "totalTWh": 1.02492,
    "generationTWh": 1.090340425531915,
    "costMUSD": 81.9936,
    "assumptions": [
      {
        "id": "A001",
        "name": "示例数据中心IT负载",
        "value": 100,
        "unit": "MW",
        "kind": "假设",
        "scope": "纯示例，不代表Meta或任何具体公司的实际负载。"
      },
      {
        "id": "A002",
        "name": "示例年平均负载率",
        "value": 0.9,
        "unit": "比例",
        "kind": "假设",
        "scope": "实际IT负载相对额定IT负载的年平均比例。"
      },
      {
        "id": "A003",
        "name": "示例PUE",
        "value": 1.3,
        "unit": "倍",
        "kind": "假设",
        "scope": "总设施功率/IT功率；接近IEA 2030平均预测但不是任何公司的实际值。"
      },
      {
        "id": "A004",
        "name": "示例综合电价",
        "value": 80,
        "unit": "USD/MWh",
        "kind": "假设",
        "scope": "仅用于敏感性演算，不是PPA报价、电价预测或投资建议。"
      },
      {
        "id": "A005",
        "name": "示例输配电及厂用损失率",
        "value": 0.06,
        "unit": "比例",
        "kind": "假设",
        "scope": "用于从数据中心表计电量折算发电侧需求。"
      },
      {
        "id": "A006",
        "name": "示例全年小时数",
        "value": 8760,
        "unit": "小时",
        "kind": "计算参数",
        "scope": "非闰年示例；不用于Meta 2024闰年平均功率。"
      },
      {
        "id": "A007",
        "name": "2030需求低情景乘数",
        "value": 0.8,
        "unit": "倍",
        "kind": "假设",
        "scope": "乘以IEA 950 TWh中央预测，属于本研究敏感性，不是IEA情景。"
      },
      {
        "id": "A008",
        "name": "2030需求高情景乘数",
        "value": 1.2,
        "unit": "倍",
        "kind": "假设",
        "scope": "乘以IEA 950 TWh中央预测，属于本研究敏感性，不是IEA情景。"
      },
      {
        "id": "A009",
        "name": "2030聚变供电基准假设",
        "value": 0,
        "unit": "TWh",
        "kind": "假设",
        "scope": "基准不预设商业聚变供电；未来PPA单独列示，非预测聚变必然为零。"
      },
      {
        "id": "A010",
        "name": "Meta 2024全年小时数",
        "value": 8784,
        "unit": "小时",
        "kind": "计算参数",
        "scope": "2024为闰年，用于年度电量折算平均功率。"
      },
      {
        "id": "A011",
        "name": "2024聚变供电展示值",
        "value": 0,
        "unit": "TWh",
        "kind": "展示假设",
        "scope": "IEA物理供电结构未单列商业聚变；网页以0作展示，不代表实验装置没有聚变能量。"
      }
    ]
  },
  "notes": [
    "能量流按IEA 2024物理供电约份额×415 TWh终端用电折算，非逐燃料披露绝对量。",
    "电网是输送与平衡机制，不是独立一次能源。",
    "PPA不等于物理专线；年度匹配不等于全天候无碳供电。",
    "网页为Excel同源静态快照，修改Excel不会自动改写网页。"
  ]
};
