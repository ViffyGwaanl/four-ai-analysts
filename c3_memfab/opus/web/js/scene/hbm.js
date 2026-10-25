import * as THREE from 'three';
import { ZONES } from './layout.js';
import { rbox, std, glow, setGlow, instanced, writeTRS, initColors, writeColor, canvasTexture, clamp, smooth } from './util.js';
import { MAX, HBM_LAYERS } from '../data.js';

const FLOOR_Y = 0.22;
const WALL_H = 4.7;
const GRID_X = 5;
const SLAB_H = 0.15, GAP = 0.07, PITCH_Y = SLAB_H + GAP;
const PED_H = 0.3;

/* HBM 产线：紫/品红色调，堆叠芯片塔（每层 = 1 千片 HBM） */
export function createHbm() {
  const Z = ZONES.hbm;
  const group = new THREE.Group();
  group.position.set(Z.x, 0, Z.z);
  const HW = Z.w / 2, HD = Z.d / 2;

  const TOWERS = Math.max(GRID_X, Math.ceil(MAX.hbmOutput / HBM_LAYERS / GRID_X) * GRID_X);
  const GRID_Z = TOWERS / GRID_X;
  const px = (Z.w - 2.4) / GRID_X, pz = (Z.d - 3.2) / GRID_Z;

  /* 地坪与墙 */
  const floorTex = canvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = '#857ca6';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(255,255,255,0.32)';
    g.lineWidth = 3;
    g.strokeRect(1.5, 1.5, w - 3, h - 3);
    g.strokeStyle = 'rgba(255,255,255,0.12)';
    g.lineWidth = 2;
    g.strokeRect(w / 4, h / 4, w / 2, h / 2);
  }, { repeat: [Z.w / 2, Z.d / 2], aniso: 8 });
  const side = std('#7a7296', { roughness: 0.5 });
  const floor = new THREE.Mesh(new THREE.BoxGeometry(Z.w, FLOOR_Y, Z.d), [side, side, std('#ffffff', { map: floorTex, roughness: 0.4 }), side, side, side]);
  floor.position.y = FLOOR_Y / 2;
  floor.receiveShadow = true;
  group.add(floor);

  const wallMat = std('#ebe8f2', { roughness: 0.5 });
  const back = new THREE.Mesh(new THREE.BoxGeometry(Z.w, WALL_H, 0.32), wallMat);
  back.position.set(0, WALL_H / 2, -HD + 0.16);
  back.castShadow = true; back.receiveShadow = true;
  group.add(back);
  // 两侧紫色玻璃幕墙
  const glassMat = new THREE.MeshStandardMaterial({ color: '#c39bff', transparent: true, opacity: 0.3, roughness: 0.06, metalness: 0.15, depthWrite: false, side: THREE.DoubleSide });
  const frameMat = std('#f7f5fc', { roughness: 0.35, metalness: 0.1 });
  for (const sx of [-1, 1]) {
    const gl = new THREE.Mesh(new THREE.PlaneGeometry(Z.d - 0.3, WALL_H - 0.1), glassMat);
    gl.rotation.y = Math.PI / 2;
    gl.position.set(sx * (HW - 0.16), FLOOR_Y + (WALL_H - 0.1) / 2, 0.15);
    gl.renderOrder = 1;
    group.add(gl);
    for (let i = 0; i <= 5; i++) {
      const mz = -HD + 0.3 + (i * (Z.d - 0.3)) / 5;
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

  const ledMat = glow('#c264ff', 1.0);
  const capX = new THREE.Mesh(new THREE.BoxGeometry(Z.w, 0.07, 0.36), ledMat);
  capX.position.set(0, WALL_H + 0.035, -HD + 0.16);
  const capR = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.07, Z.d), ledMat);
  capR.position.set(HW - 0.16, WALL_H + 0.035, 0);
  const capL = capR.clone();
  capL.position.x = -HW + 0.16;
  const cutGeo = new THREE.BoxGeometry(0.36, WALL_H, 0.05);
  const cutL = new THREE.Mesh(cutGeo, ledMat); cutL.position.set(-HW + 0.16, WALL_H / 2, HD + 0.02);
  const cutR = cutL.clone(); cutR.position.x = HW - 0.16;
  const cutF = new THREE.Mesh(new THREE.BoxGeometry(Z.w, 0.05, 0.05), ledMat); cutF.position.set(0, FLOOR_Y, HD + 0.02);
  group.add(capX, capR, capL, cutL, cutR, cutF);

  // 背墙上的紫色光幕（点亮后）
  const panelMat = glow('#a855f7', 0.0, { transparent: true, opacity: 0.9 });
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(Z.w - 2, 0.12), panelMat);
  panel.position.set(0, 3.6, -HD + 0.33);
  group.add(panel);

  /* 塔基座 */
  const towerX = new Float32Array(TOWERS), towerZ = new Float32Array(TOWERS);
  for (let t = 0; t < TOWERS; t++) {
    const row = Math.floor(t / GRID_X), col = t % GRID_X;
    towerX[t] = (col - (GRID_X - 1) / 2) * px;
    towerZ[t] = HD - 2.0 - row * pz; // 由前往后填充
  }
  const pedestal = instanced(rbox(1.5, PED_H, 1.5, 0.08, 2), std('#ffffff', { roughness: 0.3 }), TOWERS);
  const rim = instanced(new THREE.BoxGeometry(1.56, 0.05, 1.56), new THREE.MeshBasicMaterial({ color: '#ffffff' }), TOWERS, { cast: false, receive: false });
  initColors(rim, '#ffffff');
  for (let t = 0; t < TOWERS; t++) {
    writeTRS(pedestal.instanceMatrix.array, t, towerX[t], FLOOR_Y + PED_H / 2, towerZ[t], 0, 1, 1, 1);
    writeTRS(rim.instanceMatrix.array, t, towerX[t], FLOOR_Y + PED_H * 0.55, towerZ[t], 0, 1, 1, 1);
  }
  group.add(pedestal, rim);

  /* 芯片层（白紫色晶片 + 发光键合层） */
  const NS = TOWERS * HBM_LAYERS;
  const slabMat = std('#ffffff', { roughness: 0.24, metalness: 0.12, emissive: '#4c1d95', emissiveIntensity: 0.2 });
  const slab = instanced(rbox(1.16, SLAB_H, 1.16, 0.035, 2), slabMat, NS);
  const bond = instanced(new THREE.BoxGeometry(1.02, GAP * 0.6, 1.02), new THREE.MeshBasicMaterial({ color: '#ffffff' }), NS, { cast: false, receive: false });
  initColors(slab, '#ffffff');
  initColors(bond, '#ffffff');
  for (let i = 0; i < NS; i++) {
    const layer = i % HBM_LAYERS;
    const top = layer === HBM_LAYERS - 1;
    const tint = layer % 2 === 0 ? [0.30, 0.15, 0.80] : [0.42, 0.22, 0.92];
    if (top) writeColor(slab, i, 1.0, 0.78, 0.32); else writeColor(slab, i, tint[0], tint[1], tint[2]);
  }
  slab.instanceColor.needsUpdate = true;
  group.add(slab, bond);

  /* 认证前：半透明紫色安全幕 + 研发样品线框 */
  const curtainTex = canvasTexture(512, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    const grd = g.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, 'rgba(168,85,247,0.40)');
    grd.addColorStop(1, 'rgba(217,70,239,0.22)');
    g.fillStyle = grd;
    g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(255,255,255,0.35)';
    g.lineWidth = 10;
    for (let i = -h; i < w; i += 46) { g.beginPath(); g.moveTo(i, h); g.lineTo(i + h, 0); g.stroke(); }
  });
  const curtainMat = new THREE.MeshBasicMaterial({ map: curtainTex, transparent: true, opacity: 1, depthWrite: false, side: THREE.DoubleSide });
  const curtain = new THREE.Mesh(new THREE.PlaneGeometry(Z.w - 0.7, WALL_H - 0.4), curtainMat);
  curtain.position.set(0, FLOOR_Y + (WALL_H - 0.4) / 2, HD - 0.15);
  curtain.userData.dynamic = true;
  group.add(curtain);

  const protoMat = new THREE.LineBasicMaterial({ color: '#b56cff', transparent: true, opacity: 0.9 });
  const proto = new THREE.Group();
  for (let i = 0; i < 6; i++) {
    const e = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.16, SLAB_H, 1.16)), protoMat);
    e.position.y = FLOOR_Y + PED_H + SLAB_H / 2 + i * PITCH_Y;
    proto.add(e);
  }
  proto.position.set(towerX[2], 0, towerZ[2]);
  group.add(proto);

  /* 顶部旋转光环（量产后） */
  const haloMat = glow('#e07bff', 4.5, { transparent: true, opacity: 0 });
  const halo = new THREE.Mesh(new THREE.TorusGeometry(3.4, 0.05, 8, 120), haloMat);
  halo.rotation.x = Math.PI / 2;
  halo.position.set(0, 6.4, 0.6);
  const halo2 = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.035, 8, 100), haloMat);
  halo2.rotation.x = Math.PI / 2;
  halo2.position.set(0, 6.0, 0.6);
  halo.userData.dynamic = halo2.userData.dynamic = true;
  group.add(halo, halo2);

  let lit = 0, output = 0;

  function update(disp) {
    lit = clamp(disp.hbmLit, 0, 1);
    output = Math.max(0, disp.hbmOutput);
    const sA = slab.instanceMatrix.array, bA = bond.instanceMatrix.array;
    for (let i = 0; i < NS; i++) {
      const t = Math.floor(i / HBM_LAYERS), layer = i % HBM_LAYERS;
      const v = clamp(output - i, 0, 1);
      if (v <= 0.001) {
        writeTRS(sA, i, 0, -5, 0, 0, 0, 0, 0);
        writeTRS(bA, i, 0, -5, 0, 0, 0, 0, 0);
        continue;
      }
      const y = FLOOR_Y + PED_H + layer * PITCH_Y + (SLAB_H / 2) * v;
      writeTRS(sA, i, towerX[t], y, towerZ[t], 0, v, v, v);
      writeTRS(bA, i, towerX[t], FLOOR_Y + PED_H + layer * PITCH_Y - GAP * 0.5, towerZ[t], 0, v, layer === 0 ? 0 : 1, v);
      const k = 0.5 + 4.0 * lit;
      writeColor(bond, i, 0.55 * k, 0.28 * k, 1.0 * k);
    }
    slab.count = bond.count = Math.min(NS, Math.ceil(output - 1e-6));
    slab.instanceMatrix.needsUpdate = true;
    bond.instanceMatrix.needsUpdate = true;
    bond.instanceColor.needsUpdate = true;
    for (let t = 0; t < TOWERS; t++) {
      const active = clamp(output / HBM_LAYERS - t, 0, 1) * lit;
      const k = 0.4 + 4.0 * active;
      writeColor(rim, t, 0.62 * k, 0.33 * k, 1.0 * k);
    }
    rim.instanceColor.needsUpdate = true;
    slabMat.emissiveIntensity = 0.1 + 0.45 * lit;
    curtainMat.opacity = 1 - smooth(lit);
    curtain.visible = curtainMat.opacity > 0.01;
    protoMat.opacity = 0.9 * (1 - lit);
    proto.visible = protoMat.opacity > 0.01;
    haloMat.opacity = lit;
    halo.visible = halo2.visible = lit > 0.01;
    setGlow(ledMat, 0.8 + 3.8 * lit);
    setGlow(panelMat, 4.0 * lit);
  }

  function animate(t) {
    halo.rotation.z = t * 0.25;
    halo2.rotation.z = -t * 0.38;
    halo.position.y = 6.4 + Math.sin(t * 0.9) * 0.12;
    if (proto.visible) proto.rotation.y = t * 0.5;
  }

  return {
    group, update, animate,
    anchors: { label: new THREE.Vector3(Z.x, WALL_H + 1.5, Z.z - 2.5) },
    get lit() { return lit; },
  };
}
