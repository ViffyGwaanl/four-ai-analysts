import * as THREE from 'three';
import { ZONES } from './layout.js';
import { rbox, std, glow, setGlow, instanced, writeTRS, canvasTexture, clamp } from './util.js';
import { MAX, BOX_KW } from '../data.js';

const FLOOR_Y = 0.22;
const WALL_H = 6.6;
const RACKS = 3;
const COLS = 15;
const PITCH_X = 0.72;
const LEVEL_H = 0.6;
const BASE_H = 0.28;
const BOX = { w: 0.6, h: 0.42, d: 0.54 };

/* 立体仓库：高位货架 + 晶圆箱（1 箱 = 1 千片），按层填充 */
export function createWarehouse() {
  const Z = ZONES.warehouse;
  const group = new THREE.Group();
  group.position.set(Z.x, 0, Z.z);
  const HW = Z.w / 2, HD = Z.d / 2;
  const perLevel = RACKS * COLS;
  const LEVELS = Math.max(1, Math.ceil(MAX.inventoryKw / BOX_KW / perLevel));
  const SLOTS = perLevel * LEVELS;
  const rackZ = [-4.9, -1.3, 2.3]; // 后、中、前
  const fillOrder = [2, 1, 0]; // 先填前排

  /* 地坪与墙 */
  const floorTex = canvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = '#9d9483';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(255,255,255,0.28)';
    g.lineWidth = 3;
    g.strokeRect(1.5, 1.5, w - 3, h - 3);
  }, { repeat: [Z.w / 2, Z.d / 2], aniso: 8 });
  const side = std('#8a8274', { roughness: 0.5 });
  const floor = new THREE.Mesh(new THREE.BoxGeometry(Z.w, FLOOR_Y, Z.d), [side, side, std('#ffffff', { map: floorTex, roughness: 0.45 }), side, side, side]);
  floor.position.y = FLOOR_Y / 2;
  floor.receiveShadow = true;
  group.add(floor);

  // 黄色安全线
  const lineMat = glow('#ffb43a', 2.6);
  for (const z of [rackZ[0] + 1.8, rackZ[1] + 1.8, rackZ[2] + 1.9]) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(COLS * PITCH_X + 0.6, 0.012, 0.07), lineMat);
    m.position.set(0, FLOOR_Y + 0.007, z);
    group.add(m);
  }

  const wallMat = std('#e9e4dc', { roughness: 0.6 });
  const back = new THREE.Mesh(new THREE.BoxGeometry(Z.w, WALL_H, 0.32), wallMat);
  back.position.set(0, WALL_H / 2, -HD + 0.16);
  const left = new THREE.Mesh(new THREE.BoxGeometry(0.32, WALL_H, Z.d), wallMat);
  left.position.set(-HW + 0.16, WALL_H / 2, 0);
  const right = left.clone();
  right.position.x = HW - 0.16;
  for (const m of [back, left, right]) { m.castShadow = true; m.receiveShadow = true; group.add(m); }
  const ledMat = glow('#ffab2e', 4.2);
  const capX = new THREE.Mesh(new THREE.BoxGeometry(Z.w, 0.07, 0.36), ledMat);
  capX.position.set(0, WALL_H + 0.035, -HD + 0.16);
  const capL = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.07, Z.d), ledMat);
  capL.position.set(-HW + 0.16, WALL_H + 0.035, 0);
  const capR = capL.clone(); capR.position.x = HW - 0.16;
  const cutGeo = new THREE.BoxGeometry(0.36, WALL_H, 0.05);
  const cutL = new THREE.Mesh(cutGeo, ledMat); cutL.position.set(-HW + 0.16, WALL_H / 2, HD + 0.02);
  const cutR = cutL.clone(); cutR.position.x = HW - 0.16;
  const cutF = new THREE.Mesh(new THREE.BoxGeometry(Z.w, 0.05, 0.05), ledMat); cutF.position.set(0, FLOOR_Y, HD + 0.02);
  group.add(capX, capL, capR, cutL, cutR, cutF);

  // 侧墙上的库存液位条（库存 / 历史峰值）
  const gaugeH = WALL_H - 1.4;
  const gaugeBg = new THREE.Mesh(new THREE.BoxGeometry(0.06, gaugeH, 0.5), std('#efe6d6', { roughness: 0.6 }));
  gaugeBg.position.set(-HW + 0.35, 0.7 + gaugeH / 2, 3.6);
  const gaugeMat = glow('#ffae34', 4.0);
  const gauge = new THREE.Mesh(new THREE.BoxGeometry(0.07, 1, 0.36), gaugeMat);
  gauge.position.set(-HW + 0.36, 0.7, 3.6);
  gauge.userData.dynamic = true;
  group.add(gaugeBg, gauge);

  /* 货架结构 */
  const rackH = BASE_H + LEVELS * LEVEL_H + 0.1;
  const rackLen = COLS * PITCH_X;
  const uprightMat = std('#e7ecf2', { roughness: 0.4, metalness: 0.2 });
  const beamMat = std('#ff9d2e', { roughness: 0.45, metalness: 0.1, emissive: '#ff7a00', emissiveIntensity: 0.08 });
  const nUp = RACKS * (COLS + 1) * 2;
  const uprights = instanced(new THREE.BoxGeometry(0.07, rackH, 0.07), uprightMat, nUp, { receive: false });
  const nBeam = RACKS * (LEVELS + 1) * 2;
  const beams = instanced(new THREE.BoxGeometry(rackLen + 0.07, 0.06, 0.06), beamMat, nBeam, { receive: false });
  let ui = 0, bi = 0;
  for (let r = 0; r < RACKS; r++) {
    for (let c = 0; c <= COLS; c++) for (const dz of [-0.33, 0.33]) {
      writeTRS(uprights.instanceMatrix.array, ui++, (c - COLS / 2) * PITCH_X, FLOOR_Y + rackH / 2, rackZ[r] + dz, 0, 1, 1, 1);
    }
    for (let l = 0; l <= LEVELS; l++) for (const dz of [-0.33, 0.33]) {
      writeTRS(beams.instanceMatrix.array, bi++, 0, FLOOR_Y + BASE_H + l * LEVEL_H - 0.03, rackZ[r] + dz, 0, 1, 1, 1);
    }
  }
  group.add(uprights, beams);

  /* 晶圆箱 */
  const boxMesh = instanced(rbox(BOX.w, BOX.h, BOX.d, 0.05, 2), std('#f28c12', { roughness: 0.5, metalness: 0.0, emissive: '#ff7a00', emissiveIntensity: 0.05 }), SLOTS);
  const lidMesh = instanced(rbox(BOX.w + 0.02, 0.07, BOX.d + 0.02, 0.025, 1), std('#ffffff', { roughness: 0.3 }), SLOTS, { cast: false });
  group.add(boxMesh, lidMesh);
  const slotPos = [];
  for (let s = 0; s < SLOTS; s++) {
    const level = Math.floor(s / perLevel);
    const rem = s % perLevel;
    const rack = fillOrder[Math.floor(rem / COLS)];
    const col = rem % COLS;
    slotPos.push([(col - (COLS - 1) / 2) * PITCH_X, FLOOR_Y + BASE_H + level * LEVEL_H + BOX.h / 2 + 0.01, rackZ[rack]]);
  }

  /* 堆垛机（两条巷道） */
  const aisles = [(rackZ[0] + rackZ[1]) / 2, (rackZ[1] + rackZ[2]) / 2];
  const craneMat = std('#ffffff', { roughness: 0.35 });
  const craneAccent = std('#ffa431', { roughness: 0.4, emissive: '#ff8a00', emissiveIntensity: 0.15 });
  const cranes = aisles.map((z, i) => {
    const g = new THREE.Group();
    const mast = new THREE.Mesh(new THREE.BoxGeometry(0.22, rackH + 0.3, 0.22), craneMat);
    mast.position.y = FLOOR_Y + (rackH + 0.3) / 2;
    const foot = new THREE.Mesh(rbox(0.9, 0.22, 0.5, 0.05), craneAccent);
    foot.position.y = FLOOR_Y + 0.11;
    const head = new THREE.Mesh(rbox(0.7, 0.2, 0.4, 0.05), craneAccent);
    head.position.y = FLOOR_Y + rackH + 0.35;
    const carriage = new THREE.Mesh(rbox(0.72, 0.16, 0.6, 0.04), craneAccent);
    const tote = new THREE.Mesh(rbox(BOX.w, BOX.h, BOX.d, 0.05), boxMesh.material);
    tote.position.y = 0.3;
    carriage.add(tote);
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.1), glow('#ffd27a', 6));
    lamp.position.y = rackH + 0.55;
    g.add(mast, foot, head, carriage, lamp);
    g.position.z = z;
    g.userData.dynamic = true;
    group.add(g);
    // 地轨
    const rail = new THREE.Mesh(new THREE.BoxGeometry(rackLen + 0.8, 0.04, 0.12), std('#c9cfd6', { metalness: 0.5, roughness: 0.3 }));
    rail.position.set(0, FLOOR_Y + 0.02, z);
    group.add(rail);
    return { g, carriage, phase: i * 2.1 };
  });

  /* 厂房间的物流连廊（洁净室 → 仓库）：传送带上的晶圆箱 */
  const fabEdge = ZONES.fab.x - ZONES.fab.w / 2;
  const bridgeLen = fabEdge - (Z.x + HW);
  const bridge = new THREE.Group();
  bridge.position.set(HW + bridgeLen / 2, 2.4, 4.6);
  const tubeMat = new THREE.MeshStandardMaterial({ color: '#e8f6ff', transparent: true, opacity: 0.35, roughness: 0.05, metalness: 0.1, depthWrite: false });
  const tube = new THREE.Mesh(new THREE.BoxGeometry(bridgeLen + 0.2, 0.9, 1.0), tubeMat);
  const belt = new THREE.Mesh(new THREE.BoxGeometry(bridgeLen + 0.4, 0.06, 0.6), std('#3a4656', { roughness: 0.6 }));
  belt.position.y = -0.38;
  bridge.add(tube, belt);
  const NB = 4;
  const beltBoxes = instanced(rbox(0.42, 0.3, 0.38, 0.04), boxMesh.material, NB, { cast: false, receive: false });
  bridge.add(beltBoxes);
  group.add(bridge);

  let inv = 0, flow = 0;
  function update(disp) {
    inv = Math.max(0, disp.inventoryKw / BOX_KW);
    flow = disp.produced;
    const bA = boxMesh.instanceMatrix.array, lA = lidMesh.instanceMatrix.array;
    for (let s = 0; s < SLOTS; s++) {
      const v = clamp(inv - s, 0, 1);
      const [x, y, z] = slotPos[s];
      if (v <= 0.001) {
        writeTRS(bA, s, x, -5, z, 0, 0, 0, 0);
        writeTRS(lA, s, x, -5, z, 0, 0, 0, 0);
        continue;
      }
      const yb = y - (BOX.h / 2) * (1 - v);
      writeTRS(bA, s, x, yb, z, 0, v, v, v);
      writeTRS(lA, s, x, yb + (BOX.h / 2) * v, z, 0, v, v, v);
    }
    boxMesh.count = lidMesh.count = Math.min(SLOTS, Math.ceil(inv - 1e-6));
    boxMesh.instanceMatrix.needsUpdate = true;
    lidMesh.instanceMatrix.needsUpdate = true;
    const frac = clamp(disp.inventoryKw / MAX.inventoryKw, 0, 1);
    gauge.scale.y = Math.max(0.0001, gaugeH * frac);
    gauge.position.y = 0.7 + (gaugeH * frac) / 2;
    gauge.visible = frac > 0.001;
  }

  const span = rackLen / 2 - 0.6;
  function animate(t, dt) {
    const busy = 0.6 + 0.4 * clamp(flow / MAX.produced, 0, 1);
    for (const c of cranes) {
      const p = t * 0.42 * busy + c.phase;
      c.g.position.x = Math.sin(p) * span;
      c.carriage.position.y = FLOOR_Y + 0.55 + (0.5 + 0.5 * Math.sin(p * 1.7 + 1)) * (rackH - 0.9);
    }
    const bA = beltBoxes.instanceMatrix.array;
    for (let i = 0; i < NB; i++) {
      const u = ((t * 0.35 * busy + i / NB) % 1);
      writeTRS(bA, i, bridgeLen / 2 - u * bridgeLen, -0.2, 0, 0, 1, 1, 1);
    }
    beltBoxes.instanceMatrix.needsUpdate = true;
    setGlow(ledMat, 4.0 + 0.4 * Math.sin(t * 1.1 + 1));
  }

  return {
    group, update, animate,
    anchors: { label: new THREE.Vector3(Z.x, WALL_H + 1.5, Z.z - 1.5) },
  };
}
