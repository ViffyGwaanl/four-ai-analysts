from pathlib import Path
import json, math
import xlsxwriter
ROOT=Path(__file__).resolve().parents[1]
d=json.loads((ROOT/'工作底稿/数据源.json').read_text()); R=d['records'];A=d['assumptions'];S=d['sources']
rmap={v['id']:i+5 for i,v in enumerate(R)};amap={v['id']:i+5 for i,v in enumerate(A)}
vals={v['id']:v['value'] for v in R+A}
wb=xlsxwriter.Workbook(ROOT/'数据表.xlsx');wb.set_calc_mode('auto');wb.set_properties({'title':'AI 的电从哪来 · 可追溯数据模型','author':'能源与科技研究','comments':'2026-10-22；研究展示，非投资建议'})
navy='#132F43';blue='#196DDB';teal='#168B84';orange='#E59D3F'
fm={}
fm['title']=wb.add_format({'font_name':'等线','font_size':23,'font_color':navy,'bold':True,'valign':'vcenter'})
fm['sub']=wb.add_format({'font_name':'等线','font_size':10,'font_color':'#536976','text_wrap':True,'valign':'vcenter'})
fm['head']=wb.add_format({'font_name':'等线','font_color':'white','bg_color':navy,'bold':True,'text_wrap':True,'valign':'vcenter','border':0})
for k,bg,fc in [('text','#FFFFFF',navy),('input','#EAF3FF','#1155A7'),('formula','#E9F5EF','#156647'),('assume','#FFF0D8','#9C661B')]:
 fm[k]=wb.add_format({'font_name':'等线','font_size':10,'bg_color':bg,'font_color':fc,'valign':'vcenter','text_wrap':True,'bottom':1,'bottom_color':'#E2E9EC'})
 for fmt,num in [('n','#,##0.00;[Red](#,##0.00);0.00'),('p','0.0%'),('i','#,##0')]:
  fm[k+fmt]=wb.add_format({'font_name':'等线','font_size':11,'bg_color':bg,'font_color':fc,'valign':'vcenter','num_format':num,'bottom':1,'bottom_color':'#E2E9EC'})

def setup(name,title,sub,headers,widths):
 ws=wb.add_worksheet(name);ws.hide_gridlines(2);ws.set_tab_color(teal);ws.set_default_row(32)
 ws.merge_range(0,0,0,len(headers)-1,title,fm['title']);ws.set_row(0,44)
 ws.merge_range(1,0,2,len(headers)-1,sub,fm['sub']);ws.set_row(1,24);ws.set_row(2,24)
 ws.write_row(3,0,headers,fm['head']);ws.set_row(3,30)
 for i,w in enumerate(widths):ws.set_column(i,i,w)
 ws.freeze_panes(4,2);ws.set_landscape();ws.set_paper(9);ws.fit_to_pages(1,0);ws.repeat_rows(0,3)
 ws.set_footer('&L能源与科技研究&C2026-10-22&R第 &P 页')
 return ws
raw=setup('明细','披露与统计 · 数据明细','蓝色数值 = 来源输入；绿色 = 公式；橙色 = 假设。所有金额统一为百万美元；美元支出用正值表示。发布日期、口径和定位均随行保存。', ['ID','分类','指标','期间','数值','单位','性质','来源ID','来源名称','发布日期','访问/读取日','文件/网址及定位','口径说明'],[10,15,38,24,18,16,23,10,35,25,16,65,65])
for i,x in enumerate(R,4):
 fields=['id','category','item','period','value','unit','status','source_id','source','date','access','location','note']
 for j,k in enumerate(fields):raw.write(i,j,x[k],fm[('inputp' if x['unit']=='%' else 'inputn') if k=='value' else 'text'])
 raw.set_row(i,56)
raw.autofilter(3,0,len(R)+3,12)
ass=setup('假设','可调整假设 · 输入面板','橙色数值可以调整；模型、汇总和图表自动重算。2030供电结构为研究假设；“其他”取残差，超过100%将显示检查失败。历史估计不可当成精确测量。',['ID','假设名称','数值','单位','性质','来源','设定日期','口径/用途'],[10,40,18,20,13,26,18,90])
for i,x in enumerate(A,4):
 for j,k in enumerate(['id','item','value','unit','status','source','date','note']):ass.write(i,j,x[k],fm[('assumep' if x['unit']=='%' else 'assumen') if k=='value' else 'text'])
 ass.set_row(i,45)
 ass.data_validation(i,2,i,2,{'validate':'decimal','criteria':'between','minimum':0 if x['unit']=='%' else .0001,'maximum':1 if x['unit']=='%' else 1000000,'input_title':'研究假设','input_message':'调整后请检查“模型”与“电力流向”的校验。'})
# PUE >= 1
ass.data_validation(amap['A11']-1,2,amap['A11']-1,2,{'validate':'decimal','criteria':'>=','value':1})
def ref(id):return "'明细'!E%d"%rmap[id] if id in rmap else "'假设'!C%d"%amap[id]
model=setup('模型','计算与校验 · 从输入到结论','绿色单元格均为公式。网页读取“电力流向”导出快照；调整Excel后，保存重算结果，再运行工作底稿/同步网页.py。',['模型ID','计算指标','结果','单位','计算口径/来源','发布日期/性质'],[12,43,22,22,85,28])
M={};MV={}
def calc(id,label,formula,value,unit,note,source):
 i=len(M)+4;M[id]=i+1;MV[id]=value
 model.write(i,0,id,fm['text']);model.write(i,1,label,fm['text']);model.write_formula(i,2,formula,fm['formulap' if unit=='%' else 'formulan'] if isinstance(value,(int,float)) else fm['formula'],value)
 model.write(i,3,unit,fm['text']);model.write(i,4,note,fm['text']);model.write(i,5,source,fm['text']);model.set_row(i,45)
def mr(id):return "'模型'!C%d"%M[id]
def v(id):return vals[id]
calc('K01','Meta 前九个月资本开支',f'={ref("M01")}+{ref("M02")}',v('M01')+v('M02'),'百万美元','购建固定资产＋融资租赁本金；现金流表精确求和。','F1 / 2026-10-21')
calc('K02','Meta 上年同期资本开支',f'={ref("M03")}+{ref("M04")}',v('M03')+v('M04'),'百万美元','同口径。','F1 / 2026-10-21')
calc('K03','Meta 资本开支同比',f'={mr("K01")}/{mr("K02")}-1',MV['K01']/MV['K02']-1,'%','含融资租赁本金。','F1 / 2026-10-21；计算')
calc('K04','Meta 指引隐含Q4资本开支下限',f'={ref("M06")}-{mr("K01")}',v('M06')-MV['K01'],'百万美元','全年指引减去前三季度实际；不是单独Q4指引。','F1 / 2026-10-21；计算')
calc('K05','Meta 指引隐含Q4资本开支上限',f'={ref("M07")}-{mr("K01")}',v('M07')-MV['K01'],'百万美元','同上。','F1 / 2026-10-21；计算')
calc('K06','Meta 资本开支/经营现金流',f'={mr("K01")}/{ref("M08")}',MV['K01']/v('M08'),'%','前三季度合并现金口径；不是资本回报率。','F1 / 2026-10-21；计算')
calc('K07','Meta 经营现金流减资本开支',f'={ref("M08")}-{mr("K01")}',v('M08')-MV['K01'],'百万美元','研究简化剩余现金，不是净利润；未扣其他投资和分红。','F1 / 2026-10-21；计算')
calc('K08','Meta 在建工程较年末增幅',f'={ref("M09")}/{ref("M10")}-1',v('M09')/v('M10')-1,'%','存量增长不能推导当期用电增长。','F1 / 2026-10-21；计算')
calc('K09','Meta Capex精确和与披露约数差',f'={mr("K01")}-{ref("M13")}',MV['K01']-v('M13'),'百万美元','差额4百万美元是858.24与858.20亿美元的舍入差。','F1 / 2026-10-21；计算')
calc('K10','Amazon TTM净购建固定资产推导',f'={ref("T05")}-{ref("T06")}',v('T05')-v('T06'),'百万美元','经营现金流－自由现金流；净额包括出售与激励抵减；摘要约数。','S6 / 2026-07-30；推导')
calc('K11','Constellation H1收入增幅',f'={ref("C06")}/{ref("C07")}-1',v('C06')/v('C07')-1,'%','并表Calpine，不能作为AI有机增长。','F3 / 2026-08-06；计算')
calc('K12','Constellation H1资本开支增幅',f'={ref("C08")}/{ref("C09")}-1',v('C08')/v('C09')-1,'%','组合边界发生变化。','F3 / 2026-08-06；计算')
calc('K13','Constellation H1核电量同比',f'={ref("C10")}/{ref("C11")}-1',v('C10')/v('C11')-1,'%','按持有比例的发电量。','F3 / 2026-08-06；计算')
calc('K14','全球2030基准用电',f'={ref("D04")}*{ref("A01")}',v('D04')*v('A01'),'TWh','IEA新版基准×研究倍数假设。','S3 / 2026-04-16 + A01假设')
calc('K15','全球2030低需求敏感性',f'={mr("K14")}*{ref("A02")}',MV['K14']*v('A02'),'TWh','非IEA官方情景。','2026-10-22；假设计算')
calc('K16','全球2030高需求敏感性',f'={mr("K14")}*{ref("A03")}',MV['K14']*v('A03'),'TWh','非IEA官方情景。','2026-10-22；假设计算')
calc('K17','2025至2030用电年均增速',f'=({mr("K14")}/{ref("D03")})^(1/5)-1',(MV['K14']/v('D03'))**.2-1,'%','5年复合增速；基于约数。','S3 + A01；计算')
calc('K18','2030等效平均功率',f'={mr("K14")}*1000/{ref("A12")}',MV['K14']*1000/v('A12'),'GW','不是峰值接入容量。','S3 + A01/A12；计算')
calc('K19','美国2024用电近似推导',f'={ref("D01")}*{ref("D15")}',v('D01')*v('D15'),'TWh','全球用电×美国约45%；双重约数，仅数量级。','S1 / 2025-04-10；计算')
calc('K20','1GW IT示例年用电',f'={ref("A09")}*{ref("A10")}*{ref("A11")}*{ref("A12")}/1000',v('A09')*v('A10')*v('A11')*v('A12')/1000,'TWh','IT功率×负载率×PUE×小时/1000；独立假设算例。','2026-10-22；假设')
for id,aid,title in [('K21','A13','示例年电费·低'),('K22','A14','示例年电费·基准'),('K23','A15','示例年电费·高')]:calc(id,title,f'={mr("K20")}*{ref(aid)}',MV['K20']*v(aid),'百万美元','TWh×美元/MWh = 百万美元；仅电费。','2026-10-22；假设')
calc('K24','示例设施峰值功率',f'={ref("A09")}*{ref("A11")}',v('A09')*v('A11'),'GW','简化采用相同PUE；不含电力冗余。','2026-10-22；假设')
calc('K25','示例核电年电量等效容量',f'={mr("K20")}*1000/{ref("A12")}/{ref("A16")}',MV['K20']*1000/v('A12')/v('A16'),'GW','只匹配年电量；检修和瞬时功率仍需其他保供。','2026-10-22；假设')
calc('K26','示例光伏年电量等效容量',f'={mr("K20")}*1000/{ref("A12")}/{ref("A17")}',MV['K20']*1000/v('A12')/v('A17'),'GW','只匹配年电量；不含储能与夜间保供。','2026-10-22；假设')
calc('K27','示例现场燃气名义容量',f'={mr("K24")}*(1+{ref("A18")})',MV['K24']*(1+v('A18')),'GW','峰值负荷×(1+超配比例)，非工程建议。','S3背景 + A18；假设')
for id,pid,label in [('K28','C14','Crane满运行年电量示意'),('K29','P01','Clinton满运行年电量示意'),('K30','P04','Talen合约满量年电量示意')]:calc(id,label,f'={ref(pid)}*{ref("A16")}*{ref("A12")}/1000000',v(pid)*v('A16')*v('A12')/1e6,'TWh','容量×90%容量因子×8760小时；非实际交付、非合同承诺；不同起始年份。','原始容量披露 + A16/A12假设')
calc('K31','2030其余来源份额',f'=1-SUM({ref("A04")},{ref("A05")},{ref("A06")},{ref("A07")},{ref("A08")})',1-sum(v(k) for k in ['A04','A05','A06','A07','A08']),'%','残差，不额外计入电网或储能。','2026-10-22；假设计算')
calc('K32','2030份额校验',f'=IF(AND({mr("K31")}>-0.0000001,{mr("K31")}<=1),"通过","失败：份额超过100%")','通过','状态','若失败，请调低假设份额；不得把负残差视为电量。','研究模型')
calc('K33','2024其余来源份额',f'=1-SUM({ref("D11")},{ref("D12")},{ref("D13")},{ref("D14")})',.02,'%','IEA已列份额约数之和为98%；残差包括其他来源及舍入。','S2；分摊计算')
flow=setup('电力流向','电力流向 · 网页同源模型','全表为终端用电的来源分摊；电网是输送层，储能是时间转移，均不重复加总。2030结构为研究假设。聚变默认零贡献。',['来源','2024份额','2024 TWh','2030份额(假设)','2030基准 TWh','2030低 TWh','2030高 TWh','依据及日期'],[20,18,20,24,22,22,22,70])
flows=[]
for idx,(key,name,c,old,new) in enumerate([('coal','煤电','#A58D76','D11','A04'),('gas','燃气','#DF9E4B','D12','A05'),('nuclear','核裂变','#497CE8','D13','A06'),('renewables','可再生能源','#26A88B','D14','A07'),('other','其他','#A6A7C6','K33','K31'),('fusion','聚变','#CA78D7',None,'A08')],4):
 oldref=ref(old) if old in rmap else mr(old) if old else '0';newref=ref(new) if new in amap else mr(new)
 ov=v(old) if old in vals else MV.get(old,0);nv=v(new) if new in vals else MV.get(new,0)
 flow.write(idx,0,name,fm['text']);flow.write_formula(idx,1,'='+oldref,fm['formulap'],ov);flow.write_formula(idx,2,f'=B{idx+1}*{ref("D01")}',fm['formulan'],ov*v('D01'))
 flow.write_formula(idx,3,'='+newref,fm['formulap'],nv)
 for j,k in [(4,'K14'),(5,'K15'),(6,'K16')]:flow.write_formula(idx,j,f'=D{idx+1}*{mr(k)}',fm['formulan'],nv*MV[k])
 flow.write(idx,7,'2024：IEA 2025-04-10约数分摊；2030：研究假设 2026-10-22。' if name!='聚变' else '零贡献为谨慎建模假设，不是断言2030无任何聚变示范。',fm['text']);flow.set_row(idx,52)
 flows.append(dict(key=key,name=name,color=c,row=idx+1))
flow.write(10,0,'合计',fm['head'])
for j in range(1,7):
 letter=chr(65+j);total=1 if j in [1,3] else v('D01') if j==2 else MV[{4:'K14',5:'K15',6:'K16'}[j]]
 flow.write_formula(10,j,f'=SUM({letter}5:{letter}10)',fm['formulap' if j in [1,3] else 'formulan'],total)
flow.write(11,0,'守恒校验',fm['head'])
flow.write_formula(11,2,f'=C11-{ref("D01")}',fm['formulan'],0)
flow.write_formula(11,4,f'=E11-{mr("K14")}',fm['formulan'],0)
flow.write(11,7,'应为0；允许浮点计算尾差。',fm['text'])
summary=setup('汇总','AI 的电从哪来','研究日期 2026-10-22 ｜ 绿色数值直接引用明细或模型；图表引用本页或电力流向。各公司支出期间与租赁口径不同，不做总量排名或相加。',['指标','结果','单位','解释','来源/发布日期'],[45,23,22,65,40])
items=[('全球数据中心用电 2024','D01','TWh','IEA估计；包含非AI负荷'),('全球数据中心用电 2025','D03','TWh','最新完整年度估计'),('2030基准预测/情景','K14','TWh','IEA 2026版×可调倍数'),('2030低需求敏感性','K15','TWh','研究假设：基准×80%'),('2030高需求敏感性','K16','TWh','研究假设：基准×120%'),('2025—2030年均增速','K17','%','约数计算'),('Meta 2026前九个月Capex','K01','百万美元','含融资租赁本金'),('Meta Capex同比','K03','%','同为前九个月'),('Meta Q4隐含支出下限','K04','百万美元','全年指引减前三季度'),('Meta Q4隐含支出上限','K05','百万美元','计算值不是Q4管理层单独指引'),('1GW IT示例年用电','K20','TWh','85%负载率，PUE1.2，假设'),('示例年电费·基准','K22','百万美元','90美元/MWh，假设'),('Constellation 2025核电量','C04','GWh','持有比例口径'),('Constellation 2026H1核电量同比','K13','%','包含相同比例口径'),('2030结构校验','K32','状态','份额调整后必须通过')]
for i,(label,k,unit,note) in enumerate(items,4):
 value=v(k) if k in vals else MV[k];formula='='+ref(k) if k in rmap else '='+mr(k)
 summary.write(i,0,label,fm['text']);summary.write_formula(i,1,formula,fm['formulap' if unit=='%' else 'formulan'] if isinstance(value,(int,float)) else fm['formula'],value);summary.write(i,2,unit,fm['text']);summary.write(i,3,note,fm['text']);summary.write(i,4, next((x['source_id']+' / '+x['date'] for x in R if x['id']==k),'见模型 '+k+' 的来源列'),fm['text']);summary.set_row(i,35)
ch=wb.add_chart({'type':'column'});ch.add_series({'name':'全球终端用电','categories':"='汇总'!$A$5:$A$9",'values':"='汇总'!$B$5:$B$9",'fill':{'color':blue},'border':{'none':True},'data_labels':{'value':True,'num_format':'0'}});ch.set_title({'name':'用电规模与2030敏感性'});ch.set_y_axis({'name':'TWh','major_gridlines':{'visible':True,'line':{'color':'#E8EEF2'}}});ch.set_legend({'none':True});ch.set_size({'width':790,'height':360});summary.insert_chart('A22',ch)
ch2=wb.add_chart({'type':'column','subtype':'stacked'})
# 2024 vs 2030 need two noncontiguous values; make auxiliary chart block
summary.write_row(41,0,['来源','2024','2030基准（假设结构）'],fm['head'])
for i,x in enumerate(flows,42):
 rr=x['row'];summary.write(i,0,x['name'],fm['text']);summary.write_formula(i,1,f"='电力流向'!C{rr}",fm['formulan'],v('D01')*([.3,.26,.15,.27,.02,0][i-42]));summary.write_formula(i,2,f"='电力流向'!E{rr}",fm['formulan'],MV['K14']*([.18,.26,.14,.4,.02,0][i-42]))
 ch2.add_series({'name':f"='汇总'!$A${i+1}",'categories':"='汇总'!$B$42:$C$42",'values':f"='汇总'!$B${i+1}:$C${i+1}",'fill':{'color':x['color']},'border':{'none':True}})
ch2.set_title({'name':'终端用电的来源分摊 · 2030结构为假设'});ch2.set_y_axis({'name':'TWh'});ch2.set_legend({'position':'bottom'});ch2.set_size({'width':790,'height':370});summary.insert_chart('A50',ch2)
summary.set_tab_color(blue);summary.activate();summary.set_first_sheet();summary.print_area(0,0,65,4)
src=setup('来源索引','来源索引与证据边界','访问日期统一为2026-10-22；本地文件发布日期取签署日。网页链接保留于报告和Excel，3D网页只显示来源名称与日期。',['ID','来源名称','发布日期','访问/读取日','文件路径或URL','说明'],[10,46,33,20,110,80])
for i,s in enumerate(S.values(),4):
 for j,k in enumerate(['id','name','date','access','location','note']):src.write(i,j,s[k],fm['text'])
 src.set_row(i,60)
for ws in [raw,ass,model,flow,summary,src]:ws.set_zoom(90)
# conditional checks
model.conditional_format(M['K32']-1,2,M['K32']-1,2,{'type':'text','criteria':'containing','value':'失败','format':wb.add_format({'bg_color':'#FFC7CE','font_color':'#9C0006'})})
wb.close()
(ROOT/'工作底稿/映射.json').write_text(json.dumps(dict(raw=rmap,assumptions=amap,model=M,flow=flows,model_values=MV),ensure_ascii=False,indent=2))
print('Workbook generated',len(M),'formula model outputs')
