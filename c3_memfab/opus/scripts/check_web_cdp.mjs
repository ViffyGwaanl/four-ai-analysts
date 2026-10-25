// 网页实时验收（Chrome DevTools 协议）：真实时间等待页面搭建完成，收集控制台输出和异常，截图，并读回页面上的关键数字。
// 用法（任务根目录，先在 交付/web 起本地服务：python3 -m http.server 8823）：
//   node 交付/scripts/check_web_cdp.mjs <输出目录>
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const OUT = resolve(process.argv[2] || '_work/webcdp');
mkdirSync(OUT, { recursive: true });
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9333, BASE = 'http://127.0.0.1:8823/index.html';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${OUT}/profile`, '--no-first-run',
  '--no-default-browser-check', '--hide-scrollbars', '--window-size=1920,1080', 'about:blank'], { stdio: 'ignore' });

async function getPageWs() {
  for (let i = 0; i < 50; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      const p = list.find((t) => t.type === 'page');
      if (p) return p.webSocketDebuggerUrl;
    } catch (e) { /* 等 Chrome 起来 */ }
    await sleep(200);
  }
  throw new Error('Chrome 没有启动');
}

const ws = new WebSocket(await getPageWs());
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
let id = 0; const pending = new Map(); const logs = [];
ws.addEventListener('message', (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); return; }
  if (msg.method === 'Runtime.consoleAPICalled') logs.push(`[console.${msg.params.type}] ` + msg.params.args.map((a) => a.value ?? a.description ?? '').join(' '));
  if (msg.method === 'Runtime.exceptionThrown') logs.push('[exception] ' + (msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text));
  if (msg.method === 'Log.entryAdded') logs.push(`[log.${msg.params.entry.level}] ${msg.params.entry.source}: ${msg.params.entry.text}`);
});
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
await send('Runtime.enable'); await send('Log.enable'); await send('Page.enable');

const CASES = [
  { name: 'desktop_q01', w: 1920, h: 1080, mobile: false, q: '?q=1&autoplay=0&intro=0' },
  { name: 'desktop_q06_warehouse', w: 1920, h: 1080, mobile: false, q: '?q=6&autoplay=0&intro=0&view=warehouse' },
  { name: 'desktop_q16', w: 1920, h: 1080, mobile: false, q: '?q=16&autoplay=0&intro=0' },
  { name: 'desktop_autoplay', w: 1920, h: 1080, mobile: false, q: '' },
  { name: 'mobile_q10', w: 390, h: 844, mobile: true, q: '?q=10&autoplay=0&intro=0' },
];
const report = [];
for (const c of CASES) {
  logs.length = 0;
  await send('Emulation.setDeviceMetricsOverride', { width: c.w, height: c.h, deviceScaleFactor: c.mobile ? 2 : 1, mobile: c.mobile });
  await send('Emulation.setTouchEmulationEnabled', { enabled: c.mobile });
  await send('Page.navigate', { url: BASE + c.q });
  await sleep(c.name === 'desktop_autoplay' ? 14000 : 9000);
  const ready = await send('Runtime.evaluate', { expression: `({ready: document.body.classList.contains('is-ready'), veil: getComputedStyle(document.querySelector('.veil')).opacity, fallback: !document.getElementById('fallback').hidden, q: document.getElementById('qLabel').textContent, kpi: document.getElementById('kpiGroups').innerText.replace(/\\s+/g,' ').slice(0, 600)})`, returnByValue: true });
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(`${OUT}/${c.name}.png`, Buffer.from(shot.result.data, 'base64'));
  report.push({ case: c.name, state: ready.result.result.value, console: [...logs] });
}
writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 1));
for (const r of report) {
  console.log(`${r.case}: ready=${r.state.ready} fallback=${r.state.fallback} 季度=${r.state.q} 控制台/异常=${r.console.length}`);
  for (const l of r.console) console.log('   ', l);
  console.log('    KPI:', r.state.kpi.slice(0, 300));
}
ws.close(); chrome.kill();
