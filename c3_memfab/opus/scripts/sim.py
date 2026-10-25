"""用推断出的引擎参数重建会计模型，先复现真实16季结果，再跑反事实情景（全部为估算，非引擎输出）。
推断参数（假设）：普通内存每千片价格=0.024×价格指数；HBM=0.024×HBM价格指数；变动成本0.005/千片；工厂固定费用1.0/季；
折旧=2.0+已投产（投入满4季）资本开支/20；利息=1.5%×期初借款+3%×期初紧急授信−0.8%×期初现金；税率15%只对盈利；
HBM产量=产量×HBM比例（假设开工率同样作用于HBM）；现金低于0.5自动补足到0.5（紧急授信，假设）。"""
import json, pathlib, copy
ROOT = pathlib.Path(__file__).resolve().parents[1]
D = json.load(open(ROOT / "data/quarterly.json"))
Q = D["quarters"]; O = D["opening"]
P_BASE, V, PLANT, TAX = 0.024, 0.005, 1.0, 0.15

def run(dec, extra_cap=None):
    """dec: list of dicts with utilization, sell_fraction, capex, hbm_rnd, hbm_share, borrow (16 quarters)."""
    cash, debt, em, inv, kw, ppe, eq = O["cash"], O["debt"], O["emergency_debt"], O["inventory"], O["inventory_kwafers"], O["ppe_net"], O["equity"]
    rnd_cum, qual_from = 0.0, None
    capex_hist, out = [], []
    for i, d in enumerate(dec):
        t = i + 1
        rnd_cum += d["hbm_rnd"]
        if qual_from is None and rnd_cum >= 3.0 - 1e-9:
            qual_from = t + 3   # 本季累计满30亿，引擎显示第(t+3)季起可量产（真实：Q1投满→Q4）
        capex_hist.append(d["capex"])
        cap = 300 + sum((c - 1.5) / 0.12 for c in capex_hist[:-4]) if t > 4 else 300.0
        if extra_cap: cap += extra_cap.get(t, 0)
        m = Q[i]
        dep = 2.0 + (sum(c / 20 for c in capex_hist[:-4]) if t > 4 else 0)
        prod = cap * d["utilization"]
        share = d["hbm_share"] if (qual_from and t >= qual_from) else 0.0
        hbm = prod * share
        std_out = prod - hbm
        uc = (dep + PLANT + V * prod) / prod
        pool_v, pool_k = inv + std_out * uc, kw + std_out
        avg = pool_v / pool_k if pool_k > 0 else 0
        sold = min(d["sell_fraction"] * pool_k, m["demand_kwafers"])
        hsold = min(hbm, m["hbm_demand_kwafers"])
        end_k = pool_k - sold
        nrv = 0.95 * m["price_index"] * P_BASE
        end_v = end_k * avg
        wd = max(0.0, end_v - end_k * nrv) if end_k > 1e-9 else 0.0
        end_v -= wd
        rev_s, rev_h = sold * m["price_index"] * P_BASE, hsold * m["hbm_price_index"] * P_BASE
        cogs = sold * avg + hbm * uc + wd
        rnd = 0.8 + d["hbm_rnd"]
        oi = rev_s + rev_h - cogs - rnd - 0.25
        nint = 0.015 * debt + 0.03 * em - 0.008 * cash
        pbt = oi - nint
        tax = TAX * max(0.0, pbt)
        ni = pbt - tax
        ocf = ni + dep - (end_v - inv)
        cash = cash + ocf - d["capex"] + d["borrow"]
        debt += d["borrow"]
        emb = 0.0
        if cash < 0.5:
            emb = 0.5 - cash; cash += emb; em += emb
        ppe = ppe + d["capex"] - dep
        inv, kw = end_v, end_k
        eq += ni
        out.append(dict(q=t, cap=cap, prod=prod, hbm=hbm, sold=sold, hsold=hsold, rev=rev_s + rev_h, rev_s=rev_s, rev_h=rev_h,
                        cogs=cogs, wd=wd, ni=ni, cash=cash, debt=debt, em=em, eq=eq, inv=inv, kw=kw, ppe=ppe, tax=tax, ocf=ocf, emb=emb))
    return out

actual = [dict(utilization=r["utilization"], sell_fraction=r["sell_fraction"], capex=r["capex"], hbm_rnd=r["hbm_rnd"],
               hbm_share=r["hbm_share"], borrow=r["borrow"]) for r in Q]
base = run(actual)
err = max(max(abs(b["eq"] - r["bs_equity"]), abs(b["cash"] - r["bs_cash"]), abs(b["ni"] - r["is_net_income"])) for b, r in zip(base, Q))
print(f"复现真实结果：权益/现金/净利最大偏差 {err:.4f}（十亿美元）")

def summary(name, res, note=""):
    cum_ni = sum(x["ni"] for x in res)
    em_used = max(x["em"] for x in res)
    print(f"{name:28s} 期末权益 {res[-1]['eq']:8.2f}  差额 {res[-1]['eq']-base[-1]['eq']:+8.2f}  累计营收 {sum(x['rev'] for x in res):8.2f}  "
          f"期末现金 {res[-1]['cash']:7.2f}  最低现金 {min(x['cash'] for x in res):5.2f}  最高负债 {max(x['debt']+x['em'] for x in res):5.2f}  紧急授信峰值 {em_used:5.2f}  期末库存 {res[-1]['kw']:6.1f}千片 {note}")
    return dict(name=name, final_equity=res[-1]["eq"], delta=res[-1]["eq"] - base[-1]["eq"], cum_rev=sum(x["rev"] for x in res),
                min_cash=min(x["cash"] for x in res), max_debt=max(x["debt"] + x["em"] for x in res), em_peak=em_used, end_kw=res[-1]["kw"], note=note)

results = [summary("实际路径（模型复现）", base)]
# 情景1：下行期跟随同业减产（Q2-Q5开工率70%）
s = copy.deepcopy(actual)
for t in [2, 3, 4, 5]: s[t-1]["utilization"] = 0.7
results.append(summary("S1 下行期减产到70%(Q2-Q5)", run(s)))
# 情景1b：下行期大幅减产（Q2-Q5开工率50%）
s = copy.deepcopy(actual)
for t in [2, 3, 4, 5]: s[t-1]["utilization"] = 0.5
results.append(summary("S1b 下行期减产到50%(Q2-Q5)", run(s)))
# 情景2：不做HBM
s = copy.deepcopy(actual)
s[0]["hbm_rnd"] = 0.0
for x in s: x["hbm_share"] = 0.0
results.append(summary("S2 不投HBM", run(s)))
# 情景2b：HBM研发晚一年（Q5投满，Q8可量产）
s = copy.deepcopy(actual)
s[0]["hbm_rnd"] = 0.0; s[4]["hbm_rnd"] = 3.0
results.append(summary("S2b HBM研发推迟到Q5", run(s)))
# 情景3：完全不扩产（每季只做15亿维持）
s = copy.deepcopy(actual)
for x in s: x["capex"] = 1.5
# 不扩产省下的钱少借：把Q5-Q9的借款调低到不触发紧急授信为止（保持实际借款，简单起见）
results.append(summary("S3 不扩产(借款同实际)", run(s)))
# 情景4（事后看）：Q11、Q12各多扩产36亿（第15、16季各多30千片）
s = copy.deepcopy(actual)
s[10]["capex"] += 3.6; s[11]["capex"] += 3.6
results.append(summary("S4 顶部前再扩产(Q11/Q12各+36亿)", run(s)))
s = copy.deepcopy(actual)
s[10]["capex"] += 7.2; s[11]["capex"] += 7.2
results.append(summary("S4b 顶部前再扩产(Q11/Q12各+72亿)", run(s)))
# 情景5（事后看）：Q12-Q13不动用库存，留到Q14-Q16卖
s = copy.deepcopy(actual)
for t in [12, 13]:
    r = Q[t-1]; stdout = r["produced_kwafers"] - r["hbm_kwafers"]
    s[t-1]["sell_fraction"] = stdout / (Q[t-2]["bs_inventory_kwafers"] + stdout)  # 只卖当季产出
res5 = run(s)
results.append(summary("S5 Q12-Q13惜售,库存留到后面", res5))
# 情景6：HBM精确按需生产（完美预见）
s = copy.deepcopy(actual)
for i, r in enumerate(Q):
    if r["hbm_share"] > 0:
        s[i]["hbm_share"] = r["hbm_demand_kwafers"] / (r["capacity_kwafers"] * r["utilization"])
results.append(summary("S6 HBM按需求精确排产", run(s)))
# 情景7：Q1也满开工
s = copy.deepcopy(actual); s[0]["utilization"] = 1.0
results.append(summary("S7 Q1满开工", run(s)))
# 情景8：Q14-Q16普通内存产能多给HBM之外的部分——即HBM份额减到需求、外加S4
json.dump(dict(base=base, scenarios=results), open(ROOT / "data/scenarios.json", "w"), ensure_ascii=False, indent=1)

print("---- 追加情景 ----")
more = []
# S8：同样规模的扩产提前两个季度（Q3-Q8）
s = copy.deepcopy(actual)
exp = {5: 3.0, 6: 2.4, 7: 1.8, 8: 4.2, 9: 4.8, 10: 3.6}
for t in exp: s[t-1]["capex"] = 1.5
for t, e in exp.items(): s[t-3]["capex"] = 1.5 + e
more.append(summary("S8 扩产整体提前两季(Q3-Q8)", run(s)))
# S9：Q8-Q10扩产翻倍
s = copy.deepcopy(actual)
for t, e in {8: 4.2, 9: 4.8, 10: 3.6}.items(): s[t-1]["capex"] += e
more.append(summary("S9 Q8-Q10扩产翻倍", run(s)))
# S10：事后最优组合（Q1满开工+HBM精确排产+Q11/Q12各多扩72亿+Q12-Q13惜售）
s = copy.deepcopy(actual)
s[0]["utilization"] = 1.0
for i, r in enumerate(Q):
    if r["hbm_share"] > 0: s[i]["hbm_share"] = r["hbm_demand_kwafers"] / (r["capacity_kwafers"] * r["utilization"])
s[10]["capex"] += 7.2; s[11]["capex"] += 7.2; s[10]["borrow"] = 0.0; s[11]["borrow"] = 0.0
res10 = run(s)
for t in [12, 13]:
    pass
more.append(summary("S10 事后组合(满开工+精确HBM+顶部扩产,少还债)", res10))
json.dump(dict(base=base, scenarios=results + more), open(ROOT / "data/scenarios.json", "w"), ensure_ascii=False, indent=1)
# HBM 多排产的逐季代价拆解（被作废的HBM片数）
print("---- HBM 作废片数 ----")
for r in Q:
    if r["hbm_kwafers"] > 0:
        print(r["quarter"], round(r["hbm_kwafers"] - r["hbm_sold_kwafers"], 2), "普通内存当季价(百万美元/千片)", round(r["price_index"] * 24, 1))
print("Q14-Q16 普通内存需求缺口(千片)", [round(r["demand_kwafers"] - r["std_sold_kwafers"], 1) for r in Q[13:]],
      "按当季价格折算(十亿美元)", round(sum((r["demand_kwafers"] - r["std_sold_kwafers"]) * r["price_index"] * 0.024 for r in Q[13:]), 2))
