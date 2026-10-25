import { N, stateFor } from './data.js';
import { createUI } from './ui.js';

const M = window.__memfab || (window.__memfab = {});
Object.assign(M, { booted: true, ready: false, frames: 0, state: 'loading' });

const params = new URLSearchParams(location.search);
const clampInt = (v, a, b) => Math.max(a, Math.min(b, v));
const VIEW_LIST = ['overview', 'fab', 'hbm', 'warehouse', 'vault', 'debt', 'boardroom', 'market'];
const startIdx = clampInt((parseInt(params.get('q'), 10) || 1) - 1, 0, N - 1);
const autoplay = params.get('autoplay') !== '0';
const startView = VIEW_LIST.includes(params.get('view')) ? params.get('view') : 'overview';
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const TWEEN_MS = 800;
const STEP_MS = 2500;

/* 3D 依赖按“叶子在前”的顺序逐个加载：同一时刻只有一个请求在途 */
const SCENE_MODULES = [
  'three',
  'three/addons/geometries/RoundedBoxGeometry.js',
  'three/addons/controls/OrbitControls.js',
  'three/addons/environments/RoomEnvironment.js',
  'three/addons/shaders/CopyShader.js',
  'three/addons/postprocessing/Pass.js',
  'three/addons/postprocessing/ShaderPass.js',
  'three/addons/postprocessing/MaskPass.js',
  'three/addons/postprocessing/EffectComposer.js',
  'three/addons/postprocessing/RenderPass.js',
  'three/addons/shaders/LuminosityHighPassShader.js',
  'three/addons/postprocessing/UnrealBloomPass.js',
  'three/addons/shaders/OutputShader.js',
  'three/addons/postprocessing/OutputPass.js',
  'three/addons/renderers/CSS2DRenderer.js',
  './scene/util.js',
  './scene/layout.js',
  './scene/stage.js',
  './scene/site.js',
  './scene/fab.js',
  './scene/hbm.js',
  './scene/warehouse.js',
  './scene/vault.js',
  './scene/debt.js',
  './scene/boardroom.js',
  './scene/market.js',
  './scene/labels.js',
  './scene/camera.js',
  './scene/world.js',
];

/* ---------- 状态与补间 ---------- */
const S = {
  idx: startIdx,
  disp: stateFor(startIdx),
  from: null,
  to: null,
  t0: 0,
  tweening: false,
  dirty: true,
  playing: false,
  ended: false,
  speed: 1,
  acc: 0,
};
const KEYS = Object.keys(S.disp);
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const interval = () => STEP_MS / S.speed;

function goTo(i, { fromUser = false } = {}) {
  i = clampInt(i, 0, N - 1);
  if (fromUser) S.acc = 0;
  if (i === S.idx && !S.tweening) return;
  S.idx = i;
  S.from = { ...S.disp };
  S.to = stateFor(i);
  S.t0 = performance.now();
  S.tweening = true;
  ui.setQuarter(i);
  const ended = !S.playing && i >= N - 1;
  if (ended !== S.ended) { S.ended = ended; syncPlay(); }
}

function syncPlay() {
  ui.setPlaying(S.playing ? 'playing' : S.ended ? 'ended' : 'paused', S.speed, interval());
}

function togglePlay() {
  if (S.playing) {
    S.playing = false;
  } else {
    if (S.idx >= N - 1) goTo(0, { fromUser: true });
    S.playing = true;
    S.ended = false;
    S.acc = 0;
  }
  syncPlay();
}

function toggleSpeed() {
  S.speed = S.speed === 1 ? 2 : 1;
  syncPlay();
}

let world = null;
let worldFrames = 0;
let contextLost = false;
let pendingView = startView;

const ui = createUI({
  onSeek: (i) => goTo(i, { fromUser: true }),
  onStep: (d) => goTo(S.idx + d, { fromUser: true }),
  onPlay: togglePlay,
  onSpeed: toggleSpeed,
  onView: (v) => {
    if (world) world.flyTo(v);
    else { pendingView = v; ui.setView(v); }
  },
});

/* ---------- 画质分级 ---------- */
function detectQuality() {
  const w = window.innerWidth, h = window.innerHeight;
  const small = w < 760 || Math.min(w, h) < 520;
  const mobileUA = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const lowMem = typeof navigator.deviceMemory === 'number' && navigator.deviceMemory <= 4;
  let tier = small || mobileUA || (coarse && lowMem) ? 'low' : 'high';
  const qp = params.get('quality');
  if (qp === 'low' || qp === 'high') tier = qp;
  const dpr = Math.min(window.devicePixelRatio || 1, tier === 'low' ? 1.5 : 2);
  return { tier, dpr, shadows: tier === 'high', bloom: tier === 'high', shadowSize: 2048, msaa: dpr < 1.5 ? 4 : 0 };
}

function showFallback(kind, detail) {
  const f = document.getElementById('fallback');
  if (kind === 'load') {
    f.querySelector('h2').textContent = '3D 场景加载失败';
    f.querySelector('p').textContent = '部分脚本文件未能从本地服务器取回（可能是服务器临时中断了连接）。请刷新页面重试。';
  }
  f.querySelector('.fb-detail').textContent = detail || '';
  f.hidden = false;
  document.body.classList.add('no-webgl');
}

const canvas = document.getElementById('scene');
const quality = detectQuality();

async function loadWorld() {
  let gl = null;
  try {
    gl = canvas.getContext('webgl2', {
      alpha: false, antialias: !quality.bloom, depth: true, stencil: false,
      premultipliedAlpha: true, preserveDrawingBuffer: false, powerPreference: 'high-performance',
    });
  } catch (e) {
    gl = null;
  }
  if (!gl) {
    showFallback('webgl', '当前浏览器或设备无法创建 WebGL 2 上下文（可能关闭了硬件加速）。');
    M.state = 'failed';
    return;
  }
  if (quality.bloom && !gl.getExtension('EXT_color_buffer_float') && !gl.getExtension('EXT_color_buffer_half_float')) {
    quality.bloom = false;
    quality.msaa = 0;
  }
  let createWorld;
  try {
    for (const m of SCENE_MODULES) await import(m);
    ({ createWorld } = await import('./scene/world.js'));
  } catch (err) {
    if (window.__memfabRetry && window.__memfabRetry()) return; // 自动刷新一次
    showFallback('load', String(err && err.message ? err.message : err));
    M.state = 'failed';
    return;
  }
  try {
    world = createWorld({
      canvas, gl, quality, reducedMotion,
      labelHost: document.getElementById('labels'),
      onView: (v) => ui.setView(v),
    });
  } catch (err) {
    world = null;
    showFallback('webgl', '3D 场景初始化失败：' + (err && err.message ? err.message : String(err)));
    M.state = 'failed';
    return;
  }
  document.body.classList.add('quality-' + quality.tier);
  M.renderInfo = () => {
    const i = world.stage.renderer.info;
    return { calls: i.render.calls, triangles: i.render.triangles, geometries: i.memory.geometries, textures: i.memory.textures, programs: i.programs ? i.programs.length : 0, quality: quality.tier };
  };
  M.view = () => world.rig.view;
  layout();
  if (params.get('intro') === '0' || reducedMotion) world.jumpTo(pendingView);
  else world.intro(pendingView);
  ui.setView(pendingView);
  S.dirty = true;
  M.state = 'ready';
}

canvas.addEventListener('webglcontextlost', (e) => {
  e.preventDefault();
  contextLost = true;
  ui.toast('图形上下文已丢失，正在等待浏览器恢复…', 0);
}, false);
canvas.addEventListener('webglcontextrestored', () => {
  // 推迟到 three.js 自身的恢复处理之后，再重建环境贴图与阴影
  setTimeout(() => {
    if (world) world.onContextRestored();
    contextLost = false;
    S.dirty = true;
    ui.toast('3D 场景已恢复', 2200);
  }, 0);
}, false);

/* ---------- 尺寸 ---------- */
function layout() {
  const w = window.innerWidth, h = window.innerHeight;
  if (world) world.resize(w, h, ui.safeRect(), ui.layoutRects());
  ui.chart.resize();
}
let resizeQueued = false;
window.addEventListener('resize', () => {
  if (resizeQueued) return;
  resizeQueued = true;
  requestAnimationFrame(() => { resizeQueued = false; layout(); });
});

/* ---------- 启动 ---------- */
ui.setQuarter(S.idx);
ui.setView(startView);
layout();
if (autoplay && S.idx < N - 1) S.playing = true;
S.ended = !S.playing && S.idx >= N - 1;
syncPlay();

let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.1, Math.max(0, (now - last) / 1000));
  last = now;

  // 3D 场景尚未就绪时暂不推进自动播放，避免开场错过季度
  if (S.playing && M.ready) {
    S.acc += dt * 1000;
    if (S.acc >= interval()) {
      S.acc = 0;
      if (S.idx < N - 1) goTo(S.idx + 1);
      if (S.idx >= N - 1) { S.playing = false; S.ended = true; syncPlay(); }
    }
  }

  let settled = false;
  if (S.tweening) {
    let k = (now - S.t0) / TWEEN_MS;
    if (k >= 1) { k = 1; S.tweening = false; settled = true; }
    const e = easeInOut(k);
    for (const key of KEYS) S.disp[key] = k === 1 ? S.to[key] : S.from[key] + (S.to[key] - S.from[key]) * e;
    S.dirty = true;
  }
  if (S.dirty) {
    const isSettled = settled || !S.tweening;
    ui.renderValues(S.disp, isSettled);
    if (world) world.applyState(S.disp, S.idx, isSettled);
    S.dirty = false;
  }

  if (world && !contextLost) {
    world.animate(now / 1000, dt);
    world.render();
    worldFrames++;
  }
  M.frames++;
  if (!M.ready && ((M.state === 'ready' && worldFrames > 2) || M.state === 'failed')) {
    M.ready = true;
    document.body.classList.add('is-ready');
    try { sessionStorage.removeItem('memfab-retry'); } catch (e) { /* 忽略 */ }
  }
  M.idx = S.idx;
  M.tweening = S.tweening;
}
requestAnimationFrame(frame);
loadWorld();
