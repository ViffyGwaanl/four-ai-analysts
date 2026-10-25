// 页面主控：渲染器、场景切换、滚动编排、标注
import * as THREE from 'three';
import { EffectComposer } from 'three-addons';
import { RenderPass } from 'three-addons';
import { UnrealBloomPass } from 'three-addons';
import { OutputPass } from 'three-addons';
import { RoomEnvironment } from 'three-addons';
import { buildTokamak } from './tokamak.js';
import { buildFlow } from './flow.js';
import { clamp, lerp, smooth, easeInOut } from './util.js';

const $ = (s, r = document) => r.querySelector(s);
const el = (tag, cls, html) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
};
const mq = window.matchMedia('(max-width: 760px)');
const coarse = window.matchMedia('(pointer: coarse)').matches;
const LOW = mq.matches || (coarse && Math.min(screen.width, screen.height) < 900);
const fmt = (v, d = 0) => (v == null || Number.isNaN(+v) ? '—' : (+v).toLocaleString('zh-CN', { minimumFractionDigits: d, maximumFractionDigits: d }));

// 机位关键帧：[方位角°, 仰角°, 距离, 目标点高度]
const CAM = [
  [32, 16, 62, 1.0],
  [36, 19, 80, 7.5],
  [46, 18, 70, 1.5],
  [22, 12, 66, 1],
  [36, 21, 54, 6],
  [30, 20, 56, 0],
  [20, 16, 42, 0],
  [44, 6, 36, -4.6],
  [32, 30, 35, 0],
  [32, 16, 64, 1.0],
];

function webglOK() {
  try {
    const c = document.createElement('canvas');
    const gl = window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl'));
    if (!gl) return false;
    const lose = gl.getExtension('WEBGL_lose_context');
    if (lose) lose.loseContext(); // 释放探测用的临时上下文
    return true;
  } catch (e) {
    return false;
  }
}

function showFallback(msg) {
  $('#fallback').hidden = false;
  $('#gl').style.display = 'none';
  const n = el('p', 'webgl-note', msg || '当前浏览器无法启用 WebGL，已切换为静态版本：文字与数据照常显示。');
  document.body.appendChild(n);
}

// ---------------- DOM：根据数据生成卡片 ----------------
function buildDom(data) {
  // Hero KPI
  const k = $('#heroKpis');
  (data.hero || []).forEach((h) => {
    const d = el('div', 'kpi');
    d.innerHTML = `<div class="v">${fmt(h.v, h.d || 0)}<small>${h.u}</small></div><div class="k">${h.k}</div><div class="s">${h.s}</div>`;
    k.appendChild(d);
  });
  if (data.bridge) $('#bridgeText').textContent = data.bridge;

  // 托卡马克步骤
  const tok = $('#tokamak');
  const rail = $('#rail');
  data.tokamak.steps.forEach((s, i) => {
    const step = el('div', 'step');
    step.dataset.step = i;
    const specs = (s.specs || []).map((x) => `<dt>${x.k}</dt><dd>${x.v}${x.u ? ' ' + x.u : ''}</dd>`).join('');
    const card = el('article', 'card');
    card.style.setProperty('--c', s.color);
    card.innerHTML = `<div class="idx">${s.idx}</div><h2>${s.name}</h2><div class="en">${s.en}</div><p>${s.text}</p>${specs ? `<dl>${specs}</dl>` : ''}<div class="src">${s.src || ''}</div>`;
    step.appendChild(card);
    tok.appendChild(step);
    const b = el('button', '', `<span>${s.name}</span><i></i>`);
    b.style.setProperty('--c', s.color);
    b.addEventListener('click', () => window.scrollTo({ top: tok.offsetTop + i * window.innerHeight, behavior: 'smooth' }));
    rail.appendChild(b);
  });

  // 电力流向步骤 + 切换按钮
  const flow = $('#flow');
  const ui = $('#flowUI');
  data.flow.views.forEach((v, i) => {
    const step = el('div', 'step');
    step.dataset.fstep = i;
    const card = el('article', 'card');
    card.style.setProperty('--c', v.color || '#6b4dff');
    const items = v.type === 'mix' ? v.sources.map((s) => ({ name: s.name, color: s.color, val: s.twh, txt: s.shareText }))
      : v.left.map((s) => ({ name: s.name, color: s.color, val: s.value, txt: '' }));
    const tot = items.reduce((a, b) => a + b.val, 0) || 1;
    const bar = `<div class="mixbar">${items.map((s) => `<span style="flex-grow:${s.val / tot};background:${s.color}" title="${s.name}"></span>`).join('')}</div>`;
    const legendItems = v.type === 'mix' ? items : (v.legend || []);
    const legend = `<div class="mixlegend">${legendItems.map((s) => `<div><i style="background:${s.color}"></i>${s.name}${s.txt ? `<b>${s.txt}</b>` : ''}</div>`).join('')}</div>`;
    card.innerHTML = `<div class="idx">${v.idx}</div><h2>${v.cardTitle}</h2><div class="en">${v.en || ''}</div>`
      + `<div class="bigline"><b>${fmt(v.total)}</b><small>${v.unit}</small></div><div class="cap">${v.cap || ''}</div>${bar}${legend}`
      + `<p>${v.text}</p>${(v.facts || []).length ? `<dl>${v.facts.map((f) => `<dt>${f.k}</dt><dd>${f.v}</dd>`).join('')}</dl>` : ''}<div class="src">${v.src}</div>`;
    step.appendChild(card);
    flow.appendChild(step);
    const b = el('button', '', v.tab);
    b.setAttribute('role', 'tab');
    b.addEventListener('click', () => window.scrollTo({ top: flow.offsetTop + i * window.innerHeight, behavior: 'smooth' }));
    ui.appendChild(b);
  });

  // 出处列表
  const g = $('#srcGrid');
  (data.sources || []).forEach((s) => {
    g.appendChild(el('div', '', `<b>${s.name}</b><span>${s.date}${s.use ? ' · ' + s.use : ''}</span>`));
  });
  if (data.note) $('#srcNote').textContent = data.note;
}

// ---------------- 背景天空 ----------------
function makeSky(top, mid, bottom, glow) {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      cTop: { value: new THREE.Color(top) },
      cMid: { value: new THREE.Color(mid) },
      cBot: { value: new THREE.Color(bottom) },
      cGlow: { value: new THREE.Color(glow) },
    },
    vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = projectionMatrix*modelViewMatrix*vec4(position,1.0); gl_Position = p.xyww; }',
    fragmentShader: `uniform vec3 cTop,cMid,cBot,cGlow; varying vec3 vDir;
      void main(){ float h = vDir.y;
        vec3 c = h > 0.0 ? mix(cMid, cTop, smoothstep(0.0, 0.55, h)) : mix(cMid, cBot, smoothstep(0.0, 0.45, -h));
        float g = pow(max(0.0, 1.0 - length(vDir.xz*vec2(1.0,1.0) - vec2(0.0,0.0)) ), 2.0);
        c = mix(c, cGlow, 0.25 * smoothstep(0.15, -0.05, abs(h-0.06)));
        gl_FragColor = vec4(c, 1.0); }`,
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(600, 48, 24), mat);
  m.frustumCulled = false;
  m.renderOrder = -10;
  return m;
}

function makeFloor(radius, color, fade) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(fade, 'rgba(255,255,255,0.9)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(c);
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.92, metalness: 0.0, alphaMap: tex, transparent: true, depthWrite: false });
  const m = new THREE.Mesh(new THREE.CircleGeometry(radius, 96), mat);
  m.rotation.x = -Math.PI / 2;
  m.receiveShadow = true;
  m.renderOrder = -5;
  return m;
}

// ---------------- 主流程 ----------------
async function boot() {
  let data;
  try {
    const r = await fetch('data/web-data.json', { cache: 'no-cache' });
    data = await r.json();
  } catch (e) {
    console.warn('数据加载失败', e);
    showFallback('数据文件未能加载：请通过本地 http 服务打开本页（例如在 web 目录运行 python3 -m http.server）。');
    return;
  }
  buildDom(data);

  if (!webglOK()) {
    showFallback();
    return;
  }

  const canvas = $('#gl');
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: !LOW, powerPreference: 'high-performance', alpha: false });
  } catch (e) {
    showFallback();
    return;
  }
  const DPR = Math.min(window.devicePixelRatio || 1, LOW ? 1.5 : 2);
  renderer.setPixelRatio(DPR);
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = !LOW;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  let lost = false;
  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    lost = true;
    showFallback('图形上下文已丢失（可能是设备内存不足），已切换为静态版本。');
  });

  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  // ---- 场景一：托卡马克 ----
  const sceneA = new THREE.Scene();
  sceneA.environment = envTex;
  sceneA.environmentIntensity = 0.8;
  sceneA.add(makeSky('#fdfaf5', '#eef3fa', '#d9e5f2', '#ffffff'));
  sceneA.fog = new THREE.Fog(0xeef2f8, 120, 260);
  const floorA = makeFloor(70, 0xf2f5f9, 0.55);
  floorA.position.y = -11.72;
  sceneA.add(floorA);
  sceneA.add(new THREE.HemisphereLight(0xffffff, 0xdfe7f1, 0.7));
  const key = new THREE.DirectionalLight(0xfff1df, 2.4);
  key.position.set(-26, 42, 30);
  key.castShadow = !LOW;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -30; key.shadow.camera.right = 30;
  key.shadow.camera.top = 30; key.shadow.camera.bottom = -30;
  key.shadow.camera.near = 10; key.shadow.camera.far = 120;
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.04;
  sceneA.add(key);
  const rim = new THREE.DirectionalLight(0xcfe2ff, 1.4);
  rim.position.set(30, 18, -34);
  sceneA.add(rim);
  const tok = buildTokamak({ quality: LOW ? 'low' : 'high' });
  sceneA.add(tok.root);
  const camA = new THREE.PerspectiveCamera(LOW ? 40 : 34, window.innerWidth / window.innerHeight, 0.5, 1500);

  // ---- 场景二：电力流向 ----
  const flow = buildFlow({ data: data.flow, quality: LOW ? 'low' : 'high', envTex, labelsRoot: $('#labels'), makeSky, makeFloor });

  // ---- 后期：泛光 ----
  const composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(sceneA, camA);
  composer.addPass(renderPass);
  const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.4, 0.32, 1.0);
  if (!LOW) composer.addPass(bloom);
  composer.addPass(new OutputPass());
  composer.setPixelRatio(DPR);
  composer.setSize(window.innerWidth, window.innerHeight);

  // ---- 标注层 ----
  const svg = $('#leaders');
  const NS = 'http://www.w3.org/2000/svg';
  const line = document.createElementNS(NS, 'line');
  const ring = document.createElementNS(NS, 'circle');
  const dot = document.createElementNS(NS, 'circle');
  ring.setAttribute('class', 'ring'); ring.setAttribute('r', 9);
  dot.setAttribute('class', 'dot'); dot.setAttribute('r', 5);
  svg.append(line, ring, dot);
  const pillsRoot = $('#labels');
  const pills = data.tokamak.pills.map((p) => {
    const d = el('div', 'pill', `<i></i>${p.name}`);
    d.style.setProperty('--c', p.color);
    pillsRoot.appendChild(d);
    return { ...p, el: d };
  });

  const tokSec = $('#tokamak');
  const flowSec = $('#flow');
  const bridgeSec = $('#bridge');
  const tokCards = [...tokSec.querySelectorAll('.card')];
  const flowUI = $('#flowUI');
  const rail = $('#rail');
  const railBtns = [...rail.querySelectorAll('button')];
  const navLinks = [...document.querySelectorAll('.topbar a')];

  let W = window.innerWidth;
  let H = window.innerHeight;
  function layoutCamera(cam) {
    cam.aspect = W / H;
    if (!mq.matches && W > 900) cam.setViewOffset(W, H, -W * 0.13, 0, W, H);
    else if (W / H < 1) cam.setViewOffset(W, H, 0, H * 0.17, W, H);
    else cam.clearViewOffset();
    cam.updateProjectionMatrix();
  }
  function onResize() {
    W = window.innerWidth;
    H = window.innerHeight;
    renderer.setSize(W, H, false);
    composer.setSize(W, H);
    layoutCamera(camA);
    flow.resize(W, H, mq.matches);
  }
  window.addEventListener('resize', onResize);
  onResize();

  // ---- 滚动状态 ----
  let sTarget = 0;
  let sCur = 0;
  let fTarget = 0;
  let fCur = 0;
  let active = 'tok';
  let inFlowView = false;
  let inTokView = true;
  function readScroll() {
    const y = window.scrollY;
    const vh = window.innerHeight;
    sTarget = clamp((y - tokSec.offsetTop) / vh, 0, 9.6);
    fTarget = clamp((y - flowSec.offsetTop) / vh, 0, data.flow.views.length - 1);
    const bridgeMid = bridgeSec.offsetTop + bridgeSec.offsetHeight / 2 - vh / 2;
    const veil = clamp(1 - Math.abs(y - bridgeMid) / (vh * 0.42));
    $('#veil').style.opacity = (veil * 0.96).toFixed(3);
    active = y > bridgeMid ? 'flow' : 'tok';
    const inFlow = y > flowSec.offsetTop - vh * 0.5 && y < flowSec.offsetTop + flowSec.offsetHeight - vh * 0.6;
    inFlowView = inFlow;
    inTokView = y > tokSec.offsetTop - vh * 0.35 && y < tokSec.offsetTop + tokSec.offsetHeight - vh * 0.75;
    flowUI.classList.toggle('on', inFlow);
    rail.classList.toggle('on', y > tokSec.offsetTop - vh * 0.5 && y < tokSec.offsetTop + tokSec.offsetHeight - vh * 0.5);
    const sec = y < flowSec.offsetTop - vh * 0.6 ? 'tokamak' : y < $('#sources').offsetTop - vh * 0.5 ? 'flow' : 'sources';
    navLinks.forEach((a) => a.classList.toggle('active', a.dataset.nav === sec && y > vh * 0.5));
  }
  window.addEventListener('scroll', readScroll, { passive: true });
  readScroll();
  sCur = sTarget;
  fCur = fTarget;

  // ---- 投影工具 ----
  const v3 = new THREE.Vector3();
  function project(p, cam) {
    v3.copy(p).project(cam);
    return { x: (v3.x * 0.5 + 0.5) * W, y: (-v3.y * 0.5 + 0.5) * H, ok: v3.z < 1 && v3.z > -1 };
  }

  const clock = new THREE.Clock();
  let t = 0;
  let paused = false;
  document.addEventListener('visibilitychange', () => { paused = document.hidden; if (!paused) clock.getDelta(); });

  function updateTokCamera(s) {
    const i = Math.min(CAM.length - 2, Math.floor(s));
    const f = easeInOut(clamp(s - i));
    const a = CAM[i];
    const b = CAM[i + 1];
    let az = lerp(a[0], b[0], f) + Math.sin(t * 0.18) * 3.0;
    let elv = lerp(a[1], b[1], f) + Math.sin(t * 0.23) * 1.2;
    let dist = lerp(a[2], b[2], f);
    const ty = lerp(a[3], b[3], f);
    const asp = W / H;
    if (asp < 1.25) dist *= clamp(1.45 / asp * 0.82, 1, 2.4);
    az = THREE.MathUtils.degToRad(az);
    elv = THREE.MathUtils.degToRad(elv);
    camA.position.set(Math.sin(az) * Math.cos(elv) * dist, ty + Math.sin(elv) * dist, Math.cos(az) * Math.cos(elv) * dist);
    camA.lookAt(0, ty, 0);
  }

  function updateTokOverlay(s) {
    // 当前步骤（只在接近整数步时显示引线）
    const k = Math.round(s);
    const near = Math.abs(s - k) < 0.32 && window.scrollY > tokSec.offsetTop - H * 0.4 && window.scrollY < tokSec.offsetTop + tokSec.offsetHeight - H * 0.8;
    const step = data.tokamak.steps[k];
    let shown = false;
    if (near && step && step.anchor && active === 'tok') {
      const a = tok.anchor(step.anchor);
      const card = tokCards[k];
      if (a && card) {
        const p = project(a, camA);
        const r = card.getBoundingClientRect();
        if (p.ok && r.bottom > 0 && r.top < H) {
          const sx = mq.matches ? r.left + r.width / 2 : r.right;
          const sy = mq.matches ? r.top : r.top + Math.min(70, r.height / 2);
          line.setAttribute('x1', sx); line.setAttribute('y1', sy);
          line.setAttribute('x2', p.x); line.setAttribute('y2', p.y);
          [ring, dot].forEach((c) => { c.setAttribute('cx', p.x); c.setAttribute('cy', p.y); c.style.stroke = step.color; });
          shown = true;
        }
      }
    }
    svg.style.opacity = shown ? 1 : 0;
    // 总览时显示所有部件标签
    const inTok = active === 'tok' && inTokView;
    const showPills = inTok && !mq.matches && (s < 0.35 || s > 8.85);
    pills.forEach((p) => {
      const a = tok.anchor(p.key);
      if (!a || !showPills) { p.el.classList.remove('on'); return; }
      const q = project(a, camA);
      p.el.style.left = `${q.x}px`;
      p.el.style.top = `${q.y}px`;
      p.el.classList.toggle('on', q.ok);
    });
    railBtns.forEach((b, i) => b.classList.toggle('active', i === k));
  }

  function frame() {
    requestAnimationFrame(frame);
    if (paused || lost) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    t += dt;
    const kS = window.__snap ? 1 : 1 - Math.exp(-dt * 5.5);
    sCur += (sTarget - sCur) * kS;
    fCur += (fTarget - fCur) * kS;

    if (active === 'tok') {
      tok.update(sCur, t);
      updateTokCamera(sCur);
      updateTokOverlay(sCur);
      renderPass.scene = sceneA;
      renderPass.camera = camA;
      bloom.strength = 0.42;
      flow.setVisible(false);
    } else {
      svg.style.opacity = 0;
      pills.forEach((p) => p.el.classList.remove('on'));
      flow.setVisible(inFlowView);
      flow.update(fCur, t, dt);
      renderPass.scene = flow.scene;
      renderPass.camera = flow.camera;
      bloom.strength = 0.35;
    }
    if (LOW) {
      renderer.render(renderPass.scene, renderPass.camera);
    } else {
      composer.render(dt);
    }
  }
  frame();
  document.body.classList.add('ready');
}

boot().catch((e) => {
  console.error(e);
  showFallback('三维场景初始化失败，已切换为静态版本。');
});
