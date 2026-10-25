"""把导出数据整理成网页用的 data/game-data.js（window.GAME_DATA）。
派生指标的口径与 三张表.xlsx「分析」页的公式完全一致：
  毛利率=毛利/营收；净负债=借款+紧急授信−现金；ROE(年化)=净利润/((期初权益+期末权益)/2)×4；
  存货周转天数=((期初存货+期末存货)/2)/营业成本×91.25；自由现金流=经营现金流+投资现金流；HBM收入占比=HBM收入/营收。"""
import json, pathlib
ROOT = pathlib.Path(__file__).resolve().parents[1]
D = json.load(open(ROOT / "data/quarterly.json"))
Q, O = D["quarters"], D["opening"]
DAYS = 91.25
EVENTS = {
 1: ("景气反转", "价格指数 1.00→0.80；HBM 研发一次投入 3.0，开工率 85%"),
 2: ("价格急跌", "价格指数 0.56；满开工备货，存货按可变现净值减记 0.42"),
 3: ("周期底部", "价格指数 0.50；同业减产，借款 2.0 补充现金"),
 4: ("HBM 量产", "通过 HBM 认证，首季产 12 千片、卖 8 千片"),
 5: ("逆周期扩产", "资本开支 4.5（扩产 3.0，+25 千片，第 9 季投产）"),
 6: ("盈利转正", "净利润转正；再扩产 2.4（+20 千片）"),
 7: ("HBM 卡位", "HBM 认证名额紧张；扩产 1.8（+15 千片）"),
 8: ("AI 拉动", "HBM 价格指数 2.8；扩产 4.2（+35 千片）"),
 9: ("新产能投产", "首批新产能 +25 千片投产；扩产 4.8（+40 千片）"),
 10: ("扩产收官", "最后一笔扩产 3.6（+30 千片）；开始还款"),
 11: ("去杠杆", "还款 10.0，借款降到 4.8"),
 12: ("借款清零", "还清全部借款；坚持不在顶部扩产"),
 13: ("超级周期", "价格指数 1.70；库存降到 33 千片"),
 14: ("供不应求", "价格指数 2.65；库存清零，需求缺口 79 千片"),
 15: ("价格狂飙", "价格指数 3.90；单季净利润 45.95"),
 16: ("收官", "价格指数 4.55；期末股东权益 212.64、无负债"),
}
out = []
prev_eq, prev_inv = O["equity"], O["inventory"]
for r in Q:
    q = r["quarter"]
    avg_eq = (prev_eq + r["bs_equity"]) / 2
    avg_inv = (prev_inv + r["bs_inventory"]) / 2
    out.append(dict(
        q=q, label=f"Q{q}", title=EVENTS[q][0], event=EVENTS[q][1], note=r["note"],
        utilization=r["utilization"], sellFraction=r["sell_fraction"], capex=r["capex"], hbmRnd=r["hbm_rnd"], hbmShare=r["hbm_share"], borrow=r["borrow"],
        priceIndex=r["price_index"], hbmPriceIndex=r["hbm_price_index"], demand=r["demand_kwafers"], hbmDemand=r["hbm_demand_kwafers"],
        capacity=r["capacity_kwafers"], produced=r["produced_kwafers"], hbmOutput=r["hbm_kwafers"], stdSold=r["std_sold_kwafers"], hbmSold=r["hbm_sold_kwafers"],
        unitCost=r["unit_cost_musd"], hbmQualified=r["hbm_qualified"],
        revenue=r["is_revenue"], revenueStd=r["is_revenue_std"], revenueHbm=r["is_revenue_hbm"], cogs=r["is_cogs"], writedown=r["is_inventory_writedown"],
        grossProfit=r["is_gross_profit"], rnd=r["is_rnd"], sga=r["is_sga"], operatingIncome=r["is_operating_income"], netInterest=r["is_net_interest"],
        tax=r["is_tax"], netIncome=r["is_net_income"],
        ocf=r["cf_operating"], icf=r["cf_investing"], fcfFin=r["cf_financing"], depreciation=r["cf_depreciation"], emergencyBorrowing=r["cf_emergency_borrowing"],
        cash=r["bs_cash"], inventory=r["bs_inventory"], ppe=r["bs_ppe_net"], totalAssets=r["bs_total_assets"], debt=r["bs_debt"], emergencyDebt=r["bs_emergency_debt"],
        equity=r["bs_equity"], inventoryKw=r["bs_inventory_kwafers"],
        # 派生指标（与 Excel 分析页同口径）
        grossMargin=r["is_gross_profit"] / r["is_revenue"],
        netDebt=r["bs_debt"] + r["bs_emergency_debt"] - r["bs_cash"],
        roeAnnual=r["is_net_income"] / avg_eq * 4,
        dio=avg_inv / r["is_cogs"] * DAYS,
        fcf=r["cf_operating"] + r["cf_investing"],
        hbmRevShare=r["is_revenue_hbm"] / r["is_revenue"],
        cumNetIncome=None,
    ))
    prev_eq, prev_inv = r["bs_equity"], r["bs_inventory"]
cum = 0
for x in out:
    cum += x["netIncome"]; x["cumNetIncome"] = cum
data = dict(
    meta=dict(title="内存厂 16 季经营沙盘", unit="十亿美元", waferUnit="千片/季", daysPerQuarter=DAYS,
              source="经营模拟引擎导出数据（游戏编号 memfab-opus），导出日期 2026-10-22",
              openingEquity=O["equity"], openingCash=O["cash"], openingDebt=O["debt"], openingInventoryKw=O["inventory_kwafers"], openingCapacity=O["capacity_kwafers"],
              finalEquity=D["final"]["equity"], cumulativeNetIncome=D["cumulative_net_income"], bankrupt=D["bankrupt"]),
    opening=dict(cash=O["cash"], inventory=O["inventory"], ppe=O["ppe_net"], debt=O["debt"], equity=O["equity"], inventoryKw=O["inventory_kwafers"], capacity=O["capacity_kwafers"]),
    quarters=out)
js = "/* 自动生成：交付/scripts/build_web_data.py，数据来自 交付/data/raw/export_final.json，请勿手改 */\nwindow.GAME_DATA = " + json.dumps(data, ensure_ascii=False, indent=1) + ";\n"
(ROOT / "web/data/game-data.js").write_text(js, encoding="utf-8")
print("written", len(js), "bytes;", "final equity", data["meta"]["finalEquity"])
for x in out:
    print(x["label"], f"GM {x['grossMargin']:.3f} ND {x['netDebt']:.2f} ROE {x['roeAnnual']:.3f} DIO {x['dio']:.1f} FCF {x['fcf']:.2f} HBM% {x['hbmRevShare']:.3f}")
