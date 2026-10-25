/* AI 的电从哪来 · 网页脚本（由 js/src/ 下的 util.js、tokamak.js、flow.js、main.js 打包生成） */

// ../../交付/web/js/src/main.js
import * as THREE4 from "three";
import { EffectComposer } from "three-addons";
import { RenderPass } from "three-addons";
import { UnrealBloomPass } from "three-addons";
import { OutputPass } from "three-addons";
import { RoomEnvironment } from "three-addons";

// ../../交付/web/js/src/tokamak.js
import * as THREE2 from "three";
import { RoundedBoxGeometry } from "three-addons";
import { mergeGeometries as mergeGeometries2 } from "three-addons";

// ../../交付/web/js/src/util.js
import * as THREE from "three";
import { mergeGeometries } from "three-addons";
var TAU = Math.PI * 2;
var clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
var lerp = (a, b, t) => a + (b - a) * t;
var smooth = (e0, e1, x) => {
  const t = clamp((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};
var easeInOut = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
function dCurve(R0, a, kappa, delta, n = 160, zShift = 0) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const t = i / n * TAU;
    pts.push(new THREE.Vector2(
      R0 + a * Math.cos(t + delta * Math.sin(t)),
      zShift + kappa * a * Math.sin(t)
    ));
  }
  return pts;
}
function offsetClosed(pts, d) {
  const n = pts.length;
  const out = [];
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[(i + 1) % n];
    const tx = p1.x - p0.x;
    const ty = p1.y - p0.y;
    const len = Math.hypot(tx, ty) || 1;
    out.push(new THREE.Vector2(pts[i].x + ty / len * d, pts[i].y - tx / len * d));
  }
  return out;
}
var closeLoop = (pts) => [...pts, pts[0].clone()];
function flipFaces(g) {
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
function latheSolid(outer, inner, phiStart, phiLength, segs) {
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
function roundedRectProfile(cx, cz, w, h, r, seg = 4) {
  const pts = [];
  const corners = [
    [cx + w / 2 - r, cz - h / 2 + r, -Math.PI / 2],
    [cx + w / 2 - r, cz + h / 2 - r, 0],
    [cx - w / 2 + r, cz + h / 2 - r, Math.PI / 2],
    [cx - w / 2 + r, cz - h / 2 + r, Math.PI]
  ];
  for (const [x, z, a0] of corners) {
    for (let i = 0; i <= seg; i++) {
      const a = a0 + i / seg * (Math.PI / 2);
      pts.push(new THREE.Vector2(x + r * Math.cos(a), z + r * Math.sin(a)));
    }
  }
  return pts;
}
var radialDir = (phi) => new THREE.Vector3(Math.sin(phi), 0, Math.cos(phi));
function inWedge(phi, center, width) {
  let d = ((phi - center) % TAU + TAU) % TAU;
  if (d > Math.PI) d -= TAU;
  return Math.abs(d) < width / 2;
}
function setOpacity(mat, op) {
  const o = clamp(op);
  mat.opacity = o;
  const tr = o < 0.995;
  if (mat.transparent !== tr) {
    mat.transparent = tr;
    mat.needsUpdate = true;
  }
  mat.depthWrite = o > 0.6;
}

// ../../交付/web/js/src/tokamak.js
var deg = THREE2.MathUtils.degToRad;
var CUT_CENTER = deg(32);
var CUT_WIDTH = deg(80);
var SECTOR0 = deg(-8);
var CUT_START = CUT_CENTER + CUT_WIDTH / 2;
var KEEP_LEN = TAU - CUT_WIDTH;
function makeMat(hi, p) {
  if (hi) return new THREE2.MeshPhysicalMaterial(p);
  const { clearcoat, clearcoatRoughness, sheen, sheenColor, sheenRoughness, iridescence, ...rest } = p;
  return new THREE2.MeshStandardMaterial(rest);
}
function buildTokamak({ quality = "high" } = {}) {
  const hi = quality === "high";
  const segK = hi ? 1 : 0.55;
  const S = (n) => Math.max(8, Math.round(n * segK));
  const root = new THREE2.Group();
  root.name = "tokamak";
  const M = {
    cryo: makeMat(hi, { color: 15988216, metalness: 0.25, roughness: 0.32, clearcoat: 0.6, clearcoatRoughness: 0.25 }),
    cryoInner: makeMat(hi, { color: 13227750, metalness: 0.4, roughness: 0.4 }),
    base: makeMat(hi, { color: 15002095, metalness: 0.2, roughness: 0.55 }),
    tf: makeMat(hi, { color: 3105504, metalness: 0.55, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.12 }),
    tfPack: makeMat(hi, { color: 14190911, metalness: 0.9, roughness: 0.3 }),
    pf: makeMat(hi, { color: 14711356, metalness: 0.85, roughness: 0.26, clearcoat: 0.6, clearcoatRoughness: 0.2 }),
    cs: makeMat(hi, { color: 15317321, metalness: 0.9, roughness: 0.22, clearcoat: 0.5, clearcoatRoughness: 0.2 }),
    vv: makeMat(hi, { color: 13620702, metalness: 0.92, roughness: 0.24, clearcoat: 0.4, clearcoatRoughness: 0.2 }),
    vvPort: makeMat(hi, { color: 12174030, metalness: 0.9, roughness: 0.3 }),
    blanket: makeMat(hi, { color: 14140060, metalness: 0.35, roughness: 0.38, clearcoat: 0.3, clearcoatRoughness: 0.3 }),
    divertor: makeMat(hi, { color: 4870492, metalness: 0.75, roughness: 0.35 }),
    hot: new THREE2.MeshStandardMaterial({ color: 16747050, emissive: 16738832, emissiveIntensity: 3.2, roughness: 0.5 })
  };
  M.cryo.side = THREE2.FrontSide;
  const comps = {};
  {
    const g = new THREE2.Group();
    g.name = "cryostat";
    const cw = CUT_WIDTH + deg(24);
    const cs = CUT_CENTER + cw / 2;
    const cl = TAU - cw;
    const wall = roundedRectProfile(13.75, -0.3, 0.42, 20.4, 0.12, 2);
    const wallMesh = new THREE2.Mesh(latheSolid(wall, null, cs, cl, S(120)), M.cryo);
    const lid = [];
    const lidOut = [];
    for (let i = 0; i <= 24; i++) {
      const a = i / 24 * (Math.PI / 2);
      lidOut.push(new THREE2.Vector2(13.95 * Math.cos(a) + 1e-3, 9.9 + 4.2 * Math.sin(a)));
    }
    const lidIn = lidOut.map((p) => new THREE2.Vector2(Math.max(1e-3, p.x - 0.38 * Math.cos(Math.atan2((p.y - 9.9) / 4.2, p.x / 13.95))), p.y - 0.34));
    lid.push(...lidOut, ...lidIn.reverse());
    const lidMesh = new THREE2.Mesh(latheSolid(lid, null, cs, cl, S(120)), M.cryo);
    const ring = roundedRectProfile(13.35, 9.6, 0.5, 0.5, 0.1, 2);
    const ringMesh = new THREE2.Mesh(latheSolid(ring, null, cs, cl, S(120)), M.cryoInner);
    g.add(wallMesh, lidMesh, ringMesh);
    [wallMesh, lidMesh, ringMesh].forEach((m) => {
      m.castShadow = true;
      m.receiveShadow = true;
    });
    const basePf = roundedRectProfile(7.4, -11.1, 14.8, 1.2, 0.2, 2).map((p) => new THREE2.Vector2(Math.max(1e-3, p.x), p.y));
    const baseMesh = new THREE2.Mesh(latheSolid(basePf, null, cs, cl, S(120)), M.base);
    baseMesh.receiveShadow = true;
    baseMesh.castShadow = true;
    root.add(baseMesh);
    root.add(g);
    comps.cryostat = {
      step: 1,
      group: g,
      mats: [M.cryo, M.cryoInner],
      apply(e, d) {
        g.position.y = 10 * e + 26 * d;
        const op = 1 - d;
        setOpacity(M.cryo, op);
        setOpacity(M.cryoInner, op);
        g.visible = op > 0.01;
      },
      anchor: () => g.localToWorld(new THREE2.Vector3(Math.sin(CUT_CENTER + deg(150)) * 9.5, 12.6, Math.cos(CUT_CENTER + deg(150)) * 9.5))
    };
  }
  {
    const g = new THREE2.Group();
    g.name = "tf";
    const tfC = dCurve(6.71, 4.29, 1.865, 0.5, S(220));
    const outer = offsetClosed(tfC, 0.44);
    const inner = offsetClosed(tfC, -0.44);
    const shape = new THREE2.Shape(outer);
    shape.holes.push(new THREE2.Path(inner));
    const depth = 0.82;
    const geo = new THREE2.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: true,
      bevelThickness: 0.07,
      bevelSize: 0.07,
      bevelSegments: hi ? 3 : 1,
      curveSegments: 4,
      steps: 1
    });
    geo.translate(0, 0, -depth / 2);
    const packShape = new THREE2.Shape(offsetClosed(tfC, 0.16));
    packShape.holes.push(new THREE2.Path(offsetClosed(tfC, -0.16)));
    const packGeo = new THREE2.ExtrudeGeometry(packShape, { depth: depth + 0.2, bevelEnabled: false, curveSegments: 4, steps: 1 });
    packGeo.translate(0, 0, -(depth + 0.2) / 2);
    const coils = [];
    for (let k = 0; k < 18; k++) {
      const phi = SECTOR0 + deg(20) * k;
      if (inWedge(phi, CUT_CENTER, CUT_WIDTH - deg(4))) continue;
      const c = new THREE2.Group();
      const m = new THREE2.Mesh(geo, M.tf);
      const p = new THREE2.Mesh(packGeo, M.tfPack);
      m.castShadow = true;
      m.receiveShadow = true;
      c.add(m, p);
      c.rotation.y = phi - Math.PI / 2;
      c.userData.phi = phi;
      g.add(c);
      coils.push(c);
    }
    root.add(g);
    const leftEdge = CUT_CENTER - CUT_WIDTH / 2;
    const ref = coils.reduce((best, c) => {
      let d = Math.abs(((c.userData.phi - leftEdge) % TAU + TAU) % TAU);
      d = Math.min(d, TAU - d);
      return !best || d < best.d ? { c, d } : best;
    }, null).c;
    comps.tf = {
      step: 2,
      group: g,
      mats: [M.tf, M.tfPack],
      apply(e, d) {
        for (const c of coils) {
          const dir = radialDir(c.userData.phi);
          c.position.copy(dir.multiplyScalar(4.6 * e + 24 * d));
          c.position.y = 1.2 * e;
        }
        const op = 1 - d;
        setOpacity(M.tf, op);
        setOpacity(M.tfPack, op);
        g.visible = op > 0.01;
      },
      anchor: () => ref.localToWorld(new THREE2.Vector3(5.4, 8.35, 0.5))
    };
  }
  {
    const g = new THREE2.Group();
    g.name = "pf";
    const tfC = dCurve(6.71, 4.29, 1.865, 0.5, 360);
    const off = offsetClosed(tfC, 1.25);
    const spec = [
      { t: 112, w: 0.95, h: 0.95 },
      { t: 55, w: 0.75, h: 1.05 },
      { t: 17, w: 0.8, h: 1.35 },
      { t: -17, w: 0.8, h: 1.35 },
      { t: -55, w: 0.75, h: 1.05 },
      { t: -112, w: 0.95, h: 0.95 }
    ];
    const rings = spec.map((s, i) => {
      const idx = Math.round((s.t % 360 + 360) % 360 / 360 * off.length) % off.length;
      const p = off[idx];
      const prof = roundedRectProfile(p.x, p.y, s.w, s.h, 0.16, 3);
      const mesh = new THREE2.Mesh(latheSolid(prof, null, CUT_START, KEEP_LEN, S(140)), M.pf);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData = { sign: s.t > 0 ? 1 : -1, R: p.x, Z: p.y, i };
      g.add(mesh);
      return mesh;
    });
    root.add(g);
    comps.pf = {
      step: 3,
      group: g,
      mats: [M.pf],
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
        return r.localToWorld(new THREE2.Vector3(Math.sin(a) * (r.userData.R + 0.45), r.userData.Z + 0.75, Math.cos(a) * (r.userData.R + 0.45)));
      }
    };
  }
  {
    const g = new THREE2.Group();
    g.name = "cs";
    const mods = [];
    const h = 2;
    const gap = 0.1;
    const total = 6 * h + 5 * gap;
    for (let k = 0; k < 6; k++) {
      const z0 = -total / 2 + k * (h + gap);
      const prof = roundedRectProfile(1.6, z0 + h / 2, 0.66, h, 0.08, 2);
      const mesh = new THREE2.Mesh(latheSolid(prof, null, CUT_START, KEEP_LEN, S(72)), M.cs);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData.k = k;
      g.add(mesh);
      mods.push(mesh);
    }
    const capProf = roundedRectProfile(1.6, total / 2 + 0.45, 0.9, 0.7, 0.1, 2);
    const capTop = new THREE2.Mesh(latheSolid(capProf, null, CUT_START, KEEP_LEN, S(72)), M.vvPort);
    const capBot = capTop.clone();
    capBot.position.y = -total - 0.9;
    g.add(capTop, capBot);
    root.add(g);
    comps.cs = {
      step: 4,
      group: g,
      mats: [M.cs],
      apply(e, d) {
        for (const m of mods) m.position.y = e * (4.5 + m.userData.k * 0.75) + 28 * d;
        capTop.position.y = e * (4.5 + 5 * 0.75 + 0.6) + 28 * d;
        capBot.position.y = -total - 0.9 + e * 3.6 + 28 * d;
        const op = 1 - d;
        setOpacity(M.cs, op);
        g.visible = op > 0.01;
      },
      anchor: () => mods[5].localToWorld(new THREE2.Vector3(Math.sin(CUT_CENTER + Math.PI) * 1.6, 6.25, Math.cos(CUT_CENTER + Math.PI) * 1.6))
    };
  }
  const vvInner = dCurve(6.2, 2.65, 2, 0.35, S(200));
  {
    const g = new THREE2.Group();
    g.name = "vv";
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
        latheSolid(wallIn[1], wallIn[0], a0 + pad, deg(40) - 2 * pad, S(28))
      ];
      for (const ae of [a0 + pad, a0 + deg(40) - pad - deg(1.2)]) {
        geos.push(latheSolid(wallOut[0], wallIn[1], ae, deg(1.2), 2));
      }
      for (const off of [10, 30]) {
        const pa = a0 + deg(off);
        const eq = new RoundedBoxGeometry(1.5, 2.1, 2.9, 2, 0.12);
        eq.rotateY(pa);
        eq.translate(Math.sin(pa) * 10.6, 0, Math.cos(pa) * 10.6);
        const up = new RoundedBoxGeometry(1.2, 3, 1.25, 2, 0.12);
        up.rotateY(pa);
        up.translate(Math.sin(pa) * 6, 6.75, Math.cos(pa) * 6);
        const fl = new THREE2.CylinderGeometry(0.95, 0.95, 0.25, S(24));
        fl.rotateX(Math.PI / 2);
        fl.rotateY(pa);
        fl.translate(Math.sin(pa) * 12.1, 0, Math.cos(pa) * 12.1);
        geos.push(eq, up, fl);
      }
      const geo = mergeGeometries2(geos.map((x) => x.index ? x.toNonIndexed() : x), false);
      geos.forEach((x) => x.dispose());
      const mesh = new THREE2.Mesh(geo, M.vv);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
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
      step: 5,
      group: g,
      mats: [M.vv],
      apply(e, d) {
        for (const s of sectors) {
          s.position.copy(radialDir(s.userData.mid).multiplyScalar(3.4 * e + 20 * d));
        }
        const op = 1 - d;
        setOpacity(M.vv, op);
        g.visible = op > 0.01;
      },
      anchor: () => ref.localToWorld(new THREE2.Vector3(Math.sin(vvLeft) * 9.25, 2.4, Math.cos(vvLeft) * 9.25))
    };
  }
  {
    const g = new THREE2.Group();
    g.name = "blanket";
    const mid = offsetClosed(vvInner, -0.32);
    const n = mid.length;
    const cum = [0];
    for (let i = 1; i <= n; i++) cum.push(cum[i - 1] + mid[i % n].distanceTo(mid[i - 1]));
    const L = cum[n];
    const rows = hi ? 22 : 16;
    const nTor = hi ? 36 : 24;
    const meshes = [];
    const tmpM = new THREE2.Matrix4();
    const at = (s) => {
      let i = cum.findIndex((c) => c >= s);
      if (i <= 0) i = 1;
      const f = (s - cum[i - 1]) / (cum[i] - cum[i - 1] || 1);
      const a = mid[(i - 1) % n];
      const b = mid[i % n];
      return new THREE2.Vector2(a.x + (b.x - a.x) * f, a.y + (b.y - a.y) * f);
    };
    for (let r = 0; r < rows; r++) {
      const s0 = r / rows * L;
      const s1 = (r + 1) / rows * L;
      const pc = at((s0 + s1) / 2);
      if (pc.y < -3.7 && pc.x > 4.2 && pc.x < 7.2) continue;
      const pa = at(s0);
      const pb = at(s1);
      const tan = new THREE2.Vector2(pb.x - pa.x, pb.y - pa.y);
      const hgt = tan.length();
      tan.normalize();
      const nrm = new THREE2.Vector2(tan.y, -tan.x);
      const w = TAU / nTor * pc.x * 0.9;
      const geo = new RoundedBoxGeometry(w, hgt * 0.9, 0.46, 2, 0.06);
      const inst = new THREE2.InstancedMesh(geo, M.blanket, nTor);
      inst.castShadow = true;
      inst.receiveShadow = true;
      const items = [];
      let count = 0;
      for (let k = 0; k < nTor; k++) {
        const phi = (k + 0.5) * (TAU / nTor);
        if (inWedge(phi, CUT_CENTER, CUT_WIDTH)) continue;
        const eR = radialDir(phi);
        const eP = new THREE2.Vector3(Math.cos(phi), 0, -Math.sin(phi));
        const T = new THREE2.Vector3().addScaledVector(eR, tan.x).add(new THREE2.Vector3(0, tan.y, 0));
        const N = new THREE2.Vector3().addScaledVector(eR, nrm.x).add(new THREE2.Vector3(0, nrm.y, 0));
        const X = eP.clone();
        const basis = new THREE2.Matrix4().makeBasis(X, T, N);
        if (basis.determinant() < 0) basis.makeBasis(X.negate(), T, N);
        const pos = eR.clone().multiplyScalar(pc.x).add(new THREE2.Vector3(0, pc.y, 0));
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
    let lastKey = "";
    comps.blanket = {
      step: 6,
      group: g,
      mats: [M.blanket],
      apply(e, d) {
        const key = e.toFixed(4) + "|" + d.toFixed(4);
        if (key !== lastKey) {
          lastKey = key;
          for (const inst of meshes) {
            const { items, r } = inst.userData;
            for (const it of items) {
              const stag = clamp(e * 1.6 - r / rows * 0.6);
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
        return radialDir(phi).multiplyScalar(p.x + off * 0.8).add(new THREE2.Vector3(0, p.y + off * 0.5, 0));
      }
    };
  }
  {
    const g = new THREE2.Group();
    g.name = "divertor";
    const P = [
      [4.6, -4.98],
      [5.3, -5.16],
      [6, -5.02],
      [6.5, -4.72],
      [6.86, -4.32],
      [6.64, -3.62],
      [6.42, -3.66],
      [6.38, -4.16],
      [6.1, -4.36],
      [5.94, -4.06],
      [5.26, -4.06],
      [5.06, -4.42],
      [4.82, -4.26],
      [4.74, -3.72],
      [4.5, -3.76],
      [4.42, -4.5]
    ].map(([x, y]) => new THREE2.Vector2(x, y));
    const nCas = hi ? 54 : 36;
    const dphi = TAU / nCas;
    const casGeo = latheSolid(P, null, 0, dphi * 0.9, 4);
    const kept = [];
    for (let k = 0; k < nCas; k++) {
      const phi = k * dphi;
      if (inWedge(phi + dphi / 2, CUT_CENTER, CUT_WIDTH)) continue;
      kept.push(phi);
    }
    const inst = new THREE2.InstancedMesh(casGeo, M.divertor, kept.length);
    inst.castShadow = true;
    inst.receiveShadow = true;
    const stripIn = latheSolid(roundedRectProfile(4.6, -3.95, 0.09, 0.5, 0.03, 1), null, 0, dphi * 0.86, 3);
    const stripOut = latheSolid(roundedRectProfile(6.5, -3.92, 0.09, 0.5, 0.03, 1), null, 0, dphi * 0.86, 3);
    const hotGeo = mergeGeometries2([stripIn, stripOut], false);
    const hot = new THREE2.InstancedMesh(hotGeo, M.hot, kept.length);
    const tmpM = new THREE2.Matrix4();
    const q = new THREE2.Quaternion();
    const sc = new THREE2.Vector3(1, 1, 1);
    const place = (e, d) => {
      kept.forEach((phi, i) => {
        q.setFromAxisAngle(new THREE2.Vector3(0, 1, 0), phi);
        const stag = clamp(e * 1.5 - i / kept.length * 0.5);
        const mid = phi + dphi / 2;
        const p = new THREE2.Vector3(Math.sin(mid) * (0.8 * stag), -(2.6 * stag + 13 * d), Math.cos(mid) * (0.8 * stag));
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
    let lastKey = "";
    comps.divertor = {
      step: 7,
      group: g,
      mats: [M.divertor, M.hot],
      apply(e, d, t) {
        const key = e.toFixed(4) + "|" + d.toFixed(4);
        if (key !== lastKey) {
          lastKey = key;
          place(e, d);
        }
        const op = 1 - d;
        setOpacity(M.divertor, op);
        setOpacity(M.hot, op);
        M.hot.emissiveIntensity = (2.4 + 1.6 * e) * (0.85 + 0.15 * Math.sin(t * 3));
        g.visible = op > 0.01;
      },
      anchorLive: (e, d) => {
        const phi = kept[0] + dphi * 0.5;
        const stag = clamp(e * 1.5);
        return new THREE2.Vector3(Math.sin(phi) * (5.6 + 0.8 * stag), -3.95 - (2.6 * stag + 13 * d), Math.cos(phi) * (5.6 + 0.8 * stag));
      }
    };
  }
  {
    const g = new THREE2.Group();
    g.name = "plasma";
    const prof = dCurve(6.2, 2, 1.7, 0.33, S(160));
    const shellGeo = new THREE2.LatheGeometry([...prof, prof[0].clone()], S(160));
    const coreProf = dCurve(6.25, 1.25, 1.55, 0.25, S(96));
    const coreGeo = new THREE2.LatheGeometry([...coreProf, coreProf[0].clone()], S(120));
    const uniforms = {
      uTime: { value: 0 },
      uIntensity: { value: 1 },
      uOpacity: { value: 1 },
      uCore: { value: new THREE2.Color(1, 0.22, 0.74) },
      uEdge: { value: new THREE2.Color(0.42, 0.24, 1) }
    };
    const vs = (
      /* glsl */
      `
      varying vec3 vN; varying vec3 vV; varying vec3 vL;
      void main(){
        vec4 wp = modelMatrix * vec4(position,1.0);
        vL = position;
        vN = normalize(mat3(modelMatrix) * normal);
        vV = normalize(cameraPosition - wp.xyz);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`
    );
    const fsCommon = (
      /* glsl */
      `
      uniform float uTime; uniform float uIntensity; uniform float uOpacity;
      uniform vec3 uCore; uniform vec3 uEdge;
      varying vec3 vN; varying vec3 vV; varying vec3 vL;
      float hash(vec3 p){ p = fract(p*0.3183099 + 0.1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
      float noise(vec3 x){ vec3 i=floor(x); vec3 f=fract(x); f=f*f*(3.0-2.0*f);
        return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x), mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
                   mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x), mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y), f.z); }
    `
    );
    const shellMat = new THREE2.ShaderMaterial({
      uniforms,
      vertexShader: vs,
      transparent: true,
      depthWrite: false,
      side: THREE2.FrontSide,
      fragmentShader: fsCommon + /* glsl */
      `
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
      }`
    });
    const coreMat = new THREE2.ShaderMaterial({
      uniforms,
      vertexShader: vs,
      transparent: true,
      depthWrite: false,
      fragmentShader: fsCommon + /* glsl */
      `
      void main(){
        float fres = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 1.2);
        float phi = atan(vL.x, vL.z);
        float s1 = noise(vec3(phi*9.0 - uTime*2.0, vL.y*1.2, uTime*0.5));
        vec3 col = mix(vec3(1.0, 0.45, 0.85), vec3(1.0, 0.9, 0.98), s1);
        gl_FragColor = vec4(col * (0.9 + 0.8*s1) * uIntensity, (0.10 + 0.22*(1.0-fres)) * uOpacity);
      }`
    });
    const shell = new THREE2.Mesh(shellGeo, shellMat);
    const core = new THREE2.Mesh(coreGeo, coreMat);
    shell.renderOrder = 10;
    core.renderOrder = 11;
    g.add(core, shell);
    const lineUniforms = { uTime: { value: 0 }, uOpacity: { value: 0 } };
    const lineMat = new THREE2.ShaderMaterial({
      uniforms: lineUniforms,
      transparent: true,
      depthWrite: false,
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);} `,
      fragmentShader: `uniform float uTime; uniform float uOpacity; varying vec2 vUv;
        void main(){ float p = fract(vUv.x*14.0 - uTime*0.35); float pulse = pow(p, 4.0);
          vec3 c = mix(vec3(0.05,0.45,1.0), vec3(0.75,0.95,1.0), pulse);
          gl_FragColor = vec4(c*(1.0+2.4*pulse), (0.6+0.4*pulse)*uOpacity); }`
    });
    const lines = [];
    const nl = hi ? 5 : 3;
    for (let j = 0; j < nl; j++) {
      const pts = [];
      const th0 = j / nl * TAU;
      const N = 520;
      for (let i = 0; i <= N; i++) {
        const u = i / N;
        const phi = u * TAU * 3;
        const th = th0 + u * TAU;
        const a = 2.12;
        const R = 6.2 + a * Math.cos(th + 0.33 * Math.sin(th));
        const Z = 1.7 * a * Math.sin(th);
        pts.push(new THREE2.Vector3(Math.sin(phi) * R, Z, Math.cos(phi) * R));
      }
      const curve = new THREE2.CatmullRomCurve3(pts, true);
      const lg = new THREE2.TubeGeometry(curve, hi ? 900 : 500, 0.055, 6, true);
      const lm = new THREE2.Mesh(lg, lineMat);
      lm.renderOrder = 12;
      g.add(lm);
      lines.push(lm);
    }
    const hc = document.createElement("canvas");
    hc.width = hc.height = 256;
    const hg = hc.getContext("2d");
    const grd = hg.createRadialGradient(128, 128, 20, 128, 128, 128);
    grd.addColorStop(0, "rgba(255,120,220,0.55)");
    grd.addColorStop(0.45, "rgba(160,90,255,0.28)");
    grd.addColorStop(1, "rgba(160,90,255,0)");
    hg.fillStyle = grd;
    hg.fillRect(0, 0, 256, 256);
    const haloTex = new THREE2.CanvasTexture(hc);
    haloTex.colorSpace = THREE2.SRGBColorSpace;
    const halo = new THREE2.Sprite(new THREE2.SpriteMaterial({ map: haloTex, transparent: true, depthWrite: false, opacity: 0 }));
    halo.scale.set(30, 22, 1);
    halo.renderOrder = 9;
    g.add(halo);
    const lights = [];
    const nLights = hi ? 3 : 1;
    for (let i = 0; i < nLights; i++) {
      const L = new THREE2.PointLight(16736214, hi ? 26 : 34, 18, 2);
      const a = CUT_CENTER + (i - (nLights - 1) / 2) * deg(80);
      L.position.set(Math.sin(a) * 6.2, 0, Math.cos(a) * 6.2);
      g.add(L);
      lights.push(L);
    }
    root.add(g);
    comps.plasma = {
      step: 8,
      group: g,
      noDepart: true,
      uniforms,
      lineUniforms,
      apply(e, d, t) {
        uniforms.uTime.value = t;
        lineUniforms.uTime.value = t;
        uniforms.uIntensity.value = 1 + 0.45 * e;
        lineUniforms.uOpacity.value = e;
        halo.material.opacity = 0.85 * e;
        lines.forEach((l) => {
          l.visible = e > 0.01;
        });
        lights.forEach((L) => {
          L.intensity = (hi ? 26 : 34) * (1 + 0.8 * e) * (0.92 + 0.08 * Math.sin(t * 5.3));
        });
      },
      anchor: () => g.localToWorld(new THREE2.Vector3(Math.sin(CUT_CENTER + deg(14)) * 8.15, -0.6, Math.cos(CUT_CENTER + deg(14)) * 8.15))
    };
  }
  const order = ["cryostat", "tf", "pf", "cs", "vv", "blanket", "divertor", "plasma"];
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

// ../../交付/web/js/src/flow.js
import * as THREE3 from "three";
import { RoundedBoxGeometry as RoundedBoxGeometry2 } from "three-addons";
var fmt = (v, d = 0) => (+v).toLocaleString("zh-CN", { minimumFractionDigits: d, maximumFractionDigits: d });
function stdMat(color, o = {}) {
  return new THREE3.MeshStandardMaterial({ color, roughness: 0.42, metalness: 0.15, ...o });
}
function iconFor(kind, color) {
  const g = new THREE3.Group();
  const white = stdMat(16251131, { roughness: 0.35 });
  const steel = stdMat(13094616, { metalness: 0.7, roughness: 0.3 });
  const tint = stdMat(color, { roughness: 0.35, metalness: 0.25 });
  const add = (geo, mat, x = 0, y = 0, z = 0) => {
    const m = new THREE3.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    g.add(m);
    return m;
  };
  if (kind === "coal") {
    add(new RoundedBoxGeometry2(2.4, 1.5, 1.8, 2, 0.12), stdMat(5857389, { roughness: 0.6 }), 0, 0.75, 0);
    add(new THREE3.CylinderGeometry(0.28, 0.4, 3.4, 20), stdMat(8094351), 0.7, 1.7, -0.3);
    add(new THREE3.CylinderGeometry(0.3, 0.3, 0.25, 20), tint, 0.7, 3.45, -0.3);
    add(new RoundedBoxGeometry2(1.2, 0.7, 1.2, 2, 0.08), stdMat(3093564, { roughness: 0.8 }), -1.5, 0.35, 0.4);
  } else if (kind === "gas") {
    add(new RoundedBoxGeometry2(2.6, 1.3, 1.6, 2, 0.14), white, 0, 0.65, 0);
    const turb = add(new THREE3.CylinderGeometry(0.55, 0.7, 2.2, 28), steel, 0, 1.75, 0);
    turb.rotation.z = Math.PI / 2;
    add(new THREE3.CylinderGeometry(0.22, 0.22, 2.2, 16), white, -0.9, 2.4, -0.4);
    const flame = add(new THREE3.ConeGeometry(0.32, 0.9, 20), new THREE3.MeshStandardMaterial({ color: 5941503, emissive: 3112447, emissiveIntensity: 2.4 }), -0.9, 3.9, -0.4);
    flame.castShadow = false;
    flame.userData.flicker = true;
  } else if (kind === "nuclear" || kind === "nuclear-restart" || kind === "smr") {
    const pts = [];
    for (let i = 0; i <= 20; i++) {
      const y = i / 20 * 3.6;
      const r = 1.25 - 0.62 * Math.sin(i / 20 * Math.PI * 0.82);
      pts.push(new THREE3.Vector2(r, y));
    }
    const tower = add(new THREE3.LatheGeometry(pts, 40), white, -0.7, 0, -0.2);
    tower.material.side = THREE3.DoubleSide;
    add(new THREE3.CylinderGeometry(0.75, 0.75, 1.1, 32), steel, 1.1, 0.55, 0.4);
    add(new THREE3.SphereGeometry(0.75, 32, 16, 0, TAU, 0, Math.PI / 2), tint, 1.1, 1.1, 0.4);
    if (kind === "smr") g.scale.setScalar(0.8);
  } else if (kind === "renewables" || kind === "wind" || kind === "solar") {
    add(new THREE3.CylinderGeometry(0.08, 0.14, 3.6, 12), white, -0.7, 1.8, -0.2);
    const hub = new THREE3.Group();
    hub.position.set(-0.7, 3.6, -0.05);
    const blade = new THREE3.BoxGeometry(0.16, 1.6, 0.05);
    blade.translate(0, 0.8, 0);
    for (let i = 0; i < 3; i++) {
      const b = new THREE3.Mesh(blade, white);
      b.rotation.z = i / 3 * TAU;
      b.castShadow = true;
      hub.add(b);
    }
    hub.userData.spin = true;
    g.add(hub);
    const pv = stdMat(2778070, { metalness: 0.4, roughness: 0.2 });
    for (let i = 0; i < 3; i++) {
      const p = add(new THREE3.BoxGeometry(1.1, 0.06, 0.7), pv, 0.9, 0.55, -0.6 + i * 0.75);
      p.rotation.z = 0.45;
      add(new THREE3.CylinderGeometry(0.04, 0.04, 0.5, 8), steel, 0.9, 0.25, -0.6 + i * 0.75);
    }
  } else if (kind === "hydro") {
    add(new RoundedBoxGeometry2(2.6, 1.8, 0.9, 2, 0.1), white, 0, 0.9, 0);
    add(new THREE3.BoxGeometry(2.2, 0.08, 1.4), stdMat(5223400, { metalness: 0.1, roughness: 0.1 }), 0, 1.55, -0.9);
  } else if (kind === "fusion") {
    const tor = add(new THREE3.TorusGeometry(0.95, 0.38, 20, 48), stdMat(14673132, { metalness: 0.6, roughness: 0.25 }), 0, 1.3, 0);
    tor.rotation.x = Math.PI / 2;
    const glow = add(new THREE3.TorusGeometry(0.95, 0.2, 16, 48), new THREE3.MeshStandardMaterial({ color: 16740304, emissive: 16728e3, emissiveIntensity: 2.6 }), 0, 1.3, 0);
    glow.rotation.x = Math.PI / 2;
    glow.castShadow = false;
    add(new THREE3.CylinderGeometry(0.3, 0.3, 1.6, 20), steel, 0, 1, 0);
  } else if (kind === "other") {
    add(new THREE3.CylinderGeometry(0.55, 0.55, 1.4, 24), stdMat(9080729), -0.5, 0.7, 0);
    add(new THREE3.CylinderGeometry(0.55, 0.55, 1.4, 24), stdMat(10725554), 0.7, 0.7, 0.2);
  } else if (kind === "grid") {
    add(new RoundedBoxGeometry2(1.6, 1.4, 1.2, 2, 0.1), steel, 0, 0.7, 0);
    for (const x of [-0.45, 0, 0.45]) add(new THREE3.CylinderGeometry(0.09, 0.12, 0.9, 12), white, x, 1.8, 0);
    const towerMat = stdMat(10134706, { metalness: 0.6, roughness: 0.35 });
    for (const z of [-1, 1]) {
      add(new THREE3.CylinderGeometry(0.05, 0.22, 5.2, 4), towerMat, 1.6, 2.6, z * 1.2);
      add(new THREE3.BoxGeometry(0.1, 0.08, 1.6), towerMat, 1.6, 4.6, z * 1.2);
    }
  } else if (kind === "dc" || kind === "buyer") {
    const body = add(new RoundedBoxGeometry2(3.4, 1.7, 2.6, 2, 0.12), stdMat(14279663, { roughness: 0.5 }), 0, 0.85, 0);
    body.userData.body = true;
    add(new RoundedBoxGeometry2(3.5, 0.16, 2.7, 2, 0.06), stdMat(3359061, { roughness: 0.6 }), 0, 1.75, 0);
    const led = new THREE3.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 2.2 });
    for (let i = 0; i < 4; i++) {
      const s = add(new THREE3.BoxGeometry(3, 0.09, 0.06), led, 0, 0.36 + i * 0.32, 1.31);
      s.castShadow = false;
    }
    for (let i = 0; i < 3; i++) add(new THREE3.CylinderGeometry(0.3, 0.3, 0.34, 18), steel, -1.05 + i * 1.05, 2, -0.45);
  }
  return g;
}
var ribbonVS = (
  /* glsl */
  `
  varying vec2 vUv;
  void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`
);
var ribbonFS = (
  /* glsl */
  `
  uniform vec3 uA; uniform vec3 uB; uniform float uTime; uniform float uOpacity; uniform float uLen; uniform float uSpeed;
  varying vec2 vUv;
  void main(){
    vec3 c = mix(uA, uB, smoothstep(0.0, 1.0, vUv.x));
    float edge = smoothstep(0.38, 0.5, abs(vUv.y - 0.5));
    float stripe = pow(fract(vUv.x * uLen * 0.22 - uTime * uSpeed), 3.0);
    float a = (0.74 + 0.16 * stripe + 0.1 * edge) * uOpacity;
    vec3 col = c * (0.95 + 0.7 * stripe + 0.25 * edge);
    gl_FragColor = vec4(col, a);
  }`
);
var Ribbon = class {
  constructor(colorA, colorB, seg) {
    this.seg = seg;
    const n = (seg + 1) * 2;
    this.geo = new THREE3.BufferGeometry();
    this.pos = new Float32Array(n * 3);
    const uv = new Float32Array(n * 2);
    const idx = [];
    for (let i = 0; i <= seg; i++) {
      uv[i * 4] = i / seg;
      uv[i * 4 + 1] = 0;
      uv[i * 4 + 2] = i / seg;
      uv[i * 4 + 3] = 1;
      if (i < seg) {
        const a = i * 2;
        idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
      }
    }
    this.geo.setAttribute("position", new THREE3.BufferAttribute(this.pos, 3));
    this.geo.setAttribute("uv", new THREE3.BufferAttribute(uv, 2));
    this.geo.setIndex(idx);
    this.uniforms = {
      uA: { value: new THREE3.Color(colorA) },
      uB: { value: new THREE3.Color(colorB) },
      uTime: { value: 0 },
      uOpacity: { value: 1 },
      uLen: { value: 10 },
      uSpeed: { value: 0.7 }
    };
    this.mat = new THREE3.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: ribbonVS,
      fragmentShader: ribbonFS,
      transparent: true,
      depthWrite: false,
      side: THREE3.DoubleSide
    });
    this.mesh = new THREE3.Mesh(this.geo, this.mat);
    this.mesh.renderOrder = 2;
    this.mesh.frustumCulled = false;
    this.shadowGeo = this.geo.clone();
    this.shadowPos = this.shadowGeo.attributes.position.array;
    this.shadow = new THREE3.Mesh(this.shadowGeo, new THREE3.MeshBasicMaterial({ color: 1780292, transparent: true, opacity: 0.07, depthWrite: false }));
    this.shadow.renderOrder = 1;
    this.shadow.frustumCulled = false;
    this.spec = null;
  }
  // spec: {a0,b0,a1,b1,w,y0,y1,arch} 在“布局坐标”中；map(a,b,y) → 世界坐标
  set(spec, map) {
    this.spec = spec;
    this.map = map;
    const { seg, pos, shadowPos } = this;
    let len = 0;
    let prev = null;
    for (let i = 0; i <= seg; i++) {
      const u = i / seg;
      const c = this.center(u);
      for (let s = 0; s < 2; s++) {
        const b = c.b + (s === 0 ? -spec.w / 2 : spec.w / 2);
        const p = map(c.a, b, c.y);
        const k = (i * 2 + s) * 3;
        pos[k] = p.x;
        pos[k + 1] = p.y;
        pos[k + 2] = p.z;
        shadowPos[k] = p.x;
        shadowPos[k + 1] = 0.02;
        shadowPos[k + 2] = p.z;
      }
      const pc = map(c.a, c.b, c.y);
      if (prev) len += pc.distanceTo(prev);
      prev = pc;
    }
    this.uniforms.uLen.value = len;
    this.geo.attributes.position.needsUpdate = true;
    this.shadowGeo.attributes.position.needsUpdate = true;
    this.geo.computeBoundingSphere();
    const vis = spec.w > 4e-3;
    this.mesh.visible = vis;
    this.shadow.visible = vis;
  }
  center(u) {
    const s = this.spec;
    const e = u * u * (3 - 2 * u);
    return {
      a: lerp(s.a0, s.a1, u),
      b: lerp(s.b0, s.b1, e),
      y: lerp(s.y0, s.y1, u) + s.arch * Math.sin(Math.PI * u)
    };
  }
  point(u, v) {
    const c = this.center(u);
    return this.map(c.a, c.b + v * this.spec.w, c.y + 0.03);
  }
};
function buildFlow({ data, quality, envTex, labelsRoot, makeSky: makeSky2, makeFloor: makeFloor2 }) {
  const hi = quality === "high";
  const scene = new THREE3.Scene();
  scene.environment = envTex;
  scene.environmentIntensity = 0.9;
  scene.add(makeSky2("#fdfaf5", "#eef3fa", "#d7e4f2", "#ffffff"));
  scene.fog = new THREE3.Fog(15659768, 110, 260);
  const floor = makeFloor2(95, 15922681, 0.5);
  scene.add(floor);
  scene.add(new THREE3.HemisphereLight(16777215, 14673905, 1.15));
  const key = new THREE3.DirectionalLight(16773599, 2.3);
  key.position.set(-20, 40, 26);
  key.castShadow = hi;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40, near: 5, far: 120 });
  key.shadow.bias = -5e-4;
  scene.add(key);
  const rim = new THREE3.DirectionalLight(14149375, 1);
  rim.position.set(24, 16, -30);
  scene.add(rim);
  const camera = new THREE3.PerspectiveCamera(36, 1, 0.5, 1500);
  const views = data.views;
  const mixViews = views.filter((v) => v.type === "mix");
  const ppaView = views.find((v) => v.type === "ppa");
  let portrait = false;
  const map = (a, b, y) => portrait ? new THREE3.Vector3(b * 0.85, y, a * 0.9) : new THREE3.Vector3(a, y, b);
  const SHORT = { coal: "\u7164\u7535", gas: "\u5929\u7136\u6C14", renew: "\u53EF\u518D\u751F", nuclear: "\u6838\u7535", other: "\u5176\u4ED6", us: "\u7F8E\u56FD", cn: "\u4E2D\u56FD", eu: "\u6B27\u6D32", row: "\u5176\u4ED6", loss: "\u635F\u8017" };
  const mixGroup = new THREE3.Group();
  scene.add(mixGroup);
  const srcKeys = [];
  const sinkKeys = [];
  const meta = {};
  mixViews.forEach((v) => {
    v.sources.forEach((s) => {
      if (!srcKeys.includes(s.key)) srcKeys.push(s.key);
      meta["s:" + s.key] = s;
    });
    v.sinks.forEach((s) => {
      if (!sinkKeys.includes(s.key)) sinkKeys.push(s.key);
      meta["k:" + s.key] = s;
    });
  });
  const maxTotal = Math.max(...mixViews.map((v) => v.sources.reduce((a, b) => a + b.twh, 0)));
  const K = 15 / maxTotal;
  const A_SRC = -16;
  const A_HUB = -2.5;
  const A_SINK = 10.5;
  const srcB = (i) => (i - (srcKeys.length - 1) / 2) * 5.8;
  const sinkB = (i) => (i - (sinkKeys.length - 1) / 2) * 5.4;
  const mkLabel = (cls, color) => {
    const d = document.createElement("div");
    d.className = "flabel" + (cls ? " " + cls : "");
    d.style.setProperty("--c", color);
    labelsRoot.appendChild(d);
    return d;
  };
  const srcNodes = srcKeys.map((k, i) => {
    const m = meta["s:" + k];
    const node = new THREE3.Group();
    const ped = new THREE3.Mesh(new THREE3.CylinderGeometry(2, 2.15, 0.35, 48), stdMat(m.color, { roughness: 0.35, metalness: 0.1 }));
    ped.position.y = 0.17;
    ped.receiveShadow = true;
    node.add(ped);
    const ic = iconFor(m.icon || k, m.color);
    ic.position.y = 0.35;
    node.add(ic);
    mixGroup.add(node);
    const rib = new Ribbon(m.color, m.color, hi ? 72 : 40);
    mixGroup.add(rib.mesh, rib.shadow);
    return { key: k, meta: m, node, icon: ic, rib, label: mkLabel("top", m.color), val: 0, i };
  });
  const hubNode = new THREE3.Group();
  const hubIcon = iconFor("grid", 7032319);
  hubNode.add(hubIcon);
  const hubGlass = new THREE3.Mesh(new RoundedBoxGeometry2(1, 1, 1, 2, 0.08), stdMat(2831696, { roughness: 0.35, metalness: 0.4 }));
  hubGlass.castShadow = true;
  hubGlass.receiveShadow = true;
  hubNode.add(hubGlass);
  const hubGlow = new THREE3.Mesh(new THREE3.BoxGeometry(1, 1, 1), new THREE3.MeshStandardMaterial({ color: 9137663, emissive: 8019199, emissiveIntensity: 2.4 }));
  hubNode.add(hubGlow);
  mixGroup.add(hubNode);
  const hubLabel = mkLabel("big", "#6b4dff");
  const sinkNodes = sinkKeys.map((k, i) => {
    const m = meta["k:" + k];
    const node = new THREE3.Group();
    const isLoss = k === "loss";
    const ic = isLoss ? new THREE3.Group() : iconFor("dc", 2733814);
    node.add(ic);
    mixGroup.add(node);
    const rib = new Ribbon("#7a5cff", isLoss ? "#b4bccb" : "#29b6f6", hi ? 72 : 40);
    rib.uniforms.uSpeed.value = 0.9;
    mixGroup.add(rib.mesh, rib.shadow);
    return { key: k, meta: m, node, icon: ic, rib, label: mkLabel("right", k === "loss" ? "#9aa3b2" : "#29b6f6"), val: 0, i };
  });
  const ppaGroup = new THREE3.Group();
  scene.add(ppaGroup);
  const ppa = { left: [], right: [], links: [] };
  if (ppaView) {
    const L = ppaView.left;
    const R = ppaView.right;
    const totalL = L.reduce((a, b) => a + b.value, 0);
    const KP = 11 / Math.max(totalL, 1);
    const gapL = L.length > 1 ? Math.min(1.5, 16 / L.length) : 0;
    const gapR = 3.2;
    const spanL = L.reduce((a, b) => a + b.value * KP, 0) + gapL * (L.length - 1);
    const totalR = R.reduce((a, b) => a + b.value, 0);
    const spanR = totalR * KP + gapR * (R.length - 1);
    let cur = -spanL / 2;
    L.forEach((n) => {
      const w = n.value * KP;
      const node = new THREE3.Group();
      const ped = new THREE3.Mesh(new THREE3.CylinderGeometry(0.9, 1, 0.25, 40), stdMat(n.color, { roughness: 0.4 }));
      ped.position.y = 0.12;
      node.add(ped);
      const ic = iconFor(n.icon, n.color);
      ic.scale.setScalar(0.55);
      ic.position.y = 0.25;
      node.add(ic);
      ppaGroup.add(node);
      ppa.left.push({ ...n, node, b: cur + w / 2, w, used: 0, label: mkLabel("left", n.color) });
      cur += w + gapL;
    });
    cur = -spanR / 2;
    R.forEach((n) => {
      const w = n.value * KP;
      const node = new THREE3.Group();
      const ic = iconFor("buyer", n.color);
      node.add(ic);
      ppaGroup.add(node);
      ppa.right.push({ ...n, node, b: cur + w / 2, w, used: 0, label: mkLabel("right big", n.color) });
      cur += w + gapR;
    });
    ppaView.links.forEach((lk) => {
      const from = ppa.left.find((n) => n.key === lk.from);
      const to = ppa.right.find((n) => n.key === lk.to);
      if (!from || !to) return;
      const w = lk.value * KP;
      const rib = new Ribbon(from.color, to.color, hi ? 64 : 36);
      rib.uniforms.uSpeed.value = lk.planned ? 0.25 : 0.6;
      ppaGroup.add(rib.mesh, rib.shadow);
      const b0 = from.b - from.w / 2 + from.used + w / 2;
      const b1 = to.b - to.w / 2 + to.used + w / 2;
      from.used += w;
      to.used += w;
      ppa.links.push({ ...lk, rib, w, b0, b1 });
    });
  }
  const ribbons = [...srcNodes.map((n) => n.rib), ...sinkNodes.map((n) => n.rib), ...ppa.links.map((l) => l.rib)];
  const PER = hi ? 46 : 20;
  const NP = ribbons.length * PER;
  const pGeo = new THREE3.BufferGeometry();
  const pPos = new Float32Array(NP * 3);
  const pCol = new Float32Array(NP * 3);
  const pSize = new Float32Array(NP);
  const pState = [];
  for (let r = 0; r < ribbons.length; r++) {
    for (let j = 0; j < PER; j++) {
      pState.push({ r, u: Math.random(), v: (Math.random() - 0.5) * 0.8, sp: 0.06 + Math.random() * 0.05, j });
    }
  }
  pGeo.setAttribute("position", new THREE3.BufferAttribute(pPos, 3));
  pGeo.setAttribute("color", new THREE3.BufferAttribute(pCol, 3));
  pGeo.setAttribute("size", new THREE3.BufferAttribute(pSize, 1));
  const pMat = new THREE3.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE3.NormalBlending,
    uniforms: { uScale: { value: 300 } },
    vertexShader: `attribute float size; attribute vec3 color; varying vec3 vC; varying float vS; uniform float uScale;
      void main(){ vC = color; vS = size; vec4 mv = modelViewMatrix*vec4(position,1.0); gl_PointSize = size * uScale / -mv.z; gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `varying vec3 vC; varying float vS;
      void main(){ if (vS <= 0.0) discard; vec2 d = gl_PointCoord - 0.5; float r = length(d); if (r > 0.5) discard;
        float core = smoothstep(0.5, 0.0, r); gl_FragColor = vec4(mix(vC, vec3(1.0), core*0.6) * (1.0 + 1.6*core), core); }`
  });
  const points = new THREE3.Points(pGeo, pMat);
  points.frustumCulled = false;
  points.renderOrder = 3;
  scene.add(points);
  const ribColor = /* @__PURE__ */ new Map();
  srcNodes.forEach((n) => ribColor.set(n.rib, new THREE3.Color(n.meta.color)));
  sinkNodes.forEach((n) => ribColor.set(n.rib, new THREE3.Color(n.key === "loss" ? "#b4bccb" : "#29b6f6")));
  ppa.links.forEach((l) => ribColor.set(l.rib, new THREE3.Color(l.color || "#9b5cff")));
  const ribDensity = /* @__PURE__ */ new Map();
  let lastKey = "";
  function layoutMix(vals) {
    const total = srcKeys.reduce((a, k) => a + (vals.src[k] || 0), 0);
    const totalSink = sinkKeys.reduce((a, k) => a + (vals.sink[k] || 0), 0);
    const hubW = Math.max(total, totalSink) * K;
    let cur = -hubW / 2;
    srcNodes.forEach((n) => {
      const v = vals.src[n.key] || 0;
      const w = v * K;
      n.val = v;
      const b0 = srcB(n.i);
      n.node.position.copy(map(A_SRC, b0, 0));
      n.node.rotation.y = portrait ? Math.PI / 2 : 0;
      const sc = 0.8 + 0.55 * clamp(v / (maxTotal * 0.3));
      n.icon.scale.setScalar(v > 0.5 ? sc : 1e-3);
      n.node.visible = v > 0.5;
      n.rib.set({ a0: A_SRC + 2.1, b0, a1: A_HUB - 1.6, b1: cur + w / 2, w, y0: 0.55, y1: 1.1, arch: 1.1 }, map);
      ribDensity.set(n.rib, clamp(v / (maxTotal * 0.22)));
      cur += w;
    });
    cur = -hubW / 2;
    sinkNodes.forEach((n) => {
      const v = vals.sink[n.key] || 0;
      const w = v * K;
      n.val = v;
      const b1 = sinkB(n.i);
      n.node.position.copy(map(A_SINK + 2.2, b1, 0));
      n.node.rotation.y = portrait ? -Math.PI / 2 : -Math.PI / 2;
      const sc = 0.55 + 0.75 * Math.sqrt(clamp(v / (maxTotal * 0.5)));
      n.icon.scale.setScalar(v > 0.5 ? sc : 1e-3);
      n.node.visible = v > 0.5;
      n.rib.set({ a0: A_HUB + 1.6, b0: cur + w / 2, a1: A_SINK, b1, w, y0: 1.1, y1: 0.55, arch: 0.9 }, map);
      ribDensity.set(n.rib, clamp(v / (maxTotal * 0.3)));
      cur += w;
    });
    hubNode.position.copy(map(A_HUB, 0, 0));
    hubNode.rotation.y = portrait ? Math.PI / 2 : 0;
    const hw = Math.max(1.2, hubW + 0.8);
    hubGlass.scale.set(3, 1, hw);
    hubGlass.position.set(0, 0.5, 0);
    hubGlow.scale.set(3.06, 0.08, hw + 0.06);
    hubGlow.position.set(0, 1.02, 0);
    hubIcon.position.set(0, 0, -hw / 2 - 2);
    return total;
  }
  function layoutPPA() {
    const AL = -9;
    const AR = 9.5;
    ppa.left.forEach((n) => {
      n.node.position.copy(map(AL - 1.2, n.b, 0));
    });
    ppa.right.forEach((n) => {
      n.node.position.copy(map(AR + 2.2, n.b, 0));
      n.node.rotation.y = -Math.PI / 2;
      const sc = 0.5 + 0.6 * Math.sqrt(clamp(n.w / 8));
      n.node.children[0].scale.setScalar(sc);
    });
    ppa.links.forEach((l) => {
      l.rib.set({ a0: AL, b0: l.b0, a1: AR, b1: l.b1, w: l.w, y0: 0.5, y1: 0.6, arch: 0.8 }, map);
      ribDensity.set(l.rib, clamp(l.value / 1500) * 0.9 + 0.1);
    });
  }
  function valsOf(v) {
    const src = {};
    const sink = {};
    if (v && v.type === "mix") {
      v.sources.forEach((s) => {
        src[s.key] = s.twh;
      });
      v.sinks.forEach((s) => {
        sink[s.key] = s.twh;
      });
    }
    return { src, sink };
  }
  const tabs = document.getElementById("flowUI");
  let headIdx = -1;
  function setHead(i) {
    if (i === headIdx) return;
    headIdx = i;
    [...tabs.children].forEach((b, j) => b.classList.toggle("active", j === i));
  }
  let W = 1;
  let H = 1;
  let mobile = false;
  function resize(w, h, isMobile) {
    W = w;
    H = h;
    mobile = isMobile;
    const wasPortrait = portrait;
    portrait = w / h < 0.95;
    camera.aspect = w / h;
    camera.fov = portrait ? 46 : 36;
    if (!portrait && w > 900) camera.setViewOffset(w, h, -w * 0.1, h * 0.045, w, h);
    else if (portrait) camera.setViewOffset(w, h, 0, h * 0.2, w, h);
    else camera.clearViewOffset();
    camera.updateProjectionMatrix();
    pMat.uniforms.uScale.value = h * 0.5;
    if (wasPortrait !== portrait) lastKey = "";
    layoutPPA();
  }
  const v3 = new THREE3.Vector3();
  function project(p) {
    v3.copy(p).project(camera);
    return { x: (v3.x * 0.5 + 0.5) * W, y: (-v3.y * 0.5 + 0.5) * H, ok: v3.z < 1 };
  }
  function placeLabel(elm, p, html, on, mini = false) {
    elm.classList.toggle("mini", mini);
    if (!on) {
      elm.classList.remove("on");
      return;
    }
    const q = project(p);
    elm.style.left = `${q.x}px`;
    elm.style.top = `${q.y}px`;
    if (elm.dataset.h !== html) {
      elm.innerHTML = html;
      elm.dataset.h = html;
    }
    elm.classList.toggle("on", q.ok);
  }
  let visible = false;
  function setVisible(v) {
    if (v === visible) return;
    visible = v;
    if (!v) labelsRoot.querySelectorAll(".flabel").forEach((e) => e.classList.remove("on"));
  }
  function update(f, t, dt) {
    const i0 = Math.floor(f);
    const i1 = Math.min(views.length - 1, i0 + 1);
    const w = easeInOut(clamp(f - i0));
    const a = views[i0];
    const b = views[i1];
    setHead(Math.round(f));
    const ppaW = (a.type === "ppa" ? 1 - w : 0) + (b.type === "ppa" && i1 !== i0 ? w : 0) + (a.type === "ppa" && i1 === i0 ? w : 0);
    const mixA = a.type === "mix" ? a : mixViews[mixViews.length - 1];
    const mixB = b.type === "mix" ? b : mixA;
    const va = valsOf(mixA);
    const vb = valsOf(mixB);
    const ww = b.type === "mix" && a.type === "mix" ? w : 0;
    const vals = { src: {}, sink: {} };
    srcKeys.forEach((k) => {
      vals.src[k] = lerp(va.src[k] || 0, vb.src[k] || 0, ww);
    });
    sinkKeys.forEach((k) => {
      vals.sink[k] = lerp(va.sink[k] || 0, vb.sink[k] || 0, ww);
    });
    const keyNow = JSON.stringify(vals) + portrait;
    if (keyNow !== lastKey) {
      lastKey = keyNow;
      layoutMix(vals);
    }
    const mixOp = 1 - smooth(0.15, 0.85, ppaW);
    const ppaOp = smooth(0.15, 0.85, ppaW);
    mixGroup.visible = mixOp > 0.01;
    ppaGroup.visible = ppaOp > 0.01;
    mixGroup.traverse((o) => {
      if (o.material && o.material.uniforms && o.material.uniforms.uOpacity) o.material.uniforms.uOpacity.value = mixOp;
    });
    ppaGroup.traverse((o) => {
      if (o.material && o.material.uniforms && o.material.uniforms.uOpacity) o.material.uniforms.uOpacity.value = ppaOp;
    });
    mixGroup.scale.setScalar(0.85 + 0.15 * mixOp);
    ppaGroup.scale.setScalar(0.85 + 0.15 * ppaOp);
    ribbons.forEach((r) => {
      r.uniforms.uTime.value = t;
    });
    scene.traverse((o) => {
      if (o.userData.spin) o.rotation.z -= dt * 1.6;
      if (o.userData.flicker) o.scale.y = 0.85 + 0.25 * Math.sin(t * 13 + o.id);
    });
    const sizeBase = hi ? 0.5 : 0.6;
    for (let p = 0; p < pState.length; p++) {
      const s = pState[p];
      const rib = ribbons[s.r];
      const isPPA = s.r >= srcNodes.length + sinkNodes.length;
      const op = isPPA ? ppaOp : mixOp;
      const dens = (ribDensity.get(rib) || 0) * op;
      const on = rib.spec && rib.mesh.visible && s.j < Math.ceil(dens * PER) && op > 0.05;
      s.u += dt * s.sp * (isPPA ? 0.9 : 1);
      if (s.u > 1) {
        s.u -= 1;
        s.v = (Math.random() - 0.5) * 0.8;
      }
      if (on) {
        const q = rib.point(s.u, s.v);
        pPos[p * 3] = q.x;
        pPos[p * 3 + 1] = q.y + 0.08;
        pPos[p * 3 + 2] = q.z;
        const c = ribColor.get(rib);
        pCol[p * 3] = c.r;
        pCol[p * 3 + 1] = c.g;
        pCol[p * 3 + 2] = c.b;
        pSize[p] = sizeBase * (0.7 + 0.6 * Math.sin(Math.PI * s.u)) * op;
      } else {
        pSize[p] = 0;
      }
    }
    pGeo.attributes.position.needsUpdate = true;
    pGeo.attributes.color.needsUpdate = true;
    pGeo.attributes.size.needsUpdate = true;
    const az = Math.sin(t * 0.12) * 0.07;
    let pos;
    let tgt;
    if (portrait) {
      pos = new THREE3.Vector3(Math.sin(az) * 20, 104, 34);
      tgt = new THREE3.Vector3(0, 0, -0.5);
    } else {
      pos = new THREE3.Vector3(-1 + Math.sin(az) * 46, 33, 41);
      tgt = new THREE3.Vector3(-1, 0, 0.5);
    }
    camera.position.copy(pos);
    camera.lookAt(tgt);
    const showMix = visible && mixOp > 0.6;
    const totalNow = srcNodes.reduce((acc, n) => acc + n.val, 0) || 1;
    srcNodes.forEach((n) => {
      const p = portrait ? n.node.position.clone().add(new THREE3.Vector3(0, 0.5, 2.6)) : map(A_SRC + 0.4, srcB(n.i) - 2.45, 0.9);
      const share = n.val / totalNow * 100;
      const html = portrait ? `${SHORT[n.key] || n.meta.name}<b>${fmt(n.val)}</b>` : `${n.meta.name} <b>${fmt(n.val)}</b> TWh<small>\u5360\u6BD4 ${fmt(share, 0)}%</small>`;
      placeLabel(n.label, p, html, showMix && n.val > 0.5, portrait);
    });
    sinkNodes.forEach((n) => {
      const p = portrait ? n.node.position.clone().add(new THREE3.Vector3(0, 0.5, n.key === "loss" ? 1.5 : 3.4)) : map(A_SINK + (n.key === "loss" ? 1 : 4.1), sinkB(n.i), 0.6);
      const html = portrait ? `${SHORT[n.key] || n.meta.name}<b>${fmt(n.val)}</b>` : `${n.meta.name} <b>${fmt(n.val)}</b> TWh`;
      placeLabel(n.label, p, html, showMix && n.val > 0.5, portrait);
    });
    placeLabel(hubLabel, hubNode.position.clone().add(new THREE3.Vector3(0, 3.2, 0)), `${a.type === "mix" ? a.hubName : b.hubName || ""}<b> ${fmt(totalNow)} </b>TWh<small>\u53D1\u7535\u4FA7\u5408\u8BA1</small>`, showMix);
    const showPPA = visible && ppaOp > 0.6;
    ppa.left.forEach((n) => {
      const p = portrait ? n.node.position.clone().add(new THREE3.Vector3(0, 0.4, -1.8)) : map(-9 - 2.4, n.b, 0.4);
      placeLabel(n.label, p, `${n.name} <b>${fmt(n.value)}</b> MW <em>${n.sub || ""}</em>`, showPPA && !portrait);
    });
    ppa.right.forEach((n) => {
      const p = portrait ? n.node.position.clone().add(new THREE3.Vector3(0, 0.4, 3)) : map(9.5 + 4.4, n.b, 0.6);
      placeLabel(n.label, p, portrait ? `${n.name}<b>${fmt(n.value)}</b>` : `${n.name}<b> ${fmt(n.value)} </b>MW`, showPPA, portrait);
    });
  }
  return { scene, camera, update, resize, setVisible };
}

// ../../交付/web/js/src/main.js
var $ = (s, r = document) => r.querySelector(s);
var el = (tag, cls, html) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
};
var mq = window.matchMedia("(max-width: 760px)");
var coarse = window.matchMedia("(pointer: coarse)").matches;
var LOW = mq.matches || coarse && Math.min(screen.width, screen.height) < 900;
var fmt2 = (v, d = 0) => v == null || Number.isNaN(+v) ? "\u2014" : (+v).toLocaleString("zh-CN", { minimumFractionDigits: d, maximumFractionDigits: d });
var CAM = [
  [32, 16, 62, 1],
  [36, 19, 80, 7.5],
  [46, 18, 70, 1.5],
  [22, 12, 66, 1],
  [36, 21, 54, 6],
  [30, 20, 56, 0],
  [20, 16, 42, 0],
  [44, 6, 36, -4.6],
  [32, 30, 35, 0],
  [32, 16, 64, 1]
];
function webglOK() {
  try {
    const c = document.createElement("canvas");
    const gl = window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl"));
    if (!gl) return false;
    const lose = gl.getExtension("WEBGL_lose_context");
    if (lose) lose.loseContext();
    return true;
  } catch (e) {
    return false;
  }
}
function showFallback(msg) {
  $("#fallback").hidden = false;
  $("#gl").style.display = "none";
  const n = el("p", "webgl-note", msg || "\u5F53\u524D\u6D4F\u89C8\u5668\u65E0\u6CD5\u542F\u7528 WebGL\uFF0C\u5DF2\u5207\u6362\u4E3A\u9759\u6001\u7248\u672C\uFF1A\u6587\u5B57\u4E0E\u6570\u636E\u7167\u5E38\u663E\u793A\u3002");
  document.body.appendChild(n);
}
function buildDom(data) {
  const k = $("#heroKpis");
  (data.hero || []).forEach((h) => {
    const d = el("div", "kpi");
    d.innerHTML = `<div class="v">${fmt2(h.v, h.d || 0)}<small>${h.u}</small></div><div class="k">${h.k}</div><div class="s">${h.s}</div>`;
    k.appendChild(d);
  });
  if (data.bridge) $("#bridgeText").textContent = data.bridge;
  const tok = $("#tokamak");
  const rail = $("#rail");
  data.tokamak.steps.forEach((s, i) => {
    const step = el("div", "step");
    step.dataset.step = i;
    const specs = (s.specs || []).map((x) => `<dt>${x.k}</dt><dd>${x.v}${x.u ? " " + x.u : ""}</dd>`).join("");
    const card = el("article", "card");
    card.style.setProperty("--c", s.color);
    card.innerHTML = `<div class="idx">${s.idx}</div><h2>${s.name}</h2><div class="en">${s.en}</div><p>${s.text}</p>${specs ? `<dl>${specs}</dl>` : ""}<div class="src">${s.src || ""}</div>`;
    step.appendChild(card);
    tok.appendChild(step);
    const b = el("button", "", `<span>${s.name}</span><i></i>`);
    b.style.setProperty("--c", s.color);
    b.addEventListener("click", () => window.scrollTo({ top: tok.offsetTop + i * window.innerHeight, behavior: "smooth" }));
    rail.appendChild(b);
  });
  const flow = $("#flow");
  const ui = $("#flowUI");
  data.flow.views.forEach((v, i) => {
    const step = el("div", "step");
    step.dataset.fstep = i;
    const card = el("article", "card");
    card.style.setProperty("--c", v.color || "#6b4dff");
    const items = v.type === "mix" ? v.sources.map((s) => ({ name: s.name, color: s.color, val: s.twh, txt: s.shareText })) : v.left.map((s) => ({ name: s.name, color: s.color, val: s.value, txt: "" }));
    const tot = items.reduce((a, b2) => a + b2.val, 0) || 1;
    const bar = `<div class="mixbar">${items.map((s) => `<span style="flex-grow:${s.val / tot};background:${s.color}" title="${s.name}"></span>`).join("")}</div>`;
    const legendItems = v.type === "mix" ? items : v.legend || [];
    const legend = `<div class="mixlegend">${legendItems.map((s) => `<div><i style="background:${s.color}"></i>${s.name}${s.txt ? `<b>${s.txt}</b>` : ""}</div>`).join("")}</div>`;
    card.innerHTML = `<div class="idx">${v.idx}</div><h2>${v.cardTitle}</h2><div class="en">${v.en || ""}</div><div class="bigline"><b>${fmt2(v.total)}</b><small>${v.unit}</small></div><div class="cap">${v.cap || ""}</div>${bar}${legend}<p>${v.text}</p>${(v.facts || []).length ? `<dl>${v.facts.map((f) => `<dt>${f.k}</dt><dd>${f.v}</dd>`).join("")}</dl>` : ""}<div class="src">${v.src}</div>`;
    step.appendChild(card);
    flow.appendChild(step);
    const b = el("button", "", v.tab);
    b.setAttribute("role", "tab");
    b.addEventListener("click", () => window.scrollTo({ top: flow.offsetTop + i * window.innerHeight, behavior: "smooth" }));
    ui.appendChild(b);
  });
  const g = $("#srcGrid");
  (data.sources || []).forEach((s) => {
    g.appendChild(el("div", "", `<b>${s.name}</b><span>${s.date}${s.use ? " \xB7 " + s.use : ""}</span>`));
  });
  if (data.note) $("#srcNote").textContent = data.note;
}
function makeSky(top, mid, bottom, glow) {
  const mat = new THREE4.ShaderMaterial({
    side: THREE4.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      cTop: { value: new THREE4.Color(top) },
      cMid: { value: new THREE4.Color(mid) },
      cBot: { value: new THREE4.Color(bottom) },
      cGlow: { value: new THREE4.Color(glow) }
    },
    vertexShader: "varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = projectionMatrix*modelViewMatrix*vec4(position,1.0); gl_Position = p.xyww; }",
    fragmentShader: `uniform vec3 cTop,cMid,cBot,cGlow; varying vec3 vDir;
      void main(){ float h = vDir.y;
        vec3 c = h > 0.0 ? mix(cMid, cTop, smoothstep(0.0, 0.55, h)) : mix(cMid, cBot, smoothstep(0.0, 0.45, -h));
        float g = pow(max(0.0, 1.0 - length(vDir.xz*vec2(1.0,1.0) - vec2(0.0,0.0)) ), 2.0);
        c = mix(c, cGlow, 0.25 * smoothstep(0.15, -0.05, abs(h-0.06)));
        gl_FragColor = vec4(c, 1.0); }`
  });
  const m = new THREE4.Mesh(new THREE4.SphereGeometry(600, 48, 24), mat);
  m.frustumCulled = false;
  m.renderOrder = -10;
  return m;
}
function makeFloor(radius, color, fade) {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d");
  const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grd.addColorStop(0, "rgba(255,255,255,1)");
  grd.addColorStop(fade, "rgba(255,255,255,0.9)");
  grd.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, 256, 256);
  const tex = new THREE4.CanvasTexture(c);
  const mat = new THREE4.MeshStandardMaterial({ color, roughness: 0.92, metalness: 0, alphaMap: tex, transparent: true, depthWrite: false });
  const m = new THREE4.Mesh(new THREE4.CircleGeometry(radius, 96), mat);
  m.rotation.x = -Math.PI / 2;
  m.receiveShadow = true;
  m.renderOrder = -5;
  return m;
}
async function boot() {
  let data;
  try {
    const r = await fetch("data/web-data.json", { cache: "no-cache" });
    data = await r.json();
  } catch (e) {
    console.warn("\u6570\u636E\u52A0\u8F7D\u5931\u8D25", e);
    showFallback("\u6570\u636E\u6587\u4EF6\u672A\u80FD\u52A0\u8F7D\uFF1A\u8BF7\u901A\u8FC7\u672C\u5730 http \u670D\u52A1\u6253\u5F00\u672C\u9875\uFF08\u4F8B\u5982\u5728 web \u76EE\u5F55\u8FD0\u884C python3 -m http.server\uFF09\u3002");
    return;
  }
  buildDom(data);
  if (!webglOK()) {
    showFallback();
    return;
  }
  const canvas = $("#gl");
  let renderer;
  try {
    renderer = new THREE4.WebGLRenderer({ canvas, antialias: !LOW, powerPreference: "high-performance", alpha: false });
  } catch (e) {
    showFallback();
    return;
  }
  const DPR = Math.min(window.devicePixelRatio || 1, LOW ? 1.5 : 2);
  renderer.setPixelRatio(DPR);
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.toneMapping = THREE4.NeutralToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.outputColorSpace = THREE4.SRGBColorSpace;
  renderer.shadowMap.enabled = !LOW;
  renderer.shadowMap.type = THREE4.PCFSoftShadowMap;
  let lost = false;
  canvas.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    lost = true;
    showFallback("\u56FE\u5F62\u4E0A\u4E0B\u6587\u5DF2\u4E22\u5931\uFF08\u53EF\u80FD\u662F\u8BBE\u5907\u5185\u5B58\u4E0D\u8DB3\uFF09\uFF0C\u5DF2\u5207\u6362\u4E3A\u9759\u6001\u7248\u672C\u3002");
  });
  const pmrem = new THREE4.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  const sceneA = new THREE4.Scene();
  sceneA.environment = envTex;
  sceneA.environmentIntensity = 0.8;
  sceneA.add(makeSky("#fdfaf5", "#eef3fa", "#d9e5f2", "#ffffff"));
  sceneA.fog = new THREE4.Fog(15659768, 120, 260);
  const floorA = makeFloor(70, 15922681, 0.55);
  floorA.position.y = -11.72;
  sceneA.add(floorA);
  sceneA.add(new THREE4.HemisphereLight(16777215, 14673905, 0.7));
  const key = new THREE4.DirectionalLight(16773599, 2.4);
  key.position.set(-26, 42, 30);
  key.castShadow = !LOW;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -30;
  key.shadow.camera.right = 30;
  key.shadow.camera.top = 30;
  key.shadow.camera.bottom = -30;
  key.shadow.camera.near = 10;
  key.shadow.camera.far = 120;
  key.shadow.bias = -4e-4;
  key.shadow.normalBias = 0.04;
  sceneA.add(key);
  const rim = new THREE4.DirectionalLight(13624063, 1.4);
  rim.position.set(30, 18, -34);
  sceneA.add(rim);
  const tok = buildTokamak({ quality: LOW ? "low" : "high" });
  sceneA.add(tok.root);
  const camA = new THREE4.PerspectiveCamera(LOW ? 40 : 34, window.innerWidth / window.innerHeight, 0.5, 1500);
  const flow = buildFlow({ data: data.flow, quality: LOW ? "low" : "high", envTex, labelsRoot: $("#labels"), makeSky, makeFloor });
  const composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(sceneA, camA);
  composer.addPass(renderPass);
  const bloom = new UnrealBloomPass(new THREE4.Vector2(window.innerWidth, window.innerHeight), 0.4, 0.32, 1);
  if (!LOW) composer.addPass(bloom);
  composer.addPass(new OutputPass());
  composer.setPixelRatio(DPR);
  composer.setSize(window.innerWidth, window.innerHeight);
  const svg = $("#leaders");
  const NS = "http://www.w3.org/2000/svg";
  const line = document.createElementNS(NS, "line");
  const ring = document.createElementNS(NS, "circle");
  const dot = document.createElementNS(NS, "circle");
  ring.setAttribute("class", "ring");
  ring.setAttribute("r", 9);
  dot.setAttribute("class", "dot");
  dot.setAttribute("r", 5);
  svg.append(line, ring, dot);
  const pillsRoot = $("#labels");
  const pills = data.tokamak.pills.map((p) => {
    const d = el("div", "pill", `<i></i>${p.name}`);
    d.style.setProperty("--c", p.color);
    pillsRoot.appendChild(d);
    return { ...p, el: d };
  });
  const tokSec = $("#tokamak");
  const flowSec = $("#flow");
  const bridgeSec = $("#bridge");
  const tokCards = [...tokSec.querySelectorAll(".card")];
  const flowUI = $("#flowUI");
  const rail = $("#rail");
  const railBtns = [...rail.querySelectorAll("button")];
  const navLinks = [...document.querySelectorAll(".topbar a")];
  let W = window.innerWidth;
  let H = window.innerHeight;
  function layoutCamera(cam) {
    cam.aspect = W / H;
    if (!mq.matches && W > 900) cam.setViewOffset(W, H, -W * 0.13, 0, W, H);
    else if (W / H < 1) cam.setViewOffset(W, H, 0, H * 0.17, W, H);
    else cam.clearViewOffset();
    cam.updateProjectionMatrix();
  }
  function onResize() {
    W = window.innerWidth;
    H = window.innerHeight;
    renderer.setSize(W, H, false);
    composer.setSize(W, H);
    layoutCamera(camA);
    flow.resize(W, H, mq.matches);
  }
  window.addEventListener("resize", onResize);
  onResize();
  let sTarget = 0;
  let sCur = 0;
  let fTarget = 0;
  let fCur = 0;
  let active = "tok";
  let inFlowView = false;
  let inTokView = true;
  function readScroll() {
    const y = window.scrollY;
    const vh = window.innerHeight;
    sTarget = clamp((y - tokSec.offsetTop) / vh, 0, 9.6);
    fTarget = clamp((y - flowSec.offsetTop) / vh, 0, data.flow.views.length - 1);
    const bridgeMid = bridgeSec.offsetTop + bridgeSec.offsetHeight / 2 - vh / 2;
    const veil = clamp(1 - Math.abs(y - bridgeMid) / (vh * 0.42));
    $("#veil").style.opacity = (veil * 0.96).toFixed(3);
    active = y > bridgeMid ? "flow" : "tok";
    const inFlow = y > flowSec.offsetTop - vh * 0.5 && y < flowSec.offsetTop + flowSec.offsetHeight - vh * 0.6;
    inFlowView = inFlow;
    inTokView = y > tokSec.offsetTop - vh * 0.35 && y < tokSec.offsetTop + tokSec.offsetHeight - vh * 0.75;
    flowUI.classList.toggle("on", inFlow);
    rail.classList.toggle("on", y > tokSec.offsetTop - vh * 0.5 && y < tokSec.offsetTop + tokSec.offsetHeight - vh * 0.5);
    const sec = y < flowSec.offsetTop - vh * 0.6 ? "tokamak" : y < $("#sources").offsetTop - vh * 0.5 ? "flow" : "sources";
    navLinks.forEach((a) => a.classList.toggle("active", a.dataset.nav === sec && y > vh * 0.5));
  }
  window.addEventListener("scroll", readScroll, { passive: true });
  readScroll();
  sCur = sTarget;
  fCur = fTarget;
  const v3 = new THREE4.Vector3();
  function project(p, cam) {
    v3.copy(p).project(cam);
    return { x: (v3.x * 0.5 + 0.5) * W, y: (-v3.y * 0.5 + 0.5) * H, ok: v3.z < 1 && v3.z > -1 };
  }
  const clock = new THREE4.Clock();
  let t = 0;
  let paused = false;
  document.addEventListener("visibilitychange", () => {
    paused = document.hidden;
    if (!paused) clock.getDelta();
  });
  function updateTokCamera(s) {
    const i = Math.min(CAM.length - 2, Math.floor(s));
    const f = easeInOut(clamp(s - i));
    const a = CAM[i];
    const b = CAM[i + 1];
    let az = lerp(a[0], b[0], f) + Math.sin(t * 0.18) * 3;
    let elv = lerp(a[1], b[1], f) + Math.sin(t * 0.23) * 1.2;
    let dist = lerp(a[2], b[2], f);
    const ty = lerp(a[3], b[3], f);
    const asp = W / H;
    if (asp < 1.25) dist *= clamp(1.45 / asp * 0.82, 1, 2.4);
    az = THREE4.MathUtils.degToRad(az);
    elv = THREE4.MathUtils.degToRad(elv);
    camA.position.set(Math.sin(az) * Math.cos(elv) * dist, ty + Math.sin(elv) * dist, Math.cos(az) * Math.cos(elv) * dist);
    camA.lookAt(0, ty, 0);
  }
  function updateTokOverlay(s) {
    const k = Math.round(s);
    const near = Math.abs(s - k) < 0.32 && window.scrollY > tokSec.offsetTop - H * 0.4 && window.scrollY < tokSec.offsetTop + tokSec.offsetHeight - H * 0.8;
    const step = data.tokamak.steps[k];
    let shown = false;
    if (near && step && step.anchor && active === "tok") {
      const a = tok.anchor(step.anchor);
      const card = tokCards[k];
      if (a && card) {
        const p = project(a, camA);
        const r = card.getBoundingClientRect();
        if (p.ok && r.bottom > 0 && r.top < H) {
          const sx = mq.matches ? r.left + r.width / 2 : r.right;
          const sy = mq.matches ? r.top : r.top + Math.min(70, r.height / 2);
          line.setAttribute("x1", sx);
          line.setAttribute("y1", sy);
          line.setAttribute("x2", p.x);
          line.setAttribute("y2", p.y);
          [ring, dot].forEach((c) => {
            c.setAttribute("cx", p.x);
            c.setAttribute("cy", p.y);
            c.style.stroke = step.color;
          });
          shown = true;
        }
      }
    }
    svg.style.opacity = shown ? 1 : 0;
    const inTok = active === "tok" && inTokView;
    const showPills = inTok && !mq.matches && (s < 0.35 || s > 8.85);
    pills.forEach((p) => {
      const a = tok.anchor(p.key);
      if (!a || !showPills) {
        p.el.classList.remove("on");
        return;
      }
      const q = project(a, camA);
      p.el.style.left = `${q.x}px`;
      p.el.style.top = `${q.y}px`;
      p.el.classList.toggle("on", q.ok);
    });
    railBtns.forEach((b, i) => b.classList.toggle("active", i === k));
  }
  function frame() {
    requestAnimationFrame(frame);
    if (paused || lost) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    t += dt;
    const kS = window.__snap ? 1 : 1 - Math.exp(-dt * 5.5);
    sCur += (sTarget - sCur) * kS;
    fCur += (fTarget - fCur) * kS;
    if (active === "tok") {
      tok.update(sCur, t);
      updateTokCamera(sCur);
      updateTokOverlay(sCur);
      renderPass.scene = sceneA;
      renderPass.camera = camA;
      bloom.strength = 0.42;
      flow.setVisible(false);
    } else {
      svg.style.opacity = 0;
      pills.forEach((p) => p.el.classList.remove("on"));
      flow.setVisible(inFlowView);
      flow.update(fCur, t, dt);
      renderPass.scene = flow.scene;
      renderPass.camera = flow.camera;
      bloom.strength = 0.35;
    }
    if (LOW) {
      renderer.render(renderPass.scene, renderPass.camera);
    } else {
      composer.render(dt);
    }
  }
  frame();
  document.body.classList.add("ready");
}
boot().catch((e) => {
  console.error(e);
  showFallback("\u4E09\u7EF4\u573A\u666F\u521D\u59CB\u5316\u5931\u8D25\uFF0C\u5DF2\u5207\u6362\u4E3A\u9759\u6001\u7248\u672C\u3002");
});
