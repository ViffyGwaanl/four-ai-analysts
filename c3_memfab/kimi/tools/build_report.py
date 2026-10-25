import json
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
from docx import Document
from docx.enum.section import WD_ORIENT, WD_SECTION
from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT, WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Inches, Pt, RGBColor

ROOT = Path(__file__).resolve().parents[1]
DATA = json.loads((ROOT / "data" / "export.json").read_text(encoding="utf-8"))
INITIAL = json.loads((ROOT / "data" / "q00_state.json").read_text(encoding="utf-8"))
H = DATA["history"]
ASSETS = ROOT / "tools" / "assets"
ASSETS.mkdir(parents=True, exist_ok=True)
OUTPUT = ROOT / "经营复盘.docx"

NAVY = "17324D"
BLUE = "2E6FDB"
TEAL = "129B8D"
GOLD = "E5A93D"
PALE = "EDF3F8"
LIGHT = "F5F8FB"
TEXT = "243746"
MUTED = "657786"
WHITE = "FFFFFF"
RED = "C64747"

plt.rcParams["font.sans-serif"] = ["Noto Sans CJK SC", "PingFang SC", "Arial Unicode MS", "DejaVu Sans"]
plt.rcParams["axes.unicode_minus"] = False
plt.rcParams["figure.facecolor"] = "white"
plt.rcParams["axes.facecolor"] = "white"
plt.rcParams["axes.edgecolor"] = "#D8E1E8"
plt.rcParams["axes.titleweight"] = "bold"
plt.rcParams["axes.titlesize"] = 14
plt.rcParams["font.size"] = 10

q = np.array([x["quarter"] for x in H])
revenue = np.array([x["income_statement"]["revenue"] for x in H]) * 10
std_revenue = np.array([x["income_statement"]["revenue_std"] for x in H]) * 10
hbm_revenue = np.array([x["income_statement"]["revenue_hbm"] for x in H]) * 10
net_income = np.array([x["income_statement"]["net_income"] for x in H]) * 10
cfo = np.array([x["cash_flow"]["operating"] for x in H]) * 10
cash = np.array([x["balance_sheet"]["cash"] for x in H])
debt = np.array([x["balance_sheet"]["debt"] + x["balance_sheet"]["emergency_debt"] for x in H]) * 10
equity = np.array([x["balance_sheet"]["equity"] for x in H]) * 10
capacity = np.array([x["balance_sheet"]["capacity_kwafers"] for x in H])
hbm_output = np.array([x["operations"]["hbm_kwafers"] for x in H])

initial_equity = INITIAL["balance_sheet_now"]["equity"]
final = DATA["final"]
total_revenue = float(revenue.sum() / 10)
total_hbm = float(hbm_revenue.sum() / 10)
total_ni = DATA["cumulative_net_income"]
total_cfo = sum(x["cash_flow"]["operating"] for x in H)
total_capex = sum(x["decision"]["capex"] for x in H)
expansion_capex = sum(x["decision"]["capex"] - 1.5 for x in H)
total_writedown = sum(x["income_statement"]["inventory_writedown"] for x in H)
min_cash = min((x["balance_sheet"]["cash"], x["quarter"]) for x in H)
peak_debt = max((x["balance_sheet"]["debt"] + x["balance_sheet"]["emergency_debt"], x["quarter"]) for x in H)
std_unmet = sum(max(0, x["market"]["demand_kwafers"] - x["operations"]["std_sold_kwafers"]) for x in H)
hbm_unmet = sum(max(0, x["market"]["hbm_demand_kwafers"] - x["operations"]["hbm_sold_kwafers"]) for x in H)
hbm_excess = sum(max(0, x["operations"]["hbm_kwafers"] - x["operations"]["hbm_sold_kwafers"]) for x in H)
early_loss = sum(x["income_statement"]["net_income"] for x in H[:6])
later_profit = sum(x["income_statement"]["net_income"] for x in H[6:])
early_hbm_revenue = sum(H[i]["market"]["hbm_demand_kwafers"] * 24 * H[i]["market"]["hbm_price_index"] / 1000 for i in [3, 4])


def yi(value):
    return f"{value * 10:,.2f}"


def bn(value):
    return f"{value:,.4f}"


def pct(value, digits=2):
    return f"{value * 100:.{digits}f}%"


def style_chart(ax):
    ax.spines[["top", "right"]].set_visible(False)
    ax.grid(axis="y", color="#E5EAF0", linewidth=0.8)
    ax.set_axisbelow(True)
    ax.set_xticks(q)
    ax.set_xticklabels([f"Q{i}" for i in q], fontsize=8)


fig, ax = plt.subplots(figsize=(10, 4.6))
ax.bar(q - 0.19, revenue, width=0.38, color="#2E6FDB", label="营业收入")
ax.bar(q + 0.19, net_income, width=0.38, color="#129B8D", label="净利润")
ax.axhline(0, color="#657786", linewidth=0.8)
style_chart(ax)
ax.set_ylabel("亿美元")
ax.set_title("收入与净利润：从下行亏损到上行兑现")
ax.legend(frameon=False, ncol=2, loc="upper left")
fig.tight_layout()
fig.savefig(ASSETS / "revenue_profit.png", dpi=190, bbox_inches="tight")
plt.close(fig)

fig, ax = plt.subplots(figsize=(10, 4.6))
ax.bar(q, std_revenue, color="#2E6FDB", label="普通内存收入")
ax.bar(q, hbm_revenue, bottom=std_revenue, color="#129B8D", label="HBM收入")
style_chart(ax)
ax.set_ylabel("亿美元")
ax.set_title("收入结构：HBM自第6季开始贡献")
ax.legend(frameon=False, ncol=2, loc="upper left")
fig.tight_layout()
fig.savefig(ASSETS / "revenue_mix.png", dpi=190, bbox_inches="tight")
plt.close(fig)

fig, ax = plt.subplots(figsize=(10, 4.6))
ax.plot(q, equity, color="#17324D", marker="o", linewidth=2.4, label="股东权益")
ax.plot(q, cash * 10, color="#2E6FDB", marker="o", linewidth=2, label="现金")
ax.plot(q, debt, color="#E5A93D", marker="o", linewidth=2, label="普通及紧急债务")
style_chart(ax)
ax.set_ylabel("亿美元")
ax.set_title("资产负债轨迹：权益修复、现金累积、债务清零")
ax.legend(frameon=False, ncol=3, loc="upper left")
fig.tight_layout()
fig.savefig(ASSETS / "balance_trend.png", dpi=190, bbox_inches="tight")
plt.close(fig)

fig, ax = plt.subplots(figsize=(10, 4.6))
ax.bar(q, capacity, color="#DCE8F5", edgecolor="#2E6FDB", label="产能（千片/季）")
ax2 = ax.twinx()
ax2.plot(q, hbm_output, color="#129B8D", marker="o", linewidth=2.5, label="HBM产量（千片）")
style_chart(ax)
ax.set_ylabel("产能（千片/季）")
ax2.set_ylabel("HBM产量（千片）")
ax2.spines["top"].set_visible(False)
ax.set_title("产能与HBM产量：扩张在后期集中释放")
lines, labels = ax.get_legend_handles_labels()
lines2, labels2 = ax2.get_legend_handles_labels()
ax.legend(lines + lines2, labels + labels2, frameon=False, ncol=2, loc="upper left")
fig.tight_layout()
fig.savefig(ASSETS / "capacity_hbm.png", dpi=190, bbox_inches="tight")
plt.close(fig)


def set_cell_shading(cell, color):
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = tc_pr.find(qn("w:shd"))
    if shd is None:
        shd = OxmlElement("w:shd")
        tc_pr.append(shd)
    shd.set(qn("w:fill"), color)


def set_cell_margins(cell, top=90, start=100, bottom=90, end=100):
    tc = cell._tc
    tc_pr = tc.get_or_add_tcPr()
    tc_mar = tc_pr.first_child_found_in("w:tcMar")
    if tc_mar is None:
        tc_mar = OxmlElement("w:tcMar")
        tc_pr.append(tc_mar)
    for m, value in [("top", top), ("start", start), ("bottom", bottom), ("end", end)]:
        node = tc_mar.find(qn(f"w:{m}"))
        if node is None:
            node = OxmlElement(f"w:{m}")
            tc_mar.append(node)
        node.set(qn("w:w"), str(value))
        node.set(qn("w:type"), "dxa")


def set_repeat_header(row):
    tr_pr = row._tr.get_or_add_trPr()
    tbl_header = OxmlElement("w:tblHeader")
    tbl_header.set(qn("w:val"), "true")
    tr_pr.append(tbl_header)


def set_run_font(run, size=None, bold=None, color=None, east_asia="微软雅黑"):
    run.font.name = "Aptos"
    run._element.get_or_add_rPr().rFonts.set(qn("w:eastAsia"), east_asia)
    if size is not None:
        run.font.size = Pt(size)
    if bold is not None:
        run.bold = bold
    if color:
        run.font.color.rgb = RGBColor.from_string(color)


def add_text(text="", style=None, bold_prefix=None, color=None, size=None, align=None):
    p = doc.add_paragraph(style=style)
    if align is not None:
        p.alignment = align
    if bold_prefix and text.startswith(bold_prefix):
        r1 = p.add_run(bold_prefix)
        set_run_font(r1, size=size, bold=True, color=color)
        r2 = p.add_run(text[len(bold_prefix):])
        set_run_font(r2, size=size, color=color)
    else:
        r = p.add_run(text)
        set_run_font(r, size=size, color=color)
    return p


def add_bullet(text, level=0):
    p = doc.add_paragraph(style="List Bullet" if level == 0 else "List Bullet 2")
    r = p.add_run(text)
    set_run_font(r, size=10.5)
    p.paragraph_format.space_after = Pt(4)
    return p


def add_callout(title, body, color=TEAL):
    table = doc.add_table(rows=1, cols=1)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    cell = table.cell(0, 0)
    set_cell_shading(cell, "E8F5EE" if color == TEAL else "FFF2C7")
    set_cell_margins(cell, 140, 180, 140, 180)
    p = cell.paragraphs[0]
    r = p.add_run(title + "\n")
    set_run_font(r, size=11, bold=True, color=color)
    r = p.add_run(body)
    set_run_font(r, size=10.5, color=TEXT)
    doc.add_paragraph().paragraph_format.space_after = Pt(0)
    return table


def add_table(headers, rows, font_size=8.5, widths=None):
    table = doc.add_table(rows=1, cols=len(headers))
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = widths is None
    table.style = "Table Grid"
    hdr = table.rows[0]
    set_repeat_header(hdr)
    for i, text in enumerate(headers):
        cell = hdr.cells[i]
        set_cell_shading(cell, NAVY)
        set_cell_margins(cell)
        cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r = p.add_run(str(text))
        set_run_font(r, size=font_size, bold=True, color=WHITE)
        if widths:
            cell.width = Cm(widths[i])
    for ridx, row in enumerate(rows):
        cells = table.add_row().cells
        for i, value in enumerate(row):
            cell = cells[i]
            set_cell_margins(cell)
            cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
            if ridx % 2:
                set_cell_shading(cell, LIGHT)
            p = cell.paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.LEFT if i == 0 else WD_ALIGN_PARAGRAPH.RIGHT
            r = p.add_run(str(value))
            set_run_font(r, size=font_size, color=TEXT)
            if widths:
                cell.width = Cm(widths[i])
    doc.add_paragraph().paragraph_format.space_after = Pt(0)
    return table


def add_figure(path, caption):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.add_run().add_picture(str(path), width=Cm(16.7))
    cap = doc.add_paragraph()
    cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
    cap.paragraph_format.space_after = Pt(8)
    r = cap.add_run(caption)
    set_run_font(r, size=8.5, color=MUTED)


def add_page_number(paragraph):
    paragraph.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    r = paragraph.add_run("第 ")
    set_run_font(r, size=8, color=MUTED)
    run = paragraph.add_run()
    fld_char1 = OxmlElement("w:fldChar")
    fld_char1.set(qn("w:fldCharType"), "begin")
    instr = OxmlElement("w:instrText")
    instr.set(qn("xml:space"), "preserve")
    instr.text = " PAGE "
    fld_char2 = OxmlElement("w:fldChar")
    fld_char2.set(qn("w:fldCharType"), "end")
    run._r.append(fld_char1)
    run._r.append(instr)
    run._r.append(fld_char2)
    r = paragraph.add_run(" 页｜董事会材料")
    set_run_font(r, size=8, color=MUTED)


doc = Document()
section = doc.sections[0]
section.page_width = Cm(21)
section.page_height = Cm(29.7)
section.top_margin = Cm(1.65)
section.bottom_margin = Cm(1.55)
section.left_margin = Cm(1.75)
section.right_margin = Cm(1.75)
section.header_distance = Cm(0.7)
section.footer_distance = Cm(0.7)

styles = doc.styles
normal = styles["Normal"]
normal.font.name = "Aptos"
normal._element.rPr.rFonts.set(qn("w:eastAsia"), "微软雅黑")
normal.font.size = Pt(10.5)
normal.font.color.rgb = RGBColor.from_string(TEXT)
normal.paragraph_format.line_spacing = 1.28
normal.paragraph_format.space_after = Pt(7)
for name, size, color in [("Title", 30, NAVY), ("Heading 1", 20, NAVY), ("Heading 2", 14, BLUE), ("Heading 3", 11.5, TEAL)]:
    st = styles[name]
    st.font.name = "Aptos Display"
    st._element.rPr.rFonts.set(qn("w:eastAsia"), "微软雅黑")
    st.font.size = Pt(size)
    st.font.bold = True
    st.font.color.rgb = RGBColor.from_string(color)
    st.paragraph_format.space_before = Pt(12)
    st.paragraph_format.space_after = Pt(7)
    st.paragraph_format.keep_with_next = True

header = section.header.paragraphs[0]
r = header.add_run("内存芯片公司｜16季度经营复盘")
set_run_font(r, size=8.5, bold=True, color=NAVY)
header.alignment = WD_ALIGN_PARAGRAPH.LEFT
add_page_number(section.footer.paragraphs[0])

doc.core_properties.title = "从周期防御到HBM增长：16季度经营复盘"
doc.core_properties.subject = "董事会经营复盘"
doc.core_properties.author = "经营复盘项目组"
doc.core_properties.keywords = "内存芯片,HBM,经营复盘,三张表"
doc.core_properties.comments = "数据来源：经营模拟引擎导出数据。"

banner = doc.add_table(rows=1, cols=1)
cell = banner.cell(0, 0)
set_cell_shading(cell, NAVY)
set_cell_margins(cell, 300, 260, 300, 260)
p = cell.paragraphs[0]
r = p.add_run("董事会经营复盘")
set_run_font(r, size=12, bold=True, color=WHITE)
p = doc.add_paragraph()
p.paragraph_format.space_before = Pt(55)
r = p.add_run("从周期防御\n到 HBM 增长")
set_run_font(r, size=31, bold=True, color=NAVY)
p = doc.add_paragraph()
r = p.add_run("16 个季度的经营结果、决策得失与重做方案")
set_run_font(r, size=15, color=BLUE)
p = doc.add_paragraph()
p.paragraph_format.space_before = Pt(18)
r = p.add_run("虚构市场模拟｜经营周期 Q1—Q16｜编制日期 2026年10月22日")
set_run_font(r, size=10, color=MUTED)

p = doc.add_paragraph()
p.paragraph_format.space_before = Pt(35)
summary = doc.add_table(rows=2, cols=3)
summary.alignment = WD_TABLE_ALIGNMENT.CENTER
metrics = [
    ("期末股东权益", f"{yi(final['equity'])} 亿美元"),
    ("累计净利润", f"{yi(total_ni)} 亿美元"),
    ("累计经营现金流", f"{yi(total_cfo)} 亿美元"),
    ("期末现金 / 债务", f"{yi(final['cash'])} / 0 亿美元"),
    ("产能增长", "300 → 570 千片/季"),
    ("资金链", "16季未断裂"),
]
for idx, (label, value) in enumerate(metrics):
    cell = summary.cell(idx // 3, idx % 3)
    set_cell_shading(cell, "E8F5EE" if idx % 3 != 1 else "EDF3F8")
    set_cell_margins(cell, 170, 140, 170, 140)
    p = cell.paragraphs[0]
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run(label + "\n")
    set_run_font(r, size=9, bold=True, color=MUTED)
    r = p.add_run(value)
    set_run_font(r, size=13, bold=True, color=NAVY)

p = doc.add_paragraph()
p.paragraph_format.space_before = Pt(35)
r = p.add_run("核心判断")
set_run_font(r, size=11, bold=True, color=TEAL)
p = doc.add_paragraph()
r = p.add_run("本轮经营成功来自在下行期保住流动性、按时完成HBM资格投入，并在复苏中以扩产和产品结构放大利润；主要遗憾是早期减产过度、部分HBM订单预测偏差，以及产能始终未完全追上需求。")
set_run_font(r, size=11, color=TEXT)
p = doc.add_paragraph()
p.paragraph_format.space_before = Pt(18)
r = p.add_run("本报告仅用于研究与展示，不构成投资建议。市场、时间和公司均为虚构。")
set_run_font(r, size=9, color=MUTED)
doc.add_page_break()

doc.add_heading("一、董事会摘要", level=1)
add_callout("结果概览", f"第16季末股东权益{yi(final['equity'])}亿美元，为期初{yi(initial_equity)}亿美元的{final['equity']/initial_equity:.2f}倍，增长{(final['equity']/initial_equity-1)*100:.2f}%；累计净利润{yi(total_ni)}亿美元，累计经营现金流{yi(total_cfo)}亿美元。普通债务与紧急授信均为零，16季未发生资金链断裂。")
add_bullet(f"经营分为两段：Q1—Q6累计亏损{yi(abs(early_loss))}亿美元，Q7—Q16累计盈利{yi(later_profit)}亿美元，最终形成累计净利润{yi(total_ni)}亿美元。")
add_bullet(f"HBM自Q6量产，累计收入{yi(total_hbm)}亿美元，占16季总收入{total_hbm/total_revenue*100:.2f}%；Q16单季占比已达{H[-1]['income_statement']['revenue_hbm']/H[-1]['income_statement']['revenue']*100:.2f}%。")
add_bullet(f"累计资本开支{yi(total_capex)}亿美元，其中超出每季15亿美元维护线的扩张投入{yi(expansion_capex)}亿美元；产能由300提升至570千片/季，增幅90%。")
add_bullet(f"最低现金为Q8的{yi(min_cash[0])}亿美元，仍高于5亿美元紧急授信触发线；峰值债务为{yi(peak_debt[0])}亿美元，Q13起普通债务清零。")
add_bullet(f"需要改进：Q3少满足普通内存需求25千片；16季普通内存需求缺口累计{std_unmet:.2f}千片，HBM超额生产累计{hbm_excess:.2f}千片、未满足需求累计{hbm_unmet:.2f}千片。缺口不等于可实现利润，仍受产能与产品组合约束。")

doc.add_heading("二、16季度经营结果", level=1)
doc.add_heading("2.1 最终成绩与财务质量", level=2)
rows = [
    ["股东权益", yi(initial_equity), yi(final["equity"]), f"+{yi(final['equity']-initial_equity)}"],
    ["现金", yi(INITIAL["balance_sheet_now"]["cash"]), yi(final["cash"]), f"+{yi(final['cash']-INITIAL['balance_sheet_now']['cash'])}"],
    ["普通债务+紧急债务", yi(INITIAL["balance_sheet_now"]["debt"]), "0.00", f"-{yi(INITIAL['balance_sheet_now']['debt'])}"],
    ["存货", yi(INITIAL["balance_sheet_now"]["inventory"]), yi(final["inventory"]), f"-{yi(INITIAL['balance_sheet_now']['inventory'])}"],
    ["产能（千片/季）", "300", "570", "+270 / +90%"],
]
add_table(["项目", "期初", "Q16末", "变化"], rows, font_size=9, widths=[5.2, 3.5, 3.5, 4.2])
add_text(f"累计营业收入{yi(total_revenue)}亿美元，累计净利润{yi(total_ni)}亿美元，累计净利率{total_ni/total_revenue*100:.2f}%。这一净利率包含后期极高景气价格，不应视为稳态盈利假设。期末权益与期初差额和累计净利润存在0.001亿美元的披露舍入差。", size=10.5)
add_figure(ASSETS / "revenue_profit.png", "图1｜逐季营业收入与净利润。来源：export.json → history → income_statement；金额换算为亿美元。")

doc.add_heading("2.2 五个阶段", level=2)
phase_specs = [(0, 3, "Q1—Q3｜下行防御", "价格1.00→0.50；减产去库、完成HBM资格投入，但Q3需求判断偏保守。"), (3, 6, "Q4—Q6｜筑底与转型", "价格企稳；Q6开始HBM量产，经营现金流改善，权益在Q6触底。"), (6, 10, "Q7—Q10｜扭亏与扩产", "Q7扭亏；HBM收入在Q10超过普通内存，扩产接续推进。"), (10, 13, "Q11—Q13｜释放与去杠杆", "新产能释放，利润放大；Q12开始还款，Q13普通债务清零。"), (13, 16, "Q14—Q16｜高景气收获", "满产全售、不再扩张；Q16毛利率90.11%，现金与权益创高点。")]
phase_rows = []
for start, end, label, desc in phase_specs:
    ni = sum(x["income_statement"]["net_income"] for x in H[start:end])
    phase_rows.append([label, desc, yi(ni)])
add_table(["阶段", "主要经营事实", "阶段净利润\n(亿美元)"], phase_rows, font_size=8.5, widths=[3.7, 10.2, 2.8])

doc.add_heading("三、哪些决定做对了", level=1)
doc.add_heading("3.1 在下行期完成HBM资格投入", level=2)
add_text("事实：Q1—Q3每季投入10亿美元额外HBM研发，累计30亿美元；Q6取得量产资格。此后未再追加额外资格投入，但每季仍有基础研发费用。", size=10.5)
add_bullet(f"HBM累计收入{yi(total_hbm)}亿美元，占全周期收入{total_hbm/total_revenue*100:.2f}%；Q16 HBM收入{yi(H[-1]['income_statement']['revenue_hbm'])}亿美元，占当季50.35%。")
add_bullet("Q6—Q10是结构转折点：HBM价格显著高于普通内存，收入结构改善使公司在普通内存价格仍有波动时继续扩大利润。")
add_bullet("边界：上述为收入贡献，不等同于HBM净利润或研发投资回报率；引擎未披露分产品成本与利润，不能做精确归因。")
add_figure(ASSETS / "revenue_mix.png", "图2｜普通内存与HBM收入结构。来源：export.json → history → income_statement。")

doc.add_heading("3.2 在需求证据增强后接续扩产", level=2)
add_text(f"事实：Q7、Q8、Q9、Q10、Q11、Q12分别安排新增30、40、40、40、60、60千片/季产能，均按四个季度时滞投产。扩张投入合计{yi(expansion_capex)}亿美元，产能在Q11—Q16逐步由300增至570千片/季。", size=10.5)
add_bullet("扩产没有只看价格：决策同时参考普通内存未满足需求、HBM订单、云厂商资本开支信号与现金覆盖能力。")
add_bullet("Q13起停止新增扩张，因为新增项目已无法在16季经营期内投产；最后一轮60千片/季在Q16释放。")
add_figure(ASSETS / "capacity_hbm.png", "图3｜产能与HBM产量。来源：export.json → history → balance_sheet / operations。")

doc.add_heading("3.3 用借款保流动性，在现金充足后去杠杆", level=2)
add_text(f"事实：Q3、Q4分别新增借款20亿美元，Q7—Q9建设期继续小额融资；峰值债务{yi(peak_debt[0])}亿美元。Q12偿还50亿美元，Q13偿还剩余85亿美元，期末普通债务和紧急债务均为零。", size=10.5)
add_bullet(f"全周期未使用紧急授信；最低现金{yi(min_cash[0])}亿美元，高于5亿美元触发线{yi(min_cash[0]-0.5)}亿美元。")
add_bullet("借款主要用于下行期流动性和扩产建设，而非在高景气末期继续加杠杆；这降低了后续利息压力。")

doc.add_heading("3.4 全售库存，避免把周期判断变成库存投机", level=2)
add_text(f"16季可售库存销售比例均为100%。Q3末、Q4末及Q6—Q16库存均为零，仅Q5末留下5千片。累计存货跌价{yi(total_writedown)}亿美元，其中Q2为1.22亿美元。期末存货为零。", size=10.5)

doc.add_heading("四、哪些决定做错了或可以更好", level=1)
doc.add_heading("4.1 早期减产过度，低估了固定成本与需求韧性", level=2)
add_callout("Q3是最清楚的反例", "开工率降至55%，按需求180千片的假设安排供给；实际需求205千片，销量仅180千片，少满足25千片。单位成本升至23.182百万美元/千片，为16季最高；单季毛利率-85.95%，为16季最低。", color=GOLD)
add_text("判断问题：当时把“价格仍跌”过度等同于“应大幅减少产量”，没有充分权衡固定成本摊薄和订单贡献。Q2把开工率降至60%后，单位成本已由Q1的18.333升至21.667，这一信号本可更早改变决策。", size=10.5)
add_text("改进：以后采用“需求区间 + 边际贡献 + 库存跌价”三维框架，而不是只用价格方向决定开工率；对需求假设设置上行和下行两套产量预案。", size=10.5)

doc.add_heading("4.2 HBM订单预测存在双向偏差", level=2)
add_text(f"事实：HBM超额生产累计{hbm_excess:.2f}千片，未满足需求累计{hbm_unmet:.2f}千片。Q11按80千片假设配置，实际需求74千片，超额5.2千片；Q12超额6.2千片；Q13、Q14又分别少供给2.17、4.5千片。", size=10.5)
add_text("判断问题：订单外推在需求加速和增速放缓时均有滞后。超额产出会作废，少配又放弃高价值订单，两类误差不能相互抵销后再评价。", size=10.5)

doc.add_heading("4.3 产能缺口持续，扩产仍可更早准备", level=2)
add_text(f"普通内存未满足需求累计{std_unmet:.2f}千片，Q8以后缺口持续扩大。虽然其中一部分源于将产能优先分配给HBM，且不能把所有缺口都视为可实现销售，但它说明产能准备仍落后于市场上行幅度。", size=10.5)
add_text("改进：保留“可取消扩产”的阶段门机制，在HBM盈利尚未完全验证时先锁定长周期设备或厂房选项，而不是等全部证据明确后才启动全部建设。该建议属于管理方案，不代表引擎支持取消资本开支。", size=10.5)

doc.add_heading("五、现金流、资产负债与风险", level=1)
doc.add_heading("5.1 现金桥", level=2)
cash_rows = [
    ["期初现金", yi(INITIAL["balance_sheet_now"]["cash"])],
    ["加：累计经营现金流", yi(total_cfo)],
    ["减：累计投资现金流出", yi(-sum(x["cash_flow"]["investing"] for x in H))],
    ["减：累计融资现金净流出", yi(-sum(x["cash_flow"]["financing"] for x in H))],
    ["Q16末现金", yi(final["cash"])],
]
add_table(["现金桥项目", "亿美元"], cash_rows, font_size=9, widths=[10.5, 4.5])
add_text("经营现金流高于净利润，主要与折旧等非现金费用和营运资金变化有关；具体季度分解见《三张表.xlsx》现金流量表。现金桥各分项采用披露的四位小数，末位可能存在舍入差。", size=10.5)
add_figure(ASSETS / "balance_trend.png", "图4｜现金、债务与股东权益。来源：export.json → history → balance_sheet。")

doc.add_heading("5.2 风险并未因期末高现金而消失", level=2)
add_bullet("周期风险：Q16普通内存价格4.55、毛利率90.11%，同时市场已出现客户抱怨价格和新增产能消息；不能线性外推峰值利润。")
add_bullet("产品组合风险：HBM占Q16收入50.35%，增强了增长，也提高了对AI服务器订单和认证地位的依赖。")
add_bullet("执行风险：扩产集中在Q11—Q16投产，若需求比预期更早回落，利用率和折旧吸收会成为新的压力。")
add_bullet("流动性风险已缓释但未被替代：期末现金1,681.99亿美元、债务为零是缓冲，不是继续扩张的自动理由。")

doc.add_heading("六、如果重来，我会怎么改", level=1)
doc.add_heading("6.1 提前完成HBM资格投入，但保留现金护栏", level=2)
add_text(f"假设方案：在Q1完成全部30亿美元额外HBM研发，而非分三季投入。若资格规则仍按“达到门槛后等待两个完整季度”的实际表现执行，则可能从Q6提前到Q4量产；该时间未重新运行引擎，属于假设。", size=10.5)
add_text(f"假设测算：若Q4、Q5实际HBM需求8、12千片均可被公司满足，并按实际HBM价格指数1.4、1.6及普通收入反推出的24百万美元/千片基准计价，则两季新增HBM收入上限约{yi(early_hbm_revenue)}亿美元。该金额未扣除HBM成本、普通内存产能挤占、税费和额外融资费用，不是净利润预测。", size=10.5)

doc.add_heading("6.2 用需求区间替代单点产量判断", level=2)
add_text("在Q2—Q3设置基准、上行、下行三档需求；只要新增销售的边际贡献为正，就避免因单点保守假设造成不必要缺货。Q3的25千片缺口会作为强制复盘触发器，而不是等到Q4才修正。", size=10.5)

doc.add_heading("6.3 把扩产决策拆成“准备、承诺、投产”三道门", level=2)
add_text("在Q6确认HBM收入贡献后即准备扩产，在订单和现金流达到阈值时再承诺资本开支，投产后按利用率复盘。这样既保留提前量，也避免一次性押注全部产能。引擎本次只支持不可逆资本开支，因此该流程是未来治理建议。", size=10.5)

doc.add_heading("6.4 对HBM分别考核缺货与作废", level=2)
add_text(f"以滚动两季订单增速和置信区间配置产能，分别跟踪超额生产{hbm_excess:.2f}千片和未满足需求{hbm_unmet:.2f}千片，而不是用两者净额评价预测。高价产品可保留小缓冲，但缓冲要随订单波动下降。", size=10.5)

doc.add_heading("6.5 提前设定现金安全线，收官不追逐期外扩张", level=2)
add_text("建议内部现金安全线设为20亿美元（管理假设，并非引擎规则），低于安全线时优先普通借款而非紧急授信。Q13以后仍坚持只做维护性资本开支，不为已经看到的高价格增加经营期外产能。", size=10.5)

doc.add_heading("七、董事会后续监督清单", level=1)
monitor_rows = [
    ["需求", "普通内存未满足需求、HBM订单与超额生产", "区分产能不足、产品分配和预测错误"],
    ["盈利", "单位成本、毛利率、HBM收入占比", "避免将峰值价格当成稳态盈利"],
    ["现金", "经营现金流、自由现金流、最低现金", "资本开支高峰期不依赖紧急授信"],
    ["资产负债", "净负债、权益、产能与固定资产净额", "扩张同时关注折旧吸收和回报"],
    ["执行", "扩产投产季度、开工率、库存周转天数", "四个季度时滞下提前识别偏差"],
]
add_table(["维度", "核心指标", "监督重点"], monitor_rows, font_size=9, widths=[2.4, 6.4, 7.8])
add_callout("最终结论", f"本轮最重要的不是抓住末期最高价格，而是在早期亏损时仍完成HBM布局、在复苏证据增强后敢于扩产，并在现金充足后停止扩张和清偿债务。期末权益{yi(final['equity'])}亿美元、累计净利润{yi(total_ni)}亿美元、零债务是结果；早期过度减产和持续缺货则是下一轮必须修正的经营能力缺口。")

landscape = doc.add_section(WD_SECTION.NEW_PAGE)
landscape.orientation = WD_ORIENT.LANDSCAPE
landscape.page_width = Cm(29.7)
landscape.page_height = Cm(21)
landscape.top_margin = Cm(1.35)
landscape.bottom_margin = Cm(1.3)
landscape.left_margin = Cm(1.35)
landscape.right_margin = Cm(1.35)
landscape.header_distance = Cm(0.55)
landscape.footer_distance = Cm(0.55)
doc.add_heading("附录A｜逐季财务与经营摘要", level=1)
add_text("金额单位：亿美元；产能、产量单位为千片/季或千片；价格指数为引擎披露口径。债务包括普通债务与紧急债务。", size=9)
quarter_rows = []
for x in H:
    i = x["income_statement"]
    b = x["balance_sheet"]
    quarter_rows.append([
        f"Q{x['quarter']}", f"{x['market']['price_index']:.2f}", f"{x['market']['hbm_price_index']:.2f}",
        yi(i["revenue"]), pct(i["gross_margin"]), yi(i["revenue_hbm"]), yi(i["net_income"]),
        yi(x["cash_flow"]["operating"]), yi(b["cash"]), yi(b["debt"] + b["emergency_debt"]),
        yi(b["equity"]), f"{b['capacity_kwafers']:.0f}",
    ])
appendix_table = add_table(["季度", "普通价格", "HBM价格", "收入", "毛利率", "HBM收入", "净利润", "经营现金流", "现金", "债务", "股东权益", "产能"], quarter_rows, font_size=7.0, widths=[1.1, 1.5, 1.5, 2.0, 1.4, 2.0, 2.0, 2.1, 2.0, 1.7, 2.1, 1.3])
for row in appendix_table.rows:
    for cell in row.cells:
        set_cell_margins(cell, top=30, bottom=30, start=70, end=70)
add_text("来源：交付/data/export.json → history。金额由十亿美元乘以10换算为亿美元；比例由披露值换算为百分比。", size=8.5)

doc.add_heading("附录B｜口径、假设与未核实事项", level=1)
source_rows = [
    ["实际经营结果", "交付/data/export.json", "history（16季决策、市场、运营、三张表）、final、bankrupt、cumulative_net_income"],
    ["期初余额", "交付/data/q00_state.json", "balance_sheet_now、hbm、decision_bounds、signals"],
    ["规则与资格", "本机引擎 /rules 与逐季state", "资本开支时滞、HBM资格、借款与现金规则；Q6实际资格由回执确认"],
    ["决策过程", "交付/决策日志.md 与 data/q01—q16回执", "每季决策前信号、决策理由和实际结果"],
]
add_table(["内容", "文件/接口", "具体位置"], source_rows, font_size=8.5, widths=[4.0, 7.0, 13.5])
add_bullet("未使用外部行业数字或网页资料；所有实际财务数字均来自本局导出。")
add_bullet("反事实部分均为明确标注的假设，未重新运行引擎，不能视为已实现收入或利润。")
add_bullet("引擎未提供分产品成本、HBM净利润、订单取消成本或可取消扩产选项，因此未对这些项目作事实性断言。")
add_bullet("披露数据通常为四位小数；比率、现金桥与权益变动可能存在末位舍入差。Excel校验容差为0.0002十亿美元。")
add_bullet("本报告不是审计报告，也不构成投资建议；不涉及任何证券买卖、持有或估值结论。")

doc.save(OUTPUT)
print(OUTPUT)
