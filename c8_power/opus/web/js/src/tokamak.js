// 托卡马克装置：几何建模 + 滚动拆解编排
// 尺寸大致按 ITER 比例（大半径 6.2 m、小半径 2.0 m），单位：米。仅为示意，不是工程图。
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three-addons';
import { mergeGeometries } from 'three-addons';
import {
  TAU, clamp, smooth, dCurve, offsetClosed, latheSolid, roundedRectProfile,
  radialDir, inWedge, setOpacity,
} from './util.js';

const deg = THREE.MathUtils.degToRad;

// 剖切楔形：正对默认机位，去掉两个 40° 真空室扇区，露出内部
export const CUT_CENTER = deg(32);
export const CUT_WIDTH = deg(80);
const SECTOR0 = deg(-8); // 第一个扇区起始角
const CUT_START = CUT_CENTER + CUT_WIDTH / 2; // 保留部分从这里开始
const KEEP_LEN = TAU - CUT_WIDTH;

// 各部件在拆解时间轴上的步序号（0 = 整机，9 = 重新组装）
export const STEPS = ['overview', 'cryostat', 'tf', 'pf', 'cs', 'vv', 'blanket', 'divertor', 'plasma', 'final'];

function makeMat(hi, p) {
  if (hi) return new THREE.MeshPhysicalMaterial(p);
  const { clearcoat, clearcoatRoughness, sheen, sheenColor, sheenRoughness, iridescence, ...rest } = p;
  return new THREE.MeshStandardMaterial(rest);
}

export function buildTokamak({ quality = 'high' } = {}) {
  const hi = quality === 'high';
  const segK = hi ? 1 : 0.55;
  const S = (n) => Math.max(8, Math.round(n * segK));

  const root = new THREE.Group();
  root.name = 'tokamak';

  // ---------- 材质（明亮、有质感的配色，便于区分部件） ----------
  const M = {
    cryo: makeMat(hi, { color: 0xf3f5f8, metalness: 0.25, roughness: 0.32, clearcoat: 0.6, clearcoatRoughness: 0.25 }),
    cryoInner: makeMat(hi, { color: 0xc9d6e6, metalness: 0.4, roughness: 0.4 }),
    base: makeMat(hi, { color: 0xe4e9ef, metalness: 0.2, roughness: 0.55 }),
    tf: makeMat(hi, { color: 0x2f62e0, metalness: 0.55, roughness: 0.28, clearcoat: 1.0, clearcoatRoughness: 0.12 }),
    tfPack: makeMat(hi, { color: 0xd8893f, metalness: 0.9, roughness: 0.3 }),
    pf: makeMat(hi, { color: 0xe07a3c, metalness: 0.85, roughness: 0.26, clearcoat: 0.6, clearcoatRoughness: 0.2 }),
    cs: makeMat(hi, { color: 0xe9b949, metalness: 0.9, roughness: 0.22, clearcoat: 0.5, clearcoatRoughness: 0.2 }),
    vv: makeMat(hi, { color: 0xcfd5de, metalness: 0.92, roughness: 0.24, clearcoat: 0.4, clearcoatRoughness: 0.2 }),
    vvPort: makeMat(hi, { color: 0xb9c2ce, metalness: 0.9, roughness: 0.3 }),
    blanket: makeMat(hi, { color: 0xd7c29c, metalness: 0.35, roughness: 0.38, clearcoat: 0.3, clearcoatRoughness: 0.3 }),
    divertor: makeMat(hi, { color: 0x4a515c, metalness: 0.75, roughness: 0.35 }),
    hot: new THREE.MeshStandardMaterial({ color: 0xff8a2a, emissive: 0xff6a10, emissiveIntensity: 3.2, roughness: 0.5 }),
  };
  M.cryo.side = THREE.FrontSide;

  const comps = {};

  // ---------- 1. 杜瓦（低温恒温器） ----------
  {
    const g = new THREE.Group();
    g.name = 'cryostat';
    const cw = CUT_WIDTH + deg(24);
    const cs = CUT_CENTER + cw / 2;
    const cl = TAU - cw;
    // 筒体
    const wall = roundedRectProfile(13.75, -0.3, 0.42, 20.4, 0.12, 2);
    const wallMesh = new THREE.Mesh(latheSolid(wall, null, cs, cl, S(120)), M.cryo);
    // 顶盖（扁穹顶）
    const lid = [];
    const lidOut = [];
    for (let i = 0; i <= 24; i++) {
      const a = (i / 24) * (Math.PI / 2);
      lidOut.push(new THREE.Vector2(13.95 * Math.cos(a) + 0.001, 9.9 + 4.2 * Math.sin(a)));
    }
    const lidIn = lidOut.map((p) => new THREE.Vector2(Math.max(0.001, p.x - 0.38 * Math.cos(Math.atan2((p.y - 9.9) / 4.2, p.x / 13.95))), p.y - 0.34));
    // 逆时针：外表面从外缘向上到轴，再沿内表面返回
    lid.push(...lidOut, ...lidIn.reverse());
    const lidMesh = new THREE.Mesh(latheSolid(lid, null, cs, cl, S(120)), M.cryo);
    // 内侧加强环（显示厚度与层次）
    const ring = roundedRectProfile(13.35, 9.6, 0.5, 0.5, 0.1, 2);
    const ringMesh = new THREE.Mesh(latheSolid(ring, null, cs, cl, S(120)), M.cryoInner);
    g.add(wallMesh, lidMesh, ringMesh);
    [wallMesh, lidMesh, ringMesh].forEach((m) => { m.castShadow = true; m.receiveShadow = true; });
    // 底座（不随拆解移动）
    const basePf = roundedRectProfile(7.4, -11.1, 14.8, 1.2, 0.2, 2).map((p) => new THREE.Vector2(Math.max(0.001, p.x), p.y));
    const baseMesh = new THREE.Mesh(latheSolid(basePf, null, cs, cl, S(120)), M.base);
    baseMesh.receiveShadow = true;
    baseMesh.castShadow = true;
    root.add(baseMesh);
    root.add(g);
    comps.cryostat = {
      step: 1, group: g, mats: [M.cryo, M.cryoInner],
      apply(e, d) {
        g.position.y = 10 * e + 26 * d;
        const op = 1 - d;
        setOpacity(M.cryo, op); setOpacity(M.cryoInner, op);
        g.visible = op > 0.01;
      },
      anchor: () => g.localToWorld(new THREE.Vector3(Math.sin(CUT_CENTER + deg(150)) * 9.5, 12.6, Math.cos(CUT_CENTER + deg(150)) * 9.5)),
    };
  }

  // ---------- 2. 环向场线圈（18 个 D 形线圈） ----------
  {
    const g = new THREE.Group();
    g.name = 'tf';
    const tfC = dCurve(6.71, 4.29, 1.865, 0.5, S(220));
    const outer = offsetClosed(tfC, 0.44);
    const inner = offsetClosed(tfC, -0.44);
    const shape = new THREE.Shape(outer);
    shape.holes.push(new THREE.Path(inner));
    const depth = 0.82;
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth, bevelEnabled: true, bevelThickness: 0.07, bevelSize: 0.07, bevelSegments: hi ? 3 : 1, curveSegments: 4, steps: 1,
    });
    geo.translate(0, 0, -depth / 2);
    // 线圈侧面的“绕组包”铜色条带
    const packShape = new THREE.Shape(offsetClosed(tfC, 0.16));
    packShape.holes.push(new THREE.Path(offsetClosed(tfC, -0.16)));
    const packGeo = new THREE.ExtrudeGeometry(packShape, { depth: depth + 0.2, bevelEnabled: false, curveSegments: 4, steps: 1 });
    packGeo.translate(0, 0, -(depth + 0.2) / 2);
    const coils = [];
    for (let k = 0; k < 18; k++) {
      const phi = SECTOR0 + deg(20) * k;
      if (inWedge(phi, CUT_CENTER, CUT_WIDTH - deg(4))) continue;
      const c = new THREE.Group();
      const m = new THREE.Mesh(geo, M.tf);
      const p = new THREE.Mesh(packGeo, M.tfPack);
      m.castShadow = true; m.receiveShadow = true;
      c.add(m, p);
      c.rotation.y = phi - Math.PI / 2;
      c.userData.phi = phi;
      g.add(c);
      coils.push(c);
    }
    root.add(g);
    // 用作标注锚点的线圈：剖切口左缘的线圈
    const leftEdge = CUT_CENTER - CUT_WIDTH / 2;
    const ref = coils.reduce((best, c) => {
      let d = Math.abs(((c.userData.phi - leftEdge) % TAU + TAU) % TAU);
      d = Math.min(d, TAU - d);
      return !best || d < best.d ? { c, d } : best;
    }, null).c;
    comps.tf = {
      step: 2, group: g, mats: [M.tf, M.tfPack],
      apply(e, d) {
        for (const c of coils) {
          const dir = radialDir(c.userData.phi);
          c.position.copy(dir.multiplyScalar(4.6 * e + 24 * d));
          c.position.y = 1.2 * e;
        }
        const op = 1 - d;
        setOpacity(M.tf, op); setOpacity(M.tfPack, op);
        g.visible = op > 0.01;
      },
      anchor: () => ref.localToWorld(new THREE.Vector3(5.4, 8.35, 0.5)),
    };
  }

  // ---------- 3. 极向场线圈（6 个水平环） ----------
  {
    const g = new THREE.Group();
    g.name = 'pf';
    const tfC = dCurve(6.71, 4.29, 1.865, 0.5, 360);
    const off = offsetClosed(tfC, 1.25);
    const spec = [
      { t: 112, w: 0.95, h: 0.95 }, { t: 55, w: 0.75, h: 1.05 }, { t: 17, w: 0.8, h: 1.35 },
      { t: -17, w: 0.8, h: 1.35 }, { t: -55, w: 0.75, h: 1.05 }, { t: -112, w: 0.95, h: 0.95 },
    ];
    const rings = spec.map((s, i) => {
      const idx = Math.round((((s.t % 360) + 360) % 360) / 360 * off.length) % off.length;
      const p = off[idx];
      const prof = roundedRectProfile(p.x, p.y, s.w, s.h, 0.16, 3);
      const mesh = new THREE.Mesh(latheSolid(prof, null, CUT_START, KEEP_LEN, S(140)), M.pf);
      mesh.castShadow = true; mesh.receiveShadow = true;
      mesh.userData = { sign: s.t > 0 ? 1 : -1, R: p.x, Z: p.y, i };
      g.add(mesh);
      return mesh;
    });
    root.add(g);
    comps.pf = {
      step: 3, group: g, mats: [M.pf],
      apply(e, d) {
        for (const r of rings) {
          const { sign, i } = r.userData;
          const k = [3.2, 2.2, 1.4, 1.4, 2.2, 3.2][i];
          r.position.y = sign * (k * e + 22 * d);
        }
        const op = 1 - d;
        setOpacity(M.pf, op);
        g.visible = op > 0.01;
      },
      anchor: () => {
        const r = rings[2];
        const a = CUT_START + deg(10);
        return r.localToWorld(new THREE.Vector3(Math.sin(a) * (r.userData.R + 0.45), r.userData.Z + 0.75, Math.cos(a) * (r.userData.R + 0.45)));
      },
    };
  }

  // ---------- 4. 中心螺线管（6 个模块叠成的柱体） ----------
  {
    const g = new THREE.Group();
    g.name = 'cs';
    const mods = [];
    const h = 2.0;
    const gap = 0.1;
    const total = 6 * h + 5 * gap;
    for (let k = 0; k < 6; k++) {
      const z0 = -total / 2 + k * (h + gap);
      const prof = roundedRectProfile(1.6, z0 + h / 2, 0.66, h, 0.08, 2);
      const mesh = new THREE.Mesh(latheSolid(prof, null, CUT_START, KEEP_LEN, S(72)), M.cs);
      mesh.castShadow = true; mesh.receiveShadow = true;
      mesh.userData.k = k;
      g.add(mesh);
      mods.push(mesh);
    }
    // 上下支撑结构
    const capProf = roundedRectProfile(1.6, total / 2 + 0.45, 0.9, 0.7, 0.1, 2);
    const capTop = new THREE.Mesh(latheSolid(capProf, null, CUT_START, KEEP_LEN, S(72)), M.vvPort);
    const capBot = capTop.clone();
    capBot.position.y = -total - 0.9;
    g.add(capTop, capBot);
    root.add(g);
    comps.cs = {
      step: 4, group: g, mats: [M.cs],
      apply(e, d) {
        for (const m of mods) m.position.y = e * (4.5 + m.userData.k * 0.75) + 28 * d;
        capTop.position.y = e * (4.5 + 5 * 0.75 + 0.6) + 28 * d;
        capBot.position.y = -total - 0.9 + e * 3.6 + 28 * d;
        const op = 1 - d;
        setOpacity(M.cs, op);
        g.visible = op > 0.01;
      },
      anchor: () => mods[5].localToWorld(new THREE.Vector3(Math.sin(CUT_CENTER + Math.PI) * 1.6, 6.25, Math.cos(CUT_CENTER + Math.PI) * 1.6)),
    };
  }

  // ---------- 5. 真空室（双层壁，9 个 40° 扇区，带窗口） ----------
  const vvInner = dCurve(6.2, 2.65, 2.0, 0.35, S(200));
  {
    const g = new THREE.Group();
    g.name = 'vv';
    const vvOuter = dCurve(6.2, 3.2, 1.85, 0.35, S(200));
    const wallIn = [vvInner, offsetClosed(vvInner, 0.08)];
    const wallOut = [offsetClosed(vvOuter, -0.08), vvOuter];
    const sectors = [];
    for (let k = 0; k < 9; k++) {
      const a0 = SECTOR0 + deg(40) * k;
      const mid = a0 + deg(20);
      if (inWedge(mid, CUT_CENTER, CUT_WIDTH)) continue;
      const pad = deg(0.5);
      const geos = [
        latheSolid(wallOut[1], wallOut[0], a0 + pad, deg(40) - 2 * pad, S(28)),
        latheSolid(wallIn[1], wallIn[0], a0 + pad, deg(40) - 2 * pad, S(28)),
      ];
      // 扇区两端的肋板（显示双层壁之间的连接）
      for (const ae of [a0 + pad, a0 + deg(40) - pad - deg(1.2)]) {
        geos.push(latheSolid(wallOut[0], wallIn[1], ae, deg(1.2), 2));
      }
      // 赤道窗口与上窗口
      for (const off of [10, 30]) {
        const pa = a0 + deg(off);
        const eq = new RoundedBoxGeometry(1.5, 2.1, 2.9, 2, 0.12);
        eq.rotateY(pa);
        eq.translate(Math.sin(pa) * 10.6, 0, Math.cos(pa) * 10.6);
        const up = new RoundedBoxGeometry(1.2, 3.0, 1.25, 2, 0.12);
        up.rotateY(pa);
        up.translate(Math.sin(pa) * 6.0, 6.75, Math.cos(pa) * 6.0);
        const fl = new THREE.CylinderGeometry(0.95, 0.95, 0.25, S(24));
        fl.rotateX(Math.PI / 2);
        fl.rotateY(pa);
        fl.translate(Math.sin(pa) * 12.1, 0, Math.cos(pa) * 12.1);
        geos.push(eq, up, fl);
      }
      const geo = mergeGeometries(geos.map((x) => (x.index ? x.toNonIndexed() : x)), false);
      geos.forEach((x) => x.dispose());
      const mesh = new THREE.Mesh(geo, M.vv);
      mesh.castShadow = true; mesh.receiveShadow = true;
      mesh.userData.mid = mid;
      g.add(mesh);
      sectors.push(mesh);
    }
    root.add(g);
    const vvLeft = CUT_CENTER - CUT_WIDTH / 2 - deg(3);
    const ref = sectors.reduce((best, s) => {
      let d = Math.abs(((s.userData.mid - vvLeft) % TAU + TAU) % TAU);
      d = Math.min(d, TAU - d);
      return !best || d < best.d ? { s, d } : best;
    }, null).s;
    comps.vv = {
      step: 5, group: g, mats: [M.vv],
      apply(e, d) {
        for (const s of sectors) {
          s.position.copy(radialDir(s.userData.mid).multiplyScalar(3.4 * e + 20 * d));
        }
        const op = 1 - d;
        setOpacity(M.vv, op);
        g.visible = op > 0.01;
      },
      anchor: () => ref.localToWorld(new THREE.Vector3(Math.sin(vvLeft) * 9.25, 2.4, Math.cos(vvLeft) * 9.25)),
    };
  }

  // ---------- 6. 包层模块（贴在真空室内壁上的块状模块） ----------
  {
    const g = new THREE.Group();
    g.name = 'blanket';
    const mid = offsetClosed(vvInner, -0.32);
    const n = mid.length;
    // 按弧长切分极向行
    const cum = [0];
    for (let i = 1; i <= n; i++) cum.push(cum[i - 1] + mid[i % n].distanceTo(mid[i - 1]));
    const L = cum[n];
    const rows = hi ? 22 : 16;
    const nTor = hi ? 36 : 24;
    const meshes = [];
    const tmpM = new THREE.Matrix4();
    const at = (s) => {
      let i = cum.findIndex((c) => c >= s);
      if (i <= 0) i = 1;
      const f = (s - cum[i - 1]) / (cum[i] - cum[i - 1] || 1);
      const a = mid[(i - 1) % n];
      const b = mid[i % n];
      return new THREE.Vector2(a.x + (b.x - a.x) * f, a.y + (b.y - a.y) * f);
    };
    for (let r = 0; r < rows; r++) {
      const s0 = (r / rows) * L;
      const s1 = ((r + 1) / rows) * L;
      const pc = at((s0 + s1) / 2);
      // 偏滤器区域（底部）不放包层
      if (pc.y < -3.7 && pc.x > 4.2 && pc.x < 7.2) continue;
      const pa = at(s0);
      const pb = at(s1);
      const tan = new THREE.Vector2(pb.x - pa.x, pb.y - pa.y);
      const hgt = tan.length();
      tan.normalize();
      const nrm = new THREE.Vector2(tan.y, -tan.x); // 外法线（指向真空室壁）
      const w = (TAU / nTor) * pc.x * 0.9;
      const geo = new RoundedBoxGeometry(w, hgt * 0.9, 0.46, 2, 0.06);
      const inst = new THREE.InstancedMesh(geo, M.blanket, nTor);
      inst.castShadow = true; inst.receiveShadow = true;
      const items = [];
      let count = 0;
      for (let k = 0; k < nTor; k++) {
        const phi = (k + 0.5) * (TAU / nTor);
        if (inWedge(phi, CUT_CENTER, CUT_WIDTH)) continue;
        const eR = radialDir(phi);
        const eP = new THREE.Vector3(Math.cos(phi), 0, -Math.sin(phi));
        const T = new THREE.Vector3().addScaledVector(eR, tan.x).add(new THREE.Vector3(0, tan.y, 0));
        const N = new THREE.Vector3().addScaledVector(eR, nrm.x).add(new THREE.Vector3(0, nrm.y, 0));
        const X = eP.clone();
        const basis = new THREE.Matrix4().makeBasis(X, T, N);
        if (basis.determinant() < 0) basis.makeBasis(X.negate(), T, N);
        const pos = eR.clone().multiplyScalar(pc.x).add(new THREE.Vector3(0, pc.y, 0));
        items.push({ basis, pos, N: N.clone(), idx: count });
        tmpM.copy(basis).setPosition(pos);
        inst.setMatrixAt(count++, tmpM);
      }
      inst.count = count;
      inst.instanceMatrix.needsUpdate = true;
      inst.userData = { items, r };
      g.add(inst);
      meshes.push(inst);
    }
    root.add(g);
    let lastKey = '';
    comps.blanket = {
      step: 6, group: g, mats: [M.blanket],
      apply(e, d) {
        const key = e.toFixed(4) + '|' + d.toFixed(4);
        if (key !== lastKey) {
          lastKey = key;
          for (const inst of meshes) {
            const { items, r } = inst.userData;
            for (const it of items) {
              const stag = clamp(e * 1.6 - (r / rows) * 0.6);
              const off = 1.5 * stag + 10 * d;
              tmpM.copy(it.basis).setPosition(it.pos.clone().addScaledVector(it.N, off));
              inst.setMatrixAt(it.idx, tmpM);
            }
            inst.instanceMatrix.needsUpdate = true;
          }
        }
        const op = 1 - d;
        setOpacity(M.blanket, op);
        g.visible = op > 0.01;
      },
      anchorLive: (e, d) => {
        const phi = CUT_START + deg(6);
        const p = offsetClosed(vvInner, -0.55)[Math.round(n * 0.1)];
        const off = 1.5 * clamp(e * 1.6) + 10 * d;
        return radialDir(phi).multiplyScalar(p.x + off * 0.8).add(new THREE.Vector3(0, p.y + off * 0.5, 0));
      },
    };
  }

  // ---------- 7. 偏滤器（底部 54 个盒式模块） ----------
  {
    const g = new THREE.Group();
    g.name = 'divertor';
    const P = [
      [4.6, -4.98], [5.3, -5.16], [6.0, -5.02], [6.5, -4.72], [6.86, -4.32], [6.64, -3.62], [6.42, -3.66],
      [6.38, -4.16], [6.1, -4.36], [5.94, -4.06], [5.26, -4.06], [5.06, -4.42], [4.82, -4.26], [4.74, -3.72],
      [4.5, -3.76], [4.42, -4.5],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    const nCas = hi ? 54 : 36;
    const dphi = TAU / nCas;
    const casGeo = latheSolid(P, null, 0, dphi * 0.9, 4);
    const kept = [];
    for (let k = 0; k < nCas; k++) {
      const phi = k * dphi;
      if (inWedge(phi + dphi / 2, CUT_CENTER, CUT_WIDTH)) continue;
      kept.push(phi);
    }
    const inst = new THREE.InstancedMesh(casGeo, M.divertor, kept.length);
    inst.castShadow = true; inst.receiveShadow = true;
    // 打击点高温条带（发光）
    const stripIn = latheSolid(roundedRectProfile(4.6, -3.95, 0.09, 0.5, 0.03, 1), null, 0, dphi * 0.86, 3);
    const stripOut = latheSolid(roundedRectProfile(6.5, -3.92, 0.09, 0.5, 0.03, 1), null, 0, dphi * 0.86, 3);
    const hotGeo = mergeGeometries([stripIn, stripOut], false);
    const hot = new THREE.InstancedMesh(hotGeo, M.hot, kept.length);
    const tmpM = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const sc = new THREE.Vector3(1, 1, 1);
    const place = (e, d) => {
      kept.forEach((phi, i) => {
        q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), phi);
        const stag = clamp(e * 1.5 - (i / kept.length) * 0.5);
        const mid = phi + dphi / 2;
        const p = new THREE.Vector3(Math.sin(mid) * (0.8 * stag), -(2.6 * stag + 13 * d), Math.cos(mid) * (0.8 * stag));
        tmpM.compose(p, q, sc);
        inst.setMatrixAt(i, tmpM);
        hot.setMatrixAt(i, tmpM);
      });
      inst.instanceMatrix.needsUpdate = true;
      hot.instanceMatrix.needsUpdate = true;
    };
    place(0, 0);
    g.add(inst, hot);
    root.add(g);
    let lastKey = '';
    comps.divertor = {
      step: 7, group: g, mats: [M.divertor, M.hot],
      apply(e, d, t) {
        const key = e.toFixed(4) + '|' + d.toFixed(4);
        if (key !== lastKey) { lastKey = key; place(e, d); }
        const op = 1 - d;
        setOpacity(M.divertor, op); setOpacity(M.hot, op);
        M.hot.emissiveIntensity = (2.4 + 1.6 * e) * (0.85 + 0.15 * Math.sin(t * 3.0));
        g.visible = op > 0.01;
      },
      anchorLive: (e, d) => {
        const phi = kept[0] + dphi * 0.5;
        const stag = clamp(e * 1.5);
        return new THREE.Vector3(Math.sin(phi) * (5.6 + 0.8 * stag), -3.95 - (2.6 * stag + 13 * d), Math.cos(phi) * (5.6 + 0.8 * stag));
      },
    };
  }

  // ---------- 8. 等离子体 + 磁力线 ----------
  {
    const g = new THREE.Group();
    g.name = 'plasma';
    const prof = dCurve(6.2, 2.0, 1.7, 0.33, S(160));
    const shellGeo = new THREE.LatheGeometry([...prof, prof[0].clone()], S(160));
    const coreProf = dCurve(6.25, 1.25, 1.55, 0.25, S(96));
    const coreGeo = new THREE.LatheGeometry([...coreProf, coreProf[0].clone()], S(120));
    const uniforms = {
      uTime: { value: 0 },
      uIntensity: { value: 1 },
      uOpacity: { value: 1 },
      uCore: { value: new THREE.Color(1.0, 0.22, 0.74) },
      uEdge: { value: new THREE.Color(0.42, 0.24, 1.0) },
    };
    const vs = /* glsl */`
      varying vec3 vN; varying vec3 vV; varying vec3 vL;
      void main(){
        vec4 wp = modelMatrix * vec4(position,1.0);
        vL = position;
        vN = normalize(mat3(modelMatrix) * normal);
        vV = normalize(cameraPosition - wp.xyz);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`;
    const fsCommon = /* glsl */`
      uniform float uTime; uniform float uIntensity; uniform float uOpacity;
      uniform vec3 uCore; uniform vec3 uEdge;
      varying vec3 vN; varying vec3 vV; varying vec3 vL;
      float hash(vec3 p){ p = fract(p*0.3183099 + 0.1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
      float noise(vec3 x){ vec3 i=floor(x); vec3 f=fract(x); f=f*f*(3.0-2.0*f);
        return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x), mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
                   mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x), mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y), f.z); }
    `;
    const shellMat = new THREE.ShaderMaterial({
      uniforms, vertexShader: vs, transparent: true, depthWrite: false, side: THREE.FrontSide,
      fragmentShader: fsCommon + /* glsl */`
      void main(){
        float fres = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 1.8);
        float phi = atan(vL.x, vL.z);
        float th = atan(vL.y, length(vL.xz) - 6.2);
        float s1 = noise(vec3(phi*6.0 + th*3.0 - uTime*1.4, th*2.2, uTime*0.25));
        float s2 = noise(vec3(phi*16.0 - uTime*2.6, th*5.0 + uTime*0.4, 1.7));
        float glow = 0.55 + 1.25*fres + 0.5*s1*s1 + 0.25*s2;
        vec3 col = mix(uCore, uEdge, clamp(fres*1.25, 0.0, 1.0));
        float a = clamp(0.16 + 0.72*pow(fres, 1.25) + 0.16*s1, 0.0, 1.0) * uOpacity;
        gl_FragColor = vec4(col * glow * uIntensity * 1.15, a);
      }`,
    });
    const coreMat = new THREE.ShaderMaterial({
      uniforms, vertexShader: vs, transparent: true, depthWrite: false,
      fragmentShader: fsCommon + /* glsl */`
      void main(){
        float fres = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 1.2);
        float phi = atan(vL.x, vL.z);
        float s1 = noise(vec3(phi*9.0 - uTime*2.0, vL.y*1.2, uTime*0.5));
        vec3 col = mix(vec3(1.0, 0.45, 0.85), vec3(1.0, 0.9, 0.98), s1);
        gl_FragColor = vec4(col * (0.9 + 0.8*s1) * uIntensity, (0.10 + 0.22*(1.0-fres)) * uOpacity);
      }`,
    });
    const shell = new THREE.Mesh(shellGeo, shellMat);
    const core = new THREE.Mesh(coreGeo, coreMat);
    shell.renderOrder = 10;
    core.renderOrder = 11;
    g.add(core, shell);

    // 螺旋磁力线（安全因子 q≈3：绕环向 3 圈、极向 1 圈）
    const lineUniforms = { uTime: { value: 0 }, uOpacity: { value: 0 } };
    const lineMat = new THREE.ShaderMaterial({
      uniforms: lineUniforms, transparent: true, depthWrite: false,
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);} `,
      fragmentShader: `uniform float uTime; uniform float uOpacity; varying vec2 vUv;
        void main(){ float p = fract(vUv.x*14.0 - uTime*0.35); float pulse = pow(p, 4.0);
          vec3 c = mix(vec3(0.05,0.45,1.0), vec3(0.75,0.95,1.0), pulse);
          gl_FragColor = vec4(c*(1.0+2.4*pulse), (0.6+0.4*pulse)*uOpacity); }`,
    });
    const lines = [];
    const nl = hi ? 5 : 3;
    for (let j = 0; j < nl; j++) {
      const pts = [];
      const th0 = (j / nl) * TAU;
      const N = 520;
      for (let i = 0; i <= N; i++) {
        const u = i / N;
        const phi = u * TAU * 3;
        const th = th0 + u * TAU;
        const a = 2.12;
        const R = 6.2 + a * Math.cos(th + 0.33 * Math.sin(th));
        const Z = 1.7 * a * Math.sin(th);
        pts.push(new THREE.Vector3(Math.sin(phi) * R, Z, Math.cos(phi) * R));
      }
      const curve = new THREE.CatmullRomCurve3(pts, true);
      const lg = new THREE.TubeGeometry(curve, hi ? 900 : 500, 0.055, 6, true);
      const lm = new THREE.Mesh(lg, lineMat);
      lm.renderOrder = 12;
      g.add(lm);
      lines.push(lm);
    }

    // 等离子体光晕（法线混合，在明亮背景上也看得见）
    const hc = document.createElement('canvas');
    hc.width = hc.height = 256;
    const hg = hc.getContext('2d');
    const grd = hg.createRadialGradient(128, 128, 20, 128, 128, 128);
    grd.addColorStop(0, 'rgba(255,120,220,0.55)');
    grd.addColorStop(0.45, 'rgba(160,90,255,0.28)');
    grd.addColorStop(1, 'rgba(160,90,255,0)');
    hg.fillStyle = grd;
    hg.fillRect(0, 0, 256, 256);
    const haloTex = new THREE.CanvasTexture(hc);
    haloTex.colorSpace = THREE.SRGBColorSpace;
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex, transparent: true, depthWrite: false, opacity: 0 }));
    halo.scale.set(30, 22, 1);
    halo.renderOrder = 9;
    g.add(halo);

    // 等离子体照亮周围部件
    const lights = [];
    const nLights = hi ? 3 : 1;
    for (let i = 0; i < nLights; i++) {
      const L = new THREE.PointLight(0xff5fd6, hi ? 26 : 34, 18, 2);
      const a = CUT_CENTER + (i - (nLights - 1) / 2) * deg(80);
      L.position.set(Math.sin(a) * 6.2, 0, Math.cos(a) * 6.2);
      g.add(L);
      lights.push(L);
    }
    root.add(g);
    comps.plasma = {
      step: 8, group: g, noDepart: true, uniforms, lineUniforms,
      apply(e, d, t) {
        uniforms.uTime.value = t;
        lineUniforms.uTime.value = t;
        uniforms.uIntensity.value = 1.0 + 0.45 * e;
        lineUniforms.uOpacity.value = e;
        halo.material.opacity = 0.85 * e;
        lines.forEach((l) => { l.visible = e > 0.01; });
        lights.forEach((L) => { L.intensity = (hi ? 26 : 34) * (1 + 0.8 * e) * (0.92 + 0.08 * Math.sin(t * 5.3)); });
      },
      anchor: () => g.localToWorld(new THREE.Vector3(Math.sin(CUT_CENTER + deg(14)) * 8.15, -0.6, Math.cos(CUT_CENTER + deg(14)) * 8.15)),
    };
  }

  // ---------- 编排 ----------
  const order = ['cryostat', 'tf', 'pf', 'cs', 'vv', 'blanket', 'divertor', 'plasma'];
  const state = {};
  function update(s, t) {
    const rho = smooth(8.3, 8.92, s);
    for (const key of order) {
      const c = comps[key];
      const e = smooth(c.step - 0.8, c.step - 0.1, s) * (1 - rho);
      const d = c.noDepart ? 0 : smooth(c.step + 0.4, c.step + 0.95, s) * (1 - rho);
      state[key] = { e, d };
      c.apply(e, d, t);
    }
  }
  function anchor(key) {
    const c = comps[key];
    if (!c) return null;
    root.updateMatrixWorld(true);
    if (c.anchorLive) {
      const st = state[key] || { e: 0, d: 0 };
      return root.localToWorld(c.anchorLive(st.e, st.d));
    }
    return c.anchor();
  }
  update(0, 0);
  return { root, update, anchor, comps, order, state };
}
