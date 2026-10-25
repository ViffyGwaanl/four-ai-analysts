from pathlib import Path
from openpyxl import load_workbook
from docx import Document
from pptx import Presentation
from pypdf import PdfReader
import json,math,zipfile,hashlib,re
R=Path(__file__).resolve().parents[1];F=load_workbook(R/'数据表.xlsx',data_only=False);V=load_workbook(R/'数据表.xlsx',data_only=True);C=load_workbook(R/'验证/重算/数据表.xlsx',data_only=True);M=json.loads((R/'工作底稿/映射.json').read_text());report={'errors':[],'formula_count':0,'formula_cache_mismatches':[]}
for ws in F:
 for row in ws:
  for c in row:
   cv=V[ws.title][c.coordinate];recalc=C[ws.title][c.coordinate]
   if cv.data_type=='e' or recalc.data_type=='e':report['errors'].append(ws.title+'!'+c.coordinate)
   if c.data_type=='f':
    report['formula_count']+=1
    a,b=cv.value,recalc.value
    equal=math.isclose(a,b,rel_tol=1e-10,abs_tol=1e-8) if isinstance(a,(float,int)) and isinstance(b,(float,int)) else a==b
    if not equal:report['formula_cache_mismatches'].append([ws.title,c.coordinate,a,b])
for fn in ['研究报告.docx','数据表.xlsx','演示摘要.pptx']:
 with zipfile.ZipFile(R/fn) as z:assert z.testzip() is None
Document(R/'研究报告.docx');prs=Presentation(R/'演示摘要.pptx')
report['document_open']='python-docx + LibreOffice PDF conversion';report['report_pages']=len(PdfReader(R/'验证/研究报告.pdf').pages);report['slides']=len(prs.slides);report['presentation_open']='python-pptx + LibreOffice PDF conversion'
report['excel_open']='openpyxl + LibreOffice Calc actual recalculation';report['charts']=len(F['汇总']._charts)
# All web flow values must come from exact cached cells.
d=json.loads((R/'web/data.json').read_text());assert hashlib.sha256((R/'数据表.xlsx').read_bytes()).hexdigest()==d['sha256'];report['web_workbook_hash_match']=True
for x in M['flow']:
 row=x['row'];f=next(f for f in d['flows'] if f['key']==x['key'])
 for key,col in [('historical','C'),('base','E'),('low','F'),('high','G')]:assert math.isclose(f[key],V['电力流向'][col+str(row)].value,abs_tol=1e-8)
report['web_numbers_equal_excel']=True
# Mutation copy for a real application recalculation test: demand multiplier and PUE.
F['假设']['C'+str(M['assumptions']['A01'])]=1.1;F['假设']['C'+str(M['assumptions']['A11'])]=1.3
(R/'验证/联动测试输入').mkdir(exist_ok=True);F.save(R/'验证/联动测试输入/联动测试.xlsx')
previous=R/'验证/表格与文档检查.json'
if previous.exists():
 old=json.loads(previous.read_text())
 if 'mutation_test' in old:report['mutation_test']=old['mutation_test']
(R/'验证/表格与文档检查.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print(json.dumps(report,ensure_ascii=False,indent=2))
assert not report['errors'] and not report['formula_cache_mismatches']
