import sys,json,math
from pathlib import Path
sys.path.insert(0,'交付/工作底稿/依赖')
import xlsxwriter
from xlsxwriter.utility import xl_rowcol_to_cell as cell
D=json.loads(Path('交付/工作底稿/financial_data.json').read_text());G=json.loads(Path('交付/web/decisions.json').read_text())
W=xlsxwriter.Workbook('交付/伯克希尔账本.xlsx',{'strings_to_urls':False})
W.set_properties({'title':'伯克希尔账本｜2021—2026H1','author':'研究与历史决策实验室','comments':'研究展示，不构成投资建议；以材料原文为准。'})
navy='#183D46';teal='#138B83';orange='#E7A84C';pale='#EAF6FA';green='#EAF5EC';ink='#28434A'
F={}
for n,opts in {'title':{'font_size':23,'bold':True,'font_color':navy},'sub':{'font_size':10,'font_color':'#677C80','text_wrap':True},'head':{'bold':True,'bg_color':navy,'font_color':'#FFFFFF','text_wrap':True},'label':{'font_color':ink,'text_wrap':True},'input':{'bg_color':pale,'font_color':'#16587E','num_format':'#,##0;[Red](#,##0);–'},'formula':{'bg_color':green,'font_color':'#23694E','num_format':'#,##0;[Red](#,##0);–'},'pct':{'bg_color':green,'font_color':'#23694E','num_format':'0.0%;[Red](0.0%);–'},'decimal':{'bg_color':green,'num_format':'#,##0.00;[Red](#,##0.00);–'},'text':{'text_wrap':True,'valign':'top','font_color':ink},'note':{'text_wrap':True,'font_color':'#677C80','font_size':9},'assume':{'bg_color':'#FFF0D5','font_color':'#9F6014','num_format':'0.0%'},'key':{'font_size':28,'bold':True,'font_color':teal,'num_format':'0.0%'},'big':{'font_size':28,'bold':True,'font_color':navy,'num_format':'#,##0.0'},'small':{'font_size':9,'font_color':ink},'zero':{'bg_color':green,'num_format':'0.000000'}}.items():
 F[n]=W.add_format({'font_name':'等线','font_size':11,'valign':'vcenter',**opts})
F['input_pct']=W.add_format({'font_name':'等线','bg_color':pale,'font_color':'#16587E','num_format':'0%'});F['input_decimal']=W.add_format({'font_name':'等线','bg_color':pale,'font_color':'#16587E','num_format':'0.00'});S={};cache={};audit=[];sources=[]
def sheet(name,title,subtitle):
 s=W.add_worksheet(name);S[name]=s;s.hide_gridlines(2);s.set_tab_color(teal);s.set_column('A:A',38);s.set_column('B:H',16);s.set_column('I:I',60);s.set_default_row(30);s.merge_range('A1:I2',title,F['title']);s.merge_range('A3:I3',subtitle,F['sub']);s.set_row(2,37);s.freeze_panes(5,1);return s
def put(s,r,c,v,fmt='input',src=None,note=''):
 s.write(r-1,c-1,v,F[fmt]);addr=cell(r-1,c-1);cache[(s.name,addr)]=v
 if src:
  s.write_comment(r-1,c-1,src+('\n口径：'+note if note else ''),{'width':420,'height':145,'author':'来源索引'})
  sources.append([s.name+'!'+addr,v,src,note])
def formula(s,r,c,form,v,fmt='formula'):
 s.write_formula(r-1,c-1,form,F[fmt],v);addr=cell(r-1,c-1);cache[(s.name,addr)]=v;audit.append({'sheet':s.name,'cell':addr,'formula':form,'cached':v})
def banner(s):
 for j,t in enumerate(['指标']+D['periods']+['口径与来源提示']):s.write(4,j,t,F['head'])
 s.autofilter(4,0,4,8)
def source(year,kind):
 if year in ('2025H1','2026H1'):
  if kind=='segment':return '材料/Berkshire_2026Q2季报__brka-20260630.htm｜Note 24 Business segment data'
  if kind in ('profit','cf','shares') and year=='2026H1' or kind=='profit' or kind=='cf':return '材料/Berkshire_2026Q2季报__brka-20260630.htm｜'+{'profit':'Item 2 Results of Operations，p33','cf':'Consolidated Statements of Cash Flows，p5','shares':'Note 18 Common stock'}[kind]
  if year=='2025H1':return '补充来源 E3：2025二季报 2ndqtr25.pdf｜'+{'balance':'Consolidated Balance Sheets，p2–3','shares':'Note 18 Common stock，p19–20','portfolio':'Note 4 Investments in equity securities，p8','float':'Item 2 Insurance—Investment Income，p35','buyback':'Note 18 Common stock，p20','segment':'Business segment data'}[kind]
  return '材料/Berkshire_2026Q2季报__brka-20260630.htm｜'+{'balance':'Consolidated Balance Sheets，p2–3','portfolio':'Note 4 Investments in equity securities，p8','float':'Item 2 Insurance—Investment Income，p38','buyback':'Consolidated Statements of Changes in Shareholders’ Equity，p4','segment':'Note 24 Business segment data'}[kind]
 if year in ('2023','2024','2025'):
  if kind=='balance' and year=='2023':return '补充来源 E2：2023ar.pdf｜Consolidated Balance Sheets，K-70–71'
  if kind=='portfolio' and year=='2023':return '补充来源 E2：2023ar.pdf｜Note 4 Investments in equity securities，K-85'
  return '材料/Berkshire_2025年报__brka-20251231.htm｜'+{'profit':'Item 7 Results of Operations，K-34','cf':'Consolidated Statements of Cash Flows','balance':'Consolidated Balance Sheets / Statements of Changes in Shareholders’ Equity','shares':'Note 22 Common stock，期末 Outstanding','portfolio':'Note 4 Investments in equity securities','float':'Item 7 Insurance—Investment Income，K-41','buyback':'Consolidated Statements of Changes in Shareholders’ Equity','segment':'Note 26 Business segment data'}[kind]
 if kind=='float':return f'材料/股东信/2022ltr.pdf｜The Past Year in Brief，印刷页6（2021为147、2022为164十亿美元，约数）'
 if kind=='portfolio' and year=='2021':return '补充来源 E1：2022ar.pdf｜Note 4 Investments in equity securities，K-84'
 return '补充来源 E2：2023ar.pdf｜'+{'profit':'Item 7 Results of Operations，K-35（ASU 2018-12重述后）','cf':'Consolidated Statements of Cash Flows，K-74','balance':'Consolidated Statements of Changes in Shareholders’ Equity，K-73；现金见Cash Flows K-74','shares':'Note 22 Common stock，K-107','portfolio':'Note 4 Investments in equity securities，K-85','buyback':'Consolidated Statements of Changes in Shareholders’ Equity，K-73','segment':'Note 26 Business segment data，K-113'}[kind]
# Landing page
s=sheet('阅读指南','伯克希尔的账本','2021—2025 年度 · 2025H1 同期基准 · 2026H1｜金额默认：百万美元；股数：股；每股：美元')
intro=[('先看什么','「变化」是一页分析；「变化明细」列出同比、期末变化和占比。各输入格均有来源批注，亦可在「取数索引」集中检索。'),('颜色说明','浅蓝＝披露事实输入；浅绿＝公式；浅橙＝可修改的假设。原始输入也可编辑，但将偏离披露事实。数字格式“–”表示0。'),('利润口径','主表使用MD&A归属股东的税后分项；「法定分部」另列税前分部利润，保留制造、服务零售、McLane、Pilot。税前与税后不可直接混加。'),('历史重述与归类','2021–2022采用2023年报ASU 2018-12重述数据。原Non-controlled businesses并入其他，2023 Pilot并入制造服务零售，与2025口径衔接；桥接见「对账」。'),('时间口径','利润、回购和现金流为期间数；浮存金、现金、组合、权益和每股账面价值为期末数。2026H1同比只对2025H1；不年化。'),('现金口径','主表＝合并现金及现金等价物＋资产负债表单列短期国债，含铁路能源，未扣未结算国债应付款，不含受限现金。不重复加入现金等价物中的国债。'),('组合与浮存金','组合按Note 4的公允价值行业分类，包含权益证券中的优先股及认股权证，不含权益法投资。浮存金是约数负债资金，不是额外现金或股东权益。'),('每股账面价值','归属伯克希尔股东权益÷期末等值A股数；等值A＝A股＋B股/1500。采用期末数量而非EPS加权平均股数，不等于内在价值。'),('资料优先级','用户提供材料优先。其未覆盖的2021–2022明细、2023部分期末数和2025H1期末数，补充官方2022/2023年报及2025二季报，访问日2026-10-22。'),('边界','只研究账本与历史决策；不提供投资建议。2025股东信署名Gregory E. Abel，小游戏巴菲特原文均取自更早股东信。')]
for r,(a,b) in enumerate(intro,5):s.write(r,0,a,F['head']);s.merge_range(r,1,r,8,b,F['text']);s.set_row(r,49)
s.set_landscape();s.fit_to_pages(1,1);s.print_area('A1:I16')
# Create tabs in desired order
v=sheet('变化','交班后的半年：增长从哪里来？','2026H1 对 2025H1；存量另看较2025年末变化｜所有展示数与下表公式联动，不将半年业绩年化')
p=sheet('利润','经营利润与归母净利润','税后、归属伯克希尔股东；百万美元。主表按2025年报MD&A聚合口径。');banner(p)
keys=['underwriting','insurance_income','rail','energy','msr','other']
labels=['保险承保','保险投资收益','铁路 BNSF','能源 BHE','制造、服务和零售（含Pilot、McLane）','其他（含权益法收益及汇兑）']
for r,k,l in zip(range(6,12),keys,labels):
 put(p,r,1,l,'label');p.write(r-1,8,'2021–22其他已作分类桥接，详见对账。' if k=='other' else '详见本格批注 / 取数索引',F['note'])
 for j,y in enumerate(D['periods']):
  if k=='other' and j<2:formula(p,r,j+2,f"='对账'!{cell(6,j+1)}",D[k][j])
  else:put(p,r,j+2,D[k][j],src=source(y,'profit'))
put(p,12,1,'经营分项合计','label')
ops=[sum(D[k][j] for k in keys) for j in range(7)]
for j in range(7):formula(p,12,j+2,f'=SUM({cell(5,j+1)}:{cell(10,j+1)})',ops[j])
for r,k,l in [(14,'invest_gain','投资损益（含早年衍生合约）'),(15,'impairment','权益法投资减值（税后）'),(17,'net','披露归母净利润')]:
 put(p,r,1,l,'label')
 for j,y in enumerate(D['periods']):put(p,r,j+2,D[k][j],src=source(y,'profit'),note='0表示该独立调整行在当期无披露金额，并非所有资产均无减值。' if k=='impairment' else '')
for r,l in [(16,'公式归母净利润'),(18,'净利润对账差（应为0）')]:
 put(p,r,1,l,'label')
 for j in range(7):
  col=cell(0,j+1)[:-1];formula(p,r,j+2,f'={col}12+{col}14+{col}15' if r==16 else f'={col}16-{col}17',D['net'][j] if r==16 else 0)
p.merge_range('A20:I21','注：此处经营分项合计为MD&A六项合计。其他中仍可能包含商誉等经营层面的减值；不把它误称为剔除所有一次性因素的“核心利润”。2023年报将Pilot及Non-controlled businesses单列，桥接见对账。',F['note'])
# capital
c=sheet('资本','浮存金、现金与每股账面价值','期末存量与期间回购分区列示；合并现金口径含铁路能源，不扣国债未结算应付款。');banner(c)
capital=[(6,'float','保险浮存金（约数）','float'),(8,'cash_ins','现金及等价物：保险及其他','balance'),(9,'cash_rail','现金及等价物：铁路能源','balance'),(11,'bills','单列短期美国国债','balance'),(15,'equity','归属伯克希尔股东权益','balance'),(16,'A','期末A股数量','shares'),(17,'B','期末B股数量','shares'),(23,'buyback','回购入账金额（期间数）','buyback'),(24,'buyback_cash','回购现金支付（期间数）','cf')]
for r,k,l,kind in capital:
 put(c,r,1,l,'label')
 for j,y in enumerate(D['periods']):put(c,r,j+2,D[k][j],src=('补充来源 E1：2022ar.pdf｜Consolidated Balance Sheets，K-70，2021比较列' if k=='bills' and y=='2021' else source(y,kind)),note='浮存金为约数，年末176,000采用年报；2026季报称增加约1,100，不能与粗粒度年末数精确相减。' if k=='float' else '')
for r,l in [(10,'合并现金及现金等价物'),(12,'现金＋单列短期国债'),(18,'期末等值A股数量（精确换算）'),(19,'每股账面价值 A（美元）'),(20,'每股账面价值 B（美元）'),(25,'回购入账减现金支付')]:
 put(c,r,1,l,'label')
 for j in range(7):
  C=cell(0,j+1)[:-1];e=D['A'][j]+D['B'][j]/1500
  forms={10:(f'{C}8+{C}9',D['cash_ins'][j]+D['cash_rail'][j]),12:(f'{C}10+{C}11',D['cash_ins'][j]+D['cash_rail'][j]+D['bills'][j]),18:(f'{C}16+{C}17/1500',e),19:(f'{C}15*1000000/{C}18',D['equity'][j]*1e6/e),20:(f'{C}19/1500',D['equity'][j]*1e6/e/1500),25:(f'{C}23-{C}24',D['buyback'][j]-D['buyback_cash'][j])}
  f,val=forms[r];formula(c,r,j+2,'='+f,val,'decimal' if r in (18,19,20) else 'formula')
c.merge_range('A27:I28','2026H1回购：权益变动表4,762；现金流量表4,444，差318。两表记录基础不同，本模型保留差额，不在没有明细时把它全部断言为某一种结算差异。期末等值A股由两类股精确换算，与公告四舍五入后的1,431,693股略有差别。',F['note'])
# portfolio
q=sheet('股票组合','股票组合：从消费品转向更广的行业','Note 4 权益证券公允价值；百万美元。行业分类不是各只股票的交易归因，市值变化同时受交易与估值影响。');banner(q)
for r,k,l in [(6,'bank','银行、保险与金融'),(7,'consumer','消费品'),(8,'industry','商业、工业及其他'),(10,'equity_portfolio','披露权益证券总额')]:
 put(q,r,1,l,'label')
 for j,y in enumerate(D['periods']):put(q,r,j+2,D[k][j],src=source(y,'portfolio'))
for r,l in [(9,'三类公允价值合计'),(11,'分类对账差（应为0）'),(14,'银行、保险与金融占比'),(15,'消费品占比'),(16,'商业、工业及其他占比')]:
 put(q,r,1,l,'label')
 for j in range(7):
  C=cell(0,j+1)[:-1];total=D['equity_portfolio'][j]
  if r==9:f=f'SUM({C}6:{C}8)';val=total
  elif r==11:f=f'{C}9-{C}10';val=0
  else:f=f'{C}{r-8}/{C}9';val=D[['bank','consumer','industry'][r-14]][j]/total
  formula(q,r,j+2,'='+f,val,'pct' if r>11 else 'formula')
q.merge_range('A18:I20','排除权益法：Kraft Heinz、Occidental普通股等权益法投资不在本行业表内。2022年Occidental普通股转入权益法，使行业组合跨年可比性受到影响。2026H1商业工业类市值增加不等同于全部来自新买入，不能用市值变化代替现金流。',F['note'])
# legal segment
z=sheet('法定分部','法定分部利润：保留业务颗粒度','税前利润、百万美元；2021–22来自2023年报Note 26，2023–25来自2025年报Note 26，半年来自2026Q2 Note 24。');banner(z)
segkeys=['pretax_underwriting','pretax_insurance_income','pretax_rail','pretax_energy','pretax_manufacturing','pretax_services','pretax_mclane','pretax_pilot']
for r,k,l in zip(range(6,14),segkeys,['保险承保','保险投资收益','BNSF','BHE','制造','服务和零售','McLane','Pilot']):
 put(z,r,1,l,'label')
 for j,y in enumerate(D['periods']):put(z,r,j+2,D[k][j],src=source(y,'segment'),note='2021–2022未并表Pilot，0为合并分部无该金额，其权益法收益在其他。' if k=='pretax_pilot' else '')
put(z,14,1,'经营分部税前合计','label')
for j in range(7):formula(z,14,j+2,f'=SUM({cell(5,j+1)}:{cell(12,j+1)})',sum(D[k][j] for k in segkeys))
z.merge_range('A16:I18','BHE税前利润不能直接与主表税后归属股东利润比较：生产税收抵免可形成所得税收益，且存在少数股东权益。制造服务零售主表聚合了制造、服务零售、McLane及Pilot，并作税项和归属处理。',F['note'])
# Cashflow
cf=sheet('现金流','资金用途：把交易与市值变化分开','期间现金流；购入、资本支出、收购和回购使用正数表示资金用途。百万美元。');banner(cf)
for r,k,l in [(6,'operating_cash','经营现金净流入'),(7,'capex','资本支出（含租赁设备）'),(9,'equity_buy','购入权益证券'),(10,'equity_sell','出售权益证券所得'),(12,'acquisition','企业收购净支付')]:
 put(cf,r,1,l,'label')
 for j,y in enumerate(D['periods']):put(cf,r,j+2,D[k][j],src=source(y,'cf'))
for r,l in [(8,'经营现金流减资本支出'),(11,'权益证券净买入（负数为净卖出）'),(13,'回购现金支付')]:
 put(cf,r,1,l,'label')
 for j in range(7):
  C=cell(0,j+1)[:-1];f,val={8:(f'{C}6-{C}7',D['operating_cash'][j]-D['capex'][j]),11:(f'{C}9-{C}10',D['equity_buy'][j]-D['equity_sell'][j]),13:(f"'资本'!{C}24",D['buyback_cash'][j])}[r];formula(cf,r,j+2,'='+f,val)
cf.merge_range('A15:I17','经营现金流减资本支出只是简化的现金余量，不等于可全部分配的自由现金流；尚有保险赔付准备、债务和监管约束。权益证券净买入不含权益法投资与企业收购，亦不能解释全部股票公允价值变化。',F['note'])
# reconciliation and explanations
b=sheet('对账','口径桥接与增长归因','所有相加、扣除和贡献度均用公式；观察性调整不是预测，也不是公司披露的新经营指标。')
b.write_row('A5',['2023年报旧口径 / 百万美元','2021','2022'],F['head'])
for r,lab,vals in [(6,'原其他',[434,509]),(7,'原非控制业务',[804,1528])]:
 put(b,r,1,lab,'label')
 for j,x in enumerate(vals):put(b,r,j+2,x,src='补充来源 E2：2023ar.pdf｜Item 7 Results of Operations，K-35')
# row 8 not 7: main references repaired below
put(b,8,1,'重分类后其他','label')
for j in range(2):formula(b,8,j+2,f'=SUM({cell(5,j+1)}:{cell(6,j+1)})',D['other'][j])
# overwrite earlier main references
for j in range(2):
 audit[:]=[a for a in audit if not(a['sheet']=='利润' and a['cell']==cell(10,j+1))]
 formula(p,11,j+2,f"='对账'!{cell(7,j+1)}",D['other'][j])
put(b,10,1,'2023原制造服务零售','label');put(b,10,2,12759,src='E2：2023ar.pdf｜Item 7 Results of Operations，K-35')
put(b,11,1,'2023原Pilot','label');put(b,11,2,603,src='E2：2023ar.pdf｜Item 7 Results of Operations，K-35')
put(b,12,1,'合并后制造服务零售','label');formula(b,12,2,'=B10+B11',13362)
b.write_row('A15',['2026H1增长拆解','2025H1','2026H1','差额 / 贡献'],F['head'])
for col,idx in [(2,5),(3,6)]:
 C=cell(0,idx+1)[:-1];formula(b,16,col,f"='利润'!{C}12",ops[idx]);formula(b,20,col,f"='利润'!{C}6",D['underwriting'][idx])
 put(b,17,col,[-1590,575][idx-5],src='材料/Berkshire_2026Q2季报__brka-20260630.htm｜Item 2 Other，p47，税后外币债务汇兑')
 formula(b,18,col,f'={cell(15,col-1)}-{cell(16,col-1)}',ops[idx]-[-1590,575][idx-5])
 put(b,21,col,[850,0][idx-5],src='材料/Berkshire_2026Q2季报__brka-20260630.htm｜Item 2 Results of Operations，p33，税后重大灾害损失')
 formula(b,22,col,f'={cell(19,col-1)}+{cell(20,col-1)}',D['underwriting'][idx]+[850,0][idx-5])
for r,l in [(16,'经营分项合计'),(17,'其中：债务汇兑损益'),(18,'扣除上述汇兑后的经营分项'),(20,'披露承保利润'),(21,'加回当期重大灾害损失'),(22,'仅剔除重大灾害的观察数')]:put(b,r,1,l,'label')
formula(b,16,4,'=C16-B16',ops[6]-ops[5]);formula(b,17,4,'=(C17-B17)/D16',2165/3528,'pct');formula(b,18,4,'=C18/B18-1',(24329-575)/(20801+1590)-1,'pct');formula(b,22,4,'=C22-B22',-730)
b.merge_range('A24:I25','汇兑贡献＝汇兑损益变化÷经营分项增量。只剔除汇兑后的增幅约6.1%，不代表有机增长率；灾害观察数未调整准备金变化、业务组合或其他影响，不能当成正常化利润。',F['note'])
put(b,28,1,'2025年末保险及其他净现金口径','label');put(b,28,2,369000,src='材料/Berkshire_2025年报__brka-20251231.htm｜Item 7 Financial Condition，净未结算国债应付款；约数')
put(b,29,1,'2026H1保险及其他净现金口径','label');put(b,29,2,359200,src='材料/Berkshire_2026Q2季报__brka-20260630.htm｜Item 2 Financial Condition，p48；约数')
put(b,30,1,'2026H1浮存金披露增量','label');put(b,30,2,1100,src='材料/Berkshire_2026Q2季报__brka-20260630.htm｜Item 2 Insurance—Investment Income，p38；约数')
b.merge_range('A32:I34','主表2025浮存金176,000为粗粒度披露。177,500−176,000＝1,500仅是两期约数差；季报披露实际增量约1,100。由177,500−1,100反推176,400只是近似推导，模型不把它替换为披露年末数。',F['note'])
# assumptions
h=sheet('假设','一个可调的假设：短期利率敏感性','浅橙格可修改；这里只展示静态机械敏感性，所有披露事实保持独立。不是盈利预测。')
for r,l,val in [(6,'假设：短期收益率变动',-0.01),(7,'假设：适用现金与国债比例',0.8),(8,'假设：边际税率',0.21),(9,'假设：年内作用时间比例',0.5)]:
 put(h,r,1,l,'label');put(h,r,2,val,'assume',src='分析者假设，非公司披露');h.data_validation(r-1,1,r-1,1,{'validate':'decimal','criteria':'between','minimum':-0.1 if r==6 else 0,'maximum':0.1 if r==6 else 1})
put(h,11,1,'2026H1现金＋国债（百万美元）','label');formula(h,11,2,"='资本'!H12",365514)
put(h,12,1,'假设：税前利息变化','label');formula(h,12,2,'=B11*B6*B7*B9',365514*-.01*.8*.5)
put(h,13,1,'假设：税后利息变化','label');formula(h,13,2,'=B12*(1-B8)',365514*-.01*.8*.5*.79)
put(h,14,1,'占披露2026H1经营分项合计','label');formula(h,14,2,"=B13/'利润'!H12",365514*-.01*.8*.5*.79/24329,'pct')
h.merge_range('A17:I20','假设将6月末余额视作固定基数，80%资金同步重定价，利率下降100基点，持续半年，税率21%。忽略资金流、资产负债期限结构、海外税差、收入归属变化与管理层应对。调整B6–B9后，B12–B14与「变化」的敏感性显示自动更新。',F['text'])
# Change detail
m=sheet('变化明细','同比、期末变化、占比：完整公式清单','同比基数≤0时显示“不适用”，另给绝对变动；2021缺2020可比基期，不强行填0%。2026H1与2025H1同口径比较。')
heads=['指标','2022同比','2023同比','2024同比','2025同比','2026H1同比','H1同比绝对变化','较2025年末变化','2026H1占比 / 分母']
for j,x in enumerate(heads):m.write(4,j,x,F['head'])
m.set_column('I:I',25);m.set_column('J:J',35);m.write('J5','占比分母 / 说明',F['head'])
metrics=[('利润',r,labels[r-6],12,'经营分项合计') for r in range(6,12)]+[('利润',12,'经营分项合计',None,''),('利润',17,'归母净利润',None,'')]+[('资本',r,l,12 if r in (8,9,10,11) else None,'现金＋国债' if r in (8,9,10,11) else '') for r,l in [(6,'浮存金（约数）'),(8,'保险及其他现金'),(9,'铁路能源现金'),(10,'合并现金及等价物'),(11,'单列短期国债'),(12,'现金＋国债'),(15,'股东权益'),(18,'期末等值A股数'),(19,'每股账面价值A'),(20,'每股账面价值B'),(23,'回购入账额'),(24,'回购现金支付')]]+[('股票组合',r,l,9,'权益证券组合') for r,l in [(6,'银行保险金融'),(7,'消费品'),(8,'商业工业及其他')]]+[('股票组合',9,'权益证券总额',None,'')]+[('现金流',r,l,None,'') for r,l in [(6,'经营现金流'),(7,'资本支出'),(8,'经营现金流减资本支出'),(9,'买入权益证券'),(10,'出售权益证券'),(11,'净买入权益证券'),(12,'企业收购净支付')]]
for row,(sh,rr,l,den,dennote) in enumerate(metrics,6):
 put(m,row,1,l,'label')
 for outcol,curr,prior in [(2,'C','B'),(3,'D','C'),(4,'E','D'),(5,'F','E'),(6,'H','G')]:
  x=cache[(sh,f'{curr}{rr}')];base=cache[(sh,f'{prior}{rr}')]
  formula(m,row,outcol,f'=IF(\'{sh}\'!{prior}{rr}>0,\'{sh}\'!{curr}{rr}/\'{sh}\'!{prior}{rr}-1,"不适用")',x/base-1 if base>0 else '不适用','pct')
 formula(m,row,7,f"='{sh}'!H{rr}-'{sh}'!G{rr}",cache[(sh,f'H{rr}')]-cache[(sh,f'G{rr}')])
 isstock=(sh in ('资本','股票组合') and rr not in (23,24))
 if isstock:formula(m,row,8,f"='{sh}'!H{rr}/'{sh}'!F{rr}-1",cache[(sh,f'H{rr}')]/cache[(sh,f'F{rr}')]-1,'pct')
 else:put(m,row,8,'期间数不比较','note')
 if den:formula(m,row,9,f"='{sh}'!H{rr}/'{sh}'!H{den}",cache[(sh,f'H{rr}')]/cache[(sh,f'H{den}')],'pct')
 else:put(m,row,9,'—','note')
 put(m,row,10,dennote,'note')
m.conditional_format(5,1,5+len(metrics),5,{'type':'3_color_scale','min_color':'#F5C8A8','mid_color':'#FFFFFF','max_color':'#9AD8C9'});m.autofilter(4,0,4+len(metrics),9)
# one-page dashboard
v.set_column('A:A',23);v.set_column('B:I',12);v.set_default_row(22);v.set_landscape();v.set_paper(8);v.fit_to_pages(1,1);v.print_area('A1:I51');v.set_margins(.25,.25,.3,.3)
v.merge_range('A5:C5','经营分项合计同比',F['head']);v.merge_range('D5:F5','现金＋国债 / 十亿美元',F['head']);v.merge_range('G5:I5','税后敏感性 / 百万美元',F['head'])
v.merge_range('A6:C7','',F['key']);formula(v,6,1,"='利润'!H12/'利润'!G12-1",24329/20801-1,'key')
v.merge_range('D6:F7','',F['big']);formula(v,6,4,"='资本'!H12/1000",365.514,'big')
v.merge_range('G6:I7','',F['big']);formula(v,6,7,"='假设'!B13",365514*-.01*.8*.5*.79,'big')
v.merge_range('A8:C8','2026H1：24,329 百万美元',F['note']);v.merge_range('D8:F8','合并口径；较2025年末下降约2.1%',F['note']);v.merge_range('G8:I8','假设利率−100bp；详见假设页',F['note'])
v.write_row('A10',['业务','2025H1','2026H1','变化','同比','H1占比','增量贡献',''],F['head'])
for r,pr,lab in zip(range(11,17),range(6,12),['保险承保','保险投资收益','BNSF','BHE','制造服务零售','其他']):
 put(v,r,1,lab,'small');old=cache[('利润',f'G{pr}')];new=cache[('利润',f'H{pr}')]
 for col,f,val,fmt in [(2,f"'利润'!G{pr}",old,'formula'),(3,f"'利润'!H{pr}",new,'formula'),(4,f'C{r}-B{r}',new-old,'formula'),(5,f'C{r}/B{r}-1',new/old-1,'pct'),(6,f"C{r}/'利润'!H12",new/24329,'pct'),(7,f"D{r}/('利润'!H12-'利润'!G12)",(new-old)/3528,'pct')]:formula(v,r,col,'='+f,val,fmt)
v.merge_range('H11:I16','其他增长含汇兑反转；其增量贡献不代表业务自然增长。',F['note'])
v.merge_range('A18:I19','读法：汇兑变化贡献经营增量约61.4%；仅剔除该汇兑影响后经营分项增幅约6.1%。现金口径、浮存金约数与回购差额见资本/对账；完整同比及组合占比见变化明细。',F['note'])
# chart helper
chart=W.add_chart({'type':'column'})
chart.add_series({'name':'2025H1','categories':"='变化'!$A$11:$A$16",'values':"='变化'!$B$11:$B$16",'fill':{'color':'#A8CFCB'},'border':{'none':True}})
chart.add_series({'name':'2026H1','categories':"='变化'!$A$11:$A$16",'values':"='变化'!$C$11:$C$16",'fill':{'color':teal},'border':{'none':True}})
chart.set_title({'name':'业务利润｜百万美元'});chart.set_y_axis({'major_gridlines':{'visible':True,'line':{'color':'#EAF0EF'}}});chart.set_x_axis({'num_font':{'size':8}});chart.set_legend({'position':'bottom'});chart.set_size({'width':500,'height':270});chart.set_chartarea({'border':{'none':True}});v.insert_chart('A21',chart)
chart2=W.add_chart({'type':'doughnut'})
chart2.add_series({'name':'组合','categories':"='股票组合'!$A$6:$A$8",'values':"='股票组合'!$H$6:$H$8",'points':[{'fill':{'color':teal}},{'fill':{'color':'#EDB95F'}},{'fill':{'color':'#437DAB'}}],'data_labels':{'percentage':True}});chart2.set_title({'name':'2026H1 权益证券组合'});chart2.set_hole_size(65);chart2.set_legend({'position':'bottom'});chart2.set_size({'width':345,'height':270});chart2.set_chartarea({'border':{'none':True}});v.insert_chart('F21',chart2)
ch3=W.add_chart({'type':'line'})
for row,title,color in [(12,'现金＋短期国债',teal),(6,'浮存金（约数）','#EDB95F')]:
 ch3.add_series({'name':title,'categories':"='资本'!$B$5:$F$5",'values':f"='资本'!$B${row}:$F${row}",'line':{'color':color,'width':2.5},'marker':{'type':'circle','size':5}})
ch3.set_title({'name':'2021–2025 年末资金｜百万美元'});ch3.set_legend({'position':'bottom'});ch3.set_size({'width':500,'height':270});ch3.set_chartarea({'border':{'none':True}});v.insert_chart('A35',ch3)
ch4=W.add_chart({'type':'column'});ch4.add_series({'name':'回购入账额','categories':"='资本'!$B$5:$H$5",'values':"='资本'!$B$23:$H$23",'fill':{'color':'#EDB95F'},'border':{'none':True}});ch4.set_title({'name':'回购｜全年与半年分列，百万美元'});ch4.set_legend({'none':True});ch4.set_size({'width':345,'height':270});ch4.set_chartarea({'border':{'none':True}});v.insert_chart('F35',ch4)
v.merge_range('A49:I51','事实：股票净买入11,625，较2025H1净卖出4,500发生方向变化；企业收购净支付9,704。OxyChem协议签于2025年、交割于2026年，不宜全部归因于新任CEO。研究截至所给2026Q2报告；不构成投资建议。',F['note'])
# source registry
s=sheet('来源','资料谱系与可比性','本地材料优先；补充网页的访问日期均为2026-10-22。URL是纯文本来源，不产生外部数据连接。')
entries=[('L1','材料/Berkshire_2025年报__brka-20251231.htm','2023–2025税后/税前利润、2024–2025期末余额、2023–2025现金流；以文件披露为准。'),('L2','材料/Berkshire_2026Q2季报__brka-20260630.htm','2026H1及2025H1损益/现金流；2026期末余额、企业收购及期后事项。'),('L3','材料/Berkshire_2026Q2业绩公告__d159922dex991.htm','交叉核对经营利润24,329、回购约4,800、浮存金177,500及等值A股数。'),('E1','https://www.berkshirehathaway.com/2022ar/2022ar.pdf','2021年末权益证券行业公允价值。访问日2026-10-22；其他历史数字优先采用后续重述。'),('E2','https://www.berkshirehathaway.com/2023ar/2023ar.pdf','2021–2022重述后利润/权益、2021–2023股数及现金流、2022–2023组合。访问日2026-10-22。'),('E3','https://www.berkshirehathaway.com/qtrly/2ndqtr25.pdf','2025H1期末现金、短期国债、权益证券行业、浮存金、股数。访问日2026-10-22。'),('L4','材料/股东信/2022ltr.pdf','2021/2022浮存金约147/164十亿美元。'),('L5','材料/股东信/2025ltr.pdf','交接语境；署名Gregory E. Abel。未用于巴菲特游戏引文。')]
for r,(a,b_,c_) in enumerate(entries,5):s.write(r,0,a,F['head']);s.merge_range(r,1,r,4,b_,F['text']);s.merge_range(r,5,r,8,c_,F['text']);s.set_row(r,65)
s.merge_range('A15:I17','未独立审计或验证所给2025/2026材料的真实性，研究按材料内部披露构建。未把网页更新后的数字覆盖用户材料。原始材料存在部分早年HTML不可读的情况，游戏仅采用已能逐字核验的文件。',F['note'])
# historical content
s=sheet('历史决策','十次决定｜游戏与账本共用档案','年份为决定发生年，股东信年份可能是事后回顾；匹配度每题10分，只表示与实际选择一致，不表示优劣。')
s.set_column('A:A',10);s.set_column('B:B',28);s.set_column('C:C',60);s.set_column('D:D',80);s.set_column('E:E',65)
s.write_row('A5',['决定年份','题目','实际决定','原文（每处不超过两句）','来源'],F['head'])
for r,g in enumerate(G,5):
 s.write_row(r,0,[g['year'],g['title'],g['actual'],g['quote'],g['source']],F['text']);s.set_row(r,130)
# Quote figures mirrored explicitly
s.write_row('A18',['历史数值','指标','数值','单位 / 注意'],F['head'])
hist=[(1972,'See’s收购价',25,'百万美元'),(1972,'See’s当时销售额',30,'百万美元'),(1972,'See’s当时税前利润上限',5,'百万美元；原文为小于，不是等于'),(1983,'收购NFM比例',0.9,'比例'),(1983,'家族保留比例',0.1,'比例；另有10%期权安排'),(1994,'Coca-Cola累计成本',1300,'百万美元'),(1994,'Coca-Cola股数（2022回顾口径）',400000000,'股；不可当作1994年未复权实际股数'),(1995,'GEICO最终持有比例',1,'比例；1996年初完成'),(1995,'GEICO承保车辆约数',3700000,'辆'),(1998,'General Re交易额',22000,'百万美元'),(2011,'回购账面价值上限',1.1,'倍；仅为当年历史规则'),(2011,'实际回购金额',67,'百万美元')]
for r,x in enumerate(hist,18):
 s.write_row(r,0,x,F['input']);g=next(g for g in G if g['year']==x[0]);put(s,r+1,3,x[2],fmt='input_pct' if x[3].startswith('比例') else 'input_decimal' if x[3].startswith('倍') else 'input',src=g['source'],note=x[3]);s.write(r,4,g['source'],F['note']);s.set_row(r,42)
# line-by-line data index
s=W.add_worksheet('取数索引');s.hide_gridlines(2);s.freeze_panes(1,0);s.set_column('A:A',22);s.set_column('B:B',20);s.set_column('C:C',110);s.set_column('D:D',65);s.write_row(0,0,['工作表单元格','披露值 / 假设值','文件名 + 章节 / 补充来源ID','口径说明'],F['head'])
for r,x in enumerate(sources,1):s.write_row(r,0,x,F['text']);s.set_row(r,45)
s.autofilter(0,0,len(sources),3)
for name,s in S.items():
 if name!='变化':s.set_landscape();s.fit_to_pages(1,0)
 s.set_footer('&L伯克希尔账本 · 研究展示&C不构成投资建议&R第 &P 页')
W.close()
Path('交付/工作底稿/formula_manifest.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2))
Path('交付/工作底稿/source_index.json').write_text(json.dumps(sources,ensure_ascii=False,indent=2))
print('Workbook created:',len(audit),'formulas;',len(sources),'sourced inputs')
