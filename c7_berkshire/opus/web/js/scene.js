// 3D 世界：天空、云海、时间之河上的十座浮岛与各自的小场景、镜头调度与特效
import * as THREE from 'three';
import { EffectComposer, RenderPass, UnrealBloomPass, OutputPass, RoomEnvironment, mergeGeometries } from 'three-addons';

// ------------------------------------------------------------ 工具
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const ease = {
  inOut: t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  out: t => 1 - Math.pow(1 - t, 3),
  outBack: t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  outElastic: t => t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - .75) * (2 * Math.PI) / 3) + 1,
};
const clamp01 = x => Math.max(0, Math.min(1, x));
const C = c => new THREE.Color(c);

const _matCache = new Map();
export const ENV = { tex: null };
function mat(color, o = {}) {
  const key = color + JSON.stringify(o);
  if (_matCache.has(key)) return _matCache.get(key);
  const m = new THREE.MeshStandardMaterial(Object.assign({ color, roughness: .78, metalness: 0, flatShading: true }, o));
  _matCache.set(key, m);
  return m;
}

// 把多个静态几何体（带颜色）合并为一个网格，降低绘制调用
class Batch {
  constructor() { this.parts = []; }
  add(geo, color, pos = [0, 0, 0], rot = [0, 0, 0], scl = [1, 1, 1]) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    const m = new THREE.Matrix4().compose(new THREE.Vector3(...pos), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)), new THREE.Vector3(...scl));
    g.applyMatrix4(m);
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
    const n = g.attributes.position.count, col = new Float32Array(n * 3), cc = C(color);
    for (let i = 0; i < n; i++) { col[i * 3] = cc.r; col[i * 3 + 1] = cc.g; col[i * 3 + 2] = cc.b; }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.parts.push(g);
    return this;
  }
  mesh(o = {}) {
    const geo = mergeGeometries(this.parts, false);
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial(Object.assign({ vertexColors: true, roughness: .82, metalness: 0, flatShading: true }, o)));
    m.castShadow = true; m.receiveShadow = true;
    return m;
  }
}

function radialTexture(stops) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  for (const [o, col] of stops) gr.addColorStop(o, col);
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

function yearSprite(year, sub) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 236;
  const g = c.getContext('2d');
  const rr = (x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
  g.shadowColor = 'rgba(35, 57, 93, .28)'; g.shadowBlur = 22; g.shadowOffsetY = 8;
  rr(36, 18, 440, 186, 46); g.fillStyle = 'rgba(255,255,255,.94)'; g.fill();
  g.shadowColor = 'transparent';
  const gr = g.createLinearGradient(0, 30, 0, 140); gr.addColorStop(0, '#ffb92e'); gr.addColorStop(1, '#e67e00');
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '900 104px "Avenir Next", "Helvetica Neue", Arial, sans-serif'; g.fillStyle = gr; g.fillText(String(year), 256, 92);
  g.font = '700 40px "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC", sans-serif'; g.fillStyle = '#23395d'; g.fillText(sub, 256, 162);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, fog: false, toneMapped: false }));
  s.scale.set(6.4, 2.95, 1); s.renderOrder = 4;
  return s;
}

// ------------------------------------------------------------ 粒子爆发（庆祝 / 气泡破裂等）
class Bursts {
  constructor(scene, max = 700) {
    this.max = max; this.n = 0;
    this.pos = new Float32Array(max * 3); this.vel = new Float32Array(max * 3); this.col = new Float32Array(max * 3);
    this.life = new Float32Array(max); this.size = new Float32Array(max);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(this.size, 1));
    geo.setDrawRange(0, max);
    const tex = radialTexture([[0, 'rgba(255,255,255,1)'], [.35, 'rgba(255,255,255,.9)'], [1, 'rgba(255,255,255,0)']]);
    this.mat = new THREE.ShaderMaterial({
      uniforms: { map: { value: tex }, scale: { value: 300 } },
      vertexShader: `attribute float size; attribute vec3 color; varying vec3 vC; varying float vA; uniform float scale;
        void main(){ vC = color; vA = clamp(size, 0., 1.); vec4 mv = modelViewMatrix * vec4(position,1.); gl_PointSize = size * scale / -mv.z; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform sampler2D map; varying vec3 vC; varying float vA; void main(){ vec4 t = texture2D(map, gl_PointCoord); if (t.a < .02) discard; gl_FragColor = vec4(vC * 1.6, t.a * vA); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    this.points = new THREE.Points(geo, this.mat); this.points.frustumCulled = false; this.points.renderOrder = 5;
    scene.add(this.points);
    this.cursor = 0;
  }
  emit(origin, count, colors, speed = 9, up = 6, sizeK = 1) {
    for (let k = 0; k < count; k++) {
      const i = this.cursor; this.cursor = (this.cursor + 1) % this.max;
      const th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1), sp = speed * (.35 + Math.random() * .75);
      this.pos[i * 3] = origin.x; this.pos[i * 3 + 1] = origin.y; this.pos[i * 3 + 2] = origin.z;
      this.vel[i * 3] = Math.sin(ph) * Math.cos(th) * sp; this.vel[i * 3 + 1] = Math.abs(Math.cos(ph)) * sp * .7 + up * (.5 + Math.random() * .7); this.vel[i * 3 + 2] = Math.sin(ph) * Math.sin(th) * sp;
      const cc = C(colors[(Math.random() * colors.length) | 0]);
      this.col[i * 3] = cc.r; this.col[i * 3 + 1] = cc.g; this.col[i * 3 + 2] = cc.b;
      this.life[i] = 1.4 + Math.random() * 1.2; this.size[i] = (1.2 + Math.random() * 1.4) * sizeK;
    }
  }
  update(dt) {
    for (let i = 0; i < this.max; i++) {
      if (this.life[i] <= 0) { this.size[i] = 0; continue; }
      this.life[i] -= dt;
      this.vel[i * 3 + 1] -= 9.5 * dt;
      const drag = Math.pow(.35, dt);
      this.vel[i * 3] *= drag; this.vel[i * 3 + 2] *= drag;
      this.pos[i * 3] += this.vel[i * 3] * dt; this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt; this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      if (this.life[i] < .6) this.size[i] *= Math.pow(.2, dt);
    }
    const g = this.points.geometry;
    g.attributes.position.needsUpdate = true; g.attributes.size.needsUpdate = true; g.attributes.color.needsUpdate = true;
  }
}

// ------------------------------------------------------------ 十个小场景
// 每个函数返回 { group, update(t, dt, r), reveal() }，r 为揭晓后经过的秒数（未揭晓为 -1）
const SCENES = {
  store(ctx) {
    const g = new THREE.Group(), b = new Batch();
    b.add(new THREE.BoxGeometry(5.2, 2.8, 3.6), '#fff1dc', [0, 1.4, -0.6]);
    b.add(new THREE.CylinderGeometry(2.4, 2.4, 5.6, 3), '#d9573f', [0, 3.35, -0.6], [0, 0, Math.PI / 2], [1, 1, 0.82]);
    for (let i = 0; i < 6; i++) b.add(new THREE.BoxGeometry(.86, .12, 1.05), i % 2 ? '#ffffff' : '#ff6b5a', [-2.15 + i * .86, 2.25, 1.6], [-.32, 0, 0]);
    b.add(new THREE.BoxGeometry(1.1, 1.7, .1), '#3d6fa8', [0, .85, 1.16]);
    b.add(new THREE.BoxGeometry(1.3, .95, .1), '#9fd3ff', [-1.8, 1.35, 1.16]);
    b.add(new THREE.BoxGeometry(1.3, .95, .1), '#9fd3ff', [1.8, 1.35, 1.16]);
    b.add(new THREE.BoxGeometry(2.6, .5, .12), '#f2b134', [0, 2.75, 1.18]);
    // 沙发
    b.add(new THREE.BoxGeometry(2.2, .5, .9), '#2bb3a3', [-2.6, .45, 3.1]);
    b.add(new THREE.BoxGeometry(2.2, .8, .3), '#24978a', [-2.6, .85, 2.7]);
    b.add(new THREE.BoxGeometry(.3, .7, .9), '#24978a', [-3.6, .6, 3.1]);
    b.add(new THREE.BoxGeometry(.3, .7, .9), '#24978a', [-1.6, .6, 3.1]);
    // 地毯卷
    [['#e9c46a', 1.6], ['#f4a261', 2.4], ['#e76f51', 3.2]].forEach(([c, x], i) => b.add(new THREE.CylinderGeometry(.32, .32, 2.4, 10), c, [x, .32 + (i === 2 ? .62 : 0), 3.0 - (i === 2 ? .3 : 0)], [0, .2, Math.PI / 2]));
    g.add(b.mesh());
    const glow = new THREE.MeshStandardMaterial({ color: '#fff3c4', emissive: '#ffcc55', emissiveIntensity: 0, roughness: .4 });
    const win1 = new THREE.Mesh(new THREE.BoxGeometry(1.3, .95, .12), glow); win1.position.set(-1.8, 1.35, 1.17);
    const win2 = win1.clone(); win2.position.x = 1.8; g.add(win1, win2);
    // 金色支票
    const check = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1, .06), new THREE.MeshStandardMaterial({ color: '#ffe08a', metalness: .6, roughness: .25, emissive: '#ffb300', emissiveIntensity: .25 }));
    check.position.set(0, 5.2, 1); check.scale.setScalar(.001); g.add(check);
    return {
      group: g,
      update(t, dt, r) {
        if (r >= 0) {
          const k = ease.outBack(clamp01(r / .9));
          check.scale.setScalar(Math.max(.001, k)); check.rotation.y = t * 1.2; check.position.y = 5.2 + Math.sin(t * 2) * .2;
          glow.emissiveIntensity = Math.min(1.4, r * 1.6);
        }
      },
      reveal() { ctx.bursts.emit(ctx.world(new THREE.Vector3(0, 5, 1), g), 90, ['#ffd36b', '#fff2b0', '#ff9f43']); },
    };
  },

  mill(ctx) {
    const g = new THREE.Group();
    const old = new Batch();
    old.add(new THREE.BoxGeometry(5.6, 2.6, 3.4), '#b5523b', [0, 1.3, -.4]);
    for (let i = 0; i < 4; i++) old.add(new THREE.CylinderGeometry(.8, .8, 3.4, 3), '#8c3b2c', [-2.1 + i * 1.4, 3.0, -.4], [Math.PI / 2, 0, 0], [1, 1, 1]);
    old.add(new THREE.CylinderGeometry(.35, .45, 3.4, 10), '#9c4532', [2.3, 4.0, -1.5]);
    for (let i = 0; i < 4; i++) old.add(new THREE.BoxGeometry(.7, .8, .1), '#ffe2a8', [-1.9 + i * 1.25, 1.4, 1.32]);
    const oldMesh = old.mesh(); g.add(oldMesh);
    // 纱线轴
    const spools = new Batch();
    [['#ff8fab', -3.2, 2.6], ['#8ecae6', -2.4, 3.3], ['#ffd166', 3.1, 2.7], ['#b5e48c', 3.6, 1.6]].forEach(([c, x, z]) => {
      spools.add(new THREE.CylinderGeometry(.42, .42, .9, 14), c, [x, .55, z]);
      spools.add(new THREE.CylinderGeometry(.55, .55, .1, 14), '#d4a373', [x, .1, z]);
      spools.add(new THREE.CylinderGeometry(.55, .55, .1, 14), '#d4a373', [x, 1.02, z]);
    });
    g.add(spools.mesh());
    // 漏水的小船
    const pond = new THREE.Mesh(new THREE.CircleGeometry(1.6, 24), new THREE.MeshStandardMaterial({ color: '#5cc8ff', roughness: .15, metalness: .1 }));
    pond.rotation.x = -Math.PI / 2; pond.position.set(0, .05, 3.3); g.add(pond);
    const boat = new Batch();
    boat.add(new THREE.BoxGeometry(1.4, .35, .6), '#8d5524', [0, 0, 0]);
    boat.add(new THREE.CylinderGeometry(.04, .04, 1.2, 6), '#5a3a1a', [0, .6, 0]);
    boat.add(new THREE.ConeGeometry(.45, 1, 3), '#fff', [.18, .7, 0], [0, 0, -Math.PI / 2], [1, 1, .1]);
    const boatMesh = boat.mesh(); boatMesh.position.set(0, .2, 3.3); g.add(boatMesh);
    // 新楼（揭晓时升起）
    const tower = new THREE.Group();
    const glass = new THREE.MeshStandardMaterial({ color: '#bfe6ff', roughness: .08, metalness: .35, emissive: '#7cc7ff', emissiveIntensity: .25 });
    const t1 = new THREE.Mesh(new THREE.BoxGeometry(2.2, 6.4, 2.2), glass); t1.position.y = 3.2; t1.castShadow = true;
    const t2 = new THREE.Mesh(new THREE.BoxGeometry(1.6, 3.6, 1.6), glass); t2.position.set(1.7, 1.8, .6); t2.castShadow = true;
    const band = new THREE.Mesh(new THREE.BoxGeometry(2.3, .18, 2.3), mat('#f2b134', { metalness: .5, roughness: .3, flatShading: false })); band.position.y = 6.45;
    tower.add(t1, t2, band); tower.position.set(-.3, 0, -.6); tower.scale.set(1, .001, 1); g.add(tower);
    const smoke = [];
    for (let i = 0; i < 5; i++) { const s = new THREE.Mesh(new THREE.IcosahedronGeometry(.35, 1), mat('#e8e3dc', { flatShading: false, transparent: true, opacity: .8 })); s.position.set(2.3, 5.6 + i * .7, -1.5); g.add(s); smoke.push(s); }
    return {
      group: g,
      update(t, dt, r) {
        boatMesh.rotation.z = Math.sin(t * 1.7) * .08; boatMesh.position.y = .2 + Math.sin(t * 2.3) * .04 - (r >= 0 ? Math.min(.35, r * .2) : 0);
        smoke.forEach((s, i) => { const k = (t * .35 + i / 5) % 1; s.position.y = 5.5 + k * 3.4; s.position.x = 2.3 + Math.sin(k * 6 + i) * .3; s.scale.setScalar(.5 + k * 1.2); s.material.opacity = .75 * (1 - k); s.visible = r < 0 || r < 1.2; });
        if (r >= 0) {
          const k = ease.inOut(clamp01(r / 1.6));
          oldMesh.position.y = -k * 3.2; oldMesh.scale.y = Math.max(.05, 1 - k * .9);
          const k2 = ease.outBack(clamp01((r - .9) / 1.3));
          tower.scale.y = Math.max(.001, k2);
          glass.emissiveIntensity = .25 + .35 * (.5 + .5 * Math.sin(t * 2));
        }
      },
      reveal() { ctx.bursts.emit(ctx.world(new THREE.Vector3(0, 1.5, -.4), g), 70, ['#e8d5c4', '#cdb4a3', '#fff1dc'], 7, 3); },
    };
  },

  umbrella(ctx) {
    const g = new THREE.Group(), b = new Batch();
    b.add(new THREE.BoxGeometry(2.6, .14, 1.4), '#c48a5a', [0, 1.1, 0]);
    for (const [x, z] of [[-1.15, -.55], [1.15, -.55], [-1.15, .55], [1.15, .55]]) b.add(new THREE.CylinderGeometry(.07, .07, 1.1, 6), '#8d5524', [x, .55, z]);
    b.add(new THREE.BoxGeometry(.8, .8, .8), '#3d6fa8', [-1.9, .4, .9]); b.add(new THREE.BoxGeometry(.8, 1.2, .12), '#3d6fa8', [-1.9, .9, .52]);
    b.add(new THREE.BoxGeometry(.8, .8, .8), '#e76f51', [1.9, .4, .9]); b.add(new THREE.BoxGeometry(.8, 1.2, .12), '#e76f51', [1.9, .9, .52]);
    b.add(new THREE.BoxGeometry(.7, .5, .2), '#5a3a1a', [.6, 1.42, .1]);
    b.add(new THREE.CylinderGeometry(.09, .09, 5.4, 8), '#5a4a3a', [-.6, 2.7, -2.4]);
    g.add(b.mesh());
    // 伞面：交替配色
    const canopyGeo = new THREE.ConeGeometry(3.1, 1.3, 12, 1, true).toNonIndexed();
    const cols = new Float32Array(canopyGeo.attributes.position.count * 3);
    for (let i = 0; i < canopyGeo.attributes.position.count; i++) { const seg = Math.floor(i / 3) % 12; const c = C(seg % 2 ? '#ffffff' : '#ff7a59'); cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b; }
    canopyGeo.setAttribute('color', new THREE.BufferAttribute(cols, 3)); canopyGeo.computeVertexNormals();
    const canopy = new THREE.Mesh(canopyGeo, new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: .6, flatShading: true }));
    canopy.position.set(-.6, 5.75, -2.4); canopy.scale.set(.14, 1.6, .14); canopy.castShadow = true; g.add(canopy);
    // 浮存金之池
    const poolMat = new THREE.MeshStandardMaterial({ color: '#7fd6ff', roughness: .1, metalness: .2, transparent: true, opacity: .85, emissive: '#4fc3ff', emissiveIntensity: .35 });
    const pool = new THREE.Mesh(new THREE.CircleGeometry(5.2, 40), poolMat); pool.rotation.x = -Math.PI / 2; pool.position.y = .04; pool.scale.setScalar(.001); g.add(pool);
    const coins = new THREE.InstancedMesh(new THREE.CylinderGeometry(.32, .32, .08, 16), mat('#ffcf4a', { metalness: .8, roughness: .25, flatShading: false, emissive: '#b37400', emissiveIntensity: .25 }), 26);
    const dummy = new THREE.Object3D(), seeds = [];
    for (let i = 0; i < 26; i++) { const a = i / 26 * Math.PI * 2, rr = 2.4 + (i % 3) * .9; seeds.push([Math.cos(a) * rr, Math.sin(a) * rr, Math.random() * 6]); }
    coins.visible = false; g.add(coins);
    return {
      group: g,
      update(t, dt, r) {
        if (r >= 0) {
          const k = ease.outBack(clamp01(r / 1.1));
          canopy.scale.set(.14 + .86 * k, 1.6 - .6 * k, .14 + .86 * k);
          pool.scale.setScalar(Math.max(.001, ease.out(clamp01((r - .4) / 1.4))));
          coins.visible = r > .6;
          seeds.forEach(([x, z, ph], i) => { dummy.position.set(x, .25 + Math.sin(t * 2 + ph) * .12, z); dummy.rotation.set(Math.PI / 2 + Math.sin(t + ph) * .3, t + ph, 0); dummy.scale.setScalar(ease.out(clamp01((r - .6 - i * .03) / .6)) + .001); dummy.updateMatrix(); coins.setMatrixAt(i, dummy.matrix); });
          coins.instanceMatrix.needsUpdate = true;
        } else canopy.rotation.y = Math.sin(t * .8) * .1;
      },
      reveal() { ctx.bursts.emit(ctx.world(new THREE.Vector3(-.6, 5, -2.4), g), 60, ['#ffffff', '#ffd36b', '#7fd6ff']); },
    };
  },

  bottle(ctx) {
    const g = new THREE.Group(), b = new Batch();
    for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) {
      const x = -3 + i * 1.5, z = 2 + j * 1.25 - (i === 1 ? .2 : 0), y = .45;
      b.add(new THREE.BoxGeometry(1.4, .9, 1.15), '#d62828', [x, y, z]);
      b.add(new THREE.BoxGeometry(1.44, .18, 1.19), '#a4161a', [x, y + .3, z]);
    }
    b.add(new THREE.BoxGeometry(1.4, .9, 1.15), '#d62828', [-2.25, 1.35, 2.6]);
    g.add(b.mesh());
    // 一只“巨型汽水瓶”（通用造型，无任何商标）
    const pts = []; const prof = [[0, 0], [1.05, 0], [1.15, .2], [1.15, 2.6], [1.0, 3.2], [.55, 3.9], [.42, 4.6], [.46, 4.75], [.0, 4.75]];
    for (const [x, y] of prof) pts.push(new THREE.Vector2(x, y));
    const bottle = new THREE.Mesh(new THREE.LatheGeometry(pts, 28), new THREE.MeshStandardMaterial({ color: '#8a1c1c', roughness: .12, metalness: .05, flatShading: false }));
    bottle.castShadow = true; bottle.position.set(1.6, 0, -.8);
    const label = new THREE.Mesh(new THREE.CylinderGeometry(1.17, 1.17, .9, 28, 1, true), mat('#ffffff', { flatShading: false, roughness: .5, side: THREE.DoubleSide }));
    label.position.y = 1.6; bottle.add(label);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(.5, .5, .22, 18), mat('#f2b134', { metalness: .7, roughness: .3, flatShading: false })); cap.position.y = 4.86; bottle.add(cap);
    g.add(bottle);
    // ∞ 永久持有
    const curve = new THREE.Curve(); curve.getPoint = (u, tgt = new THREE.Vector3()) => { const a = u * Math.PI * 2, d = 1 + Math.sin(a) ** 2; return tgt.set(2.6 * Math.cos(a) / d, 2.6 * Math.sin(a) * Math.cos(a) / d, 0); };
    const inf = new THREE.Mesh(new THREE.TubeGeometry(curve, 120, .16, 10, true), new THREE.MeshStandardMaterial({ color: '#ffd36b', emissive: '#ffb300', emissiveIntensity: .9, metalness: .6, roughness: .25 }));
    inf.position.set(1.6, 6.7, -.8); inf.scale.setScalar(.001); g.add(inf);
    const coins = new THREE.InstancedMesh(new THREE.CylinderGeometry(.28, .28, .07, 16), mat('#ffcf4a', { metalness: .8, roughness: .25, flatShading: false, emissive: '#b37400', emissiveIntensity: .3 }), 40);
    coins.visible = false; g.add(coins);
    const dummy = new THREE.Object3D();
    return {
      group: g,
      update(t, dt, r) {
        bottle.rotation.y = t * .25;
        if (r >= 0) {
          inf.scale.setScalar(Math.max(.001, ease.outBack(clamp01(r / 1)))); inf.rotation.y = Math.sin(t * .8) * .5;
          coins.visible = true;
          for (let i = 0; i < 40; i++) {
            const ph = (t * .45 + i / 40) % 1, a = i * 2.39;
            dummy.position.set(1.6 + Math.cos(a) * (ph * 3.4), 5.0 + ph * 2.2 - ph * ph * 7, -.8 + Math.sin(a) * (ph * 3.4));
            dummy.rotation.set(t * 3 + i, t * 2, 0); dummy.scale.setScalar(clamp01(r - i * .02) * (ph < .9 ? 1 : (1 - ph) * 10));
            dummy.updateMatrix(); coins.setMatrixAt(i, dummy.matrix);
          }
          coins.instanceMatrix.needsUpdate = true;
        }
      },
      reveal() { ctx.bursts.emit(ctx.world(new THREE.Vector3(1.6, 5.2, -.8), g), 80, ['#ffd36b', '#ffec99', '#ff6b5a']); },
    };
  },

  bank(ctx) {
    const g = new THREE.Group(), b = new Batch();
    b.add(new THREE.BoxGeometry(6, .4, 4), '#e9e4d8', [0, .2, -.4]);
    b.add(new THREE.BoxGeometry(5.4, .4, 3.6), '#f3efe6', [0, .6, -.4]);
    for (let i = 0; i < 6; i++) b.add(new THREE.CylinderGeometry(.24, .28, 2.6, 12), '#ffffff', [-2.2 + i * .88, 2.1, .9]);
    b.add(new THREE.BoxGeometry(5.2, 2.6, 2.2), '#f6f1e7', [0, 2.1, -1.0]);
    b.add(new THREE.BoxGeometry(5.6, .35, 3.6), '#e9e4d8', [0, 3.55, -.4]);
    b.add(new THREE.CylinderGeometry(1.5, 1.5, 5.6, 3), '#d9d2c3', [0, 4.15, -.4], [0, 0, Math.PI / 2], [1, .5, .62]);
    b.add(new THREE.BoxGeometry(1, 1.7, .1), '#3d6fa8', [0, 1.65, .12]);
    g.add(b.mesh());
    const shape = new THREE.Shape();
    shape.moveTo(-.35, 1.2); shape.lineTo(.35, 1.2); shape.lineTo(.35, -.2); shape.lineTo(.8, -.2); shape.lineTo(0, -1.2); shape.lineTo(-.8, -.2); shape.lineTo(-.35, -.2); shape.closePath();
    const arrowMat = new THREE.MeshStandardMaterial({ color: '#ff5d5d', emissive: '#ff2d2d', emissiveIntensity: .35, roughness: .35, metalness: .1 });
    const arrow = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: .35, bevelEnabled: true, bevelSize: .06, bevelThickness: .06, bevelSegments: 2 }), arrowMat);
    arrow.position.set(3.6, 4.2, .6); arrow.castShadow = true; g.add(arrow);
    const red = C('#ff5d5d'), green = C('#22c55e'), redE = C('#ff2d2d'), greenE = C('#16a34a');
    return {
      group: g,
      update(t, dt, r) {
        if (r < 0) { arrow.position.y = 4.2 + Math.sin(t * 2.2) * .25 - ((t * .5) % 1) * .3; arrow.rotation.y = Math.sin(t) * .3; arrow.rotation.z = 0; }
        else {
          const k = ease.outBack(clamp01(r / 1.2));
          arrow.rotation.z = Math.PI * k; arrow.position.y = 4.2 + k * 1.2 + Math.sin(t * 2) * .15; arrow.rotation.y = t * .6;
          arrowMat.color.copy(red).lerp(green, clamp01(r / .8)); arrowMat.emissive.copy(redE).lerp(greenE, clamp01(r / .8));
        }
      },
      reveal() { ctx.bursts.emit(ctx.world(new THREE.Vector3(3.6, 4.8, .6), g), 70, ['#86efac', '#ffd36b', '#ffffff']); },
    };
  },

  castle(ctx) {
    const g = new THREE.Group(), b = new Batch();
    const wall = '#f1e3c8', roof = '#3d7be0';
    b.add(new THREE.BoxGeometry(4.2, 2, 4.2), wall, [0, 1, 0]);
    for (const [x, z] of [[-2.1, -2.1], [2.1, -2.1], [-2.1, 2.1], [2.1, 2.1]]) {
      b.add(new THREE.CylinderGeometry(.7, .78, 3.4, 12), wall, [x, 1.7, z]);
      b.add(new THREE.ConeGeometry(.95, 1.6, 12), roof, [x, 4.2, z]);
      b.add(new THREE.SphereGeometry(.14, 8, 6), '#ffd36b', [x, 5.05, z]);
    }
    b.add(new THREE.CylinderGeometry(1.1, 1.2, 4.6, 14), wall, [0, 2.3, 0]);
    b.add(new THREE.ConeGeometry(1.45, 2.2, 14), roof, [0, 5.7, 0]);
    b.add(new THREE.SphereGeometry(.2, 10, 8), '#ffd36b', [0, 6.9, 0]);
    for (let i = 0; i < 5; i++) b.add(new THREE.BoxGeometry(.38, .4, .5), wall, [-1.5 + i * .75, 2.2, 2.1]);
    b.add(new THREE.BoxGeometry(1.1, 1.4, .2), '#7a5230', [0, .7, 2.12]);
    g.add(b.mesh());
    const moatMat = new THREE.MeshStandardMaterial({ color: '#4fc3ff', roughness: .08, metalness: .25, emissive: '#2aa5ff', emissiveIntensity: .25, side: THREE.DoubleSide });
    const moat = new THREE.Mesh(new THREE.RingGeometry(3.6, 4.4, 64), moatMat); moat.rotation.x = -Math.PI / 2; moat.position.y = .06; g.add(moat);
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(1.1, .12, 1.8), mat('#9c6b3f')); bridge.position.set(0, .14, 3.25); g.add(bridge);
    return {
      group: g,
      update(t, dt, r) {
        moatMat.emissiveIntensity = .25 + .1 * Math.sin(t * 2);
        if (r >= 0) {
          const k = ease.outElastic(clamp01(r / 1.6));
          moat.scale.set(1 + .55 * k, 1 + .55 * k, 1); moatMat.emissiveIntensity = .5 + .25 * Math.sin(t * 3);
          bridge.scale.z = 1 + .9 * k; bridge.position.z = 3.25 + .9 * k;
        }
      },
      reveal() { ctx.bursts.emit(ctx.world(new THREE.Vector3(0, 6, 0), g), 80, ['#7fd6ff', '#ffffff', '#ffd36b']); },
    };
  },

  bubble(ctx) {
    const g = new THREE.Group(), b = new Batch();
    for (let i = 0; i < 4; i++) for (let j = 0; j < 3 - (i > 1 ? 1 : 0); j++) b.add(new THREE.BoxGeometry(.9, .42, .45), '#c8553d', [-3 + j * .95 + (i % 2) * .45, .21 + i * .44, 2.4]);
    b.add(new THREE.CylinderGeometry(.42, .42, 2.2, 12), '#9d8189', [1.4, .42, 2.8], [0, .3, Math.PI / 2]);
    b.add(new THREE.CylinderGeometry(.5, .5, 1.4, 12), '#ffafcc', [3.0, .7, 1.6]);
    for (const [x, c] of [[-.6, '#4ea8de'], [.3, '#ffd166']]) { b.add(new THREE.CylinderGeometry(.45, .45, .9, 14), c, [x, .45, 3.4]); b.add(new THREE.CylinderGeometry(.47, .47, .08, 14), '#adb5bd', [x, .92, 3.4]); }
    const ground = b.mesh(); g.add(ground);
    const bubbleMat = new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: .05, metalness: 0, transparent: true, opacity: .32, iridescence: 1, iridescenceIOR: 1.3, iridescenceThicknessRange: [120, 480], clearcoat: 1, side: THREE.DoubleSide, depthWrite: false });
    const bubble = new THREE.Mesh(new THREE.SphereGeometry(3.2, 48, 32), bubbleMat); bubble.position.set(0, 6.2, -.6); bubble.renderOrder = 3; g.add(bubble);
    const chips = [];
    const chipCols = ['#ff4ecd', '#7c5cff', '#22d3ee', '#a3e635'];
    for (let i = 0; i < 9; i++) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(.7, .7, .7), new THREE.MeshStandardMaterial({ color: chipCols[i % 4], emissive: chipCols[i % 4], emissiveIntensity: .8, roughness: .3 }));
      const a = i / 9 * Math.PI * 2; m.userData = { a, rr: 1.4 + (i % 3) * .4, y: (i % 3 - 1) * .7 };
      bubble.add(m); chips.push(m);
    }
    const brickGlow = ground.material;
    return {
      group: g,
      update(t, dt, r) {
        if (r < 0 || r < .35) {
          const w = r < 0 ? 0 : r / .35;
          bubble.scale.setScalar(1 + Math.sin(t * 2.4) * .03 + w * .25); bubble.rotation.y = t * .3;
          chips.forEach((c, i) => { const u = c.userData; c.position.set(Math.cos(u.a + t * .8) * u.rr, u.y + Math.sin(t * 2 + i) * .2, Math.sin(u.a + t * .8) * u.rr); c.rotation.set(t + i, t * 1.3, 0); });
        } else {
          bubble.visible = false;
          chips.forEach((c, i) => { if (!c.userData.fallen) { c.userData.fallen = true; const p = new THREE.Vector3(); c.getWorldPosition(p); g.worldToLocal(p); g.add(c); c.position.copy(p); c.userData.vy = 1 + Math.random() * 2; } c.userData.vy -= 9 * dt; c.position.y = Math.max(.35, c.position.y + c.userData.vy * dt); c.material.emissiveIntensity = Math.max(0, .8 - (r - .35)); c.scale.setScalar(Math.max(.001, 1 - (r - .35) * .45)); });
          brickGlow.emissive = brickGlow.emissive || new THREE.Color(); brickGlow.emissive.set('#ff9f1c'); brickGlow.emissiveIntensity = .25 + .15 * Math.sin(t * 3);
        }
      },
      reveal() { ctx.bursts.emit(ctx.world(new THREE.Vector3(0, 6.2, -.6), g), 160, ['#ffffff', '#c7f9ff', '#ffd6ff', '#fff3b0'], 12, 2, .9); },
    };
  },

  storm(ctx) {
    const g = new THREE.Group(), b = new Batch();
    b.add(new THREE.CylinderGeometry(.75, 1.05, 5.4, 14), '#ffffff', [1.4, 2.7, -.8]);
    for (let i = 0; i < 3; i++) b.add(new THREE.CylinderGeometry(.92 - i * .1, .96 - i * .1, .5, 14), '#ef4444', [1.4, 1.0 + i * 1.6, -.8]);
    b.add(new THREE.CylinderGeometry(.9, .9, .25, 14), '#23395d', [1.4, 5.5, -.8]);
    b.add(new THREE.ConeGeometry(.95, .9, 14), '#ef4444', [1.4, 6.55, -.8]);
    b.add(new THREE.BoxGeometry(2.4, .9, 1.8), '#fefae0', [-1.6, .45, 1.2]); b.add(new THREE.CylinderGeometry(1.4, 1.4, 2.6, 3), '#4f772d', [-1.6, 1.25, 1.2], [0, 0, Math.PI / 2], [1, .5, .78]);
    g.add(b.mesh());
    const lampMat = new THREE.MeshStandardMaterial({ color: '#fff6c9', emissive: '#ffd36b', emissiveIntensity: 1.6 });
    const lamp = new THREE.Mesh(new THREE.CylinderGeometry(.62, .62, .8, 14), lampMat); lamp.position.set(1.4, 5.95, -.8); g.add(lamp);
    const cloudMat = new THREE.MeshStandardMaterial({ color: '#7d8796', roughness: 1, transparent: true, opacity: .95, flatShading: false });
    const clouds = new THREE.Group();
    const rnd = mulberry32(8);
    for (let i = 0; i < 14; i++) { const s = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 2), cloudMat); const a = rnd() * Math.PI * 2, rr = rnd() * 3.2; s.position.set(Math.cos(a) * rr, rnd() * .9, Math.sin(a) * rr); s.scale.setScalar(1 + rnd() * 1.1); s.userData.dir = new THREE.Vector3(Math.cos(a), .2, Math.sin(a)); clouds.add(s); }
    clouds.position.set(0, 9.2, 0); g.add(clouds);
    const rainGeo = new THREE.BufferGeometry(), RN = 160, rp = new Float32Array(RN * 6);
    for (let i = 0; i < RN; i++) { const x = (rnd() - .5) * 8, z = (rnd() - .5) * 8, y = rnd() * 8; rp.set([x, y, z, x - .05, y - .6, z], i * 6); }
    rainGeo.setAttribute('position', new THREE.BufferAttribute(rp, 3));
    const rainMat = new THREE.LineBasicMaterial({ color: '#cfe3ff', transparent: true, opacity: .7 });
    const rain = new THREE.LineSegments(rainGeo, rainMat); rain.position.y = .4; g.add(rain);
    const bolt = new THREE.PointLight('#dbeafe', 0, 30); bolt.position.set(0, 9, 0); g.add(bolt);
    // 彩虹
    const rb = new THREE.Group(), rbCols = ['#ff595e', '#ff924c', '#ffca3a', '#8ac926', '#1982c4', '#6a4c93'];
    rbCols.forEach((c, i) => { const m = new THREE.Mesh(new THREE.TorusGeometry(5.6 - i * .26, .13, 8, 64, Math.PI), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: .0 })); rb.add(m); });
    rb.position.set(-.4, .4, -2.2); g.add(rb);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(.6, 3.2, 12, 32, 1, true), new THREE.MeshBasicMaterial({ color: '#fff4c2', transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
    beam.position.set(0, 7, 0); g.add(beam);
    let flash = 0;
    return {
      group: g,
      update(t, dt, r) {
        lamp.rotation.y = t * 2;
        const arr = rainGeo.attributes.position.array;
        for (let i = 0; i < RN; i++) { let y = arr[i * 6 + 1] - dt * 14; if (y < 0) y += 8; arr[i * 6 + 1] = y; arr[i * 6 + 4] = y - .6; }
        rainGeo.attributes.position.needsUpdate = true;
        if (r < 0) {
          flash -= dt; if (flash < -2.6 - Math.random() * 3) flash = .18;
          bolt.intensity = flash > 0 ? 260 : 0; clouds.rotation.y = t * .1;
        } else {
          bolt.intensity = 0;
          const k = ease.inOut(clamp01(r / 2));
          clouds.children.forEach(s => { s.position.addScaledVector(s.userData.dir, dt * 4 * (1 - k * .3)); });
          cloudMat.opacity = .95 * (1 - k); cloudMat.color.set('#7d8796').lerp(C('#ffffff'), k);
          rainMat.opacity = .7 * (1 - clamp01(r / .8)); rain.visible = r < 1;
          rb.children.forEach((m, i) => { m.material.opacity = .85 * ease.out(clamp01((r - .8 - i * .08) / 1.2)); });
          beam.material.opacity = .12 * ease.out(clamp01((r - .3) / 1.5)); beam.rotation.y = t * .2;
        }
      },
      reveal() { ctx.bursts.emit(ctx.world(new THREE.Vector3(0, 8, 0), g), 70, ['#fff4c2', '#ffffff', '#ffd36b'], 8, 2); },
    };
  },

  train(ctx) {
    const g = new THREE.Group(), b = new Batch();
    const R = 4.4;
    for (let i = 0; i < 40; i++) { const a = i / 40 * Math.PI * 2; b.add(new THREE.BoxGeometry(.25, .1, 1.1), '#8d6e63', [Math.cos(a) * R, .08, Math.sin(a) * R], [0, -a, 0]); }
    b.add(new THREE.BoxGeometry(2.2, 1.8, 1.6), '#fefae0', [-.6, .9, -.6]); b.add(new THREE.CylinderGeometry(1.25, 1.25, 2.4, 3), '#bc4749', [-.6, 2.15, -.6], [0, 0, Math.PI / 2], [1, .55, .74]);
    b.add(new THREE.BoxGeometry(.5, 2.6, .5), '#adb5bd', [1.4, 1.3, .8]); b.add(new THREE.BoxGeometry(.9, .1, .9), '#ffd166', [1.4, 2.65, .8]);
    g.add(b.mesh());
    const railMat = mat('#6c757d', { metalness: .6, roughness: .35, flatShading: false });
    for (const rr of [R - .38, R + .38]) { const rail = new THREE.Mesh(new THREE.TorusGeometry(rr, .06, 6, 96), railMat); rail.rotation.x = Math.PI / 2; rail.position.y = .18; g.add(rail); }
    const trainG = new THREE.Group(); g.add(trainG);
    const cars = [];
    const loco = new Batch();
    loco.add(new THREE.BoxGeometry(1.7, .9, .95), '#f77f00', [0, .75, 0]);
    loco.add(new THREE.BoxGeometry(.7, .7, .95), '#d65a00', [-.5, 1.5, 0]);
    loco.add(new THREE.CylinderGeometry(.13, .16, .5, 8), '#343a40', [.55, 1.42, 0]);
    loco.add(new THREE.BoxGeometry(1.8, .18, .8), '#343a40', [0, .3, 0]);
    loco.add(new THREE.BoxGeometry(.5, .4, .05), '#bde0fe', [-.5, 1.55, .5]);
    const locoMesh = loco.mesh(); cars.push(locoMesh); trainG.add(locoMesh);
    ['#2a9d8f', '#e9c46a', '#457b9d', '#e76f51'].forEach(c => { const cb = new Batch(); cb.add(new THREE.BoxGeometry(1.6, .9, .9), c, [0, .78, 0]); cb.add(new THREE.BoxGeometry(1.7, .16, .78), '#343a40', [0, .3, 0]); const m = cb.mesh(); cars.push(m); trainG.add(m); });
    const puffs = [];
    for (let i = 0; i < 6; i++) { const p = new THREE.Mesh(new THREE.IcosahedronGeometry(.28, 1), mat('#ffffff', { flatShading: false, transparent: true, opacity: .8 })); p.visible = false; g.add(p); puffs.push(p); }
    let ang = 0.6, speed = 0;
    const place = () => cars.forEach((m, i) => { const a = ang - i * .44; m.position.set(Math.cos(a) * R, .12, Math.sin(a) * R); m.rotation.y = -a - Math.PI / 2; });
    place();
    return {
      group: g,
      update(t, dt, r) {
        if (r >= 0) { speed = Math.min(.9, speed + dt * .45); ang += speed * dt; place();
          puffs.forEach((p, i) => { const k = (t * .9 + i / 6) % 1; const a = ang + .06; p.visible = true; p.position.set(Math.cos(a) * R, 1.9 + k * 2.2, Math.sin(a) * R); p.position.x += Math.sin(k * 5 + i) * .25; p.scale.setScalar(.4 + k * 1.4); p.material.opacity = .8 * (1 - k); }); }
      },
      reveal() { ctx.bursts.emit(ctx.world(new THREE.Vector3(0, 3, 0), g), 60, ['#ffd36b', '#f77f00', '#ffffff']); },
    };
  },

  tree(ctx) {
    const g = new THREE.Group();
    const tree = new THREE.Group(); tree.position.set(-.4, 0, -1.2); g.add(tree);
    const tb = new Batch();
    tb.add(new THREE.CylinderGeometry(.32, .5, 3, 8), '#8d5524', [0, 1.5, 0]);
    tb.add(new THREE.CylinderGeometry(.12, .18, 1.6, 6), '#8d5524', [.6, 2.6, .1], [0, 0, -.7]);
    tb.add(new THREE.CylinderGeometry(.12, .18, 1.4, 6), '#8d5524', [-.55, 2.8, -.1], [0, 0, .7]);
    const rnd = mulberry32(42), leafCols = ['#52b788', '#74c69d', '#40916c', '#95d5b2'];
    const fruitPos = [];
    for (let i = 0; i < 11; i++) { const a = rnd() * Math.PI * 2, rr = rnd() * 1.5, y = 3.6 + rnd() * 1.8; const s = 1 + rnd() * .7; tb.add(new THREE.IcosahedronGeometry(1, 1), leafCols[i % 4], [Math.cos(a) * rr, y, Math.sin(a) * rr], [rnd(), rnd(), 0], [s, s * .9, s]); }
    for (let i = 0; i < 16; i++) { const a = rnd() * Math.PI * 2, y = 3.2 + rnd() * 2.6, rr = 1.6 + rnd() * .7; fruitPos.push([Math.cos(a) * rr, y, Math.sin(a) * rr]); }
    tree.add(tb.mesh());
    const fruitMat = new THREE.MeshStandardMaterial({ color: '#ffd166', metalness: .85, roughness: .2, emissive: '#ffae00', emissiveIntensity: .35 });
    const fruits = new THREE.InstancedMesh(new THREE.SphereGeometry(.26, 14, 10), fruitMat, fruitPos.length); tree.add(fruits);
    const dummy = new THREE.Object3D();
    const setFruits = (k, t) => fruitPos.forEach(([x, y, z], i) => { const vis = i < 5 ? 1 : clamp01(k * 3 - (i - 5) * .15); dummy.position.set(x, y + Math.sin(t * 2 + i) * .05, z); dummy.scale.setScalar(Math.max(.001, vis * (1 + .15 * Math.sin(t * 3 + i)))); dummy.updateMatrix(); fruits.setMatrixAt(i, dummy.matrix); });
    setFruits(0, 0); fruits.instanceMatrix.needsUpdate = true;
    // 一只小果篮（“分红”的那一点）
    const basket = new Batch(); basket.add(new THREE.CylinderGeometry(.75, .55, .55, 12), '#c9a227', [2.9, .28, 2.2]); basket.add(new THREE.SphereGeometry(.24, 10, 8), '#ffd166', [2.8, .62, 2.1]); basket.add(new THREE.SphereGeometry(.24, 10, 8), '#ffd166', [3.1, .6, 2.35]);
    g.add(basket.mesh());
    return {
      group: g,
      update(t, dt, r) {
        tree.rotation.y = Math.sin(t * .4) * .08;
        const k = r >= 0 ? ease.outElastic(clamp01(r / 2.2)) : 0;
        tree.scale.setScalar(1 + .28 * k);
        setFruits(r >= 0 ? clamp01(r / 1.8) : 0, t); fruits.instanceMatrix.needsUpdate = true;
        fruitMat.emissiveIntensity = .35 + (r >= 0 ? .35 + .2 * Math.sin(t * 3) : 0);
      },
      reveal() { ctx.bursts.emit(ctx.world(new THREE.Vector3(0, 5.5, 0), g), 90, ['#ffd166', '#b7e4c7', '#fff3b0']); },
    };
  },
};

// ------------------------------------------------------------ 世界
export class World {
  constructor(container, questions, opts = {}) {
    this.container = container; this.questions = questions;
    const coarse = matchMedia('(pointer: coarse)').matches, small = Math.min(innerWidth, innerHeight) < 700;
    this.mobile = coarse || small;
    this.q = this.mobile ? { dpr: Math.min(devicePixelRatio || 1, 1.5), shadows: false, bloom: false, puffs: 170, dust: 240 }
                         : { dpr: Math.min(devicePixelRatio || 1, 2), shadows: true, bloom: true, puffs: 560, dust: 900 };
    if (opts.lowPower) Object.assign(this.q, { dpr: 1, shadows: false, bloom: false, puffs: 140, dust: 200 });
    this.clock = new THREE.Clock(); this.t = 0;
    this.islands = []; this.active = -1; this.mode = 'overview';
    this.shift = { x: 0, y: 0, tx: 0, ty: 0 };
    this.fly = null; this.camBase = new THREE.Vector3(); this.lookBase = new THREE.Vector3(); this.look = new THREE.Vector3();
    this.fpsSamples = []; this.degraded = false;
  }

  init() {
    const r = this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', alpha: false, stencil: false });
    r.setPixelRatio(this.q.dpr); r.setSize(innerWidth, innerHeight);
    r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.0;
    r.shadowMap.enabled = this.q.shadows; r.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(r.domElement);
    r.domElement.addEventListener('webglcontextlost', e => { e.preventDefault(); this.lost = true; this.onLost && this.onLost(); });
    r.domElement.addEventListener('webglcontextrestored', () => { this.lost = false; });

    const s = this.scene = new THREE.Scene();
    s.fog = new THREE.Fog('#c4e3ff', 170, 640);
    // 环境反射只给金属/玻璃类材质，避免整体发灰
    const pm = new THREE.PMREMGenerator(r);
    this.envTex = pm.fromScene(new RoomEnvironment(r), .04).texture; pm.dispose();
    this.camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, .5, 900);
    this.baseFov = 42;

    this.buildSky(); this.buildLights(); this.buildClouds(); this.buildDust();
    this.bursts = new Bursts(s, this.mobile ? 360 : 800);
    this.ctx = { bursts: this.bursts, world: (v, obj) => obj.localToWorld(v.clone()) };
    this.buildIslands(); this.buildPath();
    // 只给金属、玻璃、水面等材质加环境反射
    this.scene.traverse(o => {
      if (!o.isMesh) return;
      (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => {
        if (m && m.isMeshStandardMaterial && (m.metalness > .3 || m.roughness < .2)) { m.envMap = this.envTex; m.envMapIntensity = .85; m.needsUpdate = true; }
      });
    });

    if (this.q.bloom) {
      this.composer = new EffectComposer(r);
      this.composer.addPass(new RenderPass(s, this.camera));
      this.bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), .32, .42, .95);
      this.composer.addPass(this.bloom);
      this.composer.addPass(new OutputPass());
    }
    this.overviewPose(0, true);
    addEventListener('resize', () => this.resize());
    this.resize();
    r.setAnimationLoop(() => this.frame());
  }

  // -------------------------------------------------- 天空
  buildSky() {
    const geo = new THREE.SphereGeometry(600, 48, 24);
    this.skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { top: { value: C('#2a86ff') }, mid: { value: C('#7cc2ff') }, hor: { value: C('#eaf6ff') }, low: { value: C('#9fd3ff') },
        sunDir: { value: new THREE.Vector3(.55, .32, -.77).normalize() }, sunCol: { value: C('#fff1c8') } },
      vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.); p.z = p.w * .99995; gl_Position = p; }`,
      fragmentShader: `uniform vec3 top, mid, hor, low, sunDir, sunCol; varying vec3 vDir;
        void main(){ vec3 d = normalize(vDir); float h = d.y;
          vec3 c = mix(hor, mid, smoothstep(0.0, 0.16, h)); c = mix(c, top, smoothstep(0.28, 0.95, h)); c = mix(c, low, smoothstep(0.0, -0.35, h));
          float s = max(dot(d, normalize(sunDir)), 0.);
          c += sunCol * (pow(s, 900.) * 6.0 + pow(s, 40.) * .5 + pow(s, 6.) * .16);
          gl_FragColor = vec4(c, 1.);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    });
    this.sky = new THREE.Mesh(geo, this.skyMat); this.sky.frustumCulled = false; this.sky.renderOrder = -10;
    this.scene.add(this.sky);
  }

  buildLights() {
    const s = this.scene;
    s.add(new THREE.HemisphereLight('#bfe0ff', '#ffd9a8', 1.5));
    const sun = this.sun = new THREE.DirectionalLight('#ffe8c0', 3.4);
    sun.position.set(55, 80, -60); s.add(sun); s.add(sun.target);
    if (this.q.shadows) {
      sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
      const c = sun.shadow.camera; c.left = -22; c.right = 22; c.top = 22; c.bottom = -22; c.near = 10; c.far = 220;
      sun.shadow.bias = -.0004; sun.shadow.normalBias = .03; sun.shadow.radius = 3;
    }
    const fill = new THREE.DirectionalLight('#d8ecff', .65); fill.position.set(-60, 30, 50); s.add(fill);
  }

  buildClouds() {
    const N = this.q.puffs, rnd = mulberry32(7);
    const geo = new THREE.IcosahedronGeometry(1, 2);
    const m = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, metalness: 0, emissive: '#f2f8ff', emissiveIntensity: .12 });
    this.cloudsLow = new THREE.InstancedMesh(geo, m, N); this.cloudsHigh = new THREE.InstancedMesh(geo, m, Math.floor(N * .22));
    const dummy = new THREE.Object3D();
    let i = 0;
    while (i < N) {
      const a = rnd() * Math.PI * 2, rr = 20 + Math.sqrt(rnd()) * 200, cx = Math.cos(a) * rr, cz = Math.sin(a) * rr, cy = -24 - rnd() * 7;
      const puffs = 4 + (rnd() * 6 | 0);
      for (let k = 0; k < puffs && i < N; k++, i++) {
        dummy.position.set(cx + (rnd() - .5) * 14, cy + rnd() * 3, cz + (rnd() - .5) * 9);
        const sc = 3 + rnd() * 5.5; dummy.scale.set(sc * 1.25, sc * .7, sc); dummy.rotation.set(0, rnd() * 3, 0); dummy.updateMatrix(); this.cloudsLow.setMatrixAt(i, dummy.matrix);
      }
    }
    const NH = this.cloudsHigh.count; i = 0;
    while (i < NH) {
      const a = rnd() * Math.PI * 2, rr = 80 + rnd() * 160, cx = Math.cos(a) * rr, cz = Math.sin(a) * rr, cy = 14 + rnd() * 34;
      for (let k = 0; k < 5 && i < NH; k++, i++) { dummy.position.set(cx + (rnd() - .5) * 12, cy + rnd() * 2.5, cz + (rnd() - .5) * 7); const sc = 2.5 + rnd() * 4; dummy.scale.set(sc * 1.4, sc * .65, sc); dummy.updateMatrix(); this.cloudsHigh.setMatrixAt(i, dummy.matrix); }
    }
    this.scene.add(this.cloudsLow, this.cloudsHigh);
  }

  buildDust() {
    const N = this.q.dust, rnd = mulberry32(3), pos = new Float32Array(N * 3), ph = new Float32Array(N);
    for (let i = 0; i < N; i++) { const a = rnd() * Math.PI * 2, rr = rnd() * 110; pos.set([Math.cos(a) * rr, -8 + rnd() * 40, Math.sin(a) * rr], i * 3); ph[i] = rnd() * 10; }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('ph', new THREE.BufferAttribute(ph, 1));
    this.dustMat = new THREE.ShaderMaterial({
      uniforms: { time: { value: 0 }, map: { value: radialTexture([[0, 'rgba(255,255,255,1)'], [.4, 'rgba(255,240,200,.6)'], [1, 'rgba(255,240,200,0)']]) }, scale: { value: innerHeight * .5 } },
      vertexShader: `attribute float ph; uniform float time, scale; varying float vA;
        void main(){ vec3 p = position; p.y += sin(time * .3 + ph) * 1.2; p.x += sin(time * .2 + ph * 2.) * .8;
          vec4 mv = modelViewMatrix * vec4(p, 1.); vA = .45 + .55 * sin(time * 1.3 + ph * 3.); gl_PointSize = (1.2 + .7 * sin(ph)) * scale / -mv.z; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform sampler2D map; varying float vA; void main(){ vec4 t = texture2D(map, gl_PointCoord); gl_FragColor = vec4(vec3(1., .86, .55) * 1.2, t.a * vA * .45); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const pts = new THREE.Points(geo, this.dustMat); pts.frustumCulled = false; this.scene.add(pts);
  }

  // -------------------------------------------------- 浮岛
  islandPos(i) {
    const a = -.35 + i * .7, rr = 30 + i * 4.6;
    return new THREE.Vector3(Math.cos(a) * rr, (i % 2 ? 1.6 : -.4) + i * .35, Math.sin(a) * rr);
  }

  makeIslandBase(seed, hue) {
    const rnd = mulberry32(seed), grp = new THREE.Group(), b = new Batch();
    const top = new THREE.CylinderGeometry(7.2, 7.6, 1.3, 30, 1);
    const p = top.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), r = Math.hypot(x, z); if (r > 6) { const k = 1 + (rnd() - .5) * .12; p.setX(i, x * k); p.setZ(i, z * k); } }
    b.add(top, hue, [0, -.65, 0]);
    b.add(new THREE.CylinderGeometry(7.75, 7.85, .55, 30), '#f3dcae', [0, -1.15, 0]);
    const cone = new THREE.ConeGeometry(7.6, 10.5, 14, 4);
    const cp = cone.attributes.position;
    for (let i = 0; i < cp.count; i++) { const y = cp.getY(i); if (y < 5) { cp.setX(i, cp.getX(i) * (1 + (rnd() - .5) * .3)); cp.setZ(i, cp.getZ(i) * (1 + (rnd() - .5) * .3)); } }
    b.add(cone, '#c8a07a', [0, -6.6, 0], [Math.PI, 0, 0]);
    b.add(new THREE.ConeGeometry(4.2, 5, 9, 2), '#b0866a', [1.5, -9.5, 1], [Math.PI, .4, .1]);
    for (let k = 0; k < 5; k++) { const a = rnd() * Math.PI * 2, rr = 5.4 + rnd() * 1.2; if (Math.sin(a) > .35 && Math.cos(a) > -.2) continue; b.add(new THREE.ConeGeometry(.75 + rnd() * .3, 2.2 + rnd(), 7), ['#2d6a4f', '#40916c', '#52b788'][k % 3], [Math.cos(a) * rr, 1.1, Math.sin(a) * rr]); b.add(new THREE.CylinderGeometry(.14, .18, .7, 5), '#7f5539', [Math.cos(a) * rr, .1, Math.sin(a) * rr]); }
    for (let k = 0; k < 7; k++) { const a = rnd() * Math.PI * 2, rr = 5.6 + rnd() * 1.4; b.add(new THREE.IcosahedronGeometry(.45 + rnd() * .3, 0), rnd() < .5 ? '#95d5b2' : '#b7e4c7', [Math.cos(a) * rr, .15, Math.sin(a) * rr]); }
    for (let k = 0; k < 9; k++) { const a = rnd() * Math.PI * 2, rr = 4.6 + rnd() * 2.2; b.add(new THREE.SphereGeometry(.13, 6, 5), ['#ff8fab', '#ffd166', '#ffffff', '#cdb4db'][k % 4], [Math.cos(a) * rr, .12, Math.sin(a) * rr]); }
    const m = b.mesh(); m.castShadow = true; m.receiveShadow = true; grp.add(m);
    // 环绕的小浮石
    for (let k = 0; k < 3; k++) { const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(.6 + rnd() * .6, 0), mat('#c8a07a')); const a = rnd() * Math.PI * 2; rock.position.set(Math.cos(a) * 10, -2 - rnd() * 4, Math.sin(a) * 10); rock.userData.ph = rnd() * 6; rock.userData.y0 = rock.position.y; grp.add(rock); }
    return grp;
  }

  buildIslands() {
    const greens = ['#7fcf5c', '#8bd765', '#79c957', '#93da6c'];
    const glowTex = radialTexture([[0, 'rgba(255,236,170,.95)'], [.45, 'rgba(255,214,120,.35)'], [1, 'rgba(255,214,120,0)']]);
    this.questions.forEach((q, i) => {
      const root = new THREE.Group(); root.position.copy(this.islandPos(i));
      const center = new THREE.Vector3(0, 0, 0);
      const toC = center.clone().sub(root.position).setY(0).normalize();
      root.rotation.y = Math.atan2(-toC.x, -toC.z) - .3; // 小场景正面朝外（朝向镜头一侧）
      const base = this.makeIslandBase(100 + i * 17, greens[i % 4]); root.add(base);
      const d = SCENES[q.scene](this.ctx); d.group.scale.setScalar(1.12); root.add(d.group);
      const glow = new THREE.Mesh(new THREE.CircleGeometry(9.5, 48), new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
      glow.rotation.x = -Math.PI / 2; glow.position.y = -1.0; root.add(glow);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(8.2, .16, 8, 96), new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffd36b', emissiveIntensity: 0, transparent: true, opacity: 0, metalness: .4, roughness: .3 }));
      ring.rotation.x = Math.PI / 2; ring.position.y = -1.2; root.add(ring);
      const label = yearSprite(q.year, q.short || q.title); label.position.set(0, 10.4, 0); root.add(label);
      root.traverse(o => { if (o.isMesh && !o.material.transparent) { o.castShadow = this.q.shadows; o.receiveShadow = this.q.shadows; } });
      this.scene.add(root);
      this.islands.push({ root, base, d, glow, ring, label, revealT: -1, result: null, ph: i * 1.3 });
    });
  }

  buildPath() {
    const pts = [];
    const n = this.islands.length;
    for (let i = 0; i < n; i++) {
      const p = this.islandPos(i), dir = p.clone().setY(0).normalize();
      pts.push(p.clone().addScaledVector(dir, -10.5).setY(p.y - .4));
    }
    const inward = p => p.clone().setY(0).normalize().multiplyScalar(-1);
    const first = pts[0].clone().addScaledVector(pts[0].clone().sub(pts[1]).normalize(), 6).addScaledVector(inward(pts[0]), 6).setY(pts[0].y - 3);
    const last = pts[n - 1].clone().addScaledVector(pts[n - 1].clone().sub(pts[n - 2]).normalize(), 6).addScaledVector(inward(pts[n - 1]), 6).setY(pts[n - 1].y - 3);
    this.pathCurve = new THREE.CatmullRomCurve3([first, ...pts, last], false, 'centripetal');
    this.pathMat = new THREE.ShaderMaterial({
      uniforms: { time: { value: 0 }, prog: { value: 0 } },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
      fragmentShader: `uniform float time, prog; varying vec2 vUv;
        void main(){ float u = vUv.x; float dash = smoothstep(.55, 1., sin((u * 160. - time * 2.2)) * .5 + .5);
          float lit = smoothstep(prog + .015, prog - .015, u);
          vec3 pale = vec3(1., .86, .55), gold = vec3(1., .70, .16);
          vec3 col = mix(pale * (.9 + .25 * dash), mix(gold * 1.5, vec3(1., .95, .72) * 2.2, dash), lit);
          float edge = 1. - pow(abs(vUv.y - .5) * 2., 2.);
          gl_FragColor = vec4(col * (.72 + .45 * edge), .95);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
      transparent: true,
    });
    const tube = new THREE.Mesh(new THREE.TubeGeometry(this.pathCurve, 700, .36, 8, false), this.pathMat);
    this.scene.add(tube);
    // 沿路流动的光点
    const N = 90, geo = new THREE.BufferGeometry(); this.flowPos = new Float32Array(N * 3); this.flowU = Array.from({ length: N }, (_, i) => i / N);
    geo.setAttribute('position', new THREE.BufferAttribute(this.flowPos, 3));
    const fm = new THREE.PointsMaterial({ size: 1.1, map: radialTexture([[0, 'rgba(255,255,255,1)'], [.35, 'rgba(255,220,140,.8)'], [1, 'rgba(255,220,140,0)']]), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: '#ffe3a0' });
    this.flow = new THREE.Points(geo, fm); this.flow.frustumCulled = false; this.scene.add(this.flow);
    // 计算每座岛在路径上的参数位置
    const samples = 800, sp = []; for (let k = 0; k <= samples; k++) sp.push(this.pathCurve.getPointAt(k / samples));
    this.islandU = pts.map(p => { let best = 0, bd = Infinity; sp.forEach((q, k) => { const d = q.distanceToSquared(p); if (d < bd) { bd = d; best = k; } }); return best / samples; });
  }

  // -------------------------------------------------- 镜头
  shotFor(i) {
    const p = this.islandPos(i), out = p.clone().setY(0).normalize(), tan = new THREE.Vector3(-out.z, 0, out.x);
    const look = p.clone().add(new THREE.Vector3(0, 3.4, 0)).addScaledVector(out, 1.0);
    const off = out.clone().multiplyScalar(17.5).addScaledVector(tan, -5.5).add(new THREE.Vector3(0, 8.6, 0)).normalize().multiplyScalar(30);
    // 根据未被面板遮挡的可视区域，计算让整座岛放得下的距离
    const w = innerWidth, h = innerHeight, tb = Math.tan(THREE.MathUtils.degToRad(this.baseFov) / 2), R = 8.8;
    const wu = Math.max(120, w - Math.abs(this.shift.tx)), hu = Math.max(120, h - Math.abs(this.shift.ty));
    const dH = R / (tb * wu / h), dV = R / (tb * hu / h);
    const dist = Math.max(off.length(), dH, dV * .92);
    const cam = look.clone().add(off.normalize().multiplyScalar(dist));
    return { cam, look };
  }
  overviewPose(t, immediate) {
    const a = t * .03 + .9, rr = 104;
    const cam = new THREE.Vector3(Math.cos(a) * rr, 50, Math.sin(a) * rr), look = new THREE.Vector3(0, -1, 0);
    if (immediate) { this.camera.position.copy(cam); this.look.copy(look); this.camera.lookAt(look); }
    return { cam, look };
  }
  flyTo(i, dur = 2.8) {
    const from = this.camera.position.clone(), fromLook = this.look.clone(), { cam, look } = this.shotFor(i);
    const mid = from.clone().lerp(cam, .5); mid.y += 14 + from.distanceTo(cam) * .12;
    this.fly = { from, fromLook, to: cam, toLook: look, ctrl: mid, t: 0, dur, done: null };
    this.mode = 'fly'; this.active = i;
    this.islands.forEach((isl, k) => { isl.glowTarget = k === i ? 1 : (isl.result ? .55 : 0); });
    return new Promise(res => { this.fly.done = res; });
  }
  toOverview(dur = 3.2) {
    const from = this.camera.position.clone(), fromLook = this.look.clone();
    const tgt = this.overviewPose(this.t + dur, false);
    const mid = from.clone().lerp(tgt.cam, .5); mid.y += 20;
    this.fly = { from, fromLook, to: tgt.cam, toLook: tgt.look, ctrl: mid, t: 0, dur, done: null, thenOverview: true };
    this.mode = 'fly'; this.active = -1;
    return new Promise(res => { this.fly.done = res; });
  }
  setShift(px, py) { this.shift.tx = px; this.shift.ty = py; }

  reveal(i, score) {
    const isl = this.islands[i]; isl.revealT = 0; isl.result = score; isl.d.reveal();
    const ringCol = score >= 100 ? '#ffc94a' : score >= 30 ? '#ffe3a3' : '#dfe8f5';
    isl.ring.material.emissive.set(ringCol); isl.ring.material.color.set(ringCol);
    const top = isl.root.position.clone().add(new THREE.Vector3(0, 5, 0));
    if (score >= 100) this.bursts.emit(top, this.mobile ? 120 : 220, ['#ffd36b', '#fff1b8', '#ff9f43', '#ffffff'], 13, 9, 1.2);
    else if (score >= 30) this.bursts.emit(top, 90, ['#ffe3a3', '#ffffff'], 9, 7);
    else this.bursts.emit(top, 60, ['#dfe8f5', '#ffffff'], 7, 5);
  }
  celebrate() {
    this.islands.forEach((isl, k) => setTimeout(() => {
      const p = isl.root.position.clone().add(new THREE.Vector3(0, 9, 0));
      this.bursts.emit(p, this.mobile ? 50 : 110, ['#ffd36b', '#ff7a59', '#7fd6ff', '#ffffff', '#b5e48c'], 14, 10, 1.4);
    }, 250 * k));
  }
  resetAll() {
    this.islands.forEach(isl => { isl.result = null; isl.glowTarget = 0; });
  }

  resize() {
    const w = innerWidth, h = innerHeight;
    this.renderer.setSize(w, h);
    if (this.composer) { this.composer.setSize(w, h); this.bloom.setSize(w, h); }
    this.dustMat.uniforms.scale.value = h * .5;
    this.bursts.mat.uniforms.scale.value = h * .55;
    this.applyView();
  }
  applyView() {
    const w = innerWidth, h = innerHeight, sx = Math.round(this.shift.x), sy = Math.round(this.shift.y), cam = this.camera;
    const fw = w + Math.abs(sx), fh = h + Math.abs(sy);
    cam.aspect = fw / fh;
    cam.fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(this.baseFov) / 2) * fh / h));
    if (sx !== 0 || sy !== 0) cam.setViewOffset(fw, fh, Math.max(0, sx), Math.max(0, sy), w, h); else cam.clearViewOffset();
    cam.updateProjectionMatrix();
  }

  frame() {
    if (this.lost) return;
    const dt = Math.min(this.clock.getDelta(), 1 / 20); this.t += dt; const t = this.t;
    // 自适应画质：持续掉帧时降级
    this.fpsSamples.push(dt); if (this.fpsSamples.length > 90) this.fpsSamples.shift();
    if (!this.degraded && t > 4 && this.fpsSamples.length === 90) {
      const avg = this.fpsSamples.reduce((a, b) => a + b, 0) / 90;
      if (avg > 1 / 32) { this.degraded = true; this.composer = null; this.renderer.shadowMap.enabled = false; this.renderer.setPixelRatio(Math.min(1, this.q.dpr)); this.resize(); }
    }
    // 画面偏移（为面板留出位置）
    const ks = 1 - Math.pow(.02, dt);
    const nx = this.shift.x + (this.shift.tx - this.shift.x) * ks, ny = this.shift.y + (this.shift.ty - this.shift.y) * ks;
    if (Math.abs(nx - this.shift.x) > .3 || Math.abs(ny - this.shift.y) > .3) { this.shift.x = nx; this.shift.y = ny; this.applyView(); } else if (this.shift.x !== this.shift.tx || this.shift.y !== this.shift.ty) { this.shift.x = this.shift.tx; this.shift.y = this.shift.ty; this.applyView(); }
    // 镜头
    const cam = this.camera;
    if (this.mode === 'fly' && this.fly) {
      const f = this.fly; f.t += dt / f.dur; const k = ease.inOut(clamp01(f.t));
      const a = f.from.clone().lerp(f.ctrl, k), b = f.ctrl.clone().lerp(f.to, k); cam.position.copy(a.lerp(b, k));
      const kl = ease.inOut(clamp01(f.t * 1.08)); this.look.copy(f.fromLook).lerp(f.toLook, kl);
      if (f.t >= 1) { this.camBase.copy(f.to); this.lookBase.copy(f.toLook); this.mode = f.thenOverview ? 'overview' : 'hold'; this.overT0 = t; const d = f.done; this.fly = null; d && d(); }
    } else if (this.mode === 'hold') {
      const ht = t - (this.overT0 || 0), ang = Math.sin(ht * .16) * .16, rel = this.camBase.clone().sub(this.lookBase);
      rel.applyAxisAngle(new THREE.Vector3(0, 1, 0), ang); rel.y += Math.sin(ht * .21) * .6;
      cam.position.copy(this.lookBase).add(rel); this.look.copy(this.lookBase);
    } else {
      const { cam: c, look } = this.overviewPose(t, false);
      cam.position.lerp(c, 1 - Math.pow(.25, dt)); this.look.lerp(look, 1 - Math.pow(.25, dt));
    }
    cam.lookAt(this.look);
    this.sky.position.copy(cam.position);
    // 阳光阴影跟随当前岛
    const focus = this.active >= 0 ? this.islands[this.active].root.position : new THREE.Vector3();
    this.sun.position.set(focus.x + 55, focus.y + 80, focus.z - 60); this.sun.target.position.copy(focus);
    // 岛屿与小场景
    this.islands.forEach((isl, i) => {
      isl.root.position.y = this.islandPos(i).y + Math.sin(t * .6 + isl.ph) * .35;
      isl.base.children.forEach(o => { if (o.userData.y0 !== undefined) { o.position.y = o.userData.y0 + Math.sin(t * .8 + o.userData.ph) * .5; o.rotation.y = t * .1 + o.userData.ph; } });
      const gt = isl.glowTarget || 0; isl.glow.material.opacity += ((gt * (.75 + .25 * Math.sin(t * 2.2))) - isl.glow.material.opacity) * Math.min(1, dt * 3);
      const ro = isl.result !== null ? 1 : 0; isl.ring.material.opacity += (ro - isl.ring.material.opacity) * Math.min(1, dt * 2); isl.ring.material.emissiveIntensity = ro * (.9 + .3 * Math.sin(t * 2 + i));
      if (isl.revealT >= 0) isl.revealT += dt;
      isl.d.update(t, dt, isl.revealT);
      const lo = (this.mode === 'overview' || this.active < 0) ? 1 : 0; isl.label.material.opacity += (lo - isl.label.material.opacity) * Math.min(1, dt * 3); isl.label.visible = isl.label.material.opacity > .02;
    });
    // 路径与光点
    const answered = this.islands.filter(x => x.result !== null).length;
    const targetProg = answered === 0 ? .02 : this.islandU[Math.min(answered, this.islandU.length) - 1] + .02;
    this.pathMat.uniforms.prog.value += (targetProg - this.pathMat.uniforms.prog.value) * Math.min(1, dt * 1.5);
    this.pathMat.uniforms.time.value = t;
    const tmp = new THREE.Vector3();
    for (let i = 0; i < this.flowU.length; i++) { this.flowU[i] = (this.flowU[i] + dt * .012) % 1; this.pathCurve.getPointAt(this.flowU[i], tmp); this.flowPos.set([tmp.x, tmp.y + .45 + Math.sin(t * 3 + i) * .15, tmp.z], i * 3); }
    this.flow.geometry.attributes.position.needsUpdate = true;
    this.cloudsLow.rotation.y = t * .0035; this.cloudsHigh.rotation.y = -t * .005;
    this.dustMat.uniforms.time.value = t;
    this.bursts.update(dt);
    if (this.composer) this.composer.render(); else this.renderer.render(this.scene, cam);
  }
}
