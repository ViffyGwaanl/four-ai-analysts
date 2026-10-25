import json,sys,urllib.request,pathlib
ROOT=pathlib.Path(__file__).resolve().parents[2]
OUT=ROOT/'交付/数据'
p=json.loads((ROOT/'材料/游戏通行证.json').read_text())
def api(path,data=None):
 req=urllib.request.Request('http://127.0.0.1:8765/games/'+p['game_id']+'/'+path,data=json.dumps(data,ensure_ascii=False).encode() if data is not None else None,headers={'X-Game-Token':p['token'],'Content-Type':'application/json'})
 return json.load(urllib.request.urlopen(req))
def save(name,data): (OUT/name).write_text(json.dumps(data,ensure_ascii=False,indent=2))
s=api('state')
if s['ended']:
 print('游戏已结束：不再接受决策。');print(json.dumps({k:v for k,v in s.items() if k not in ['history','decision_bounds','capacity_pipeline']},ensure_ascii=False));sys.exit(0)
q=s['quarter_to_decide'];save(f'Q{q:02}_决策前.json',s)
if len(sys.argv)>1:
 if s['ended']: raise Exception('游戏已结束')
 d=json.loads(sys.argv[1]);save(f'Q{q:02}_决策.json',d)
 r=api('decide',d);save(f'Q{q:02}_结果.json',r);print('RESULT',json.dumps(r.get('booked',r),ensure_ascii=False))
 s=api('state')
 save('最新状态.json',s)
 if s['ended']: save('完整导出.json',api('export'))
print('STATE',json.dumps({k:v for k,v in s.items() if k not in ['history','decision_bounds','capacity_pipeline']},ensure_ascii=False))
