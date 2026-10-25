import sys,json
from pathlib import Path
sys.path.insert(0,str(Path(__file__).parent/'python_lib'))
from openpyxl import load_workbook
w=load_workbook('交付/合并模型.xlsx',data_only=True);m=json.loads(Path('交付/工作底稿/model_map.json').read_text())
p=w['合并备考'];e=w['换股比例'];o=w['股本与持股']
D={'date':'2026-10-22','period':'2026 Q3','unit':'USD million','q':{},'y':{},'ttm':{},'bs':{},'scenarios':[],'ownership':{},'segments':[]}
for group,target in [('q','q'),('y','y'),('t','ttm')]:
 for k in ['rev','gross','op','net','ocf','capex','fcf']:D[target][k]=p[f'F{m["PR"][group+"_"+k]}'].value
for k,r in m['BS'].items():D['bs'][k]=p[f'F{r}'].value
for k,r in m['OR'].items():D['ownership'][k]=o[f'B{r}'].value
for col,label,short in [('B','10月21日收盘','收盘市值'),('C','20日加权近似','20日近似'),('D','假设EV/营收','营收倍数')]:
 a={'name':label,'short':short};a.update({k:e[f'{col}{r}'].value for k,r in m['ER'].items()});D['scenarios'].append(a)
colors=['#1264b5','#00a88c','#e88a3d','#22b5d0','#7662dc']
labels=['汽车与服务','能源与储能','航天','卫星连接','超级智能 SI']
for i,(k,r) in enumerate(m['BR'].items()):
 D['segments'].append({'id':k,'name':labels[i],'rev':p[f'B{r}'].value,'share':p[f'C{r}'].value,'profit':p[f'D{r}'].value,'profitLabel':'毛利' if i<2 else '经营利润','color':colors[i]})
D['company']={co:{k:{period:w[co+'财务'][f'{col}{r}'].value for period,col in [('FY25','B'),('Q425','C'),('Q126','D'),('Q226','E'),('Q326','F'),('TTM','G')]} for k,r in m['mr'].items()} for co in ['Tesla','SpaceX']}
Path('交付/工作底稿/summary.json').write_text(json.dumps(D,ensure_ascii=False,indent=2))
Path('交付/web/data.js').write_text('export const DATA = '+json.dumps(D,ensure_ascii=False,indent=2)+';\n')
print(json.dumps({k:D[k] for k in ['q','y','ttm','bs','scenarios']},ensure_ascii=False,indent=2))
