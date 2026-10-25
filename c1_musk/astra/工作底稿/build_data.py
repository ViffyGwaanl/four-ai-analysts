import json
from pathlib import Path
O=Path('交付/工作底稿')
files={
'S1':'SpaceX_招股书__spaceexplorationtechnologi.htm','S2':'SpaceX_2026Q2季报__spcx-20260630.htm','S3':'SpaceX_2026Q3业绩公告__spaceexplorationtechnologi.htm',
'T1':'Tesla_2025年报__tsla-20251231.htm','T2':'Tesla_2026Q3季报__tsla-20260930.htm','T3':'Tesla_2026Q3业绩公告__exhibit9914.htm','T4':'Tesla_2026股东大会委托书__tm267596-1_def14a.htm'}
raw=[]
def add(co,p,vals,source,section):
 for k,v in vals.items():raw.append(dict(id=f'{co}_{p}_{k}',co=co,period=p,metric=k,value=v,source=files[source],section=section))
add('S','FY25',dict(rev=18674,cost=9451,op=-2589,net=-4937,attrib=-4937,ocf=6785,capex=20737,cash=24747,st=0,dc=928,dl=21968,equity=2573,assets=92079,liab=50754,pref=38752), 'S1','F-3/F-4/F-9 Consolidated financial statements; FY2025 restated')
add('S','9M25',dict(rev=13714,cost=6949,op=-1216,net=-2590,attrib=-2590,ocf=4120,capex=13846),'S3','pp.9–12 Consolidated statements; 9M2025 comparative')
add('S','Q126',dict(rev=4694,cost=2388,op=-1943,net=-4276,attrib=-4947,ocf=1047,capex=10107,cash=15852,st=7823,dc=1538,dl=28727,equity=34533,assets=102094,liab=60512,pref=7049),'S1','F-64/F-65/F-69 Consolidated statements, March 31 2026')
add('S','Q226',dict(rev=7814,cost=3495,op=-143,net=-541,attrib=-541,cash=93522,st=6487,dc=2525,dl=36839,equity=127224,assets=192770,liab=65546,pref=0),'S2','pp.4–5 Consolidated Balance Sheets / Statements of Operations')
add('S','6M26',dict(ocf=3466,capex=28476),'S2','p.9 Consolidated Statements of Cash Flows')
add('S','Q326',dict(rev=14575,cost=5478,op=2791,net=4404,attrib=4404,cash=51294,st=38561,dc=2698,dl=36146,equity=176768,assets=254045,liab=77277,pref=0),'S3','pp.9/11 Consolidated Statements of Operations / Balance Sheets')
add('S','9M26',dict(rev=27083,cost=11361,op=705,net=-413,attrib=-1084,ocf=13097,capex=48069),'S3','pp.9/12 Consolidated statements, nine months')
for p,rs,cs,ops,src,sec in [
 ('FY25',[4086,11387,3201],[1352,5921,2178],[-657,4423,-6355],'S1','F-58 Note 19 Segments'),
 ('9M25',[3277,8159,2278],[1104,4271,1574],[-181,3147,-4182],'S3','pp.4–7 Segment Operating and Financial Data, 9M2025'),
 ('Q126',[619,3257,818],[281,1651,456],[-662,1188,-2469],'S1','F-95 Note 18 Segments'),
 ('Q226',[962,4291,2561],[329,2060,1106],[-542,1656,-1257],'S3','pp.4–7 Segment Operating and Financial Data, Q2 comparative'),
 ('Q326',[1767,5248,7560],[435,2368,2675],[-7,2367,431],'S3','pp.4–7 Segment Operating and Financial Data')]:
 for i,b in enumerate(['space','conn','si']): add('S',p,{b+'_rev':rs[i],b+'_cost':cs[i],b+'_op':ops[i]},src,sec)
add('T','FY25',dict(rev=94827,cost=77733,op=4355,net=3855,attrib=3794,ocf=14747,capex=8527,cash=16513,st=27546,dc=1640,dl=6736,equity=82137,assets=137806,liab=54941,auto_rev=69526,serv_rev=12530,energy_rev=12771,auto_cost=57165,serv_cost=11599,energy_cost=8969),'T1','pp.49–50/54; Note 16 Segment Reporting (p.85)')
for i,p in enumerate(['Q425','Q126','Q226','Q326']):
 vals={k:v[i] for k,v in {
 'rev':[24901,22387,28236,28046], 'cost':[19892,17667,23485,22552], 'op':[1409,941,398,718], 'net':[856,491,1128,804], 'attrib':[840,477,1114,787],
 'ocf':[3813,3937,4697,6263], 'capex':[2393,2493,5789,4732], 'liq':[44059,44743,43524,45447], 'dc':[1640,1447,1418,1387], 'dl':[6736,7782,7924,8136], 'equity':[82137,84116,86858,89289], 'assets':[137806,143724,148524,157517], 'liab':[54941,58922,61005,67628],
 'auto_rev':[17693,16234,20516,20560],'serv_rev':[3371,3745,4581,4605],'energy_rev':[3837,2408,3139,2881], 'auto_cost':[14080,12812,17053,16754],'serv_cost':[3073,3399,3933,3871],'energy_cost':[2739,1456,2499,1927]}.items()}
 add('T',p,vals,'T3','pp.27–29 Statements of Operations / Balance Sheet / Cash Flows; Q3 checked against T2')
add('T','9M26',dict(rev=78669,cost=63704,op=2057,net=2423,attrib=2378,ocf=14897,capex=13014),'T2','Consolidated statements; nine months ended September 30 2026')
add('X','Q326',dict(megapack_rev=221,megapack_cost=171,fv_gain=-142),'T2','Note 13 Related Party Transactions; Note 2 Fair Value')
add('X','9M26',dict(megapack_rev=626,megapack_cost=478,fv_gain=863,related_capex=480),'T2','Note 13 / Note 2; related_capex from S3 p.12 cash flow footnote')
add('X','SEP26',dict(ar=729,undelivered=588,deferred=648,current_def=516,long_def=132,investment=2865),'T2','Note 13 Related Party Transactions / Note 2 Fair Value')
add('X','6M26',dict(related_capex=329,valor_dc=2039,valor_dl=11290,valor_interest=513),'S2','Note 17 Related Party Transactions')
add('X','Q226',dict(related_capex=295,valor_interest=327),'S2','Note 17 Related Party Transactions')
add('X','SEP26',dict(valor_dc=2181,valor_dl=10716),'S3','p.11 Balance Sheets, related-party debt parentheticals; counterparty attribution inferred from S2 Note 17')
add('X','Q326',dict(related_interest=351,related_other_income=561),'S3','p.9 Statements of Operations, related-party parentheticals')
add('X','9M26',dict(related_interest=864),'S3','p.9 Statements of Operations')
add('X','FY25',dict(megapack_purchase=506,cybertruck_purchase=131,tesla_sales_spacex=143.3,tesla_sales_xai=430.1,tesla_exp_spacex=11.4,aircraft=0.4,advertising_x=3.3,tesla_exp_xai=4,tesla_other_xai=0.3,tbc=0.9,security=4.8,redwood_exp=3.3,redwood_scrap=12.9),'T4','Related Person Transactions pp.65–66; purchases of 506 / 131 from S1 Note 18 F-57')
add('OWN','SEP26',dict(t_shares=3952.648559,t_musk=699.580882,t_unearned=423.743904,t_trust=413.152109,t_2018=286.428773),'T4','Ownership of Securities, pp.68–69 and footnote (2); units million shares')
add('OWN','MAY26',dict(s_musk_a=849.494440,s_musk_b=5569.053075,s_musk_options=350,s_restricted=1302.072285,s_a_preipo=6932.508,s_b_preipo=5602.790410,s_ipo=555.555555,s_votes=0.844),'S1','Security Ownership of Certain Beneficial Owners and Management pp.248–249, footnote (1); units million shares')
add('OWN','SEP26',dict(s_a=8240,s_b=5339),'S3','p.11 Consolidated Balance Sheets, issued and outstanding; units million shares, rounded')
add('OWN','MAR26',dict(t_holds_s_pre=3.8,split=5),'S1','F-61 Tesla’s xAI Investment and SpaceX Class A Common Stock Issuance; Note 1 five-for-one split; 3.8 is rounded')
(O/'data.json').write_text(json.dumps(dict(files=files,raw=raw),ensure_ascii=False,indent=2))
# 20 completed sessions; close-weighted approximation, not intraday VWAP
s_close=[159.31,147.79,147.96,146.03,148.62,152.16,156.54,163.42,162.57,160.57,167.60,171.92,171.09,158.96,148.07,150.86,149.24,145.47,148.68,148.03]
s_vol=[217419541,90413606,73858005,88552887,101177143,68780976,69022484,67434500,93042640,71897847,77473018,106952443,135688935,119859134,69092538,79614173,80056715,83516666,54595189,72721441]
t_close=[386.47,373.71,368.06,354.72,362.44,367.16,375.23,378.03,382.70,375,377.81,380.68,378.73,370.59,354.11,354.81,352.84,357.45,372.11,377.94]
t_vol=[43161811,30590704,38756339,62067344,26728314,31001421,18393043,20244285,38952426,28394945,25594563,27735438,42232669,55330140,31080774,39235838,32492406,39452901,45999470,26165727]
dates=['10-21','10-20','10-19','10-16','10-15','10-14','10-13','10-12','10-09','10-08','10-07','10-06','10-05','10-02','10-01','09-30','09-29','09-28','09-25','09-24']
market=[dict(date='2026-'+d,s_close=s_close[i],s_vol=s_vol[i],t_close=t_close[i],t_vol=t_vol[i]) for i,d in enumerate(dates)]
(O/'market.json').write_text(json.dumps(market,indent=2))
print('Source observations:',len(raw))
add('S','Q326',dict(si_capex=16444,conn_capex=1543,space_capex=1606,cursor_revenue=608,cursor_consideration=42500,cursor_service_awards=23400),'S3','pp.3/7/8 Segment Capex and Cursor Merger')
add('T','SEP26',dict(nci=546,rnci=54),'T3','p.28 Balance Sheet; checked T2 consolidated balance sheet')
(O/'data.json').write_text(json.dumps(dict(files=files,raw=raw),ensure_ascii=False,indent=2))
