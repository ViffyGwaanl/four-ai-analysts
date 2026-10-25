import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = json.loads((ROOT / "data" / "export.json").read_text(encoding="utf-8"))
INITIAL = json.loads((ROOT / "data" / "q00_state.json").read_text(encoding="utf-8"))
quarters = []
rnd_cumulative = 0
for item in DATA["history"]:
    q = item["quarter"]
    rnd_cumulative += item["decision"]["hbm_rnd"]
    if q == 1:
        signals = INITIAL["signals"]
    else:
        previous = json.loads((ROOT / "data" / f"q{q-1:02d}_result.json").read_text(encoding="utf-8"))
        signals = previous["next"]["signals"]
    quarters.append({
        "q": q,
        "price": item["market"]["price_index"],
        "hbmPrice": item["market"]["hbm_price_index"],
        "demand": item["market"]["demand_kwafers"],
        "hbmDemand": item["market"]["hbm_demand_kwafers"],
        "utilization": item["decision"]["utilization"],
        "sellFraction": item["decision"]["sell_fraction"],
        "capex": item["decision"]["capex"],
        "hbmRnd": item["decision"]["hbm_rnd"],
        "rndCumulative": rnd_cumulative,
        "hbmShare": item["decision"]["hbm_share"],
        "borrow": item["decision"]["borrow"],
        "produced": item["operations"]["produced_kwafers"],
        "hbmProduced": item["operations"]["hbm_kwafers"],
        "stdSold": item["operations"]["std_sold_kwafers"],
        "hbmSold": item["operations"]["hbm_sold_kwafers"],
        "unitCost": item["operations"]["unit_cost_musd"],
        "capacity": item["operations"]["capacity_kwafers"],
        "qualified": item["operations"]["hbm_qualified"],
        "revenue": item["income_statement"]["revenue"],
        "revenueStd": item["income_statement"]["revenue_std"],
        "revenueHbm": item["income_statement"]["revenue_hbm"],
        "grossProfit": item["income_statement"]["gross_profit"],
        "grossMargin": item["income_statement"]["gross_margin"],
        "netIncome": item["income_statement"]["net_income"],
        "cfo": item["cash_flow"]["operating"],
        "capexCash": -item["cash_flow"]["investing"],
        "cash": item["balance_sheet"]["cash"],
        "inventoryValue": item["balance_sheet"]["inventory"],
        "inventoryQty": item["balance_sheet"]["inventory_kwafers"],
        "ppe": item["balance_sheet"]["ppe_net"],
        "totalAssets": item["balance_sheet"]["total_assets"],
        "debt": item["balance_sheet"]["debt"],
        "emergencyDebt": item["balance_sheet"]["emergency_debt"],
        "equity": item["balance_sheet"]["equity"],
        "news": signals["news"],
        "consensus": signals["consensus"],
        "note": item["decision"]["note"],
    })
payload = {
    "title": "MEMFAB｜16季度经营工厂",
    "source": "经营模拟引擎 export.json｜2026-10-22导出",
    "units": {"money": "十亿美元", "quantity": "千片", "capacity": "千片/季"},
    "initial": INITIAL["balance_sheet_now"],
    "quarters": quarters,
    "final": DATA["final"],
    "bankrupt": DATA["bankrupt"],
    "cumulativeNetIncome": DATA["cumulative_net_income"],
}
out = ROOT / "web" / "data.js"
out.write_text("window.MEMFAB_DATA = " + json.dumps(payload, ensure_ascii=False, indent=2) + ";\n", encoding="utf-8")
print(out)
