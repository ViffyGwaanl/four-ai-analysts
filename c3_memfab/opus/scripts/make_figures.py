"""复盘报告用图（matplotlib）。数据：交付/data/quarterly.json、scenarios.json、review_numbers.json。
配色按 dataviz 参考色板（蓝 #2a78d6 / 橙 #eb6834 / 青 #1baf7a / 紫 #4a3aa7，已用校验脚本检查色觉安全）；所有图都是单一纵轴。"""
import json, pathlib
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib import font_manager as fm

ROOT = pathlib.Path(__file__).resolve().parents[1]
D = json.load(open(ROOT / "data/quarterly.json"))
SC = json.load(open(ROOT / "data/scenarios.json"))
RV = json.load(open(ROOT / "data/review_numbers.json"))
Q = D["quarters"]
FIG = ROOT / "data/figures"; FIG.mkdir(parents=True, exist_ok=True)
plt.rcParams["font.family"] = ["Hiragino Sans GB", "PingFang HK", "Arial Unicode MS", "sans-serif"]
plt.rcParams["axes.unicode_minus"] = False
BLUE, ORANGE, AQUA, VIOLET = "#2a78d6", "#eb6834", "#1baf7a", "#4a3aa7"
INK, INK2, MUTED, GRID, AXIS = "#0b0b0b", "#52514e", "#898781", "#e1e0d9", "#c3c2b7"
X = list(range(1, 17)); XL = [f"Q{i}" for i in X]

def base(ax, ylabel):
    ax.set_facecolor("white")
    for s in ("top", "right", "left"):
        ax.spines[s].set_visible(False)
    ax.spines["bottom"].set_color(AXIS)
    ax.tick_params(colors=INK2, labelsize=9, length=0)
    ax.grid(axis="y", color=GRID, linewidth=0.8)
    ax.set_axisbelow(True)
    ax.set_xticks(X); ax.set_xticklabels(XL)
    ax.set_ylabel(ylabel, color=INK2, fontsize=9)

def phases(ax, ymax):
    spans = [(0.5, 4.5, "下行"), (4.5, 8.5, "复苏与布局"), (8.5, 12.5, "加速"), (12.5, 16.5, "超级周期")]
    for k, (a, b, t) in enumerate(spans):
        if k % 2 == 0:
            ax.axvspan(a, b, color="#f3f2ee", zorder=0, linewidth=0)
        ax.text((a + b) / 2, ymax, t, ha="center", va="top", fontsize=8.5, color=MUTED)

def save(fig, name):
    fig.tight_layout()
    fig.savefig(FIG / name, dpi=200, facecolor="white")
    plt.close(fig)

# 1 价格指数
fig, ax = plt.subplots(figsize=(8.2, 3.4))
p = [q["price_index"] for q in Q]; h = [q["hbm_price_index"] for q in Q]
base(ax, "价格指数（1.00 = 每千片 0.024 十亿美元）")
phases(ax, 10.4)
ax.plot(X, h, color=VIOLET, lw=2, marker="o", ms=4, label="HBM 价格指数")
ax.plot(X, p, color=BLUE, lw=2, marker="o", ms=4, label="普通内存价格指数")
ax.set_ylim(0, 10.6)
ax.annotate("底部 0.50", (3, 0.5), xytext=(3, 2.2), ha="center", fontsize=8.5, color=INK2, arrowprops=dict(arrowstyle="-", color=MUTED, lw=0.8))
ax.annotate("4.55", (16, 4.55), xytext=(15.3, 5.6), fontsize=8.5, color=INK2)
ax.annotate("9.6", (16, 9.6), xytext=(15.4, 9.75), fontsize=8.5, color=INK2)
ax.legend(frameon=False, fontsize=9, loc="upper left", bbox_to_anchor=(0.0, 0.93))
save(fig, "fig1_price.png")

# 2 营收结构与净利润
fig, ax = plt.subplots(figsize=(8.2, 3.6))
rs = [q["is_revenue_std"] for q in Q]; rh = [q["is_revenue_hbm"] for q in Q]; ni = [q["is_net_income"] for q in Q]
base(ax, "十亿美元")
ax.bar(X, rs, color=BLUE, width=0.62, label="普通内存收入", edgecolor="white", linewidth=1)
ax.bar(X, rh, bottom=rs, color=VIOLET, width=0.62, label="HBM 收入", edgecolor="white", linewidth=1)
ax.plot(X, ni, color=ORANGE, lw=2, marker="o", ms=4, label="净利润")
ax.axhline(0, color=AXIS, lw=0.8)
ax.text(16.45, Q[-1]["is_revenue"], f"营收\n{Q[-1]['is_revenue']:.2f}", fontsize=8.5, color=INK2, va="center")
ax.text(16.45, Q[-1]["is_net_income"], f"净利润\n{Q[-1]['is_net_income']:.2f}", fontsize=8.5, color=INK2, va="center")
ax.set_xlim(0.4, 17.6)
ax.annotate(f"Q1 净亏 {Q[0]['is_net_income']:.2f}", (1, Q[0]["is_net_income"]), xytext=(1.3, -12), fontsize=8.5, color=INK2)
ax.set_ylim(-15, 80)
ax.legend(frameon=False, fontsize=9, loc="upper left")
save(fig, "fig2_revenue.png")

# 3 现金、借款与股东权益
fig, ax = plt.subplots(figsize=(8.2, 3.4))
eq = [D["opening"]["equity"]] + [q["bs_equity"] for q in Q]; cash = [D["opening"]["cash"]] + [q["bs_cash"] for q in Q]; debt = [D["opening"]["debt"]] + [q["bs_debt"] for q in Q]
XX = list(range(0, 17))
base(ax, "十亿美元")
ax.set_xticks(XX); ax.set_xticklabels(["期初"] + XL)
ax.plot(XX, eq, color=BLUE, lw=2, marker="o", ms=3.5, label="股东权益")
ax.plot(XX, cash, color=AQUA, lw=2, marker="o", ms=3.5, label="现金")
ax.plot(XX, debt, color=ORANGE, lw=2, marker="o", ms=3.5, label="借款")
ax.text(16.35, eq[-1], f"权益 {eq[-1]:.2f}", fontsize=8.5, color=INK2, va="center")
ax.text(16.35, cash[-1], f"现金 {cash[-1]:.2f}", fontsize=8.5, color=INK2, va="center")
ax.text(16.35, debt[-1] + 4, "借款 0", fontsize=8.5, color=INK2, va="center")
ax.annotate("借款峰值 16.80（Q9）", (9, 16.8), xytext=(9.6, 70), fontsize=8.5, color=INK2, arrowprops=dict(arrowstyle="-", color=MUTED, lw=0.8))
ax.text(8, -12, "现金低点 1.79（Q8）", fontsize=8.5, color=INK2, ha="center", va="center")
ax.set_ylim(-20, 235); ax.set_xlim(-0.6, 18.2)
ax.legend(frameon=False, fontsize=9, loc="upper left")
save(fig, "fig3_balance.png")

# 4 产量分配与需求
fig, ax = plt.subplots(figsize=(8.2, 3.6))
hb = [q["hbm_kwafers"] for q in Q]; sd = [q["produced_kwafers"] - q["hbm_kwafers"] for q in Q]
dem = [q["demand_kwafers"] + q["hbm_demand_kwafers"] for q in Q]
base(ax, "千片")
ax.bar(X, sd, color=BLUE, width=0.62, label="普通内存产量", edgecolor="white", linewidth=1)
ax.bar(X, hb, bottom=sd, color=VIOLET, width=0.62, label="HBM 产量", edgecolor="white", linewidth=1)
ax.plot(X, dem, color=ORANGE, lw=2, marker="o", ms=4, label="总需求（普通内存+HBM）")
ax.annotate("产大于需：攒库存", (4, 300), xytext=(2.2, 380), fontsize=8.5, color=INK2, arrowprops=dict(arrowstyle="-", color=MUTED, lw=0.8))
ax.annotate("需大于产：缺口 494.6 千片", (15, 640), xytext=(10.4, 640), fontsize=8.5, color=INK2, arrowprops=dict(arrowstyle="-", color=MUTED, lw=0.8))
ax.set_ylim(0, 730)
ax.legend(frameon=False, fontsize=9, loc="upper left")
save(fig, "fig4_capacity.png")

# 5 库存
fig, ax = plt.subplots(figsize=(8.2, 3.0))
inv = [D["opening"]["inventory_kwafers"]] + [q["bs_inventory_kwafers"] for q in Q]
base(ax, "千片")
ax.set_xticks(XX); ax.set_xticklabels(["期初"] + XL)
ax.bar(XX, inv, color=BLUE, width=0.62, edgecolor="white", linewidth=1)
ax.annotate("峰值 402（Q6）", (6, 402), xytext=(6.6, 420), fontsize=8.5, color=INK2)
ax.annotate("Q14 清零", (14, 0), xytext=(13.3, 60), fontsize=8.5, color=INK2)
ax.set_ylim(0, 470)
ax.set_title("期末库存（千片）", fontsize=10, color=INK, loc="left")
save(fig, "fig5_inventory.png")

# 6 决策价值（估算）：实际决策 − 替代方案
items = [
    ("投 HBM（对比：不投）", 82.48),
    ("底部逆周期扩产（对比：不扩产）", 60.20),
    ("下行期满开工（对比：减产到 70%）", 8.97),
    ("Q1 减产到 85%（对比：满开工）", -2.30),
    ("Q12-13 按需出货（对比：惜售到后面）", -2.83),
    ("Q11-12 停止扩产（对比：各多投 3.6）", -3.79),
    ("HBM 留安全余量（对比：按需求精确排产）", -4.30),
]
sc = {s["name"]: s["delta"] for s in SC["scenarios"]}
assert abs(sc["S2 不投HBM"] + 82.48) < 0.01 and abs(sc["S3 不扩产(借款同实际)"] + 60.20) < 0.01
fig, ax = plt.subplots(figsize=(8.2, 3.6))
labels = [a for a, _ in items][::-1]; vals = [b for _, b in items][::-1]
cols = [BLUE if v > 0 else ORANGE for v in vals]
ax.barh(range(len(vals)), vals, color=cols, height=0.58, edgecolor="white")
ax.set_yticks(range(len(vals))); ax.set_yticklabels(labels, fontsize=9, color=INK)
for s in ("top", "right", "left"):
    ax.spines[s].set_visible(False)
ax.spines["bottom"].set_color(AXIS)
ax.tick_params(colors=INK2, labelsize=9, length=0)
ax.grid(axis="x", color=GRID, linewidth=0.8); ax.set_axisbelow(True)
ax.axvline(0, color=AXIS, lw=0.8)
for k, v in enumerate(vals):
    ax.text(v + (1.2 if v > 0 else -1.2), k, f"{v:+.2f}", va="center", ha="left" if v > 0 else "right", fontsize=8.5, color=INK2)
ax.set_xlim(-14, 95)
ax.set_xlabel("对期末股东权益的影响（十亿美元，估算）", color=INK2, fontsize=9)
from matplotlib.patches import Patch
ax.legend(handles=[Patch(color=BLUE, label="实际决策创造的价值"), Patch(color=ORANGE, label="实际决策错失的价值（事后看）")], frameon=False, fontsize=9, loc="lower right")
save(fig, "fig6_decisions.png")
print("figures:", sorted(p.name for p in FIG.glob("*.png")))
