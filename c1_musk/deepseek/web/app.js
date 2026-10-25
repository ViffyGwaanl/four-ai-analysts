import * as THREE from './vendor/three.module.min.js';

const D = window.MERGER_DATA;
const $ = (s) => document.querySelector(s);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smoothstep = (a, b, x) => { x = clamp((x - a) / (b - a), 0, 1); return x * x * (3 - 2 * x); };
const MOBILE = window.matchMedia('(max-width: 768px)').matches;
const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const TH = [0.14, 0.27, 0.40, 0.53, 0.66, 0.79];
const FINAL_AT = 0.87;

let renderer, scene, camera, clock;
let rocket, rocketTargetY = 0.28;
let stages = [], detached = [], smokePool = [], clouds = [], labels = [];
let progress = 0, targetProgress = 0, separated = 0, active = -2, resetting = false;
let finalShown = false, ignited = false, elapsed = 0;
let mouseX = 0, mouseY = 0;
let camTarget = new THREE.Vector3(0, 9, 0);
const SKY_DAY_TOP = new THREE.Color(0x2F74C0), SKY_NIGHT_TOP = new THREE.Color(0x083E4E);
const SKY_DAY_BOT = new THREE.Color(0xE8F6FF), SKY_NIGHT_BOT = new THREE.Color(0x1C8A8A);
const FOG_DAY = new THREE.Color(0xD8ECFF), FOG_NIGHT = new THREE.Color(0x11636B);
const RIM_WARM = new THREE.Color(0xFFE0A8);
let plume, engineLight, dust, padGroup, skyUniforms, rimLight, finalSun, finalGlowLight, activeGlow;
let stageMats = [];



function init() {
  const canvas = $('#scene');
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  } catch (e) {
    console.error('WEBGL_INIT_FAILED', e);
    window.__initError = String(e && e.stack || e);
    showFallback();
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MOBILE ? 1.4 : 1.8));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = !MOBILE;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.06;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xeaf6ff);
  scene.fog = new THREE.FogExp2(0xd8ecff, 0.0068);

  camera = new THREE.PerspectiveCamera(MOBILE ? 46 : 37, window.innerWidth / window.innerHeight, 0.1, 1200);
  camera.position.set(-13, 12, 26);

  clock = new THREE.Clock();

  buildSky();
  buildLights();
  buildPad();
  buildRocket();
  buildClouds();
  buildDust();
  buildFinalSun();
  buildActiveGlow();
  buildSmokePool();
  buildLabels();
  buildFinalBars();

  bindEvents();
  setPanel(-1);
  updateUI();
  animate();

  window.__debug = {
    stages: () => stages.map(s => ({ i: s.userData.index, p: s.position.toArray().map(v=>+v.toFixed(2)), det: s.userData.detached, h: +s.userData.h.toFixed(2) })),
    rocket: () => rocket.position.toArray().map(v=>+v.toFixed(2)),
    cam: () => camera.position.toArray().map(v=>+v.toFixed(2)),
    target: () => camTarget.toArray().map(v=>+v.toFixed(2)),
    progress: () => +progress.toFixed(3), separated: () => separated
  };
  const loader = $('#loader');
  setTimeout(() => loader.classList.add('done'), 650);
}

/* ------------------------------------------------------------------ */
/*  textures                                                           */
/* ------------------------------------------------------------------ */
function makeRadialTexture(inner, mid, outer, size = 256) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, inner);
  g.addColorStop(0.18, mid);
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeSoftTexture() {
  return makeRadialTexture('rgba(255,255,255,0.95)', 'rgba(255,255,255,0.55)', 'rgba(255,255,255,0)');
}

function makeCloudTexture() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 128;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, 256, 128);
  const blobs = [
    [70, 74, 52], [110, 60, 48], [150, 74, 46], [190, 70, 38], [40, 82, 36], [220, 84, 26]
  ];
  for (const [x, y, r] of blobs) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(255,255,255,0.95)');
    g.addColorStop(0.55, 'rgba(255,255,255,0.55)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* ------------------------------------------------------------------ */
/*  sky / lights                                                       */
/* ------------------------------------------------------------------ */
function buildSky() {
  const skyGeo = new THREE.SphereGeometry(700, 40, 20);
  skyUniforms = {
    top: { value: new THREE.Color(0x2F74C0) },
    bottom: { value: new THREE.Color(0xE8F6FF) },
    offset: { value: 60.0 },
    exponent: { value: 0.86 }
  };
  const skyMat = new THREE.ShaderMaterial({
    uniforms: skyUniforms,
    vertexShader: `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 top;
      uniform vec3 bottom;
      uniform float offset;
      uniform float exponent;
      varying vec3 vWorldPosition;
      void main() {
        float h = normalize(vWorldPosition + vec3(0.0, offset, 0.0)).y;
        vec3 col = mix(bottom, top, pow(max(h, 0.0), exponent));
        col = mix(col, vec3(1.0, 0.965, 0.90), 0.16 * exp(-abs(h) * 12.0));
        gl_FragColor = vec4(col, 1.0);
      }
    `,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false
  });
  scene.add(new THREE.Mesh(skyGeo, skyMat));

  const sunTex = makeRadialTexture('rgba(255,255,255,1)', 'rgba(255,244,205,0.9)', 'rgba(255,235,180,0)');
  const sun = new THREE.Sprite(new THREE.SpriteMaterial({
    map: sunTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: true, fog: false, opacity: 0.72
  }));
  sun.position.set(260, 78, -260);
  sun.scale.set(46, 46, 1);
  scene.add(sun);

  const core = new THREE.Sprite(new THREE.SpriteMaterial({
    map: sunTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: true, fog: false, opacity: 0.78
  }));
  core.position.copy(sun.position);
  core.scale.set(16, 16, 1);
  scene.add(core);
}

function buildLights() {
  scene.add(new THREE.HemisphereLight(0xffffff, 0xbcd8f0, 0.76));
  scene.add(new THREE.AmbientLight(0xffffff, 0.12));

  const sun = new THREE.DirectionalLight(0xfff1cf, 2.55);
  sun.position.set(52, 78, -46);
  sun.castShadow = !MOBILE;
  if (!MOBILE) {
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -26;
    sun.shadow.camera.right = 26;
    sun.shadow.camera.top = 32;
    sun.shadow.camera.bottom = -14;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 220;
    sun.shadow.bias = -0.0005;
    sun.shadow.normalBias = 0.02;
  }
  scene.add(sun);

  const fill = new THREE.DirectionalLight(0x9cc8ff, 0.34);
  fill.position.set(-40, 22, 34);
  scene.add(fill);

  rimLight = new THREE.DirectionalLight(0xffffff, 0.85);
  rimLight.position.set(0, 16, -70);
  scene.add(rimLight);
}

/* ------------------------------------------------------------------ */
/*  launch pad                                                         */
/* ------------------------------------------------------------------ */
const matConcrete = new THREE.MeshStandardMaterial({ color: 0xd7d2c8, roughness: 0.92, metalness: 0.02 });
const matConcreteDark = new THREE.MeshStandardMaterial({ color: 0xa9a49a, roughness: 0.95, metalness: 0.02 });
const matMetal = new THREE.MeshStandardMaterial({ color: 0x8f9ca8, roughness: 0.42, metalness: 0.72 });
const matDark = new THREE.MeshStandardMaterial({ color: 0x1b2a3a, roughness: 0.45, metalness: 0.55 });
const matWhite = new THREE.MeshStandardMaterial({ color: 0xf5f2ea, roughness: 0.48, metalness: 0.05 });
const matWarm = new THREE.MeshStandardMaterial({ color: 0xffe3a8, emissive: 0xffc45c, emissiveIntensity: 1.2, roughness: 0.3 });

function addBeam(parent, a, b, radius, mat, radial = 8, cast = false) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, len, radial), mat);
  mesh.position.copy(a).addScaledVector(dir, 0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  mesh.castShadow = cast;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function buildPad() {
  const pad = new THREE.Group();
  pad.position.y = 0;
  scene.add(pad);
  padGroup = pad;

  const apron = new THREE.Mesh(new THREE.CylinderGeometry(13.2, 13.8, 0.8, 64), matConcrete);
  apron.position.y = -0.4;
  apron.receiveShadow = true;
  pad.add(apron);

  const apron2 = new THREE.Mesh(new THREE.CylinderGeometry(18.5, 19.2, 0.45, 64), matConcreteDark);
  apron2.position.y = -0.82;
  apron2.receiveShadow = true;
  pad.add(apron2);

  const ring = new THREE.Mesh(new THREE.TorusGeometry(4.6, 0.16, 12, 64), matMetal);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.06;
  pad.add(ring);

  const inner = new THREE.Mesh(new THREE.CylinderGeometry(4.4, 4.4, 0.14, 64), matDark);
  inner.position.y = 0.02;
  pad.add(inner);

  // launch mount legs
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2 + Math.PI / 4;
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.65, 1.8, 0.65), matMetal);
    leg.position.set(Math.cos(a) * 3.5, 0.9, Math.sin(a) * 3.5);
    leg.castShadow = true;
    pad.add(leg);
  }

  // flame trench
  const trench = new THREE.Mesh(new THREE.BoxGeometry(8.4, 0.22, 2.2), matDark);
  trench.position.set(0, 0.04, 0);
  pad.add(trench);

  // tower
  const tower = new THREE.Group();
  tower.position.set(10.8, 0, -4.8);
  pad.add(tower);
  const w = 2.1, th = 17;
  const corners = [[-w / 2, -w / 2], [w / 2, -w / 2], [w / 2, w / 2], [-w / 2, w / 2]];
  corners.forEach(([x, z]) => addBeam(tower, new THREE.Vector3(x, 0, z), new THREE.Vector3(x, th, z), 0.10, matMetal, 6));
  for (let y = 2.2; y <= th; y += 2.4) {
    for (let i = 0; i < 4; i++) {
      const [x1, z1] = corners[i];
      const [x2, z2] = corners[(i + 1) % 4];
      addBeam(tower, new THREE.Vector3(x1, y, z1), new THREE.Vector3(x2, y, z2), 0.055, matMetal, 5);
    }
    const y2 = Math.min(y + 2.4, th);
    addBeam(tower, new THREE.Vector3(-w / 2, y, -w / 2), new THREE.Vector3(w / 2, y2, -w / 2), 0.045, matMetal, 4);
    addBeam(tower, new THREE.Vector3(w / 2, y, -w / 2), new THREE.Vector3(-w / 2, y2, -w / 2), 0.045, matMetal, 4);
    addBeam(tower, new THREE.Vector3(-w / 2, y, w / 2), new THREE.Vector3(w / 2, y2, w / 2), 0.045, matMetal, 4);
    addBeam(tower, new THREE.Vector3(w / 2, y, w / 2), new THREE.Vector3(-w / 2, y2, w / 2), 0.045, matMetal, 4);
  }
  addBeam(tower, new THREE.Vector3(0, th, 0), new THREE.Vector3(-4.9, th, 0), 0.11, matMetal);
  addBeam(tower, new THREE.Vector3(-4.9, th, 0), new THREE.Vector3(-4.9, th - 2.2, 0), 0.055, matMetal, 5);
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 12), new THREE.MeshStandardMaterial({ color: 0xff4d3d, emissive: 0xff2a1a, emissiveIntensity: 1.6 }));
  beacon.position.set(0, th + 0.25, 0);
  tower.add(beacon);

  // fuel tanks
  [-1, 1].forEach((s, k) => {
    const tank = new THREE.Group();
    tank.position.set(-8.6, 0, -4.6 + k * 4.4);
    pad.add(tank);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.25, 4.3, 24), matWhite);
    body.position.y = 2.15; body.castShadow = true; tank.add(body);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(1.25, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), matWhite);
    dome.position.y = 4.3; dome.castShadow = true; tank.add(dome);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1.55, 0.4, 24), matConcreteDark);
    base.position.y = 0.2; tank.add(base);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(1.27, 1.27, 0.15, 24), matDark);
    band.position.y = 2.0; tank.add(band);
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 6.2, 8), matMetal);
    pipe.rotation.z = Math.PI / 2;
    pipe.position.set(3.2, 0.55, 0);
    tank.add(pipe);
  });

  // flood lights
  const lightSpots = [[-9.5, -5.0], [9.5, -5.0], [-9.5, 4.0], [9.5, 4.0]];
  lightSpots.forEach(([x, z], k) => {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 4.8, 8), matMetal);
    pole.position.set(x, 2.4, z); pad.add(pole);
    const head = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.42, 0.42), matWarm);
    head.position.set(x, 4.9, z); head.lookAt(new THREE.Vector3(0, 3.2, 0)); pad.add(head);
  });
  const l1 = new THREE.PointLight(0xffe3ac, 22, 26, 2);
  l1.position.set(-9.5, 5.2, -5.0); pad.add(l1);
  const l2 = new THREE.PointLight(0xffe3ac, 18, 24, 2);
  l2.position.set(9.5, 5.2, 4.0); pad.add(l2);

  // support buildings
  const b1 = new THREE.Mesh(new THREE.BoxGeometry(6.4, 2.5, 4.2), matConcrete);
  b1.position.set(-16.5, 1.25, -11.5); b1.castShadow = true; b1.receiveShadow = true; pad.add(b1);
  const b1roof = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.18, 4.6), matConcreteDark);
  b1roof.position.set(-16.5, 2.6, -11.5); pad.add(b1roof);
  const b2 = new THREE.Mesh(new THREE.BoxGeometry(5.2, 2.0, 3.6), matConcrete);
  b2.position.set(15.5, 1.0, -11.2); b2.castShadow = true; b2.receiveShadow = true; pad.add(b2);
  const b2roof = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.16, 4.0), matConcreteDark);
  b2roof.position.set(15.5, 2.1, -11.2); pad.add(b2roof);
}

/* ------------------------------------------------------------------ */
/*  rocket                                                             */
/* ------------------------------------------------------------------ */
function buildRocket() {
  rocket = new THREE.Group();
  rocket.position.y = 0.28;
  rocketTargetY = 0.28;
  scene.add(rocket);

  const totalBody = 26.0;
  const shares = D.biz.map(b => b.share);
  const raw = shares.map(s => Math.max(0.45, totalBody * s));
  const totalRaw = raw.reduce((a, b) => a + b, 0);
  const heights = raw.map(h => h * totalBody / totalRaw);

  let y = 0;
  D.biz.forEach((b, i) => {
    const h = heights[i];
    const r = 1.02 + 1.08 * Math.sqrt(b.share);
    const g = makeStage(b, i, h, r);
    g.position.y = y;
    g.userData = {
      home: new THREE.Vector3(0, y, 0),
      h, r, index: i, detached: false,
      park: new THREE.Vector3(), angVel: 0, phase: Math.random() * Math.PI * 2
    };
    rocket.add(g);
    stages.push(g);
    y += h + 0.045;
  });

  // nose cone on top stage
  const top = stages[stages.length - 1];
  const tr = top.userData.r;
  const nose = new THREE.Mesh(new THREE.ConeGeometry(tr * 0.99, 2.55, 56), new THREE.MeshStandardMaterial({
    color: 0xf8f6f0, roughness: 0.3, metalness: 0.06
  }));
  nose.position.y = top.userData.h + 1.27;
  nose.castShadow = true;
  top.add(nose);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.42, 24), new THREE.MeshStandardMaterial({
    color: 0xD99A00, roughness: 0.28, metalness: 0.55, emissive: 0xD99A00, emissiveIntensity: 0.12
  }));
  tip.position.y = top.userData.h + 2.6;
  tip.castShadow = true;
  top.add(tip);
  const noseRing = new THREE.Mesh(new THREE.CylinderGeometry(tr * 1.005, tr * 1.005, 0.10, 56), matDark);
  noseRing.position.y = top.userData.h + 0.03;
  top.add(noseRing);

  // subtle payload glow
  const glow = new THREE.PointLight(0x7fe4dc, 1.8, 3.2, 2);
  glow.position.set(0, top.userData.h * 0.82, 0);
  top.add(glow);

  // exhaust plume
  const plumeMat = new THREE.MeshBasicMaterial({
    color: 0xffd59a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
  });
  plume = new THREE.Mesh(new THREE.ConeGeometry(0.72, 3.4, 24, 1, true), plumeMat);
  plume.rotation.x = Math.PI;
  plume.position.y = -1.35;
  rocket.add(plume);
  engineLight = new THREE.PointLight(0xffb45e, 0, 9, 2);
  engineLight.position.set(0, -0.6, 0);
  rocket.add(engineLight);
}

function makeStage(b, i, h, r) {
  const g = new THREE.Group();
  const baseColor = new THREE.Color(0xf8f6f0).lerp(new THREE.Color(b.color), i === 0 ? 0.09 : 0.12);
  const bodyMat = new THREE.MeshStandardMaterial({ color: baseColor, roughness: 0.33, metalness: 0.08 });
  const accentMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(b.color), roughness: 0.34, metalness: 0.28,
    emissive: new THREE.Color(b.color), emissiveIntensity: 0.06
  });
  g.userData.accentMat = accentMat;
  stageMats.push(bodyMat, accentMat);

  const body = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.975, r, h, 56, 1, false), bodyMat);
  body.position.y = h / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  g.add(body);
  const edge = new THREE.LineSegments(new THREE.EdgesGeometry(body.geometry, 32), new THREE.LineBasicMaterial({ color: 0x1b2a3a, transparent: true, opacity: 0.16 }));
  edge.position.copy(body.position);
  g.add(edge);

  const ringTop = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.006, r * 1.006, 0.06, 56), accentMat);
  ringTop.position.y = h - 0.035;
  ringTop.castShadow = true;
  g.add(ringTop);

  const ringBot = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.022, r * 1.022, 0.075, 56), matDark);
  ringBot.position.y = 0.055;
  ringBot.castShadow = true;
  g.add(ringBot);

  const band = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.009, r * 1.009, Math.max(0.09, h * 0.032), 56), accentMat);
  band.position.y = h * 0.78;
  g.add(band);

  const band2 = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.006, r * 1.006, Math.max(0.045, h * 0.018), 56), new THREE.MeshStandardMaterial({
    color: 0xD99A00, roughness: 0.3, metalness: 0.6
  }));
  band2.position.y = h * 0.17;
  g.add(band2);

  // longitudinal seams
  const seamMat = new THREE.MeshBasicMaterial({ color: 0x1b2a3a, transparent: true, opacity: 0.10 });
  for (let k = 0; k < 4; k++) {
    const a = k * Math.PI / 2 + Math.PI / 4;
    const seam = new THREE.Mesh(new THREE.BoxGeometry(0.016, h * 0.86, 0.028), seamMat);
    seam.position.set(Math.cos(a) * r * 1.003, h * 0.5, Math.sin(a) * r * 1.003);
    seam.rotation.y = -a;
    g.add(seam);
  }

  // windows
  const winMat = new THREE.MeshStandardMaterial({ color: 0xc8f4ff, emissive: 0x89e6ff, emissiveIntensity: 1.4, roughness: 0.15, metalness: 0.1 });
  for (let k = 0; k < 6; k++) {
    const a = -Math.PI * 0.45 + k * 0.18;
    const win = new THREE.Mesh(new THREE.SphereGeometry(0.042, 8, 8), winMat);
    win.position.set(Math.cos(a) * r * 1.008, h * 0.63, Math.sin(a) * r * 1.008);
    g.add(win);
  }

  // engines
  const engineMat = new THREE.MeshStandardMaterial({ color: 0x2c3e50, roughness: 0.35, metalness: 0.85 });
  const n = i === 0 ? 5 : 2;
  for (let k = 0; k < n; k++) {
    const a = k / n * Math.PI * 2;
    const rr = n === 1 ? 0 : r * 0.45;
    const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.23, 0.48, 14, 1, true), engineMat);
    bell.position.set(Math.cos(a) * rr, -0.22, Math.sin(a) * rr);
    bell.castShadow = true;
    g.add(bell);
  }

  // grid fins + landing legs on the booster
  if (i === 0) {
    for (let k = 0; k < 4; k++) {
      const a = k * Math.PI / 2 + Math.PI / 4;
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.82, 0.58), matDark);
      fin.position.set(Math.cos(a) * (r + 0.16), h - 0.95, Math.sin(a) * (r + 0.16));
      fin.rotation.y = -a;
      fin.rotation.z = 0.12;
      fin.castShadow = true;
      g.add(fin);
    }
    for (let k = 0; k < 4; k++) {
      const a = k * Math.PI / 2 + Math.PI / 4;
      const foot = new THREE.Vector3(Math.cos(a) * (r + 0.92), -0.22, Math.sin(a) * (r + 0.92));
      const hip = new THREE.Vector3(Math.cos(a) * r * 0.96, 0.42, Math.sin(a) * r * 0.96);
      addBeam(g, hip, foot, 0.06, matMetal, 8, true);
      const padFoot = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.10, 0.34), matDark);
      padFoot.position.copy(foot);
      padFoot.position.y += 0.05;
      g.add(padFoot);
    }
  } else {
    // small RCS blocks on upper stages
    for (let k = 0; k < 4; k++) {
      const a = k * Math.PI / 2;
      const rcs = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.08, 0.08), matDark);
      rcs.position.set(Math.cos(a) * (r + 0.03), h - 0.28, Math.sin(a) * (r + 0.03));
      g.add(rcs);
    }
  }

  return g;
}

/* ------------------------------------------------------------------ */
/*  environment                                                        */
/* ------------------------------------------------------------------ */
function buildClouds() {
  const tex = makeCloudTexture();
  const n = MOBILE ? 14 : 30;
  for (let i = 0; i < n; i++) {
    const mat = new THREE.SpriteMaterial({
      map: tex, color: 0xffffff, transparent: true,
      opacity: 0.16 + Math.random() * 0.22,
      depthWrite: false, fog: true
    });
    const s = new THREE.Sprite(mat);
    s.position.set(
      (Math.random() - 0.5) * 300,
      -16 + Math.random() * 30,
      -40 - Math.random() * 180
    );
    const sc = 28 + Math.random() * 62;
    s.scale.set(sc, sc * 0.55, 1);
    scene.add(s);
    clouds.push({ s, speed: 0.18 + Math.random() * 0.5 });
  }

  // soft cloud deck far below
  const deckMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, depthWrite: false, fog: true });
  const deck = new THREE.Mesh(new THREE.CircleGeometry(360, 64), deckMat);
  deck.rotation.x = -Math.PI / 2;
  deck.position.y = -28;
  scene.add(deck);
}

function buildActiveGlow() {
  const tex = makeSoftTexture();
  const mat = new THREE.SpriteMaterial({
    map: tex, transparent: true, blending: THREE.AdditiveBlending,
    depthWrite: false, depthTest: true, fog: false, opacity: 0, color: 0xffffff
  });
  const s = new THREE.Sprite(mat);
  s.scale.set(8, 8, 1);
  scene.add(s);
  activeGlow = s;
}

function buildFinalSun() {
  const tex = makeRadialTexture('rgba(255,255,246,1)', 'rgba(255,214,140,0.88)', 'rgba(255,176,70,0)');
  const mat = new THREE.SpriteMaterial({
    map: tex, transparent: true, blending: THREE.AdditiveBlending,
    depthWrite: false, depthTest: true, fog: false, opacity: 0
  });
  const s = new THREE.Sprite(mat);
  s.position.set(9.2, 20, -48);
  s.scale.set(30, 30, 1);
  scene.add(s);
  finalSun = s;
  finalGlowLight = new THREE.PointLight(0xffcf8a, 0, 40, 2);
  finalGlowLight.position.set(9.2, 20, -18);
  scene.add(finalGlowLight);
}

function buildBackdrop() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 512;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
  g.addColorStop(0, 'rgba(7,38,52,0.96)');
  g.addColorStop(0.42, 'rgba(9,54,68,0.86)');
  g.addColorStop(0.72, 'rgba(11,70,84,0.34)');
  g.addColorStop(1, 'rgba(11,70,84,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 512, 512);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0, depthWrite: false, depthTest: true, fog: false });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(22, 48), mat);
  plane.position.set(6.5, 21, -16);
  plane.renderOrder = -1;
  scene.add(plane);
  finalBackdrop = plane;
}

function buildDust() {
  const count = MOBILE ? 110 : 260;
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 80;
    pos[i * 3 + 1] = -6 + Math.random() * 58;
    pos[i * 3 + 2] = -30 + Math.random() * 70;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    color: 0xffffff, size: 0.13, transparent: true, opacity: 0.48,
    depthWrite: false, sizeAttenuation: true, fog: true
  });
  dust = new THREE.Points(geo, mat);
  scene.add(dust);
}

function buildSmokePool() {
  const tex = makeSoftTexture();
  const count = MOBILE ? 44 : 96;
  for (let i = 0; i < count; i++) {
    const mat = new THREE.SpriteMaterial({
      map: tex, color: 0xffffff, transparent: true, opacity: 0,
      depthWrite: false, blending: THREE.NormalBlending
    });
    const s = new THREE.Sprite(mat);
    s.visible = false;
    scene.add(s);
    smokePool.push({ sprite: s, age: 0, life: 1, base: 1, active: false, vel: new THREE.Vector3() });
  }
}

function puff(pos, count, power = 1) {
  let made = 0;
  for (const p of smokePool) {
    if (made >= count) break;
    if (p.active) continue;
    p.active = true;
    p.age = 0;
    p.life = 1.3 + Math.random() * 1.9;
    p.base = (0.75 + Math.random() * 1.1) * (0.85 + power * 0.15);
    p.sprite.visible = true;
    p.sprite.position.set(
      pos.x + (Math.random() - 0.5) * 1.0,
      pos.y + (Math.random() - 0.5) * 0.5,
      pos.z + (Math.random() - 0.5) * 1.0
    );
    p.vel.set((Math.random() - 0.5) * 2.2, 0.5 + Math.random() * 1.2, (Math.random() - 0.5) * 2.2);
    p.sprite.scale.setScalar(p.base);
    p.sprite.material.opacity = 0.42 + Math.random() * 0.18;
    made++;
  }
}

/* ------------------------------------------------------------------ */
/*  labels                                                             */
/* ------------------------------------------------------------------ */
function buildLabels() {
  D.biz.forEach((b, i) => {
    const el = document.createElement('div');
    el.className = 'stage-label';
    el.innerHTML = `<i>0${i + 1}</i>${b.short} ${(b.share * 100).toFixed(1)}%`;
    $('#stage').appendChild(el);
    labels.push(el);
  });
}

/* ------------------------------------------------------------------ */
/*  final bars                                                         */
/* ------------------------------------------------------------------ */
function buildFinalBars() {
  const wrap = $('#scenario-bars');
  if (!wrap) return;
  const names = ['市值法 10/21', '市值法 10/19', '30 日 VWAP', '收入倍数', 'EBITDA 倍数'];
  const min = 40, max = 51;
  D.methods.forEach((m, i) => {
    const pct = m.tesla * 100;
    const w = clamp((pct - min) / (max - min) * 100, 2, 100);
    const row = document.createElement('div');
    row.className = 'scenario' + (i === 0 ? ' base' : '');
    row.innerHTML = `<span class="s-name">${names[i]}</span><span class="s-track"><i class="s-fill" style="width:${w.toFixed(2)}%"></i></span><span class="s-val">${pct.toFixed(1)}%</span>`;
    wrap.appendChild(row);
  });
}

/* ------------------------------------------------------------------ */
/*  panel / rail                                                       */
/* ------------------------------------------------------------------ */
function fmtYi(m) { return (m / 100).toLocaleString('zh-CN', { maximumFractionDigits: 0 }); }
function fmtYi1(m) { return (m / 100).toLocaleString('zh-CN', { minimumFractionDigits: 1, maximumFractionDigits: 1 }); }

function setPanel(i) {
  if (i === active) return;
  active = i;
  const panel = $('#panel');
  const b = i >= 0 && i < D.biz.length ? D.biz[i] : null;
  const accent = b ? b.color : '#0E7C7B';
  panel.style.setProperty('--accent', accent);
  $('#panel-index').textContent = b ? String(i + 1).padStart(2, '0') : '00';
  $('#panel-tag').textContent = b ? b.en : 'OVERVIEW';
  $('#mark-index').textContent = b ? String(i + 1).padStart(2, '0') : '00';
  $('#mark-name').textContent = b ? b.en : 'MERGED / PRO FORMA';
  $('#stage-mark').style.setProperty('--accent', accent);
  $('#stage-mark').classList.toggle('is-hidden', !b);
  $('#panel-name').textContent = b ? b.name : '合并后的公司';
  $('#panel-desc').textContent = b ? b.desc : '把两家公司当成一家看：六个业务、一枚火箭、一张备考报表。滚动，让每一级依次分离。';
  if (b) {
    $('#panel-rev').textContent = fmtYi(b.rev) + ' 亿';
    $('#panel-share').textContent = (b.share * 100).toFixed(1) + '%';
    $('#panel-profit').textContent = (b.profit >= 0 ? '+' : '') + fmtYi1(b.profit) + ' 亿';
    $('#panel-margin').textContent = (b.margin * 100).toFixed(1) + '%';
    $('#panel-metric').textContent = b.metric;
    $('#panel-growth').textContent = b.growth + ' Q3 YoY';
    $('#panel-profit').classList.toggle('neg', b.profit < 0);
    $('#panel-growth').style.color = b.growth.startsWith('-') ? 'var(--red)' : 'var(--accent)';
    $('#panel-bar-fill').style.width = (b.share * 100).toFixed(1) + '%';
  } else {
    $('#panel-rev').textContent = fmtYi(D.combined.rev) + ' 亿';
    $('#panel-share').textContent = '100%';
    $('#panel-profit').textContent = '+' + fmtYi1(D.combined.oi) + ' 亿';
    $('#panel-margin').textContent = (D.combined.oiMargin * 100).toFixed(1) + '%';
    $('#panel-metric').textContent = '6 个业务 / 1 枚火箭';
    $('#panel-growth').textContent = '+' + (D.combined.growth * 100).toFixed(1) + '% vs FY25';
    $('#panel-profit').classList.remove('neg');
    $('#panel-growth').style.color = 'var(--accent)';
    $('#panel-bar-fill').style.width = '100%';
  }
  panel.classList.remove('swap');
  void panel.offsetWidth;
  panel.classList.add('swap');
}

function updateRail() {
  document.querySelectorAll('.rail-item').forEach((el) => {
    const i = Number(el.dataset.i);
    let isActive = false;
    if (finalShown) isActive = i === 6;
    else if (active >= 0) isActive = i === active;
    el.classList.toggle('active', isActive);
    el.setAttribute('aria-current', isActive ? 'true' : 'false');
  });
}

function updateUI() {
  $('#top-progress').textContent = String(Math.min(separated, 6)).padStart(2, '0') + ' / 06';
  updateRail();
  $('#hint').classList.toggle('is-hidden', progress > 0.035 || finalShown);
  const markVisible = !finalShown && progress > 0.022;
  $('#stage-mark').classList.toggle('is-hidden', !markVisible);
  $('#intro').classList.toggle('hidden', progress > 0.018);
}

/* ------------------------------------------------------------------ */
/*  separation                                                         */
/* ------------------------------------------------------------------ */
function maybeSeparate() {
  for (let i = 0; i < stages.length; i++) {
    if (progress > TH[i] && !stages[i].userData.detached) separate(i);
  }
}

function separate(i) {
  const s = stages[i];
  if (!s || s.userData.detached) return;
  s.updateMatrixWorld(true);
  const wp = new THREE.Vector3();
  s.getWorldPosition(wp);
  scene.attach(s);
  s.userData.detached = true;
  const sign = i % 2 === 0 ? 1 : -1;
  const low = wp.y < 3.0;
  s.userData.park = wp.clone().add(new THREE.Vector3(
    low ? 7.8 : (7.2 - i * 1.9),
    low ? 2.0 - wp.y : -1.6 - (i % 2) * 0.35,
    0.7 * (i % 2 ? 1 : -1)
  ));
  s.userData.angVel = sign * (0.012 + 0.006 * (i % 2));
  s.userData.phase = Math.random() * Math.PI * 2;
  detached.push(s);
  separated++;
  rocketTargetY += s.userData.h * 0.42 + 0.48;
  puff(wp.clone(), MOBILE ? 10 : 18, 1.15);
  setPanel(i);
  updateRail();
}

/* ------------------------------------------------------------------ */
/*  camera / animation                                                 */
/* ------------------------------------------------------------------ */
function updateCamera(dt) {
  const p = progress;
  let focusY = 13.0;
  let dist = MOBILE ? 58 : 50;
  let angle = -0.62 + p * 1.35;
  let targetX = MOBILE ? 0 : -6.2;
  let extraY = 3.2;

  if (p >= 0.08 && !finalShown) {
    scene.updateMatrixWorld(true);
    const box = new THREE.Box3();
    stages.forEach((s) => box.expandByObject(s));
    if (!box.isEmpty()) {
      const c = box.getCenter(new THREE.Vector3());
      const sz = box.getSize(new THREE.Vector3());
      focusY = c.y;
      dist = Math.max(MOBILE ? 66 : 47, sz.y * (MOBILE ? 1.55 : 1.70) + (MOBILE ? 18 : 2));
      if (MOBILE) focusY = c.y - 5.5;
      targetX = MOBILE ? 0 : -4.2;
      angle = -0.52 + p * 1.15;
    }
  }

  if (finalShown) {
    scene.updateMatrixWorld(true);
    const box = new THREE.Box3();
    stages.forEach((s) => box.expandByObject(s));
    if (!box.isEmpty()) {
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      focusY = center.y + 0.8;
      dist = Math.max(MOBILE ? 64 : 58, size.y * (MOBILE ? 1.58 : 1.78) + 3);
      targetX = MOBILE ? 0 : -4.6;
      angle = 0.14;
      extraY = 1.0;
    }
  }

  const dx = Math.sin(angle) * dist + mouseX * (MOBILE ? 0.4 : 1.2);
  const dz = Math.cos(angle) * dist;
  const dy = focusY + extraY;
  const k = 1 - Math.exp(-dt * (REDUCED ? 8 : 2.0));
  camera.position.lerp(new THREE.Vector3(dx, dy, dz), k);
  camTarget.lerp(new THREE.Vector3(targetX, focusY, 0), k);
  camera.lookAt(camTarget);
}

function updateRocket(dt) {
  rocket.position.y += (rocketTargetY - rocket.position.y) * (1 - Math.exp(-dt * 3.0));

  if (finalShown) {
    for (const s of detached) {
      if (!s.userData.finalTarget) continue;
      s.position.lerp(s.userData.finalTarget, 1 - Math.exp(-dt * 1.7));
      s.rotation.z += (0 - s.rotation.z) * (1 - Math.exp(-dt * 2.0));
      s.rotation.y += dt * 0.03;
    }
  } else {
    for (const s of detached) {
      s.position.lerp(s.userData.park, 1 - Math.exp(-dt * 1.5));
      s.rotation.z += s.userData.angVel * dt;
      s.rotation.y += dt * 0.05;
      s.position.y += Math.sin(elapsed * 0.7 + s.userData.phase) * 0.0015;
    }
  }

  if (plume) {
    const on = ignited && !finalShown && separated === 0;
    const target = on ? 0.55 + Math.sin(elapsed * 24) * 0.10 : 0;
    plume.material.opacity += (target - plume.material.opacity) * (1 - Math.exp(-dt * 8));
    const sc = 1 + Math.sin(elapsed * 19) * 0.06;
    plume.scale.set(sc, 1, sc);
    if (engineLight) engineLight.intensity += ((on ? 9 : 0) - engineLight.intensity) * (1 - Math.exp(-dt * 8));
  }
}

function updateSmoke(dt) {
  for (const p of smokePool) {
    if (!p.active) continue;
    p.age += dt;
    const t = p.age / p.life;
    if (t >= 1) {
      p.active = false;
      p.sprite.visible = false;
      continue;
    }
    p.sprite.position.addScaledVector(p.vel, dt);
    p.vel.y += 0.35 * dt;
    p.vel.multiplyScalar(0.985);
    p.sprite.scale.setScalar(p.base * (0.8 + t * 2.6));
    p.sprite.material.opacity = Math.max(0, (1 - t) * 0.55);
  }
}

function updateClouds(dt) {
  for (const c of clouds) {
    c.s.position.x += c.speed * dt;
    if (c.s.position.x > 170) c.s.position.x = -170;
  }
  if (dust) dust.rotation.y += dt * 0.004;
}

function updateLabels() {
  if (MOBILE) return;
  for (let i = 0; i < stages.length; i++) {
    const s = stages[i];
    const el = labels[i];
    if (!el) continue;
    if (finalShown) {
      el.classList.add('final-label');
      const v = new THREE.Vector3(s.userData.r + 1.4, s.userData.h * 0.52, 0);
      s.localToWorld(v);
      v.project(camera);
      if (v.z > 1) { el.style.opacity = '0'; continue; }
      const x = (v.x * 0.5 + 0.5) * window.innerWidth;
      const y = (-v.y * 0.5 + 0.5) * window.innerHeight;
      el.style.transform = `translate(0,-50%) translate(${(x + 8).toFixed(1)}px, ${y.toFixed(1)}px)`;
      el.style.opacity = '0.92';
      continue;
    }
    el.classList.remove('final-label');
    const show = active === i && s.visible;
    if (!show) { el.style.opacity = '0'; continue; }
    const v = new THREE.Vector3(0, s.userData.h * 0.55, 0);
    s.localToWorld(v);
    v.project(camera);
    if (v.z > 1) { el.style.opacity = '0'; continue; }
    const x = (v.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-v.y * 0.5 + 0.5) * window.innerHeight;
    el.style.transform = `translate(-50%,-50%) translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
    el.style.opacity = '1';
  }
}

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  elapsed += dt;

  const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  targetProgress = resetting ? 0 : clamp(window.scrollY / max, 0, 1);
  progress += (targetProgress - progress) * (1 - Math.exp(-dt * 9));
  if (resetting) progress = 0;
  if (Math.abs(targetProgress - progress) < 0.0004) progress = targetProgress;

  if (progress > 0.028) ignited = true;
  if (ignited && !separated && Math.random() < dt * 10) {
    const base = rocket.localToWorld(new THREE.Vector3(0, 0.2, 0));
    puff(base, 1, 0.8);
  }

  if (!resetting) maybeSeparate();
  const fm = smoothstep(0.80, 0.94, progress);
  if (skyUniforms) {
    skyUniforms.top.value.lerpColors(SKY_DAY_TOP, SKY_NIGHT_TOP, fm);
    skyUniforms.bottom.value.lerpColors(SKY_DAY_BOT, SKY_NIGHT_BOT, fm);
  }
  if (scene.fog) {
    scene.fog.color.lerpColors(FOG_DAY, FOG_NIGHT, fm);
    scene.fog.density = 0.0068 - 0.0030 * fm;
  }
  if (finalSun) {
    const target = finalShown ? 0.55 : 0;
    finalSun.material.opacity += (target - finalSun.material.opacity) * (1 - Math.exp(-dt * 2.4));
    const sc = 30 + Math.sin(elapsed * 0.8) * 0.8;
    finalSun.scale.set(sc, sc, 1);
  }
  if (finalGlowLight) finalGlowLight.intensity += ((finalShown ? 24 : 0) - finalGlowLight.intensity) * (1 - Math.exp(-dt * 2.4));
  if (rimLight) rimLight.intensity = 0.95 + 0.65 * fm;
  renderer.toneMappingExposure = 1.06 + 0.04 * fm;
  document.body.classList.toggle('final-mode', finalShown);
  if (padGroup) padGroup.visible = separated === 0 && !finalShown;

  const a = separated === 0 ? -1 : Math.min(separated - 1, 5);
  setPanel(a);
  updateUI();

  const showFinal = progress > FINAL_AT;
  const hideFinal = progress < FINAL_AT - 0.035;
  if (showFinal && !finalShown) {
    finalShown = true;
    if (padGroup) padGroup.visible = false;
    let fy = 1.4;
    stages.forEach((s, i) => {
      s.userData.finalTarget = new THREE.Vector3(9.2 + (i % 2 ? 0.35 : -0.35), fy, 0);
      fy += s.userData.h + 2.1;
    });
    $('#final').classList.add('show');
    $('#final').setAttribute('aria-hidden', 'false');
    $('#panel').classList.add('is-hidden');
    $('#rail').classList.add('is-hidden');
    $('#stage-mark').classList.add('is-hidden');
    updateRail();
  } else if (hideFinal && finalShown) {
    finalShown = false;
    if (padGroup) padGroup.visible = true;
    $('#final').classList.remove('show');
  document.body.classList.remove('final-mode');
    $('#final').setAttribute('aria-hidden', 'true');
    $('#panel').classList.remove('is-hidden');
    $('#rail').classList.remove('is-hidden');
    $('#stage-mark').classList.remove('is-hidden');
    updateRail();
  }

  if (activeGlow) {
    const targetOp = (active >= 0 && !finalShown) ? 0.20 : 0;
    activeGlow.material.opacity += (targetOp - activeGlow.material.opacity) * (1 - Math.exp(-dt * 5));
    if (active >= 0 && active < stages.length) {
      const s = stages[active];
      const p = new THREE.Vector3(0, s.userData.h * 0.5, 0);
      s.localToWorld(p);
      activeGlow.position.lerp(p, 1 - Math.exp(-dt * 6));
      activeGlow.material.color.set(D.biz[active].color);
      const sc = Math.max(6.5, s.userData.h * 1.35);
      activeGlow.scale.set(sc, sc, 1);
    }
  }
  for (let i = 0; i < stages.length; i++) {
    const am = stages[i].userData.accentMat;
    if (am) am.emissiveIntensity = (i === active && !finalShown) ? 0.28 + 0.10 * Math.sin(elapsed * 3.2) : 0.06;
  }
  updateRocket(dt);
  updateSmoke(dt);
  updateClouds(dt);
  updateCamera(dt);
  updateLabels();
  if (renderer && scene && camera) renderer.render(scene, camera);
}

/* ------------------------------------------------------------------ */
/*  events                                                             */
/* ------------------------------------------------------------------ */
function bindEvents() {
  window.addEventListener('resize', onResize, { passive: true });
  window.addEventListener('pointermove', (e) => {
    mouseX = (e.clientX / window.innerWidth) * 2 - 1;
    mouseY = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });

  window.addEventListener('scroll', () => {
    // targetProgress is read in the animation loop from scrollY
  }, { passive: true });

  $('#start').addEventListener('click', () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo({ top: max * 0.18, behavior: 'smooth' });
  });

  document.querySelectorAll('.rail-item').forEach((btn) => {
    btn.addEventListener('click', () => {
      const i = Number(btn.dataset.i);
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = i === 6 ? 0.96 : clamp(TH[i] + 0.035, 0, 0.96);
      window.scrollTo({ top: max * p, behavior: 'smooth' });
    });
  });

  $('#reset').addEventListener('click', resetAll);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && finalShown) {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      window.scrollTo({ top: max * 0.84, behavior: 'smooth' });
    }
  });

  const canvas = $('#scene');
  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    showFallback();
  });
}

function onResize() {
  if (!renderer || !camera) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MOBILE ? 1.4 : 1.8));
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function resetAll() {
  resetting = true;
  progress = 0;
  targetProgress = 0;
  for (const s of detached.slice()) {
    const home = s.userData.home;
    rocket.attach(s);
    s.position.copy(home);
    s.rotation.set(0, 0, 0);
    s.scale.set(1, 1, 1);
    s.userData.detached = false;
    s.userData.finalTarget = null;
  }
  detached = [];
  separated = 0;
  active = -2;
  rocket.position.y = 0.28;
  rocketTargetY = 0.28;
  progress = 0;
  targetProgress = 0;
  finalShown = false;
  if (padGroup) padGroup.visible = true;
  ignited = false;
  if (plume) plume.material.opacity = 0;
  if (engineLight) engineLight.intensity = 0;
  smokePool.forEach((p) => { p.active = false; p.sprite.visible = false; });
  $('#final').classList.remove('show');
  document.body.classList.remove('final-mode');
  $('#final').setAttribute('aria-hidden', 'true');
  $('#panel').classList.remove('is-hidden');
  $('#rail').classList.remove('is-hidden');
  $('#stage-mark').classList.remove('is-hidden');
  setPanel(-1);
  updateUI();
  window.scrollTo({ top: 0, behavior: 'auto' });
  setTimeout(() => { resetting = false; progress = 0; targetProgress = 0; }, 600);
}

function showFallback() {
  const f = $('#fallback');
  if (f) f.hidden = false;
  const l = $('#loader');
  if (l) l.classList.add('done');
}

/* boot after all top-level constants are initialized */
if (!D) {
  showFallback();
} else {
  init();
}
