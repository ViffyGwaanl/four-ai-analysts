// 拆开的火箭 · SpaceX × 特斯拉合并备考 — 3D 滚动叙事
// Three.js r170（本地 vendor/），所有数字来自 data.js（由 合并模型.xlsx 重算结果导出）。
import * as THREE from './vendor/three.module.min.js';
import { Sky } from './vendor/addons/objects/Sky.js';
import { EffectComposer } from './vendor/addons/postprocessing/EffectComposer.js';
import { RenderPass } from './vendor/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from './vendor/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from './vendor/addons/postprocessing/OutputPass.js';
import { ShaderPass } from './vendor/addons/postprocessing/ShaderPass.js';
import { DATA } from './data.js';

window.__appStarted = true;
window.__errors = window.__errors || [];
window.addEventListener('error', (e) => window.__errors.push(String(e.message || e)));

// ------------------------------------------------------------------ utils
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const $ = (s, el = document) => el.querySelector(s);
const QS = new URLSearchParams(location.search);
const IS_MOBILE = window.matchMedia('(max-width: 820px)').matches || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
const LOW = IS_MOBILE || (navigator.hardwareConcurrency || 8) <= 4 || QS.has('low');
const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const ST = DATA.stages;
const CD = DATA.combined.disp;
const NCH = 8;
const CH_LABELS = ['起飞前', '点火升空', '一级 · 汽车及服务', '二级 · 能源', '三级 · Starlink', '四级 · SI', '五级 · 航天', '合并后的整体'];
const loader = $('#loader');

// ------------------------------------------------------------------ UI from data
function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }

function buildUI() {
  $('#meta').textContent = `财务数据截至 ${DATA.finAsOf} · 市场数据截至 ${DATA.market.dateP} 收盘 · 研究与展示用，不构成投资建议`;
  // hero
  const m1 = DATA.methods[0].disp;
  $('#ov-hero').innerHTML = `
    <div class="kicker">合并备考 · 3D 拆解</div>
    <h1>如果 SpaceX 与特斯拉合并，<br class="d">它会是一枚什么样的火箭？</h1>
    <p class="lead">五块业务组成五级火箭，每级高度按 LTM（${DATA.ltm}）营收占比。向下滚动，火箭逐级分离，每一级浮出这块业务的关键数字。</p>
    <div class="tiles">
      <div class="tile"><div class="l">合并 LTM 营收</div><div class="v">${CD.revLTM}<small>亿美元</small></div><div class="s">特斯拉 ${CD.revT} · SpaceX ${CD.revS}</div></div>
      <div class="tile"><div class="l">SpaceX 占比</div><div class="v">${CD.sxShareLTM}<small>营收</small></div><div class="s">却贡献 ${CD.sxGpShare} 的毛利</div></div>
      <div class="tile"><div class="l">合并净现金</div><div class="v">${CD.netcash}<small>亿美元</small></div><div class="s">2026-09-30</div></div>
      <div class="tile"><div class="l">换股比例（方法①）</div><div class="v">${m1.ratio2}</div><div class="s">每股特斯拉换 SpaceX 股</div></div>
    </div>
    <div class="hint"><span class="mouse"></span><span>${IS_MOBILE ? '向上滑动屏幕，开始逐级分离' : '滚动鼠标，开始逐级分离'}</span></div>`;
  // liftoff caption with legend
  const rows = ST.map(s => `<div class="row"><span class="sw" style="background:${s.color}"></span><span>${s.idx}. ${s.company} · ${s.name}</span>
      <span class="bar"><b style="width:${(s.share * 100).toFixed(2)}%;background:${s.color}"></b></span><span class="num">${s.disp.share}</span></div>`).join('');
  $('#ov-lift').innerHTML = `<div class="card"><h2>点火：合并 LTM 营收 ${CD.revLTM} 亿美元</h2>
      <p>自下而上五级：特斯拉两块业务在下，SpaceX 三块在上；各级高度 ∝ LTM 营收占比（关联交易已抵销，顶部整流罩与发动机为装饰，不计入比例）。</p>
      <div class="legend">${rows}</div></div>`;
  // stage panels
  const wrap = $('#ov-stages');
  ST.forEach((s, i) => {
    const side = (i % 2 === 0) ? 'right' : 'left';
    const d = s.disp;
    let dl = `<dt>分部毛利</dt><dd>${d.gp} 亿 · 毛利率 ${d.gm}</dd>`;
    if (d.op != null) dl += `<dt>分部经营利润（LTM）</dt><dd>${d.op} 亿 · ${d.opm}</dd>`;
    dl += `<dt>2026Q3 营收（同比）</dt><dd>${d.revQ3} 亿 · ${d.yoy}</dd>`;
    (s.facts || []).forEach(f => { dl += `<dt>${f[0]}</dt><dd>${f[1]}</dd>`; });
    const p = el('div', `overlay stage-panel ${side}`);
    p.dataset.ch = String(i + 2);
    p.dataset.stage = String(i);
    p.innerHTML = `<div class="card"><div class="strip" style="background:${s.color}"></div><div class="inner">
        <div class="k"><span class="tag"><i style="background:${s.color}"></i>${s.company}</span><span>第 ${s.idx} 级 / 5 · ${i < 4 ? '分离' : '整流罩分离'}</span></div>
        <h2>${s.name}</h2>
        <div class="big"><span class="n">${d.rev}</span><span class="u">亿美元 · LTM 营收</span></div>
        <div class="sharebar"><b style="width:${(s.share * 100).toFixed(2)}%;background:${s.color}"></b></div>
        <div class="sharecap"><span>占合并营收 ${d.share}</span><span>按 2026Q3 年化 ${d.rr}</span></div>
        <dl>${dl}</dl>
        <div class="note">${s.note}。口径：LTM = ${DATA.ltm}；单位亿美元。</div>
      </div></div>`;
    wrap.appendChild(p);
  });
  buildFinal();
  // rail
  const rail = $('#rail');
  CH_LABELS.forEach((lab, c) => {
    const b = el('button', '', `<span class="lab">${lab}</span><span class="dot"></span>`);
    b.type = 'button';
    b.setAttribute('aria-label', `跳到：${lab}`);
    b.addEventListener('click', () => scrollToChapter(c, c === 0 ? 0 : 0.4));
    rail.appendChild(b);
  });
  // stage labels for the final exploded view
  const labels = $('#labels');
  ST.forEach((s) => {
    const l = el('div', 'slabel', `<div class="t"><i style="background:${s.color}"></i><b>${s.idx} ${s.name}</b> · ${s.disp.rev} 亿 · ${s.disp.share}</div><div class="ln"></div>`);
    labels.appendChild(l);
  });
}

let premIdx = 0;
function buildFinal() {
  const c = CD;
  const tiles = [
    ['营收', c.revLTM, `特斯拉 ${c.revT} · SpaceX ${c.revS}`],
    ['毛利', c.gp, `毛利率 ${c.gm}`],
    ['经营利润（GAAP）', c.op, '已抵销关联利润'],
    ['EBITDA（统一口径）', c.ebitda, '经营利润 + 折旧摊销'],
    ['归母净利润', c.ni, 'GAAP'],
    ['经营现金流', c.ocf, 'LTM'],
    ['资本开支', c.capex, 'SpaceX 占约 78%'],
    ['自由现金流', c.fcf, '经营现金流 − 资本开支'],
    ['现金和短期投资', c.cash, `有息负债 ${c.debt}`],
    ['净现金', c.netcash, '2026-09-30'],
  ].map(([l, v, s]) => `<div class="tile"><div class="l">${l}</div><div class="v">${v}<small>亿</small></div><div class="s">${s}</div></div>`).join('');
  const prem = DATA.sens.prems;
  const pbtn = [0, 2, 4, 6, 8].map(i => `<button type="button" data-i="${i}" class="${i === 0 ? 'on' : ''}">${Math.round(prem[i] * 100)}%</button>`).join('');
  const pre = DATA.pre.disp;
  $('#ov-final').innerHTML = `<div class="card">
    <h2>合并后的整体</h2>
    <div class="sub">LTM ${DATA.ltm} · 两家简单加总并抵销关联交易，未作购买价格分摊 · 单位：亿美元</div>
    <div class="grid">${tiles}</div>
    <h3>换股比例情景：特斯拉原股东在合并后公司的持股 <span class="seg-ctl" id="prem-ctl" role="group" aria-label="给特斯拉股东的溢价率">${pbtn}</span></h3>
    <div class="chart" id="er-chart"></div>
    <table class="mt" id="er-table"></table>
    <h3>马斯克持股：合并前后 <small>口径A 含全部已发行限制性股 / 口径B 剔除未达成条件业绩股</small></h3>
    <div class="musk">
      <div class="tile"><div class="l">合并前 · SpaceX</div><div class="v" style="font-size:18px">${pre.sxA} / ${pre.sxB}</div><div class="s">表决权 ${pre.sxV}（B 类 10 票/股）</div></div>
      <div class="tile"><div class="l">合并前 · 特斯拉</div><div class="v" style="font-size:18px">${pre.tsA} / ${pre.tsB}</div><div class="s">委托书口径实益持股 ${pre.tsB}</div></div>
      <div class="tile" id="musk-post"></div>
    </div>
    <div class="fine">情景假设：SpaceX 发行 A 类股吸收合并特斯拉，溢价给予特斯拉股东；特斯拉所持 1,899 万股 SpaceX 股份转为库存股。方法①②③为市价法（${DATA.market.dateU} 收盘、截至该日 ${DATA.market.vwapN} 个交易日 VWAP、${DATA.market.dateP} 收盘），④⑤为把两家市场企业价值之和按 LTM 营收或 EBITDA 占比重新分配的“同一倍数”贡献法。表决权按沿用 SpaceX 双层股权测算（示意）。全部数字与公式见 合并模型.xlsx。<br>来源：${DATA.sources.join('；')}。研究与展示用，不构成投资建议。</div>
  </div>`;
  $('#prem-ctl').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    premIdx = +b.dataset.i;
    [...$('#prem-ctl').children].forEach(x => x.classList.toggle('on', x === b));
    renderScenario();
  });
  renderScenario();
}

function renderScenario() {
  const i = premIdx, S = DATA.sens, M = DATA.methods;
  const max = 0.9;
  const ticks = [0, 0.2, 0.4, 0.6, 0.8];
  let html = '';
  M.forEach((m, j) => {
    const v = S.shT[i][j];
    html += `<div class="rowc"><div class="mlab">${m.name}</div><div class="track">${ticks.map(t => `<span class="gl" style="left:${t / max * 100}%"></span>`).join('')}
      <div class="b" tabindex="0" data-j="${j}" style="width:${(v / max * 100).toFixed(2)}%" aria-label="${m.name}：特斯拉原股东 ${S.disp.shT[i][j]}"></div></div>
      <div class="val">${S.disp.shT[i][j]}</div></div>`;
  });
  html += `<div class="axis"><span></span><div class="ticks">${ticks.map(t => `<span style="left:${t / max * 100}%">${Math.round(t * 100)}%</span>`).join('')}</div><span></span></div>`;
  $('#er-chart').innerHTML = html;
  let tb = `<tr><th>定价方法</th><th>每股价值（美元）<br>特斯拉 / SpaceX</th><th>换股比例</th><th>特斯拉<br>原股东</th><th>SpaceX<br>原股东</th><th>马斯克<br>A / B</th></tr>`;
  M.forEach((m, j) => {
    tb += `<tr class="${j === 0 ? 'hl' : ''}"><td>${m.name}</td><td>${m.disp.pt} / ${m.disp.ps}</td><td>${S.disp.ratio[i][j]}</td><td>${S.disp.shT[i][j]}</td><td>${S.disp.shS[i][j]}</td><td>${S.disp.muskA[i][j]} / ${S.disp.muskB[i][j]}</td></tr>`;
  });
  $('#er-table').innerHTML = tb;
  const m1 = M[0].disp;
  $('#musk-post').innerHTML = `<div class="l">合并后 · 方法①（溢价 ${Math.round(S.prems[i] * 100)}%）</div><div class="v" style="font-size:18px">${S.disp.muskA[i][0]} / ${S.disp.muskB[i][0]}</div><div class="s">零溢价时表决权约 ${m1.vote}；特斯拉公众股东表决权 ${m1.pubTVote}</div>`;
  // tooltips
  const tip = $('#tip');
  $('#er-chart').querySelectorAll('.b').forEach(b => {
    const j = +b.dataset.j, m = M[j];
    const show = (x, y) => {
      tip.innerHTML = `<b>${m.long}</b><br>溢价 ${Math.round(S.prems[i] * 100)}% · 换股比例 ${S.disp.ratio[i][j]}<br>特斯拉原股东 ${S.disp.shT[i][j]} · SpaceX 原股东 ${S.disp.shS[i][j]}<br>马斯克 口径A ${S.disp.muskA[i][j]} · 口径B ${S.disp.muskB[i][j]}<br>每股价值：特斯拉 ${m.disp.pt} / SpaceX ${m.disp.ps} 美元`;
      tip.style.left = Math.min(window.innerWidth - 300, x + 14) + 'px';
      tip.style.top = Math.max(8, y - 10) + 'px';
      tip.classList.add('on');
    };
    b.addEventListener('mousemove', (e) => show(e.clientX, e.clientY));
    b.addEventListener('mouseleave', () => tip.classList.remove('on'));
    b.addEventListener('focus', () => { const r = b.getBoundingClientRect(); show(r.right, r.top); });
    b.addEventListener('blur', () => tip.classList.remove('on'));
  });
}

// ------------------------------------------------------------------ scroll → mission time T
let chTop = [], chH = [];
function measure() {
  chTop = []; chH = [];
  document.querySelectorAll('#story .chapter').forEach(s => { chTop.push(s.offsetTop); chH.push(s.offsetHeight); });
}
function scrollT() {
  const y = window.scrollY || window.pageYOffset || 0;
  for (let c = NCH - 1; c >= 0; c--) {
    if (y >= chTop[c]) return Math.min(c + (y - chTop[c]) / chH[c], NCH - 0.0001);
  }
  return 0;
}
function scrollToChapter(c, t = 0.4, instant = false) {
  const y = chTop[c] + t * chH[c];
  window.scrollTo({ top: y, behavior: instant || REDUCED ? 'auto' : 'smooth' });
}

// ------------------------------------------------------------------ overlay visibility
let OVS = null;
const overlays = () => (OVS || (OVS = [...document.querySelectorAll('.overlay')]));
let lastCh = -1;
function updateOverlays(T) {
  const c = Math.min(NCH - 1, Math.floor(T)), t = T - c;
  overlays().forEach(o => {
    const oc = +o.dataset.ch;
    let on = false;
    if (oc === c) {
      if (c === 0) on = t < 0.82;
      else if (c === 1) on = t > 0.08 && t < 0.86;
      else if (c === 7) on = t > 0.1;
      else on = t > 0.1 && t < 0.9;
    }
    o.classList.toggle('on', on);
  });
  if (c !== lastCh) {
    [...$('#rail').children].forEach((b, i) => b.classList.toggle('on', i === c));
    lastCh = c;
  }
  document.body.classList.toggle('cine', c >= 1 && c <= 6);
  document.body.classList.toggle('hero-on', c === 0 && t < 0.85);
}

// ------------------------------------------------------------------ WebGL availability
function webglOK() {
  if (QS.has('nogl')) return false;   // 测试用：强制文字版
  try { const c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl'))); }
  catch (e) { return false; }
}

buildUI();
measure();

if (!webglOK()) {
  document.body.classList.add('no-webgl');
  overlays().forEach(o => o.classList.add('on'));
  loader.classList.add('done');
} else {
  try { start3D(); }
  catch (err) {
    console.warn('3D 初始化失败，改为文字版：', err);
    document.body.classList.add('no-webgl');
    overlays().forEach(o => o.classList.add('on'));
    loader.classList.add('done');
  }
}

// ==================================================================== 3D
function start3D() {
  const canvas = $('#scene');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !LOW, powerPreference: 'high-performance', alpha: false, stencil: false });
  const DPR = Math.min(window.devicePixelRatio || 1, LOW ? 1.5 : 2);
  renderer.setPixelRatio(DPR);
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  const TM = QS.get('tm') || 'neutral';
  renderer.toneMapping = TM === 'aces' ? THREE.ACESFilmicToneMapping : (TM === 'agx' ? THREE.AgXToneMapping : THREE.NeutralToneMapping);
  renderer.toneMappingExposure = parseFloat(QS.get('ex')) || (TM === 'aces' ? 0.42 : (TM === 'agx' ? 0.62 : 0.5));
  const LK = parseFloat(QS.get('lk')) || 1.0;   // light multiplier (testing)
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = !LOW;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const FOG = new THREE.Color(0xcfe3f6);
  scene.fog = new THREE.Fog(FOG, 900, 5200);
  const camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.3, 30000);

  // ---------------- sky + sun
  const sunDir = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - 30), THREE.MathUtils.degToRad(78));
  function makeSky(scale) {
    const s = new Sky();
    s.scale.setScalar(scale);
    const u = s.material.uniforms;
    u.turbidity.value = 1.25; u.rayleigh.value = 3.0; u.mieCoefficient.value = 0.0028; u.mieDirectionalG.value = 0.87;
    u.sunPosition.value.copy(sunDir);
    return s;
  }
  const sky = makeSky(20000);
  scene.add(sky);
  // environment map from the sky (bright reflections on the rocket)
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  envScene.add(makeSky(10000));
  const envGround = new THREE.Mesh(new THREE.CircleGeometry(4000, 32), new THREE.MeshBasicMaterial({ color: 0xbfc7cf }));
  envGround.rotation.x = -Math.PI / 2; envGround.position.y = -40;
  envScene.add(envGround);
  const envRT = pmrem.fromScene(envScene, 0.02, 1, 25000);
  scene.environment = envRT.texture;
  scene.environmentIntensity = 0.55 * LK;

  const sunLight = new THREE.DirectionalLight(0xffe7c8, 4.4 * LK);
  sunLight.position.copy(sunDir).multiplyScalar(500);
  sunLight.castShadow = !LOW;
  if (!LOW) {
    sunLight.shadow.mapSize.set(2048, 2048);
    const sc = sunLight.shadow.camera; sc.left = -80; sc.right = 80; sc.top = 80; sc.bottom = -80; sc.near = 50; sc.far = 1200;
    sunLight.shadow.bias = -0.0004; sunLight.shadow.normalBias = 0.04;
  }
  scene.add(sunLight); scene.add(sunLight.target);
  scene.add(new THREE.HemisphereLight(0xcfe5ff, 0xd9cfbd, 0.55 * LK));

  // ---------------- canvas textures
  function canvasTex(w, h, draw, repeat) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d'); draw(g, w, h);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat); }
    return t;
  }
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const groundTex = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#dccaa6'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) { const a = rnd() * 0.12; g.fillStyle = rnd() > 0.5 ? `rgba(140,112,70,${a})` : `rgba(255,248,232,${a})`; g.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 3, 1 + rnd() * 3); }
  }, 60);
  const softTex = canvasTex(128, 128, (g, w, h) => {
    const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.45, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });
  const cloudAtlas = canvasTex(512, 512, (g, w, h) => {
    const cw = w / 2;
    for (let k = 0; k < 4; k++) {
      const ox = (k % 2) * cw, oy = Math.floor(k / 2) * cw;
      for (let i = 0; i < 26; i++) {
        const x = ox + cw * (0.25 + rnd() * 0.5), y = oy + cw * (0.38 + rnd() * 0.3), r = cw * (0.10 + rnd() * 0.16);
        const gr = g.createRadialGradient(x, y - r * 0.2, 0, x, y, r);
        gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(0.6, 'rgba(246,249,253,0.55)'); gr.addColorStop(1, 'rgba(232,240,250,0)');
        g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
      }
    }
  });
  const cloudSeaTex = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 380; i++) {
      const x = rnd() * w, y = rnd() * h, r = 8 + rnd() * 40;
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, 'rgba(210,222,238,0.42)'); gr.addColorStop(1, 'rgba(210,222,238,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    }
  }, 14);

  // ---------------- ground, sea, launch site, factories (generic shapes, no logos)
  const PAD_TOP = 2.4;
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(9000, 9000), new THREE.MeshStandardMaterial({ map: groundTex, roughness: 0.96, metalness: 0 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(14000, 7000), new THREE.MeshStandardMaterial({ color: 0x2f86cc, roughness: 0.12, metalness: 0.1 }));
  sea.rotation.x = -Math.PI / 2; sea.position.set(0, 0.06, -3800); scene.add(sea);
  const beach = new THREE.Mesh(new THREE.PlaneGeometry(14000, 60), new THREE.MeshStandardMaterial({ color: 0xeee4cc, roughness: 1 }));
  beach.rotation.x = -Math.PI / 2; beach.position.set(0, 0.05, -290); scene.add(beach);

  const M = {
    concrete: new THREE.MeshStandardMaterial({ color: 0xbfbcb4, roughness: 0.9 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x3a3f47, roughness: 0.6, metalness: 0.4 }),
    steel: new THREE.MeshStandardMaterial({ color: 0xc8cdd4, roughness: 0.45, metalness: 0.65 }),
    wall: new THREE.MeshStandardMaterial({ color: 0xf0f2f5, roughness: 0.7 }),
    roof: new THREE.MeshStandardMaterial({ color: 0x8b98a6, roughness: 0.55, metalness: 0.3 }),
    glass: new THREE.MeshStandardMaterial({ color: 0x9cc7ee, roughness: 0.15, metalness: 0.5, emissive: 0x1a3a5a, emissiveIntensity: 0.25 }),
    road: new THREE.MeshStandardMaterial({ color: 0xa8a49b, roughness: 0.95 }),
    solar: new THREE.MeshStandardMaterial({ color: 0x23426d, roughness: 0.25, metalness: 0.55 }),
    white: new THREE.MeshStandardMaterial({ color: 0xf4f6f8, roughness: 0.5 }),
  };
  const site = new THREE.Group(); scene.add(site);
  function box(w, h, d, mat, x, y, z, cast = true) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = cast && !LOW; m.receiveShadow = !LOW; site.add(m); return m;
  }
  // pad
  box(36, 1.2, 36, M.concrete, 0, 0.6, 0);
  box(9, 1.25, 30, M.dark, 0, 0.62, -6, false);
  box(5.2, 1.2, 5.2, M.dark, 0, 1.8, 0);
  // tower (generic lattice)
  const TX = 8.6, TH = 50;
  const towerMat = M.steel;
  [[-1.6, -1.6], [1.6, -1.6], [-1.6, 1.6], [1.6, 1.6]].forEach(([dx, dz]) => box(0.42, TH, 0.42, towerMat, TX + dx, TH / 2 + 1.2, dz));
  const braceGeo = new THREE.BoxGeometry(3.2, 0.18, 0.18);
  const nBr = LOW ? 12 : 24;
  const braces = new THREE.InstancedMesh(braceGeo, towerMat, nBr * 4 + nBr * 2);
  const tmpM = new THREE.Object3D(); let bi = 0;
  for (let k = 0; k < nBr; k++) {
    const y = 1.2 + (k + 0.5) * TH / nBr;
    [[0, -1.6, 0], [0, 1.6, 0], [-1.6, 0, Math.PI / 2], [1.6, 0, Math.PI / 2]].forEach(([dx, dz, ry]) => {
      tmpM.position.set(TX + dx, y, dz); tmpM.rotation.set(0, ry, 0); tmpM.updateMatrix(); braces.setMatrixAt(bi++, tmpM.matrix);
    });
    [[-1.6, Math.PI / 2], [1.6, Math.PI / 2]].forEach(([dx, ry]) => {
      tmpM.position.set(TX + dx, y + TH / nBr / 2, 0); tmpM.rotation.set((k % 2 ? 1 : -1) * 0.9, ry, 0); tmpM.scale.set(1.25, 1, 1); tmpM.updateMatrix(); braces.setMatrixAt(bi++, tmpM.matrix); tmpM.scale.set(1, 1, 1);
    });
  }
  braces.count = bi; braces.castShadow = !LOW; site.add(braces);
  box(7.2, 0.8, 1.2, M.dark, TX - 4.4, 30, 0);       // service arm
  box(1.4, 1.4, 1.4, M.dark, TX - 1.2, 30, 0);
  box(10, 0.9, 1.0, towerMat, TX + 1.5, TH + 1.6, 0); // top crane
  // tanks & water tower
  [[78, 62], [92, 54], [86, 76]].forEach(([x, z]) => {
    const s = new THREE.Mesh(new THREE.SphereGeometry(6.5, 28, 18), M.white); s.position.set(x, 8.2, z); s.castShadow = !LOW; site.add(s);
    box(0.6, 7, 0.6, M.steel, x, 3.5, z, false);
  });
  const wt = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 6, 24), M.white); wt.position.set(-80, 22, 90); site.add(wt);
  box(1.2, 19, 1.2, M.steel, -80, 9.5, 90);
  // factories: three hangars with curved roofs + vertical assembly building
  function hangar(x, z, L, H, W) {
    box(W, H, L, M.wall, x, H / 2, z);
    const roof = new THREE.Mesh(new THREE.CylinderGeometry(W / 2, W / 2, L, 28, 1, false, 0, Math.PI), M.roof);
    roof.rotation.z = Math.PI / 2; roof.rotation.y = Math.PI / 2; roof.position.set(x, H, z); roof.scale.set(0.38, 1, 1); roof.castShadow = !LOW; site.add(roof);
    for (let k = 0; k < 2; k++) box(0.25, 2.2, L * 0.86, M.glass, x + (k ? W / 2 + 0.1 : -W / 2 - 0.1), H * 0.62, z, false);
    box(W * 0.62, H * 0.55, 0.3, M.dark, x, H * 0.28, z + L / 2 + 0.15, false);
  }
  hangar(-250, -170, 110, 24, 44);
  hangar(-312, -170, 110, 24, 44);
  hangar(-280, -50, 80, 20, 36);
  box(40, 64, 34, M.wall, -200, 32, -280);
  box(16, 50, 0.4, M.dark, -200, 25, -262.8, false);
  // data-center style low building with rooftop units
  box(70, 12, 34, M.wall, 240, 6, -160);
  const ru = new THREE.InstancedMesh(new THREE.BoxGeometry(5, 2.2, 5), M.steel, 24);
  for (let k = 0; k < 24; k++) { tmpM.position.set(214 + (k % 8) * 7.5, 13.1, -172 + Math.floor(k / 8) * 11); tmpM.rotation.set(0, 0, 0); tmpM.updateMatrix(); ru.setMatrixAt(k, tmpM.matrix); }
  site.add(ru);
  // solar field + battery containers (generic)
  const nSol = LOW ? 120 : 300;
  const sol = new THREE.InstancedMesh(new THREE.BoxGeometry(6, 0.12, 3), M.solar, nSol);
  for (let k = 0; k < nSol; k++) {
    tmpM.position.set(110 + (k % 20) * 7, 1.6, 170 + Math.floor(k / 20) * 5.2); tmpM.rotation.set(-0.45, 0, 0); tmpM.updateMatrix(); sol.setMatrixAt(k, tmpM.matrix);
  }
  site.add(sol);
  const bat = new THREE.InstancedMesh(new THREE.BoxGeometry(4.4, 2.8, 1.8), M.white, 40);
  for (let k = 0; k < 40; k++) { tmpM.position.set(120 + (k % 10) * 5.4, 1.4, 140 + Math.floor(k / 10) * 4.2); tmpM.rotation.set(0, 0, 0); tmpM.updateMatrix(); bat.setMatrixAt(k, tmpM.matrix); }
  bat.castShadow = !LOW; site.add(bat);
  // ground-station dishes (generic)
  for (let k = 0; k < 6; k++) {
    const g = new THREE.Group();
    const dish = new THREE.Mesh(new THREE.SphereGeometry(4.2, 24, 12, 0, Math.PI * 2, 0, 0.9), M.white); dish.material.side = THREE.DoubleSide; dish.rotation.x = Math.PI * 0.78;
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 5, 10), M.steel); post.position.y = -2.6;
    g.add(dish); g.add(post); g.position.set(200 + (k % 3) * 14, 6, 10 + Math.floor(k / 3) * 14); g.rotation.y = 0.6; site.add(g);
  }
  // roads
  [[0, 0.03, 140, 14, 260, 0], [-150, 0.03, -110, 300, 12, 0], [140, 0.03, 60, 260, 10, 0]].forEach(([x, y, z, w, d]) => {
    const r = new THREE.Mesh(new THREE.PlaneGeometry(w, d), M.road); r.rotation.x = -Math.PI / 2; r.position.set(x, y, z); r.receiveShadow = !LOW; site.add(r);
  });

  // ---------------- rocket (generic, 5 stages; height ∝ LTM revenue share)
  const R = 1.55, HTOT = 32;
  const H = ST.map(s => s.share * HTOT);
  const Y0 = []; let acc = 0; H.forEach(h => { Y0.push(acc); acc += h; });
  const TOPY = acc;
  const rocket = new THREE.Group(); scene.add(rocket);
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xf3f5f8, roughness: 0.34, metalness: 0.12, envMapIntensity: 1.0 });
  const ringMat = new THREE.MeshStandardMaterial({ color: 0x2f343c, roughness: 0.4, metalness: 0.7 });
  const nozMat = new THREE.MeshStandardMaterial({ color: 0x2a2b30, roughness: 0.32, metalness: 0.9, side: THREE.DoubleSide });
  const nozProfile = [[0.24, 0.1], [0.2, 0], [0.18, -0.15], [0.26, -0.42], [0.4, -0.78], [0.54, -1.08], [0.62, -1.32]].map(([x, y]) => new THREE.Vector2(x, y));
  const nozGeo = new THREE.LatheGeometry(nozProfile, LOW ? 16 : 28);
  const SEG = LOW ? 40 : 72;
  const stages = [];
  const BAND_AZ = [1.0, -0.22, 0.82, -0.42, 0.6];   // camera azimuth of each stage's chapter
  function bandTexture(s, bh) {
    const circ = 2 * Math.PI * R;
    const hpx = 128, wpx = Math.min(4096, Math.round(hpx * circ / bh));
    return canvasTex(wpx, hpx, (g, w, h) => {
      g.fillStyle = s.color; g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(0, 0, w, h * 0.1); g.fillRect(0, h * 0.9, w, h * 0.1);
      g.fillStyle = '#ffffff';
      const txt = `0${s.idx}  ${s.name}  ·  ${s.disp.share}`;
      let fs = Math.round(h * 0.44);
      const fam = '-apple-system, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif';
      g.font = `700 ${fs}px ${fam}`;
      const tw = g.measureText(txt).width;
      if (tw > w * 0.42) { fs = Math.floor(fs * w * 0.42 / tw); g.font = `700 ${fs}px ${fam}`; }
      g.textAlign = 'center'; g.textBaseline = 'middle';
      [0.13, 0.63].forEach(u => g.fillText(txt, w * u, h * 0.54));
    });
  }
  ST.forEach((s, i) => {
    const h = H[i];
    const g = new THREE.Group(); g.position.y = Y0[i];
    const body = new THREE.Mesh(new THREE.CylinderGeometry(R, R, h, SEG, 1, false), bodyMat);
    body.position.y = h / 2; body.castShadow = !LOW; g.add(body);
    const bh = Math.max(0.42, Math.min(1.25, h * 0.3));
    const band = new THREE.Mesh(new THREE.CylinderGeometry(R * 1.004, R * 1.004, bh, SEG, 1, true), new THREE.MeshStandardMaterial({ map: bandTexture(s, bh), roughness: 0.42, metalness: 0.05 }));
    band.position.y = h - bh / 2 - Math.min(0.32, h * 0.1); g.add(band);
    band.rotation.y = BAND_AZ[i] - 0.13 * Math.PI * 2;
    // thin accent stripe at the bottom of each stage
    const stripe = new THREE.Mesh(new THREE.CylinderGeometry(R * 1.003, R * 1.003, Math.min(0.12, h * 0.06), SEG, 1, true), new THREE.MeshStandardMaterial({ color: s.color, roughness: 0.4 }));
    stripe.position.y = Math.min(0.24, h * 0.12); g.add(stripe);
    if (i < ST.length - 1) {
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(R * 1.014, R * 1.014, 0.16, SEG, 1, true), ringMat);
      ring.position.y = h - 0.08; g.add(ring);
    }
    // engines
    const eng = new THREE.Group(); g.add(eng);
    if (i === 0) {
      const sc = 0.66;
      const pos = [[0, 0]]; for (let k = 0; k < 8; k++) pos.push([Math.cos(k / 8 * Math.PI * 2) * 1.04, Math.sin(k / 8 * Math.PI * 2) * 1.04]);
      pos.forEach(([x, z]) => { const n = new THREE.Mesh(nozGeo, nozMat); n.scale.setScalar(sc); n.position.set(x, 0, z); eng.add(n); });
      const skirt = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.99, R * 1.02, 0.5, SEG, 1, true), ringMat); skirt.position.y = 0.25; g.add(skirt);
      // generic legs & fins
      for (let k = 0; k < 4; k++) {
        const a = k / 4 * Math.PI * 2 + Math.PI / 4;
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.22, 7.2, 0.36), ringMat);
        leg.position.set(Math.cos(a) * (R + 0.1), 4.2, Math.sin(a) * (R + 0.1)); leg.rotation.y = -a; g.add(leg);
        const fin = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.9, 0.9), ringMat);
        fin.position.set(Math.cos(a) * (R + 0.45), h - 1.25, Math.sin(a) * (R + 0.45)); fin.rotation.y = -a; g.add(fin);
      }
    } else {
      const n = new THREE.Mesh(nozGeo, nozMat); n.scale.setScalar(i === 4 ? 0.62 : 0.8); eng.add(n);
    }
    rocket.add(g);
    stages.push({ g, h, i, data: s, exitY: i === 0 ? -1.32 * 0.66 : -1.32 * (i === 4 ? 0.62 : 0.8), exitR: i === 0 ? 1.3 : (i === 4 ? 0.38 : 0.5) });
  });
  // fairing (two halves) + generic payload
  const HN = 4.9;
  const fpts = []; for (let k = 0; k <= 24; k++) { const y = k / 24 * HN; const r = R * Math.pow(1 - Math.pow(y / HN, 1.9), 0.62); fpts.push(new THREE.Vector2(Math.max(r, 0.001), y)); }
  const fairing = new THREE.Group(); fairing.position.y = TOPY; rocket.add(fairing);
  const halves = [0, 1].map(k => {
    const pivot = new THREE.Group(); pivot.position.x = k === 0 ? R : -R;
    const geo = new THREE.LatheGeometry(fpts, LOW ? 24 : 48, k === 0 ? 0 : Math.PI, Math.PI);
    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xf6f7f9, roughness: 0.3, metalness: 0.1, side: THREE.DoubleSide, transparent: true, opacity: 1 }));
    mesh.position.x = k === 0 ? -R : R; mesh.castShadow = !LOW;
    pivot.add(mesh); fairing.add(pivot);
    return { pivot, mesh, dir: k === 0 ? 1 : -1 };
  });
  const payload = new THREE.Group(); payload.position.y = TOPY + 0.75; rocket.add(payload);
  const pb = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.9, 0.8), new THREE.MeshStandardMaterial({ color: 0xc9b37a, roughness: 0.35, metalness: 0.8 }));
  payload.add(pb);
  [-1, 1].forEach(sgn => { const p = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.04, 0.7), M.solar); p.position.set(sgn * 1.45, 0.1, 0); payload.add(p); });
  const dsh = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 8, 0, Math.PI * 2, 0, 1.0), M.white); dsh.material.side = THREE.DoubleSide; dsh.position.set(0, 0.62, 0); payload.add(dsh);

  // ---------------- engine flames (shader) + glow
  const flameVS = `varying vec2 vUv; varying float vFres; void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position,1.0);
      vec3 n = normalize(normalMatrix * normal); vFres = abs(dot(n, normalize(-mv.xyz))); gl_Position = projectionMatrix * mv; }`;
  const flameFS = `uniform float uTime; uniform float uI; uniform vec3 uCore; uniform vec3 uEdge; varying vec2 vUv; varying float vFres;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
      float n2(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.0-2.0*f);
        return mix(mix(h(i), h(i+vec2(1.0,0.0)), u.x), mix(h(i+vec2(0.0,1.0)), h(i+vec2(1.0,1.0)), u.x), u.y); }
      void main(){ float d = 1.0 - vUv.y; float nz = n2(vec2(vUv.x*10.0, d*7.0 - uTime*14.0)) * 0.6 + n2(vec2(vUv.x*23.0, d*15.0 - uTime*25.0)) * 0.4;
        float a = smoothstep(1.0, 0.05, d + nz*0.32) * pow(vFres, 1.4) * uI;
        vec3 col = mix(uCore, uEdge, smoothstep(0.0, 0.75, d + nz*0.15)) * (1.6 + 1.6*(1.0-d));
        gl_FragColor = vec4(col, a);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`;
  function flameMat(core, edge) {
    return new THREE.ShaderMaterial({ uniforms: { uTime: { value: 0 }, uI: { value: 0 }, uCore: { value: new THREE.Color(core) }, uEdge: { value: new THREE.Color(edge) } },
      vertexShader: flameVS, fragmentShader: flameFS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  }
  const glowMatBase = new THREE.SpriteMaterial({ map: softTex, color: 0xffd9a0, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 });
  stages.forEach((st) => {
    const big = st.i === 0;
    const len = big ? 13 : 6.5, r0 = st.exitR, r1 = big ? r0 * 0.55 : r0 * 2.1;
    const grp = new THREE.Group(); grp.position.y = st.exitY; st.g.add(grp);
    const outer = new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, len, 28, 10, true), flameMat(big ? 0xfff1d0 : 0xcfe0ff, big ? 0xff7a2a : 0x4f86ff));
    outer.renderOrder = 10;
    outer.position.y = -len / 2; grp.add(outer);
    const inner = new THREE.Mesh(new THREE.CylinderGeometry(r0 * 0.62, r1 * 0.35, len * 0.55, 20, 6, true), flameMat(0xffffff, big ? 0xffb25a : 0x9fbfff));
    inner.renderOrder = 11;
    inner.position.y = -len * 0.275; grp.add(inner);
    const glow = new THREE.Sprite(glowMatBase.clone()); glow.scale.setScalar(big ? 9 : 4.2); glow.position.y = -0.4; glow.renderOrder = 12; grp.add(glow);
    grp.visible = false;
    st.flame = { grp, mats: [outer.material, inner.material], glow, k: big ? 1 : 0.5 };
  });

  // ---------------- billboard particles (smoke, contrail, clouds) — one draw call each
  const bbVS = `attribute vec3 iOffset; attribute vec4 iData; uniform float uAtlas; uniform float fogNear; uniform float fogFar;
      varying vec2 vUv; varying float vA; varying float vFog;
      void main(){ vec4 mv = modelViewMatrix * vec4(iOffset, 1.0); float c = cos(iData.z), s = sin(iData.z);
        vec2 p = mat2(c, s, -s, c) * position.xy * iData.x; mv.xy += p; gl_Position = projectionMatrix * mv;
        vec2 cell = vec2(mod(iData.w, uAtlas), floor(iData.w / uAtlas)); vUv = (uv + cell) / uAtlas; vA = iData.y;
        vFog = smoothstep(fogNear, fogFar, -mv.z); }`;
  const bbFS = `uniform sampler2D map; uniform vec3 uColor; uniform vec3 fogColor; varying vec2 vUv; varying float vA; varying float vFog;
      void main(){ vec4 t = texture2D(map, vUv); float a = t.a * vA * (1.0 - vFog * 0.9); if (a < 0.004) discard;
        gl_FragColor = vec4(mix(uColor * t.rgb, fogColor, vFog), a);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`;
  function billboards(n, map, color, atlas = 1) {
    const base = new THREE.PlaneGeometry(1, 1);
    const geo = new THREE.InstancedBufferGeometry();
    geo.index = base.index; geo.setAttribute('position', base.getAttribute('position')); geo.setAttribute('uv', base.getAttribute('uv'));
    const off = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3); off.setUsage(THREE.DynamicDrawUsage);
    const dat = new THREE.InstancedBufferAttribute(new Float32Array(n * 4), 4); dat.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('iOffset', off); geo.setAttribute('iData', dat); geo.instanceCount = n;
    const mat = new THREE.ShaderMaterial({ uniforms: { map: { value: map }, uColor: { value: new THREE.Color(color) }, uAtlas: { value: atlas },
      fogColor: { value: FOG }, fogNear: { value: 900 }, fogFar: { value: 5600 } }, vertexShader: bbVS, fragmentShader: bbFS, transparent: true, depthWrite: false });
    const mesh = new THREE.Mesh(geo, mat); mesh.frustumCulled = false;
    return { mesh, off, dat, n };
  }
  // clouds: a deck the rocket punches through + distant banks
  const NCL = LOW ? 70 : 170;
  const clouds = billboards(NCL, cloudAtlas, 0xffffff, 2);
  clouds.mesh.material.uniforms.uColor.value.setScalar(2.15);
  for (let k = 0; k < NCL; k++) {
    const far = k > NCL * 0.62;
    const a = rnd() * Math.PI * 2, rr = far ? 1000 + rnd() * 1500 : 170 + Math.pow(rnd(), 0.7) * 650;
    const y = far ? 40 + rnd() * 120 : 70 + rnd() * 30;
    clouds.off.setXYZ(k, Math.cos(a) * rr, y, Math.sin(a) * rr);
    clouds.dat.setXYZW(k, (far ? 260 : 70) + rnd() * (far ? 380 : 120), far ? 0.85 : 0.9, rnd() * 6.28, Math.floor(rnd() * 4));
  }
  scene.add(clouds.mesh);
  const cloudSea = new THREE.Mesh(new THREE.PlaneGeometry(16000, 16000), new THREE.MeshBasicMaterial({ map: cloudSeaTex, transparent: true, opacity: 0, color: 0xffffff, depthWrite: false, fog: true }));
  cloudSea.material.color.setScalar(2.05);
  cloudSea.rotation.x = -Math.PI / 2; cloudSea.position.y = 58; scene.add(cloudSea);
  // pad smoke + contrail
  const NSM = LOW ? 90 : 240, NTR = LOW ? 90 : 170;
  const smoke = billboards(NSM, softTex, 0xf4f4f2);
  const trail = billboards(NTR, softTex, 0xf7f7f5);
  smoke.mesh.material.uniforms.uColor.value.setScalar(1.75); trail.mesh.material.uniforms.uColor.value.setScalar(1.85);
  smoke.mesh.renderOrder = 5; trail.mesh.renderOrder = 4; clouds.mesh.renderOrder = 2;
  scene.add(smoke.mesh); scene.add(trail.mesh);
  const smokeSeed = []; for (let k = 0; k < NSM; k++) smokeSeed.push([rnd() * Math.PI * 2, 1 + rnd() * 4, rnd(), rnd(), rnd() * 6.28]);

  // ---------------- post-processing
  let composer = null, bloom = null;
  if (!LOW) {
    composer = new EffectComposer(renderer);
    composer.setPixelRatio(DPR);
    composer.setSize(window.innerWidth, window.innerHeight);
    composer.addPass(new RenderPass(scene, camera));
    bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.5, 0.45, 4.0);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
    // gentle cinematic grade (display space): vibrance + a touch of contrast
    composer.addPass(new ShaderPass({
      uniforms: { tDiffuse: { value: null }, uVib: { value: 0.28 }, uCon: { value: 1.06 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `uniform sampler2D tDiffuse; uniform float uVib; uniform float uCon; varying vec2 vUv;
        void main(){ vec4 c = texture2D(tDiffuse, vUv); vec3 col = c.rgb; float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
          float sat = max(col.r, max(col.g, col.b)) - min(col.r, min(col.g, col.b));
          col = mix(vec3(l), col, 1.0 + uVib * (1.0 - sat)); col = (col - 0.5) * uCon + 0.5;
          gl_FragColor = vec4(clamp(col, 0.0, 1.0), c.a); }`,
    }));
  }

  // ---------------- mission timeline
  const TS = [2.15, 3.15, 4.15, 5.15];   // separations of stages 0..3
  const TF = 6.15;                        // fairing separation
  const BURN = [[1.0, 2.15], [2.33, 3.15], [3.33, 4.15], [4.33, 5.15], [5.33, 6.95]];
  function altitude(T) {
    if (T < 1.15) return 0;
    if (T < 2) { const u = (T - 1.15) / 0.85; return 90 * u * u; }
    return 90 + 200 * (Math.min(T, 7.05) - 2) + (T > 7.05 ? 12 * (T - 7.05) : 0);
  }
  const SIDE = [1, -1, 1, -1, 1];       // panel side per stage: 1 = panel right
  const SHOT = [   // camera shots (stage-centred chapters)
    { T: 0.0, d: 88, az: 0.42, h: -1.5, fov: 36, x: 0.34, y: 0.0, tgt: 'rocket' },
    { T: 0.9, d: 74, az: 0.56, h: 0.5, fov: 36, x: 0.3, y: 0.0, tgt: 'rocket' },
    { T: 1.55, d: 66, az: 0.74, h: -9, fov: 40, x: 0.26, y: 0.05, tgt: 'rocket' },
    { T: 2.3, d: 64, az: 1.0, h: -5, fov: 38, x: -0.27, y: -0.02, tgt: 0 },
    { T: 3.3, d: 25, az: -0.22, h: 2.6, fov: 38, x: 0.27, y: -0.04, tgt: 1 },
    { T: 4.3, d: 27, az: 0.82, h: -2.2, fov: 38, x: -0.27, y: -0.04, tgt: 2 },
    { T: 5.3, d: 23, az: -0.42, h: 2.5, fov: 38, x: 0.27, y: -0.04, tgt: 3 },
    { T: 6.3, d: 21, az: 0.6, h: -1.6, fov: 38, x: -0.27, y: -0.02, tgt: 4 },
    { T: 7.32, d: 96, az: 0.32, h: 16, fov: 34, x: -0.44, y: 0.02, tgt: 'lineup' },
    { T: 8.0, d: 94, az: 0.42, h: 16, fov: 34, x: -0.44, y: 0.02, tgt: 'lineup' },
  ];
  const GAP = 1.7;
  const tmpV = new THREE.Vector3(), tmpV2 = new THREE.Vector3(), camRight = new THREE.Vector3(), camUp = new THREE.Vector3();
  const sepLocal = stages.map(() => new THREE.Vector3());

  function hash1(x) { const s = Math.sin(x * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }
  function stageVisH(i) { const sh = SHOT[3 + i] || SHOT[7]; return 2 * sh.d * Math.tan(THREE.MathUtils.degToRad(sh.fov / 2)); }

  function updateScene(T, time) {
    const a = altitude(T);
    rocket.position.set(0, PAD_TOP + a, 0);
    const fin = smooth(7.0, 7.42, T);               // reassembly into the exploded lineup
    rocket.rotation.y = fin * (0.35 + (REDUCED ? 0 : time * 0.06));
    // stage transforms
    stages.forEach((st, i) => {
      let off = sepLocal[i].set(0, 0, 0), rx = 0, rz = 0, op = 1;
      if (i < 4 && T > TS[i]) {
        const dt = T - TS[i], vh = stageVisH(i);
        const az = SHOT[3 + i].az;
        const side = -SIDE[i];                         // drift away from the panel
        const fall = vh * (0.12 * dt + 0.33 * dt * dt + (dt > 1 ? 0.6 * (dt - 1) * (dt - 1) : 0));
        const lat = side * vh * 0.07 * dt;
        off.set(Math.cos(az) * lat, -fall, -Math.sin(az) * lat);
        rx = 0.22 * dt * side; rz = 0.3 * dt;
        op = 1 - smooth(1.05, 1.6, dt);
      }
      // final exploded lineup
      st.g.position.set(lerp(off.x, 0, fin), Y0[i] + lerp(off.y, GAP * i, fin), lerp(off.z, 0, fin));
      st.g.rotation.set(rx * (1 - fin), 0, rz * (1 - fin));
      const vis = Math.max(op, fin);
      st.g.visible = vis > 0.01;
      // burn
      const [b0, b1] = BURN[i];
      const I = (T >= b0 && T <= b1 + 0.05) ? smooth(b0, b0 + 0.07, T) * (1 - smooth(b1, b1 + 0.04, T)) : 0;
      const f = st.flame;
      f.grp.visible = I > 0.005;
      if (f.grp.visible) {
        const flick = 0.92 + 0.08 * Math.sin(time * 37 + i) * Math.sin(time * 23.1);
        f.mats.forEach(m => { m.uniforms.uTime.value = time; m.uniforms.uI.value = I * flick * f.k; });
        f.glow.material.opacity = (st.i === 0 ? 0.85 : 0.55) * I;
        const sc = i === 0 ? 1 + 0.35 * smooth(1.0, 1.4, T) : 1;
        f.grp.scale.set(1, sc, 1);
      }
    });
    // fairing + payload
    const fdt = T - TF;
    const openA = fdt > 0 ? 1 - Math.pow(1 - clamp(fdt / 0.9), 2) : 0;
    const fairY = TOPY + GAP * 5 * fin;
    fairing.position.set(0, fairY, 0);
    halves.forEach(hv => {
      const o = openA * (1 - fin);
      hv.pivot.rotation.z = -hv.dir * o * 1.05;
      hv.pivot.position.set(hv.dir * (R + o * 3.2), -o * 2.4, 0);
      const opv = 1 - smooth(0.75, 1.0, o) * 0.85;
      hv.mesh.material.opacity = opv;
      hv.mesh.material.transparent = opv < 0.999;
    });
    payload.position.set(0, TOPY + 0.75 + GAP * 4 * fin + 0.0, 0);
    payload.visible = fdt > 0 || fin > 0.5;
    payload.rotation.y = fdt > 0 ? fdt * 0.6 : 0;
    // smoke at pad
    const sOn = smooth(1.0, 1.08, T) * (1 - smooth(1.9, 2.7, T));
    smoke.mesh.visible = sOn > 0.002;
    if (smoke.mesh.visible) {
      const s = clamp((T - 1.0) / 0.95);
      for (let k = 0; k < NSM; k++) {
        const [ang, r0, u1, u2, rot] = smokeSeed[k];
        const rr = r0 + (14 + 34 * u1) * Math.pow(s, 0.6);
        smoke.off.setXYZ(k, Math.cos(ang) * rr, 1.5 + 2 + (3 + 9 * u2) * s, Math.sin(ang) * rr * 0.9 - 4 * s);
        smoke.dat.setXYZW(k, 5 + 16 * s * (0.6 + u2), 0.62 * sOn, rot + s * 0.6, 0);
      }
      smoke.off.needsUpdate = true; smoke.dat.needsUpdate = true;
    }
    // contrail from the active engine
    let activeExit = null;
    for (let i = 0; i < 5; i++) { const [b0, b1] = BURN[i]; if (T >= b0 + 0.02 && T <= b1) { activeExit = i; break; } }
    const exitY = PAD_TOP + a + (activeExit != null ? Y0[activeExit] + stages[activeExit].exitY : (T > 6.95 ? Y0[4] + stages[4].exitY : 0));
    const trailFade = 1 - smooth(6.9, 7.2, T);
    trail.mesh.visible = T > 1.12 && trailFade > 0.01;
    if (trail.mesh.visible) {
      const sp = 2.8;
      const base = Math.floor(Math.max(0, exitY - NTR * sp - 10) / sp) * sp;
      for (let k = 0; k < NTR; k++) {
        const yk = PAD_TOP + 4 + k * sp + base;
        const hk = Math.round(yk / sp);
        const jx = hash1(hk * 1.37) - 0.5, jz = hash1(hk * 2.11 + 4.1) - 0.5, rot = hash1(hk * 0.73) * 6.28, u = hash1(hk * 3.3 + 1.7);
        const age = (exitY - yk) / 90;
        const show = yk < exitY - 1.5;
        trail.off.setXYZ(k, jx * (1 + age * 3) + age * 6, yk, jz * (1 + age * 3));
        trail.dat.setXYZW(k, show ? 1.8 + 4.5 * Math.min(age, 4) * (0.7 + 0.6 * u) : 0, show ? 0.55 * Math.exp(-age * 0.55) * smooth(0, 0.06, age) * trailFade : 0, rot, 0);
      }
      trail.off.needsUpdate = true; trail.dat.needsUpdate = true;
    }
    // shadows only near the ground
    if (renderer.shadowMap.enabled) renderer.shadowMap.autoUpdate = T < 2.2;
  }

  // world-space targets
  function targetPos(spec, out) {
    if (spec === 'rocket') return out.set(0, rocket.position.y + 15, 0);
    if (spec === 'lineup') return out.set(0, rocket.position.y + (TOPY + GAP * 5 + HN) / 2, 0);
    const st = stages[spec];
    st.g.updateMatrixWorld();
    return st.g.localToWorld(out.set(0, st.h / 2, 0));
  }
  const camPos = new THREE.Vector3(), camTgt = new THREE.Vector3(), tA = new THREE.Vector3(), tB = new THREE.Vector3();
  function updateCamera(T, time) {
    let k = 0; while (k < SHOT.length - 2 && T > SHOT[k + 1].T) k++;
    const A = SHOT[k], B = SHOT[k + 1];
    const span = B.T - A.T;
    const s = smooth(A.T + 0.3 * span, B.T, T);
    rocket.updateMatrixWorld(true);
    targetPos(A.tgt, tA); targetPos(B.tgt, tB);
    camTgt.lerpVectors(tA, tB, s);
    const d = lerp(A.d, B.d, s), az = lerp(A.az, B.az, s) + (REDUCED ? 0 : Math.sin(time * 0.15) * 0.02), hh = lerp(A.h, B.h, s);
    const fov = lerp(A.fov, B.fov, s);
    const aspect = window.innerWidth / window.innerHeight;
    const mob = aspect < 0.9;
    let xN = lerp(A.x, B.x, s), yN = lerp(A.y, B.y, s);
    let dd = d;
    if (mob) { xN = 0; yN = T < 1.9 ? -0.2 : 0.22; dd = d * (T < 1.9 ? 1.15 : 1.3); }
    camera.fov = fov; camera.aspect = aspect;
    camPos.set(camTgt.x + Math.sin(az) * dd, camTgt.y + hh, camTgt.z + Math.cos(az) * dd);
    // shift so the subject sits off-centre (room for panels)
    camRight.set(Math.cos(az), 0, -Math.sin(az));
    const halfH = dd * Math.tan(THREE.MathUtils.degToRad(fov / 2)), halfW = halfH * aspect;
    const shift = tmpV.copy(camRight).multiplyScalar(-xN * halfW);
    camUp.set(0, 1, 0);
    shift.addScaledVector(camUp, -yN * halfH);
    camera.position.copy(camPos).add(shift);
    if (camera.position.y < 1.5) camera.position.y = 1.5;
    camera.lookAt(tmpV2.copy(camTgt).add(shift));
    camera.updateProjectionMatrix();
    // cloud sea visible only from above
    const cy = camera.position.y;
    cloudSea.material.opacity = smooth(85, 160, cy) * 0.96;
    cloudSea.visible = cloudSea.material.opacity > 0.01;
    ground.visible = sea.visible = site.visible = cy < 1400 || !cloudSea.visible;
    sunLight.target.position.set(0, 0, 0);
  }

  // ---------------- overlays tied to 3D (leader line & final labels)
  const leaderLine = $('#leader-line'), leaderDot = $('#leader-dot');
  const labelEls = [...document.querySelectorAll('#labels .slabel')];
  const proj = new THREE.Vector3();
  function toScreen(v) { proj.copy(v).project(camera); return [(proj.x * 0.5 + 0.5) * window.innerWidth, (-proj.y * 0.5 + 0.5) * window.innerHeight, proj.z]; }
  function updateLeader(T) {
    const c = Math.floor(T), t = T - c;
    const panel = document.querySelector(`.stage-panel[data-ch="${c}"]`);
    if (!panel || !panel.classList.contains('on') || t < 0.16 || t > 0.88 || window.innerWidth < 821) { leaderLine.setAttribute('opacity', 0); leaderDot.setAttribute('opacity', 0); return; }
    const i = +panel.dataset.stage;
    const st = stages[i];
    const w = st.g.localToWorld(tmpV.set(0, st.h * 0.5, 0));
    const [sx, sy, sz] = toScreen(w);
    const r = panel.getBoundingClientRect();
    const px = panel.classList.contains('right') ? r.left : r.right;
    const py = r.top + Math.min(150, r.height * 0.4);
    const vis = sz < 1 ? smooth(0.16, 0.26, t) * (1 - smooth(0.8, 0.88, t)) : 0;
    leaderLine.setAttribute('x1', sx); leaderLine.setAttribute('y1', sy); leaderLine.setAttribute('x2', px); leaderLine.setAttribute('y2', py);
    leaderLine.setAttribute('opacity', vis); leaderDot.setAttribute('cx', sx); leaderDot.setAttribute('cy', sy); leaderDot.setAttribute('opacity', vis);
  }
  function updateLabels(T) {
    const on = T > 7.28 && window.innerWidth > 820;
    stages.forEach((st, i) => {
      const e = labelEls[i];
      if (!on) { e.classList.remove('on'); return; }
      const ctr = st.g.localToWorld(tmpV2.set(0, st.h * 0.5, 0));
      const [lx, ly] = toScreen(ctr);
      const dist = camera.position.distanceTo(ctr);
      const pxPerUnit = (window.innerHeight / 2) / (dist * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
      const x = lx - R * 1.15 * pxPerUnit - 10;
      e.style.left = x + 'px'; e.style.top = ly + 'px';
      e.classList.add('on');
    });
  }

  // ---------------- loop
  measure();
  let Tt = scrollT(), Ts = Tt;
  const qT = parseFloat(QS.get('t'));
  if (!isNaN(qT)) {
    const c = Math.min(NCH - 1, Math.floor(qT));
    window.scrollTo(0, chTop[c] + (qT - c) * chH[c]);
    Tt = Ts = qT;
  }
  const clock = new THREE.Clock();
  let frames = 0;
  function frame() {
    const dt = Math.min(0.1, clock.getDelta());
    const time = clock.elapsedTime;
    Tt = scrollT();
    Ts += (Tt - Ts) * (1 - Math.exp(-dt * (REDUCED ? 30 : 4.2)));
    if (Math.abs(Tt - Ts) < 1e-4) Ts = Tt;
    updateScene(Ts, time);
    updateCamera(Ts, time);
    updateOverlays(Ts);
    updateLeader(Ts);
    updateLabels(Ts);
    if (composer) composer.render(); else renderer.render(scene, camera);
    frames++;
    if (frames === 2) { loader.classList.add('done'); window.__sceneReady = true; }
    window.__T = Ts;
    requestAnimationFrame(frame);
  }
  function onResize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    if (composer) { composer.setSize(w, h); bloom.resolution.set(w, h); }
    camera.aspect = w / h; camera.updateProjectionMatrix();
    measure();
  }
  window.addEventListener('resize', onResize);
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); document.body.classList.add('no-webgl'); overlays().forEach(o => o.classList.add('on')); });
  requestAnimationFrame(frame);
}
