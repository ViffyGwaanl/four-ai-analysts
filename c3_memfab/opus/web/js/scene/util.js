import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export const FONT = '"PingFang SC","Hiragino Sans GB","Microsoft YaHei",system-ui,sans-serif';

/* ---------- 几何 ---------- */
const rboxCache = new Map();
export function rbox(w, h, d, r = 0.08, seg = 2) {
  const key = [w, h, d, r, seg].join('|');
  let g = rboxCache.get(key);
  if (!g) {
    g = new RoundedBoxGeometry(w, h, d, seg, r);
    rboxCache.set(key, g);
  }
  return g;
}

/* 12 条棱组成的立方框架（脚手架/线框），合并成一个几何体便于实例化 */
export function cageGeometry(w, h, d, t = 0.04) {
  const parts = [];
  const hx = w / 2, hy = h / 2, hz = d / 2;
  const add = (sx, sy, sz, x, y, z) => {
    const g = new THREE.BoxGeometry(sx, sy, sz);
    g.translate(x, y, z);
    parts.push(g);
  };
  for (const sy of [-1, 1]) for (const sz of [-1, 1]) add(w + t, t, t, 0, sy * hy, sz * hz);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(t, h, t, sx * hx, 0, sz * hz);
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) add(t, t, d, sx * hx, sy * hy, 0);
  // 两道斜撑（正面与背面）
  for (const sz of [-1, 1]) {
    const len = Math.hypot(w, h);
    const g = new THREE.BoxGeometry(len, t * 0.8, t * 0.8);
    g.rotateZ(Math.atan2(h, w) * (sz > 0 ? 1 : -1));
    g.translate(0, 0, sz * hz);
    parts.push(g);
  }
  return mergeGeometries(parts);
}

export function mergeGeometries(list) {
  // 轻量合并（仅 position / normal / uv，均为非索引或索引几何）
  const geos = list.map((g) => (g.index ? g.toNonIndexed() : g));
  let total = 0;
  for (const g of geos) total += g.attributes.position.count;
  const pos = new Float32Array(total * 3);
  const nor = new Float32Array(total * 3);
  const uv = new Float32Array(total * 2);
  let o = 0;
  for (const g of geos) {
    const c = g.attributes.position.count;
    pos.set(g.attributes.position.array, o * 3);
    if (g.attributes.normal) nor.set(g.attributes.normal.array, o * 3);
    if (g.attributes.uv) uv.set(g.attributes.uv.array, o * 2);
    o += c;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  for (const g of list) g.dispose();
  for (const g of geos) g.dispose();
  out.computeBoundingSphere();
  return out;
}

/* 静态合批：把组内“同材质、同阴影设置”的静态网格合并为一个，减少绘制调用。
   带 userData.dynamic 的对象（及其子树）会被跳过。 */
export function bakeStatic(group) {
  group.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(group.matrixWorld).invert();
  const buckets = new Map();
  group.traverse((o) => {
    if (o === group || !o.isMesh || o.isInstancedMesh || Array.isArray(o.material) || !o.visible) return;
    for (let p = o; p && p !== group; p = p.parent) if (p.userData.dynamic) return;
    const a = o.geometry.attributes;
    if (!a.position || !a.normal || !a.uv) return;
    const key = o.material.uuid + '|' + o.castShadow + '|' + o.receiveShadow + '|' + o.renderOrder;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(o);
  });
  let removed = 0;
  for (const list of buckets.values()) {
    if (list.length < 2) continue;
    const geos = list.map((m) => {
      const g = m.geometry.clone();
      g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld));
      return g;
    });
    const mesh = new THREE.Mesh(mergeGeometries(geos), list[0].material);
    mesh.castShadow = list[0].castShadow;
    mesh.receiveShadow = list[0].receiveShadow;
    mesh.renderOrder = list[0].renderOrder;
    group.add(mesh);
    for (const m of list) m.parent.remove(m);
    removed += list.length - 1;
  }
  return removed;
}

/* ---------- 材质 ---------- */
export function std(color, opts = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.62, metalness: 0, ...opts });
}

/* 自发光（HDR，可被泛光拾取）：MeshBasicMaterial 颜色乘以强度 */
export function glow(color, intensity = 3, opts = {}) {
  const m = new THREE.MeshBasicMaterial({ color, ...opts });
  m.color.multiplyScalar(intensity);
  m.userData.baseColor = new THREE.Color(color);
  return m;
}

export function setGlow(m, intensity) {
  m.color.copy(m.userData.baseColor).multiplyScalar(intensity);
}

/* ---------- 实例化 ---------- */
export function instanced(geo, material, count, { cast = true, receive = true } = {}) {
  const m = new THREE.InstancedMesh(geo, material, count);
  m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  m.frustumCulled = false;
  m.castShadow = cast;
  m.receiveShadow = receive;
  const a = m.instanceMatrix.array;
  for (let i = 0; i < count; i++) writeTRS(a, i, 0, -50, 0, 0, 0, 0, 0);
  m.instanceMatrix.needsUpdate = true;
  return m;
}

/* 直接写入实例矩阵（平移 + 绕 Y 旋转 + 缩放），零内存分配 */
export function writeTRS(arr, i, x, y, z, ry, sx, sy, sz) {
  const c = Math.cos(ry), s = Math.sin(ry), o = i * 16;
  arr[o] = c * sx; arr[o + 1] = 0; arr[o + 2] = -s * sx; arr[o + 3] = 0;
  arr[o + 4] = 0; arr[o + 5] = sy; arr[o + 6] = 0; arr[o + 7] = 0;
  arr[o + 8] = s * sz; arr[o + 9] = 0; arr[o + 10] = c * sz; arr[o + 11] = 0;
  arr[o + 12] = x; arr[o + 13] = y; arr[o + 14] = z; arr[o + 15] = 1;
}

export function initColors(mesh, color) {
  const c = new THREE.Color(color);
  for (let i = 0; i < mesh.count; i++) mesh.setColorAt(i, c);
  mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
  mesh.instanceColor.needsUpdate = true;
}

export function writeColor(mesh, i, r, g, b) {
  const a = mesh.instanceColor.array, o = i * 3;
  a[o] = r; a[o + 1] = g; a[o + 2] = b;
}

/* ---------- 画布纹理 ---------- */
export const canvasTextures = new Set();
export function canvasTexture(w, h, draw, { repeat = null, aniso = 4, srgb = true } = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = aniso;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
  }
  t.userData.ctx = g;
  canvasTextures.add(t);
  return t;
}

export function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

/* ---------- 数学 ---------- */
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (t) => t * t * (3 - 2 * t);
export const easeOutBack = (t) => {
  const c1 = 1.4, c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffled(n, seed) {
  const r = mulberry32(seed);
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
