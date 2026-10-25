"""核对导出数据的会计勾稽关系，并生成扁平化的逐季数据表（交付/data/quarterly.csv / quarterly.json）。"""
import json, csv, sys, pathlib
ROOT = pathlib.Path(__file__).resolve().parents[1]
d = json.load(open(ROOT / "data/raw/export_final.json"))
st0 = json.load(open(ROOT / "data/raw/state_before_Q01.json"))["balance_sheet_now"]
rows = []
prev = dict(cash=st0["cash"], inventory=st0["inventory"], ppe_net=st0["ppe_net"], debt=st0["debt"],
            emergency_debt=st0["emergency_debt"], equity=st0["equity"], inventory_kwafers=st0["inventory_kwafers"])
errs = []
def chk(name, a, b, q, tol=2e-3):
    if abs(a - b) > tol:
        errs.append(f"Q{q} {name}: {a:.4f} vs {b:.4f}")
for h in d["history"]:
    q = h["quarter"]; dec = h["decision"]; m = h["market"]; op = h["operations"]
    i = h["income_statement"]; c = h["cash_flow"]; b = h["balance_sheet"]
    chk("资产=现金+存货+固定资产", b["total_assets"], b["cash"] + b["inventory"] + b["ppe_net"], q)
    chk("资产=负债+权益", b["total_assets"], b["debt"] + b["emergency_debt"] + b["equity"], q)
    chk("权益滚动", b["equity"], prev["equity"] + i["net_income"], q)
    chk("现金滚动", b["cash"], prev["cash"] + c["operating"] + c["investing"] + c["financing"] + c["emergency_borrowing"], q)
    chk("经营现金流间接法", c["operating"], i["net_income"] + c["depreciation"] - (b["inventory"] - prev["inventory"]), q)
    chk("固定资产滚动", b["ppe_net"], prev["ppe_net"] + dec["capex"] - c["depreciation"], q)
    chk("毛利", i["gross_profit"], i["revenue"] - i["cogs"], q)
    chk("营业利润", i["operating_income"], i["gross_profit"] - i["rnd"] - i["sga"], q)
    chk("净利润", i["net_income"], i["operating_income"] - i["net_interest"] - i["tax"], q)
    chk("营收拆分", i["revenue"], i["revenue_std"] + i["revenue_hbm"], q)
    chk("借款滚动", b["debt"], prev["debt"] + dec["borrow"], q)
    chk("投资现金流=资本开支", -c["investing"], dec["capex"], q)
    std_out = op["produced_kwafers"] - op["hbm_kwafers"]
    chk("库存片数滚动", b["inventory_kwafers"], prev["inventory_kwafers"] + std_out - op["std_sold_kwafers"], q, 0.02)
    chk("普通内存单价", i["revenue_std"], op["std_sold_kwafers"] * m["price_index"] * 0.024, q)
    chk("HBM单价", i["revenue_hbm"], op["hbm_sold_kwafers"] * m["hbm_price_index"] * 0.024, q)
    row = dict(quarter=q,
        utilization=dec["utilization"], sell_fraction=dec["sell_fraction"], capex=dec["capex"], hbm_rnd=dec["hbm_rnd"],
        hbm_share=dec["hbm_share"], borrow=dec["borrow"],
        price_index=m["price_index"], hbm_price_index=m["hbm_price_index"], demand_kwafers=m["demand_kwafers"], hbm_demand_kwafers=m["hbm_demand_kwafers"],
        produced_kwafers=op["produced_kwafers"], hbm_kwafers=op["hbm_kwafers"], std_sold_kwafers=op["std_sold_kwafers"], hbm_sold_kwafers=op["hbm_sold_kwafers"],
        unit_cost_musd=op["unit_cost_musd"], capacity_kwafers=op["capacity_kwafers"], hbm_qualified=op["hbm_qualified"],
        **{f"is_{k}": v for k, v in i.items()}, **{f"cf_{k}": v for k, v in c.items()}, **{f"bs_{k}": v for k, v in b.items()},
        note=dec["note"])
    rows.append(row)
    prev = dict(b)
print("勾稽检查：", "全部通过" if not errs else "\n".join(errs))
print("累计净利润", round(sum(r["is_net_income"] for r in rows), 4), "导出值", d["cumulative_net_income"])
print("期末权益", rows[-1]["bs_equity"], "导出值", d["final"]["equity"], "破产", d["bankrupt"])
keys = list(rows[0].keys())
with open(ROOT / "data/quarterly.csv", "w", newline="", encoding="utf-8-sig") as f:
    w = csv.DictWriter(f, fieldnames=keys); w.writeheader(); w.writerows(rows)
json.dump(dict(opening=st0, quarters=rows, final=d["final"], cumulative_net_income=d["cumulative_net_income"], bankrupt=d["bankrupt"]),
          open(ROOT / "data/quarterly.json", "w"), ensure_ascii=False, indent=1)
# 打印一张紧凑表
hdr = ["Q","开工","产能","价格","HBM价","需求","HBM需","产量","HBM产","普售","HBM售","营收","净利","现金","负债","权益","库存片"]
print("\t".join(hdr))
for r in rows:
    print("\t".join(str(x) for x in [r["quarter"], r["utilization"], r["capacity_kwafers"], r["price_index"], r["hbm_price_index"], r["demand_kwafers"], r["hbm_demand_kwafers"],
        r["produced_kwafers"], round(r["hbm_kwafers"],1), round(r["std_sold_kwafers"],1), r["hbm_sold_kwafers"], round(r["is_revenue"],2), round(r["is_net_income"],2),
        round(r["bs_cash"],2), r["bs_debt"], round(r["bs_equity"],2), round(r["bs_inventory_kwafers"],1)]))
