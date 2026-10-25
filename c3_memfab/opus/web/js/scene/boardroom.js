import * as THREE from 'three';
import { ZONES } from './layout.js';
import { rbox, std, glow, instanced, writeTRS, canvasTexture, roundRect, FONT } from './util.js';
import { QUARTERS, N, UNIT_MONEY } from '../data.js';
import { money } from '../format.js';

const DECK_Y = 2.5;
const ROOM_H = 2.6;
const RW = 11, RD = 6.6;

/* 董事会会议室：夹层上的玻璃房 + 长桌 + 墙面大屏（显示当季、事件、股东权益） */
export function createBoardroom() {
  const Z = ZONES.boardroom;
  const group = new THREE.Group();
  group.position.set(Z.x, 0, Z.z);
  const hx = RW / 2, hz = RD / 2;

  /* 夹层平台与柱 */
  const white = std('#eef0f3', { roughness: 0.42 });
  const deck = new THREE.Mesh(rbox(RW + 0.4, 0.3, RD + 0.4, 0.08), white);
  deck.position.y = DECK_Y - 0.15;
  deck.castShadow = true; deck.receiveShadow = true;
  group.add(deck);
  const colGeo = new THREE.CylinderGeometry(0.17, 0.17, DECK_Y - 0.3, 20);
  const cols = instanced(colGeo, std('#f3f5f8', { roughness: 0.3, metalness: 0.1 }), 6, { receive: false });
  let ci = 0;
  for (const x of [-hx + 0.6, 0, hx - 0.6]) for (const z of [-hz + 0.6, hz - 0.6]) writeTRS(cols.instanceMatrix.array, ci++, x, (DECK_Y - 0.3) / 2, z, 0, 1, 1, 1);
  group.add(cols);
  const deckLed = new THREE.Mesh(new THREE.BoxGeometry(RW + 0.42, 0.05, 0.05), glow('#ffcf8a', 4.0));
  deckLed.position.set(0, DECK_Y - 0.28, hz + 0.21);
  group.add(deckLed);

  // 楼梯
  const steps = 9;
  const stepMesh = instanced(new THREE.BoxGeometry(0.34, 0.08, 1.4), white, steps);
  for (let i = 0; i < steps; i++) {
    writeTRS(stepMesh.instanceMatrix.array, i, hx + 0.45 + (steps - 1 - i) * 0.32, (i + 1) * (DECK_Y / (steps + 0.4)), hz - 0.85, 0, 1, 1, 1);
  }
  const stringer = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.12, 0.08), std('#e9edf2'));
  stringer.position.set(hx + 1.75, DECK_Y / 2, hz - 0.12);
  stringer.rotation.z = -Math.atan2(DECK_Y, 2.9);
  group.add(stepMesh, stringer);

  /* 木地板 */
  const woodTex = canvasTexture(512, 256, (g, w, h) => {
    const rows = 8;
    for (let r = 0; r < rows; r++) {
      let x = (r % 2) * -60;
      while (x < w) {
        const len = 140 + ((r * 37 + x) % 90);
        const shade = 214 + ((r * 13 + Math.floor(x / 7)) % 18);
        g.fillStyle = `rgb(${shade + 18},${shade - 14},${shade - 52})`;
        g.fillRect(x, (r * h) / rows, len - 2, h / rows - 2);
        x += len;
      }
    }
  }, { repeat: [2, 2], aniso: 8 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(RW, RD), std('#ffffff', { map: woodTex, roughness: 0.5 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = DECK_Y + 0.004;
  floor.receiveShadow = true;
  group.add(floor);

  /* 玻璃墙与框架 */
  const glassMat = new THREE.MeshStandardMaterial({ color: '#e3f4ff', transparent: true, opacity: 0.2, roughness: 0.04, metalness: 0.1, depthWrite: false, side: THREE.DoubleSide });
  const backGlass = new THREE.Mesh(new THREE.PlaneGeometry(RW, ROOM_H), glassMat);
  backGlass.position.set(0, DECK_Y + ROOM_H / 2, -hz);
  const sideGlassGeo = new THREE.PlaneGeometry(RD, ROOM_H);
  const lGlass = new THREE.Mesh(sideGlassGeo, glassMat);
  lGlass.rotation.y = Math.PI / 2;
  lGlass.position.set(-hx, DECK_Y + ROOM_H / 2, 0);
  const rGlass = lGlass.clone();
  rGlass.position.x = hx;
  const railGlass = new THREE.Mesh(new THREE.PlaneGeometry(RW, 0.85), glassMat);
  railGlass.position.set(0, DECK_Y + 0.43, hz);
  group.add(backGlass, lGlass, rGlass, railGlass);

  const frameMat = std('#ffffff', { roughness: 0.3, metalness: 0.15 });
  const posts = [];
  for (let i = 0; i <= 6; i++) posts.push([-hx + (i * RW) / 6, -hz]);
  for (let i = 1; i <= 3; i++) { posts.push([-hx, -hz + (i * RD) / 3]); posts.push([hx, -hz + (i * RD) / 3]); }
  const postMesh = instanced(new THREE.BoxGeometry(0.07, ROOM_H, 0.07), frameMat, posts.length, { receive: false });
  posts.forEach(([x, z], i) => writeTRS(postMesh.instanceMatrix.array, i, x, DECK_Y + ROOM_H / 2, z, 0, 1, 1, 1));
  group.add(postMesh);
  const topX = new THREE.Mesh(new THREE.BoxGeometry(RW + 0.1, 0.1, 0.1), frameMat);
  topX.position.set(0, DECK_Y + ROOM_H, -hz);
  const topF = topX.clone(); topF.position.z = hz;
  const topZ = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, RD + 0.1), frameMat);
  topZ.position.set(-hx, DECK_Y + ROOM_H, 0);
  const topZ2 = topZ.clone(); topZ2.position.x = hx;
  const handrail = new THREE.Mesh(new THREE.BoxGeometry(RW, 0.06, 0.08), frameMat);
  handrail.position.set(0, DECK_Y + 0.88, hz);
  const fpost1 = new THREE.Mesh(new THREE.BoxGeometry(0.07, ROOM_H, 0.07), frameMat);
  fpost1.position.set(-hx, DECK_Y + ROOM_H / 2, hz);
  const fpost2 = fpost1.clone(); fpost2.position.x = hx;
  group.add(topX, topF, topZ, topZ2, handrail, fpost1, fpost2);

  /* 长桌与椅子 */
  const walnut = std('#a46a3c', { roughness: 0.38, metalness: 0.0 });
  const table = new THREE.Mesh(rbox(6.4, 0.1, 1.7, 0.045, 2), walnut);
  table.position.set(0, DECK_Y + 0.76, 0.35);
  table.castShadow = true; table.receiveShadow = true;
  const pedGeo = rbox(0.5, 0.7, 1.0, 0.05);
  const ped1 = new THREE.Mesh(pedGeo, std('#7d5130', { roughness: 0.5 }));
  ped1.position.set(-2.1, DECK_Y + 0.36, 0.35);
  const ped2 = ped1.clone(); ped2.position.x = 2.1;
  group.add(table, ped1, ped2);
  const chairs = [];
  for (let i = 0; i < 6; i++) {
    const x = -2.6 + i * 1.04;
    chairs.push([x, 0.35 - 1.3, 0]);
    chairs.push([x, 0.35 + 1.3, Math.PI]);
  }
  chairs.push([-3.75, 0.35, Math.PI / 2], [3.75, 0.35, -Math.PI / 2]);
  const chairMat = std('#f6f2ec', { roughness: 0.55 });
  const seat = instanced(rbox(0.56, 0.1, 0.54, 0.04), chairMat, chairs.length);
  const backrest = instanced(rbox(0.56, 0.6, 0.08, 0.035), chairMat, chairs.length);
  const stem = instanced(new THREE.CylinderGeometry(0.04, 0.05, 0.42, 8), std('#9aa3ad', { metalness: 0.6, roughness: 0.3 }), chairs.length, { receive: false });
  chairs.forEach(([x, z, ry], i) => {
    writeTRS(seat.instanceMatrix.array, i, x, DECK_Y + 0.47, z, ry, 1, 1, 1);
    writeTRS(stem.instanceMatrix.array, i, x, DECK_Y + 0.21, z, ry, 1, 1, 1);
    const bx = x - Math.sin(ry) * 0.25, bz = z - Math.cos(ry) * 0.25;
    writeTRS(backrest.instanceMatrix.array, i, bx, DECK_Y + 0.82, bz, ry, 1, 1, 1);
  });
  group.add(seat, backrest, stem);

  // 吊灯
  const pendant = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.05, 0.16), glow('#ffd59c', 5.0));
  pendant.position.set(0, DECK_Y + 2.08, 0.35);
  const wireGeo = new THREE.CylinderGeometry(0.008, 0.008, ROOM_H - 2.08, 4);
  const w1 = new THREE.Mesh(wireGeo, std('#8a95a3'));
  w1.position.set(-2.2, DECK_Y + 2.08 + (ROOM_H - 2.08) / 2, 0.35);
  const w2 = w1.clone(); w2.position.x = 2.2;
  group.add(pendant, w1, w2);

  // 绿植
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.2, 0.42, 18), std('#ffffff', { roughness: 0.4 }));
  pot.position.set(hx - 0.55, DECK_Y + 0.21, -hz + 0.6);
  const leaves = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 1), std('#8fd3a8', { roughness: 0.8, flatShading: true }));
  leaves.position.set(hx - 0.55, DECK_Y + 0.85, -hz + 0.6);
  leaves.castShadow = true;
  const pot2 = pot.clone(); pot2.position.x = -hx + 0.55;
  const leaves2 = leaves.clone(); leaves2.position.x = -hx + 0.55;
  group.add(pot, leaves, pot2, leaves2);

  /* 墙面大屏 */
  const SW = 1024, SH = 432;
  const screenTex = canvasTexture(SW, SH, () => {}, { aniso: 8 });
  const sg = screenTex.userData.ctx;
  function drawScreen(qi, equity) {
    const q = QUARTERS[qi];
    const g = sg;
    const bg = g.createLinearGradient(0, 0, SW, SH);
    bg.addColorStop(0, '#0b1631');
    bg.addColorStop(1, '#152a55');
    g.fillStyle = bg;
    g.fillRect(0, 0, SW, SH);
    g.strokeStyle = 'rgba(120,190,255,0.08)';
    g.lineWidth = 1;
    for (let x = 0; x < SW; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, SH); g.stroke(); }
    for (let y = 0; y < SH; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(SW, y); g.stroke(); }
    g.textBaseline = 'alphabetic';
    g.fillStyle = '#7fd8ff';
    g.font = `600 30px ${FONT}`;
    g.fillText('董事会季度简报', 48, 70);
    g.fillStyle = '#ffffff';
    g.font = `800 112px ${FONT}`;
    g.fillText(q.label, 44, 196);
    const lw = g.measureText(q.label).width;
    g.fillStyle = 'rgba(255,255,255,0.55)';
    g.font = `500 52px ${FONT}`;
    g.fillText(`/ ${N}`, 44 + lw + 16, 196);
    g.fillStyle = '#ffffff';
    g.font = `700 60px ${FONT}`;
    g.fillText(q.title, 48, 286);
    // 右侧：股东权益
    g.fillStyle = 'rgba(255,255,255,0.08)';
    roundRect(g, 560, 46, 420, 262, 22);
    g.fill();
    g.fillStyle = '#ffd77a';
    g.font = `600 32px ${FONT}`;
    g.fillText('股东权益', 596, 104);
    g.fillStyle = '#ffffff';
    g.font = `800 104px ${FONT}`;
    const ev = money(equity);
    let size = 104;
    while (g.measureText(ev).width > 350 && size > 60) { size -= 4; g.font = `800 ${size}px ${FONT}`; }
    g.fillText(ev, 594, 222);
    g.fillStyle = 'rgba(255,255,255,0.65)';
    g.font = `500 30px ${FONT}`;
    g.fillText(UNIT_MONEY, 598, 274);
    // 底部：季度进度
    const x0 = 48, x1 = SW - 48, y = 360, seg = (x1 - x0) / N;
    for (let i = 0; i < N; i++) {
      g.fillStyle = i < qi ? 'rgba(127,216,255,0.55)' : i === qi ? '#ffd77a' : 'rgba(255,255,255,0.14)';
      roundRect(g, x0 + i * seg + 3, y, seg - 6, 12, 6);
      g.fill();
    }
    g.fillStyle = 'rgba(255,255,255,0.5)';
    g.font = `500 22px ${FONT}`;
    g.fillText(QUARTERS[0].label, x0, y + 46);
    const lastLabel = QUARTERS[N - 1].label;
    g.fillText(lastLabel, x1 - g.measureText(lastLabel).width, y + 46);
    screenTex.needsUpdate = true;
  }
  const bezel = new THREE.Mesh(rbox(5.75, 2.55, 0.1, 0.04), std('#121a28', { roughness: 0.3, metalness: 0.3 }));
  bezel.position.set(0, DECK_Y + 1.38, -hz + 0.1);
  const screenMat = new THREE.MeshBasicMaterial({ map: screenTex });
  screenMat.color.setScalar(1.35);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(5.5, 5.5 * (SH / SW)), screenMat);
  screen.position.set(0, DECK_Y + 1.38, -hz + 0.16);
  group.add(bezel, screen);

  let lastKey = '', lastQi = -1, lastDraw = -1e9;
  function update(disp, qi, settled) {
    const key = qi + '|' + money(disp.equity);
    if (key === lastKey) return;
    const now = performance.now();
    if (settled || qi !== lastQi || now - lastDraw > 90) {
      lastKey = key;
      lastQi = qi;
      lastDraw = now;
      drawScreen(qi, disp.equity);
    }
  }

  return {
    group, update, animate() {},
    anchors: { label: new THREE.Vector3(Z.x, DECK_Y + ROOM_H + 1.3, Z.z - 0.4) },
  };
}
