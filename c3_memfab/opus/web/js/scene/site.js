import * as THREE from 'three';
import { PLATFORM, STREET, ZONES } from './layout.js';
import { rbox, std, glow, instanced, writeTRS, canvasTexture, roundRect, mulberry32, initColors, writeColor } from './util.js';

/* 平台底座（石板灰）+ 场地平面图 + 阴影承接面 + 树木 + 小人 */
export function createSite() {
  const group = new THREE.Group();
  const W = PLATFORM.x1 - PLATFORM.x0, D = PLATFORM.z1 - PLATFORM.z0;
  const cx = (PLATFORM.x0 + PLATFORM.x1) / 2, cz = (PLATFORM.z0 + PLATFORM.z1) / 2;
  const BASE_H = 1.7;

  /* 背景上只显示阴影的承接面 + 底座下方的柔和接触阴影 */
  const catcher = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.ShadowMaterial({ color: '#2b2f55', opacity: 0.22 }));
  catcher.rotation.x = -Math.PI / 2;
  catcher.position.y = -BASE_H;
  catcher.receiveShadow = true;
  group.add(catcher);
  const aoTex = canvasTexture(256, 256, (g, w, h) => {
    const grd = g.createRadialGradient(w / 2, h / 2, w * 0.22, w / 2, h / 2, w / 2);
    grd.addColorStop(0, 'rgba(40,40,80,0.55)');
    grd.addColorStop(0.55, 'rgba(40,40,80,0.18)');
    grd.addColorStop(1, 'rgba(40,40,80,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, w, h);
  }, { srgb: true });
  const ao = new THREE.Mesh(new THREE.PlaneGeometry(W * 1.45, D * 1.75), new THREE.MeshBasicMaterial({ map: aoTex, transparent: true, depthWrite: false }));
  ao.rotation.x = -Math.PI / 2;
  ao.position.set(cx, -BASE_H + 0.01, cz + 1.5);
  ao.renderOrder = -1;
  group.add(ao);

  /* 底座 */
  const slab = new THREE.Mesh(rbox(W, BASE_H, D, 0.6, 3), std('#4f5661', { roughness: 0.55, metalness: 0.05 }));
  slab.position.set(cx, -BASE_H / 2, cz);
  slab.castShadow = true;
  slab.receiveShadow = true;
  group.add(slab);

  /* 底座侧面发光线 */
  const trimMat = glow('#2ccfff', 3.5);
  const trimGeoX = new THREE.BoxGeometry(W - 1.3, 0.06, 0.06);
  const trimGeoZ = new THREE.BoxGeometry(0.06, 0.06, D - 1.3);
  const trims = [
    [trimGeoX, cx, cz + D / 2 + 0.005], [trimGeoX, cx, cz - D / 2 - 0.005],
    [trimGeoZ, cx + W / 2 + 0.005, cz], [trimGeoZ, cx - W / 2 - 0.005, cz],
  ];
  for (const [g, x, z] of trims) {
    const m = new THREE.Mesh(g, trimMat);
    m.position.set(x, -0.5, z);
    group.add(m);
  }

  /* 场地平面图纹理（深色石板地面上的浅色标线） */
  const PX = 30;
  const tex = canvasTexture(Math.round(W * PX), Math.round(D * PX), (g, w, h) => {
    const X = (x) => (x - PLATFORM.x0) * PX;
    const Z = (z) => (z - PLATFORM.z0) * PX;
    g.fillStyle = '#6b727c';
    g.fillRect(0, 0, w, h);
    // 细网格
    g.lineWidth = 1;
    for (let x = Math.ceil(PLATFORM.x0); x <= PLATFORM.x1; x++) {
      g.strokeStyle = x % 5 === 0 ? 'rgba(255,255,255,0.085)' : 'rgba(255,255,255,0.035)';
      g.beginPath(); g.moveTo(X(x), 0); g.lineTo(X(x), h); g.stroke();
    }
    for (let z = Math.ceil(PLATFORM.z0); z <= PLATFORM.z1; z++) {
      g.strokeStyle = z % 5 === 0 ? 'rgba(255,255,255,0.085)' : 'rgba(255,255,255,0.035)';
      g.beginPath(); g.moveTo(0, Z(z)); g.lineTo(w, Z(z)); g.stroke();
    }
    // 主街
    g.fillStyle = '#5a6069';
    g.fillRect(X(PLATFORM.x0 + 1), Z(STREET.z0), X(PLATFORM.x1 - 1) - X(PLATFORM.x0 + 1), (STREET.z1 - STREET.z0) * PX);
    g.strokeStyle = 'rgba(255,255,255,0.6)';
    g.lineWidth = 4;
    g.setLineDash([36, 26]);
    g.beginPath(); g.moveTo(X(PLATFORM.x0 + 2), Z((STREET.z0 + STREET.z1) / 2)); g.lineTo(X(PLATFORM.x1 - 2), Z((STREET.z0 + STREET.z1) / 2)); g.stroke();
    g.setLineDash([]);
    g.strokeStyle = 'rgba(255,255,255,0.22)';
    g.lineWidth = 3;
    for (const z of [STREET.z0, STREET.z1]) { g.beginPath(); g.moveTo(X(PLATFORM.x0 + 1), Z(z)); g.lineTo(X(PLATFORM.x1 - 1), Z(z)); g.stroke(); }
    // 前排各区的铺装（与区域色呼应）
    const pad = (x, z, pw, pd, fill, stroke) => {
      g.fillStyle = fill;
      roundRect(g, X(x - pw / 2), Z(z - pd / 2), pw * PX, pd * PX, 1.2 * PX);
      g.fill();
      g.strokeStyle = stroke;
      g.lineWidth = 4;
      g.stroke();
    };
    pad(ZONES.vault.x, ZONES.vault.z, 12.5, 10.5, 'rgba(255,205,90,0.10)', 'rgba(255,205,90,0.55)');
    pad(ZONES.debt.x, ZONES.debt.z, 9.5, 10.5, 'rgba(255,110,95,0.10)', 'rgba(255,110,95,0.55)');
    pad(ZONES.boardroom.x, ZONES.boardroom.z, 15, 10.5, 'rgba(230,180,130,0.10)', 'rgba(230,180,130,0.5)');
    pad(ZONES.market.x, ZONES.market.z, 15, 10.5, 'rgba(70,180,255,0.10)', 'rgba(70,180,255,0.5)');
    // 前排到主街的步道
    g.fillStyle = 'rgba(255,255,255,0.08)';
    for (const zx of [ZONES.vault.x, ZONES.debt.x, ZONES.boardroom.x, ZONES.market.x]) {
      g.fillRect(X(zx - 1), Z(STREET.z1), 2 * PX, (4.95 - STREET.z1) * PX + 2);
    }
    // 后排建筑基底
    for (const k of ['fab', 'hbm', 'warehouse']) {
      const z = ZONES[k];
      g.fillStyle = 'rgba(0,0,0,0.12)';
      g.fillRect(X(z.x - z.w / 2 - 0.4), Z(z.z - z.d / 2 - 0.4), (z.w + 0.8) * PX, (z.d + 0.8) * PX);
    }
    // 边框
    g.strokeStyle = 'rgba(255,255,255,0.28)';
    g.lineWidth = 3;
    roundRect(g, 0.7 * PX, 0.7 * PX, w - 1.4 * PX, h - 1.4 * PX, 1.2 * PX);
    g.stroke();
  }, { aniso: 8 });
  const plan = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.9, D - 0.9), std('#ffffff', { map: tex, roughness: 0.7, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }));
  plan.rotation.x = -Math.PI / 2;
  plan.position.set(cx, 0.004, cz);
  plan.receiveShadow = true;
  tex.repeat.set((W - 0.9) / W, (D - 0.9) / D);
  tex.offset.set(0.45 / W, 0.45 / D);
  group.add(plan);

  /* 树（建筑模型风格的“棒棒糖树”） */
  const rand = mulberry32(7);
  const treeSpots = [];
  const addRow = (x0, x1, z, step) => {
    for (let x = x0; x <= x1; x += step) treeSpots.push([x + (rand() - 0.5) * 0.9, z + (rand() - 0.5) * 0.7, 0.75 + rand() * 0.5]);
  };
  addRow(PLATFORM.x0 + 2, PLATFORM.x1 - 2, PLATFORM.z1 - 1.9, 3.1);
  addRow(PLATFORM.x0 + 2.5, PLATFORM.x1 - 2.5, PLATFORM.z0 + 2.2, 3.6);
  for (let z = PLATFORM.z0 + 5; z <= PLATFORM.z1 - 5; z += 3.4) {
    treeSpots.push([PLATFORM.x0 + 1.8 + (rand() - 0.5) * 0.5, z, 0.8 + rand() * 0.45]);
    treeSpots.push([PLATFORM.x1 - 1.8 + (rand() - 0.5) * 0.5, z, 0.8 + rand() * 0.45]);
  }
  for (const x of [-31, -19.5, -8, 9.5, 16.5, 31]) treeSpots.push([x, STREET.z1 + 0.9, 0.7 + rand() * 0.25]);

  const canopyGeo = new THREE.SphereGeometry(0.85, 18, 12);
  canopyGeo.scale(1, 1.12, 1);
  const trunkGeo = new THREE.CylinderGeometry(0.07, 0.1, 1.1, 8);
  const canopy = instanced(canopyGeo, std('#ffffff', { roughness: 0.85 }), treeSpots.length);
  const trunks = instanced(trunkGeo, std('#d8c8b2', { roughness: 0.9 }), treeSpots.length, { receive: false });
  initColors(canopy, '#ffffff');
  const greens = [[0.55, 0.85, 0.66], [0.66, 0.90, 0.74], [0.80, 0.94, 0.84], [0.48, 0.80, 0.64]];
  treeSpots.forEach(([x, z, s], i) => {
    writeTRS(trunks.instanceMatrix.array, i, x, 0.55 * s, z, 0, s, s, s);
    writeTRS(canopy.instanceMatrix.array, i, x, (1.1 + 0.75) * s, z, 0, s, s, s);
    const c = greens[i % greens.length];
    writeColor(canopy, i, c[0], c[1], c[2]);
  });
  canopy.instanceColor.needsUpdate = true;
  group.add(canopy, trunks);

  /* 小人（比例尺），部分沿主街行走 */
  const PEOPLE = 30;
  const bodyGeo = new THREE.CapsuleGeometry(0.13, 0.36, 4, 10);
  const headGeo = new THREE.SphereGeometry(0.12, 12, 8);
  const bodies = instanced(bodyGeo, std('#ffffff', { roughness: 0.6 }), PEOPLE, { cast: false, receive: false });
  const heads = instanced(headGeo, std('#fbf6f0', { roughness: 0.6 }), PEOPLE, { cast: false, receive: false });
  initColors(bodies, '#ffffff');
  const shirt = [[0.98, 0.98, 0.98], [0.2, 0.62, 0.95], [0.98, 0.98, 0.98], [1.0, 0.55, 0.35], [0.98, 0.98, 0.98], [0.55, 0.42, 0.95]];
  const people = [];
  for (let i = 0; i < PEOPLE; i++) {
    const walking = i < 14;
    const lane = STREET.z0 + 0.5 + rand() * (STREET.z1 - STREET.z0 - 1);
    people.push({
      x: PLATFORM.x0 + 3 + rand() * (W - 6),
      z: walking ? lane : (rand() < 0.5 ? STREET.z0 + 0.3 : STREET.z1 - 0.3) + (rand() - 0.5) * 0.4,
      dir: rand() < 0.5 ? -1 : 1,
      speed: walking ? 0.9 + rand() * 0.6 : 0,
      phase: rand() * 10,
    });
    const c = shirt[i % shirt.length];
    writeColor(bodies, i, c[0], c[1], c[2]);
  }
  bodies.instanceColor.needsUpdate = true;
  group.add(bodies, heads);

  const xMin = PLATFORM.x0 + 2, xMax = PLATFORM.x1 - 2, span = xMax - xMin;
  function placePeople(t) {
    const ba = bodies.instanceMatrix.array, ha = heads.instanceMatrix.array;
    for (let i = 0; i < PEOPLE; i++) {
      const p = people[i];
      let x = p.x;
      if (p.speed > 0) {
        const d = (p.x - xMin + p.dir * p.speed * t) % span;
        x = xMin + (d < 0 ? d + span : d);
      }
      const bob = p.speed > 0 ? Math.abs(Math.sin(t * 7 + p.phase)) * 0.03 : 0;
      const ry = p.speed > 0 ? (p.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : p.phase;
      writeTRS(ba, i, x, 0.31 + bob, p.z, ry, 1, 1, 1);
      writeTRS(ha, i, x, 0.78 + bob, p.z, ry, 1, 1, 1);
    }
    bodies.instanceMatrix.needsUpdate = true;
    heads.instanceMatrix.needsUpdate = true;
  }
  placePeople(0);

  return {
    group,
    animate(t) { placePeople(t); },
  };
}
