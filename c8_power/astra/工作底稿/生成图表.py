from pathlib import Path
import json
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1];d=json.loads((R/'web/data.json').read_text());M=json.loads((R/'工作底稿/映射.json').read_text())['model_values']
values=[d['history'][0]['twh'],d['history'][1]['twh'],d['scenarios']['low']['total'],d['scenarios']['base']['total'],d['scenarios']['high']['total']]
labels=['2024 估计','2025 估计','2030 低需求','2030 基准','2030 高需求']
svg='<svg width="1200" height="450" viewBox="0 0 1200 450" xmlns="http://www.w3.org/2000/svg"><rect width="1200" height="450" fill="#f3f7f7"/><text x="48" y="50" fill="#183749" font-size="23">全球数据中心用电：历史估计与需求敏感性</text><text x="48" y="80" fill="#718790" font-size="14">单位：TWh / 年　｜　低、高情景为研究假设，不是 IEA 官方预测</text>'
for i,v in enumerate(values):
 x=95+i*222;h=v/1200*240;c=['#88abae','#4f959c','#b9d0ec','#3976d6','#849fda'][i]
 svg+=f'<rect x="{x}" y="{355-h}" width="126" height="{h}" rx="4" fill="{c}"/><text x="{x+63}" y="{340-h}" text-anchor="middle" font-size="25" fill="#183749">{v:,.0f}</text><text x="{x+63}" y="385" text-anchor="middle" font-size="16" fill="#526e7d">{labels[i]}</text>'
svg+='<text x="48" y="427" fill="#788e97" font-size="12">来源：IEA 2025-04-10、2026-04-16；研究假设 2026-10-22。数据表：明细 D01、D03；模型 K14–K16。</text></svg>'
html='<meta charset="UTF-8"><style>body{margin:0;font-family:Arial,"PingFang SC",sans-serif}svg{display:block}</style>'+svg
(R/'工作底稿/需求图.html').write_text(html)
with sync_playwright() as p:
 b=p.chromium.launch(channel='chrome',headless=True);page=b.new_page(viewport={'width':1200,'height':450},device_scale_factor=1.6);page.goto((R/'工作底稿/需求图.html').as_uri());page.screenshot(path=str(R/'工作底稿/需求图.png'));b.close()
