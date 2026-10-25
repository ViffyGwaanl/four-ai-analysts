"""用导出数据反推并逐季验证引擎参数（这些参数是推断出来的，在交付物中标为「假设/推断」）。"""
import json, pathlib
ROOT = pathlib.Path(__file__).resolve().parents[1]
D = json.load(open(ROOT / "data/quarterly.json"))
Q = D["quarters"]; op0 = D["opening"]
P_BASE = 0.024   # 价格指数1.0对应每千片0.024十亿美元
V = 0.005        # 每千片变动成本
PLANT = 1.0      # 每季工厂固定费用
maxerr = {k: 0 for k in ["price", "hbm_price", "unit_cost", "dep", "interest", "tax", "writedown", "cogs"]}
prev_cash, prev_debt, prev_em, prev_inv, prev_kw = op0["cash"], op0["debt"], op0["emergency_debt"], op0["inventory"], op0["inventory_kwafers"]
capex_hist = []
for r in Q:
    q = r["quarter"]
    capex_hist.append(r["capex"])
    dep_model = 2.0 + sum(c / 20 for c in capex_hist[:-4]) if len(capex_hist) > 4 else 2.0
    maxerr["dep"] = max(maxerr["dep"], abs(dep_model - r["cf_depreciation"]))
    prod_cost = r["cf_depreciation"] + PLANT + V * r["produced_kwafers"]
    maxerr["unit_cost"] = max(maxerr["unit_cost"], abs(prod_cost / r["produced_kwafers"] * 1000 - r["unit_cost_musd"]))
    maxerr["price"] = max(maxerr["price"], abs(r["std_sold_kwafers"] * r["price_index"] * P_BASE - r["is_revenue_std"]))
    maxerr["hbm_price"] = max(maxerr["hbm_price"], abs(r["hbm_sold_kwafers"] * r["hbm_price_index"] * P_BASE - r["is_revenue_hbm"]))
    ni_model = 0.015 * prev_debt + 0.03 * prev_em - 0.008 * prev_cash
    maxerr["interest"] = max(maxerr["interest"], abs(ni_model - r["is_net_interest"]))
    pbt = r["is_operating_income"] - r["is_net_interest"]
    maxerr["tax"] = max(maxerr["tax"], abs(0.15 * max(0, pbt) - r["is_tax"]))
    # 加权平均成本 + 可变现净值减记
    uc = prod_cost / r["produced_kwafers"]
    std_out = r["produced_kwafers"] - r["hbm_kwafers"]
    pool_val = prev_inv + std_out * uc; pool_kw = prev_kw + std_out
    avg = pool_val / pool_kw if pool_kw else 0
    end_kw = pool_kw - r["std_sold_kwafers"]
    nrv = 0.95 * r["price_index"] * P_BASE
    wd = max(0, end_kw * (avg - nrv)) if end_kw > 1e-9 else 0
    maxerr["writedown"] = max(maxerr["writedown"], abs(wd - r["is_inventory_writedown"]))
    cogs_model = r["std_sold_kwafers"] * avg + r["hbm_kwafers"] * uc + wd
    maxerr["cogs"] = max(maxerr["cogs"], abs(cogs_model - r["is_cogs"]))
    prev_cash, prev_debt, prev_em, prev_inv, prev_kw = r["bs_cash"], r["bs_debt"], r["bs_emergency_debt"], r["bs_inventory"], r["bs_inventory_kwafers"]
for k, v in maxerr.items():
    print(f"{k:10s} 最大偏差 {v:.6f}")
