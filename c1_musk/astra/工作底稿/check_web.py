import sys,json,os
from pathlib import Path
sys.path.insert(0,str(Path(__file__).parent/'python_lib'))
os.environ['PLAYWRIGHT_BROWSERS_PATH']=str(Path('交付/工作底稿/browsers').resolve())
from playwright.sync_api import sync_playwright
result={};out=Path('交付/校验')
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,channel='chromium',args=['--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 for name,w,h in [('desktop',1920,1080),('mobile',390,844)]:
  page=browser.new_page(viewport={'width':w,'height':h},device_scale_factor=1);errs=[];failed=[];external=[]
  page.on('pageerror',lambda e:errs.append(str(e)))
  page.on('console',lambda m:errs.append(m.text) if m.type=='error' else None)
  page.on('requestfailed',lambda r:failed.append(r.url))
  page.on('request',lambda r:external.append(r.url) if not r.url.startswith(('http://127.0.0.1:8000','data:')) else None)
  page.goto('http://127.0.0.1:8000',wait_until='networkidle');page.wait_for_timeout(1800)
  page.screenshot(path=str(out/(name+'_首页.png')))
  state=page.evaluate('''() => ({three:window.__orbit?.version,fallback:window.__orbitFallback||null,canvas:!!document.querySelector('canvas'),overflow:document.documentElement.scrollWidth>innerWidth,stageCount:document.querySelectorAll('.stage').length,heights:window.__orbit?.stages.map(s=>s.userData.h),revenues:window.__orbit?.data.segments.map(s=>s.share)})''')
  page.evaluate("document.querySelector('#stage-3').scrollIntoView({behavior:'instant'})");page.wait_for_timeout(1400);page.screenshot(path=str(out/(name+'_分离.png')))
  state['positions']=page.evaluate('window.__orbit?.stages.map(s=>({x:s.position.x,y:s.position.y}))')
  page.evaluate("document.querySelector('#summary').scrollIntoView({behavior:'instant'})");page.wait_for_timeout(600);page.screenshot(path=str(out/(name+'_整体.png')),full_page=False)
  state['baseRatios']=page.locator('.ratio').all_text_contents();page.locator('#premium').fill('20');page.locator('#premium').dispatch_event('input');state['premium20Ratios']=page.locator('.ratio').all_text_contents()
  state.update(errors=errs,requestFailures=failed,externalRequests=external);result[name]=state;page.close()
 browser.close()
(out/'网页检查.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));print(json.dumps(result,ensure_ascii=False,indent=2))
assert all(not v['errors'] and not v['requestFailures'] and not v['externalRequests'] and not v['overflow'] and not v['fallback'] and v['three']=='170' for v in result.values())
