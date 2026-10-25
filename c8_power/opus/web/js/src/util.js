// 通用数学与几何工具
import * as THREE from 'three';
import { mergeGeometries } from 'three-addons';

export const TAU = Math.PI * 2;

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (e0, e1, x) => {
  const t = clamp((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};
export const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

// D 形截面（托卡马克常用的“拉长 + 三角形变”参数化），逆时针，不闭合
export function dCurve(R0, a, kappa, delta, n = 160, zShift = 0) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * TAU;
    pts.push(new THREE.Vector2(
      R0 + a * Math.cos(t + delta * Math.sin(t)),
      zShift + kappa * a * Math.sin(t)
    ));
  }
  return pts;
}

// 闭合折线沿外法线方向偏移 d（d<0 表示向内）
export function offsetClosed(pts, d) {
  const n = pts.length;
  const out = [];
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[(i + 1) % n];
    const tx = p1.x - p0.x;
    const ty = p1.y - p0.y;
    const len = Math.hypot(tx, ty) || 1;
    out.push(new THREE.Vector2(pts[i].x + (ty / len) * d, pts[i].y - (tx / len) * d));
  }
  return out;
}

const closeLoop = (pts) => [...pts, pts[0].clone()];

export function flipFaces(g) {
  const idx = g.index.array;
  for (let i = 0; i < idx.length; i += 3) {
    const t = idx[i + 1];
    idx[i + 1] = idx[i + 2];
    idx[i + 2] = t;
  }
  const n = g.attributes.normal.array;
  for (let i = 0; i < n.length; i++) n[i] *= -1;
  g.index.needsUpdate = true;
  g.attributes.normal.needsUpdate = true;
  return g;
}

// 旋转实体：外轮廓（逆时针）+ 可选内轮廓（逆时针给入，内部自动反向），非整圈时自动封端
export function latheSolid(outer, inner, phiStart, phiLength, segs) {
  const geos = [new THREE.LatheGeometry(closeLoop(outer), segs, phiStart, phiLength)];
  if (inner) geos.push(new THREE.LatheGeometry(closeLoop([...inner].reverse()), segs, phiStart, phiLength));
  if (phiLength < TAU - 1e-4) {
    const shape = new THREE.Shape(outer);
    if (inner) shape.holes.push(new THREE.Path(inner));
    const capA = new THREE.ShapeGeometry(shape, 1);
    capA.rotateY(phiStart - Math.PI / 2);
    const capB = flipFaces(new THREE.ShapeGeometry(shape, 1));
    capB.rotateY(phiStart + phiLength - Math.PI / 2);
    geos.push(capA, capB);
  }
  const merged = mergeGeometries(geos, false);
  geos.forEach((g) => g.dispose());
  return merged;
}

// 圆角矩形截面（R-Z 平面），逆时针
export function roundedRectProfile(cx, cz, w, h, r, seg = 4) {
  const pts = [];
  const corners = [
    [cx + w / 2 - r, cz - h / 2 + r, -Math.PI / 2],
    [cx + w / 2 - r, cz + h / 2 - r, 0],
    [cx - w / 2 + r, cz + h / 2 - r, Math.PI / 2],
    [cx - w / 2 + r, cz - h / 2 + r, Math.PI],
  ];
  for (const [x, z, a0] of corners) {
    for (let i = 0; i <= seg; i++) {
      const a = a0 + (i / seg) * (Math.PI / 2);
      pts.push(new THREE.Vector2(x + r * Math.cos(a), z + r * Math.sin(a)));
    }
  }
  return pts;
}

// 角度 phi（Lathe 约定：x = R sin φ，z = R cos φ）方向的单位向量
export const radialDir = (phi) => new THREE.Vector3(Math.sin(phi), 0, Math.cos(phi));

// 判断角度是否落在剖切楔形内
export function inWedge(phi, center, width) {
  let d = ((phi - center) % TAU + TAU) % TAU;
  if (d > Math.PI) d -= TAU;
  return Math.abs(d) < width / 2;
}

// 生成柔和的圆形粒子贴图
export function makeDotTexture(size = 64) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.35, 'rgba(255,255,255,0.85)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// 设置材质透明度（不透明时关闭透明以避免排序问题）
export function setOpacity(mat, op) {
  const o = clamp(op);
  mat.opacity = o;
  const tr = o < 0.995;
  if (mat.transparent !== tr) {
    mat.transparent = tr;
    mat.needsUpdate = true;
  }
  mat.depthWrite = o > 0.6;
}
