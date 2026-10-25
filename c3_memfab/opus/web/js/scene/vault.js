import * as THREE from 'three';
import { ZONES } from './layout.js';
import { std, glow, setGlow, instanced, writeTRS, canvasTexture, clamp, mulberry32 } from './util.js';
import { MAX } from '../data.js';

const PLINTH_H = 0.36;
const BAR = { len: 0.92, wid: 0.44, h: 0.2, topScale: 0.78 };
const LAYERS = [[7, 6], [6, 5], [5, 4], [4, 3], [3, 2], [2, 1]];
const PILE = { x: 0.3, z: 0.8 };

function barGeometry() {
  const b = BAR.wid / 2, a = b * BAR.topScale;
  const g = new THREE.CylinderGeometry(a * Math.SQRT2, b * Math.SQRT2, BAR.h, 4, 1);
  g.rotateY(Math.PI / 4);
  g.scale(BAR.len / BAR.wid, 1, 1);
  const ng = g.toNonIndexed();
  g.dispose();
  ng.computeVertexNormals();
  return ng;
}

/* 金库：现金 = 金条金字塔（数量按平方根刻度）+ 金色光柱；数字始终以标签精确显示 */
export function createVault() {
  const Z = ZONES.vault;
  const group = new THREE.Group();
  group.position.set(Z.x, 0, Z.z);

  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(4.35, 4.55, PLINTH_H, 96), std('#fffaf1', { roughness: 0.32 }));
  plinth.position.y = PLINTH_H / 2;
  plinth.castShadow = true; plinth.receiveShadow = true;
  const inner = new THREE.Mesh(new THREE.CylinderGeometry(3.75, 3.75, 0.02, 96), std('#fbefd2', { roughness: 0.4, metalness: 0.1 }));
  inner.position.y = PLINTH_H + 0.01;
  inner.receiveShadow = true;
  const ringMat = glow('#ffc23d', 4.5);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(4.36, 0.05, 8, 160), ringMat);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = PLINTH_H;
  group.add(plinth, inner, ring);

  /* 弧形后墙 */
  const sector = (r0, r1, a0, a1) => {
    const s = new THREE.Shape();
    s.absarc(0, 0, r1, a0, a1, false);
    s.absarc(0, 0, r0, a1, a0, true);
    s.closePath();
    return s;
  };
  const a0 = THREE.MathUtils.degToRad(18), a1 = THREE.MathUtils.degToRad(162);
  const wallGeo = new THREE.ExtrudeGeometry(sector(3.9, 4.25, a0, a1), { depth: 3.1, bevelEnabled: false, curveSegments: 48 });
  wallGeo.rotateX(-Math.PI / 2);
  const wall = new THREE.Mesh(wallGeo, std('#fffdf8', { roughness: 0.45 }));
  wall.position.y = PLINTH_H;
  wall.castShadow = true; wall.receiveShadow = true;
  const capGeo = new THREE.ExtrudeGeometry(sector(3.88, 4.27, a0, a1), { depth: 0.07, bevelEnabled: false, curveSegments: 48 });
  capGeo.rotateX(-Math.PI / 2);
  const cap = new THREE.Mesh(capGeo, ringMat);
  cap.position.y = PLINTH_H + 3.1;
  group.add(wall, cap);

  /* 圆形金库门（敞开） */
  const steel = std('#dfe4ea', { roughness: 0.28, metalness: 0.85 });
  const door = new THREE.Group();
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.45, 64), steel);
  disc.rotation.x = Math.PI / 2;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.1, 12, 64), std('#ffd25a', { metalness: 1, roughness: 0.22, emissive: '#ff9f1c', emissiveIntensity: 0.15 }));
  rim.position.z = 0.23;
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.2, 32), std('#ffd25a', { metalness: 1, roughness: 0.25 }));
  hub.rotation.x = Math.PI / 2;
  hub.position.z = 0.3;
  door.add(disc, rim, hub);
  for (let i = 0; i < 3; i++) {
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.09, 0.09), steel);
    spoke.rotation.z = (i * Math.PI) / 3;
    spoke.position.z = 0.32;
    door.add(spoke);
  }
  for (let i = 0; i < 10; i++) {
    const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.5, 10), steel);
    const a = (i / 10) * Math.PI * 2;
    bolt.position.set(Math.cos(a) * 1.25, Math.sin(a) * 1.25, 0);
    bolt.rotation.x = Math.PI / 2;
    door.add(bolt);
  }
  door.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  door.position.set(-4.5, 1.52, 1.6);
  door.rotation.y = 0.75;
  group.add(door);

  /* 金条 */
  const slots = [];
  LAYERS.forEach(([nx, nz], l) => {
    const layer = [];
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
      const x = (i - (nx - 1) / 2) * (BAR.len + 0.05);
      const z = (j - (nz - 1) / 2) * (BAR.wid + 0.05);
      layer.push([x + PILE.x, PLINTH_H + 0.02 + BAR.h / 2 + l * BAR.h, z + PILE.z, Math.hypot(x * 0.55, z)]);
    }
    layer.sort((p, q) => p[3] - q[3]);
    slots.push(...layer);
  });
  const NB = slots.length;
  const goldMat = std('#ffcf4a', { metalness: 1, roughness: 0.2, emissive: '#ff9a12', emissiveIntensity: 0.2, flatShading: true });
  const bars = instanced(barGeometry(), goldMat, NB);
  group.add(bars);

  /* 光柱 + 金色光点 */
  const beamTex = canvasTexture(64, 256, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, 'rgba(255,214,110,0)');
    grd.addColorStop(0.55, 'rgba(255,200,80,0.28)');
    grd.addColorStop(1, 'rgba(255,190,60,0.85)');
    g.fillStyle = grd;
    g.fillRect(0, 0, w, h);
  });
  const beamMat = new THREE.MeshBasicMaterial({ map: beamTex, transparent: true, depthWrite: false, side: THREE.DoubleSide });
  beamMat.color.set('#ffd25e').multiplyScalar(1.1);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.75, 1, 48, 1, true), beamMat);
  beam.renderOrder = 2;
  beam.userData.dynamic = true;
  group.add(beam);

  const NSP = 70;
  const spGeo = new THREE.BufferGeometry();
  const spPos = new Float32Array(NSP * 3);
  spGeo.setAttribute('position', new THREE.BufferAttribute(spPos, 3).setUsage(THREE.DynamicDrawUsage));
  const dotTex = canvasTexture(64, 64, (g, w) => {
    const grd = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    grd.addColorStop(0, 'rgba(255,240,200,1)');
    grd.addColorStop(0.35, 'rgba(255,200,90,0.6)');
    grd.addColorStop(1, 'rgba(255,190,60,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, w, w);
  });
  const spMat = new THREE.PointsMaterial({ map: dotTex, size: 0.32, sizeAttenuation: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  spMat.color.setScalar(3.0);
  const sparkles = new THREE.Points(spGeo, spMat);
  sparkles.frustumCulled = false;
  group.add(sparkles);
  const rnd = mulberry32(21);
  const sp = Array.from({ length: NSP }, () => ({ a: rnd() * Math.PI * 2, r: 0.3 + rnd() * 1.4, s: 0.25 + rnd() * 0.5, o: rnd() }));

  let beamH = 1;
  function update(disp) {
    const f = Math.sqrt(clamp(disp.cash, 0, MAX.cash) / MAX.cash);
    const n = NB * f;
    const a = bars.instanceMatrix.array;
    for (let i = 0; i < NB; i++) {
      const v = clamp(n - i, 0, 1);
      const [x, y, z] = slots[i];
      if (v <= 0.001) { writeTRS(a, i, x, -5, z, 0, 0, 0, 0); continue; }
      writeTRS(a, i, x, y - (BAR.h / 2) * (1 - v), z, 0, v, v, v);
    }
    bars.count = Math.min(NB, Math.ceil(n - 1e-6));
    bars.instanceMatrix.needsUpdate = true;
    beamH = 1.2 + 9.5 * f;
    beam.scale.set(1, beamH, 1);
    beam.position.set(PILE.x, PLINTH_H + beamH / 2, PILE.z);
  }

  function animate(t) {
    for (let i = 0; i < NSP; i++) {
      const p = sp[i];
      const u = (t * p.s * 0.25 + p.o) % 1;
      spPos[i * 3] = PILE.x + Math.cos(p.a + t * 0.3) * p.r;
      spPos[i * 3 + 1] = PLINTH_H + 0.4 + u * beamH;
      spPos[i * 3 + 2] = PILE.z + Math.sin(p.a + t * 0.3) * p.r * 0.7;
    }
    spGeo.attributes.position.needsUpdate = true;
    setGlow(ringMat, 4.2 + 0.6 * Math.sin(t * 1.6));
  }

  return {
    group, update, animate,
    anchors: { label: new THREE.Vector3(Z.x, 4.9, Z.z - 0.2) },
  };
}
