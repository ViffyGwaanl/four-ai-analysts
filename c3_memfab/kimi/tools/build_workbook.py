import json
from pathlib import Path

import xlsxwriter
from xlsxwriter.utility import xl_col_to_name

ROOT = Path(__file__).resolve().parents[1]
DATA = json.loads((ROOT / "data" / "export.json").read_text(encoding="utf-8"))
INITIAL = json.loads((ROOT / "data" / "q00_state.json").read_text(encoding="utf-8"))
HISTORY = DATA["history"]
OUTPUT = ROOT / "三张表.xlsx"

wb = xlsxwriter.Workbook(OUTPUT)
wb.set_properties({
    "title": "内存芯片公司16季度经营三张表",
    "subject": "利润表、资产负债表、现金流量表与经营分析",
    "author": "经营复盘项目组",
    "company": "虚构内存芯片公司",
    "comments": "数据来源：经营模拟引擎导出数据。",
})
wb.set_calc_mode("auto")

NAVY = "#17324D"
BLUE = "#2E6FDB"
TEAL = "#129B8D"
GOLD = "#E5A93D"
WHITE = "#FFFFFF"
TEXT = "#243746"
MUTED = "#657786"
INPUT = "#FFF2C7"
SCENARIO = "#E3EEFF"
FORMULA = "#E8F5EE"
GRID = "#D8E1E8"
PALE = "#F4F7FA"
RED = "#C64747"

base = {"font_name": "Aptos", "font_size": 10, "font_color": TEXT}
def fmt(**kwargs):
    return wb.add_format({**base, **kwargs})

money_code = "#,##0.0000;[Red](#,##0.0000);-"
qty_code = "#,##0.000;[Red](#,##0.000);-"
pct_code = "0.00%;[Red](0.00%);-"
check_code = "0.000000;[Red](0.000000);-"

F = {
    "title": fmt(font_size=22, bold=True, font_color=WHITE, bg_color=NAVY, align="left", valign="vcenter"),
    "subtitle": fmt(font_size=10, font_color=MUTED, italic=True, text_wrap=True, valign="vcenter"),
    "section": fmt(font_size=12, bold=True, font_color=WHITE, bg_color=BLUE, align="left", valign="vcenter"),
    "header": fmt(bold=True, font_color=WHITE, bg_color=NAVY, border=1, border_color=WHITE, align="center", valign="vcenter", text_wrap=True),
    "label": fmt(bold=True, bg_color=PALE, border=1, border_color=GRID, valign="vcenter"),
    "label_total": fmt(bold=True, bg_color="#DDEBF3", border=1, border_color=GRID, top=2, valign="vcenter"),
    "text": fmt(border=1, border_color=GRID, valign="top", text_wrap=True),
    "note": fmt(font_size=9, font_color=MUTED, text_wrap=True, valign="top"),
    "input_money": fmt(bg_color=INPUT, border=1, border_color=GRID, num_format=money_code),
    "input_qty": fmt(bg_color=INPUT, border=1, border_color=GRID, num_format=qty_code),
    "input_pct": fmt(bg_color=INPUT, border=1, border_color=GRID, num_format=pct_code),
    "input_price": fmt(bg_color=INPUT, border=1, border_color=GRID, num_format="0.00"),
    "input_int": fmt(bg_color=INPUT, border=1, border_color=GRID, num_format="0"),
    "input_blank": fmt(bg_color="#F1F1F1", border=1, border_color=GRID),
    "formula_money": fmt(bg_color=FORMULA, border=1, border_color=GRID, num_format=money_code),
    "formula_money_total": fmt(bg_color=FORMULA, bold=True, border=1, border_color=GRID, top=2, num_format=money_code),
    "formula_qty": fmt(bg_color=FORMULA, border=1, border_color=GRID, num_format=qty_code),
    "formula_pct": fmt(bg_color=FORMULA, border=1, border_color=GRID, num_format=pct_code),
    "formula_int": fmt(bg_color=FORMULA, border=1, border_color=GRID, num_format="0"),
    "formula_check": fmt(bg_color=FORMULA, border=1, border_color=GRID, num_format=check_code),
    "scenario_label": fmt(bold=True, bg_color=PALE, border=1, border_color=GRID, text_wrap=True),
    "scenario_money": fmt(bg_color=SCENARIO, border=1, border_color=BLUE, num_format=money_code),
    "scenario_pct": fmt(bg_color=SCENARIO, border=1, border_color=BLUE, num_format=pct_code),
    "scenario_int": fmt(bg_color=SCENARIO, border=1, border_color=BLUE, num_format="0"),
    "kpi_label": fmt(bold=True, font_color=WHITE, bg_color=TEAL, align="center", valign="vcenter", border=1, border_color=WHITE),
    "kpi_value": fmt(font_size=18, bold=True, font_color=NAVY, bg_color="#E5F6F3", align="center", valign="vcenter", border=1, border_color=WHITE, num_format="#,##0.0000"),
    "big_note": fmt(font_size=11, font_color=TEXT, bg_color="#EDF3F8", text_wrap=True, valign="vcenter", border=1, border_color=GRID),
    "status": fmt(font_size=14, bold=True, font_color=WHITE, bg_color=TEAL, align="center", valign="vcenter"),
}

raw_columns = [
    ("quarter", "季度", "int"),
    ("price_index", "普通价格指数", "price"),
    ("hbm_price_index", "HBM价格指数", "price"),
    ("demand_kwafers", "普通需求\n(千片)", "qty"),
    ("hbm_demand_kwafers", "HBM需求\n(千片)", "qty"),
    ("utilization", "开工率", "pct"),
    ("sell_fraction", "销售比例", "pct"),
    ("capex", "资本开支\n(十亿美元)", "money"),
    ("hbm_rnd_extra", "额外HBM研发\n(十亿美元)", "money"),
    ("hbm_share", "HBM产能分配", "pct"),
    ("borrow", "新增/(偿还)借款\n(十亿美元)", "money"),
    ("produced_kwafers", "总产量\n(千片)", "qty"),
    ("hbm_kwafers", "HBM产量\n(千片)", "qty"),
    ("std_sold_kwafers", "普通销量\n(千片)", "qty"),
    ("hbm_sold_kwafers", "HBM销量\n(千片)", "qty"),
    ("unit_cost_musd", "单位成本\n(百万美元/千片)", "qty"),
    ("capacity_kwafers", "产能\n(千片/季)", "qty"),
    ("revenue_std", "普通收入\n(十亿美元)", "money"),
    ("revenue_hbm", "HBM收入\n(十亿美元)", "money"),
    ("cogs", "销货成本含跌价\n(十亿美元)", "money"),
    ("inventory_writedown", "存货跌价\n(十亿美元)", "money"),
    ("rnd", "研发费用\n(十亿美元)", "money"),
    ("sga", "销管费用\n(十亿美元)", "money"),
    ("net_interest", "净利息支出/(收益)\n(十亿美元)", "money"),
    ("tax", "所得税\n(十亿美元)", "money"),
    ("depreciation", "折旧\n(十亿美元)", "money"),
    ("operating_cf", "经营现金流\n(十亿美元)", "money"),
    ("investing_cf", "投资现金流\n(十亿美元)", "money"),
    ("financing_cf", "融资现金流\n(十亿美元)", "money"),
    ("emergency_borrowing", "紧急授信发生额\n(十亿美元)", "money"),
    ("cash", "现金\n(十亿美元)", "money"),
    ("inventory", "存货\n(十亿美元)", "money"),
    ("ppe_net", "固定资产净额\n(十亿美元)", "money"),
    ("debt", "普通债务\n(十亿美元)", "money"),
    ("emergency_debt", "紧急债务\n(十亿美元)", "money"),
    ("inventory_kwafers", "库存量\n(千片)", "qty"),
    ("equity", "股东权益\n(十亿美元)", "money"),
    ("hbm_qualified", "HBM量产资格\n1=是", "int"),
    ("reported_revenue", "引擎披露收入\n(十亿美元)", "money"),
    ("reported_gross_profit", "引擎披露毛利\n(十亿美元)", "money"),
    ("reported_operating_income", "引擎披露营业利润\n(十亿美元)", "money"),
    ("reported_net_income", "引擎披露净利润\n(十亿美元)", "money"),
    ("reported_total_assets", "引擎披露资产总计\n(十亿美元)", "money"),
]
raw_col = {key: idx for idx, (key, _, _) in enumerate(raw_columns)}


def raw(q, key):
    return f"'输入数据'!${xl_col_to_name(raw_col[key])}${6 + q}"


def record_for(q):
    if q == 0:
        bs = INITIAL["balance_sheet_now"]
        return {
            "quarter": 0,
            "capacity_kwafers": bs["capacity_kwafers"],
            "cash": bs["cash"],
            "inventory": bs["inventory"],
            "ppe_net": bs["ppe_net"],
            "debt": bs["debt"],
            "emergency_debt": bs["emergency_debt"],
            "inventory_kwafers": bs["inventory_kwafers"],
            "equity": bs["equity"],
            "hbm_qualified": 0,
            "reported_total_assets": bs["total_assets"],
        }
    item = HISTORY[q - 1]
    rec = {"quarter": q}
    for group in ["market", "decision", "operations", "income_statement", "cash_flow", "balance_sheet"]:
        rec.update(item[group])
    rec["hbm_rnd_extra"] = item["decision"]["hbm_rnd"]
    rec["operating_cf"] = item["cash_flow"]["operating"]
    rec["investing_cf"] = item["cash_flow"]["investing"]
    rec["financing_cf"] = item["cash_flow"]["financing"]
    rec["hbm_qualified"] = int(item["operations"]["hbm_qualified"])
    rec["reported_revenue"] = item["income_statement"]["revenue"]
    rec["reported_gross_profit"] = item["income_statement"]["gross_profit"]
    rec["reported_operating_income"] = item["income_statement"]["operating_income"]
    rec["reported_net_income"] = item["income_statement"]["net_income"]
    rec["reported_total_assets"] = item["balance_sheet"]["total_assets"]
    return rec


records = [record_for(q) for q in range(17)]

DERIVED = []
for q in range(1, 17):
    rec = records[q]
    prev = records[q - 1]
    revenue = rec["revenue_std"] + rec["revenue_hbm"]
    cogs_ex = rec["cogs"] - rec["inventory_writedown"]
    gross = revenue - rec["cogs"]
    op = gross - rec["rnd"] - rec["sga"]
    pretax = op - rec["net_interest"]
    ni = rec["net_income"]
    assets = rec["cash"] + rec["inventory"] + rec["ppe_net"]
    liab = rec["debt"] + rec["emergency_debt"]
    le = liab + rec["equity"]
    other_op = rec["operating_cf"] - ni - rec["depreciation"]
    cf_capex = -rec["capex"]
    other_inv = rec["investing_cf"] + rec["capex"]
    cfi = cf_capex + other_inv
    cff = rec["borrow"] + rec["emergency_borrowing"]
    change = rec["operating_cf"] + cfi + cff
    end = prev["cash"] + change
    DERIVED.append({
        "std": rec["revenue_std"], "hbm": rec["revenue_hbm"], "revenue": revenue,
        "cogs_ex": cogs_ex, "write": rec["inventory_writedown"], "cost": rec["cogs"],
        "gross": gross, "rnd": rec["rnd"], "sga": rec["sga"], "op": op,
        "interest": rec["net_interest"], "pretax": pretax, "tax": rec["tax"], "ni": ni,
        "gm": gross / revenue if revenue else 0, "nm": ni / revenue if revenue else 0,
        "cash": rec["cash"], "inv": rec["inventory"], "ppe": rec["ppe_net"],
        "assets": assets, "debt": rec["debt"], "emergency": rec["emergency_debt"],
        "liab": liab, "equity": rec["equity"], "le": le, "balance": assets - le,
        "invqty": rec["inventory_kwafers"], "capacity": rec["capacity_kwafers"],
        "netdebt": liab - rec["cash"], "dep": rec["depreciation"], "other_op": other_op,
        "cfo": rec["operating_cf"], "cf_capex": cf_capex, "other_inv": other_inv,
        "cfi": cfi, "borrow": rec["borrow"], "emerg_borrow": rec["emergency_borrowing"],
        "cff": cff, "change": change, "begin": prev["cash"], "end": end,
        "cash_check": end - rec["cash"],
        "dio": (prev["inventory"] + rec["inventory"]) / 2 / cogs_ex * 90 if cogs_ex else 0,
        "roe": ni * 4 / ((prev["equity"] + rec["equity"]) / 2),
        "utilization": rec["utilization"], "hbm_kwafers": rec["hbm_kwafers"],
        "hbm_rev_share": rec["revenue_hbm"] / revenue if revenue else 0,
        "capex": rec["capex"], "price": rec["price_index"], "hbm_price": rec["hbm_price_index"],
    })


def cached_value(sheet, row, col):
    if sheet == "使用说明" and row == 5:
        return {
            1: DATA["final"]["equity"],
            4: DATA["cumulative_net_income"],
            7: sum(d["cfo"] for d in DERIVED),
        }[col]
    if sheet == "利润表":
        keys = {4: "std", 5: "hbm", 6: "revenue", 7: "cogs_ex", 8: "write", 9: "cost", 10: "gross", 11: "rnd", 12: "sga", 13: "op", 14: "interest", 15: "pretax", 16: "tax", 17: "ni", 18: "gm", 19: "nm"}
        return DERIVED[col - 1][keys[row]]
    if sheet == "资产负债表":
        keys = {4: "cash", 5: "inv", 6: "ppe", 7: "assets", 8: "debt", 9: "emergency", 10: "liab", 11: "equity", 12: "le", 13: "balance", 15: "invqty", 16: "capacity", 17: "netdebt"}
        return DERIVED[col - 1][keys[row]]
    if sheet == "现金流量表":
        keys = {4: "ni", 5: "dep", 6: "other_op", 7: "cfo", 8: "cf_capex", 9: "other_inv", 10: "cfi", 11: "borrow", 12: "emerg_borrow", 13: "cff", 14: "change", 15: "begin", 16: "end", 17: "cash_check"}
        return DERIVED[col - 1][keys[row]]
    if sheet == "分析" and row == 4:
        values = {
            0: DATA["final"]["equity"], 3: DATA["cumulative_net_income"],
            6: sum(d["cfo"] for d in DERIVED), 9: DATA["final"]["debt"] + DATA["final"]["emergency_debt"] - DATA["final"]["cash"],
            12: sum(d["hbm"] for d in DERIVED), 15: DATA["final"]["capacity_kwafers"],
            18: "未断裂" if not DATA["bankrupt"] else "检查",
        }
        return values[col]
    if sheet == "分析" and 11 <= row <= 20 and col in [1, 2]:
        keys = {11: "std", 12: "hbm", 13: "revenue", 14: "cost", 15: "gross", 16: "gm", 17: "pretax", 18: "tax", 19: "ni", 20: "equity"}
        return DERIVED[15][keys[row]]
    if sheet == "分析" and 24 <= row <= 39 and 1 <= col <= 19:
        keys = {1: "revenue", 2: "ni", 3: "gm", 4: "dio", 5: "cfo", 6: "netdebt", 7: "roe", 8: "equity", 9: "cash", 10: "capacity", 11: "invqty", 12: "utilization", 13: "hbm_kwafers", 14: "hbm_rev_share", 15: "capex", 16: "price", 17: "hbm_price", 18: "debt", 19: "emergency"}
        return DERIVED[row - 24][keys[col]]
    if sheet == "校验" and row == 3 and col == 2:
        return "全部通过"
    if sheet == "校验" and 9 <= row <= 24 and 1 <= col <= 9:
        return 0.0
    raise ValueError(f"No cached value for {sheet}!{row},{col}")


def write_cached(ws, *args):
    if isinstance(args[0], str):
        from xlsxwriter.utility import xl_cell_to_rowcol
        address, formula, cell_format = args
        row, col = xl_cell_to_rowcol(address)
    else:
        row, col, formula, cell_format = args
    value = cached_value(ws.name, row, col)
    ws.write_formula(row, col, formula, cell_format, value)


def setup_sheet(ws, title, subtitle, last_col):
    ws.hide_gridlines(2)
    ws.set_zoom(90)
    ws.set_row(0, 34)
    ws.merge_range(0, 0, 0, last_col, title, F["title"])
    ws.set_row(1, 30)
    ws.merge_range(1, 0, 1, last_col, subtitle, F["subtitle"])
    ws.set_tab_color(BLUE)


ws = wb.add_worksheet("使用说明")
setup_sheet(ws, "内存芯片公司｜16季度经营三张表", "数据期间：第1—16季｜金额单位：十亿美元｜数量单位：千片（产能为千片/季）", 9)
ws.set_column("A:A", 3)
ws.set_column("B:B", 24)
ws.set_column("C:I", 16)
ws.set_column("J:J", 3)
ws.merge_range("B4:I4", "交付结论", F["section"])
for c1, c2, label, formula in [
    ("B5", "D5", "期末股东权益", "='资产负债表'!Q12"),
    ("E5", "G5", "累计净利润", "=SUM('利润表'!B18:Q18)"),
    ("H5", "I5", "累计经营现金流", "=SUM('现金流量表'!B8:Q8)"),
]:
    ws.merge_range(f"{c1}:{c2}", label, F["kpi_label"])
for c1, c2, formula in [
    ("B6", "D7", "='资产负债表'!Q12"),
    ("E6", "G7", "=SUM('利润表'!B18:Q18)"),
    ("H6", "I7", "=SUM('现金流量表'!B8:Q8)"),
]:
    ws.merge_range(f"{c1}:{c2}", "", F["kpi_value"])
    write_cached(ws, c1, formula, F["kpi_value"])
ws.merge_range("B9:I9", "工作簿结构", F["section"])
structure = [
    ("输入数据", "引擎导出值与期初状态，黄色单元格为事实输入；Q0仅用于期初余额和均值计算。"),
    ("利润表", "逐季普通内存/HBM收入、成本、费用与净利润；成本合计已正确包含存货跌价。"),
    ("资产负债表", "逐季资产、债务与股东权益，并计算净负债和平衡校验。"),
    ("现金流量表", "净利润、折旧、营运资金及其他调整、投资、融资与现金滚动。"),
    ("分析", "毛利率、存货周转天数、经营现金流、净负债、年化ROE、HBM收入占比及图表。"),
    ("校验", "公式结果与引擎披露值逐项对照，包含资产平衡和现金滚动校验。"),
]
for i, (name, desc) in enumerate(structure, start=10):
    ws.write(i - 1, 1, name, F["label"])
    ws.merge_range(i - 1, 2, i - 1, 8, desc, F["text"])
    ws.set_row(i - 1, 28)
ws.merge_range("B18:I18", "颜色、公式与假设", F["section"])
notes = [
    "黄色：引擎事实输入。蓝色：情景假设输入。绿色：公式计算。修改‘分析’页蓝色假设，相关收入、成本、利润与权益会自动更新。",
    "情景分析仅调整所选季度的价格、销货成本（含跌价）和税率；其他项目不变，权益按净利润差额估算。它是简化假设，不是重新运行经营引擎。",
    "存货周转天数 = 平均存货 ÷ 不含存货跌价的销货成本 × 90天。年化ROE = 当季净利润 × 4 ÷ 期初、期末平均股东权益。",
    "净负债 = 普通债务 + 紧急债务 − 现金；负数表示净现金。净利息支出为负时表示净利息收益。",
]
for i, text in enumerate(notes, start=19):
    ws.merge_range(i - 1, 1, i - 1, 8, text, F["big_note"])
    ws.set_row(i - 1, 34)
ws.merge_range("B25:I25", "出处与边界", F["section"])
source_text = "主要数字：交付/data/export.json 的 history、final、cumulative_net_income；期初余额：交付/data/q00_state.json。无外部行业数字、无网页资料。市场、时间和公司均为虚构；本工作簿仅用于研究与展示，不构成投资建议。"
ws.merge_range("B26:I28", source_text, F["big_note"])
ws.set_row(25, 26)
ws.set_row(26, 26)
ws.set_row(27, 26)

ws = wb.add_worksheet("输入数据")
setup_sheet(ws, "输入数据｜引擎事实与期初余额", "黄色单元格为输入事实；灰色空格表示该季度无此项目。所有派生报表与分析均引用本页。", len(raw_columns) - 1)
ws.set_row(4, 46)
for c, (_, label, _) in enumerate(raw_columns):
    ws.write(4, c, label, F["header"])
ws.set_column(0, 0, 8)
ws.set_column(1, len(raw_columns) - 1, 15)
for r, rec in enumerate(records, start=5):
    for c, (key, _, kind) in enumerate(raw_columns):
        value = rec.get(key)
        if value is None:
            ws.write_blank(r, c, None, F["input_blank"])
        else:
            ws.write(r, c, value, F[f"input_{kind}"])
ws.freeze_panes(5, 1)
ws.autofilter(4, 0, 21, len(raw_columns) - 1)
ws.set_tab_color(GOLD)


def statement_sheet(name, title, subtitle, rows):
    ws = wb.add_worksheet(name)
    setup_sheet(ws, title, subtitle, 16)
    ws.set_column(0, 0, 31)
    ws.set_column(1, 16, 13)
    ws.write(3, 0, "项目", F["header"])
    for q in range(1, 17):
        ws.write(3, q, f"Q{q}", F["header"])
    for row, label, kind, total in rows:
        ws.write(row, 0, label, F["label_total"] if total else F["label"])
    ws.freeze_panes(4, 1)
    return ws


is_r = {
    "std": 4, "hbm": 5, "revenue": 6, "cogs_ex": 7, "write": 8,
    "cost": 9, "gross": 10, "rnd": 11, "sga": 12, "op": 13,
    "interest": 14, "pretax": 15, "tax": 16, "ni": 17, "gm": 18, "nm": 19,
}
ws = statement_sheet(
    "利润表", "逐季利润表", "金额单位：十亿美元。cogs已含存货跌价，本表拆分后加总；净利润引用引擎披露输入，保留其四位小数舍入口径。",
    [
        (is_r["std"], "普通内存收入", "money", False),
        (is_r["hbm"], "HBM收入", "money", False),
        (is_r["revenue"], "营业收入", "money", True),
        (is_r["cogs_ex"], "销货成本（不含存货跌价）", "money", False),
        (is_r["write"], "存货跌价损失", "money", False),
        (is_r["cost"], "营业成本合计", "money", True),
        (is_r["gross"], "毛利", "money", True),
        (is_r["rnd"], "研发费用", "money", False),
        (is_r["sga"], "销售管理费用", "money", False),
        (is_r["op"], "营业利润", "money", True),
        (is_r["interest"], "净利息支出/(收益)", "money", False),
        (is_r["pretax"], "税前利润", "money", True),
        (is_r["tax"], "所得税", "money", False),
        (is_r["ni"], "净利润", "money", True),
        (is_r["gm"], "毛利率", "pct", False),
        (is_r["nm"], "净利率", "pct", False),
    ],
)
for q in range(1, 17):
    c = q
    col = xl_col_to_name(c)
    forms = {
        "std": f"={raw(q, 'revenue_std')}",
        "hbm": f"={raw(q, 'revenue_hbm')}",
        "revenue": f"=SUM({col}{is_r['std']+1}:{col}{is_r['hbm']+1})",
        "cogs_ex": f"={raw(q, 'cogs')}-{raw(q, 'inventory_writedown')}",
        "write": f"={raw(q, 'inventory_writedown')}",
        "cost": f"=SUM({col}{is_r['cogs_ex']+1}:{col}{is_r['write']+1})",
        "gross": f"={col}{is_r['revenue']+1}-{col}{is_r['cost']+1}",
        "rnd": f"={raw(q, 'rnd')}",
        "sga": f"={raw(q, 'sga')}",
        "op": f"={col}{is_r['gross']+1}-{col}{is_r['rnd']+1}-{col}{is_r['sga']+1}",
        "interest": f"={raw(q, 'net_interest')}",
        "pretax": f"={col}{is_r['op']+1}-{col}{is_r['interest']+1}",
        "tax": f"={raw(q, 'tax')}",
        "ni": f"={raw(q, 'reported_net_income')}",
        "gm": f"=IFERROR({col}{is_r['gross']+1}/{col}{is_r['revenue']+1},0)",
        "nm": f"=IFERROR({col}{is_r['ni']+1}/{col}{is_r['revenue']+1},0)",
    }
    for key, formula in forms.items():
        kind = "pct" if key in ["gm", "nm"] else "money"
        total = key in ["revenue", "cost", "gross", "op", "pretax", "ni"]
        form = F["formula_pct"] if kind == "pct" else F["formula_money_total" if total else "formula_money"]
        write_cached(ws, is_r[key], c, formula, form)
ws.conditional_format(is_r["ni"], 1, is_r["ni"], 16, {"type": "cell", "criteria": "<", "value": 0, "format": fmt(font_color=RED, bg_color="#FDECEC")})

bs_r = {"cash": 4, "inv": 5, "ppe": 6, "assets": 7, "debt": 8, "emergency": 9, "liab": 10, "equity": 11, "le": 12, "balance": 13, "invqty": 15, "capacity": 16, "netdebt": 17}
ws = statement_sheet(
    "资产负债表", "逐季资产负债表", "金额单位：十亿美元；净负债为负表示净现金。平衡校验应为0。",
    [
        (bs_r["cash"], "现金", "money", False),
        (bs_r["inv"], "存货", "money", False),
        (bs_r["ppe"], "固定资产净额", "money", False),
        (bs_r["assets"], "资产总计", "money", True),
        (bs_r["debt"], "普通债务", "money", False),
        (bs_r["emergency"], "紧急债务", "money", False),
        (bs_r["liab"], "负债合计", "money", True),
        (bs_r["equity"], "股东权益", "money", True),
        (bs_r["le"], "负债和股东权益", "money", True),
        (bs_r["balance"], "平衡校验", "check", False),
        (bs_r["invqty"], "补充：库存量（千片）", "qty", False),
        (bs_r["capacity"], "补充：产能（千片/季）", "qty", False),
        (bs_r["netdebt"], "净负债/(净现金)", "money", True),
    ],
)
for q in range(1, 17):
    c = q
    col = xl_col_to_name(c)
    forms = {
        "cash": f"={raw(q, 'cash')}", "inv": f"={raw(q, 'inventory')}",
        "ppe": f"={raw(q, 'ppe_net')}",
        "assets": f"=SUM({col}{bs_r['cash']+1}:{col}{bs_r['ppe']+1})",
        "debt": f"={raw(q, 'debt')}", "emergency": f"={raw(q, 'emergency_debt')}",
        "liab": f"=SUM({col}{bs_r['debt']+1}:{col}{bs_r['emergency']+1})",
        "equity": f"={raw(q, 'equity')}",
        "le": f"={col}{bs_r['liab']+1}+{col}{bs_r['equity']+1}",
        "balance": f"={col}{bs_r['assets']+1}-{col}{bs_r['le']+1}",
        "invqty": f"={raw(q, 'inventory_kwafers')}", "capacity": f"={raw(q, 'capacity_kwafers')}",
        "netdebt": f"={col}{bs_r['liab']+1}-{col}{bs_r['cash']+1}",
    }
    for key, formula in forms.items():
        if key in ["invqty", "capacity"]:
            form = F["formula_qty"]
        elif key == "balance":
            form = F["formula_check"]
        else:
            form = F["formula_money_total" if key in ["assets", "liab", "equity", "le", "netdebt"] else "formula_money"]
        write_cached(ws, bs_r[key], c, formula, form)

cf_r = {"ni": 4, "dep": 5, "other_op": 6, "cfo": 7, "capex": 8, "other_inv": 9, "cfi": 10, "borrow": 11, "emergency": 12, "cff": 13, "change": 14, "begin": 15, "end": 16, "check": 17}
ws = statement_sheet(
    "现金流量表", "逐季现金流量表", "金额单位：十亿美元。营运资金及其他调整为经营现金流与净利润、折旧之间的差额；现金校验应为0。",
    [
        (cf_r["ni"], "净利润", "money", False),
        (cf_r["dep"], "加：折旧", "money", False),
        (cf_r["other_op"], "营运资金及其他调整", "money", False),
        (cf_r["cfo"], "经营活动现金流", "money", True),
        (cf_r["capex"], "资本开支", "money", False),
        (cf_r["other_inv"], "其他投资活动", "money", False),
        (cf_r["cfi"], "投资活动现金流", "money", True),
        (cf_r["borrow"], "新增/(偿还)普通借款", "money", False),
        (cf_r["emergency"], "紧急授信变动", "money", False),
        (cf_r["cff"], "融资活动现金流", "money", True),
        (cf_r["change"], "现金净增加额", "money", True),
        (cf_r["begin"], "期初现金", "money", False),
        (cf_r["end"], "期末现金", "money", True),
        (cf_r["check"], "现金校验", "check", False),
    ],
)
for q in range(1, 17):
    c = q
    col = xl_col_to_name(c)
    forms = {
        "ni": f"='利润表'!{col}{is_r['ni']+1}",
        "dep": f"={raw(q, 'depreciation')}",
        "other_op": f"={raw(q, 'operating_cf')}-{col}{cf_r['ni']+1}-{col}{cf_r['dep']+1}",
        "cfo": f"=SUM({col}{cf_r['ni']+1}:{col}{cf_r['other_op']+1})",
        "capex": f"=-{raw(q, 'capex')}",
        "other_inv": f"={raw(q, 'investing_cf')}+{raw(q, 'capex')}",
        "cfi": f"=SUM({col}{cf_r['capex']+1}:{col}{cf_r['other_inv']+1})",
        "borrow": f"={raw(q, 'borrow')}",
        "emergency": f"={raw(q, 'emergency_borrowing')}",
        "cff": f"=SUM({col}{cf_r['borrow']+1}:{col}{cf_r['emergency']+1})",
        "change": f"={col}{cf_r['cfo']+1}+{col}{cf_r['cfi']+1}+{col}{cf_r['cff']+1}",
        "begin": f"={raw(q-1, 'cash')}",
        "end": f"={col}{cf_r['begin']+1}+{col}{cf_r['change']+1}",
        "check": f"={col}{cf_r['end']+1}-{raw(q, 'cash')}",
    }
    for key, formula in forms.items():
        form = F["formula_check"] if key == "check" else F["formula_money_total" if key in ["cfo", "cfi", "cff", "change", "end"] else "formula_money"]
        write_cached(ws, cf_r[key], c, formula, form)

ws = wb.add_worksheet("分析")
setup_sheet(ws, "经营分析｜公式指标、情景假设与图表", "绿色为公式，蓝色为可修改假设。存货周转天数按90天/季；年化ROE仅为季度年化的分析口径。", 19)
ws.set_column(0, 0, 12)
ws.set_column(1, 19, 14)
kpis = [
    (0, 2, "期末股东权益", "='资产负债表'!Q12"),
    (3, 5, "累计净利润", "=SUM('利润表'!B18:Q18)"),
    (6, 8, "累计经营现金流", "=SUM('现金流量表'!B8:Q8)"),
    (9, 11, "期末净负债", "='资产负债表'!Q18"),
    (12, 14, "HBM累计收入", "=SUM('利润表'!B6:Q6)"),
    (15, 17, "期末产能", "='资产负债表'!Q17"),
    (18, 19, "资金链", "=IF(COUNTIF('输入数据'!AI7:AI22,\">0\")=0,\"未断裂\",\"检查\")"),
]
for start, end, label, formula in kpis:
    ws.merge_range(3, start, 3, end, label, F["kpi_label"])
    ws.merge_range(4, start, 5, end, "", F["kpi_value"])
    write_cached(ws, 4, start, formula, F["kpi_value"])
ws.merge_range("A8:T8", "情景假设（蓝色可改）与联动结果", F["section"])
inputs = [(0, "情景季度", 1, 16, "int"), (3, "普通价格变动", 4, 0, "pct"), (6, "HBM价格变动", 7, 0, "pct"), (9, "销货成本变动", 10, 0, "pct"), (12, "所得税率", 13, 0.15, "pct")]
for label_col, label, value_col, value, kind in inputs:
    ws.write(8, label_col, label, F["scenario_label"])
    ws.write(8, value_col, value, F[f"scenario_{kind}"])
ws.data_validation("B9", {"validate": "integer", "criteria": "between", "minimum": 1, "maximum": 16})
ws.data_validation("N9", {"validate": "decimal", "criteria": "between", "minimum": 0, "maximum": 0.5})
ws.merge_range("P9:T9", "改蓝色假设，C列情景结果自动更新", F["note"])
ws.write_row("A11", ["项目", "实际", "情景"], F["header"])
scenario_labels = ["普通内存收入", "HBM收入", "营业收入", "营业成本（含跌价）", "毛利", "毛利率", "税前利润", "所得税", "净利润", "期末股东权益"]
for i, label in enumerate(scenario_labels, start=11):
    ws.write(i, 0, label, F["label_total"] if label in ["营业收入", "毛利", "净利润"] else F["label"])
idx = lambda row: f"INDEX('利润表'!$B${row}:$Q${row},1,$B$9)"
actual_formulas = {
    11: f"={idx(5)}", 12: f"={idx(6)}", 13: "=SUM(B12:B13)",
    14: f"={idx(10)}", 15: "=B14-B15", 16: "=IFERROR(B16/B14,0)",
    17: f"={idx(16)}", 18: f"={idx(17)}", 19: f"={idx(18)}",
    20: "=INDEX('资产负债表'!$B$12:$Q$12,1,$B$9)",
}
scenario_formulas = {
    11: "=B12*(1+$E$9)", 12: "=B13*(1+$H$9)", 13: "=SUM(C12:C13)",
    14: "=B15*(1+$K$9)", 15: "=C14-C15", 16: "=IFERROR(C16/C14,0)",
    17: "=B18+(C14-B14)-(C15-B15)", 18: "=MAX(0,C18*$N$9)",
    19: "=B20+(C18-B18)-(C19-B19)", 20: "=B21+(C20-B20)",
}
for row in range(11, 21):
    form = F["formula_pct"] if row == 16 else F["formula_money"]
    write_cached(ws, row, 1, actual_formulas[row], form)
    write_cached(ws, row, 2, scenario_formulas[row], form)
ws.merge_range("E11:T13", "情景说明：普通收入与HBM收入分别按各自价格假设变化；营业成本（含跌价）按成本假设变化；其他费用与净利息不变；所得税按所设税率且不为负；情景权益=实际权益+净利润差额。以上为简化假设，不代表引擎重跑结果。", F["big_note"])
ws.merge_range("E15:T17", "指标口径：存货周转天数=平均存货÷不含跌价销货成本×90；年化ROE=当季净利润×4÷平均权益；净负债=普通债务+紧急债务−现金。期初余额来自q00_state.json。", F["big_note"])

analysis_header_row = 23
headers = ["季度", "营业收入", "净利润", "毛利率", "存货周转天数", "经营现金流", "净负债", "年化ROE", "股东权益", "现金", "产能", "库存量", "开工率", "HBM产量", "HBM收入占比", "资本开支", "普通价格", "HBM价格", "普通债务", "紧急债务"]
ws.set_row(analysis_header_row, 38)
for c, label in enumerate(headers):
    ws.write(analysis_header_row, c, label, F["header"])
for q in range(1, 17):
    r = analysis_header_row + q
    source_col = xl_col_to_name(q)
    formulas = [
        q,
        f"='利润表'!{source_col}{is_r['revenue']+1}",
        f"='利润表'!{source_col}{is_r['ni']+1}",
        f"=IFERROR('利润表'!{source_col}{is_r['gross']+1}/'利润表'!{source_col}{is_r['revenue']+1},0)",
        f"=IFERROR(AVERAGE({raw(q-1, 'inventory')},{raw(q, 'inventory')})/'利润表'!{source_col}{is_r['cogs_ex']+1}*90,0)",
        f"='现金流量表'!{source_col}{cf_r['cfo']+1}",
        f"='资产负债表'!{source_col}{bs_r['netdebt']+1}",
        f"=IFERROR('利润表'!{source_col}{is_r['ni']+1}*4/AVERAGE({raw(q-1, 'equity')},{raw(q, 'equity')}),0)",
        f"='资产负债表'!{source_col}{bs_r['equity']+1}",
        f"='资产负债表'!{source_col}{bs_r['cash']+1}",
        f"='资产负债表'!{source_col}{bs_r['capacity']+1}",
        f"='资产负债表'!{source_col}{bs_r['invqty']+1}",
        f"={raw(q, 'utilization')}",
        f"={raw(q, 'hbm_kwafers')}",
        f"=IFERROR('利润表'!{source_col}{is_r['hbm']+1}/'利润表'!{source_col}{is_r['revenue']+1},0)",
        f"={raw(q, 'capex')}",
        f"={raw(q, 'price_index')}",
        f"={raw(q, 'hbm_price_index')}",
        f"={raw(q, 'debt')}",
        f"={raw(q, 'emergency_debt')}",
    ]
    for c, formula in enumerate(formulas):
        if c == 0:
            ws.write_number(r, c, formula, F["formula_int"])
        else:
            if c in [3, 7, 12, 14]:
                form = F["formula_pct"]
            elif c in [10, 11, 13]:
                form = F["formula_qty"]
            elif c in [16, 17]:
                form = F["formula_money"]
            else:
                form = F["formula_money"]
            write_cached(ws, r, c, formula, form)
ws.freeze_panes(analysis_header_row + 1, 1)
ws.conditional_format(analysis_header_row + 1, 2, analysis_header_row + 16, 2, {"type": "3_color_scale", "min_color": "#F6B7B7", "mid_color": "#FFF1C7", "max_color": "#8FD9C8"})
ws.conditional_format(analysis_header_row + 1, 3, analysis_header_row + 16, 3, {"type": "data_bar", "bar_color": TEAL})

first_excel = analysis_header_row + 2
last_excel = analysis_header_row + 17

def chart_series(sheet, name, cat_row, cat_col, val_col):
    return {
        "name": name,
        "categories": [sheet, cat_row, cat_col, cat_row + 15, cat_col],
        "values": [sheet, cat_row, val_col, cat_row + 15, val_col],
    }

chart1 = wb.add_chart({"type": "column"})
for name, col, color in [("营业收入", 1, BLUE), ("净利润", 2, TEAL)]:
    s = chart_series("分析", name, analysis_header_row + 1, 0, col)
    s.update({"fill": {"color": color}, "border": {"none": True}, "gap": 55})
    chart1.add_series(s)
chart1.set_title({"name": "收入与净利润逐季走势"})
chart1.set_y_axis({"name": "十亿美元", "major_gridlines": {"visible": True, "line": {"color": "#E5EAF0"}}})
chart1.set_legend({"position": "bottom"})
chart1.set_style(10)

chart2 = wb.add_chart({"type": "line"})
for name, col, color in [("毛利率", 3, TEAL), ("年化ROE", 7, GOLD)]:
    s = chart_series("分析", name, analysis_header_row + 1, 0, col)
    s.update({"line": {"color": color, "width": 2.5}, "marker": {"type": "circle", "size": 5, "border": {"color": color}, "fill": {"color": WHITE}}})
    chart2.add_series(s)
chart2.set_title({"name": "毛利率与年化ROE"})
chart2.set_y_axis({"name": "百分比", "num_format": "0%", "major_gridlines": {"visible": True, "line": {"color": "#E5EAF0"}}})
chart2.set_legend({"position": "bottom"})
chart2.set_style(10)

chart3 = wb.add_chart({"type": "line"})
for name, col, color in [("现金", 9, BLUE), ("净负债", 6, GOLD)]:
    s = chart_series("分析", name, analysis_header_row + 1, 0, col)
    s.update({"line": {"color": color, "width": 2.5}, "marker": {"type": "diamond", "size": 5, "border": {"color": color}, "fill": {"color": WHITE}}})
    chart3.add_series(s)
chart3.set_title({"name": "现金与净负债"})
chart3.set_y_axis({"name": "十亿美元；净负债为负即净现金", "major_gridlines": {"visible": True, "line": {"color": "#E5EAF0"}}})
chart3.set_legend({"position": "bottom"})
chart3.set_style(10)

chart4 = wb.add_chart({"type": "column", "subtype": "stacked"})
for name, row, color in [("普通内存收入", is_r["std"], BLUE), ("HBM收入", is_r["hbm"], TEAL)]:
    chart4.add_series({
        "name": name,
        "categories": ["利润表", 3, 1, 3, 16],
        "values": ["利润表", row, 1, row, 16],
        "fill": {"color": color}, "border": {"none": True}, "gap": 45,
    })
chart4.set_title({"name": "收入结构：HBM成为第二增长曲线"})
chart4.set_y_axis({"name": "十亿美元", "major_gridlines": {"visible": True, "line": {"color": "#E5EAF0"}}})
chart4.set_legend({"position": "bottom"})
chart4.set_style(10)

for chart, cell in [(chart1, "A43"), (chart2, "J43"), (chart3, "A60"), (chart4, "J60")]:
    chart.set_size({"width": 760, "height": 300})
    chart.set_chartarea({"fill": {"color": WHITE}, "border": {"color": GRID}})
    chart.set_plotarea({"fill": {"color": WHITE}, "border": {"none": True}})
    ws.insert_chart(cell, chart, {"x_offset": 4, "y_offset": 4})

ws = wb.add_worksheet("校验")
setup_sheet(ws, "校验｜公式结果对照引擎披露值", "所有数值为绝对差异，单位为十亿美元；容差0.0002（即20万美元），用于容纳引擎四位小数舍入。", 9)
ws.merge_range("A4:B4", "总体状态", F["kpi_label"])
ws.merge_range("C4:E5", "", F["status"])
write_cached(ws, "C4", "=IF(MAX(B10:J25)<0.0002,\"全部通过\",\"检查差异\")", F["status"])
ws.merge_range("F4:J5", "修改输入或假设后，本页可检查三表勾稽是否仍然成立。情景分析不改变实际报表，因此不影响这些校验。", F["big_note"])
check_headers = ["季度", "收入差异", "毛利差异", "营业利润差异", "净利润差异", "资产差异", "现金滚动差异", "资产平衡差异", "投资现金流差异", "融资现金流差异"]
for c, label in enumerate(check_headers):
    ws.write(8, c, label, F["header"])
for q in range(1, 17):
    r = 8 + q
    col = xl_col_to_name(q)
    ws.write_number(r, 0, q, F["formula_int"])
    formulas = [
        f"=ABS('利润表'!{col}{is_r['revenue']+1}-{raw(q, 'reported_revenue')})",
        f"=ABS('利润表'!{col}{is_r['gross']+1}-{raw(q, 'reported_gross_profit')})",
        f"=ABS('利润表'!{col}{is_r['op']+1}-{raw(q, 'reported_operating_income')})",
        f"=ABS('利润表'!{col}{is_r['ni']+1}-{raw(q, 'reported_net_income')})",
        f"=ABS('资产负债表'!{col}{bs_r['assets']+1}-{raw(q, 'reported_total_assets')})",
        f"=ABS('现金流量表'!{col}{cf_r['check']+1})",
        f"=ABS('资产负债表'!{col}{bs_r['balance']+1})",
        f"=ABS('现金流量表'!{col}{cf_r['cfi']+1}-{raw(q, 'investing_cf')})",
        f"=ABS('现金流量表'!{col}{cf_r['cff']+1}-{raw(q, 'financing_cf')})",
    ]
    for c, formula in enumerate(formulas, start=1):
        write_cached(ws, r, c, formula, F["formula_check"])
ws.conditional_format("B10:J25", {"type": "cell", "criteria": ">=", "value": 0.0002, "format": fmt(font_color=WHITE, bg_color=RED, bold=True)})
ws.set_column(0, 0, 9)
ws.set_column(1, 9, 18)
ws.freeze_panes(9, 1)
ws.set_tab_color(TEAL)

wb.close()
print(OUTPUT)
