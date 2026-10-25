"""检查重算后的工作簿：错误值、核对行是否为0、关键数字。用法：python3 check_excel.py <重算后的xlsx> <原始xlsx>"""
import sys, openpyxl
calc = openpyxl.load_workbook(sys.argv[1], data_only=True)
form = openpyxl.load_workbook(sys.argv[2], data_only=False)
errs, nform, maxchk = [], 0, {}
for ws in form.worksheets:
    wc = calc[ws.title]
    for row in ws.iter_rows():
        for cell in row:
            v = cell.value
            if isinstance(v, str) and v.startswith("="):
                nform += 1
                cv = wc[cell.coordinate].value
                if cv is None or (isinstance(cv, str) and cv.startswith("#")) or (isinstance(cv, str) and "Err" in cv):
                    errs.append((ws.title, cell.coordinate, v[:80], cv))
    # 核对行
    for row in ws.iter_rows(min_row=1, max_row=ws.max_row):
        a = row[0].value
        b = row[1].value if len(row) > 1 else None
        if (isinstance(b, str) and ("应为0" in b or "应约为0" in b)) or (isinstance(a, str) and ("应约为0" in a)):
            vals = [wc.cell(row[0].row, c).value for c in range(3, 19)]
            vals = [x for x in vals if isinstance(x, (int, float))]
            if vals:
                maxchk[f"{ws.title}:{a}"] = max(abs(x) for x in vals)
print("公式数量", nform, "错误/空值", len(errs))
for e in errs[:30]:
    print("  ", e)
print("核对行最大偏差：")
for k, v in maxchk.items():
    print(f"  {v:10.5f}  {k}")
an = calc["分析"]
for row in an.iter_rows(min_row=1, max_row=an.max_row):
    if row[0].value and isinstance(row[1].value, (int, float)) and row[0].row > 40:
        print("  汇总", row[0].value, round(row[1].value, 4))
m = calc["模型复现与情景"]
for row in m.iter_rows(min_row=1, max_row=m.max_row):
    if row[0].value and str(row[0].value).startswith(("模型", "实际", "差额")) and isinstance(row[1].value, (int, float)):
        print("  情景", row[0].value, round(row[1].value, 4))
