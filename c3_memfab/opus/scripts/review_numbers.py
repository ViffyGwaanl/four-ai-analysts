"""复盘报告用的补充数字（全部由导出数据或复现模型计算）。"""
import json, pathlib, copy, sys
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import importlib.util
ROOT = pathlib.Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("sim", ROOT / "scripts/sim.py")
import io, contextlib
buf = io.StringIO()
with contextlib.redirect_stdout(buf):
    sim = importlib.util.module_from_spec(spec); spec.loader.exec_module(sim)
Q, O = sim.Q, sim.O
out = {}
out["writedown_total"] = sum(r["is_inventory_writedown"] for r in Q)
out["net_interest_total"] = sum(r["is_net_interest"] for r in Q)
out["interest_paid_q1_q12"] = sum(r["is_net_interest"] for r in Q[:12])
out["tax_total"] = sum(r["is_tax"] for r in Q)
out["hbm_rev_total"] = sum(r["is_revenue_hbm"] for r in Q)
out["hbm_cost_total"] = sum(r["hbm_kwafers"] * r["unit_cost_musd"] / 1000 for r in Q)
out["hbm_gp_total"] = out["hbm_rev_total"] - out["hbm_cost_total"]
out["gp_total"] = sum(r["is_gross_profit"] for r in Q)
out["rev_total"] = sum(r["is_revenue"] for r in Q)
out["expansion_capex"] = sum(r["capex"] - 1.5 for r in Q)
out["unmet_std_q14_16"] = sum(r["demand_kwafers"] - r["std_sold_kwafers"] for r in Q[13:])
out["unmet_std_value"] = sum((r["demand_kwafers"] - r["std_sold_kwafers"]) * r["price_index"] * 0.024 for r in Q[13:])
phases = {"下行（Q1-Q4）": range(0, 4), "复苏与布局（Q5-Q8）": range(4, 8), "加速（Q9-Q12）": range(8, 12), "超级周期（Q13-Q16）": range(12, 16)}
ph = {}
for k, idx in phases.items():
    rs = [Q[i] for i in idx]
    ph[k] = dict(rev=sum(r["is_revenue"] for r in rs), hbm=sum(r["is_revenue_hbm"] for r in rs), ni=sum(r["is_net_income"] for r in rs),
                 gm=sum(r["is_gross_profit"] for r in rs) / sum(r["is_revenue"] for r in rs), capex=sum(r["capex"] for r in rs),
                 ocf=sum(r["cf_operating"] for r in rs), price_start=rs[0]["price_index"], price_end=rs[-1]["price_index"],
                 cash_end=rs[-1]["bs_cash"], debt_end=rs[-1]["bs_debt"], eq_end=rs[-1]["bs_equity"], inv_end=rs[-1]["bs_inventory_kwafers"])
out["phases"] = ph
# 决策时的借款上限（来自每季返回的 next.debt_limit_now）
lim = [json.load(open(ROOT / "data/raw/state_before_Q01.json"))["debt_limit_now"]]
for q in range(1, 16):
    lim.append(json.load(open(ROOT / f"data/raw/decide_Q{q:02d}.json"))["next"]["debt_limit_now"])
out["debt_limit_at_decision"] = lim

def check_limits(dec, res):
    """返回违反借款上限的季度（上限=MAX(8,0.6×决策时权益)）。"""
    eq_prev, debt_prev, bad = O["equity"], O["debt"], []
    for d, x in zip(dec, res):
        limit = max(8.0, 0.6 * eq_prev)
        if debt_prev + d["borrow"] > limit + 1e-6:
            bad.append((x["q"], round(debt_prev + d["borrow"], 2), round(limit, 2)))
        eq_prev, debt_prev = x["eq"], x["debt"]
    return bad

act = sim.actual
def scen(name, dec):
    res = sim.run(dec)
    em = max(x["em"] for x in res)
    print(f"{name:40s} 期末权益 {res[-1]['eq']:8.2f} 差额 {res[-1]['eq']-sim.base[-1]['eq']:+7.2f} 最低现金 {min(x['cash'] for x in res):5.2f} 紧急授信峰值 {em:5.2f} 借款超限 {check_limits(dec, res)}")
    return res
# S11：第1季在借款上限高时预借8.0（存成现金），Q8-Q10 扩产翻倍（同S9），Q11/Q12 还款相应加大
s = copy.deepcopy(act); s[0]["borrow"] = 8.0
for t, e in {8: 4.2, 9: 4.8, 10: 3.6}.items(): s[t-1]["capex"] += e
s[10]["borrow"] = -10.0; s[11]["borrow"] = -12.8
scen("S11 Q1预借8.0 + Q8-Q10扩产翻倍", s)
# S12：Q1预借8.0 + 扩产整体提前两季（同S8）
s = copy.deepcopy(act); s[0]["borrow"] = 8.0
exp = {5: 3.0, 6: 2.4, 7: 1.8, 8: 4.2, 9: 4.8, 10: 3.6}
for t in exp: s[t-1]["capex"] = 1.5
for t, e in exp.items(): s[t-3]["capex"] = 1.5 + e
s[10]["borrow"] = -10.0; s[11]["borrow"] = -12.8
scen("S12 Q1预借8.0 + 扩产提前两季", s)
# S13：事后看的"可执行"组合：Q1满开工+预借8.0+Q8-Q10扩产翻倍+Q11/Q12各扩7.2+HBM精确排产
s = copy.deepcopy(act); s[0]["utilization"] = 1.0; s[0]["borrow"] = 8.0
for t, e in {8: 4.2, 9: 4.8, 10: 3.6}.items(): s[t-1]["capex"] += e
s[10]["capex"] += 7.2; s[11]["capex"] += 7.2; s[10]["borrow"] = -2.0; s[11]["borrow"] = -8.0
for i, r in enumerate(Q):
    if r["hbm_share"] > 0: s[i]["hbm_share"] = r["hbm_demand_kwafers"] / (r["capacity_kwafers"] * r["utilization"])
res13 = scen("S13 可执行的事后组合", s)
print({k: (round(v, 3) if isinstance(v, float) else v) for k, v in out.items() if k not in ("phases",)})
for k, v in ph.items():
    print(k, {a: round(b, 2) for a, b in v.items()})
json.dump(out, open(ROOT / "data/review_numbers.json", "w"), ensure_ascii=False, indent=1)

print("---- 「重来」方案（只用当时可得的信息能想到的规则；不含紧急授信） ----")
def viol_new(dec, res):
    eq_prev, debt_prev, bad = O["equity"], O["debt"], []
    for d, x in zip(dec, res):
        limit = max(8.0, 0.6 * eq_prev)
        if d["borrow"] > 0 and debt_prev + d["borrow"] > limit + 1e-6:
            bad.append(x["q"])
        eq_prev, debt_prev = x["eq"], x["debt"]
    return bad
def redo_variant(extra_q5_7, extra_q11_12, util_q1=1.0):
    s = copy.deepcopy(act); s[0]["utilization"] = util_q1; s[0]["borrow"] = 14.9
    for t in range(2, 10): s[t-1]["borrow"] = 0.0
    for t in [5, 6, 7]: s[t-1]["capex"] += extra_q5_7
    s[10]["capex"] += extra_q11_12; s[11]["capex"] += extra_q11_12
    s[9]["borrow"] = -2.0; s[10]["borrow"] = -10.0; s[11]["borrow"] = -8.9
    if extra_q11_12 > 0:   # 顶部前多扩产时，相应推迟还款，避免触发紧急授信
        s[10]["borrow"] = -10.0 + extra_q11_12; s[11]["borrow"] = -8.9 + extra_q11_12; s[12]["borrow"] = -2 * extra_q11_12
    return s
redo = {}
for name, args in [("R0 只做：Q1满开工", None), ("R1 Q1满开工+Q1预借14.9", (0.0, 0.0)), ("R2 R1+Q5-Q7每季多扩1.5", (1.5, 0.0)),
                   ("R3 R2+Q11/Q12每季多扩3.6", (1.5, 3.6))]:
    if args is None:
        s = copy.deepcopy(act); s[0]["utilization"] = 1.0
    else:
        s = redo_variant(*args)
    res = sim.run(s)
    redo[name] = dict(final_equity=res[-1]["eq"], delta=res[-1]["eq"] - sim.base[-1]["eq"], min_cash=min(x["cash"] for x in res),
                      em_peak=max(x["em"] for x in res), max_debt=max(x["debt"] for x in res), new_borrow_violations=viol_new(s, res),
                      cum_interest=sum((0.015 * (s_prev_d) ) for s_prev_d in [0]))
    print(f"{name:34s} 期末权益 {res[-1]['eq']:8.2f} 差额 {res[-1]['eq']-sim.base[-1]['eq']:+7.2f} 最低现金 {min(x['cash'] for x in res):5.2f} 紧急 {max(x['em'] for x in res):5.2f} 最高借款 {max(x['debt'] for x in res):5.2f} 新借超限 {viol_new(s,res)}")
out["redo"] = redo
json.dump(out, open(ROOT / "data/review_numbers.json", "w"), ensure_ascii=False, indent=1)
