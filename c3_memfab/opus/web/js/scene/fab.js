import * as THREE from 'three';
import { ZONES } from './layout.js';
import {
  rbox, std, glow, setGlow, instanced, writeTRS, initColors, writeColor, canvasTexture,
  cageGeometry, mergeGeometries, shuffled, clamp, smooth,
} from './util.js';
import { EXPANSIONS, BASE_CAPACITY, TOOL_KW, MAX } from '../data.js';

const ROWS = 6;
const PITCH_X = 1.7;
const BAY_Z = [-4.6, 0, 4.6];
const ROW_OFF = 1.25;
const TW = 1.22, TH = 1.5, TD = 1.0;
const FLOOR_Y = 0.22;
const WALL_H = 4.7;
const RAIL_Y = 3.15;
const TRUSS_Y = 4.5;
const LOOP_R = 0.45;
const CARRIER_KW = 10; // 视觉映射：每个天车晶圆盒 ≈ 10 千片/季

function waferTexture() {
  return canvasTexture(256, 256, (g, w) => {
    const c = w / 2;
    let grad;
    if (g.createConicGradient) {
      grad = g.createConicGradient(0.6, c, c);
      const stops = ['#7cf3ff', '#9a8cff', '#ff9ef0', '#ffe39a', '#8affd8', '#7cf3ff'];
      stops.forEach((s, i) => grad.addColorStop(i / (stops.length - 1), s));
    } else {
      grad = g.createLinearGradient(0, 0, w, w);
      grad.addColorStop(0, '#7cf3ff'); grad.addColorStop(0.5, '#b49cff'); grad.addColorStop(1, '#ffd0f0');
    }
    g.fillStyle = grad;
    g.fillRect(0, 0, w, w);
    const rg = g.createRadialGradient(c, c, 10, c, c, c);
    rg.addColorStop(0, 'rgba(255,255,255,0.55)');
    rg.addColorStop(0.7, 'rgba(255,255,255,0.05)');
    rg.addColorStop(1, 'rgba(40,60,120,0.35)');
    g.fillStyle = rg;
    g.fillRect(0, 0, w, w);
    g.strokeStyle = 'rgba(20,40,80,0.35)';
    g.lineWidth = 1.5;
    const step = w / 14;
    for (let i = 1; i < 14; i++) {
      g.beginPath(); g.moveTo(i * step, 0); g.lineTo(i * step, w); g.stroke();
      g.beginPath(); g.moveTo(0, i * step); g.lineTo(w, i * step); g.stroke();
    }
    g.strokeStyle = 'rgba(255,255,255,0.9)';
    g.lineWidth = 6;
    g.beginPath(); g.arc(c, c, c - 4, 0, Math.PI * 2); g.stroke();
  });
}

function hatchTexture() {
  return canvasTexture(128, 128, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.strokeStyle = 'rgba(255,255,255,0.85)';
    g.lineWidth = 6;
    g.setLineDash([12, 8]);
    g.strokeRect(4, 4, w - 8, h - 8);
    g.setLineDash([]);
    g.strokeStyle = 'rgba(255,255,255,0.38)';
    g.lineWidth = 4;
    for (let i = -h; i < w; i += 20) {
      g.beginPath(); g.moveTo(i, h); g.lineTo(i + h, 0); g.stroke();
    }
  }, { srgb: true });
}

/* 圆角跑道形天车环线：直线长 L、半径 r */
function loopPoint(s, L, r, zc, out) {
  const P = 2 * L + 2 * Math.PI * r;
  s = ((s % P) + P) % P;
  if (s < L) { out.x = -L / 2 + s; out.z = zc + r; out.ry = 0; return out; }
  s -= L;
  if (s < Math.PI * r) { const a = s / r; out.x = L / 2 + r * Math.sin(a); out.z = zc + r * Math.cos(a); out.ry = a; return out; }
  s -= Math.PI * r;
  if (s < L) { out.x = L / 2 - s; out.z = zc - r; out.ry = Math.PI; return out; }
  s -= L;
  const a = s / r; out.x = -L / 2 - r * Math.sin(a); out.z = zc - r * Math.cos(a); out.ry = Math.PI + a; return out;
}

class LoopCurve extends THREE.Curve {
  constructor(L, r, zc, y) { super(); this.L = L; this.r = r; this.zc = zc; this.y = y; this.tmp = {}; }
  getPoint(t, target = new THREE.Vector3()) {
    const P = 2 * this.L + 2 * Math.PI * this.r;
    const p = loopPoint(t * P, this.L, this.r, this.zc, this.tmp);
    return target.set(p.x, this.y, p.z);
  }
}

export function createFab() {
  const Z = ZONES.fab;
  const group = new THREE.Group();
  group.position.set(Z.x, 0, Z.z);
  const HW = Z.w / 2, HD = Z.d / 2;

  /* ---------- 槽位规划：基础产能 + 各期扩产 ---------- */
  const baseTools = Math.round(BASE_CAPACITY / TOOL_KW);
  const phaseTools = EXPANSIONS.map((e) => Math.max(1, Math.round(e.delta / TOOL_KW)));
  const totalTools = baseTools + phaseTools.reduce((a, b) => a + b, 0);
  const COLS = Math.max(1, Math.ceil(totalTools / ROWS));
  const SLOTS = COLS * ROWS;
  const pitch = Math.min(PITCH_X, (Z.w - 3.6) / COLS);
  const slotPhase = new Int16Array(SLOTS).fill(-2); // -1 基础，k 第 k 期，-2 预留
  for (let s = 0; s < baseTools; s++) slotPhase[s] = -1;
  {
    let s = baseTools;
    phaseTools.forEach((n, k) => { for (let i = 0; i < n && s < SLOTS; i++) slotPhase[s++] = k; });
  }
  const rowZ = [];
  BAY_Z.forEach((b) => { rowZ.push(b - ROW_OFF, b + ROW_OFF); });
  const slotX = new Float32Array(SLOTS), slotZ = new Float32Array(SLOTS), slotFace = new Int8Array(SLOTS);
  for (let s = 0; s < SLOTS; s++) {
    const col = Math.floor(s / ROWS), row = s % ROWS;
    slotX[s] = (col - (COLS - 1) / 2) * pitch;
    slotZ[s] = rowZ[row];
    slotFace[s] = row % 2 === 0 ? 1 : -1; // 朝向过道
  }
  const idleOrder = shuffled(baseTools, 11); // 开工率不足时，按此顺序让基础设备“待机”
  const idleRank = new Int16Array(SLOTS).fill(-1);
  idleOrder.forEach((slot, rank) => { idleRank[slot] = rank; });

  /* ---------- 厂房：地坪 + 三面墙（正面剖开）+ 顶部桁架 ---------- */
  const floorTex = canvasTexture(512, 512, (g, w, h) => {
    g.fillStyle = '#90a0b2';
    g.fillRect(0, 0, w, h);
    const n = 4, s = w / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      g.strokeStyle = 'rgba(255,255,255,0.38)';
      g.lineWidth = 3;
      g.strokeRect(i * s + 1.5, j * s + 1.5, s - 3, s - 3);
      g.fillStyle = 'rgba(20,40,70,0.10)';
      for (let a = 1; a < 7; a++) for (let b = 1; b < 7; b++) {
        g.beginPath(); g.arc(i * s + (a * s) / 7, j * s + (b * s) / 7, 2.4, 0, Math.PI * 2); g.fill();
      }
    }
  }, { repeat: [Z.w / 2.4, Z.d / 2.4], aniso: 8 });
  const sideMat = std('#7c8a99', { roughness: 0.5 });
  const floor = new THREE.Mesh(new THREE.BoxGeometry(Z.w, FLOOR_Y, Z.d), [sideMat, sideMat, std('#ffffff', { map: floorTex, roughness: 0.42, metalness: 0.02 }), sideMat, sideMat, sideMat]);
  floor.position.y = FLOOR_Y / 2;
  floor.receiveShadow = true;
  group.add(floor);

  // 过道发光导引线
  const aisleMat = glow('#35d4ff', 3.0);
  const aisleGeo = new THREE.BoxGeometry(COLS * pitch + 0.6, 0.012, 0.06);
  for (const b of BAY_Z) for (const off of [-0.62, 0.62]) {
    const m = new THREE.Mesh(aisleGeo, aisleMat);
    m.position.set(0, FLOOR_Y + 0.007, b + off);
    group.add(m);
  }

  const wallTex = canvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = '#e8edf2';
    g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(90,110,135,0.14)';
    g.fillRect(0, 0, 3, h);
    g.fillStyle = 'rgba(120,140,165,0.06)';
    g.fillRect(0, h * 0.62, w, 2);
  });
  const mkWall = (len, axis) => {
    const t = wallTex.clone();
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(len / 1.6, 1);
    const m = std('#ffffff', { map: t, roughness: 0.55 });
    const geo = axis === 'x' ? new THREE.BoxGeometry(len, WALL_H, 0.32) : new THREE.BoxGeometry(0.32, WALL_H, len);
    if (axis === 'z') { // 侧墙：让纹理沿 z 方向重复
      t.repeat.set(len / 1.6, 1);
    }
    const mesh = new THREE.Mesh(geo, m);
    mesh.castShadow = true; mesh.receiveShadow = true;
    return mesh;
  };
  const back = mkWall(Z.w, 'x');
  back.position.set(0, WALL_H / 2, -HD + 0.16);
  group.add(back);
  // 两侧为青色洁净室玻璃幕墙（白色竖框）
  const glassMat = new THREE.MeshStandardMaterial({ color: '#6fe0ff', transparent: true, opacity: 0.3, roughness: 0.06, metalness: 0.15, depthWrite: false, side: THREE.DoubleSide });
  const frameMat = std('#f4f8fb', { roughness: 0.35, metalness: 0.1 });
  for (const sx of [-1, 1]) {
    const gl = new THREE.Mesh(new THREE.PlaneGeometry(Z.d - 0.3, WALL_H - 0.1), glassMat);
    gl.rotation.y = Math.PI / 2;
    gl.position.set(sx * (HW - 0.16), FLOOR_Y + (WALL_H - 0.1) / 2, 0.15);
    gl.renderOrder = 1;
    group.add(gl);
    const nM = 7;
    for (let i = 0; i <= nM; i++) {
      const mz = -HD + 0.3 + (i * (Z.d - 0.3)) / nM;
      const mu = new THREE.Mesh(new THREE.BoxGeometry(0.14, WALL_H, 0.14), frameMat);
      mu.position.set(sx * (HW - 0.16), WALL_H / 2, mz);
      mu.castShadow = true;
      group.add(mu);
    }
    const sill = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.5, Z.d), frameMat);
    sill.position.set(sx * (HW - 0.16), 0.25, 0);
    sill.castShadow = true; sill.receiveShadow = true;
    group.add(sill);
  }

  // 墙顶 LED 灯带与剖切面高亮
  const ledMat = glow('#27cbff', 4.5);
  const capX = new THREE.Mesh(new THREE.BoxGeometry(Z.w, 0.07, 0.36), ledMat);
  capX.position.set(0, WALL_H + 0.035, -HD + 0.16);
  const capL = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.07, Z.d), ledMat);
  capL.position.set(-HW + 0.16, WALL_H + 0.035, 0);
  const capR = capL.clone();
  capR.position.x = HW - 0.16;
  const cutGeo = new THREE.BoxGeometry(0.36, WALL_H, 0.05);
  const cutL = new THREE.Mesh(cutGeo, ledMat);
  cutL.position.set(-HW + 0.16, WALL_H / 2, HD + 0.02);
  const cutR = cutL.clone();
  cutR.position.x = HW - 0.16;
  const cutFloor = new THREE.Mesh(new THREE.BoxGeometry(Z.w, 0.05, 0.05), ledMat);
  cutFloor.position.set(0, FLOOR_Y, HD + 0.02);
  group.add(capX, capL, capR, cutL, cutR, cutFloor);

  // 顶部桁架（横梁）
  const beamMat = std('#fdfdfd', { roughness: 0.4, metalness: 0.1 });
  const beamGeo = new THREE.BoxGeometry(0.12, 0.16, Z.d - 0.4);
  const nBeams = Math.floor((COLS * pitch) / 3.4) + 1;
  const beams = instanced(beamGeo, beamMat, nBeams, { receive: false });
  const beamXs = [];
  for (let i = 0; i < nBeams; i++) {
    const x = -((nBeams - 1) * 3.4) / 2 + i * 3.4;
    beamXs.push(x);
    writeTRS(beams.instanceMatrix.array, i, x, TRUSS_Y, 0, 0, 1, 1, 1);
  }
  group.add(beams);
  // 洁净室顶部灯带（FFU 光条）
  const lightMat = glow('#bff3ff', 2.6);
  const lightGeo = new THREE.BoxGeometry(COLS * pitch + 0.8, 0.06, 0.14);
  for (const b of BAY_Z) {
    const m = new THREE.Mesh(lightGeo, lightMat);
    m.position.set(0, TRUSS_Y - 0.12, b);
    group.add(m);
  }

  /* ---------- 天车轨道（AMHS）与晶圆盒 ---------- */
  const L = COLS * pitch - 0.2;
  const railMat = std('#dfe6ee', { roughness: 0.25, metalness: 0.65 });
  const hangers = [];
  BAY_Z.forEach((zc) => {
    const tube = new THREE.Mesh(new THREE.TubeGeometry(new LoopCurve(L, LOOP_R, zc, RAIL_Y), 220, 0.05, 6, true), railMat);
    tube.castShadow = false;
    group.add(tube);
    for (const x of beamXs) for (const dz of [-LOOP_R, LOOP_R]) {
      if (Math.abs(x) <= L / 2) hangers.push([x, zc + dz]);
    }
  });
  const hangerGeo = new THREE.CylinderGeometry(0.025, 0.025, TRUSS_Y - RAIL_Y, 6);
  const hangerMesh = instanced(hangerGeo, railMat, hangers.length, { cast: false, receive: false });
  hangers.forEach(([x, z], i) => writeTRS(hangerMesh.instanceMatrix.array, i, x, (TRUSS_Y + RAIL_Y) / 2, z, 0, 1, 1, 1));
  group.add(hangerMesh);

  const CPL = Math.max(4, Math.ceil(MAX.produced / CARRIER_KW / BAY_Z.length));
  const NC = CPL * BAY_Z.length;
  const carrierBody = instanced(rbox(0.36, 0.3, 0.34, 0.06, 2), std('#ffffff', { roughness: 0.3 }), NC, { cast: false, receive: false });
  const carrierBand = instanced(new THREE.BoxGeometry(0.38, 0.06, 0.36), glow('#ffffff', 1), NC, { cast: false, receive: false });
  initColors(carrierBand, '#ffffff');
  const carrierPhase = new Float32Array(NC);
  for (let i = 0; i < NC; i++) {
    carrierPhase[i] = ((Math.floor(i / BAY_Z.length) * 0.6180339) + (i % BAY_Z.length) * 0.29) % 1;
    const warm = i % 5 === 2;
    if (warm) writeColor(carrierBand, i, 5.0, 2.4, 0.6);
    else writeColor(carrierBand, i, 0.6, 3.6, 5.0);
  }
  carrierBand.instanceColor.needsUpdate = true;
  group.add(carrierBody, carrierBand);
  const P = 2 * L + 2 * Math.PI * LOOP_R;
  const tmp = {};
  let carrierDist = 0;

  /* ---------- 设备模块（实例化） ---------- */
  const bodyMesh = instanced(rbox(TW, TH, TD, 0.13, 3), std('#e9eff5', { roughness: 0.34, metalness: 0.05 }), SLOTS);
  const kickMesh = instanced(rbox(TW - 0.04, 0.14, TD - 0.04, 0.04, 1), std('#c9d3de', { roughness: 0.5 }), SLOTS, { cast: false });
  const windowMesh = instanced(new THREE.BoxGeometry(0.86, 0.5, 0.025), new THREE.MeshBasicMaterial({ color: '#ffffff' }), SLOTS, { cast: false, receive: false });
  const statusMesh = instanced(new THREE.BoxGeometry(1.0, 0.05, 0.08), new THREE.MeshBasicMaterial({ color: '#ffffff' }), SLOTS, { cast: false, receive: false });
  const wTex = waferTexture();
  wTex.center.set(0.5, 0.5);
  const waferMat = new THREE.MeshBasicMaterial({ map: wTex, color: '#ffffff' });
  waferMat.color.multiplyScalar(1.9);
  const waferMesh = instanced(new THREE.CylinderGeometry(0.31, 0.31, 0.022, 40), waferMat, SLOTS, { cast: false, receive: false });
  const topMesh = instanced(rbox(TW - 0.14, 0.05, TD - 0.34, 0.02, 1), new THREE.MeshBasicMaterial({ color: '#ffffff' }), SLOTS, { cast: false, receive: false });
  initColors(windowMesh, '#ffffff');
  initColors(statusMesh, '#ffffff');
  initColors(topMesh, '#ffffff');
  group.add(bodyMesh, kickMesh, windowMesh, statusMesh, waferMesh, topMesh);

  // 施工中：半透明幽灵模块 + 脚手架 + 预留地标
  const ghostMat = new THREE.MeshBasicMaterial({ color: '#5fe0ff', transparent: true, opacity: 0.32, depthWrite: false });
  const ghostMesh = instanced(new THREE.BoxGeometry(TW, TH, TD), ghostMat, SLOTS, { cast: false, receive: false });
  const cageMesh = instanced(cageGeometry(TW + 0.2, TH + 0.25, TD + 0.2, 0.065), std('#ffb23f', { roughness: 0.45, emissive: '#ff8a00', emissiveIntensity: 0.55 }), SLOTS, { receive: false });
  const markMat = new THREE.MeshBasicMaterial({ map: hatchTexture(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const markGeo = new THREE.PlaneGeometry(TW + 0.18, TD + 0.18);
  markGeo.rotateX(-Math.PI / 2);
  const markMesh = instanced(markGeo, markMat, SLOTS, { cast: false, receive: false });
  initColors(markMesh, '#ffffff');
  group.add(ghostMesh, cageMesh, markMesh);

  /* ---------- 塔吊（有扩产在建时出现） ---------- */
  const crane = new THREE.Group();
  const craneMat = std('#ffbe3b', { roughness: 0.45, metalness: 0.15, emissive: '#ff9800', emissiveIntensity: 0.12 });
  const mastParts = [];
  for (let i = 0; i < 9; i++) {
    const g = cageGeometry(0.62, 1.0, 0.62, 0.06);
    g.translate(0, 0.5 + i * 1.0, 0);
    mastParts.push(g);
  }
  const mast = new THREE.Mesh(mergeGeometries(mastParts), craneMat);
  mast.castShadow = true;
  crane.add(mast);
  const slew = new THREE.Group();
  slew.position.y = 9.1;
  crane.add(slew);
  const jibGeo = cageGeometry(9.5, 0.55, 0.55, 0.05);
  jibGeo.translate(4.75 + 0.3, 0, 0);
  const jib = new THREE.Mesh(jibGeo, craneMat);
  const cjGeo = cageGeometry(3.2, 0.5, 0.5, 0.05);
  cjGeo.translate(-1.9, 0, 0);
  const counterJib = new THREE.Mesh(cjGeo, craneMat);
  const weight = new THREE.Mesh(rbox(1.0, 0.8, 0.8, 0.08), std('#e9edf2', { roughness: 0.6 }));
  weight.position.set(-3.1, -0.45, 0);
  const cab = new THREE.Mesh(rbox(0.8, 0.7, 0.75, 0.1), std('#ffffff', { roughness: 0.3 }));
  cab.position.set(0.2, -0.55, 0.62);
  const apex = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1.6, 4), craneMat);
  apex.position.set(0, 1.0, 0);
  const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1, 4), std('#5b6573'));
  const hook = new THREE.Mesh(rbox(0.32, 0.3, 0.32, 0.06), std('#2e3a48', { roughness: 0.5 }));
  const cableX = 7.2;
  slew.add(jib, counterJib, weight, cab, apex, cable, hook);
  crane.position.set(HW + 1.5, 0, 4.4);
  crane.scale.setScalar(0.001);
  crane.visible = false;
  crane.userData.dynamic = true;
  group.add(crane);

  /* ---------- 状态更新（每次补间帧调用） ---------- */
  const onlineArr = new Float32Array(SLOTS);
  function slotStatus(s, disp) {
    const ph = slotPhase[s];
    if (ph === -1) return { on: 1, site: 0, prog: 1 };
    if (ph === -2) return { on: 0, site: 0, prog: 0 };
    return { on: disp['on' + ph], site: disp['site' + ph], prog: disp['prog' + ph] };
  }

  let craneLevel = 0;
  let utilization = 1, produced = 0;

  function update(disp) {
    utilization = disp.utilization;
    produced = disp.produced;
    let onlineCount = 0;
    const st = [];
    for (let s = 0; s < SLOTS; s++) {
      const v = slotStatus(s, disp);
      st.push(v);
      onlineArr[s] = v.on;
      onlineCount += v.on;
    }
    const idleAmount = (1 - clamp(disp.utilization, 0, 1)) * onlineCount;
    const bA = bodyMesh.instanceMatrix.array, kA = kickMesh.instanceMatrix.array, wA = windowMesh.instanceMatrix.array;
    const sA = statusMesh.instanceMatrix.array, fA = waferMesh.instanceMatrix.array, tA = topMesh.instanceMatrix.array;
    const gA = ghostMesh.instanceMatrix.array, cA = cageMesh.instanceMatrix.array, mA = markMesh.instanceMatrix.array;
    let site = 0;
    for (let s = 0; s < SLOTS; s++) {
      const { on, site: si, prog } = st[s];
      site = Math.max(site, si);
      const x = slotX[s], z = slotZ[s], f = slotFace[s];
      const ry = f > 0 ? 0 : Math.PI;
      const k = smooth(clamp(on, 0, 1));
      const rank = idleRank[s];
      const idle = rank >= 0 ? clamp(idleAmount - rank, 0, 1) : 0;
      const act = k * (1 - idle);
      if (k > 0.001) {
        writeTRS(bA, s, x, FLOOR_Y + (TH / 2) * k, z, ry, 1, k, 1);
        writeTRS(kA, s, x, FLOOR_Y + 0.07 * k, z, ry, 1, k, 1);
        writeTRS(wA, s, x, FLOOR_Y + (TH * 0.62) * k, z + f * (TD / 2 + 0.014), ry, k, k, 1);
        writeTRS(sA, s, x, FLOOR_Y + (TH + 0.03) * k, z + f * (TD / 2 - 0.08), ry, 1, k, 1);
        writeTRS(tA, s, x, FLOOR_Y + (TH + 0.012) * k, z - f * 0.1, ry, 1, k, 1);
      } else {
        writeTRS(tA, s, x, -5, z, 0, 0, 0, 0);
        writeTRS(bA, s, x, -5, z, 0, 0, 0, 0);
        writeTRS(kA, s, x, -5, z, 0, 0, 0, 0);
        writeTRS(wA, s, x, -5, z, 0, 0, 0, 0);
        writeTRS(sA, s, x, -5, z, 0, 0, 0, 0);
      }
      const ws = act > 0.02 ? act : 0;
      writeTRS(fA, s, x, FLOOR_Y + TH + 0.06, z - f * 0.1, 0, ws, ws, ws);
      // 状态灯：运转=青色，待机=琥珀色
      writeColor(statusMesh, s, 0.4 * act + 2.4 * (1 - act), 3.8 * act + 1.0 * (1 - act), 5.0 * act + 0.15 * (1 - act));
      writeColor(windowMesh, s, 0.08 + 0.12 * act, 0.14 + 0.5 * act, 0.2 + 0.62 * act);
      writeColor(topMesh, s, 0.62 - 0.32 * act, 0.66 + 0.24 * act, 0.72 + 0.33 * act);
      // 在建
      const sg = clamp(si, 0, 1) * (1 - k);
      if (sg > 0.001) {
        const hp = 0.35 + 0.65 * clamp(prog, 0, 1);
        writeTRS(gA, s, x, FLOOR_Y + (TH * hp) / 2, z, ry, 0.98, hp * sg, 0.98);
        writeTRS(cA, s, x, FLOOR_Y + (TH + 0.25) / 2, z, ry, sg, sg, sg);
      } else {
        writeTRS(gA, s, x, -5, z, 0, 0, 0, 0);
        writeTRS(cA, s, x, -5, z, 0, 0, 0, 0);
      }
      const ms = slotPhase[s] === -1 ? 0 : 1 - k;
      writeTRS(mA, s, x, FLOOR_Y + 0.006, z, 0, ms, 1, ms);
      const am = clamp(si, 0, 1);
      writeColor(markMesh, s, 0.55 + 1.25 * am, 0.85 - 0.05 * am, 1.0 - 0.8 * am);
    }
    for (const m of [bodyMesh, kickMesh, windowMesh, statusMesh, waferMesh, topMesh, ghostMesh, cageMesh, markMesh]) m.instanceMatrix.needsUpdate = true;
    topMesh.instanceColor.needsUpdate = true;
    statusMesh.instanceColor.needsUpdate = true;
    windowMesh.instanceColor.needsUpdate = true;
    markMesh.instanceColor.needsUpdate = true;

    craneLevel = site;
    const cs = smooth(clamp(site, 0, 1));
    crane.visible = cs > 0.002;
    crane.scale.set(1, Math.max(0.001, cs), 1);
  }

  /* ---------- 连续动画 ---------- */
  function animate(t, dt) {
    const speed = 1.1 + 1.6 * clamp(utilization, 0, 1) * (0.55 + 0.45 * produced / MAX.produced);
    carrierDist += speed * dt;
    const perLoop = produced / CARRIER_KW / BAY_Z.length;
    const bA = carrierBody.instanceMatrix.array, nA = carrierBand.instanceMatrix.array;
    for (let i = 0; i < NC; i++) {
      const bay = i % BAY_Z.length, j = Math.floor(i / BAY_Z.length);
      const vis = clamp(perLoop - j, 0, 1);
      if (vis <= 0.001) {
        writeTRS(bA, i, 0, -5, 0, 0, 0, 0, 0);
        writeTRS(nA, i, 0, -5, 0, 0, 0, 0, 0);
        continue;
      }
      loopPoint(carrierPhase[i] * P + carrierDist * (bay === 1 ? 0.92 : 1), L, LOOP_R, BAY_Z[bay], tmp);
      writeTRS(bA, i, tmp.x, RAIL_Y - 0.3, tmp.z, tmp.ry, vis, vis, vis);
      writeTRS(nA, i, tmp.x, RAIL_Y - 0.19, tmp.z, tmp.ry, vis, vis, vis);
    }
    carrierBody.instanceMatrix.needsUpdate = true;
    carrierBand.instanceMatrix.needsUpdate = true;
    wTex.rotation = t * 0.35;
    if (crane.visible) {
      slew.rotation.y = Math.PI + 0.42 * Math.sin(t * 0.22);
      const drop = 3.2 + 1.2 * Math.sin(t * 0.5);
      cable.scale.y = drop;
      cable.position.set(cableX, -drop / 2, 0);
      hook.position.set(cableX, -drop - 0.15, 0);
    }
    setGlow(ledMat, 4.2 + 0.4 * Math.sin(t * 1.3));
  }

  const expansionCenterX = (() => {
    let a = 0, n = 0;
    for (let s = 0; s < SLOTS; s++) if (slotPhase[s] >= 0) { a += slotX[s]; n++; }
    return n ? a / n : 0;
  })();

  return {
    group,
    update,
    animate,
    anchors: {
      label: new THREE.Vector3(Z.x - 4, WALL_H + 1.6, Z.z - 2.5),
      build: new THREE.Vector3(Z.x + expansionCenterX, WALL_H + 0.6, Z.z + 1.5),
    },
    info: { SLOTS, COLS, baseTools, totalTools },
    get craneLevel() { return craneLevel; },
  };
}
