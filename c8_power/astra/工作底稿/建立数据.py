from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[1]
S={}
def source(k,name,date,loc,note=''):
 S[k]=dict(id=k,name=name,date=date,location=loc,access='2026-10-22',note=note)
source('F1','Meta 2026Q3 Form 10-Q','2026-10-21','材料/Meta_2026Q3季报__meta-20260930.htm','日期采用文件签署日；财务数字完全按用户提供原件，未另行验证其与在线申报的同一性。')
source('F2','Constellation 2025 Form 10-K','2026-02-24','材料/Constellation_2025年报__ceg-20251231.htm','日期采用文件签署日；CEG Parent 合并口径。')
source('F3','Constellation 2026Q2 Form 10-Q','2026-08-06','材料/Constellation_2026Q2季报__ceg-20260630.htm','日期采用文件签署日；2026年已并表Calpine，不能将全部增长归于AI。')
source('S1','IEA · Energy and AI / Demand & Executive summary','2025-04-10','https://www.iea.org/reports/energy-and-ai')
source('S2','IEA · Energy and AI / Supply','2025-04-10','https://www.iea.org/reports/energy-and-ai/energy-supply-for-ai')
source('S3','IEA · Key Questions on Energy and AI','2026-04-16','https://www.iea.org/reports/key-questions-on-energy-and-ai/executive-summary','最新总量采用此版本；不得与2025版发电量不加调整混用。')
source('S4','Alphabet · 2026Q2 earnings release','2026-07-22','https://www.sec.gov/Archives/edgar/data/1652044/000165204426000066/googexhibit991q22026.htm')
source('S5','Microsoft · FY2026Q4 earnings release','2026-07-29','https://www.microsoft.com/en-us/investor/earnings/fy-2026-q4/press-release-webcast')
source('S6','Amazon · 2026Q2 earnings release','2026-07-30','https://www.aboutamazon.com/news/company-news/amazon-earnings-q2-2026-report')
source('S7','Constellation · Meta / Clinton PPA','2025-06-03','https://investors.constellationenergy.com/news-releases/news-release-details/constellation-meta-sign-20-year-deal-clean-reliable-nuclear')
source('S8','Talen · Amazon PPA expansion','2025-06-11','https://ir.talenenergy.com/news-releases/news-release-details/talen-energy-expands-nuclear-energy-relationship-amazon')
source('S9','CFS · Series B2 funding','2025-08-28','https://www.cfs.energy/news-and-media/commonwealth-fusion-systems-raises-863-million-series-b2-round-to-accelerate-the-commercialization-of-fusion-energy/')
source('S10','CFS · Google power agreement','2025-06-30','https://www.cfs.energy/news-and-media/google-and-commonwealth-fusion-systems-sign-strategic-partnership/')
source('S11','Helion · Series G funding','2026-06-04；更新2026-09（日未披露）','https://www.helionenergy.com/newsroom/helion-raises-465-million-series-g-funding-round-to-meet-surging-global-demand-for-power','原公告465百万美元；网页新增注释说明2026年9月最终关闭为500百万美元。')
source('S12','Helion · Microsoft fusion PPA','2023-05-10','https://www.helionenergy.com/newsroom/helion-announces-worlds-first-fusion-ppa-with-microsoft')
source('S13','TAE · latest equity funding','2025-06-02','https://tae.com/tae-technologies-raises-150-million-in-latest-funding-round/')
source('S14','TMTG / TAE · proposed merger update','2026-09-30','https://www.sec.gov/Archives/edgar/data/1849635/000143774926031535/ex_1020869.htm','用于说明交易进度；不是完成融资或商业发电证明。')
source('S15','Type One Energy · Series B','2026-10-06','https://typeoneenergy.com/insights-announcements/type-one-energy-completes-200m-series-b-financing/')
source('S16','Type One Energy · UK Infinity consortium','2026-05-06','https://typeoneenergy.com/insights-announcements/uk-infinity-fusion-consortium/','商业运行2034年为公司目标。')
source('S17','IRENA · Renewable Power Generation Costs in 2024','2025-07-22','https://www.irena.org/News/pressreleases/2025/Jul/91-Percent-of-New-Renewable-Projects-Now-Cheaper-Than-Fossil-Fuels-Alternatives')
source('S18','ITER · The tokamak / components','未标注发布日期','https://www.iter.org/components','仅用于部件原理；网页为概念化D-T托卡马克，不是ITER或ARC工程复刻。')
source('S19','ITER · Blanket','未标注发布日期','https://www.iter.org/machine/blanket','ITER屏蔽包层与未来商业增殖包层应区分；本图显示商业D-T概念。')
R=[]
def row(id,cat,item,period,value,unit,status,src,section,note=''):
 s=S[src];R.append(dict(id=id,category=cat,item=item,period=period,value=value,unit=unit,status=status,source_id=src,source=s['name'],date=s['date'],access=s['access'],location=s['location']+' | '+section,note=note))
row('D01','用电','全球数据中心终端用电','2024',415,'TWh','IEA估计','S1','Global outlook','不是AI独占；不含加密货币挖矿；包含设施用电。')
row('D02','用电','全球数据中心终端用电','2030',945,'TWh','IEA预测·旧版','S1','Base Case','2025版预测，保留用于版本比较。')
row('D03','用电','全球数据中心终端用电','2025',485,'TWh','IEA估计','S3','Updated demand outlook','使用摘要约数；最新完整年度估计。')
row('D04','用电','全球数据中心终端用电','2030',950,'TWh','IEA预测·新版','S3','Updated demand outlook','使用摘要约数；基准预测不是确定结果。')
row('D05','用电','全球电力消费占比','2024',.015,'%','IEA估计','S1','Global outlook')
row('D06','用电','全球电力消费占比','2030',.03,'%','IEA预测·新版','S3','Updated demand outlook','约3%。')
row('D07','用电','数据中心用电同比增长','2025',.17,'%','IEA估计','S3','Energy consumption')
row('D08','用电','AI-focused数据中心用电同比增长','2025',.50,'%','IEA估计','S3','Energy consumption','AI-focused分类不等于逐任务计量。')
row('D09','用电','AI-focused用电增长倍数','2025—2030',3,'倍','IEA预测','S3','Updated demand outlook')
row('D10','供电','服务数据中心的发电量','2024',460,'TWh','IEA估计','S2','Global supply','发电端；与415终端用电存在系统损耗等口径差异，不能相加。')
for id,item,v in [('D11','煤电',.30),('D12','燃气',.26),('D13','核裂变',.15),('D14','可再生能源',.27)]:
 row(id,'供电结构',item,'2024',v,'%','IEA约数','S2','Global electricity supply','物理供电来源而非合同或绿证结构；本文将比例用于终端用电分摊示意。')
row('D15','区域','美国在全球数据中心用电中的份额','2024',.45,'%','IEA约数','S1','Executive summary / Data centres electricity consumption')
row('D16','瓶颈','现场燃气发电相对负荷超配下限','2030前',.30,'%','IEA分析','S3','Onsite natural gas')
row('D17','瓶颈','现场燃气发电相对负荷超配上限','2030前',.70,'%','IEA分析','S3','Onsite natural gas')
# Financial values in USD million; keep signs positive for outlays.
for id,item,period,v,sec,note in [
 ('M01','购建固定资产现金支出','2026前九个月',83055,'现金流量表 p.10','正值列示支出；非完整Capex。'),
 ('M02','融资租赁本金支付','2026前九个月',2769,'现金流量表 p.10','与购建固定资产相加可得含租赁本金Capex。'),
 ('M03','购建固定资产现金支出','2025前九个月',48308,'现金流量表 p.10','同期比较。'),
 ('M04','融资租赁本金支付','2025前九个月',1770,'现金流量表 p.10','同期比较。'),
 ('M05','资本开支（含租赁本金）','2026Q3',34910,'MD&A / Executive Overview','公司四舍五入至0.01十亿美元。'),
 ('M06','全年资本开支指引下限','2026',135000,'MD&A / Liquidity and Capital Resources','管理层指引，不是实际。'),
 ('M07','全年资本开支指引上限','2026',145000,'MD&A / Liquidity and Capital Resources','管理层指引，不是实际。'),
 ('M08','经营活动现金流','2026前九个月',96873,'现金流量表 p.10','合并口径。'),
 ('M09','在建工程','2026-09-30',89499,'Note 6 / Property and Equipment','主要为数据中心、服务器和网络基础设施；并非已通电容量。'),
 ('M10','在建工程','2025-12-31',50521,'Note 6 / Property and Equipment','期末存量。'),
 ('M11','服务器与网络资产原值','2026-09-30',133626,'Note 6 / Property and Equipment','未扣累计折旧。'),
 ('M12','服务器与网络资产原值','2025-12-31',98040,'Note 6 / Property and Equipment','未扣累计折旧。'),
 ('M13','资本开支中现金流表购建资产与租赁本金合计（披露约数）','2026前九个月',85820,'MD&A / Liquidity and Capital Resources','用于与85824精确求和核对；差额为披露四舍五入。'),
 ('M14','营收','2026前九个月',181712,'利润表 p.7','并非AI收入。'),
 ('M15','Louisiana Venture预计总开发成本','项目全周期',27000,'Note 5 / Data Center Ventures pp.17–18','合资项目全部成本，不等于Meta当期现金流。'),
 ('M16','Texas Venture预计总开发成本','项目全周期',14000,'Note 5 / Data Center Ventures pp.17–18','不可直接与Capex相加。')]:
 row(id,'Meta',item,period,v,'百万美元','公司指引' if id in ['M06','M07','M15','M16'] else '文件披露','F1',sec,note)
row('M17','Meta','两个数据中心合资项目各自持股比例','2026-09-30',.20,'%','文件披露','F1','Note 5 / Data Center Ventures','不代表最大风险敞口；另有租约等义务。')
for id,item,period,v,src,sec,note in [
 ('T01','Alphabet购建固定资产','2026Q2',44924,'S4','Consolidated Statements of Cash Flows','现金支出；不含非现金融资租赁新增。'),
 ('T02','Alphabet购建固定资产','2026H1',80598,'S4','Consolidated Statements of Cash Flows','全公司口径。'),
 ('T03','Microsoft购建固定资产','FY2026Q4 / 2026Q2',35802,'S5','Cash Flows / Additions to property and equipment','现金口径；不同于管理层含融资租赁口径。'),
 ('T04','Microsoft购建固定资产','FY2026截至2026-06-30',115948,'S5','Cash Flows','财年并非自然年。'),
 ('T05','Amazon经营活动现金流','TTM截至2026-06-30',161400,'S6','Financial highlights','摘要约数。'),
 ('T06','Amazon自由现金流','TTM截至2026-06-30',-7600,'S6','Financial highlights','负值为流出；摘要约数。')]:
 row(id,'美国科技巨头',item,period,v,'百万美元','公司披露',src,sec,note)
for id,item,period,v,src,sec,unit,note in [
 ('C01','营收','2025',25533,'F2','MD&A / Operating revenues','百万美元','CEG Parent合并；非AI单独收入。'),
 ('C02','资本开支','2025',2949,'F2','CEG Parent Consolidated Statements of Cash Flows','百万美元','现金支出。'),
 ('C03','经营活动现金流','2025',4237,'F2','CEG Parent Consolidated Statements of Cash Flows','百万美元','营运资金波动会影响现金流。'),
 ('C04','核电发电量','2025',182690,'F2','MD&A / Sales and Supply Sources p.65','GWh','按持有比例，含非自营Salem及STP。'),
 ('C05','自营核电容量因子','2025',.947,'F2','MD&A / Nuclear Fleet Capacity Factor p.66','%','按持有比例，排除Salem和STP。'),
 ('C06','营收','2026H1',18626,'F3','CEG Parent Statements of Operations','百万美元','包含2026-01-07后Calpine业绩。'),
 ('C07','营收','2025H1',12889,'F3','CEG Parent Statements of Operations','百万美元','未并表Calpine。'),
 ('C08','资本开支','2026H1',2521,'F3','CEG Parent Statements of Cash Flows','百万美元','含Crane重启、Calpine和共址基础设施投入。'),
 ('C09','资本开支','2025H1',1573,'F3','CEG Parent Statements of Cash Flows','百万美元','同期比较。'),
 ('C10','核电发电量','2026H1',88827,'F3','MD&A / Sales and Supply Sources','GWh','按持有比例；同比基数90753。'),
 ('C11','核电发电量','2025H1',90753,'F3','MD&A / Sales and Supply Sources','GWh','同期比较。'),
 ('C12','自营核电容量因子','2026H1',.927,'F3','MD&A / Nuclear Fleet Capacity Factor','%','排除Salem和STP。'),
 ('C13','自营核电容量因子','2025H1',.945,'F3','MD&A / Nuclear Fleet Capacity Factor','%','同口径比较。'),
 ('C14','Crane重启后预计容量','重启后',835,'F2','Item 1 / Nuclear Facilities','MW','披露约数；并非现时可用容量。'),
 ('C15','Crane–Microsoft PPA期限','2024签署',20,'F2','Item 1 / Nuclear Facilities','年','能源、容量及无排放属性；不代表现场直连。')]:
 row(id,'Constellation',item,period,v,unit,'文件披露',src,sec,note)
for id,cat,item,period,v,unit,status,src,note in [
 ('P01','核电协议','Clinton–Meta容量','2027-06开始',1121,'MW','协议披露','S7','包含增容；主要是存量核电保留。Meta购买清洁能源属性，电力继续流入当地电网。'),
 ('P02','核电协议','Clinton–Meta期限','2027起',20,'年','协议披露','S7','长期承购支持换证和继续运行。'),
 ('P03','核电协议','Clinton增容','未来',30,'MW','公司计划','S7','不是新增1121MW。'),
 ('P04','核电协议','Susquehanna–AWS最大合约容量','爬坡至全部合约量',1920,'MW','协议披露','S8','front-of-the-meter；并非全部即时交付。'),
 ('P05','核电协议','Talen–AWS协议到期年份','原始期限',2042,'年','协议披露','S8','另有延长期权。'),
 ('U01','聚变融资','CFS Series B2单轮','2025-08',863,'百万美元','公司融资披露','S9','不是累计融资。'),
 ('U02','聚变融资','CFS累计融资约数','截至2025-08',3000,'百万美元','公司融资披露·接近','S9','接近30亿美元，不作为精确值求和。'),
 ('U03','聚变购电','CFS–Google承购','2030年代初目标',200,'MW','协议披露·待实现','S10','PPA锚定SPARC达到Q>1；条款未全部公开。'),
 ('U04','聚变装置','ARC净电功率设计','2030年代初目标',400,'MW','公司设计目标','S10','不同于聚变热功率；未实现发电。'),
 ('U05','聚变融资','Helion Series G初次关闭','2026-06',465,'百万美元','公司融资披露','S11','被9月最终金额更新，不与500相加。'),
 ('U06','聚变融资','Helion Series G最终关闭','2026-09',500,'百万美元','公司融资披露','S11','网页更新，具体更新日未披露。'),
 ('U07','聚变融资','Helion累计融资（六月时点）','截至2026-06',1500,'百万美元','公司融资披露·约数','S11','六月口径，不能视为九月精确累计。'),
 ('U08','聚变购电','Helion–Microsoft目标电功率下限','2028上线并爬坡一年后',50,'MW','公司目标·下限','S12','50MW或以上是在一年爬坡后；不是2028全年保证电量。'),
 ('U09','聚变时间表','Helion电厂上线目标','公司2023声明',2028,'年','公司目标','S12','未核实净上网与商业连续运行。'),
 ('U10','聚变时间表','Helion目标爬坡期','上线之后',1,'年','公司目标','S12','上线与稳定功率必须区分。'),
 ('U11','聚变融资','TAE新一轮股权融资下限','2025-06',150,'百万美元','公司披露·超过','S13','超过1.5亿美元，非精确额。'),
 ('U12','聚变融资','TAE累计股权融资下限','截至2025-06',1300,'百万美元','公司披露·超过','S13','超过13亿美元；不混入并购估值。'),
 ('U13','聚变融资','Type One Series B','2026-10',200,'百万美元','公司融资披露','S15','单轮；未披露统一最新累计金额。'),
 ('U14','聚变时间表','Type One Infinity Two商业运行目标','公司2026声明',2034,'年','公司目标','S16','未在所核查公告中发现科技公司有约束力PPA。'),
 ('E01','成本','全球新增陆上风电加权平均LCOE','2024',34,'美元/MWh','IRENA统计','S17','由0.034美元/kWh单位换算；不含数据中心交付与保供全成本。'),
 ('E02','成本','全球新增光伏加权平均LCOE','2024',43,'美元/MWh','IRENA统计','S17','由0.043美元/kWh单位换算；不能直接当美国24/7到户电价。')]:
 row(id,cat,item,period,v,unit,status,src,'公告正文',note)
row('C19','Constellation','合并净利润','2025',2323,'百万美元','文件披露','F2','CEG Parent Consolidated Statements of Cash Flows / Net income','含非控股权益前的合并净利润，非AI项目单独利润。')
row('C16','项目事件','PJM研究所含部分输电升级可能最晚完工日','Crane重启','2030-12','年月','文件披露','F3','Note 3 / Capacity Interconnection Rights for Crane','研究中的或有升级日期，不是Crane确定投运日。')
row('C17','项目事件','FERC批准容量接入权转移豁免','Crane重启','2026-06','年月','文件披露','F3','Note 3 / Capacity Interconnection Rights for Crane','不代表所有重启审批完成。')
row('C18','项目事件','Calpine收购完成并表日','Constellation','2026-01-07','日期','文件披露','F3','Note 2 / Acquisition of Calpine','收入、资产与现金流比较须考虑组合变化。')
row('U15','聚变时间表','TAE Copernicus净能量目标','2025年公司声明','2020年代结束前','目标时段','公司目标','S13','公告正文','净能量不等于净电输出；不保证兑现。')
row('U16','聚变时间表','TAE Da Vinci原型电厂目标','2025年公司声明','2030年代初','目标时段','公司目标','S13','公告正文','后续拟议并购与融资可能影响进度；非保证。')
A=[]
def ass(id,item,v,unit,note):A.append(dict(id=id,item=item,value=v,unit=unit,status='假设',source='研究模型自设',date='2026-10-22',note=note))
ass('A01','2030用电基准倍数',1,'倍','作用于IEA 950TWh基准；改变后流向与汇总同步。')
ass('A02','低需求情景倍数',.80,'倍','非IEA官方情景，围绕基准的敏感性测试。')
ass('A03','高需求情景倍数',1.20,'倍','非IEA官方情景。')
for id,label,v in [('A04','2030煤电份额',.18),('A05','2030燃气份额',.26),('A06','2030核裂变份额',.14),('A07','2030可再生能源份额',.40),('A08','2030聚变份额',0)]:ass(id,label,v,'%','研究展示分摊假设，不是IEA逐燃料预测；其他为残差，合计必须为100%。')
ass('A09','示例数据中心IT名义功率',1,'GW','独立示例，不对应任何公司或已公告园区。')
ass('A10','IT平均负载率',.85,'%','已含利用率；PUE再计设施额外用电，不能重复算利用率。')
ass('A11','PUE',1.20,'倍','设施总用电/IT用电；峰值估算也采用同一PUE作为简化。')
ass('A12','全年小时数',8760,'小时','按非闰年标准化，不是2024年实际小时。')
ass('A13','到户电价低情景',60,'美元/MWh','示意合并电费，不是PPA报价或预测。')
ass('A14','到户电价基准情景',90,'美元/MWh','含交付保供的总电价敏感性假设；不与LCOE直接比较。')
ass('A15','到户电价高情景',120,'美元/MWh','纯电费；不含服务器折旧、税、土地、水费、人员。')
ass('A16','PPA年化电量核电容量因子',.90,'%','纯年化算术，非合同交付承诺；不沿用公司机组实际容量因子。')
ass('A17','示例光伏容量因子',.25,'%','仅用于年电量等效，不能表示全天候保供。')
ass('A18','现场燃气超配比例',.35,'%','取IEA30%–70%范围内示意值；非工程设计。')
ROOT.joinpath('工作底稿/数据源.json').write_text(json.dumps(dict(sources=S,records=R,assumptions=A),ensure_ascii=False,indent=2))
print(len(R),'records',len(S),'sources',len(A),'assumptions')
