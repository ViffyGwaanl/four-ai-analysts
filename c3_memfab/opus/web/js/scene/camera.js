import * as THREE from 'three';
import { ZONES, PLATFORM } from './layout.js';

export const VIEWS = ['overview', 'fab', 'hbm', 'warehouse', 'vault', 'debt', 'boardroom', 'market'];

/* 机位：目标点 + 方位角/仰角（度）+ 需要框住的宽高（世界单位），距离按屏幕安全区自动求得 */
const PRESETS = {
  overview: { t: [0, 0.6, -0.4], az: -4, el: 35, fw: 64, fh: 33 },
  fab: { t: [ZONES.fab.x + 1.0, 1.0, ZONES.fab.z + 0.6], az: 8, el: 50, fw: 36, fh: 20 },
  hbm: { t: [ZONES.hbm.x - 0.3, 1.5, ZONES.hbm.z + 0.4], az: 20, el: 40, fw: 17.5, fh: 15 },
  warehouse: { t: [ZONES.warehouse.x + 0.4, 2.8, ZONES.warehouse.z + 0.4], az: -20, el: 30, fw: 19, fh: 15 },
  vault: { t: [ZONES.vault.x + 0.3, 2.2, ZONES.vault.z], az: -14, el: 28, fw: 15, fh: 12 },
  debt: { t: [ZONES.debt.x, 3.6, ZONES.debt.z], az: -10, el: 22, fw: 12, fh: 11 },
  boardroom: { t: [ZONES.boardroom.x + 0.8, 3.4, ZONES.boardroom.z - 0.3], az: 6, el: 24, fw: 15, fh: 9 },
  market: { t: [ZONES.market.x, 2.7, ZONES.market.z], az: 6, el: 34, fw: 14, fh: 9 },
};

/* 竖屏（手机）时总览改用更俯视的角度，纵向更饱满 */
const PORTRAIT = {
  overview: { t: [0, 0.4, 0.2], az: -3, el: 52, fw: 66, fh: 44 },
};

/* 桌面（横屏）总览：按真实投影求机位——平台在左侧卡片与右侧数据面板之间水平居中，
   平台前沿距时间轴约 80px；在模型与标签都不压到面板的前提下放大（相对原机位最多 +12.5%）。 */
const DESK = { az: 0, el: 42, gain: 1.125, frontGap: 64, margin: 10 };
const SLAB_BOTTOM = -1.7;
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const PLATFORM_PTS = [];
for (const x of [PLATFORM.x0, PLATFORM.x1]) for (const z of [PLATFORM.z0, PLATFORM.z1]) PLATFORM_PTS.push(V(x, 0, z), V(x, SLAB_BOTTOM, z));
const FRONT_PTS = [V(PLATFORM.x0, SLAB_BOTTOM, PLATFORM.z1), V(PLATFORM.x1, SLAB_BOTTOM, PLATFORM.z1)];
const SOLID_PTS = [...PLATFORM_PTS];
// 沿平台四条顶边与前沿底边采样（侧边在透视下外扩，不能只看四角）
for (let i = 0; i <= 12; i++) {
  const u = i / 12;
  const x = PLATFORM.x0 + (PLATFORM.x1 - PLATFORM.x0) * u, z = PLATFORM.z0 + (PLATFORM.z1 - PLATFORM.z0) * u;
  SOLID_PTS.push(V(PLATFORM.x0, 0, z), V(PLATFORM.x1, 0, z), V(x, 0, PLATFORM.z0), V(x, 0, PLATFORM.z1), V(x, SLAB_BOTTOM, PLATFORM.z1));
}
// 四周树冠
for (let z = PLATFORM.z0 + 2.2; z <= PLATFORM.z1 - 1.9; z += 2.4) SOLID_PTS.push(V(PLATFORM.x0 + 1.8, 2.7, z), V(PLATFORM.x1 - 1.8, 2.7, z));
for (let x = PLATFORM.x0 + 2; x <= PLATFORM.x1 - 2; x += 4) SOLID_PTS.push(V(x, 2.7, PLATFORM.z0 + 2.2), V(x, 2.7, PLATFORM.z1 - 1.9));
for (const k of ['fab', 'hbm', 'warehouse']) {
  const Z = ZONES[k], h = k === 'warehouse' ? 6.7 : 4.8;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) SOLID_PTS.push(V(Z.x + (sx * Z.w) / 2, h, Z.z + (sz * Z.d) / 2));
}
SOLID_PTS.push(
  V(ZONES.debt.x - 3.2, 7.9, ZONES.debt.z), V(ZONES.debt.x + 3.2, 7.9, ZONES.debt.z),
  V(ZONES.vault.x, 11.2, ZONES.vault.z),
  V(ZONES.market.x - 6, 5.3, ZONES.market.z - 1.6), V(ZONES.market.x + 6, 5.3, ZONES.market.z - 1.6),
  V(ZONES.hbm.x, 6.7, ZONES.hbm.z), V(ZONES.fab.x + ZONES.fab.w / 2 + 1.5, 10.3, ZONES.fab.z + 4.4),
);
/* 标签宽度估计（像素）：首帧前 DOM 尚未挂载时使用；挂载后取实际宽度 */
const LABEL_W = { fab: 210, build: 270, hbm: 245, warehouse: 195, vault: 215, debt: 215, boardroom: 300, market: 285 };
const LABEL_W_COMPACT = 128;

const BOUNDS = { x0: -44, x1: 44, y0: -0.5, y1: 14, z0: -28, z1: 26 };
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);

export function createCameraRig(stage, { reducedMotion = false } = {}) {
  const { camera, controls } = stage;
  let view = 'overview';
  let flight = null;
  let interacting = false;
  let userMoved = false;
  let lastInteract = performance.now();
  let driftT0 = null;
  const tmpV = new THREE.Vector3();
  const offset = new THREE.Vector3();
  const listeners = new Set();
  let layoutRects = null;
  let labelBoxes = [];
  const fitCam = camera.clone();
  const pv = new THREE.Vector3();
  const sp = { x: 0, y: 0 };

  controls.addEventListener('start', () => {
    interacting = true;
    userMoved = true;
    flight = null;
    controls.enableDamping = true;
    lastInteract = performance.now();
    driftT0 = null;
  });
  controls.addEventListener('end', () => {
    interacting = false;
    lastInteract = performance.now();
  });

  /* ---------- 桌面总览自动构图 ---------- */
  function fitOverviewDesktop() {
    const R = layoutRects;
    if (!R || camera.aspect < 1 || window.innerWidth <= 760) return null;
    const { W, H } = stage.size;
    fitCam.fov = camera.fov;
    fitCam.aspect = camera.aspect;
    fitCam.view = camera.view ? { ...camera.view } : null;
    fitCam.updateProjectionMatrix();
    const az = THREE.MathUtils.degToRad(DESK.az), el = THREE.MathUtils.degToRad(DESK.el);
    const dir = V(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
    const up = V(-Math.sin(az) * Math.sin(el), Math.cos(el), -Math.cos(az) * Math.sin(el));
    const right = V(Math.cos(az), 0, -Math.sin(az));
    const cx = (R.cards.right + R.kpi.left) / 2;
    let frontY = R.timeline.top - DESK.frontGap;
    if (R.nav.top > H / 2) frontY = Math.min(frontY, R.nav.top - 28);
    const tanHalf = Math.tan(THREE.MathUtils.degToRad(fitCam.fov / 2));
    const T = V(0, 0.6, -0.5);
    const project = (p) => {
      pv.copy(p).project(fitCam);
      sp.x = ((pv.x + 1) / 2) * W;
      sp.y = ((1 - pv.y) / 2) * H;
      return sp;
    };
    const aim = (D) => {
      fitCam.position.copy(T).addScaledVector(dir, D);
      fitCam.lookAt(T);
      fitCam.updateMatrixWorld(true);
    };
    function place(D) {
      T.set(0, 0.6, -0.5);
      for (let i = 0; i < 16; i++) {
        aim(D);
        let minX = Infinity, maxX = -Infinity, fy = -Infinity;
        for (const p of PLATFORM_PTS) { project(p); minX = Math.min(minX, sp.x); maxX = Math.max(maxX, sp.x); }
        for (const p of FRONT_PTS) { project(p); fy = Math.max(fy, sp.y); }
        const dx = cx - (minX + maxX) / 2, dy = frontY - fy;
        if (Math.abs(dx) < 0.3 && Math.abs(dy) < 0.3) break;
        const k = (2 * D * tanHalf) / H;
        T.addScaledVector(right, -dx * k).addScaledVector(up, dy * k);
      }
      aim(D);
    }
    const hits = (x0, y0, x1, y1, r, m) => x1 > r.left - m && x0 < r.right + m && y1 > r.top - m && y0 < r.bottom + m;
    const compact = window.innerWidth <= 1500;
    function violations(D) {
      place(D);
      const m = DESK.margin;
      let bad = 0;
      for (const p of SOLID_PTS) {
        project(p);
        if (sp.x < m || sp.x > W - m || sp.y < m || sp.y > R.timeline.top - 40) bad++;
        else if (hits(sp.x, sp.y, sp.x, sp.y, R.cards, m) || hits(sp.x, sp.y, sp.x, sp.y, R.kpi, m) || hits(sp.x, sp.y, sp.x, sp.y, R.nav, m)) bad++;
      }
      for (const lb of labelBoxes) {
        project(lb.anchor);
        const w = lb.el.offsetWidth || (compact ? LABEL_W_COMPACT : LABEL_W[lb.id] || 220);
        const h = lb.el.offsetHeight || (compact ? 44 : 50);
        const x0 = sp.x - w / 2, x1 = sp.x + w / 2, y0 = sp.y - h, y1 = sp.y;
        if (x0 < 8 || x1 > W - 8 || y0 < 8) bad++;
        else if (hits(x0, y0, x1, y1, R.cards, 8) || hits(x0, y0, x1, y1, R.kpi, 8) || hits(x0, y0, x1, y1, R.nav, 8)) bad++;
      }
      return bad;
    }
    const p0 = PRESETS.overview;
    const dRef = stage.fitDistance(p0.fw, p0.fh) * 1.04 * (Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) / tanHalf);
    let D = dRef / DESK.gain;
    if (violations(D) > 0) {
      let lo = D, hi = dRef * 1.8;
      if (violations(hi) === 0) {
        for (let i = 0; i < 24; i++) {
          const mid = (lo + hi) / 2;
          if (violations(mid) === 0) hi = mid; else lo = mid;
        }
      }
      D = hi;
    }
    place(D);
    return { pos: fitCam.position.clone(), target: T.clone(), dist: D };
  }

  function pose(name) {
    if (name === 'overview') {
      const fitted = fitOverviewDesktop();
      if (fitted) return fitted;
    }
    const p = { ...(PRESETS[name] || PRESETS.overview), ...(camera.aspect < 1 && PORTRAIT[name] ? PORTRAIT[name] : {}) };
    const target = new THREE.Vector3(...p.t);
    const az = THREE.MathUtils.degToRad(p.az), el = THREE.MathUtils.degToRad(p.el);
    const dir = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
    const dist = stage.fitDistance(p.fw, p.fh) * 1.04;
    return { pos: target.clone().addScaledVector(dir, dist), target, dist };
  }

  function setView(name) {
    view = name;
    for (const fn of listeners) fn(name);
  }

  function jumpTo(name) {
    const p = pose(name);
    camera.position.copy(p.pos);
    controls.target.copy(p.target);
    controls.update();
    flight = null;
    userMoved = false;
    setView(name);
  }

  function flyTo(name, { duration = 1.7, from = null } = {}) {
    const p = pose(name);
    const startPos = from ? from.pos : camera.position.clone();
    const startTarget = from ? from.target : controls.target.clone();
    if (reducedMotion) { jumpTo(name); return; }
    flight = {
      p0: startPos, p1: p.pos, t0: startTarget, t1: p.target,
      start: performance.now(), dur: duration * 1000,
      arc: Math.min(8, startPos.distanceTo(p.pos) * 0.12),
      easing: from ? easeOut : ease,
    };
    controls.enableDamping = false;
    userMoved = false;
    driftT0 = null;
    setView(name);
  }

  function intro(name) {
    const p = pose(name);
    const dir = p.pos.clone().sub(p.target).normalize();
    const far = p.target.clone().addScaledVector(dir, p.dist * 1.38);
    far.y += p.dist * 0.18;
    const sideways = new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(p.dist * 0.16);
    far.add(sideways);
    camera.position.copy(far);
    controls.target.copy(p.target);
    controls.update();
    flyTo(name, { duration: 2.6, from: { pos: far, target: p.target.clone() } });
  }

  function clampTarget() {
    const t = controls.target;
    const cx = THREE.MathUtils.clamp(t.x, BOUNDS.x0, BOUNDS.x1);
    const cy = THREE.MathUtils.clamp(t.y, BOUNDS.y0, BOUNDS.y1);
    const cz = THREE.MathUtils.clamp(t.z, BOUNDS.z0, BOUNDS.z1);
    if (cx !== t.x || cy !== t.y || cz !== t.z) {
      tmpV.set(cx - t.x, cy - t.y, cz - t.z);
      t.add(tmpV);
      camera.position.add(tmpV);
    }
  }

  function update(dt, now) {
    if (flight) {
      const k = Math.min(1, (now - flight.start) / flight.dur);
      const e = flight.easing(k);
      camera.position.lerpVectors(flight.p0, flight.p1, e);
      camera.position.y += Math.sin(Math.PI * e) * flight.arc;
      controls.target.lerpVectors(flight.t0, flight.t1, e);
      if (k >= 1) {
        flight = null;
        controls.enableDamping = true;
        lastInteract = now;
      }
    } else if (!interacting && !reducedMotion && now - lastInteract > 5000) {
      // 缓慢漂移：绕目标点小幅往复环绕
      if (driftT0 === null) driftT0 = now;
      const s = (now - driftT0) / 1000;
      const fade = Math.min(1, s / 4);
      const T = 34, A = 0.07;
      const w = (2 * Math.PI) / T;
      const dTheta = fade * A * w * Math.cos(w * s) * dt;
      offset.copy(camera.position).sub(controls.target);
      offset.applyAxisAngle(THREE.Object3D.DEFAULT_UP, dTheta);
      camera.position.copy(controls.target).add(offset);
    }
    controls.update();
    clampTarget();
  }

  function onResize() {
    if (!userMoved && !flight) jumpTo(view);
  }

  return {
    get view() { return view; },
    get busy() { return !!flight || interacting; },
    jumpTo, flyTo, intro, update, onResize,
    onViewChange(fn) { listeners.add(fn); },
    setLayout(rects) { layoutRects = rects; },
    setLabelBoxes(list) { labelBoxes = list; },
  };
}
