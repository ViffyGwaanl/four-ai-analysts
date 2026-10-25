from pathlib import Path
import sys,json
P=Path(__file__).resolve().parents[1];sys.path.insert(0,str(P/'工具/依赖'))
from playwright.sync_api import sync_playwright
H=json.loads((P/'数据/完整导出.json').read_text())['history']
results={};errors=[];external=[]
with sync_playwright() as p:
 b=p.chromium.launch(channel='chrome',headless=True,args=['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 page=b.new_page(viewport={'width':1920,'height':1080},device_scale_factor=1)
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
 page.on('request',lambda r:external.append(r.url) if not r.url.startswith(('http://127.0.0.1:8080','data:')) else None)
 page.goto('http://127.0.0.1:8080',wait_until='networkidle');page.wait_for_function('window.factoryReady === true');page.wait_for_timeout(1500)
 page.screenshot(path=str(P/'检查/网页_桌面_Q16.png'),full_page=True)
 results['desktop']={'webgl':page.evaluate('window.factoryReady'),'width':page.evaluate('document.documentElement.scrollWidth'),'height':page.evaluate('document.documentElement.scrollHeight')}
 for n in range(16):
  page.locator('.quarter-ticks button').nth(n).click();q=H[n]
  for id,key in [('revenue','revenue'),('profit','net_income')]:assert float(page.locator('#'+id).inner_text())==q['income_statement'][key]
  assert float(page.locator('#equity').inner_text())==q['balance_sheet']['equity']
  assert float(page.locator('#ocf').inner_text())==q['cash_flow']['operating']
 results['quarter_data']='16个季度的收入、净利、经营现金流、权益与导出逐项一致'
 for name in ['clean','warehouse','hbm','board','vault']:
  page.locator(f'[data-room="{name}"]').click();assert page.locator('#room-name').inner_text()
 page.locator('#quarter-slider').fill('1');page.locator('#quarter-slider').dispatch_event('input');page.wait_for_timeout(500);page.screenshot(path=str(P/'检查/网页_桌面_Q01.png'),full_page=True)
 page.locator('#speed').select_option('900');page.locator('#play').click();page.wait_for_timeout(2000);assert page.evaluate('window.currentQuarter')>=3;page.locator('#play').click();results['playback']='播放、暂停、倍速通过'
 page.locator('#top-view').click();page.wait_for_timeout(600);page.locator('#zoom-in').click();page.locator('#zoom-out').click();page.locator('#reset-view').click();results['views']='俯视、缩放、复位通过'
 page.locator('#method-button').click();assert page.locator('#method').is_visible();page.locator('#close-method').click()
 mobile=b.new_page(viewport={'width':390,'height':844},device_scale_factor=1,is_mobile=True,has_touch=True)
 mobile.on('pageerror',lambda e:errors.append('mobile '+str(e)));mobile.on('console',lambda m:errors.append('mobile '+m.text) if m.type=='error' else None)
 mobile.goto('http://127.0.0.1:8080',wait_until='networkidle');mobile.wait_for_function('window.factoryReady === true');mobile.wait_for_timeout(800);mobile.screenshot(path=str(P/'检查/网页_手机_Q16.png'),full_page=True)
 assert mobile.evaluate('document.documentElement.scrollWidth')==390
 mobile.locator('.quarter-ticks button').nth(3).click();assert mobile.evaluate('window.currentQuarter')==4
 results['mobile']='390×844无横向溢出，WebGL可用，季度切换通过'
 results['console_errors']=errors;results['external_requests']=external
 b.close()
(P/'检查/网页验证.json').write_text(json.dumps(results,ensure_ascii=False,indent=2));print(json.dumps(results,ensure_ascii=False,indent=2));assert not errors;assert not external
