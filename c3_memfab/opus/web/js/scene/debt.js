import * as THREE from 'three';
import { ZONES } from './layout.js';
import { rbox, std, glow, setGlow, instanced, writeTRS, canvasTexture, clamp } from './util.js';
import { MAX, DEBT_BLOCK } from '../data.js';

const PAD_H = 0.22;
const BLOCK = { len: 1.5, h: 0.46, wid: 0.72 };
const LAYER_H = 0.48;
const GANTRY_H = 7.6;

/* 负债：珊瑚色贷款砖（1 块 = 1 个金额单位），交错码放；龙门吊吊钩跟随堆顶 */
export function createDebt() {
  const Z = ZONES.debt;
  const group = new THREE.Group();
  group.position.set(Z.x, 0, Z.z);

  const padTex = canvasTexture(512, 512, (g, w, h) => {
    g.fillStyle = '#fffaf8';
    g.fillRect(0, 0, w, h);
    const b = 46;
    g.save();
    g.beginPath();
    g.rect(0, 0, w, h);
    g.rect(b, b, w - 2 * b, h - 2 * b);
    g.clip('evenodd');
    g.fillStyle = '#ff6a5c';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = '#ffffff';
    g.lineWidth = 18;
    for (let i = -h; i < w + h; i += 52) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + h, h); g.stroke(); }
    g.restore();
    g.strokeStyle = 'rgba(255,106,92,0.35)';
    g.lineWidth = 4;
    g.setLineDash([16, 12]);
    g.strokeRect(w * 0.3, h * 0.3, w * 0.4, h * 0.4);
  }, { aniso: 8 });
  const side = std('#fbe9e6', { roughness: 0.5 });
  const pad = new THREE.Mesh(new THREE.BoxGeometry(6.6, PAD_H, 6.6), [side, side, std('#ffffff', { map: padTex, roughness: 0.5 }), side, side, side]);
  pad.position.y = PAD_H / 2;
  pad.receiveShadow = true;
  pad.castShadow = true;
  group.add(pad);

  const NB = Math.max(2, Math.ceil(MAX.debt / DEBT_BLOCK) + 1);
  const coral = std('#ff6c5e', { roughness: 0.42, emissive: '#ff3a2c', emissiveIntensity: 0.14 });
  const blocks = instanced(rbox(BLOCK.len, BLOCK.h, BLOCK.wid, 0.07, 2), coral, NB);
  const bands = instanced(new THREE.BoxGeometry(BLOCK.len + 0.02, 0.07, BLOCK.wid + 0.02), std('#ffffff', { roughness: 0.4 }), NB, { cast: false });
  group.add(blocks, bands);

  /* 龙门吊 */
  const white = std('#ffffff', { roughness: 0.35 });
  const accent = std('#ff7a6b', { roughness: 0.4, emissive: '#ff3a2c', emissiveIntensity: 0.1 });
  for (const sx of [-1, 1]) {
    const post = new THREE.Mesh(rbox(0.32, GANTRY_H, 0.32, 0.06), white);
    post.position.set(sx * 2.95, GANTRY_H / 2, -0.2);
    const foot = new THREE.Mesh(rbox(0.8, 0.18, 0.8, 0.05), accent);
    foot.position.set(sx * 2.95, 0.09, -0.2);
    post.castShadow = true;
    group.add(post, foot);
  }
  const beam = new THREE.Mesh(rbox(6.4, 0.42, 0.46, 0.08), accent);
  beam.position.set(0, GANTRY_H, -0.2);
  beam.castShadow = true;
  const beamLed = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.05, 0.05), glow('#ff8a7a', 4.5));
  beamLed.position.set(0, GANTRY_H - 0.23, 0.04);
  const trolley = new THREE.Mesh(rbox(0.8, 0.34, 0.66, 0.06), std('#3a4352', { roughness: 0.5 }));
  trolley.position.set(0, GANTRY_H - 0.36, -0.2);
  group.add(beam, beamLed, trolley);
  const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 1, 6), std('#4b5563'));
  const hookBlock = new THREE.Mesh(rbox(0.56, 0.42, 0.5, 0.07), std('#ffc93c', { roughness: 0.4, emissive: '#ff9f00', emissiveIntensity: 0.1 }));
  const hook = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.045, 8, 20, Math.PI * 1.5), std('#3a4352', { metalness: 0.6, roughness: 0.3 }));
  hook.rotation.z = Math.PI * 0.75;
  cable.userData.dynamic = hookBlock.userData.dynamic = hook.userData.dynamic = true;
  group.add(cable, hookBlock, hook);

  let hookTarget = 5.5, hookY = 5.5;
  function update(disp) {
    const n = Math.max(0, disp.debt / DEBT_BLOCK);
    const bA = blocks.instanceMatrix.array, nA = bands.instanceMatrix.array;
    for (let b = 0; b < NB; b++) {
      const v = clamp(n - b, 0, 1);
      const layer = Math.floor(b / 2), sideIdx = b % 2;
      const odd = layer % 2 === 1;
      const off = (sideIdx === 0 ? -1 : 1) * (BLOCK.wid / 2 + 0.02);
      const x = odd ? off : 0, z = odd ? 0 : off;
      const y = PAD_H + BLOCK.h / 2 + layer * LAYER_H;
      const ry = odd ? Math.PI / 2 : 0;
      if (v <= 0.001) {
        writeTRS(bA, b, x, -5, z, 0, 0, 0, 0);
        writeTRS(nA, b, x, -5, z, 0, 0, 0, 0);
        continue;
      }
      writeTRS(bA, b, x, y, z, ry, v, 1, 1);
      writeTRS(nA, b, x, y, z, ry, v, 1, 1);
    }
    blocks.count = bands.count = Math.min(NB, Math.ceil(n - 1e-6));
    blocks.instanceMatrix.needsUpdate = true;
    bands.instanceMatrix.needsUpdate = true;
    const layers = Math.ceil(n / 2 - 1e-6);
    const top = PAD_H + layers * LAYER_H;
    hookTarget = n > 0.01 ? Math.min(GANTRY_H - 1.6, top + 0.62) : GANTRY_H - 2.2;
  }

  function animate(t, dt) {
    hookY += (hookTarget - hookY) * Math.min(1, dt * 3.5);
    const sway = Math.sin(t * 0.9) * 0.04;
    const topY = GANTRY_H - 0.55;
    const len = Math.max(0.1, topY - (hookY + 0.21));
    cable.scale.y = len;
    cable.position.set(sway * 0.5, hookY + 0.21 + len / 2, -0.2);
    hookBlock.position.set(sway, hookY, -0.2);
    hook.position.set(sway, hookY - 0.38, -0.2);
    setGlow(beamLed.material, 4.2 + 0.5 * Math.sin(t * 2.0));
  }

  return {
    group, update, animate,
    anchors: { label: new THREE.Vector3(Z.x, GANTRY_H + 0.7, Z.z - 0.2) },
  };
}
