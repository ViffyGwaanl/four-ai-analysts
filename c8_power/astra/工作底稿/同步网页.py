"""Python 3 标准库即可运行。先在 Excel/LibreOffice 重算并保存数据表.xlsx。"""
from pathlib import Path
import json, zipfile, xml.etree.ElementTree as E, hashlib
ROOT=Path(__file__).resolve().parents[1]
W=ROOT/'数据表.xlsx';NS={'m':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
with zipfile.ZipFile(W) as z:
 strings=[]
 if 'xl/sharedStrings.xml' in z.namelist():
  for si in E.fromstring(z.read('xl/sharedStrings.xml')).findall('m:si',NS):strings.append(''.join(si.itertext()))
 rels={r.attrib['Id']:r.attrib['Target'] for r in E.fromstring(z.read('xl/_rels/workbook.xml.rels'))}
 sheets={}
 for sh in E.fromstring(z.read('xl/workbook.xml')).findall('m:sheets/m:sheet',NS):
  rid=sh.attrib['{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id'];target=rels[rid];target=target.lstrip('/') if target.startswith('/') else 'xl/'+target
  cells={}
  for c in E.fromstring(z.read(target)).findall('.//m:sheetData/m:row/m:c',NS):
   el=c.find('m:v',NS);cv=el.text if el is not None else None;ty=c.attrib.get('t')
   if ty=='e':raise ValueError('Excel错误: '+sh.attrib['name']+'!'+c.attrib['r']+' '+str(cv))
   if ty=='s':cv=strings[int(cv)]
   elif ty=='inlineStr':cv=''.join(c.find('m:is',NS).itertext())
   elif ty not in ('str','s') and cv is not None:
    try:cv=float(cv)
    except ValueError:pass
   if c.find('m:f',NS) is not None and cv is None:raise ValueError('公式缺少缓存，请先在表格软件中重算并保存。')
   cells[c.attrib['r']]=cv
  sheets[sh.attrib['name']]=cells
mapping=json.loads((ROOT/'工作底稿/映射.json').read_text())
def raw(k):return sheets['明细']['E'+str(mapping['raw'][k])]
def model(k):return sheets['模型']['C'+str(mapping['model'][k])]
if model('K32')!='通过':raise ValueError('2030供电结构检查失败，请修正份额。')
flow=[]
for x in mapping['flow']:
 r=str(x['row']);cs=sheets['电力流向'];flow.append(dict(key=x['key'],name=x['name'],color=x['color'],historical=cs['C'+r],base=cs['E'+r],low=cs['F'+r],high=cs['G'+r],share2024=cs['B'+r],share2030=cs['D'+r]))
for key,target in [('historical',raw('D01')),('base',model('K14')),('low',model('K15')),('high',model('K16'))]:
 if abs(sum(x[key] for x in flow)-target)>1e-6:raise ValueError('流向守恒失败: '+key)
data=dict(asof='2026-10-22',workbook='数据表.xlsx',sha256=hashlib.sha256(W.read_bytes()).hexdigest(),
 history=[{'year':2024,'twh':raw('D01')},{'year':2025,'twh':raw('D03')}],
 scenarios={'historical':{'label':'2024 · 来源分摊','total':raw('D01'),'year':2024},'base':{'label':'2030 · 基准','total':model('K14'),'year':2030},'low':{'label':'2030 · 低需求','total':model('K15'),'year':2030},'high':{'label':'2030 · 高需求','total':model('K16'),'year':2030}},
 flows=flow,metrics={'cagr':model('K17'),'averageGW':model('K18'),'metaCapexMillion':model('K01'),'metaQ3Million':raw('M05'),'exampleTWh':model('K20'),'exampleBillMillion':model('K22'),'cfsMW':raw('U03'),'helionMW':raw('U08')},
 sources=[{'name':'IEA · Energy and AI','date':'2025-04-10','scope':'2024总量与物理来源约数'}, {'name':'IEA · Key Questions on Energy and AI','date':'2026-04-16','scope':'2025估计与2030预测'}, {'name':'研究模型假设','date':'2026-10-22','scope':'2030结构、需求敏感性与成本算例'}, {'name':'ITER · The tokamak / Blanket','date':'未标发布日期；访问2026-10-22','scope':'部件原理'}])
(ROOT/'web/data.json').write_text(json.dumps(data,ensure_ascii=False,indent=2))
print('已由Excel缓存导出 web/data.json；各情景电量守恒。')
