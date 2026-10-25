// 电力流向：发电来源 → 电网/直供 → 各地区数据中心（三维桑基图 + 流动粒子）
// 所有数值来自 data/web-data.json（由《数据表.xlsx》“网页数据”页导出）
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three-addons';
import { clamp, lerp, smooth, easeInOut, TAU } from './util.js';

const fmt = (v, d = 0) => (+v).toLocaleString('zh-CN', { minimumFractionDigits: d, maximumFractionDigits: d });

function stdMat(color, o = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.42, metalness: 0.15, ...o });
}

// ---------- 节点图标 ----------
function iconFor(kind, color) {
  const g = new THREE.Group();
  const white = stdMat(0xf7f8fb, { roughness: 0.35 });
  const steel = stdMat(0xc7ced8, { metalness: 0.7, roughness: 0.3 });
  const tint = stdMat(color, { roughness: 0.35, metalness: 0.25 });
  const add = (geo, mat, x = 0, y = 0, z = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    g.add(m);
    return m;
  };
  if (kind === 'coal') {
    add(new RoundedBoxGeometry(2.4, 1.5, 1.8, 2, 0.12), stdMat(0x59606d, { roughness: 0.6 }), 0, 0.75, 0);
    add(new THREE.CylinderGeometry(0.28, 0.4, 3.4, 20), stdMat(0x7b828f), 0.7, 1.7, -0.3);
    add(new THREE.CylinderGeometry(0.3, 0.3, 0.25, 20), tint, 0.7, 3.45, -0.3);
    add(new RoundedBoxGeometry(1.2, 0.7, 1.2, 2, 0.08), stdMat(0x2f343c, { roughness: 0.8 }), -1.5, 0.35, 0.4);
  } else if (kind === 'gas') {
    add(new RoundedBoxGeometry(2.6, 1.3, 1.6, 2, 0.14), white, 0, 0.65, 0);
    const turb = add(new THREE.CylinderGeometry(0.55, 0.7, 2.2, 28), steel, 0, 1.75, 0);
    turb.rotation.z = Math.PI / 2;
    add(new THREE.CylinderGeometry(0.22, 0.22, 2.2, 16), white, -0.9, 2.4, -0.4);
    const flame = add(new THREE.ConeGeometry(0.32, 0.9, 20), new THREE.MeshStandardMaterial({ color: 0x5aa8ff, emissive: 0x2f7dff, emissiveIntensity: 2.4 }), -0.9, 3.9, -0.4);
    flame.castShadow = false;
    flame.userData.flicker = true;
  } else if (kind === 'nuclear' || kind === 'nuclear-restart' || kind === 'smr') {
    const pts = [];
    for (let i = 0; i <= 20; i++) {
      const y = (i / 20) * 3.6;
      const r = 1.25 - 0.62 * Math.sin((i / 20) * Math.PI * 0.82);
      pts.push(new THREE.Vector2(r, y));
    }
    const tower = add(new THREE.LatheGeometry(pts, 40), white, -0.7, 0, -0.2);
    tower.material.side = THREE.DoubleSide;
    add(new THREE.CylinderGeometry(0.75, 0.75, 1.1, 32), steel, 1.1, 0.55, 0.4);
    add(new THREE.SphereGeometry(0.75, 32, 16, 0, TAU, 0, Math.PI / 2), tint, 1.1, 1.1, 0.4);
    if (kind === 'smr') g.scale.setScalar(0.8);
  } else if (kind === 'renewables' || kind === 'wind' || kind === 'solar') {
    // 风机
    add(new THREE.CylinderGeometry(0.08, 0.14, 3.6, 12), white, -0.7, 1.8, -0.2);
    const hub = new THREE.Group();
    hub.position.set(-0.7, 3.6, -0.05);
    const blade = new THREE.BoxGeometry(0.16, 1.6, 0.05);
    blade.translate(0, 0.8, 0);
    for (let i = 0; i < 3; i++) {
      const b = new THREE.Mesh(blade, white);
      b.rotation.z = (i / 3) * TAU;
      b.castShadow = true;
      hub.add(b);
    }
    hub.userData.spin = true;
    g.add(hub);
    // 光伏板
    const pv = stdMat(0x2a63d6, { metalness: 0.4, roughness: 0.2 });
    for (let i = 0; i < 3; i++) {
      const p = add(new THREE.BoxGeometry(1.1, 0.06, 0.7), pv, 0.9, 0.55, -0.6 + i * 0.75);
      p.rotation.z = 0.45;
      add(new THREE.CylinderGeometry(0.04, 0.04, 0.5, 8), steel, 0.9, 0.25, -0.6 + i * 0.75);
    }
  } else if (kind === 'hydro') {
    add(new RoundedBoxGeometry(2.6, 1.8, 0.9, 2, 0.1), white, 0, 0.9, 0);
    add(new THREE.BoxGeometry(2.2, 0.08, 1.4), stdMat(0x4fb3e8, { metalness: 0.1, roughness: 0.1 }), 0, 1.55, -0.9);
  } else if (kind === 'fusion') {
    const tor = add(new THREE.TorusGeometry(0.95, 0.38, 20, 48), stdMat(0xdfe4ec, { metalness: 0.6, roughness: 0.25 }), 0, 1.3, 0);
    tor.rotation.x = Math.PI / 2;
    const glow = add(new THREE.TorusGeometry(0.95, 0.2, 16, 48), new THREE.MeshStandardMaterial({ color: 0xff6fd0, emissive: 0xff3fc0, emissiveIntensity: 2.6 }), 0, 1.3, 0);
    glow.rotation.x = Math.PI / 2;
    glow.castShadow = false;
    add(new THREE.CylinderGeometry(0.3, 0.3, 1.6, 20), steel, 0, 1.0, 0);
  } else if (kind === 'other') {
    add(new THREE.CylinderGeometry(0.55, 0.55, 1.4, 24), stdMat(0x8a8f99), -0.5, 0.7, 0);
    add(new THREE.CylinderGeometry(0.55, 0.55, 1.4, 24), stdMat(0xa3a8b2), 0.7, 0.7, 0.2);
  } else if (kind === 'grid') {
    // 变电站：变压器 + 输电塔
    add(new RoundedBoxGeometry(1.6, 1.4, 1.2, 2, 0.1), steel, 0, 0.7, 0);
    for (const x of [-0.45, 0, 0.45]) add(new THREE.CylinderGeometry(0.09, 0.12, 0.9, 12), white, x, 1.8, 0);
    const towerMat = stdMat(0x9aa4b2, { metalness: 0.6, roughness: 0.35 });
    for (const z of [-1, 1]) {
      add(new THREE.CylinderGeometry(0.05, 0.22, 5.2, 4), towerMat, 1.6, 2.6, z * 1.2);
      add(new THREE.BoxGeometry(0.1, 0.08, 1.6), towerMat, 1.6, 4.6, z * 1.2);
    }
  } else if (kind === 'dc' || kind === 'buyer') {
    // 数据中心楼：浅蓝灰机房 + 深色屋面 + 发光机柜灯带 + 屋顶冷却塔
    const body = add(new RoundedBoxGeometry(3.4, 1.7, 2.6, 2, 0.12), stdMat(0xd9e3ef, { roughness: 0.5 }), 0, 0.85, 0);
    body.userData.body = true;
    add(new RoundedBoxGeometry(3.5, 0.16, 2.7, 2, 0.06), stdMat(0x334155, { roughness: 0.6 }), 0, 1.75, 0);
    const led = new THREE.MeshStandardMaterial({ color: color, emissive: color, emissiveIntensity: 2.2 });
    for (let i = 0; i < 4; i++) {
      const s = add(new THREE.BoxGeometry(3.0, 0.09, 0.06), led, 0, 0.36 + i * 0.32, 1.31);
      s.castShadow = false;
    }
    for (let i = 0; i < 3; i++) add(new THREE.CylinderGeometry(0.3, 0.3, 0.34, 18), steel, -1.05 + i * 1.05, 2.0, -0.45);
  }
  return g;
}

// ---------- 带状流（桑基带） ----------
const ribbonVS = /* glsl */`
  varying vec2 vUv;
  void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const ribbonFS = /* glsl */`
  uniform vec3 uA; uniform vec3 uB; uniform float uTime; uniform float uOpacity; uniform float uLen; uniform float uSpeed;
  varying vec2 vUv;
  void main(){
    vec3 c = mix(uA, uB, smoothstep(0.0, 1.0, vUv.x));
    float edge = smoothstep(0.38, 0.5, abs(vUv.y - 0.5));
    float stripe = pow(fract(vUv.x * uLen * 0.22 - uTime * uSpeed), 3.0);
    float a = (0.74 + 0.16 * stripe + 0.1 * edge) * uOpacity;
    vec3 col = c * (0.95 + 0.7 * stripe + 0.25 * edge);
    gl_FragColor = vec4(col, a);
  }`;

class Ribbon {
  constructor(colorA, colorB, seg) {
    this.seg = seg;
    const n = (seg + 1) * 2;
    this.geo = new THREE.BufferGeometry();
    this.pos = new Float32Array(n * 3);
    const uv = new Float32Array(n * 2);
    const idx = [];
    for (let i = 0; i <= seg; i++) {
      uv[i * 4] = i / seg; uv[i * 4 + 1] = 0;
      uv[i * 4 + 2] = i / seg; uv[i * 4 + 3] = 1;
      if (i < seg) {
        const a = i * 2;
        idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
      }
    }
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    this.geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    this.geo.setIndex(idx);
    this.uniforms = {
      uA: { value: new THREE.Color(colorA) }, uB: { value: new THREE.Color(colorB) },
      uTime: { value: 0 }, uOpacity: { value: 1 }, uLen: { value: 10 }, uSpeed: { value: 0.7 },
    };
    this.mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms, vertexShader: ribbonVS, fragmentShader: ribbonFS,
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(this.geo, this.mat);
    this.mesh.renderOrder = 2;
    this.mesh.frustumCulled = false;
    // 地面投影
    this.shadowGeo = this.geo.clone();
    this.shadowPos = this.shadowGeo.attributes.position.array;
    this.shadow = new THREE.Mesh(this.shadowGeo, new THREE.MeshBasicMaterial({ color: 0x1b2a44, transparent: true, opacity: 0.07, depthWrite: false }));
    this.shadow.renderOrder = 1;
    this.shadow.frustumCulled = false;
    this.spec = null;
  }
  // spec: {a0,b0,a1,b1,w,y0,y1,arch} 在“布局坐标”中；map(a,b,y) → 世界坐标
  set(spec, map) {
    this.spec = spec;
    this.map = map;
    const { seg, pos, shadowPos } = this;
    let len = 0;
    let prev = null;
    for (let i = 0; i <= seg; i++) {
      const u = i / seg;
      const c = this.center(u);
      for (let s = 0; s < 2; s++) {
        const b = c.b + (s === 0 ? -spec.w / 2 : spec.w / 2);
        const p = map(c.a, b, c.y);
        const k = (i * 2 + s) * 3;
        pos[k] = p.x; pos[k + 1] = p.y; pos[k + 2] = p.z;
        shadowPos[k] = p.x; shadowPos[k + 1] = 0.02; shadowPos[k + 2] = p.z;
      }
      const pc = map(c.a, c.b, c.y);
      if (prev) len += pc.distanceTo(prev);
      prev = pc;
    }
    this.uniforms.uLen.value = len;
    this.geo.attributes.position.needsUpdate = true;
    this.shadowGeo.attributes.position.needsUpdate = true;
    this.geo.computeBoundingSphere();
    const vis = spec.w > 0.004;
    this.mesh.visible = vis;
    this.shadow.visible = vis;
  }
  center(u) {
    const s = this.spec;
    const e = u * u * (3 - 2 * u); // 横向用 S 形过渡（桑基带）
    return {
      a: lerp(s.a0, s.a1, u),
      b: lerp(s.b0, s.b1, e),
      y: lerp(s.y0, s.y1, u) + s.arch * Math.sin(Math.PI * u),
    };
  }
  point(u, v) {
    const c = this.center(u);
    return this.map(c.a, c.b + v * this.spec.w, c.y + 0.03);
  }
}

// ---------- 主体 ----------
export function buildFlow({ data, quality, envTex, labelsRoot, makeSky, makeFloor }) {
  const hi = quality === 'high';
  const scene = new THREE.Scene();
  scene.environment = envTex;
  scene.environmentIntensity = 0.9;
  scene.add(makeSky('#fdfaf5', '#eef3fa', '#d7e4f2', '#ffffff'));
  scene.fog = new THREE.Fog(0xeef2f8, 110, 260);
  const floor = makeFloor(95, 0xf2f5f9, 0.5);
  scene.add(floor);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xdfe7f1, 1.15));
  const key = new THREE.DirectionalLight(0xfff1df, 2.3);
  key.position.set(-20, 40, 26);
  key.castShadow = hi;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40, near: 5, far: 120 });
  key.shadow.bias = -0.0005;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xd7e6ff, 1.0);
  rim.position.set(24, 16, -30);
  scene.add(rim);
  const camera = new THREE.PerspectiveCamera(36, 1, 0.5, 1500);

  const views = data.views;
  const mixViews = views.filter((v) => v.type === 'mix');
  const ppaView = views.find((v) => v.type === 'ppa');

  // 布局坐标 → 世界坐标（横屏：沿 x 流动；竖屏：沿 z 流动）
  let portrait = false;
  const map = (a, b, y) => (portrait ? new THREE.Vector3(b * 0.85, y, a * 0.9) : new THREE.Vector3(a, y, b));
  const SHORT = { coal: '煤电', gas: '天然气', renew: '可再生', nuclear: '核电', other: '其他', us: '美国', cn: '中国', eu: '欧洲', row: '其他', loss: '损耗' };

  // ======== 组 1：电源结构桑基 ========
  const mixGroup = new THREE.Group();
  scene.add(mixGroup);
  const srcKeys = [];
  const sinkKeys = [];
  const meta = {};
  mixViews.forEach((v) => {
    v.sources.forEach((s) => { if (!srcKeys.includes(s.key)) srcKeys.push(s.key); meta['s:' + s.key] = s; });
    v.sinks.forEach((s) => { if (!sinkKeys.includes(s.key)) sinkKeys.push(s.key); meta['k:' + s.key] = s; });
  });
  const maxTotal = Math.max(...mixViews.map((v) => v.sources.reduce((a, b) => a + b.twh, 0)));
  const K = 15 / maxTotal; // 世界单位 / TWh
  const A_SRC = -16;
  const A_HUB = -2.5;
  const A_SINK = 10.5;
  const srcB = (i) => (i - (srcKeys.length - 1) / 2) * 5.8;
  const sinkB = (i) => (i - (sinkKeys.length - 1) / 2) * 5.4;

  const mkLabel = (cls, color) => {
    const d = document.createElement('div');
    d.className = 'flabel' + (cls ? ' ' + cls : '');
    d.style.setProperty('--c', color);
    labelsRoot.appendChild(d);
    return d;
  };

  const srcNodes = srcKeys.map((k, i) => {
    const m = meta['s:' + k];
    const node = new THREE.Group();
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.15, 0.35, 48), stdMat(m.color, { roughness: 0.35, metalness: 0.1 }));
    ped.position.y = 0.17;
    ped.receiveShadow = true;
    node.add(ped);
    const ic = iconFor(m.icon || k, m.color);
    ic.position.y = 0.35;
    node.add(ic);
    mixGroup.add(node);
    const rib = new Ribbon(m.color, m.color, hi ? 72 : 40);
    mixGroup.add(rib.mesh, rib.shadow);
    return { key: k, meta: m, node, icon: ic, rib, label: mkLabel('top', m.color), val: 0, i };
  });
  const hubNode = new THREE.Group();
  const hubIcon = iconFor('grid', 0x6b4dff);
  hubNode.add(hubIcon);
  const hubGlass = new THREE.Mesh(new RoundedBoxGeometry(1, 1, 1, 2, 0.08), stdMat(0x2b3550, { roughness: 0.35, metalness: 0.4 }));
  hubGlass.castShadow = true;
  hubGlass.receiveShadow = true;
  hubNode.add(hubGlass);
  const hubGlow = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0x8b6dff, emissive: 0x7a5cff, emissiveIntensity: 2.4 }));
  hubNode.add(hubGlow);
  mixGroup.add(hubNode);
  const hubLabel = mkLabel('big', '#6b4dff');
  const sinkNodes = sinkKeys.map((k, i) => {
    const m = meta['k:' + k];
    const node = new THREE.Group();
    const isLoss = k === 'loss';
    const ic = isLoss ? new THREE.Group() : iconFor('dc', 0x29b6f6);
    node.add(ic);
    mixGroup.add(node);
    const rib = new Ribbon('#7a5cff', isLoss ? '#b4bccb' : '#29b6f6', hi ? 72 : 40);
    rib.uniforms.uSpeed.value = 0.9;
    mixGroup.add(rib.mesh, rib.shadow);
    return { key: k, meta: m, node, icon: ic, rib, label: mkLabel('right', k === 'loss' ? '#9aa3b2' : '#29b6f6'), val: 0, i };
  });

  // ======== 组 2：长期购电协议（电厂 → 买方） ========
  const ppaGroup = new THREE.Group();
  scene.add(ppaGroup);
  const ppa = { left: [], right: [], links: [] };
  if (ppaView) {
    const L = ppaView.left;
    const R = ppaView.right;
    const totalL = L.reduce((a, b) => a + b.value, 0);
    const KP = 11 / Math.max(totalL, 1);
    const gapL = L.length > 1 ? Math.min(1.5, 16 / L.length) : 0;
    const gapR = 3.2;
    const spanL = L.reduce((a, b) => a + b.value * KP, 0) + gapL * (L.length - 1);
    const totalR = R.reduce((a, b) => a + b.value, 0);
    const spanR = totalR * KP + gapR * (R.length - 1);
    let cur = -spanL / 2;
    L.forEach((n) => {
      const w = n.value * KP;
      const node = new THREE.Group();
      const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.0, 0.25, 40), stdMat(n.color, { roughness: 0.4 }));
      ped.position.y = 0.12;
      node.add(ped);
      const ic = iconFor(n.icon, n.color);
      ic.scale.setScalar(0.55);
      ic.position.y = 0.25;
      node.add(ic);
      ppaGroup.add(node);
      ppa.left.push({ ...n, node, b: cur + w / 2, w, used: 0, label: mkLabel('left', n.color) });
      cur += w + gapL;
    });
    cur = -spanR / 2;
    R.forEach((n) => {
      const w = n.value * KP;
      const node = new THREE.Group();
      const ic = iconFor('buyer', n.color);
      node.add(ic);
      ppaGroup.add(node);
      ppa.right.push({ ...n, node, b: cur + w / 2, w, used: 0, label: mkLabel('right big', n.color) });
      cur += w + gapR;
    });
    ppaView.links.forEach((lk) => {
      const from = ppa.left.find((n) => n.key === lk.from);
      const to = ppa.right.find((n) => n.key === lk.to);
      if (!from || !to) return;
      const w = lk.value * KP;
      const rib = new Ribbon(from.color, to.color, hi ? 64 : 36);
      rib.uniforms.uSpeed.value = lk.planned ? 0.25 : 0.6;
      ppaGroup.add(rib.mesh, rib.shadow);
      const b0 = from.b - from.w / 2 + from.used + w / 2;
      const b1 = to.b - to.w / 2 + to.used + w / 2;
      from.used += w;
      to.used += w;
      ppa.links.push({ ...lk, rib, w, b0, b1 });
    });
  }

  // ======== 粒子 ========
  const ribbons = [...srcNodes.map((n) => n.rib), ...sinkNodes.map((n) => n.rib), ...ppa.links.map((l) => l.rib)];
  const PER = hi ? 46 : 20;
  const NP = ribbons.length * PER;
  const pGeo = new THREE.BufferGeometry();
  const pPos = new Float32Array(NP * 3);
  const pCol = new Float32Array(NP * 3);
  const pSize = new Float32Array(NP);
  const pState = [];
  for (let r = 0; r < ribbons.length; r++) {
    for (let j = 0; j < PER; j++) {
      pState.push({ r, u: Math.random(), v: (Math.random() - 0.5) * 0.8, sp: 0.06 + Math.random() * 0.05, j });
    }
  }
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  pGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3));
  pGeo.setAttribute('size', new THREE.BufferAttribute(pSize, 1));
  const pMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.NormalBlending,
    uniforms: { uScale: { value: 300 } },
    vertexShader: `attribute float size; attribute vec3 color; varying vec3 vC; varying float vS; uniform float uScale;
      void main(){ vC = color; vS = size; vec4 mv = modelViewMatrix*vec4(position,1.0); gl_PointSize = size * uScale / -mv.z; gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `varying vec3 vC; varying float vS;
      void main(){ if (vS <= 0.0) discard; vec2 d = gl_PointCoord - 0.5; float r = length(d); if (r > 0.5) discard;
        float core = smoothstep(0.5, 0.0, r); gl_FragColor = vec4(mix(vC, vec3(1.0), core*0.6) * (1.0 + 1.6*core), core); }`,
  });
  const points = new THREE.Points(pGeo, pMat);
  points.frustumCulled = false;
  points.renderOrder = 3;
  scene.add(points);
  const ribColor = new Map();
  srcNodes.forEach((n) => ribColor.set(n.rib, new THREE.Color(n.meta.color)));
  sinkNodes.forEach((n) => ribColor.set(n.rib, new THREE.Color(n.key === 'loss' ? '#b4bccb' : '#29b6f6')));
  ppa.links.forEach((l) => ribColor.set(l.rib, new THREE.Color(l.color || '#9b5cff')));
  const ribDensity = new Map();

  // ======== 布局（按插值后的数值） ========
  let lastKey = '';
  function layoutMix(vals) {
    const total = srcKeys.reduce((a, k) => a + (vals.src[k] || 0), 0);
    const totalSink = sinkKeys.reduce((a, k) => a + (vals.sink[k] || 0), 0);
    const hubW = Math.max(total, totalSink) * K;
    // 来源 → 电网
    let cur = -hubW / 2;
    srcNodes.forEach((n) => {
      const v = vals.src[n.key] || 0;
      const w = v * K;
      n.val = v;
      const b0 = srcB(n.i);
      n.node.position.copy(map(A_SRC, b0, 0));
      n.node.rotation.y = portrait ? Math.PI / 2 : 0;
      const sc = 0.8 + 0.55 * clamp(v / (maxTotal * 0.3));
      n.icon.scale.setScalar(v > 0.5 ? sc : 0.001);
      n.node.visible = v > 0.5;
      n.rib.set({ a0: A_SRC + 2.1, b0, a1: A_HUB - 1.6, b1: cur + w / 2, w, y0: 0.55, y1: 1.1, arch: 1.1 }, map);
      ribDensity.set(n.rib, clamp(v / (maxTotal * 0.22)));
      cur += w;
    });
    // 电网 → 各地区数据中心
    cur = -hubW / 2;
    sinkNodes.forEach((n) => {
      const v = vals.sink[n.key] || 0;
      const w = v * K;
      n.val = v;
      const b1 = sinkB(n.i);
      n.node.position.copy(map(A_SINK + 2.2, b1, 0));
      n.node.rotation.y = portrait ? -Math.PI / 2 : -Math.PI / 2;
      const sc = 0.55 + 0.75 * Math.sqrt(clamp(v / (maxTotal * 0.5)));
      n.icon.scale.setScalar(v > 0.5 ? sc : 0.001);
      n.node.visible = v > 0.5;
      n.rib.set({ a0: A_HUB + 1.6, b0: cur + w / 2, a1: A_SINK, b1, w, y0: 1.1, y1: 0.55, arch: 0.9 }, map);
      ribDensity.set(n.rib, clamp(v / (maxTotal * 0.3)));
      cur += w;
    });
    hubNode.position.copy(map(A_HUB, 0, 0));
    hubNode.rotation.y = portrait ? Math.PI / 2 : 0;
    const hw = Math.max(1.2, hubW + 0.8);
    hubGlass.scale.set(3.0, 1.0, hw);
    hubGlass.position.set(0, 0.5, 0);
    hubGlow.scale.set(3.06, 0.08, hw + 0.06);
    hubGlow.position.set(0, 1.02, 0);
    hubIcon.position.set(0, 0, -hw / 2 - 2.0);
    return total;
  }

  function layoutPPA() {
    const AL = -9.0;
    const AR = 9.5;
    ppa.left.forEach((n) => {
      n.node.position.copy(map(AL - 1.2, n.b, 0));
    });
    ppa.right.forEach((n) => {
      n.node.position.copy(map(AR + 2.2, n.b, 0));
      n.node.rotation.y = -Math.PI / 2;
      const sc = 0.5 + 0.6 * Math.sqrt(clamp(n.w / 8));
      n.node.children[0].scale.setScalar(sc);
    });
    ppa.links.forEach((l) => {
      l.rib.set({ a0: AL, b0: l.b0, a1: AR, b1: l.b1, w: l.w, y0: 0.5, y1: 0.6, arch: 0.8 }, map);
      ribDensity.set(l.rib, clamp(l.value / 1500) * 0.9 + 0.1);
    });
  }

  // ======== 视图插值 ========
  function valsOf(v) {
    const src = {};
    const sink = {};
    if (v && v.type === 'mix') {
      v.sources.forEach((s) => { src[s.key] = s.twh; });
      v.sinks.forEach((s) => { sink[s.key] = s.twh; });
    }
    return { src, sink };
  }
  const tabs = document.getElementById('flowUI');
  let headIdx = -1;
  function setHead(i) {
    if (i === headIdx) return;
    headIdx = i;
    [...tabs.children].forEach((b, j) => b.classList.toggle('active', j === i));
  }

  // ======== 相机 ========
  let W = 1;
  let H = 1;
  let mobile = false;
  function resize(w, h, isMobile) {
    W = w; H = h; mobile = isMobile;
    const wasPortrait = portrait;
    portrait = w / h < 0.95;
    camera.aspect = w / h;
    camera.fov = portrait ? 46 : 36;
    if (!portrait && w > 900) camera.setViewOffset(w, h, -w * 0.1, h * 0.045, w, h);
    else if (portrait) camera.setViewOffset(w, h, 0, h * 0.2, w, h);
    else camera.clearViewOffset();
    camera.updateProjectionMatrix();
    pMat.uniforms.uScale.value = h * 0.5;
    if (wasPortrait !== portrait) lastKey = '';
    layoutPPA();
  }

  const v3 = new THREE.Vector3();
  function project(p) {
    v3.copy(p).project(camera);
    return { x: (v3.x * 0.5 + 0.5) * W, y: (-v3.y * 0.5 + 0.5) * H, ok: v3.z < 1 };
  }
  function placeLabel(elm, p, html, on, mini = false) {
    elm.classList.toggle('mini', mini);
    if (!on) { elm.classList.remove('on'); return; }
    const q = project(p);
    elm.style.left = `${q.x}px`;
    elm.style.top = `${q.y}px`;
    if (elm.dataset.h !== html) { elm.innerHTML = html; elm.dataset.h = html; }
    elm.classList.toggle('on', q.ok);
  }

  let visible = false;
  function setVisible(v) {
    if (v === visible) return;
    visible = v;
    if (!v) labelsRoot.querySelectorAll('.flabel').forEach((e) => e.classList.remove('on'));
  }

  function update(f, t, dt) {
    const i0 = Math.floor(f);
    const i1 = Math.min(views.length - 1, i0 + 1);
    const w = easeInOut(clamp(f - i0));
    const a = views[i0];
    const b = views[i1];
    setHead(Math.round(f));
    // 混合权重：电源结构 vs 购电协议
    const ppaW = (a.type === 'ppa' ? 1 - w : 0) + (b.type === 'ppa' && i1 !== i0 ? w : 0) + (a.type === 'ppa' && i1 === i0 ? w : 0);
    const mixA = a.type === 'mix' ? a : mixViews[mixViews.length - 1];
    const mixB = b.type === 'mix' ? b : mixA;
    const va = valsOf(mixA);
    const vb = valsOf(mixB);
    const ww = b.type === 'mix' && a.type === 'mix' ? w : 0;
    const vals = { src: {}, sink: {} };
    srcKeys.forEach((k) => { vals.src[k] = lerp(va.src[k] || 0, vb.src[k] || 0, ww); });
    sinkKeys.forEach((k) => { vals.sink[k] = lerp(va.sink[k] || 0, vb.sink[k] || 0, ww); });
    const keyNow = JSON.stringify(vals) + portrait;
    if (keyNow !== lastKey) {
      lastKey = keyNow;
      layoutMix(vals);
    }
    const mixOp = 1 - smooth(0.15, 0.85, ppaW);
    const ppaOp = smooth(0.15, 0.85, ppaW);
    mixGroup.visible = mixOp > 0.01;
    ppaGroup.visible = ppaOp > 0.01;
    mixGroup.traverse((o) => { if (o.material && o.material.uniforms && o.material.uniforms.uOpacity) o.material.uniforms.uOpacity.value = mixOp; });
    ppaGroup.traverse((o) => { if (o.material && o.material.uniforms && o.material.uniforms.uOpacity) o.material.uniforms.uOpacity.value = ppaOp; });
    mixGroup.scale.setScalar(0.85 + 0.15 * mixOp);
    ppaGroup.scale.setScalar(0.85 + 0.15 * ppaOp);

    // 动画：风机、火焰、时间
    ribbons.forEach((r) => { r.uniforms.uTime.value = t; });
    scene.traverse((o) => {
      if (o.userData.spin) o.rotation.z -= dt * 1.6;
      if (o.userData.flicker) o.scale.y = 0.85 + 0.25 * Math.sin(t * 13 + o.id);
    });

    // 粒子
    const sizeBase = hi ? 0.5 : 0.6;
    for (let p = 0; p < pState.length; p++) {
      const s = pState[p];
      const rib = ribbons[s.r];
      const isPPA = s.r >= srcNodes.length + sinkNodes.length;
      const op = isPPA ? ppaOp : mixOp;
      const dens = (ribDensity.get(rib) || 0) * op;
      const on = rib.spec && rib.mesh.visible && s.j < Math.ceil(dens * PER) && op > 0.05;
      s.u += dt * s.sp * (isPPA ? 0.9 : 1.0);
      if (s.u > 1) { s.u -= 1; s.v = (Math.random() - 0.5) * 0.8; }
      if (on) {
        const q = rib.point(s.u, s.v);
        pPos[p * 3] = q.x; pPos[p * 3 + 1] = q.y + 0.08; pPos[p * 3 + 2] = q.z;
        const c = ribColor.get(rib);
        pCol[p * 3] = c.r; pCol[p * 3 + 1] = c.g; pCol[p * 3 + 2] = c.b;
        pSize[p] = sizeBase * (0.7 + 0.6 * Math.sin(Math.PI * s.u)) * op;
      } else {
        pSize[p] = 0;
      }
    }
    pGeo.attributes.position.needsUpdate = true;
    pGeo.attributes.color.needsUpdate = true;
    pGeo.attributes.size.needsUpdate = true;

    // 相机：缓慢环绕
    const az = Math.sin(t * 0.12) * 0.07;
    let pos;
    let tgt;
    if (portrait) {
      pos = new THREE.Vector3(Math.sin(az) * 20, 104, 34);
      tgt = new THREE.Vector3(0, 0, -0.5);
    } else {
      pos = new THREE.Vector3(-1 + Math.sin(az) * 46, 33, 41);
      tgt = new THREE.Vector3(-1, 0, 0.5);
    }
    camera.position.copy(pos);
    camera.lookAt(tgt);

    // 标签
    const showMix = visible && mixOp > 0.6;
    const totalNow = srcNodes.reduce((acc, n) => acc + n.val, 0) || 1;
    srcNodes.forEach((n) => {
      const p = portrait ? n.node.position.clone().add(new THREE.Vector3(0, 0.5, 2.6)) : map(A_SRC + 0.4, srcB(n.i) - 2.45, 0.9);
      const share = (n.val / totalNow) * 100;
      const html = portrait ? `${SHORT[n.key] || n.meta.name}<b>${fmt(n.val)}</b>` : `${n.meta.name} <b>${fmt(n.val)}</b> TWh<small>占比 ${fmt(share, 0)}%</small>`;
      placeLabel(n.label, p, html, showMix && n.val > 0.5, portrait);
    });
    sinkNodes.forEach((n) => {
      const p = portrait ? n.node.position.clone().add(new THREE.Vector3(0, 0.5, n.key === 'loss' ? 1.5 : 3.4)) : map(A_SINK + (n.key === 'loss' ? 1.0 : 4.1), sinkB(n.i), 0.6);
      const html = portrait ? `${SHORT[n.key] || n.meta.name}<b>${fmt(n.val)}</b>` : `${n.meta.name} <b>${fmt(n.val)}</b> TWh`;
      placeLabel(n.label, p, html, showMix && n.val > 0.5, portrait);
    });
    placeLabel(hubLabel, hubNode.position.clone().add(new THREE.Vector3(0, 3.2, 0)), `${a.type === 'mix' ? a.hubName : (b.hubName || '')}<b> ${fmt(totalNow)} </b>TWh<small>发电侧合计</small>`, showMix);
    const showPPA = visible && ppaOp > 0.6;
    ppa.left.forEach((n) => {
      const p = portrait ? n.node.position.clone().add(new THREE.Vector3(0, 0.4, -1.8)) : map(-9.0 - 2.4, n.b, 0.4);
      placeLabel(n.label, p, `${n.name} <b>${fmt(n.value)}</b> MW <em>${n.sub || ''}</em>`, showPPA && !portrait);
    });
    ppa.right.forEach((n) => {
      const p = portrait ? n.node.position.clone().add(new THREE.Vector3(0, 0.4, 3)) : map(9.5 + 4.4, n.b, 0.6);
      placeLabel(n.label, p, portrait ? `${n.name}<b>${fmt(n.value)}</b>` : `${n.name}<b> ${fmt(n.value)} </b>MW`, showPPA, portrait);
    });
  }

  return { scene, camera, update, resize, setVisible };
}
