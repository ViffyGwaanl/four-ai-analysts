from pathlib import Path
import sys,json,zipfile
P=Path(__file__).resolve().parents[1];sys.path.insert(0,str(P/'工具/依赖'))
from openpyxl import load_workbook
from docx import Document
h=json.loads((P/'数据/完整导出.json').read_text())['history'];report={}
f=load_workbook(P/'三张表.xlsx',data_only=False);v=load_workbook(P/'检查/重算/三张表.xlsx',data_only=True)
errs=[];missing=[];n=0
for s in f:
 for row in s:
  for c in row:
   if c.data_type=='f':
    n+=1;x=v[s.title][c.coordinate]
    if x.data_type=='e':errs.append((s.title,c.coordinate,x.value))
    if x.value is None:missing.append((s.title,c.coordinate))
assert not errs and not missing,(errs,missing)
for j,q in enumerate(h,2):
 for sheet,row,group,key in [('利润表',5,'income_statement','revenue'),('利润表',15,'income_statement','net_income'),('资产负债表',5,'balance_sheet','cash'),('资产负债表',13,'balance_sheet','equity'),('现金流量表',10,'cash_flow','operating')]:assert abs(v[sheet].cell(row,j).value-q[group][key])<1e-8
for s,rows in [('利润表',[19,20]),('资产负债表',[15]),('现金流量表',[11,17])]:
 for r in rows:
  vals=[v[s].cell(r,j).value for j in range(2,18)];assert max(map(abs,vals))<=.0003;report[s+str(r)+'最大差额']=max(map(abs,vals))
report['formula_count']=n;report['formula_errors']=errs;report['missing_cache']=missing;report['charts']=len(f['经营分析']._charts);assert report['charts']==3
# Alter assumptions in a disposable validation copy. This will be recalculated by LibreOffice.
f['导览与假设']['B6']=120;f['导览与假设']['B8']=.3;f.save(P/'检查/假设联动.xlsx')
d=Document(P/'经营复盘.docx');assert len(d.tables)==4;report['docx_paragraphs']=len(d.paragraphs);report['docx_tables']=len(d.tables)
for file in [P/'三张表.xlsx',P/'经营复盘.docx']:
 with zipfile.ZipFile(file) as z:assert z.testzip() is None
report['file_structure']='XLSX、DOCX ZIP/OOXML完整；LibreOffice成功打开并导出'
(P/'检查/财务验证.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print(json.dumps(report,ensure_ascii=False,indent=2))
