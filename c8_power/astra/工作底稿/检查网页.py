from pathlib import Path
from playwright.sync_api import sync_playwright
import json,time
R=Path(__file__).resolve().parents[1]
results={'errors':[],'external_requests':[],'checks':[]}
with sync_playwright() as p:
 b=p.chromium.launch(channel='chrome',headless=True,args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 page=b.new_page(viewport={'width':1920,'height':1080},device_scale_factor=1)
 page.on('pageerror',lambda e:results['errors'].append(str(e)))
 page.on('console',lambda m:results['errors'].append(m.text) if m.type=='error' else None)
 page.on('request',lambda req:results['external_requests'].append(req.url) if not req.url.startswith('http://127.0.0.1:18973') else None)
 page.goto('http://127.0.0.1:18973',wait_until='networkidle');page.wait_for_timeout(1800)
 page.screenshot(path=str(R/'验证/网页_桌面首页.png'))
 results['checks'].append({'desktop_initial':page.evaluate('window.__appState()')})
 page.locator('[data-step="3"]').click();page.wait_for_timeout(2000);page.screenshot(path=str(R/'验证/网页_包层拆解.png'))
 results['checks'].append({'exploded':page.evaluate('window.__appState()')})
 page.locator('a[href="#power"]').click();page.evaluate('document.querySelector("#power").scrollIntoView({behavior:"instant"})');page.wait_for_timeout(1500);page.screenshot(path=str(R/'验证/网页_电力流向.png'))
 for key in ['historical','low','high','base']:
  page.locator('[data-scenario="'+key+'"]').click();page.wait_for_timeout(100)
  state=page.evaluate('window.__appState()');assert abs(sum(v[key] for v in state['flows'])-state['total'])<1e-6
  results['checks'].append({'scenario':key,'total':state['total'],'conservation':True})
 page.locator('#motion').click();assert page.evaluate('window.__appState().paused')
 page.set_viewport_size({'width':390,'height':844});page.evaluate('window.scrollTo({top:0,behavior:"instant"})');page.wait_for_timeout(1000);page.screenshot(path=str(R/'验证/网页_手机首页.png'))
 assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
 page.locator('a[href="#power"]').click();page.evaluate('document.querySelector("#power").scrollIntoView({behavior:"instant"})');page.wait_for_timeout(1000);page.screenshot(path=str(R/'验证/网页_手机电力.png'))
 assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
 assert not results['errors'] and not results['external_requests']
 results['checks'].append({'mobile_390x844':'no horizontal overflow','version':page.evaluate('window.__appState().revision'),'webgl':page.evaluate('window.__appState().webgl')})
 b.close()
(R/'验证/网页检查.json').write_text(json.dumps(results,ensure_ascii=False,indent=2));print(json.dumps({k:v for k,v in results.items() if k!='checks'},ensure_ascii=False));print('checks',len(results['checks']))
