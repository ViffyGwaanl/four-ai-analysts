import * as THREE from './vendor/three.module.min.js';

const data = window.MEMFAB_DATA;
const quarters = data?.quarters ?? [];
const $ = (id) => document.getElementById(id);
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const money = (value) => Number(value).toLocaleString('zh-CN', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
const quantity = (value) => Number(value).toLocaleString('zh-CN', { maximumFractionDigits: 3 });
const percent = (value, digits = 1) => `${(value * 100).toFixed(digits)}%`;
const mobile = matchMedia('(max-width: 900px)').matches;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const maxCash = Math.max(...quarters.map((q) => q.cash));
const maxDebt = Math.max(...quarters.map((q) => q.debt + q.emergencyDebt));
const maxHbm = Math.max(...quarters.map((q) => q.hbmProduced));
const phaseNames = ['下行防御', '下行防御', '下行防御', '筑底与HBM导入', '筑底与HBM导入', '筑底与HBM导入', '扩产与扭亏', '扩产与扭亏', '扩产与扭亏', '扩产与扭亏', '产能释放', '产能释放', '产能释放', '高景气收获', '高景气收获', '高景气收获'];
const quarterTags = ['去库与研发启动', '价格跌破成本', '完成资格投入', '修正供给不足', '经营现金流转正', 'HBM开始量产', '实现季度扭亏', '提高HBM占比', 'HBM盈利弹性', 'HBM收入过半', '首批扩产投产', '最后扩张与还款', '普通债务清零', '满产全售', '订单精准匹配', '零债务收官'];

let renderer;
let scene;
let camera;
let currentQuarter = 1;
let playing = false;
let playAccumulator = 0;
let labelsVisible = true;
let activeView = 'overview';
let lastTime = 0;
let elapsed = 0;
let cleanMachines = [];
let standardWafers = [];
let hbmPackets = [];
let hbmStacks = [];
let capacityPods = [];
let rndPillars = [];
let inventoryMesh;
let cashMesh;
let debtGauge;
let crane;
let dust;
let boardTexture;
let boardCanvas;
let boardContext;
let labels = {};
let rayTargets = [];
let zoneGroups = {};
let currentData = quarters[0];
let cameraDesired;
let cameraCurrent;
let pointerPositions = new Map();
let dragDistance = 0;
let lastPinchDistance = 0;
let pointerClient = { x: 0, y: 0 };

const raycaster = new THREE.Raycaster();
const pointerNdc = new THREE.Vector2();
const viewPresets = {
  overview: { target: [0, 2.7, 0], radius: mobile ? 55 : 47, theta: 0.72, phi: 1.02 },
  cleanroom: { target: [-6, 2.7, 1], radius: 25, theta: 0.55, phi: 1.0 },
  hbm: { target: [8, 2.8, 0], radius: 23, theta: 0.78, phi: 1.0 },
  boardroom: { target: [7, 6.2, -8.5], radius: 22, theta: 0.45, phi: 0.93 },
  vault: { target: [9, 2.3, 8.5], radius: 22, theta: 0.82, phi: 1.0 },
};

function mat(color, options = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.62, metalness: 0.08, ...options });
}

function box(parent, size, position, material, options = {}) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position);
  mesh.castShadow = options.cast ?? true;
  mesh.receiveShadow = options.receive ?? true;
  if (options.rotation) mesh.rotation.set(...options.rotation);
  parent.add(mesh);
  return mesh;
}

function cylinder(parent, radiusTop, radiusBottom, height, segments, position, material, rotation) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments), material);
  mesh.position.set(...position);
  if (rotation) mesh.rotation.set(...rotation);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function roundedPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function makeLabel(text, accent = '#2e6fdb', scale = 1) {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 144;
  const ctx = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false, depthWrite: false });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(6.2 * scale, 1.4 * scale, 1);
  sprite.renderOrder = 20;
  sprite.userData = { canvas, ctx, texture, accent };
  updateLabel(sprite, text, accent);
  return sprite;
}

function updateLabel(sprite, text, accent = sprite.userData.accent) {
  const { canvas, ctx, texture } = sprite.userData;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  roundedPath(ctx, 8, 12, 624, 116, 22);
  ctx.fillStyle = 'rgba(23,50,77,.91)';
  ctx.fill();
  roundedPath(ctx, 8, 12, 12, 116, 6);
  ctx.fillStyle = accent;
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = '600 40px "Noto Sans CJK SC", "PingFang SC", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 328, 72, 565);
  texture.needsUpdate = true;
  sprite.visible = labelsVisible;
}

function addZoneHitbox(group, zone, w, h, d, y) {
  const hit = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
  hit.position.y = y;
  hit.userData.zone = zone;
  group.add(hit);
  rayTargets.push(hit);
  zoneGroups[zone] = group;
}

function createRoom({ name, zone, x, z, w, d, h, baseY = 0.55, accent, labelScale = 1 }) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  scene.add(group);
  const floorMat = mat('#eef5f6', { roughness: 0.85 });
  const wallMat = mat('#e2edf0', { roughness: 0.8 });
  const glassMat = mat(accent, { transparent: true, opacity: 0.16, roughness: 0.18, metalness: 0.05, depthWrite: false });
  const frameMat = mat(accent, { roughness: 0.42, metalness: 0.28 });
  box(group, [w, 0.32, d], [0, baseY, 0], floorMat);
  box(group, [w, h, 0.18], [0, baseY + h / 2, -d / 2], wallMat);
  box(group, [0.14, h, d], [-w / 2, baseY + h / 2, 0], glassMat, { cast: false });
  box(group, [0.14, h, d], [w / 2, baseY + h / 2, 0], glassMat, { cast: false });
  box(group, [w, 0.7, 0.14], [0, baseY + 0.35, d / 2], glassMat, { cast: false });
  for (const px of [-w / 2, w / 2]) {
    for (const pz of [-d / 2, d / 2]) box(group, [0.18, h + 0.25, 0.18], [px, baseY + h / 2, pz], frameMat);
  }
  box(group, [w + 0.15, 0.16, 0.18], [0, baseY + h, -d / 2], frameMat);
  box(group, [w + 0.15, 0.16, 0.18], [0, baseY + h, d / 2], frameMat);
  for (let i = 1; i < 4; i += 1) box(group, [0.09, 0.09, d], [-w / 2 + (w * i) / 4, baseY + h, 0], frameMat, { cast: false });
  const label = makeLabel(name, accent, labelScale);
  label.position.set(0, baseY + h + 1.25, 0);
  group.add(label);
  labels[zone] = label;
  addZoneHitbox(group, zone, w, h, d, baseY + h / 2);
  return group;
}

function buildEnvironment() {
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(220, 220), mat('#d8e5e2', { roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.03;
  ground.receiveShadow = true;
  scene.add(ground);
  const base = new THREE.Group();
  scene.add(base);
  box(base, [35, 0.65, 28], [0, 0.25, 0], mat('#f0f5f4', { roughness: 0.86 }));
  box(base, [35.4, 0.16, 28.4], [0, -0.05, 0], mat('#9fb9c2', { roughness: 0.7 }));
  box(base, [2.1, 0.05, 26], [2.6, 0.61, 0], mat('#c8d8dd', { roughness: 0.95 }), { cast: false });
  box(base, [32, 0.05, 1.3], [0, 0.62, 6.7], mat('#c8d8dd', { roughness: 0.95 }), { cast: false });
  for (let i = -6; i <= 6; i += 1) box(base, [0.08, 0.02, 0.65], [2.6, 0.65, i * 1.8], mat('#ffffff'), { cast: false });
  const landscapeMat = mat('#a9cbb7', { roughness: 1 });
  box(base, [2.2, 0.18, 24], [-16.1, 0.62, 0], landscapeMat);
  box(base, [2.2, 0.18, 24], [16.1, 0.62, 0], landscapeMat);
  const trunkMat = mat('#9a8164');
  const leafMat = mat('#65a88c', { roughness: 0.9 });
  for (const [x, z] of [[-15.7, -11.5], [-15.7, 11.3], [15.7, -11.5], [15.7, 11.3], [0, -12.3]]) {
    cylinder(base, 0.12, 0.16, 1.1, 7, [x, 1.15, z], trunkMat);
    cylinder(base, 0, 0.85, 2.1, 7, [x, 2.35, z], leafMat);
  }
  const points = [];
  const count = mobile ? 120 : 260;
  for (let i = 0; i < count; i += 1) points.push((Math.random() - 0.5) * 44, 1 + Math.random() * 16, (Math.random() - 0.5) * 36);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  dust = new THREE.Points(geometry, new THREE.PointsMaterial({ color: '#ffffff', size: 0.08, transparent: true, opacity: 0.48, depthWrite: false }));
  scene.add(dust);
}

function buildCleanroom() {
  const room = createRoom({ name: '洁净室', zone: 'cleanroom', x: -6, z: 1, w: 14, d: 13, h: 5.2, accent: '#2e6fdb' });
  const machineBody = mat('#f7fbfc', { roughness: 0.38, metalness: 0.22 });
  const machineTrim = mat('#9db7c6', { metalness: 0.35, roughness: 0.35 });
  const armMat = mat('#e5a93d', { metalness: 0.28, roughness: 0.4 });
  let index = 0;
  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 6; col += 1) {
      const group = new THREE.Group();
      group.position.set(-5.1 + col * 2.02, 0.75, -3.5 + row * 3.2);
      room.add(group);
      box(group, [1.35, 1.35, 1.35], [0, 0.72, 0], machineBody);
      box(group, [1.42, 0.12, 1.42], [0, 1.43, 0], machineTrim);
      const screenMat = mat('#1f6f8e', { emissive: '#21c9d4', emissiveIntensity: 1.2, roughness: 0.25 });
      box(group, [0.65, 0.38, 0.05], [0, 0.9, 0.7], screenMat, { cast: false });
      const pivot = new THREE.Group();
      pivot.position.set(0, 1.52, 0);
      group.add(pivot);
      box(pivot, [0.13, 0.75, 0.13], [0, 0.32, 0], armMat);
      box(pivot, [0.65, 0.12, 0.12], [0.27, 0.67, 0], armMat);
      cleanMachines.push({ group, pivot, screenMat, index });
      index += 1;
    }
  }
  const conveyor = new THREE.Group();
  conveyor.position.set(0, 0.85, 4.8);
  room.add(conveyor);
  box(conveyor, [11.5, 0.25, 1.0], [0, 0, 0], mat('#6d8794', { metalness: 0.4 }));
  const waferMat = mat('#52c7d2', { emissive: '#1f8996', emissiveIntensity: 0.4, metalness: 0.55, roughness: 0.25 });
  for (let i = 0; i < 14; i += 1) {
    const wafer = cylinder(conveyor, 0.32, 0.32, 0.05, 20, [-5.2 + i * 0.8, 0.2, 0], waferMat);
    standardWafers.push(wafer);
  }
}

function buildHbm() {
  const room = createRoom({ name: 'HBM 产线', zone: 'hbm', x: 8.5, z: 0, w: 8, d: 12, h: 5.2, accent: '#7868d8' });
  const body = mat('#f2f0fb', { metalness: 0.2, roughness: 0.4 });
  const trim = mat('#a99ce3', { metalness: 0.3, roughness: 0.35 });
  for (let i = 0; i < 4; i += 1) {
    box(room, [1.25, 1.8, 1.6], [-2.6 + i * 1.75, 1.65, -4.4], body);
    box(room, [1.32, 0.12, 1.67], [-2.6 + i * 1.75, 2.6, -4.4], trim);
  }
  const chipColors = ['#6d5fc7', '#8d7ee0', '#3aa7b5', '#7868d8'];
  for (let i = 0; i < 12; i += 1) {
    const stack = new THREE.Group();
    stack.position.set(-2.6 + (i % 4) * 1.75, 0.82, -1.8 + Math.floor(i / 4) * 2.2);
    room.add(stack);
    for (let layer = 0; layer < 5; layer += 1) box(stack, [0.85, 0.12, 0.85], [0, 0.25 + layer * 0.16, 0], mat(chipColors[layer % chipColors.length], { metalness: 0.38, roughness: 0.28 }));
    hbmStacks.push(stack);
  }
  box(room, [6.8, 0.22, 0.9], [0, 0.92, 4.4], mat('#6d8794', { metalness: 0.4 }));
  const packetMat = mat('#9a8ceb', { emissive: '#6650c8', emissiveIntensity: 0.65, metalness: 0.35 });
  for (let i = 0; i < 10; i += 1) {
    const packet = box(room, [0.45, 0.28, 0.45], [-3 + i * 0.66, 1.2, 4.4], packetMat);
    hbmPackets.push(packet);
  }
  const rndMat = mat('#e5a93d', { emissive: '#b77c19', emissiveIntensity: 0.35, transparent: true, opacity: 0.75 });
  for (let i = 0; i < 3; i += 1) {
    const pillar = box(room, [0.55, 1, 0.55], [-1.4 + i * 1.4, 1, 1.5], rndMat);
    rndPillars.push(pillar);
  }
}

function buildWarehouse() {
  const room = createRoom({ name: '仓库', zone: 'warehouse', x: -7, z: -9, w: 12, d: 5, h: 3.4, accent: '#e5a93d', labelScale: 0.86 });
  const rackMat = mat('#718894', { metalness: 0.48, roughness: 0.4 });
  for (let rack = 0; rack < 3; rack += 1) {
    const x = -4 + rack * 4;
    for (let level = 0; level < 4; level += 1) box(room, [2.9, 0.09, 3.4], [x, 0.85 + level * 0.58, 0], rackMat);
    for (const px of [-1.35, 1.35]) for (const pz of [-1.55, 1.55]) box(room, [0.09, 2.5, 0.09], [x + px, 1.75, pz], rackMat);
  }
  const geometry = new THREE.BoxGeometry(0.58, 0.42, 0.58);
  const material = mat('#dca94d', { roughness: 0.7 });
  inventoryMesh = new THREE.InstancedMesh(geometry, material, 60);
  inventoryMesh.castShadow = true;
  inventoryMesh.receiveShadow = true;
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 60; i += 1) {
    const rack = Math.floor(i / 20);
    const local = i % 20;
    const level = Math.floor(local / 5);
    const col = local % 5;
    dummy.position.set(-4 + rack * 4, 1.12 + level * 0.58, -1.25 + col * 0.63);
    dummy.updateMatrix();
    inventoryMesh.setMatrixAt(i, dummy.matrix);
  }
  room.add(inventoryMesh);
}

function buildBoardroom() {
  const supports = new THREE.Group();
  scene.add(supports);
  for (const x of [3.2, 10.8]) for (const z of [-10.8, -7.2]) box(supports, [0.35, 4.4, 0.35], [x, 2.75, z], mat('#8aa4b0', { metalness: 0.3 }));
  const room = createRoom({ name: '董事会会议室', zone: 'boardroom', x: 7, z: -9, w: 9, d: 5, h: 3.2, baseY: 4.9, accent: '#129b8d', labelScale: 0.9 });
  const tableMat = mat('#d7c4a3', { roughness: 0.42 });
  cylinder(room, 1.55, 1.55, 0.16, 32, [0, 5.85, 0.3], tableMat);
  cylinder(room, 0.35, 0.5, 0.85, 16, [0, 5.35, 0.3], mat('#69818e', { metalness: 0.35 }));
  const chairMat = mat('#355a70', { roughness: 0.55 });
  for (let i = 0; i < 8; i += 1) {
    const angle = (i / 8) * Math.PI * 2;
    const chair = new THREE.Group();
    chair.position.set(Math.sin(angle) * 2.25, 5.25, 0.3 + Math.cos(angle) * 2.05);
    chair.rotation.y = angle;
    room.add(chair);
    box(chair, [0.65, 0.15, 0.65], [0, 0.35, 0], chairMat);
    box(chair, [0.65, 0.8, 0.12], [0, 0.78, 0.3], chairMat);
  }
  boardCanvas = document.createElement('canvas');
  boardCanvas.width = 768;
  boardCanvas.height = 384;
  boardContext = boardCanvas.getContext('2d');
  boardTexture = new THREE.CanvasTexture(boardCanvas);
  boardTexture.colorSpace = THREE.SRGBColorSpace;
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 2.3), new THREE.MeshBasicMaterial({ map: boardTexture }));
  screen.position.set(0, 6.7, -2.38);
  room.add(screen);
}

function buildVault() {
  const room = createRoom({ name: '金库', zone: 'vault', x: 9, z: 9, w: 7, d: 6, h: 3.6, accent: '#d9a82e', labelScale: 0.86 });
  const geometry = new THREE.BoxGeometry(0.58, 0.22, 0.34);
  const material = mat('#e7b83f', { metalness: 0.72, roughness: 0.25, emissive: '#7a4d08', emissiveIntensity: 0.08 });
  cashMesh = new THREE.InstancedMesh(geometry, material, 72);
  cashMesh.castShadow = true;
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 72; i += 1) {
    const layer = Math.floor(i / 24);
    const local = i % 24;
    dummy.position.set(-1.8 + (local % 6) * 0.68, 0.86 + layer * 0.25, -1.1 + Math.floor(local / 6) * 0.58);
    dummy.rotation.y = (layer % 2) * 0.08;
    dummy.updateMatrix();
    cashMesh.setMatrixAt(i, dummy.matrix);
  }
  room.add(cashMesh);
  debtGauge = box(scene, [0.75, 1, 0.75], [13.5, 1, 9], mat('#c64747', { emissive: '#8b2323', emissiveIntensity: 0.25, transparent: true, opacity: 0.86 }));
  labels.debt = makeLabel('债务', '#c64747', 0.7);
  labels.debt.position.set(13.5, 5.6, 9);
  scene.add(labels.debt);
}

function buildCapacityAndCrane() {
  const thresholds = [330, 370, 410, 450, 510, 570];
  thresholds.forEach((threshold, i) => {
    const pod = new THREE.Group();
    pod.position.set(-14.7, 0.65, -4.5 + i * 2.05);
    scene.add(pod);
    box(pod, [1.7, 0.25, 1.7], [0, 0, 0], mat('#d9e8f5'));
    box(pod, [1.25, 1.45, 1.25], [0, 0.85, 0], mat('#f5f9fc', { metalness: 0.2 }));
    box(pod, [1.3, 0.12, 1.3], [0, 1.62, 0], mat('#2e6fdb', { emissive: '#2e6fdb', emissiveIntensity: 0.25 }));
    pod.userData.threshold = threshold;
    capacityPods.push(pod);
  });
  labels.capacity = makeLabel('产能单元', '#2e6fdb', 0.72);
  labels.capacity.position.set(-14.7, 4.2, 0.5);
  scene.add(labels.capacity);
  crane = new THREE.Group();
  crane.position.set(0, 0.65, -10.2);
  scene.add(crane);
  const yellow = mat('#e5a93d', { metalness: 0.35, roughness: 0.42 });
  box(crane, [0.35, 7.5, 0.35], [0, 3.75, 0], yellow);
  box(crane, [7.5, 0.28, 0.28], [2.6, 7.35, 0], yellow);
  box(crane, [0.12, 3.0, 0.12], [5.6, 5.85, 0], mat('#6c7c84'));
  box(crane, [0.5, 0.35, 0.5], [5.6, 4.3, 0], yellow);
}

function buildScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color('#dfedf3');
  scene.fog = new THREE.Fog('#dfedf3', 58, 115);
  camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, 0.1, 220);
  const hemisphere = new THREE.HemisphereLight('#f5fcff', '#789083', 2.1);
  scene.add(hemisphere);
  const sun = new THREE.DirectionalLight('#fff1d9', 3.1);
  sun.position.set(22, 36, 24);
  sun.castShadow = true;
  sun.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048);
  sun.shadow.camera.left = -36;
  sun.shadow.camera.right = 36;
  sun.shadow.camera.top = 36;
  sun.shadow.camera.bottom = -36;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 90;
  sun.shadow.bias = -0.0004;
  scene.add(sun);
  const fill = new THREE.DirectionalLight('#c8dcff', 1.15);
  fill.position.set(-22, 16, -18);
  scene.add(fill);
  buildEnvironment();
  buildCleanroom();
  buildHbm();
  buildWarehouse();
  buildBoardroom();
  buildVault();
  buildCapacityAndCrane();
  const preset = viewPresets.overview;
  cameraCurrent = { target: new THREE.Vector3(...preset.target), radius: preset.radius, theta: preset.theta, phi: preset.phi };
  cameraDesired = { target: new THREE.Vector3(...preset.target), radius: preset.radius, theta: preset.theta, phi: preset.phi };
  updateCamera(1);
}

function updateCamera(alpha) {
  cameraCurrent.target.lerp(cameraDesired.target, alpha);
  cameraCurrent.radius += (cameraDesired.radius - cameraCurrent.radius) * alpha;
  cameraCurrent.theta += (cameraDesired.theta - cameraCurrent.theta) * alpha;
  cameraCurrent.phi += (cameraDesired.phi - cameraCurrent.phi) * alpha;
  const { target, radius, theta, phi } = cameraCurrent;
  camera.position.set(
    target.x + radius * Math.sin(phi) * Math.sin(theta),
    target.y + radius * Math.cos(phi),
    target.z + radius * Math.sin(phi) * Math.cos(theta),
  );
  camera.lookAt(target);
}

function goView(name) {
  const preset = viewPresets[name];
  if (!preset) return;
  activeView = name;
  cameraDesired.target.set(...preset.target);
  cameraDesired.radius = preset.radius;
  cameraDesired.theta = preset.theta;
  cameraDesired.phi = preset.phi;
  document.querySelectorAll('[data-view]').forEach((button) => button.classList.toggle('active', button.dataset.view === name));
}

function drawBoard(q) {
  const ctx = boardContext;
  const w = boardCanvas.width;
  const h = boardCanvas.height;
  ctx.fillStyle = '#102c43';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#8fe0d5';
  ctx.font = '600 28px "Noto Sans CJK SC", sans-serif';
  ctx.fillText(`BOARD REVIEW / Q${q.q}`, 42, 52);
  ctx.fillStyle = '#ffffff';
  ctx.font = '600 54px "Noto Sans CJK SC", sans-serif';
  ctx.fillText(`${money(q.equity)} B$`, 42, 124);
  ctx.fillStyle = '#9db5c4';
  ctx.font = '24px "Noto Sans CJK SC", sans-serif';
  ctx.fillText(`股东权益 · 净利润 ${money(q.netIncome)} B$`, 42, 166);
  const values = quarters.slice(0, q.q).map((item) => item.equity);
  const max = Math.max(...quarters.map((item) => item.equity));
  const min = Math.min(0, ...quarters.map((item) => item.equity));
  ctx.strokeStyle = '#35c6b4';
  ctx.lineWidth = 6;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  values.forEach((value, i) => {
    const x = 46 + (i / 15) * 675;
    const y = 342 - ((value - min) / (max - min)) * 135;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.12)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(42, 344);
  ctx.lineTo(724, 344);
  ctx.stroke();
  boardTexture.needsUpdate = true;
}

function updateSpark(q) {
  const values = quarters.map((item) => item.equity);
  const max = Math.max(...values);
  const min = Math.min(0, ...values);
  const point = (value, index) => [index * (280 / 15), 66 - ((value - min) / (max - min)) * 56];
  const pathFor = (items) => items.map((value, index) => {
    const [x, y] = point(value, index);
    return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(' ');
  $('spark-full').setAttribute('d', pathFor(values));
  const currentValues = values.slice(0, q.q);
  const currentPath = pathFor(currentValues);
  $('spark-current').setAttribute('d', currentPath);
  const [lastX, lastY] = point(q.equity, q.q - 1);
  $('spark-area').setAttribute('d', `${currentPath} L${lastX.toFixed(2)},72 L0,72 Z`);
  $('spark-dot').setAttribute('cx', lastX);
  $('spark-dot').setAttribute('cy', lastY);
  $('spark-value').textContent = money(q.equity);
}

function zoneText(zone) {
  const q = currentData;
  const content = {
    cleanroom: `开工率 ${percent(q.utilization)} · 总产量 ${quantity(q.produced)} 千片 · 产能 ${quantity(q.capacity)} 千片/季`,
    hbm: q.qualified ? `HBM产量 ${quantity(q.hbmProduced)} 千片 · 订单 ${quantity(q.hbmDemand)} 千片 · 收入 ${money(q.revenueHbm)} B$` : `额外研发累计 ${q.rndCumulative.toFixed(1)} / 3.0 B$ · 预计Q6量产`,
    warehouse: `库存 ${quantity(q.inventoryQty)} 千片 · 存货价值 ${money(q.inventoryValue)} B$`,
    boardroom: `股东权益 ${money(q.equity)} B$ · 当季净利润 ${money(q.netIncome)} B$`,
    vault: `现金 ${money(q.cash)} B$ · 普通及紧急债务 ${money(q.debt + q.emergencyDebt)} B$`,
  };
  return content[zone] ?? '';
}

function updateQuarter(number) {
  currentQuarter = clamp(Math.round(number), 1, 16);
  const q = quarters[currentQuarter - 1];
  currentData = q;
  $('quarter-number').textContent = String(q.q).padStart(2, '0');
  $('phase-name').textContent = phaseNames[q.q - 1];
  $('quarter-tag').textContent = quarterTags[q.q - 1];
  $('status-text').textContent = `Q${q.q} · ${phaseNames[q.q - 1]}`;
  $('news-text').textContent = q.news;
  $('consensus-text').textContent = q.consensus;
  $('decision-note').textContent = q.note;
  $('revenue-value').textContent = money(q.revenue);
  $('income-value').textContent = money(q.netIncome);
  $('income-value').classList.toggle('negative', q.netIncome < 0);
  $('equity-value').textContent = money(q.equity);
  $('margin-value').textContent = percent(q.grossMargin, 2);
  $('utilization-value').textContent = percent(q.utilization);
  $('utilization-bar').style.width = percent(q.utilization);
  $('production-sub').textContent = `总产量 ${quantity(q.produced)} 千片 · 普通销量 ${quantity(q.stdSold)} 千片`;
  $('inventory-value').textContent = `${quantity(q.inventoryQty)} 千片`;
  $('inventory-bar').style.width = `${clamp(q.inventoryQty / 60 * 100, 0, 100)}%`;
  $('inventory-sub').textContent = `存货价值 ${money(q.inventoryValue)} 十亿美元`;
  $('hbm-value').textContent = `${quantity(q.hbmProduced)} 千片`;
  $('hbm-bar').style.width = `${clamp(q.hbmProduced / maxHbm * 100, 0, 100)}%`;
  $('hbm-sub').textContent = q.qualified ? `订单 ${quantity(q.hbmDemand)} 千片 · 产能分配 ${percent(q.hbmShare, 2)}` : `额外研发累计 ${q.rndCumulative.toFixed(1)} / 3.0 十亿美元`;
  $('cash-value').textContent = money(q.cash);
  $('cash-bar').style.width = `${clamp(q.cash / maxCash * 100, 0, 100)}%`;
  $('debt-value').textContent = money(q.debt + q.emergencyDebt);
  $('debt-bar').style.width = `${clamp((q.debt + q.emergencyDebt) / maxDebt * 100, 0, 100)}%`;
  $('debt-sub').textContent = q.emergencyDebt > 0 ? `含紧急授信 ${money(q.emergencyDebt)}` : q.debt === 0 ? '普通债务清零 · 无紧急授信' : `新增/(偿还) ${money(q.borrow)} 十亿美元`;
  $('capacity-value').textContent = quantity(q.capacity);
  $('qualification-badge').textContent = q.qualified ? 'HBM已量产' : 'HBM研发中';
  $('qualification-badge').classList.toggle('qualified', q.qualified);
  $('timeline-caption').textContent = `Q${q.q} / Q16`;
  $('quarter-slider').value = q.q;
  $('quarter-slider').style.setProperty('--progress', `${(q.q - 1) / 15 * 100}%`);
  $('cumulative-income').textContent = money(quarters.slice(0, q.q).reduce((sum, item) => sum + item.netIncome, 0));
  $('capex-value').textContent = money(q.capex);
  updateSpark(q);
  drawBoard(q);

  const activeCount = Math.round(q.utilization * cleanMachines.length);
  cleanMachines.forEach((machine, i) => {
    machine.screenMat.emissiveIntensity = i < activeCount ? 1.4 : 0.04;
    machine.screenMat.color.set(i < activeCount ? '#1f6f8e' : '#a8b4ba');
  });
  standardWafers.forEach((wafer, i) => { wafer.visible = i < Math.round(q.utilization * standardWafers.length); });
  hbmStacks.forEach((stack, i) => { stack.visible = q.qualified && i < Math.round(q.hbmProduced / maxHbm * hbmStacks.length); });
  hbmPackets.forEach((packet, i) => { packet.visible = q.qualified && i < Math.max(1, Math.round(q.hbmProduced / maxHbm * hbmPackets.length)); });
  rndPillars.forEach((pillar, i) => {
    const fill = clamp(q.rndCumulative - i, 0, 1);
    pillar.visible = !q.qualified;
    pillar.scale.y = 0.08 + fill * 3.2;
    pillar.position.y = 0.75 + pillar.scale.y / 2;
  });
  inventoryMesh.count = clamp(Math.round(q.inventoryQty), 0, 60);
  cashMesh.count = clamp(Math.round(8 + 64 * Math.log1p(q.cash) / Math.log1p(maxCash)), 0, 72);
  const totalDebt = q.debt + q.emergencyDebt;
  const debtHeight = totalDebt > 0 ? 0.2 + 4.2 * totalDebt / maxDebt : 0;
  debtGauge.visible = totalDebt > 0;
  debtGauge.scale.y = Math.max(debtHeight, 0.001);
  debtGauge.position.y = 0.65 + debtHeight / 2;
  capacityPods.forEach((pod) => { pod.visible = q.capacity >= pod.userData.threshold; });
  crane.visible = q.capex > 1.5;
  updateLabel(labels.cleanroom, `洁净室 · ${percent(q.utilization, 0)}`, '#2e6fdb');
  updateLabel(labels.hbm, q.qualified ? `HBM · ${quantity(q.hbmProduced)} 千片` : `HBM研发 · ${q.rndCumulative.toFixed(1)}/3.0`, '#7868d8');
  updateLabel(labels.warehouse, `仓库 · ${quantity(q.inventoryQty)} 千片`, '#e5a93d');
  updateLabel(labels.boardroom, `董事会 · 权益 ${money(q.equity)}`, '#129b8d');
  updateLabel(labels.vault, `金库 · ${money(q.cash)} B$`, '#d9a82e');
  updateLabel(labels.debt, totalDebt > 0 ? `债务 ${money(totalDebt)}` : '债务清零', '#c64747');
  updateLabel(labels.capacity, `产能 ${quantity(q.capacity)} 千片/季`, '#2e6fdb');
}

function setPlaying(value) {
  if (value && currentQuarter === 16) updateQuarter(1);
  playing = value;
  playAccumulator = 0;
  $('play-button').classList.toggle('playing', playing);
  $('play-button').setAttribute('aria-label', playing ? '暂停季度播放' : '播放季度');
  $('play-label').textContent = playing ? '暂停' : '播放';
}

function updateRaycast(clientX, clientY, showTooltip = true) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointerNdc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
  raycaster.setFromCamera(pointerNdc, camera);
  const hit = raycaster.intersectObjects(rayTargets, false)[0];
  const tooltip = $('zone-tooltip');
  if (hit && showTooltip) {
    const zone = hit.object.userData.zone;
    const names = { cleanroom: '洁净室', hbm: 'HBM产线', warehouse: '仓库', boardroom: '董事会会议室', vault: '金库' };
    tooltip.innerHTML = `<strong>${names[zone]}</strong>${zoneText(zone)}`;
    tooltip.style.display = 'block';
    tooltip.style.left = `${clamp(clientX + 14, 8, innerWidth - 275)}px`;
    tooltip.style.top = `${clamp(clientY + 14, 8, innerHeight - 90)}px`;
    renderer.domElement.style.cursor = 'pointer';
  } else {
    tooltip.style.display = 'none';
    renderer.domElement.style.cursor = pointerPositions.size ? 'grabbing' : 'grab';
  }
  return hit?.object.userData.zone;
}

function bindControls() {
  $('play-button').addEventListener('click', () => setPlaying(!playing));
  $('previous-button').addEventListener('click', () => { setPlaying(false); updateQuarter(currentQuarter - 1); });
  $('next-button').addEventListener('click', () => { setPlaying(false); updateQuarter(currentQuarter + 1); });
  $('quarter-slider').addEventListener('input', (event) => { setPlaying(false); updateQuarter(Number(event.target.value)); });
  $('reset-button').addEventListener('click', () => goView('overview'));
  $('labels-button').addEventListener('click', () => {
    labelsVisible = !labelsVisible;
    Object.values(labels).forEach((label) => { label.visible = labelsVisible; });
    $('labels-button').setAttribute('aria-pressed', String(labelsVisible));
  });
  $('metrics-button').addEventListener('click', () => {
    const open = document.body.classList.toggle('metrics-open');
    $('metrics-button').setAttribute('aria-pressed', String(open));
  });
  document.querySelectorAll('[data-view]').forEach((button) => button.addEventListener('click', () => goView(button.dataset.view)));
  window.addEventListener('keydown', (event) => {
    if (['INPUT', 'BUTTON', 'SUMMARY'].includes(document.activeElement?.tagName)) return;
    if (event.code === 'Space') { event.preventDefault(); setPlaying(!playing); }
    if (event.code === 'ArrowLeft') { setPlaying(false); updateQuarter(currentQuarter - 1); }
    if (event.code === 'ArrowRight') { setPlaying(false); updateQuarter(currentQuarter + 1); }
  });
  const canvas = renderer.domElement;
  canvas.addEventListener('pointerdown', (event) => {
    canvas.setPointerCapture(event.pointerId);
    pointerPositions.set(event.pointerId, { x: event.clientX, y: event.clientY });
    dragDistance = 0;
    if (pointerPositions.size === 2) {
      const points = [...pointerPositions.values()];
      lastPinchDistance = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
    }
  });
  canvas.addEventListener('pointermove', (event) => {
    pointerClient = { x: event.clientX, y: event.clientY };
    if (!pointerPositions.has(event.pointerId)) {
      if (event.pointerType === 'mouse') updateRaycast(event.clientX, event.clientY);
      return;
    }
    const previous = pointerPositions.get(event.pointerId);
    const dx = event.clientX - previous.x;
    const dy = event.clientY - previous.y;
    dragDistance += Math.abs(dx) + Math.abs(dy);
    pointerPositions.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointerPositions.size === 1) {
      cameraDesired.theta -= dx * 0.006;
      cameraDesired.phi = clamp(cameraDesired.phi + dy * 0.005, 0.45, 1.42);
    } else if (pointerPositions.size === 2) {
      const points = [...pointerPositions.values()];
      const distance = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
      if (lastPinchDistance > 0) cameraDesired.radius = clamp(cameraDesired.radius * lastPinchDistance / distance, 17, 75);
      lastPinchDistance = distance;
    }
    $('zone-tooltip').style.display = 'none';
  });
  const endPointer = (event) => {
    const wasClick = dragDistance < 6 && pointerPositions.size === 1;
    pointerPositions.delete(event.pointerId);
    if (wasClick && event.pointerType === 'mouse') {
      const zone = updateRaycast(event.clientX, event.clientY, false);
      if (zone && viewPresets[zone]) goView(zone);
    }
    if (pointerPositions.size < 2) lastPinchDistance = 0;
  };
  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', endPointer);
  canvas.addEventListener('pointerleave', () => { $('zone-tooltip').style.display = 'none'; });
  canvas.addEventListener('wheel', (event) => {
    event.preventDefault();
    cameraDesired.radius = clamp(cameraDesired.radius + event.deltaY * 0.025, 17, 75);
  }, { passive: false });
  window.addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
    renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.35 : 1.8));
  });
}

function animate(time) {
  requestAnimationFrame(animate);
  const delta = Math.min((time - lastTime) / 1000 || 0.016, 0.05);
  lastTime = time;
  elapsed += delta;
  if (playing) {
    playAccumulator += delta;
    if (playAccumulator >= 1.9) {
      playAccumulator = 0;
      if (currentQuarter < 16) updateQuarter(currentQuarter + 1); else setPlaying(false);
    }
  }
  const motion = reducedMotion ? 0.15 : 1;
  cleanMachines.forEach((machine, i) => {
    if (i < Math.round(currentData.utilization * cleanMachines.length)) machine.pivot.rotation.y += delta * (0.4 + currentData.utilization * 1.2) * motion;
  });
  standardWafers.forEach((wafer, i) => {
    wafer.position.x = ((elapsed * currentData.utilization * 1.5 * motion + i * 0.82) % 11.2) - 5.6;
  });
  hbmPackets.forEach((packet, i) => {
    packet.position.x = ((elapsed * (0.4 + currentData.hbmProduced / maxHbm) * motion + i * 0.68) % 6.5) - 3.25;
    packet.position.y = 1.2 + Math.sin(elapsed * 2 + i) * 0.025 * motion;
  });
  if (crane.visible) crane.rotation.y = Math.sin(elapsed * 0.22 * motion) * 0.18;
  if (dust) dust.rotation.y += delta * 0.005 * motion;
  updateCamera(reducedMotion ? 0.2 : 0.075);
  renderer.render(scene, camera);
}

function init() {
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.35 : 1.8));
    renderer.setSize(innerWidth, innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    $('scene-container').appendChild(renderer.domElement);
    buildScene();
    bindControls();
    updateQuarter(1);
    renderer.render(scene, camera);
    $('loading-screen').classList.add('loaded');
    requestAnimationFrame(animate);
  } catch (error) {
    $('loading-screen').classList.add('loaded');
    $('webgl-error').hidden = false;
    $('webgl-error').querySelector('p').textContent = `请使用支持 WebGL 的现代浏览器并开启硬件加速。错误：${error.message}`;
  }
}

if (!data || quarters.length !== 16) {
  $('loading-screen').classList.add('loaded');
  $('webgl-error').hidden = false;
  $('webgl-error').querySelector('p').textContent = '未能读取完整的16季度数据，请确认 data.js 与 index.html 位于同一目录。';
} else {
  init();
}
