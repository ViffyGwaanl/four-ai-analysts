import * as THREE from 'three';
import { ZONES } from './layout.js';
import { rbox, std, glow, setGlow, canvasTexture, roundRect, FONT, clamp } from './util.js';
import { QUARTERS, N, MAX } from '../data.js';
import { index as fmtIdx } from '../format.js';

const SW = 1536, SH = 760;
const TILT = 0.62;
const SCREEN_W = 11;
const SCREEN_H = SCREEN_W * (SH / SW);

const C_STD = '#46dcff';
const C_HBM = '#e08bff';

function niceMax(v) {
  const steps = [1, 2, 2.5, 5, 10];
  const mag = Math.pow(10, Math.floor(Math.log10(v)));
  for (const s of steps) if (s * mag >= v) return s * mag;
  return 10 * mag;
}

/* 市场行情屏：价格指数与 HBM 价格指数，画到当前季度 */
export function createMarket() {
  const Z = ZONES.market;
  const group = new THREE.Group();
  group.position.set(Z.x, 0, Z.z);

  const base = new THREE.Mesh(rbox(SCREEN_W + 0.8, 0.32, 3.6, 0.1), std('#ffffff', { roughness: 0.35 }));
  base.position.y = 0.16;
  base.castShadow = true; base.receiveShadow = true;
  const baseLed = new THREE.Mesh(new THREE.BoxGeometry(SCREEN_W + 0.7, 0.04, 0.04), glow('#47b6ff', 4.2));
  baseLed.position.set(0, 0.3, 1.81);
  group.add(base, baseLed);

  const tex = canvasTexture(SW, SH, () => {}, { aniso: 8 });
  const g = tex.userData.ctx;
  const yMax = niceMax(Math.max(MAX.hbmPriceIndex, MAX.priceIndex) * 1.04);
  const plot = { x0: 120, x1: SW - 80, y0: 210, y1: SH - 92 };
  const X = (i) => plot.x0 + (i / (N - 1)) * (plot.x1 - plot.x0);
  const Y = (v) => plot.y1 - (v / yMax) * (plot.y1 - plot.y0);
  const sStd = QUARTERS.map((q) => +q.priceIndex);
  const sHbm = QUARTERS.map((q) => +q.hbmPriceIndex);

  function valueAt(arr, qf) {
    const i = Math.floor(qf), f = qf - i;
    if (i >= N - 1) return arr[N - 1];
    return arr[i] + (arr[i + 1] - arr[i]) * f;
  }

  function drawLine(arr, qf, color, width) {
    g.save();
    g.strokeStyle = color;
    g.lineWidth = width;
    g.lineJoin = 'round';
    g.lineCap = 'round';
    g.shadowColor = color;
    g.shadowBlur = 18;
    g.beginPath();
    g.moveTo(X(0), Y(arr[0]));
    const last = Math.floor(qf);
    for (let i = 1; i <= last; i++) g.lineTo(X(i), Y(arr[i]));
    if (qf > last && last < N - 1) g.lineTo(X(qf), Y(valueAt(arr, qf)));
    g.stroke();
    g.restore();
  }

  function draw(qf, qi) {
    const bg = g.createLinearGradient(0, 0, 0, SH);
    bg.addColorStop(0, '#081530');
    bg.addColorStop(1, '#0e2348');
    g.fillStyle = bg;
    g.fillRect(0, 0, SW, SH);
    // 标题
    g.textBaseline = 'alphabetic';
    g.fillStyle = '#ffffff';
    g.font = `700 58px ${FONT}`;
    g.fillText('市场行情屏', 72, 96);
    g.fillStyle = 'rgba(190,210,240,0.75)';
    g.font = `500 30px ${FONT}`;
    g.fillText(`普通内存与 HBM 价格指数 · ${QUARTERS[0].label}–${QUARTERS[qi].label}`, 74, 146);
    // 图例（文字用白色，色块标识系列）
    const vStd = valueAt(sStd, qf), vHbm = valueAt(sHbm, qf);
    const legend = [[C_STD, '价格指数', fmtIdx(vStd)], [C_HBM, 'HBM 价格指数', fmtIdx(vHbm)]];
    let lx = SW - 80;
    g.font = `700 44px ${FONT}`;
    for (let i = legend.length - 1; i >= 0; i--) {
      const [c, name, val] = legend[i];
      g.font = `700 46px ${FONT}`;
      const vw = g.measureText(val).width;
      g.font = `500 30px ${FONT}`;
      const nw = g.measureText(name).width;
      const w = 40 + nw + 18 + vw + 34;
      lx -= w;
      g.fillStyle = 'rgba(255,255,255,0.07)';
      roundRect(g, lx, 52, w, 84, 18);
      g.fill();
      g.fillStyle = c;
      roundRect(g, lx + 20, 86, 22, 8, 4);
      g.fill();
      g.fillStyle = 'rgba(220,230,250,0.85)';
      g.font = `500 30px ${FONT}`;
      g.fillText(name, lx + 54, 104);
      g.fillStyle = '#ffffff';
      g.font = `700 46px ${FONT}`;
      g.fillText(val, lx + 54 + nw + 18, 108);
      lx -= 18;
    }
    // 网格与坐标
    g.strokeStyle = 'rgba(150,180,230,0.14)';
    g.lineWidth = 2;
    g.fillStyle = 'rgba(190,210,240,0.6)';
    g.font = `500 26px ${FONT}`;
    const ticks = yMax <= 10 ? 5 : 4;
    for (let k = 0; k <= ticks; k++) {
      const v = (yMax / ticks) * k;
      const y = Y(v);
      g.beginPath(); g.moveTo(plot.x0, y); g.lineTo(plot.x1, y); g.stroke();
      const t = Number.isInteger(v) ? String(v) : v.toFixed(1);
      g.fillText(t, plot.x0 - 18 - g.measureText(t).width, y + 9);
    }
    for (let i = 0; i < N; i++) {
      const x = X(i);
      g.fillStyle = i === qi ? '#ffffff' : 'rgba(190,210,240,0.55)';
      g.font = `${i === qi ? 700 : 500} 24px ${FONT}`;
      const lbl = QUARTERS[i].label;
      g.fillText(lbl, x - g.measureText(lbl).width / 2, plot.y1 + 44);
    }
    // 当前季度竖线
    g.strokeStyle = 'rgba(255,255,255,0.28)';
    g.setLineDash([10, 10]);
    g.beginPath(); g.moveTo(X(qf), plot.y0 - 10); g.lineTo(X(qf), plot.y1); g.stroke();
    g.setLineDash([]);
    // 曲线
    drawLine(sStd, qf, C_STD, 6);
    drawLine(sHbm, qf, C_HBM, 6);
    // 端点
    for (const [arr, c, shape] of [[sStd, C_STD, 'dot'], [sHbm, C_HBM, 'diamond']]) {
      const x = X(qf), y = Y(valueAt(arr, qf));
      g.fillStyle = c;
      g.shadowColor = c;
      g.shadowBlur = 24;
      g.beginPath();
      if (shape === 'dot') g.arc(x, y, 13, 0, Math.PI * 2);
      else { g.moveTo(x, y - 16); g.lineTo(x + 16, y); g.lineTo(x, y + 16); g.lineTo(x - 16, y); g.closePath(); }
      g.fill();
      g.shadowBlur = 0;
      g.fillStyle = '#ffffff';
      g.beginPath(); g.arc(x, y, 5, 0, Math.PI * 2); g.fill();
    }
    tex.needsUpdate = true;
  }

  /* 斜置大屏 */
  const holder = new THREE.Group();
  holder.position.set(0, 0.62 + (SCREEN_H / 2) * Math.cos(TILT), 0.15);
  holder.rotation.x = -TILT;
  group.add(holder);
  const bezel = new THREE.Mesh(rbox(SCREEN_W + 0.36, SCREEN_H + 0.36, 0.22, 0.08), std('#111a2b', { roughness: 0.28, metalness: 0.35 }));
  bezel.position.z = -0.12;
  bezel.castShadow = true;
  const screenMat = new THREE.MeshBasicMaterial({ map: tex });
  screenMat.color.setScalar(1.3);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(SCREEN_W, SCREEN_H), screenMat);
  screen.position.z = 0.002;
  holder.add(bezel, screen);
  const edgeMat = glow('#4cc2ff', 4.0);
  const edge = new THREE.Mesh(new THREE.BoxGeometry(SCREEN_W + 0.36, 0.05, 0.05), edgeMat);
  edge.position.set(0, -SCREEN_H / 2 - 0.2, 0);
  holder.add(edge);
  // 支腿
  const legMat = std('#e9eef4', { roughness: 0.35, metalness: 0.2 });
  for (const sx of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.24, 3.6, 0.24), legMat);
    leg.position.set(sx * (SCREEN_W / 2 - 1.4), 1.8, -1.2);
    leg.rotation.x = 0.18;
    leg.castShadow = true;
    group.add(leg);
  }

  let lastQi = -1, lastQf = -1, lastDraw = -1e9;
  function update(disp, qi, settled) {
    const qf = clamp(disp.qf, 0, N - 1);
    const now = performance.now();
    if (qi !== lastQi || (Math.abs(qf - lastQf) > 1e-4 && (settled || now - lastDraw > 90))) {
      lastQi = qi; lastQf = qf; lastDraw = now;
      draw(qf, qi);
    }
  }

  function animate(t) {
    setGlow(edgeMat, 3.8 + 0.6 * Math.sin(t * 1.4));
  }

  return {
    group, update, animate,
    anchors: { label: new THREE.Vector3(Z.x, 5.7, Z.z - 1.9) },
  };
}
