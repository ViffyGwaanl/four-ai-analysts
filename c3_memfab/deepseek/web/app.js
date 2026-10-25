/* MemoryFab · 16-quarter 3D factory
   Data: window.MEMFAB (generated from 工作/export.json)
   Three.js r160, local vendor. No external network. */
import * as THREE from 'three';
import { OrbitControls } from './vendor/OrbitControls.js';

const DATA = window.MEMFAB;
const QS = DATA.quarters;
const AGG = DATA.aggregates;
const FINE = !window.matchMedia('(max-width: 900px)').matches;
const IS_MOBILE = window.innerWidth < 900;

/* ---------------- helpers ---------------- */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));
const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const fmt1 = v => (v < 0 ? '-' : '') + Math.abs(v).toFixed(1);
const fmt2 = v => (v < 0 ? '-' : '') + Math.abs(v).toFixed(2);
const fmt0 = v => Math.round(v).toLocaleString('en-US');
const pct = (v, d = 1) => (v * 100).toFixed(d) + '%';
const money = v => Math.abs(v) < 10 ? fmt2(v) : fmt1(v);

function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/* ---------------- renderer / scene ---------------- */
const container = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, FINE ? 2 : 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xd8ecff, 100, 290);

const camera = new THREE.PerspectiveCamera(IS_MOBILE ? 52 : 36, window.innerWidth / window.innerHeight, 0.1, 700);
const HOME = IS_MOBILE
  ? { pos: new THREE.Vector3(44, 34, 56), target: new THREE.Vector3(0, 2.6, 0) }
  : { pos: new THREE.Vector3(25, 16.5, 31), target: new THREE.Vector3(0, 3.2, 0) };
camera.position.copy(HOME.pos).multiplyScalar(IS_MOBILE ? 1.08 : 1.28);
camera.position.y += IS_MOBILE ? 3 : 8;

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.copy(HOME.target);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.minDistance = 12;
controls.maxDistance = 100;
controls.minPolarAngle = 0.18;
controls.maxPolarAngle = Math.PI * 0.49;
controls.autoRotate = false;
controls.autoRotateSpeed = 0.35;
controls.enabled = false;

/* environment reflection (procedural, no external HDR) */
const pmrem = new THREE.PMREMGenerator(renderer);
const envScene = new THREE.Scene();
envScene.background = new THREE.Color(0x8fc8ff);
{
  const sky = new THREE.Mesh(new THREE.SphereGeometry(60, 16, 12), new THREE.MeshBasicMaterial({ color: 0x9fd3ff, side: THREE.BackSide }));
  envScene.add(sky);
  const sun = new THREE.Mesh(new THREE.SphereGeometry(9, 16, 12), new THREE.MeshBasicMaterial({ color: 0xfff1c4 }));
  sun.position.set(28, 30, 14);
  envScene.add(sun);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), new THREE.MeshBasicMaterial({ color: 0x8fae83 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -18;
  envScene.add(ground);
}
const envRT = pmrem.fromScene(envScene, 0.04);
scene.environment = envRT.texture;
pmrem.dispose();

/* ---------------- sky ---------------- */
function buildSky() {
  const geo = new THREE.SphereGeometry(330, 32, 18);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      top: { value: new THREE.Color(0x3d8ed6) },
      mid: { value: new THREE.Color(0xa9dcff) },
      bot: { value: new THREE.Color(0xeaf7ff) },
      offset: { value: 30.0 },
      exponent: { value: 0.72 }
    },
    vertexShader: `varying vec3 vWorld; void main(){ vec4 w = modelMatrix*vec4(position,1.0); vWorld=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `
      uniform vec3 top; uniform vec3 mid; uniform vec3 bot; uniform float offset; uniform float exponent;
      varying vec3 vWorld;
      void main(){
        float h = normalize(vWorld + vec3(0.0, offset, 0.0)).y;
        float t = clamp(pow(max(h,0.0), exponent),0.0,1.0);
        vec3 c = mix(bot, mid, smoothstep(0.0,0.28,h));
        c = mix(c, top, smoothstep(0.26,0.92,h));
        gl_FragColor = vec4(c,1.0);
      }`
  });
  const sky = new THREE.Mesh(geo, mat);
  sky.frustumCulled = false;
  scene.add(sky);
}
buildSky();

function glowTexture(inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)') {
  const c = document.createElement('canvas'); c.width = 128; c.height = 128;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 2, 64, 64, 64);
  g.addColorStop(0, inner); g.addColorStop(0.35, inner); g.addColorStop(1, outer);
  ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const glowTex = glowTexture();

function addSunSprite() {
  const mat = new THREE.SpriteMaterial({ map: glowTexture('rgba(255,246,214,0.95)', 'rgba(255,214,120,0)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const s = new THREE.Sprite(mat);
  s.position.set(78, 62, 36); s.scale.set(46, 46, 1);
  scene.add(s);
}
addSunSprite();

/* ---------------- lights ---------------- */
scene.add(new THREE.HemisphereLight(0xe3f4ff, 0xc9d8bc, 1.25));

const sun = new THREE.DirectionalLight(0xfff7e8, 2.15);
sun.position.set(34, 46, 24);
sun.castShadow = true;
sun.shadow.mapSize.set(FINE ? 2048 : 1024, FINE ? 2048 : 1024);
sun.shadow.camera.left = -34; sun.shadow.camera.right = 34;
sun.shadow.camera.top = 32; sun.shadow.camera.bottom = -30;
sun.shadow.camera.near = 1; sun.shadow.camera.far = 120;
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.03;
scene.add(sun);
scene.add(sun.target);

const fill = new THREE.DirectionalLight(0xadd4ff, 0.95);
fill.position.set(-34, 22, -30);
scene.add(fill);

const rim = new THREE.DirectionalLight(0xffd9a0, 0.5);
rim.position.set(10, 10, -40);
scene.add(rim);

function point(color, x, y, z, intensity = 35, dist = 24) {
  const l = new THREE.PointLight(color, intensity, dist, 2);
  l.position.set(x, y, z);
  scene.add(l);
  return l;
}
point(0xbfe8ff, -7, 5.2, 2.5, 40, 20);
point(0x9b7bff, -7.5, 4.2, -5.6, 32, 18);
point(0xffd08a, 8.5, 6.2, -5.6, 30, 16);
point(0xffcc66, 0, 3.4, -7.3, 22, 12);

/* ---------------- materials ---------------- */
const M = {
  floor: new THREE.MeshStandardMaterial({ color: 0xe8eef4, roughness: 0.9, metalness: 0.02 }),
  floor2: new THREE.MeshStandardMaterial({ color: 0xdde6ef, roughness: 0.92 }),
  base: new THREE.MeshStandardMaterial({ color: 0xc6cbd1, roughness: 0.95 }),
  wall: new THREE.MeshStandardMaterial({ color: 0xe8eef5, roughness: 0.86, metalness: 0.03 }),
  wallDark: new THREE.MeshStandardMaterial({ color: 0xcdd8e3, roughness: 0.8 }),
  metal: new THREE.MeshStandardMaterial({ color: 0x8b98a6, roughness: 0.42, metalness: 0.72 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x243447, roughness: 0.6, metalness: 0.35 }),
  black: new THREE.MeshStandardMaterial({ color: 0x101b28, roughness: 0.5, metalness: 0.4 }),
  glass: new THREE.MeshStandardMaterial({ color: 0xbfe8ff, roughness: 0.05, metalness: 0.0, transparent: true, opacity: 0.14, side: THREE.DoubleSide, depthWrite: false }),
  glassWarm: new THREE.MeshStandardMaterial({ color: 0xffe1b0, roughness: 0.08, metalness: 0.0, transparent: true, opacity: 0.14, side: THREE.DoubleSide, depthWrite: false }),
  gold: new THREE.MeshStandardMaterial({ color: 0xe0b23a, roughness: 0.24, metalness: 0.85, emissive: 0x6b4a00, emissiveIntensity: 0.55, envMapIntensity: 1.4 }),
  goldSoft: new THREE.MeshStandardMaterial({ color: 0xe8b84b, roughness: 0.4, metalness: 0.6, emissive: 0x8a5a00, emissiveIntensity: 0.2 }),
  cardboard: new THREE.MeshStandardMaterial({ color: 0xd8a15f, roughness: 0.9, metalness: 0.0 }),
  purple: new THREE.MeshStandardMaterial({ color: 0x7b61ff, roughness: 0.35, metalness: 0.25, emissive: 0x3b1f9e, emissiveIntensity: 0.55 }),
  hbmBody: new THREE.MeshStandardMaterial({ color: 0x2b2346, roughness: 0.5, metalness: 0.4 }),
  cyan: new THREE.MeshStandardMaterial({ color: 0x9fe8ff, roughness: 0.2, metalness: 0.1, emissive: 0x2aa7c9, emissiveIntensity: 1.1 }),
  teal: new THREE.MeshStandardMaterial({ color: 0x38c7b4, roughness: 0.35, metalness: 0.2, emissive: 0x0f6b62, emissiveIntensity: 0.5 }),
  red: new THREE.MeshStandardMaterial({ color: 0xc0392b, roughness: 0.45, metalness: 0.15, emissive: 0x5a0f08, emissiveIntensity: 0.35 }),
  wood: new THREE.MeshStandardMaterial({ color: 0x8b5a33, roughness: 0.7 }),
  white: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55 }),
  screen: new THREE.MeshBasicMaterial({ color: 0x0b1d33 })
};

function emissive(color, strength = 1.2, base = 0x111111) {
  return new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: strength, roughness: 0.35, metalness: 0.1, toneMapped: true });
}

const box = (w, h, d, mat) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
const cyl = (rt, rb, h, seg, mat) => new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);

function shadowify(obj, cast = true, receive = true) {
  obj.traverse(o => { if (o.isMesh) { o.castShadow = cast; o.receiveShadow = receive; } });
  return obj;
}

/* ---------------- texture helpers ---------------- */
function gridTexture(bg = '#f4f8fc', line = '#cfe2f2', n = 8) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 256;
  const ctx = c.getContext('2d');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = line; ctx.lineWidth = 2;
  for (let i = 0; i <= n; i++) {
    const p = i * 256 / n;
    ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, 256); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(256, p); ctx.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function signTexture(main, sub, accent = '#e8b84b') {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 256;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, 1024, 256);
  const g = ctx.createLinearGradient(0, 0, 1024, 0);
  g.addColorStop(0, 'rgba(8,22,38,0.88)'); g.addColorStop(1, 'rgba(12,36,60,0.55)');
  ctx.fillStyle = g; roundedRect(ctx, 0, 20, 1024, 216, 26); ctx.fill();
  ctx.strokeStyle = 'rgba(180,220,255,0.18)'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = accent; ctx.fillRect(46, 62, 8, 132);
  ctx.fillStyle = '#ffffff'; ctx.font = '700 92px "PingFang SC","Microsoft YaHei",sans-serif'; ctx.textBaseline = 'middle';
  ctx.fillText(main, 84, 118);
  ctx.fillStyle = 'rgba(190,220,245,0.85)'; ctx.font = '500 34px "PingFang SC","Microsoft YaHei",sans-serif';
  ctx.fillText(sub, 86, 186);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

/* ---------------- platform & factory shell ---------------- */
const world = new THREE.Group();
scene.add(world);

function buildPlatform() {
  const g = new THREE.Group();
  const base = box(40, 1.3, 26, M.base); base.position.y = -0.65; g.add(base);
  const top = box(30.6, 0.3, 18.6, M.floor); top.position.y = 0.16; g.add(top);
  const apron = box(33, 0.16, 4.4, M.floor2); apron.position.set(0, 0.06, 11.1); g.add(apron);
  const path = box(4.6, 0.08, 18, new THREE.MeshStandardMaterial({ color: 0xb9b2a3, roughness: 1 }));
  path.position.set(0, -0.02, 21); g.add(path);
  // safety walk lines
  const lineMat = new THREE.MeshStandardMaterial({ color: 0xe8b84b, emissive: 0x7a5a00, emissiveIntensity: 0.35, roughness: 0.5 });
  for (const x of [-4.2, 4.2]) {
    const ln = box(0.1, 0.03, 4.2, lineMat); ln.position.set(x, 0.17, 10.0); g.add(ln);
  }
  // entrance kept flush with the facade; no canopy so the cutaway stays open

  // gold trim
  const trimMat = new THREE.MeshStandardMaterial({ color: 0xc9a227, metalness: 0.8, roughness: 0.3, emissive: 0x6b4d00, emissiveIntensity: 0.3 });
  [[-15.4, 0.34, 9.4], [15.4, 0.34, 9.4]].forEach(([x, y, z]) => {
    const t = box(0.1, 0.1, 18.8, trimMat); t.position.set(x, y, z - 9.4); g.add(t);
  });
  const frontTrim = box(30.8, 0.1, 0.1, trimMat); frontTrim.position.set(0, 0.34, 9.4); g.add(frontTrim);
  shadowify(g, false, true);
  return g;
}
world.add(buildPlatform());

function buildShell() {
  const g = new THREE.Group();
  const back = box(30, 6.4, 0.38, M.wall); back.position.set(0, 3.2, -9); g.add(back);
  const left = box(0.38, 6.4, 18, M.wall); left.position.set(-15, 3.2, 0); g.add(left);

  // wall seams
  for (let x = -13; x <= 13; x += 2.6) {
    const s = box(0.035, 6.2, 0.02, M.wallDark); s.position.set(x, 3.2, -8.79); g.add(s);
  }
  for (let z = -7; z <= 7; z += 2.4) {
    const s2 = box(0.02, 6.2, 0.035, M.wallDark); s2.position.set(-14.79, 3.2, z); g.add(s2);
  }
  // windows on back wall
  const winMat = new THREE.MeshStandardMaterial({ color: 0x8fd0ff, emissive: 0x4fa8e8, emissiveIntensity: 0.85, roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.9 });
  for (let i = -1; i <= 1; i++) {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 1.45), winMat);
    w.position.set(i * 7.4, 4.55, -8.78); g.add(w);
    const f = box(5.9, 1.75, 0.06, M.metal); f.position.set(i * 7.4, 4.55, -8.82); g.add(f);
  }
  // roof trusses only over the back third (cutaway keeps the front open)
  const steel = new THREE.MeshStandardMaterial({ color: 0x647689, roughness: 0.45, metalness: 0.65 });
  for (let z = -8.5; z <= -7.2; z += 1.3) {
    const b = box(30, 0.16, 0.16, steel); b.position.set(0, 6.35, z); g.add(b);
  }
  // narrow roof fascia along the back wall, keeps the cutaway open
  const fascia = box(30.2, 0.34, 1.35, new THREE.MeshStandardMaterial({ color: 0xdbe6f0, roughness: 0.78, metalness: 0.1 }));
  fascia.position.set(0, 6.52, -8.35); g.add(fascia);
  const fasciaGlow = box(28, 0.05, 0.08, new THREE.MeshStandardMaterial({ color: 0xbfe8ff, emissive: 0x6fb9e0, emissiveIntensity: 0.5 }));
  fasciaGlow.position.set(0, 6.38, -7.66); g.add(fasciaGlow);
  // right-side cut edge columns and parapet
  for (let z = -8.6; z <= 8.6; z += 4.3) {
    const col = box(0.22, 6.4, 0.22, M.metal); col.position.set(15, 3.2, z); g.add(col);
  }
  const parapet = box(0.24, 0.9, 18, M.wall); parapet.position.set(15, 0.45, 0); g.add(parapet);
  const rightBeam = box(0.22, 0.22, 18, steel); rightBeam.position.set(15, 6.35, 0); g.add(rightBeam);
  // hanging lights
  const lampMat = emissive(0xfff2d0, 1.6);
  for (let i = -2; i <= 2; i++) {
    const l = box(2.2, 0.08, 0.34, lampMat); l.position.set(i * 5.6, 5.86, 0); g.add(l);
    const cord = box(0.03, 0.5, 0.03, M.dark); cord.position.set(i * 5.6, 6.1, 0); g.add(cord);
  }
  // front cut edge gold accent
  const cutMat = new THREE.MeshStandardMaterial({ color: 0xe8b84b, emissive: 0xc9a227, emissiveIntensity: 0.55, metalness: 0.6, roughness: 0.3 });
  const cut = box(30.2, 0.1, 0.1, cutMat); cut.position.set(0, 6.42, 9); g.add(cut);
  // factory sign
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(10.6, 2.65), new THREE.MeshBasicMaterial({ map: signTexture('MemoryFab', 'FAB-01 · 300 → 437.5 千片/季', '#38c7b4'), transparent: true }));
  sign.position.set(0, 5.55, -8.75); g.add(sign);

  shadowify(g, true, true);
  return g;
}
world.add(buildShell());

/* ---------------- cleanroom ---------------- */
function buildCleanroom() {
  const g = new THREE.Group();
  g.position.set(-7, 0, 2.5);
  const floor = box(13, 0.22, 8.5, M.floor);
  floor.position.y = 0.2; g.add(floor);
  const tex = gridTexture('#f7fbff', '#d4e7f5', 8);
  tex.repeat.set(3.2, 2.1);
  const tile = new THREE.Mesh(new THREE.PlaneGeometry(12.9, 8.4), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.75 }));
  tile.rotation.x = -Math.PI / 2; tile.position.y = 0.315; g.add(tile);
  const edgeMat = new THREE.MeshStandardMaterial({ color: 0x6fb9e0, emissive: 0x2f7fb8, emissiveIntensity: 0.45, roughness: 0.5 });
  for (const [x, z, w, d] of [[0, -4.2, 13, 0.08], [0, 4.2, 13, 0.08], [-6.45, 0, 0.08, 8.4], [6.45, 0, 0.08, 8.4]]) {
    const e = box(w, 0.04, d, edgeMat); e.position.set(x, 0.33, z); g.add(e);
  }

  // glass enclosure
  const walls = [
    [0, 1.9, -4.26, 13, 3.6, 0.08],
    [-6.51, 1.9, 0, 0.08, 3.6, 8.5],
    [6.51, 1.9, 0, 0.08, 3.6, 8.5]
  ];
  walls.forEach(([x, y, z, w, h, d]) => {
    const m = box(w, h, d, M.glass); m.position.set(x, y, z); g.add(m);
  });
  // frames
  const frameMat = M.metal;
  for (let x = -6.5; x <= 6.5; x += 2.6) {
    const p = box(0.09, 3.65, 0.09, frameMat); p.position.set(x, 1.9, -4.26); g.add(p);
    const p2 = box(0.09, 3.65, 0.09, frameMat); p2.position.set(x, 1.9, 4.26); g.add(p2);
  }
  const topFrame = box(13.1, 0.09, 0.09, frameMat); topFrame.position.set(0, 3.7, -4.26); g.add(topFrame);
  const topFrame2 = box(13.1, 0.09, 0.09, frameMat); topFrame2.position.set(0, 3.7, 4.26); g.add(topFrame2);

  // tools
  const tools = [];
  const panelMat = emissive(0x4fd8ff, 1.2);
  const waferMat = new THREE.MeshStandardMaterial({ color: 0xbaf3ff, emissive: 0x35bfe0, emissiveIntensity: 0.9, metalness: 0.5, roughness: 0.2 });
  const xs = [-5.2, -2.6, 0, 2.6, 5.2];
  const zs = [-2.9, -0.2, 2.5];
  for (const z of zs) {
    for (const x of xs) {
      const tg = new THREE.Group();
      tg.position.set(x, 0.32, z);
      const base = box(1.5, 0.42, 1.2, M.dark); base.position.y = 0.21; tg.add(base);
      const body = box(1.28, 1.18, 1.02, M.white); body.position.y = 0.98; tg.add(body);
      const panel = box(0.92, 0.46, 0.035, panelMat); panel.position.set(0, 1.0, 0.535); tg.add(panel);
      const top = box(1.34, 0.07, 1.08, M.metal); top.position.y = 1.6; tg.add(top);
      const disc = cyl(0.37, 0.37, 0.035, 24, waferMat); disc.position.y = 1.68; tg.add(disc);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.018, 8, 28), M.cyan); ring.rotation.x = Math.PI / 2; ring.position.y = 1.66; tg.add(ring);
      const pipe = cyl(0.05, 0.05, 1.3, 8, M.metal); pipe.position.set(-0.5, 2.2, -0.3); tg.add(pipe);
      tg.userData = { disc, panel, ring };
      g.add(tg);
      tools.push(tg);
    }
  }

  // gantry
  const railMat = M.metal;
  const r1 = box(11.8, 0.08, 0.08, railMat); r1.position.set(0, 3.15, -2.9); g.add(r1);
  const r2 = box(11.8, 0.08, 0.08, railMat); r2.position.set(0, 3.15, 2.5); g.add(r2);
  const gantry = new THREE.Group();
  const carriage = box(0.55, 0.32, 0.55, M.dark); carriage.position.y = 3.0; gantry.add(carriage);
  const arm = box(0.12, 0.75, 0.12, M.metal); arm.position.y = 2.55; gantry.add(arm);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 8), M.cyan); head.position.y = 2.17; gantry.add(head);
  gantry.position.set(0, 0, -0.2);
  g.add(gantry);

  // ceiling light strips
  const strip = emissive(0xcfefff, 1.3);
  for (const z of [-3.0, 0, 3.0]) {
    const s = box(10.5, 0.05, 0.16, strip); s.position.set(0, 3.45, z); g.add(s);
  }

  shadowify(g, true, true);
  return { group: g, tools, gantry };
}
const cleanroom = buildCleanroom();
world.add(cleanroom.group);

/* ---------------- warehouse ---------------- */
function buildWarehouse() {
  const g = new THREE.Group();
  g.position.set(8.6, 0, 3.2);
  const floor = box(8, 0.22, 7, M.floor2); floor.position.y = 0.2; g.add(floor);
  const whe = new THREE.MeshStandardMaterial({ color: 0xc98f45, emissive: 0x5a3a10, emissiveIntensity: 0.3, roughness: 0.6 });
  for (const [x, z, w, d] of [[0, -3.45, 8, 0.08], [0, 3.45, 8, 0.08], [-3.95, 0, 0.08, 7], [3.95, 0, 0.08, 7]]) {
    const e = box(w, 0.04, d, whe); e.position.set(x, 0.32, z); g.add(e);
  }

  const rackMat = new THREE.MeshStandardMaterial({ color: 0x4a5a6b, roughness: 0.55, metalness: 0.55 });
  const shelfMat = new THREE.MeshStandardMaterial({ color: 0x8b6a45, roughness: 0.85 });
  const cols = [-2.35, 0, 2.35];
  const rows = [-1.9, 1.9];
  for (const z of rows) {
    for (const x of cols) {
      for (const dz of [-0.55, 0.55]) {
        for (const dx of [-0.55, 0.55]) {
          const p = box(0.1, 3.9, 0.1, rackMat); p.position.set(x + dx, 2.05, z + dz); g.add(p);
        }
      }
      for (let l = 0; l < 4; l++) {
        const s = box(1.22, 0.08, 1.16, shelfMat); s.position.set(x, 0.62 + l * 0.82, z); g.add(s);
      }
    }
  }

  const boxGeo = new THREE.BoxGeometry(0.72, 0.36, 0.56);
  const boxMat = M.cardboard;
  const maxBoxes = cols.length * rows.length * 8;
  const boxes = new THREE.InstancedMesh(boxGeo, boxMat, maxBoxes);
  boxes.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  boxes.castShadow = true; boxes.receiveShadow = true;
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  let idx = 0;
  for (const z of rows) for (const x of cols) for (let l = 0; l < 8; l++) {
    dummy.position.set(x, 0.85 + l * 0.385, z);
    dummy.updateMatrix();
    boxes.setMatrixAt(idx, dummy.matrix);
    color.setHSL(0.075 + Math.random() * 0.02, 0.42, 0.52 + Math.random() * 0.1);
    boxes.setColorAt(idx, color);
    idx++;
  }
  boxes.instanceColor.needsUpdate = true;
  g.add(boxes);

  // forklift
  const forklift = new THREE.Group();
  const body = box(0.75, 0.5, 0.95, M.goldSoft); body.position.y = 0.5; forklift.add(body);
  const cab = box(0.62, 0.6, 0.5, M.dark); cab.position.set(0, 0.95, -0.1); forklift.add(cab);
  const mast = box(0.09, 1.5, 0.09, M.metal); mast.position.set(0, 0.95, 0.55); forklift.add(mast);
  const fork = box(0.5, 0.06, 0.65, M.metal); fork.position.set(0, 0.28, 0.82); forklift.add(fork);
  for (const sx of [-0.4, 0.4]) for (const sz of [-0.35, 0.35]) {
    const w = cyl(0.18, 0.18, 0.12, 12, M.black); w.rotation.z = Math.PI / 2; w.position.set(sx, 0.2, sz); forklift.add(w);
  }
  forklift.position.set(3.2, 0.32, -2.6);
  g.add(forklift);

  shadowify(g, true, true);
  return { group: g, boxes, forklift, rows, cols };
}
const warehouse = buildWarehouse();
world.add(warehouse.group);

/* ---------------- HBM line ---------------- */
function buildHBM() {
  const g = new THREE.Group();
  g.position.set(-7.5, 1.55, -5.8);
  const plinth = box(13, 1.55, 5.5, M.dark); plinth.position.y = -0.78; g.add(plinth);
  const plinthTrim = box(13.1, 0.06, 5.6, new THREE.MeshStandardMaterial({ color: 0x9b7bff, emissive: 0x7b61ff, emissiveIntensity: 1.1 })); plinthTrim.position.y = 0.0; g.add(plinthTrim);
  const floor = box(13, 0.3, 5.5, M.hbmBody); floor.position.y = 0.32; g.add(floor);
  const glowStrip = box(13, 0.04, 0.12, new THREE.MeshStandardMaterial({ color: 0x9b7bff, emissive: 0x7b61ff, emissiveIntensity: 1.6 }));
  glowStrip.position.set(0, 0.49, 2.68); g.add(glowStrip);
  const glowStrip2 = glowStrip.clone(); glowStrip2.position.z = -2.68; g.add(glowStrip2);

  // back sign
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 1.35), new THREE.MeshBasicMaterial({ map: signTexture('HBM', 'HIGH BANDWIDTH MEMORY', '#b69bff'), transparent: true }));
  sign.position.set(0, 2.55, -2.64); g.add(sign);
  // beacon column at the corner, visible above the cutaway
  const beacon = new THREE.Group();
  beacon.position.set(5.85, 0, -2.25);
  const bglass = cyl(0.52, 0.62, 6.2, 16, M.glass); bglass.position.y = 3.2; beacon.add(bglass);
  const bcore = cyl(0.14, 0.14, 5.9, 10, new THREE.MeshStandardMaterial({ color: 0x9b7bff, emissive: 0x7b61ff, emissiveIntensity: 2.2 }));
  bcore.position.y = 3.2; beacon.add(bcore);
  for (let i = 0; i < 4; i++) {
    const r = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.025, 8, 32), new THREE.MeshStandardMaterial({ color: 0xb69bff, emissive: 0x7b61ff, emissiveIntensity: 1.4 }));
    r.rotation.x = Math.PI / 2; r.position.y = 0.8 + i * 1.45; beacon.add(r);
  }
  const bl = new THREE.PointLight(0x9b7bff, 22, 10, 2); bl.position.y = 4.6; beacon.add(bl);
  g.add(beacon);

  // process stations
  const stations = [];
  for (let i = -1; i <= 1; i++) {
    const st = new THREE.Group();
    st.position.set(i * 4.0, 0.5, -1.1);
    const base = box(2.25, 1.55, 1.35, M.hbmBody); base.position.y = 0.77; st.add(base);
    const glass = box(1.95, 0.8, 1.1, M.glass); glass.position.y = 1.25; st.add(glass);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.035, 10, 36), new THREE.MeshStandardMaterial({ color: 0x9b7bff, emissive: 0x7b61ff, emissiveIntensity: 1.8 }));
    ring.rotation.x = Math.PI / 2; ring.position.y = 1.72; st.add(ring);
    const core = cyl(0.32, 0.32, 0.3, 20, M.purple); core.position.y = 0.9; st.add(core);
    const pipe = cyl(0.11, 0.11, 2.4, 10, M.metal); pipe.position.set(0.8, 2.5, -0.3); st.add(pipe);
    stations.push({ st, ring, core });
    g.add(st);
  }

  // conveyor
  const belt = box(10.4, 0.18, 0.9, M.dark); belt.position.set(0, 0.95, 0.95); g.add(belt);
  const rail1 = box(10.6, 0.06, 0.08, M.metal); rail1.position.set(0, 1.06, 0.48); g.add(rail1);
  const rail2 = rail1.clone(); rail2.position.z = 1.42; g.add(rail2);
  for (let i = -5; i <= 5; i++) {
    const r = cyl(0.09, 0.09, 0.8, 10, M.metal); r.rotation.z = Math.PI / 2; r.position.set(i * 0.95, 1.02, 0.95); g.add(r);
  }

  // HBM chips
  const chips = [];
  const chipMat = new THREE.MeshStandardMaterial({ color: 0xe8b84b, metalness: 0.85, roughness: 0.25, emissive: 0x6b4a00, emissiveIntensity: 0.35 });
  const chipTop = new THREE.MeshStandardMaterial({ color: 0x9b7bff, emissive: 0x5b3bd6, emissiveIntensity: 0.9, metalness: 0.3, roughness: 0.3 });
  for (let i = 0; i < 14; i++) {
    const c = new THREE.Group();
    const b = box(0.42, 0.13, 0.42, chipMat); c.add(b);
    const t = box(0.3, 0.04, 0.3, chipTop); t.position.y = 0.085; c.add(t);
    c.position.set(-5 + i * 0.78, 1.13, 0.95);
    chips.push(c); g.add(c);
  }

  // robot arms
  const arms = [];
  for (let i = 0; i < 2; i++) {
    const ag = new THREE.Group();
    ag.position.set(i === 0 ? -2.2 : 2.2, 0.55, 2.0);
    const base = cyl(0.28, 0.35, 0.5, 16, M.dark); base.position.y = 0.25; ag.add(base);
    const shoulder = box(0.16, 0.16, 0.16, M.metal); shoulder.position.y = 0.55; ag.add(shoulder);
    const upper = box(0.14, 1.1, 0.14, M.goldSoft); upper.position.y = 1.05; ag.add(upper);
    const elbow = new THREE.Group(); elbow.position.y = 1.55;
    const fore = box(0.1, 0.8, 0.1, M.metal); fore.position.y = 0.38; elbow.add(fore);
    const hand = new THREE.Group(); hand.position.y = 0.78;
    const finger1 = box(0.08, 0.18, 0.06, M.cyan); finger1.position.x = 0.08; hand.add(finger1);
    const finger2 = finger1.clone(); finger2.position.x = -0.08; hand.add(finger2);
    elbow.add(hand); ag.add(elbow);
    ag.userData = { elbow };
    arms.push(ag); g.add(ag);
  }

  shadowify(g, true, true);
  return { group: g, chips, arms, stations };
}
const hbm = buildHBM();
world.add(hbm.group);

/* ---------------- boardroom ---------------- */
function buildBoardroom() {
  const g = new THREE.Group();
  g.position.set(8.6, 2.9, -5.8);
  const floor = box(7, 0.26, 5.5, M.wood); floor.position.y = 0; g.add(floor);
  const floorTop = box(7, 0.04, 5.5, new THREE.MeshStandardMaterial({ color: 0x6d4526, roughness: 0.75 })); floorTop.position.y = 0.15; g.add(floorTop);

  const glassWalls = [
    [0, 1.35, -2.72, 7, 2.7, 0.07],
    [-3.47, 1.35, 0, 0.07, 2.7, 5.5],
    [3.47, 1.35, 0, 0.07, 2.7, 5.5]
  ];
  glassWalls.forEach(([x, y, z, w, h, d]) => {
    const m = box(w, h, d, M.glassWarm); m.position.set(x, y, z); g.add(m);
  });
  const frameMat = M.goldSoft;
  for (const x of [-3.47, 3.47]) {
    for (const z of [-2.72, 2.72]) {
      const p = box(0.08, 2.8, 0.08, frameMat); p.position.set(x, 1.35, z); g.add(p);
    }
  }

  // table
  const table = box(3.4, 0.14, 1.55, M.white); table.position.set(0, 0.86, 0); g.add(table);
  const tableTop = box(3.4, 0.04, 1.55, new THREE.MeshStandardMaterial({ color: 0x1d334d, roughness: 0.35, metalness: 0.2 })); tableTop.position.set(0, 0.95, 0); g.add(tableTop);
  for (const x of [-1.45, 1.45]) {
    const leg = box(0.12, 0.8, 0.12, M.metal); leg.position.set(x, 0.4, 0); g.add(leg);
  }
  // chairs + people
  const chairMat = new THREE.MeshStandardMaterial({ color: 0x1b2c40, roughness: 0.6 });
  const coat = new THREE.MeshStandardMaterial({ color: 0x223b56, roughness: 0.75 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xd9b38c, roughness: 0.8 });
  const seatPos = [
    [-1.15, 0.45, 1.15], [0, 0.45, 1.15], [1.15, 0.45, 1.15],
    [-1.15, 0.45, -1.15], [0, 0.45, -1.15], [1.15, 0.45, -1.15],
    [-1.95, 0.45, 0], [1.95, 0.45, 0]
  ];
  seatPos.forEach(([x, y, z], i) => {
    const ch = box(0.44, 0.08, 0.44, chairMat); ch.position.set(x, y, z); g.add(ch);
    const back = box(0.44, 0.5, 0.07, chairMat); back.position.set(x, y + 0.28, z + (z > 0 ? 0.2 : -0.2)); g.add(back);
    if (i < 5) {
      const body = cyl(0.15, 0.18, 0.5, 10, coat); body.position.set(x, y + 0.3, z); g.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 8), skin); head.position.set(x, y + 0.65, z); g.add(head);
    }
  });

  // screen
  const screenCanvas = document.createElement('canvas'); screenCanvas.width = 512; screenCanvas.height = 256;
  const sctx = screenCanvas.getContext('2d');
  const scrTex = new THREE.CanvasTexture(screenCanvas); scrTex.colorSpace = THREE.SRGBColorSpace;
  const screenMat = new THREE.MeshBasicMaterial({ map: scrTex });
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(3.1, 1.55), screenMat);
  screen.position.set(0, 1.85, -2.66); g.add(screen);
  const screenFrame = box(3.3, 1.72, 0.07, M.black); screenFrame.position.set(0, 1.85, -2.7); g.add(screenFrame);

  // ceiling light
  const lamp = box(2.6, 0.06, 0.22, emissive(0xffe1ae, 1.5)); lamp.position.set(0, 2.6, 0); g.add(lamp);

  // support columns under the mezzanine
  for (const x of [-3.2, 3.2]) for (const z of [-2.5, 2.5]) {
    const col = box(0.18, 2.9, 0.18, M.metal); col.position.set(x, -1.45, z); g.add(col);
  }
  // stairs from ground to mezzanine
  const stairMat = M.metal;
  for (let i = 0; i < 9; i++) {
    const st = box(1.25, 0.35, 0.34, stairMat);
    st.position.set(-3.9, -2.72 + i * 0.34, 4.9 - i * 0.34);
    g.add(st);
  }
  // handrails
  for (const x of [-4.5, -3.3]) {
    const rail = box(0.05, 0.05, 4.1, M.goldSoft); rail.position.set(x, -1.35, 3.55); rail.rotation.x = -0.5; g.add(rail);
  }

  shadowify(g, true, true);
  return { group: g, screenCanvas, sctx, scrTex };
}
const boardroom = buildBoardroom();
world.add(boardroom.group);

/* ---------------- vault ---------------- */
function buildVault() {
  const g = new THREE.Group();
  g.position.set(2.8, 0, -7.2);
  const metal = new THREE.MeshStandardMaterial({ color: 0x6f8092, roughness: 0.34, metalness: 0.8 });
  const darkMetal = new THREE.MeshStandardMaterial({ color: 0x26313d, roughness: 0.42, metalness: 0.72 });
  const back = box(4.2, 3.6, 0.25, metal); back.position.set(0, 1.8, -1.6); g.add(back);
  const left = box(0.25, 3.6, 3.2, metal); left.position.set(-2.1, 1.8, 0); g.add(left);
  const right = box(0.25, 3.6, 3.2, metal); right.position.set(2.1, 1.8, 0); g.add(right);
  const top = box(4.2, 0.25, 3.2, metal); top.position.set(0, 3.6, 0); g.add(top);
  const bottom = box(4.2, 0.2, 3.2, darkMetal); bottom.position.set(0, 0.1, 0); g.add(bottom);
  // frame
  for (const x of [-2.1, 2.1]) for (const z of [-1.6, 1.6]) {
    const p = box(0.14, 3.7, 0.14, darkMetal); p.position.set(x, 1.85, z); g.add(p);
  }

  // open vault mouth: a gold frame instead of a closed door, so the cutaway shows the interior
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(1.52, 0.09, 12, 48), M.gold);
  mouth.position.set(0, 1.8, 1.62); g.add(mouth);
  for (let i = 0; i < 10; i++) {
    const a = i / 10 * Math.PI * 2;
    const bolt = cyl(0.07, 0.07, 0.16, 8, M.gold); bolt.rotation.x = Math.PI / 2;
    bolt.position.set(Math.cos(a) * 1.36, 1.8 + Math.sin(a) * 1.36, 1.66); g.add(bolt);
  }
  const innerBack = box(3.6, 2.9, 0.12, new THREE.MeshStandardMaterial({ color: 0x1a222c, roughness: 0.8 }));
  innerBack.position.set(0, 1.7, -1.38); g.add(innerBack);

  // gold bars
  const goldBars = [];
  const barGeo = new THREE.BoxGeometry(0.66, 0.26, 0.4);
  for (let l = 0; l < 3; l++) for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) {
    const b = new THREE.Mesh(barGeo, M.gold);
    b.position.set(-0.75 + i * 0.62 + (l % 2) * 0.06, 0.86 + l * 0.27, 0.52 + j * 0.2);
    b.rotation.y = (Math.random() - 0.5) * 0.12;
    goldBars.push(b); g.add(b);
  }
  const shelf = box(2.2, 0.5, 1.3, M.dark); shelf.position.set(0, 0.34, 0); g.add(shelf);
  // showcase ingots at the mouth so the vault reads even at low cash
  for (let i = 0; i < 3; i++) {
    const ing = box(0.78, 0.3, 0.5, M.gold);
    ing.position.set(-0.55 + i * 0.55, 1.18 + (i === 1 ? 0.3 : 0), 1.06);
    ing.rotation.y = (i - 1) * 0.16;
    g.add(ing);
  }
  const showcaseLight = new THREE.PointLight(0xffd27a, 10, 2.6, 2);
  showcaseLight.position.set(0, 1.8, 1.35); g.add(showcaseLight);
  // debt bars (outside right)
  const debtBars = [];
  const debtMat = new THREE.MeshStandardMaterial({ color: 0xc0392b, emissive: 0x5a0f08, emissiveIntensity: 0.5, roughness: 0.4, metalness: 0.2 });
  for (let i = 0; i < 8; i++) {
    const b = box(0.28, 0.32, 0.28, debtMat);
    b.position.set(2.6, 0.28 + i * 0.38, -0.8 + (i % 2) * 0.34);
    debtBars.push(b); g.add(b);
  }
  // gold light
  const gl = new THREE.PointLight(0xffcc66, 14, 8, 2); gl.position.set(0.2, 1.8, 0.9); g.add(gl);
  const inLight = new THREE.PointLight(0xffd27a, 24, 5, 2); inLight.position.set(0.1, 2.0, 1.1); g.add(inLight);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture('rgba(255,214,120,0.85)','rgba(255,180,60,0)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  glow.position.set(0.2, 2.0, 0.8); glow.scale.set(0.7, 0.7, 1); glow.material.opacity = 0.25; g.add(glow);

  shadowify(g, true, true);
  return { group: g, goldBars, debtBars, gl };
}
const vault = buildVault();
world.add(vault.group);

/* ---------------- central sculpture ---------------- */
function buildSculpture() {
  const g = new THREE.Group();
  g.position.set(0, 0, 2.3);
  const ped = box(1.9, 0.7, 1.9, M.dark); ped.position.y = 0.35; g.add(ped);
  const top = box(2.0, 0.06, 2.0, M.metal); top.position.y = 0.73; g.add(top);
  const discs = [];
  for (let i = 0; i < 3; i++) {
    const d = cyl(1.0 - i * 0.12, 1.0 - i * 0.12, 0.035, 40, new THREE.MeshStandardMaterial({ color: 0x8fe7ff, emissive: 0x1e7d9a, emissiveIntensity: 0.75, metalness: 0.6, roughness: 0.25, transparent: true, opacity: 0.92 }));
    d.rotation.x = Math.PI / 2 + (i - 1) * 0.28;
    d.rotation.z = i * 0.7;
    d.position.y = 1.15 + i * 0.28;
    discs.push(d); g.add(d);
  }
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.025, 8, 60), M.gold);
  ring.rotation.x = Math.PI / 2; ring.position.y = 1.15; g.add(ring);
  shadowify(g, true, true);
  return { group: g, discs, ring };
}
const sculpture = buildSculpture();
world.add(sculpture.group);

/* ---------------- outdoor ---------------- */
function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

function buildOutdoor() {
  const g = new THREE.Group();
  const rand = rng(20261022);

  // trees (instanced trunks + foliage)
  const n = FINE ? 46 : 26;
  const trunkGeo = new THREE.CylinderGeometry(0.12, 0.18, 1.6, 6);
  const leafGeo = new THREE.ConeGeometry(0.95, 2.8, 7);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x7a5a3c, roughness: 0.9 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x4f8f5f, roughness: 0.85 });
  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, n);
  const leaves = new THREE.InstancedMesh(leafGeo, leafMat, n);
  trunks.castShadow = leaves.castShadow = true;
  trunks.receiveShadow = leaves.receiveShadow = true;
  const d = new THREE.Object3D();
  const c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    let x, z;
    do {
      const a = rand() * Math.PI * 2, r = 22 + rand() * 34;
      x = Math.cos(a) * r; z = Math.sin(a) * r * 0.75;
    } while ((Math.abs(x) < 21 && Math.abs(z) < 17) || (z > 8 && Math.abs(x) < 24));
    const s = 0.55 + rand() * 0.55;
    d.position.set(x, 0.8 * s, z); d.scale.set(s, s, s); d.rotation.y = rand() * 6.28; d.updateMatrix();
    trunks.setMatrixAt(i, d.matrix);
    d.position.set(x, (1.6 + 1.2) * s, z); d.scale.set(s * (0.8 + rand() * 0.3), s, s * (0.8 + rand() * 0.3)); d.updateMatrix();
    leaves.setMatrixAt(i, d.matrix);
    c.setHSL(0.28 + rand() * 0.06, 0.32 + rand() * 0.15, 0.32 + rand() * 0.14);
    leaves.setColorAt(i, c);
  }
  leaves.instanceColor.needsUpdate = true;
  g.add(trunks, leaves);

  // bushes
  const bushGeo = new THREE.SphereGeometry(0.55, 8, 6);
  const bushMat = new THREE.MeshStandardMaterial({ color: 0x5b9c68, roughness: 0.9 });
  const bushes = new THREE.InstancedMesh(bushGeo, bushMat, 42);
  for (let i = 0; i < 42; i++) {
    const a = rand() * Math.PI * 2, r = 18 + rand() * 12;
    d.position.set(Math.cos(a) * r, 0.35, Math.sin(a) * r * 0.7);
    const s = 0.5 + rand() * 0.8; d.scale.set(s, s * 0.7, s); d.updateMatrix();
    bushes.setMatrixAt(i, d.matrix);
  }
  bushes.castShadow = true; g.add(bushes);

  // lamp posts along path
  for (let i = 0; i < 6; i++) {
    const z = 15 + i * 4.2;
    const side = i % 2 === 0 ? -3.2 : 3.2;
    const post = cyl(0.06, 0.08, 2.6, 8, M.metal); post.position.set(side, 1.3, z); g.add(post);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), emissive(0xffd9a0, 1.4));
    lamp.position.set(side, 2.65, z); g.add(lamp);
  }

  // clouds
  const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, roughness: 1, depthWrite: false });
  const clouds = [];
  for (let i = 0; i < 7; i++) {
    const cg = new THREE.Group();
    const base = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), cloudMat);
    for (let j = 0; j < 5; j++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.7 + Math.random() * 0.6, 10, 8), cloudMat);
      m.position.set((j - 2) * 0.85 + Math.random() * 0.3, Math.random() * 0.3, Math.random() * 0.4);
      m.scale.set(1.6, 0.55, 1);
      cg.add(m);
    }
    cg.position.set(-45 + i * 15, 28 + Math.random() * 8, -35 + Math.random() * 20);
    cg.scale.setScalar(2.5 + Math.random() * 2);
    clouds.push(cg); g.add(cg);
  }

  return { group: g, clouds };
}
const outdoor = buildOutdoor();
world.add(outdoor.group);

/* ---------------- HTML zone labels ---------------- */
const zoneAnchors = {
  cleanroom: new THREE.Vector3(-8.4, 5.15, 5.2),
  warehouse: new THREE.Vector3(10.0, 4.95, 5.9),
  hbm: new THREE.Vector3(-10.4, 7.0, -7.2),
  boardroom: new THREE.Vector3(9.6, 7.65, -6.4),
  vault: new THREE.Vector3(2.9, 3.85, -4.9)
};
const zoneLabelEls = {};
{
  const wrap = document.getElementById('zonelabels');
  const defs = [
    ['cleanroom', '洁净室', '', ''],
    ['warehouse', '仓库', 'warehouse', ''],
    ['hbm', 'HBM 产线', 'hbm', ''],
    ['boardroom', '董事会', 'boardroom', ''],
    ['vault', '金库', 'vault', '']
  ];
  for (const [key, title, cls] of defs) {
    const d = document.createElement('div');
    d.className = 'zonelabel ' + (cls || '');
    d.innerHTML = `<b>${title}</b><span></span>`;
    d.addEventListener('click', () => openZone(key));
    wrap.appendChild(d);
    zoneLabelEls[key] = d;
  }
}
function updateZoneLabels(q) {
  zoneLabelEls.cleanroom.querySelector('span').textContent = `开工率 ${Math.round(q.utilization * 100)}% · 产量 ${fmt1(q.produced)} 千片`;
  zoneLabelEls.warehouse.querySelector('span').textContent = `库存 ${fmt0(q.inventoryKw)} 千片 · 账面 ${money(q.inventory)}`;
  zoneLabelEls.hbm.querySelector('span').textContent = `产量 ${fmt1(q.hbmProduced)} 千片 · 收入占比 ${(q.hbmRevShare * 100).toFixed(0)}%`;
  zoneLabelEls.boardroom.querySelector('span').textContent = `净利 ${money(q.netIncome)} · 权益 ${money(q.equity)}`;
  zoneLabelEls.vault.querySelector('span').textContent = `现金 ${money(q.cash)} · 负债 ${money(q.debt + q.emergencyDebt)}`;
}
const _v = new THREE.Vector3();
function projectZoneLabels() {
  for (const key in zoneAnchors) {
    const el = zoneLabelEls[key];
    _v.copy(zoneAnchors[key]).project(camera);
    if (_v.z > 1 || _v.z < -1) { el.style.opacity = '0'; continue; }
    const x = (_v.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-_v.y * 0.5 + 0.5) * window.innerHeight;
    if (x < 8 || x > window.innerWidth - 8 || y < 8 || y > window.innerHeight - 8) {
      el.style.opacity = '0'; continue;
    }
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    el.style.opacity = '0.96';
  }
}

/* ---------------- click targets ---------------- */
const clickTargets = [];
const hitMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
function hitBox(key, x, y, z, w, h, d) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), hitMat);
  m.position.set(x, y, z);
  m.userData.zone = key;
  scene.add(m);
  clickTargets.push(m);
}
hitBox('cleanroom', -7, 2.4, 2.5, 13.6, 4.8, 9.0);
hitBox('warehouse', 8.6, 2.2, 3.2, 8.4, 4.6, 7.4);
hitBox('hbm', -7.5, 3.6, -5.8, 13.6, 5.2, 6.0);
hitBox('boardroom', 8.6, 4.6, -5.8, 7.4, 3.6, 6.0);
hitBox('vault', 2.8, 2.0, -7.2, 4.8, 4.2, 3.9);

/* ---------------- dust ---------------- */
function buildDust() {
  const n = FINE ? 220 : 90;
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 32;
    pos[i * 3 + 1] = Math.random() * 7;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 20;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ color: 0xfff0cf, size: 0.045, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending });
  const p = new THREE.Points(geo, mat);
  p.userData.phase = Math.random() * 10;
  return p;
}
const dust = buildDust();
world.add(dust);

/* ---------------- atmosphere: steam & people ---------------- */
function buildSteam() {
  const group = new THREE.Group();
  const tex = glowTexture('rgba(255,255,255,0.45)', 'rgba(255,255,255,0)');
  const items = [];
  const spots = [
    [-12.8, 4.9, -7.6, 2.6], [-9.0, 5.4, -6.6, 2.2], [-4.2, 4.8, -7.3, 2.0],
    [-10.5, 4.2, 2.4, 1.8], [-3.4, 4.4, 4.2, 1.6], [12.2, 5.8, -6.0, 1.4]
  ];
  for (const [x, y, z, sc] of spots) {
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.16, depthWrite: false });
    const sp = new THREE.Sprite(mat);
    sp.position.set(x, y, z);
    sp.scale.set(sc, sc * 0.8, 1);
    sp.userData = { baseX: x, baseZ: z, baseY: y, phase: Math.random() * 6.28, speed: 0.3 + Math.random() * 0.2 };
    group.add(sp); items.push(sp);
  }
  return { group, items };
}
const steam = buildSteam();
world.add(steam.group);

function makePerson(coatColor, helmet = false) {
  const g = new THREE.Group();
  const coat = new THREE.MeshStandardMaterial({ color: coatColor, roughness: 0.75 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.42, 4, 8), coat);
  body.position.y = 0.72; g.add(body);
  const headMat = new THREE.MeshStandardMaterial({ color: 0xe0bc95, roughness: 0.8 });
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 8), helmet ? new THREE.MeshStandardMaterial({ color: 0xf4f8ff, roughness: 0.5 }) : headMat);
  head.position.y = 1.13; g.add(head);
  for (const x of [-0.1, 0.1]) {
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.3, 3, 6), new THREE.MeshStandardMaterial({ color: 0x2a3a4a, roughness: 0.8 }));
    leg.position.set(x, 0.25, 0); g.add(leg);
  }
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}
const people = [];
{
  const p1 = makePerson(0xf2f7ff, true); p1.position.set(-9.6, 0.32, 4.0); people.push({ g: p1, baseX: -9.6, baseZ: 4.0, range: 3.2, axis: 'x', phase: 0.5, speed: 0.32 });
  const p2 = makePerson(0xf2f7ff, true); p2.position.set(-4.6, 0.32, 2.9); people.push({ g: p2, baseX: -4.6, baseZ: 2.9, range: 2.6, axis: 'z', phase: 2.1, speed: 0.26 });
  const p3 = makePerson(0xe8a23b); p3.position.set(9.4, 0.32, -0.6); people.push({ g: p3, baseX: 9.4, baseZ: -0.6, range: 2.2, axis: 'z', phase: 4.0, speed: 0.3 });
  const p4 = makePerson(0x223b56); p4.position.set(6.8, 3.22, -4.4); people.push({ g: p4, baseX: 6.8, baseZ: -4.4, range: 0.8, axis: 'x', phase: 1.2, speed: 0.1 });
  people.forEach(p => world.add(p.g));
}

/* ---------------- state ---------------- */
const initial = QS[0];
const visual = {
  util: initial.utilization,
  inventory: initial.inventoryKw,
  hbm: initial.hbmProduced,
  cash: initial.cash,
  debt: initial.debt + initial.emergencyDebt,
  hbmShare: initial.hbmShare,
  price: initial.price
};
const target = { ...visual };

let current = 0;
let playing = false;
let playTimer = 0;
let speed = 1;
const INTERVAL = 2400;

const $ = id => document.getElementById(id);
const el = {
  qnum: $('qnum'), phase: $('phase'), price: $('price'), hbmPrice: $('hbmPrice'),
  util: $('util'), utilBar: $('utilBar'),
  inv: $('inv'), hbm: $('hbm'), cash: $('cash'), debt: $('debt'), ni: $('ni'),
  gm: $('gm'), equity: $('equity'), yearTag: $('yearTag'),
  range: $('range'), ticks: $('ticks'), play: $('btnPlay'), speed: $('btnSpeed'),
  detail: $('detail'), detailTitle: $('detailTitle'), detailTag: $('detailTag'),
  detailText: $('detailText'), detailGrid: $('detailGrid'), toast: $('toast')
};

/* ticks */
for (let i = 1; i <= 16; i++) {
  const s = document.createElement('span');
  s.textContent = i;
  s.dataset.q = i;
  s.addEventListener('click', () => setQuarter(i - 1, true));
  el.ticks.appendChild(s);
}

function phaseClass(p) {
  return p === '下行' ? 'down' : p === '复苏' ? 'recover' : 'boom';
}

function updateHUD(q) {
  el.qnum.textContent = String(q.q).padStart(2, '0');
  el.phase.textContent = q.phase;
  el.phase.className = 'phase ' + phaseClass(q.phase);
  el.price.textContent = q.price.toFixed(2);
  el.hbmPrice.textContent = q.hbmPrice.toFixed(1);
  el.util.textContent = Math.round(q.utilization * 100);
  el.utilBar.style.width = (q.utilization * 100).toFixed(1) + '%';
  el.inv.textContent = fmt0(q.inventoryKw);
  el.hbm.textContent = fmt1(q.hbmProduced);
  el.cash.textContent = money(q.cash);
  el.debt.textContent = money(q.debt + q.emergencyDebt);
  el.ni.textContent = money(q.netIncome);
  el.gm.textContent = (q.grossMargin * 100).toFixed(1);
  el.equity.textContent = money(q.equity);
  el.yearTag.textContent = 'Y' + (q.q <= 4 ? 1 : q.q <= 8 ? 2 : q.q <= 12 ? 3 : 4);
  el.range.value = q.q;
  [...el.ticks.children].forEach((s, i) => s.classList.toggle('active', i === q.q - 1));
}

function setQuarter(i, fly = false) {
  i = clamp(i, 0, 15);
  current = i;
  const q = QS[i];
  target.util = q.utilization;
  target.inventory = q.inventoryKw;
  target.hbm = q.hbmProduced;
  target.cash = q.cash;
  target.debt = q.debt + q.emergencyDebt;
  target.hbmShare = q.hbmShare;
  target.price = q.price;
  updateHUD(q);
  updateZoneLabels(q);
  drawSpark(i);
  updateScreen(q);
  if (playing) playTimer = 0;
  if (fly) {
    // no camera change on scrub
  }
}

/* ---------------- boardroom screen ---------------- */
function updateScreen(q) {
  const { sctx, scrTex, screenCanvas } = boardroom;
  const w = screenCanvas.width, h = screenCanvas.height;
  sctx.clearRect(0, 0, w, h);
  const g = sctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#0c2138'); g.addColorStop(1, '#071624');
  sctx.fillStyle = g; sctx.fillRect(0, 0, w, h);
  sctx.fillStyle = 'rgba(232,184,75,0.9)';
  sctx.font = '600 22px "PingFang SC","Microsoft YaHei",sans-serif';
  sctx.fillText('NET INCOME · 16Q', 24, 34);
  const n = QS.length;
  const maxAbs = Math.max(...QS.map(x => Math.abs(x.netIncome)), 1);
  const barW = (w - 60) / n;
  const baseY = h - 42;
  for (let i = 0; i < n; i++) {
    const v = QS[i].netIncome;
    const bh = Math.abs(v) / maxAbs * (h - 92);
    sctx.fillStyle = i === current ? '#ffd98a' : (v < 0 ? 'rgba(192,57,43,0.65)' : 'rgba(56,199,180,0.55)');
    sctx.fillRect(30 + i * barW + 2, v >= 0 ? baseY - bh : baseY, barW - 4, bh);
  }
  sctx.strokeStyle = 'rgba(255,255,255,0.16)'; sctx.beginPath(); sctx.moveTo(28, baseY); sctx.lineTo(w - 24, baseY); sctx.stroke();
  sctx.fillStyle = '#ffffff'; sctx.font = '700 26px "Microsoft YaHei",sans-serif';
  sctx.fillText(`Q${String(q.q).padStart(2, '0')}  ${money(q.netIncome)}`, 24, h - 12);
  scrTex.needsUpdate = true;
}

/* ---------------- sparkline ---------------- */
const spark = document.getElementById('spark');
function drawSpark(idx) {
  if (!spark) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const rect = spark.getBoundingClientRect();
  const w = Math.max(240, rect.width), h = Math.max(70, rect.height);
  spark.width = w * dpr; spark.height = h * dpr;
  const ctx = spark.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  const pad = { l: 2, r: 2, t: 8, b: 12 };
  const n = QS.length;
  const maxRev = Math.max(...QS.map(q => q.revenue), 1);
  const maxAbsNi = Math.max(...QS.map(q => Math.abs(q.netIncome)), 1);
  const barW = (w - pad.l - pad.r) / n;
  const baseY = h - pad.b;
  // grid
  ctx.strokeStyle = 'rgba(180,220,255,0.12)'; ctx.lineWidth = 1;
  for (let i = 0; i <= 2; i++) {
    const y = pad.t + i * (baseY - pad.t) / 2;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }
  // revenue bars
  for (let i = 0; i < n; i++) {
    const bh = QS[i].revenue / maxRev * (baseY - pad.t);
    ctx.fillStyle = i === idx ? 'rgba(124,170,255,0.95)' : 'rgba(91,143,249,0.38)';
    ctx.fillRect(pad.l + i * barW + 1.5, baseY - bh, barW - 3, bh);
  }
  // net income line
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const x = pad.l + i * barW + barW / 2;
    const y = baseY - (QS[i].netIncome / maxAbsNi) * (baseY - pad.t) * 0.85;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.strokeStyle = '#e8b84b'; ctx.lineWidth = 1.8; ctx.stroke();
  // current marker
  const cx = pad.l + idx * barW + barW / 2;
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.setLineDash([3, 3]);
  ctx.beginPath(); ctx.moveTo(cx, pad.t); ctx.lineTo(cx, baseY); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = '#ffd98a'; ctx.beginPath(); ctx.arc(cx, baseY - (QS[idx].netIncome / maxAbsNi) * (baseY - pad.t) * 0.85, 2.6, 0, 6.28); ctx.fill();
  // quarter labels
  ctx.fillStyle = 'rgba(190,218,240,0.5)'; ctx.font = '7px "PingFang SC",sans-serif'; ctx.textAlign = 'center';
  for (let i = 0; i < n; i += 3) ctx.fillText('Q' + (i + 1), pad.l + i * barW + barW / 2, h - 2);
}

/* ---------------- zone detail ---------------- */
const ZONES = {
  cleanroom: q => ({
    title: '洁净室',
    tag: `开工率 ${Math.round(q.utilization * 100)}% · 产量 ${fmt1(q.produced)} 千片`,
    text: `本季单位成本 ${q.unitCost.toFixed(1)} 百万美元/千片。满产把折旧与固定费用摊到更多片上；开工率每降 10 个百分点，单位成本大约上升 0.8–1.2。`,
    grid: [['产量', `${fmt1(q.produced)} 千片`], ['单位成本', `${q.unitCost.toFixed(1)} 百万/千片`], ['产能', `${fmt1(q.capacity)} 千片/季`], ['固定成本', '1.0 + 折旧/季']]
  }),
  warehouse: q => ({
    title: '仓库',
    tag: `库存 ${fmt0(q.inventoryKw)} 千片 · 账面 ${money(q.inventory)}`,
    text: `库存是本局最重要的“产能期权”：Q7 峰值 418 千片，Q14 清零。累计跌价仅 1.50；Q8–Q14 的销量超过产量，库存反向贡献利润。`,
    grid: [['库存', `${fmt0(q.inventoryKw)} 千片`], ['账面价值', `${money(q.inventory)} 十亿`], ['周转天数', `${q.inventoryDays.toFixed(0)} 天`], ['单季跌价', `${money(q.writedown)} 十亿`]]
  }),
  hbm: q => ({
    title: 'HBM 产线',
    tag: `产量 ${fmt1(q.hbmProduced)} 千片 · 收入占比 ${(q.hbmRevShare * 100).toFixed(0)}%`,
    text: `HBM 与普通内存共用产能，但价格是后者的 2.6–4.6 倍。Q4 量产，Q16 生产 192.5 千片、卖出 185 千片；收入占比 61.4%。`,
    grid: [['HBM 产量', `${fmt1(q.hbmProduced)} 千片`], ['HBM 收入', `${money(q.revenueHbm)} 十亿`], ['HBM 单价', q.aspHbm ? `${q.aspHbm.toFixed(1)} 百万/千片` : '本季无销售'], ['份额', `${(q.hbmShare * 100).toFixed(1)}%`]]
  }),
  boardroom: q => ({
    title: '董事会会议室',
    tag: `单季净利 ${money(q.netIncome)} · 权益 ${money(q.equity)}`,
    text: `16 季累计净利 173.81，期末权益 208.77，权益 5.97 倍。Q16 单季净利 53.06，超过前 13 季总和；但 Q1–Q4 曾累计亏损 9.44。`,
    grid: [['累计净利', `${money(AGG.net_income)} 十亿`], ['期末权益', `${money(q.equity)} 十亿`], ['单季净利', `${money(q.netIncome)} 十亿`], ['累计收入', `${money(AGG.revenue)} 十亿`]]
  }),
  vault: q => ({
    title: '金库',
    tag: `现金 ${money(q.cash)} · 有息负债 ${money(q.debt + q.emergencyDebt)}`,
    text: `峰值负债 16.0（Q4–Q9），Q13 还清；期末现金 180.92，净现金 180.92。最低现金 2.03（Q8），离 0.5 的紧急授信线还有 1.5 的安全垫。`,
    grid: [['现金', `${money(q.cash)} 十亿`], ['有息负债', `${money(q.debt + q.emergencyDebt)} 十亿`], ['净负债', `${money(q.netDebt)} 十亿`], ['资产负债率', `${(q.debtRatio * 100).toFixed(1)}%`]]
  })
};

function openZone(key) {
  setPlaying(false);
  const q = QS[current];
  const z = ZONES[key](q);
  el.detailTitle.textContent = z.title;
  el.detailTag.textContent = z.tag;
  el.detailText.textContent = z.text;
  el.detailGrid.innerHTML = z.grid.map(([a, b]) => `<div><em>${a}</em><b>${b}</b></div>`).join('');
  el.detail.classList.add('show');
  const presets = {
    cleanroom: { pos: [-27, 20, 24], target: [-7, 1.8, 2.5] },
    warehouse: { pos: [27, 19, 25], target: [8.6, 1.8, 3.2] },
    hbm: { pos: [-28, 21, 6], target: [-7.5, 3.2, -5.8] },
    boardroom: { pos: [27, 19, 12], target: [8.6, 4.0, -5.8] },
    vault: { pos: [16, 14, 7], target: [2.8, 1.8, -7.2] }
  };
  const p = presets[key];
  flyTo(p.pos, p.target, 1150);
}

/* ---------------- camera animation ---------------- */
let fly = null;
let intro = null;
function flyTo(pos, target, dur = 1200) {
  fly = {
    fromPos: camera.position.clone(),
    toPos: new THREE.Vector3(...pos),
    fromTarget: controls.target.clone(),
    toTarget: new THREE.Vector3(...target),
    t: 0, dur: dur / 1000
  };
  controls.enabled = false;
  controls.autoRotate = false;
  setRotateBtn(false);
}
function setRotateBtn(on) {
  const b = $('btnRotate');
  if (!b) return;
  b.classList.toggle('on', on);
}

/* ---------------- playback ---------------- */
function setPlaying(v) {
  if (v && current === 15) setQuarter(0);
  playing = v;
  playTimer = 0;
  el.play.textContent = v ? '❚❚' : '▶';
}
function togglePlay() { setPlaying(!playing); }
function nextQ() { setQuarter(current + 1, false); }
function prevQ() { setQuarter(current - 1, false); }

el.play.addEventListener('click', togglePlay);
$('btnNext').addEventListener('click', () => { setPlaying(false); nextQ(); });
$('btnPrev').addEventListener('click', () => { setPlaying(false); prevQ(); });
el.range.addEventListener('input', e => { setPlaying(false); setQuarter(parseInt(e.target.value, 10) - 1); });
el.speed.addEventListener('click', () => {
  speed = speed === 1 ? 1.5 : speed === 1.5 ? 2 : speed === 2 ? 0.75 : 1;
  el.speed.textContent = speed.toFixed(2).replace(/0$/, '') + '×';
});
$('btnRotate').addEventListener('click', () => {
  controls.autoRotate = !controls.autoRotate;
  setRotateBtn(controls.autoRotate);
});
$('btnReset').addEventListener('click', () => {
  el.detail.classList.remove('show');
  flyTo(HOME.pos.toArray(), HOME.target.toArray(), 1200);
  controls.autoRotate = true;
  setRotateBtn(true);
  toast('已回到全景视角');
});
$('detailClose').addEventListener('click', () => el.detail.classList.remove('show'));

let toastTimer = 0;
function toast(msg) {
  el.toast.textContent = msg;
  el.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.toast.classList.remove('show'), 2200);
}

document.addEventListener('keydown', e => {
  if (e.key === 'ArrowRight') { setPlaying(false); nextQ(); }
  if (e.key === 'ArrowLeft') { setPlaying(false); prevQ(); }
  if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
});

/* click / drag */
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let down = null;
renderer.domElement.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY }; });
renderer.domElement.addEventListener('pointerup', e => {
  if (!down) return;
  const dist = Math.hypot(e.clientX - down.x, e.clientY - down.y);
  down = null;
  if (dist > 7) return;
  pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(clickTargets, false);
  if (hits.length) openZone(hits[0].object.userData.zone);
});
controls.addEventListener('start', () => {
  if (fly) return;
  if (controls.autoRotate) { controls.autoRotate = false; setRotateBtn(false); }
});

/* ---------------- warehouse update ---------------- */
const dummy = new THREE.Object3D();
function updateWarehouse(kw) {
  const level = clamp(kw / 418, 0, 1) * 8;
  let idx = 0;
  for (const z of warehouse.rows) {
    for (const x of warehouse.cols) {
      for (let l = 0; l < 8; l++) {
        const visible = l < Math.floor(level + 0.001);
        const partial = (l === Math.floor(level)) ? (level - Math.floor(level)) : 0;
        const s = visible ? 1 : (partial > 0.02 ? partial : 0.0001);
        dummy.position.set(x, 0.85 + l * 0.385 + (s - 1) * 0.18, z);
        dummy.scale.set(1, s, 1);
        dummy.updateMatrix();
        warehouse.boxes.setMatrixAt(idx, dummy.matrix);
        idx++;
      }
    }
  }
  warehouse.boxes.instanceMatrix.needsUpdate = true;
}

/* ---------------- scene animation ---------------- */
const clock = new THREE.Clock();
let elapsed = 0;
let warehouseInit = false;
let lastInv = -1;

function animateScene(dt) {
  elapsed += dt;

  // damped visual metrics
  visual.util = damp(visual.util, target.util, 4.5, dt);
  visual.inventory = damp(visual.inventory, target.inventory, 4.5, dt);
  visual.hbm = damp(visual.hbm, target.hbm, 4.5, dt);
  visual.cash = damp(visual.cash, target.cash, 4.5, dt);
  visual.debt = damp(visual.debt, target.debt, 4.5, dt);
  visual.hbmShare = damp(visual.hbmShare, target.hbmShare, 4.5, dt);
  visual.price = damp(visual.price, target.price, 4.5, dt);

  // cleanroom
  const u = visual.util;
  const pulse = 0.55 + 0.45 * Math.sin(elapsed * 2.2);
  cleanroom.tools.forEach((t, i) => {
    t.userData.disc.material.emissiveIntensity = 0.5 + u * 1.2 + 0.1 * Math.sin(elapsed * 2 + i);
    t.userData.ring.material.emissiveIntensity = 0.5 + u * 0.9;
    t.userData.panel.material.emissiveIntensity = 0.4 + u * 1.2;
  });
  cleanroom.gantry.position.x = Math.sin(elapsed * (0.35 + u * 0.8)) * 5.4;
  cleanroom.gantry.children[2].position.y = 2.17 + Math.sin(elapsed * 3) * 0.06;

  // warehouse
  if (Math.abs(visual.inventory - lastInv) > 0.35) {
    updateWarehouse(visual.inventory);
    lastInv = visual.inventory;
  }
  warehouse.forklift.position.z = Math.sin(elapsed * (0.25 + u * 0.4) + 1.2) * 2.7;
  warehouse.forklift.rotation.y = Math.cos(elapsed * (0.25 + u * 0.4) + 1.2) > 0 ? 0 : Math.PI;

  // HBM
  const maxChips = Math.round(clamp(visual.hbm / 192.5, 0, 1) * 14);
  hbm.chips.forEach((c, i) => {
    c.visible = i < maxChips;
    c.position.x += dt * (0.45 + visual.hbmShare * 3.2);
    if (c.position.x > 5.2) c.position.x = -5.2;
    c.position.y = 1.13 + Math.sin(elapsed * 3 + i) * 0.02;
  });
  hbm.arms.forEach((a, i) => {
    a.userData.elbow.rotation.x = Math.sin(elapsed * (0.8 + visual.hbmShare * 2) + i * 2.1) * 0.55;
    a.rotation.y = Math.sin(elapsed * 0.5 + i) * 0.25;
  });
  hbm.stations.forEach((s, i) => {
    s.ring.rotation.z = elapsed * (0.6 + i * 0.1);
    s.ring.material.emissiveIntensity = 0.9 + 0.6 * pulse;
    s.core.scale.y = 1 + 0.08 * Math.sin(elapsed * 2.5 + i);
  });

  // vault
  const goldN = clamp(Math.ceil(Math.log10(visual.cash + 1) / Math.log10(181) * 12), 1, 12);
  vault.goldBars.forEach((b, i) => { b.visible = i < goldN; });
  const debtN = clamp(Math.ceil(visual.debt / 16 * 8), 0, 8);
  vault.debtBars.forEach((b, i) => { b.visible = i < debtN; });
  vault.gl.intensity = 12 + Math.min(visual.cash, 180) * 0.18;

  // sculpture
  sculpture.discs.forEach((d, i) => { d.rotation.z += dt * (0.15 + i * 0.04); });
  sculpture.ring.rotation.z += dt * 0.12;

  // dust
  const pos = dust.geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    let y = pos.getY(i) + dt * 0.22;
    if (y > 7) y = 0.2;
    pos.setY(i, y);
  }
  pos.needsUpdate = true;

  // steam
  steam.items.forEach((sp, i) => {
    const u = sp.userData;
    const k = (elapsed * u.speed + u.phase) % 3.2;
    sp.position.y = u.baseY + k * 0.55;
    sp.position.x = u.baseX + Math.sin(elapsed * 0.3 + i) * 0.25;
    sp.position.z = u.baseZ + Math.cos(elapsed * 0.25 + i) * 0.2;
    sp.material.opacity = 0.18 * Math.sin(Math.min(1, k / 3.2) * Math.PI);
    sp.scale.setScalar(1.6 + k * 0.55);
  });
  // people
  people.forEach((p, i) => {
    const s = Math.sin(elapsed * p.speed + p.phase);
    if (p.axis === 'x') p.g.position.x = p.baseX + s * p.range;
    else p.g.position.z = p.baseZ + s * p.range;
    p.g.rotation.y = (p.axis === 'x' ? (Math.cos(elapsed * p.speed + p.phase) > 0 ? Math.PI / 2 : -Math.PI / 2) : (Math.cos(elapsed * p.speed + p.phase) > 0 ? 0 : Math.PI));
    p.g.position.y += 0;
  });

  // clouds
  outdoor.clouds.forEach((c, i) => {
    c.position.x += dt * (0.15 + i * 0.01);
    if (c.position.x > 60) c.position.x = -60;
  });

}

/* ---------------- camera update ---------------- */
function updateCamera(dt) {
  if (fly) {
    fly.t += dt;
    const k = ease(clamp(fly.t / fly.dur, 0, 1));
    camera.position.lerpVectors(fly.fromPos, fly.toPos, k);
    controls.target.lerpVectors(fly.fromTarget, fly.toTarget, k);
    if (k >= 1) { controls.enabled = true; fly = null; }
  }
  if (intro) {
    intro.t += dt;
    const k = ease(clamp(intro.t / intro.dur, 0, 1));
    camera.position.lerpVectors(intro.fromPos, intro.toPos, k);
    controls.target.copy(HOME.target);
    if (k >= 1) {
      intro = null;
      controls.enabled = true;
      controls.autoRotate = true;
      setRotateBtn(true);
    }
  }
  controls.update();
}

/* ---------------- resize ---------------- */
function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.fov = window.innerWidth < 900 ? 52 : 36;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, FINE ? 2 : 1.5));
  renderer.setSize(window.innerWidth, window.innerHeight);
  drawSpark(current);
}
window.addEventListener('resize', onResize);

/* ---------------- init ---------------- */
setQuarter(0);
drawSpark(0);
updateWarehouse(initial.inventoryKw);
updateScreen(QS[0]);

intro = {
  t: 0, dur: 3.0,
  fromPos: camera.position.clone(),
  toPos: HOME.pos.clone()
};
controls.enabled = false;

/* play loop */
let last = performance.now();
function frame(now) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  if (playing) {
    playTimer += dt * 1000 * speed;
    if (playTimer >= INTERVAL) {
      playTimer = 0;
      if (current < 15) setQuarter(current + 1);
      else setPlaying(false);
    }
  }
  animateScene(dt);
  updateCamera(dt);
  projectZoneLabels();
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

setTimeout(() => document.getElementById('loader').classList.add('hide'), 750);
