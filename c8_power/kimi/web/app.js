import * as THREE from './vendor/three.module.js';
import { APP_DATA } from './data.js';

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobileQuery = window.matchMedia('(max-width: 760px)');
let isMobile = mobileQuery.matches;
let seed = 20261022;
const rnd = () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, v) => {
  const t = clamp((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const setFont = (ctx, size, weight = 600) => {
  ctx.font = `${weight} ${size}px "Noto Sans CJK SC","PingFang SC","Microsoft YaHei",sans-serif`;
};

function makeRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.35 : 1.65));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.setClearColor(0x000000, 0);
  return renderer;
}

function addLights(scene, plasma = false) {
  scene.add(new THREE.HemisphereLight(0xf4fbff, 0x8ca4b7, 2.5));
  const key = new THREE.DirectionalLight(0xffffff, 3.3);
  key.position.set(4, -6, 11);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0x9edfff, 1.5);
  fill.position.set(-7, 4, 5);
  scene.add(fill);
  if (plasma) {
    const cyan = new THREE.PointLight(0x39e8dc, 16, 13, 2);
    cyan.position.set(0, 0, 1.5);
    scene.add(cyan);
    const warm = new THREE.PointLight(0xffbd6e, 9, 12, 2);
    warm.position.set(2, 3, 4);
    scene.add(warm);
  }
}

function makeTextSprite(lines, options = {}) {
  const fontSize = options.fontSize || 48;
  const pad = options.pad || 24;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  setFont(ctx, fontSize, 700);
  const width = Math.max(...lines.map(line => ctx.measureText(line).width));
  canvas.width = Math.ceil(width + pad * 2);
  canvas.height = Math.ceil(lines.length * fontSize * 1.35 + pad * 2);
  setFont(ctx, fontSize, 700);
  if (options.background !== false) {
    ctx.fillStyle = options.background || 'rgba(255,255,255,0.88)';
    ctx.beginPath();
    ctx.roundRect(1, 1, canvas.width - 2, canvas.height - 2, 14);
    ctx.fill();
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  lines.forEach((line, i) => {
    ctx.fillStyle = i === 0 ? (options.color || '#102a43') : (options.subColor || '#52667a');
    ctx.fillText(line, canvas.width / 2, pad + fontSize * 0.66 + i * fontSize * 1.35);
  });
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false, depthWrite: false });
  const sprite = new THREE.Sprite(material);
  const scale = options.scale || 170;
  sprite.scale.set(canvas.width / scale, canvas.height / scale, 1);
  sprite.renderOrder = 20;
  return sprite;
}

function cylinderBetween(a, b, radius, material, segments = 8) {
  const direction = new THREE.Vector3().subVectors(b, a);
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, direction.length(), segments), material);
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  return mesh;
}

const partStages = [
  { name: '整机总览', role: '用磁场约束一颗“星”，再把热变成电。', detail: '托卡马克以环形真空室为中心，磁体系统约束等离子体，包层与偏滤器处理热和粒子，低温系统保障超导磁体运行。', fact: '滚动不是播放视频：每一层的位置都由你的滚动进度实时驱动。' },
  { name: '真空室', role: '隔绝空气，维持高真空与洁净反应空间。', detail: '真空室包围等离子体，减少空气杂质进入。其器壁既要承受电磁与热负荷，也要为诊断、加热和维护留下接口。', fact: '透明剖视用于展示内部结构；真实装置并不透明，也不会在运行中拆开。' },
  { name: '环向场线圈', role: '沿环面建立强磁场，把带电粒子约束在环形轨道附近。', detail: '一组 D 形线圈环绕真空室排列。高温超导磁体可缩小装置尺寸，但同时带来低温、应力、绝缘和失超保护要求。', fact: '磁场约束不是容器壁“挡住”等离子体，而是让带电粒子沿磁力线运动。' },
  { name: '极向场与中心螺线管', role: '控制截面形状与位置，并驱动等离子体电流。', detail: '极向场线圈负责平衡与塑形，中心螺线管通过电磁感应驱动电流。两者与环向场共同决定等离子体的稳定与性能。', fact: '磁体是工程瓶颈之一：强场、低温和机械应力必须同时满足。' },
  { name: '包层', role: '承受中子与热负荷，换热；在 D-T 路线中承担氚增殖功能。', detail: '包层位于真空室内侧，是将聚变能转化为可用热的重要界面。材料需要面对中子辐照、热循环、冷却和定期维护。', fact: '“聚变能产生”与“热能可连续取出并发电”之间，隔着包层与热交换系统。' },
  { name: '偏滤器', role: '导出热流、氦灰和杂质，保护真空室与等离子体。', detail: '偏滤器把部分粒子与热引导到专门靶板，是装置排热和粒子控制的关键。高热负荷材料与可维护性直接影响可用率。', fact: '商业电站不仅要点火，还要在反复热循环中可靠运行。' },
  { name: '低温恒温器', role: '保持超导磁体所需的低温环境，减少外部热侵入。', detail: '低温恒温器是大型隔热边界，配合真空、冷屏和低温系统保护超导磁体。它在拆解图中位于最外层。', fact: '高温等离子体与低温超导磁体共存于同一装置，是聚变工程的鲜明特征。' },
  { name: '等离子体', role: '被磁场约束的带电粒子，是聚变反应发生的地方。', detail: '氘和氚在极高温度下克服静电排斥并发生聚变，释放中子和带电粒子。光带只是可视化示意，不代表真实等离子体形状或温度。', fact: '实验中的 Q 值、净设施增益与商业电站的持续净上网电力不是同一指标。' }
];

let reactor = null;
let reactorProgress = 0;
let reactorTarget = 0;
let reactorStage = -1;
let reactorVisible = true;
const pointer = { x: 0, y: 0 };

function initReactor() {
  const canvas = document.getElementById('reactor-canvas');
  try {
    const renderer = makeRenderer(canvas);
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0xeaf4fa, 0.013);
    addLights(scene, true);
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 140);
    camera.up.set(0, 0, 1);
    const root = new THREE.Group();
    scene.add(root);
    const groups = {};
    ['cryostat', 'vacuum', 'tf', 'pf', 'blanket', 'divertor', 'solenoid', 'plasma'].forEach(name => {
      groups[name] = new THREE.Group();
      root.add(groups[name]);
    });

    const cryostatMat = new THREE.MeshPhysicalMaterial({ color: 0xb7cfdf, metalness: 0.8, roughness: 0.24, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false });
    const cryostat = new THREE.Mesh(new THREE.TorusGeometry(3, 1.38, 24, 100, Math.PI * 1.45), cryostatMat);
    cryostat.rotation.z = -0.3;
    groups.cryostat.add(cryostat);
    const cryostatWire = new THREE.Mesh(new THREE.TorusGeometry(3, 1.39, 15, 60, Math.PI * 1.45), new THREE.MeshBasicMaterial({ color: 0x7f9eb4, wireframe: true, transparent: true, opacity: 0.055, depthWrite: false }));
    cryostatWire.rotation.z = -0.3;
    groups.cryostat.add(cryostatWire);

    const vesselMat = new THREE.MeshPhysicalMaterial({ color: 0xd2e2eb, metalness: 0.82, roughness: 0.2, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false });
    const vessel = new THREE.Mesh(new THREE.TorusGeometry(3, 1.04, 26, 110, Math.PI * 1.58), vesselMat);
    vessel.rotation.z = -0.28;
    groups.vacuum.add(vessel);
    const vesselInner = new THREE.Mesh(new THREE.TorusGeometry(3, 0.96, 18, 90, Math.PI * 1.58), new THREE.MeshBasicMaterial({ color: 0x83a9c1, wireframe: true, transparent: true, opacity: 0.08, depthWrite: false }));
    vesselInner.rotation.z = -0.28;
    groups.vacuum.add(vesselInner);

    const tfMat = new THREE.MeshStandardMaterial({ color: 0xd8a03b, metalness: 0.82, roughness: 0.24, emissive: 0x3a2300, emissiveIntensity: 0.08 });
    const tfMeshes = [];
    const coilCount = isMobile ? 14 : 18;
    for (let i = 0; i < coilCount; i++) {
      const angle = (i / coilCount) * Math.PI * 2;
      const profile = [
        [1.45, -1.35], [1.22, -0.75], [1.22, 0.72], [1.52, 1.42],
        [2.65, 1.72], [3.88, 1.35], [4.35, 0.62], [4.42, 0],
        [4.35, -0.62], [3.88, -1.35], [2.65, -1.72], [1.45, -1.35]
      ];
      const points = profile.map(([r, z]) => new THREE.Vector3(r * Math.cos(angle), r * Math.sin(angle), z));
      const curve = new THREE.CatmullRomCurve3(points, true, 'catmullrom', 0.18);
      const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, isMobile ? 38 : 58, 0.075, 6, true), tfMat);
      mesh.userData.angle = angle;
      groups.tf.add(mesh);
      tfMeshes.push(mesh);
    }

    const pfMat = new THREE.MeshStandardMaterial({ color: 0x477bd5, metalness: 0.75, roughness: 0.25, emissive: 0x071b4c, emissiveIntensity: 0.12 });
    const pfMeshes = [];
    [[1.95, 1.42], [3.85, 1.35], [1.95, -1.42], [3.85, -1.35]].forEach(([radius, z]) => {
      const mesh = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.065, 8, 80), pfMat);
      mesh.position.z = z;
      mesh.userData.baseZ = z;
      groups.pf.add(mesh);
      pfMeshes.push(mesh);
    });

    const solenoidMatA = new THREE.MeshStandardMaterial({ color: 0x214d68, metalness: 0.85, roughness: 0.22 });
    const solenoidMatB = new THREE.MeshStandardMaterial({ color: 0x39b8ae, metalness: 0.65, roughness: 0.25, emissive: 0x063b37, emissiveIntensity: 0.15 });
    for (let i = 0; i < 9; i++) {
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.58, 0.4, 28), i % 2 ? solenoidMatA : solenoidMatB);
      mesh.rotation.x = Math.PI / 2;
      mesh.position.z = -1.6 + i * 0.4;
      groups.solenoid.add(mesh);
    }

    const blanketMat = new THREE.MeshStandardMaterial({ color: 0x3baea6, metalness: 0.58, roughness: 0.34, emissive: 0x052d2a, emissiveIntensity: 0.1 });
    const blanketMeshes = [];
    const blanketCount = isMobile ? 22 : 30;
    for (let i = 0; i < blanketCount; i++) {
      const angle = (i / blanketCount) * Math.PI * 2;
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.52, 1.18), blanketMat);
      mesh.position.set(3 * Math.cos(angle), 3 * Math.sin(angle), 0);
      mesh.rotation.z = angle;
      mesh.userData.angle = angle;
      groups.blanket.add(mesh);
      blanketMeshes.push(mesh);
    }

    const divertorMat = new THREE.MeshStandardMaterial({ color: 0xd96a4e, metalness: 0.7, roughness: 0.28, emissive: 0x3c0d04, emissiveIntensity: 0.12 });
    [-1.02, -1.25].forEach(z => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(3, 0.16, 10, 90), divertorMat);
      ring.position.z = z;
      groups.divertor.add(ring);
    });

    const plasmaMaterials = [
      new THREE.MeshBasicMaterial({ color: 0x4df4e4, transparent: true, opacity: 0.48, blending: THREE.AdditiveBlending, depthWrite: false }),
      new THREE.MeshBasicMaterial({ color: 0xff75c8, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, wireframe: true }),
      new THREE.MeshBasicMaterial({ color: 0xf7ffff, transparent: true, opacity: 0.62, blending: THREE.AdditiveBlending, depthWrite: false })
    ];
    const plasmaMeshes = [
      new THREE.Mesh(new THREE.TorusGeometry(3, 0.42, 22, 120), plasmaMaterials[0]),
      new THREE.Mesh(new THREE.TorusGeometry(3, 0.48, 14, 90), plasmaMaterials[1]),
      new THREE.Mesh(new THREE.TorusGeometry(3.03, 0.045, 8, 120), plasmaMaterials[2])
    ];
    plasmaMeshes.forEach(mesh => groups.plasma.add(mesh));

    const floorMat = new THREE.MeshBasicMaterial({ color: 0xd9e9f2, transparent: true, opacity: 0.36, side: THREE.DoubleSide, depthWrite: false });
    const floor = new THREE.Mesh(new THREE.CircleGeometry(8.5, 72), floorMat);
    floor.position.z = -2.35;
    scene.add(floor);
    const grid = new THREE.GridHelper(22, 28, 0xa8c5d5, 0xc9dce7);
    grid.rotation.x = Math.PI / 2;
    grid.position.z = -2.33;
    grid.material.transparent = true;
    grid.material.opacity = 0.32;
    scene.add(grid);

    const dustCount = isMobile ? 70 : 150;
    const positions = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount; i++) {
      const angle = rnd() * Math.PI * 2;
      const radius = 6 + rnd() * 7;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = Math.sin(angle) * radius;
      positions[i * 3 + 2] = -1 + rnd() * 8;
    }
    const dustGeometry = new THREE.BufferGeometry();
    dustGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const dust = new THREE.Points(dustGeometry, new THREE.PointsMaterial({ color: 0x6fb9c2, size: 0.035, transparent: true, opacity: 0.32, depthWrite: false }));
    scene.add(dust);

    reactor = { renderer, scene, camera, root, groups, vesselMat, cryostatMat, tfMeshes, pfMeshes, blanketMeshes, plasmaMaterials, plasmaMeshes, dust };
    resizeReactor();
    return reactor;
  } catch (error) {
    console.warn('WebGL reactor fallback:', error.message);
    canvas.hidden = true;
    document.getElementById('reactor-fallback').hidden = false;
    return null;
  }
}

function resizeReactor() {
  if (!reactor) return;
  const canvas = document.getElementById('reactor-canvas');
  const width = canvas.clientWidth || window.innerWidth;
  const height = canvas.clientHeight || window.innerHeight;
  reactor.renderer.setSize(width, height, false);
  reactor.camera.aspect = width / Math.max(height, 1);
  reactor.camera.updateProjectionMatrix();
}

function updatePartPanel(index) {
  if (index === reactorStage) return;
  reactorStage = index;
  const part = partStages[index];
  document.getElementById('part-kicker').textContent = `COMPONENT ${String(index + 1).padStart(2, '0')} / 08`;
  document.getElementById('part-title').textContent = part.name;
  document.getElementById('part-role').textContent = part.role;
  document.getElementById('part-detail').textContent = part.detail;
  document.getElementById('part-fact').textContent = part.fact;
  document.querySelectorAll('.stage-button').forEach((button, i) => button.setAttribute('aria-selected', String(i === index)));
}

function buildStageNav() {
  const nav = document.getElementById('stage-nav');
  partStages.forEach((part, index) => {
    const button = document.createElement('button');
    button.className = 'stage-button';
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-selected', 'false');
    button.innerHTML = `<span>${String(index + 1).padStart(2, '0')}</span><b>${part.name}</b>`;
    button.addEventListener('click', () => scrollToStage(index));
    nav.appendChild(button);
  });
  document.querySelectorAll('a[href="#stage-01"]').forEach(link => link.addEventListener('click', event => {
    event.preventDefault();
    scrollToStage(1);
  }));
}

function scrollToStage(index) {
  const section = document.getElementById('reactor-scroll');
  const top = section.getBoundingClientRect().top + window.scrollY;
  const available = section.offsetHeight - window.innerHeight;
  const progress = index === 0 ? 0 : Math.min(0.995, (index + 0.12) / partStages.length);
  window.scrollTo({ top: top + available * progress, behavior: reducedMotion ? 'auto' : 'smooth' });
}

function updateReactor(time) {
  if (!reactor) return;
  const p = reactorProgress;
  const r = reactor;
  const introShift = smooth(0.04, 0.16, p);
  if (isMobile) {
    r.root.position.x = 0;
    r.root.position.z = lerp(-1.4, 0.65, introShift);
  } else {
    r.root.position.x = lerp(2.65, -1.75, introShift);
    r.root.position.z = 0;
  }
  r.root.rotation.z = reducedMotion ? 0 : Math.sin(time * 0.12) * 0.055;
  r.groups.cryostat.position.x = 5.1 * smooth(0.08, 0.34, p);
  r.groups.cryostat.rotation.y = 0.25 * smooth(0.08, 0.34, p);
  r.groups.vacuum.position.x = -3.7 * smooth(0.14, 0.42, p);
  r.vesselMat.opacity = lerp(0.3, 0.18, smooth(0.14, 0.42, p));
  r.cryostatMat.opacity = lerp(0.16, 0.1, p);
  r.tfMeshes.forEach(mesh => {
    const amount = 1.75 * smooth(0.26, 0.55, p);
    const angle = mesh.userData.angle;
    mesh.position.set(Math.cos(angle) * amount, Math.sin(angle) * amount, 0);
  });
  r.pfMeshes.forEach(mesh => {
    mesh.position.z = mesh.userData.baseZ + Math.sign(mesh.userData.baseZ) * 2.1 * smooth(0.34, 0.62, p);
  });
  r.groups.solenoid.position.z = 3.5 * smooth(0.4, 0.68, p);
  r.blanketMeshes.forEach(mesh => {
    const amount = 2.5 * smooth(0.47, 0.76, p);
    const angle = mesh.userData.angle;
    mesh.position.set((3 + amount) * Math.cos(angle), (3 + amount) * Math.sin(angle), 0);
  });
  r.groups.divertor.position.z = -3.3 * smooth(0.57, 0.82, p);
  const plasmaScale = 1 + 0.13 * smooth(0.82, 1, p);
  r.groups.plasma.scale.setScalar(plasmaScale);
  if (!reducedMotion) {
    r.plasmaMeshes[2].rotation.z = time * 0.22;
    r.plasmaMaterials[0].opacity = 0.44 + Math.sin(time * 2.1) * 0.07;
    r.dust.rotation.z = time * 0.008;
  }
  const orbit = -0.93 + p * 1.12 + pointer.x * 0.07;
  const radius = (isMobile ? 17.5 : 14.8) + p * 3.2;
  r.camera.position.set(Math.cos(orbit) * radius, Math.sin(orbit) * radius, (isMobile ? 8.8 : 7.4) + p * 1.7 + pointer.y * 0.35);
  r.camera.lookAt(r.root.position.x * 0.3, 0, isMobile ? 0.2 : 0.35);
  r.renderer.render(r.scene, r.camera);
}

let energy = null;
let energyVisible = false;
let selectedEnergy = 'all';

function makeSourceIcon(item) {
  const group = new THREE.Group();
  const color = new THREE.Color(item.color);
  const mat = new THREE.MeshStandardMaterial({ color, metalness: 0.55, roughness: 0.32, emissive: color.clone().multiplyScalar(0.12), emissiveIntensity: 0.35 });
  if (item.id === 'coal') {
    [[-0.42, 0, 0], [0.35, 0.1, 0.05], [0, 0, 0.58]].forEach(([x, y, z], i) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.65, 0.65), mat);
      mesh.position.set(x, y, z);
      mesh.rotation.z = i * 0.25;
      group.add(mesh);
    });
  } else if (item.id === 'gas') {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.52, 1.25, 20), mat);
    cone.rotation.x = Math.PI / 2;
    cone.position.z = 0.2;
    group.add(cone);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.68, 0.06, 8, 36), mat);
    ring.position.z = -0.4;
    group.add(ring);
  } else if (item.id === 'renewables') {
    const panel = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.1, 0.72), mat);
    panel.rotation.x = -0.35;
    group.add(panel);
    const mast = cylinderBetween(new THREE.Vector3(0.7, 0, -0.6), new THREE.Vector3(0.7, 0, 0.8), 0.045, mat);
    group.add(mast);
    for (let i = 0; i < 3; i++) {
      const a = i * Math.PI * 2 / 3;
      const blade = cylinderBetween(new THREE.Vector3(0.7, 0, 0.8), new THREE.Vector3(0.7 + Math.cos(a) * 0.65, 0, 0.8 + Math.sin(a) * 0.65), 0.04, mat);
      group.add(blade);
    }
  } else if (item.id === 'nuclear' || item.id === 'fusion') {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.64, 0.09, 10, 48), mat);
    ring.rotation.x = 0.5;
    group.add(ring);
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), mat);
    group.add(core);
    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.64, 0.035, 8, 48), mat);
    ring2.rotation.y = 1.1;
    group.add(ring2);
  } else {
    group.add(new THREE.Mesh(new THREE.DodecahedronGeometry(0.66, 0), mat));
  }
  const base = new THREE.Mesh(new THREE.TorusGeometry(0.88, 0.025, 6, 48), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.45 }));
  base.position.z = -0.82;
  group.add(base);
  return group;
}

function initEnergy() {
  const canvas = document.getElementById('energy-canvas');
  try {
    const renderer = makeRenderer(canvas);
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0xeaf5fa, 0.015);
    addLights(scene, false);
    const camera = new THREE.PerspectiveCamera(isMobile ? 44 : 39, 1, 0.1, 120);
    camera.up.set(0, 0, 1);
    const root = new THREE.Group();
    root.scale.x = isMobile ? 0.55 : 1;
    root.position.x = isMobile ? 0 : 0.8;
    scene.add(root);
    const flows = [];
    const zPositions = [4.4, 2.65, 0.9, -0.9, -2.65, -4.4];
    APP_DATA.energy.forEach((item, index) => {
      const z = zPositions[index];
      const start = new THREE.Vector3(-5.6, 0, z);
      const grid = new THREE.Vector3(-0.65, 0, 0);
      const gridOut = new THREE.Vector3(0.65, 0, 0);
      const end = new THREE.Vector3(5.25, 0, 0);
      const curveA = new THREE.CubicBezierCurve3(start, new THREE.Vector3(-4.2, 0, z), new THREE.Vector3(-2.1, 0, 0), grid);
      const curveB = new THREE.CubicBezierCurve3(gridOut, new THREE.Vector3(2.1, 0, z * 0.25), new THREE.Vector3(3.7, 0, z * 0.16), end);
      const flowGroup = new THREE.Group();
      root.add(flowGroup);
      const material = new THREE.MeshBasicMaterial({ color: item.color, transparent: true, opacity: item.id === 'fusion' ? 0.16 : 0.38, depthWrite: false });
      let lineMaterial = null;
      if (item.id === 'fusion') {
        const points = [...curveA.getPoints(40), ...curveB.getPoints(40)];
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        lineMaterial = new THREE.LineDashedMaterial({ color: item.color, transparent: true, opacity: 0.35, dashSize: 0.24, gapSize: 0.18 });
        const line = new THREE.Line(geometry, lineMaterial);
        line.computeLineDistances();
        flowGroup.add(line);
      } else {
        const radius = 0.018 + item.share * 0.12;
        flowGroup.add(new THREE.Mesh(new THREE.TubeGeometry(curveA, 48, radius, 5, false), material));
        flowGroup.add(new THREE.Mesh(new THREE.TubeGeometry(curveB, 48, radius, 5, false), material));
      }
      const icon = makeSourceIcon(item);
      icon.position.copy(start);
      flowGroup.add(icon);
      const label = makeTextSprite([item.name, `${Math.round(item.share * 100)}% · ${item.twh.toFixed(1)} TWh`], { fontSize: 42, scale: isMobile ? 215 : 175 });
      label.position.set(start.x, start.y, start.z - 1.15);
      flowGroup.add(label);
      const pulses = [];
      if (item.id !== 'fusion') {
        const count = Math.max(3, Math.round(3 + item.share * 20));
        for (let i = 0; i < count; i++) {
          const pulse = new THREE.Mesh(new THREE.SphereGeometry(0.065 + item.share * 0.06, 8, 6), new THREE.MeshBasicMaterial({ color: item.color, transparent: true, opacity: 0.92, depthWrite: false }));
          pulse.userData.offset = i / count + rnd() * 0.05;
          flowGroup.add(pulse);
          pulses.push(pulse);
        }
      }
      flows.push({ item, flowGroup, curveA, curveB, material, lineMaterial, pulses, icon, label });
    });

    const gridMat = new THREE.MeshStandardMaterial({ color: 0x5a788f, metalness: 0.82, roughness: 0.3 });
    const gridGroup = new THREE.Group();
    gridGroup.add(cylinderBetween(new THREE.Vector3(0, 0, -1.4), new THREE.Vector3(0, 0, 1.25), 0.07, gridMat));
    [-0.6, 0.2, 0.85].forEach(z => {
      gridGroup.add(cylinderBetween(new THREE.Vector3(-0.8, 0, z), new THREE.Vector3(0.8, 0, z), 0.045, gridMat));
    });
    const gridRing = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.035, 8, 56), new THREE.MeshBasicMaterial({ color: 0x12a99a, transparent: true, opacity: 0.42 }));
    gridGroup.add(gridRing);
    const gridLabel = makeTextSprite(['区域电网', '输送 · 平衡'], { fontSize: 44, scale: 175 });
    gridLabel.position.set(0, 0, -2.05);
    gridGroup.add(gridLabel);
    root.add(gridGroup);

    const dc = new THREE.Group();
    const buildingMat = new THREE.MeshPhysicalMaterial({ color: 0xbdd9e9, metalness: 0.55, roughness: 0.25, transparent: true, opacity: 0.88 });
    const building = new THREE.Mesh(new THREE.BoxGeometry(2.15, 1.5, 2.35), buildingMat);
    building.position.z = 0.1;
    dc.add(building);
    const rackMat = new THREE.MeshStandardMaterial({ color: 0x163e5a, metalness: 0.65, roughness: 0.3, emissive: 0x0c847b, emissiveIntensity: 0.28 });
    for (let x = -0.7; x <= 0.7; x += 0.47) {
      for (let z = -0.65; z <= 0.8; z += 0.48) {
        const rack = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.18, 0.32), rackMat);
        rack.position.set(x, -0.82, z);
        dc.add(rack);
      }
    }
    const roof = new THREE.Mesh(new THREE.BoxGeometry(2.35, 1.68, 0.12), new THREE.MeshStandardMaterial({ color: 0x3e6fd9, metalness: 0.65, roughness: 0.25 }));
    roof.position.z = 1.32;
    dc.add(roof);
    const dcLight = new THREE.PointLight(0x3df5df, 12, 8, 2);
    dcLight.position.set(0, -1, 1.4);
    dc.add(dcLight);
    const dcLabel = makeTextSprite(['数据中心', '415 TWh / 年'], { fontSize: 46, scale: 175 });
    dcLabel.position.set(0, 0, 2.25);
    dc.add(dcLabel);
    dc.position.x = 6;
    root.add(dc);

    const floor = new THREE.Mesh(new THREE.CircleGeometry(12, 80), new THREE.MeshBasicMaterial({ color: 0xd9eaf3, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false }));
    floor.position.z = -5.6;
    scene.add(floor);
    energy = { renderer, scene, camera, root, flows, gridRing, dc };
    resizeEnergy();
    return energy;
  } catch (error) {
    console.warn('WebGL energy fallback:', error.message);
    canvas.hidden = true;
    return null;
  }
}

function resizeEnergy() {
  if (!energy) return;
  const canvas = document.getElementById('energy-canvas');
  const width = canvas.clientWidth || window.innerWidth;
  const height = canvas.clientHeight || window.innerHeight;
  energy.renderer.setSize(width, height, false);
  energy.camera.aspect = width / Math.max(height, 1);
  energy.root.scale.x = isMobile ? 0.55 : 1;
  energy.root.position.x = isMobile ? 0 : 0.8;
  energy.camera.updateProjectionMatrix();
}

function updateEnergy(time) {
  if (!energy) return;
  energy.flows.forEach(flow => {
    const active = selectedEnergy === 'all' || selectedEnergy === flow.item.id;
    if (flow.material) flow.material.opacity = active ? (selectedEnergy === 'all' ? 0.38 : 0.82) : 0.045;
    if (flow.lineMaterial) flow.lineMaterial.opacity = active ? 0.35 : 0.05;
    flow.pulses.forEach(pulse => {
      pulse.visible = active;
      if (!reducedMotion && active) {
        const t = (time * (0.08 + flow.item.share * 0.1) + pulse.userData.offset) % 1;
        const point = t < 0.5 ? flow.curveA.getPoint(t * 2) : flow.curveB.getPoint((t - 0.5) * 2);
        pulse.position.copy(point);
      } else {
        const t = pulse.userData.offset % 1;
        const point = t < 0.5 ? flow.curveA.getPoint(t * 2) : flow.curveB.getPoint((t - 0.5) * 2);
        pulse.position.copy(point);
      }
    });
    const targetScale = active && selectedEnergy !== 'all' ? 1.18 : 1;
    flow.icon.scale.setScalar(lerp(flow.icon.scale.x, targetScale, 0.08));
  });
  if (!reducedMotion) {
    energy.gridRing.rotation.z = time * 0.16;
    energy.dc.position.z = Math.sin(time * 0.7) * 0.04;
  }
  const radius = isMobile ? 22 : 18;
  energy.camera.position.set(pointer.x * 0.35, -radius, (isMobile ? 9.8 : 8.4) + pointer.y * 0.25);
  energy.camera.lookAt(0.4, 0, -0.15);
  energy.renderer.render(energy.scene, energy.camera);
}

function updateEnergyDetail() {
  const detail = document.getElementById('energy-detail');
  const item = APP_DATA.energy.find(entry => entry.id === selectedEnergy);
  if (!item) {
    detail.innerHTML = `<h3>全部电源</h3><strong class="energy-big">415 TWh</strong><p>多种电源先汇入区域电网，再由电网完成实时供需平衡。选择任一来源可单独查看。</p><cite>IEA《Energy and AI》 · 2025-04-10</cite>`;
  } else {
    detail.innerHTML = `<h3>${item.name}</h3><strong class="energy-big">${Math.round(item.share * 100)}% · ${item.twh.toFixed(1)} TWh</strong><p>${item.note}。数值为 415 TWh 与份额的乘积，保留一位小数。</p><cite>${item.source} · ${item.date}</cite>`;
  }
  document.querySelectorAll('.energy-filter').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.id === selectedEnergy)));
}

function buildEnergyControls() {
  const controls = document.getElementById('energy-controls');
  const legend = document.getElementById('energy-legend');
  const all = document.createElement('button');
  all.className = 'energy-filter';
  all.dataset.id = 'all';
  all.textContent = '全部电源';
  all.setAttribute('aria-pressed', 'true');
  all.addEventListener('click', () => { selectedEnergy = 'all'; updateEnergyDetail(); });
  controls.appendChild(all);
  APP_DATA.energy.forEach(item => {
    const button = document.createElement('button');
    button.className = 'energy-filter';
    button.dataset.id = item.id;
    button.textContent = item.name;
    button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', () => { selectedEnergy = item.id; updateEnergyDetail(); });
    controls.appendChild(button);
    const card = document.createElement('button');
    card.className = 'energy-card';
    card.style.setProperty('--energy-color', item.color);
    card.setAttribute('aria-label', `${item.name}，${Math.round(item.share * 100)}%，${item.twh.toFixed(1)} TWh`);
    card.innerHTML = `<strong>${Math.round(item.share * 100)}% · ${item.twh.toFixed(1)}</strong><span>${item.name} / TWh</span><small>${item.date}</small>`;
    card.addEventListener('click', () => { selectedEnergy = item.id; updateEnergyDetail(); });
    legend.appendChild(card);
  });
  updateEnergyDetail();
}

function buildDataCards() {
  const cards = [
    { value: `${APP_DATA.global.current2025} TWh`, label: '2025 全球数据中心用电', source: `${APP_DATA.global.source2026} · ${APP_DATA.global.date2026}` },
    { value: `${APP_DATA.global.forecast2030} TWh`, label: '2030 中央预测', source: `${APP_DATA.global.source2026} · ${APP_DATA.global.date2026}` },
    { value: `${(APP_DATA.global.cagr * 100).toFixed(1)}%`, label: '2025—2030 复合增速', source: 'Excel 公式计算 · 2026-10-22' },
    { value: `${APP_DATA.meta.dc2024TWh.toFixed(2)} TWh`, label: 'Meta 2024 数据中心用电', source: `${APP_DATA.meta.source} · ${APP_DATA.meta.date}` }
  ];
  document.getElementById('global-cards').innerHTML = cards.map(card => `<article class="global-card"><strong>${card.value}</strong><span>${card.label}</span><small>${card.source}</small></article>`).join('');
  const colors = ['#12a99a', '#3e6fd9', '#d99a22', '#e66a4e'];
  document.getElementById('capex-bars').innerHTML = APP_DATA.capex.map((item, index) => `<div class="capex-row"><label>${item.name}</label><div class="capex-track"><span class="capex-fill" data-value="${item.value}" style="--bar-color:${colors[index]}"></span></div><strong>${item.value.toFixed(2)}<span class="capex-note">${item.date}</span></strong></div>`).join('');
}

function updateScroll() {
  const section = document.getElementById('reactor-scroll');
  const rect = section.getBoundingClientRect();
  const available = Math.max(section.offsetHeight - window.innerHeight, 1);
  reactorTarget = clamp(-rect.top / available);
  const pageMax = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
  document.getElementById('page-progress-bar').style.width = `${clamp(window.scrollY / pageMax) * 100}%`;
  const intro = 1 - smooth(0.025, 0.105, reactorTarget);
  const stage = smooth(0.065, 0.145, reactorTarget);
  document.documentElement.style.setProperty('--intro-opacity', intro.toFixed(3));
  document.documentElement.style.setProperty('--stage-opacity', stage.toFixed(3));
  document.getElementById('intro-overlay').style.visibility = intro < 0.02 ? 'hidden' : 'visible';
  document.getElementById('explosion-bar').style.width = `${reactorTarget * 100}%`;
  const stageIndex = Math.min(partStages.length - 1, Math.floor(reactorTarget * partStages.length));
  updatePartPanel(stageIndex);
  const cue = document.getElementById('scroll-cue');
  if (reactorTarget > 0.985) cue.innerHTML = '<b>继续向下 · 进入电力流向 →</b>';
  else if (reactorTarget > 0.08) cue.innerHTML = `<b>${partStages[stageIndex].name} · 继续滚动</b>`;
  else cue.innerHTML = '<span class="mouse-icon" aria-hidden="true"></span><b>滚动以逐层拆解</b>';
}

function setupObservers() {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.target.id === 'reactor-scroll') reactorVisible = entry.isIntersecting;
      if (entry.target.id === 'energy') energyVisible = entry.isIntersecting;
      if (entry.target.id === 'capex-bars' && entry.isIntersecting) {
        entry.target.querySelectorAll('.capex-fill').forEach(bar => { bar.style.width = `${Number(bar.dataset.value)}%`; });
      }
    });
  }, { threshold: 0.01 });
  ['reactor-scroll', 'energy', 'capex-bars'].forEach(id => observer.observe(document.getElementById(id)));
}

let lastFrame = 0;
function tick(ms) {
  requestAnimationFrame(tick);
  if (document.hidden) return;
  if (isMobile && ms - lastFrame < 32) return;
  lastFrame = ms;
  const time = ms * 0.001;
  reactorProgress = reducedMotion ? reactorTarget : lerp(reactorProgress, reactorTarget, 0.085);
  if (reactorVisible) updateReactor(time);
  if (energyVisible) updateEnergy(time);
}

buildStageNav();
buildEnergyControls();
buildDataCards();
reactor = initReactor();
energy = initEnergy();
setupObservers();
updateScroll();
window.addEventListener('scroll', updateScroll, { passive: true });
window.addEventListener('resize', () => {
  isMobile = mobileQuery.matches;
  resizeReactor();
  resizeEnergy();
  updateScroll();
}, { passive: true });
window.addEventListener('pointermove', event => {
  pointer.x = (event.clientX / Math.max(window.innerWidth, 1) - 0.5) * 2;
  pointer.y = (event.clientY / Math.max(window.innerHeight, 1) - 0.5) * 2;
}, { passive: true });
mobileQuery.addEventListener('change', () => {
  isMobile = mobileQuery.matches;
  resizeReactor();
  resizeEnergy();
});
requestAnimationFrame(tick);
