import * as THREE from 'three';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = t => t * t * (3 - 2 * t);

function makeEnvTexture() {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 512;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0, '#5fa8dd');
  g.addColorStop(0.35, '#a9d6f2');
  g.addColorStop(0.55, '#eaf8ff');
  g.addColorStop(0.72, '#ffe9c4');
  g.addColorStop(1, '#f2c791');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 1024, 512);
  const sun = ctx.createRadialGradient(770, 150, 0, 770, 150, 240);
  sun.addColorStop(0, 'rgba(255,255,255,1)');
  sun.addColorStop(0.15, 'rgba(255,241,206,.95)');
  sun.addColorStop(0.55, 'rgba(255,214,150,.35)');
  sun.addColorStop(1, 'rgba(255,214,150,0)');
  ctx.fillStyle = sun; ctx.fillRect(0, 0, 1024, 512);
  const blue = ctx.createRadialGradient(180, 360, 0, 180, 360, 300);
  blue.addColorStop(0, 'rgba(120,205,255,.35)');
  blue.addColorStop(1, 'rgba(120,205,255,0)');
  ctx.fillStyle = blue; ctx.fillRect(0, 0, 1024, 512);
  const tex = new THREE.CanvasTexture(c);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}


function makeBackdrop() {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 512;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0, '#6fb2df');
  g.addColorStop(0.28, '#a9d6f2');
  g.addColorStop(0.5, '#e8f7ff');
  g.addColorStop(0.68, '#fff0d0');
  g.addColorStop(1, '#f6d39c');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 1024, 512);
  const sun = ctx.createRadialGradient(760, 120, 0, 760, 120, 250);
  sun.addColorStop(0, 'rgba(255,255,255,1)');
  sun.addColorStop(0.2, 'rgba(255,245,215,.95)');
  sun.addColorStop(1, 'rgba(255,214,150,0)');
  ctx.fillStyle = sun; ctx.fillRect(0, 0, 1024, 512);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.mapping = THREE.EquirectangularReflectionMapping;
  return tex;
}

function dProfile(R, halfW, halfH, n = 64) {
  const raw = [
    [R - halfW * 0.92, 0],
    [R - halfW * 0.82, halfH * 0.52],
    [R - halfW * 0.55, halfH * 0.88],
    [R - halfW * 0.15, halfH],
    [R + halfW * 0.35, halfH * 0.94],
    [R + halfW * 0.78, halfH * 0.62],
    [R + halfW, 0],
    [R + halfW * 0.78, -halfH * 0.62],
    [R + halfW * 0.35, -halfH * 0.94],
    [R - halfW * 0.15, -halfH],
    [R - halfW * 0.55, -halfH * 0.88],
    [R - halfW * 0.82, -halfH * 0.52],
  ];
  const curve = new THREE.CatmullRomCurve3(raw.map(p => new THREE.Vector3(p[0], p[1], 0)), true, 'catmullrom', 0.5);
  return curve.getPoints(n).map(p => new THREE.Vector2(p.x, p.y));
}

function coilCurve(R = 4.05, halfH = 2.55, out = 0.85) {
  const raw = [
    [R - out, -halfH],
    [R - out * 0.9, -halfH * 0.55],
    [R - out * 0.72, 0.4],
    [R - out * 0.45, halfH * 0.75],
    [R - out * 0.1, halfH],
    [R + out * 0.35, halfH * 0.98],
    [R + out * 0.68, halfH * 0.72],
    [R + out * 0.86, halfH * 0.2],
    [R + out * 0.86, -halfH * 0.6],
    [R + out * 0.55, -halfH],
  ];
  return new THREE.CatmullRomCurve3(raw.map(p => new THREE.Vector3(p[0], p[1], 0)), true, 'catmullrom', 0.5);
}

function tubeFromCurve(curve, radius, mat, tubular = 96, radial = 10) {
  const geo = new THREE.TubeGeometry(curve, tubular, radius, radial, true);
  return new THREE.Mesh(geo, mat);
}

export class TokamakScene {
  constructor(canvas, data) {
    this.canvas = canvas;
    this.data = data || {};
    this.active = true;
    this.stepTarget = 0;
    this.stepSmooth = 0;
    this.dragYaw = 0;
    this.dragPitch = 0;
    this.autoRot = 0;
    this.baseRotY = 0.92;
    this.baseRotX = 0.06;
    this.activePart = 'whole';
    this.pointerDown = false;
    this.clock = new THREE.Clock();
    this.width = canvas.clientWidth || window.innerWidth;
    this.height = canvas.clientHeight || window.innerHeight;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 820 ? 1.5 : 1.8));
    this.renderer.setSize(this.width, this.height, false);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.9;
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setClearAlpha(0);

    this.scene = new THREE.Scene();
    this.envTex = makeEnvTexture();
    this.scene.environment = this.envTex;
    this.scene.environmentIntensity = 0.42;
    this.scene.background = null;
    this.scene.backgroundIntensity = 0;
    this.isMobile = window.innerWidth < 820;
    this.camera = new THREE.PerspectiveCamera(38, this.width / this.height, 0.1, 200);
    this.camera.position.set(this.isMobile ? 0 : 12.5, this.isMobile ? 9 : 8.4, this.isMobile ? 28 : 17.8);
    this.lookOffsetX = this.isMobile ? 0 : -2.2;
    this.camera.lookAt(this.lookOffsetX, 0.2, 0);

    this.setupLights();
    this.machine = new THREE.Group();
    this.machine.rotation.set(this.baseRotX, this.baseRotY, 0);
    this.machine.scale.setScalar(this.isMobile ? 0.72 : 0.88);
    this.scene.add(this.machine);

    this.parts = {};
    this.materials = {};
    this.buildGround();
    this.buildCryostat();
    this.buildVessel();
    this.buildBlanket();
    this.buildDivertor();
    this.buildMagnets();
    this.buildPlasma();
    this.buildAuxiliary();
    this.buildDust();


    this.callout = this.makeCallout();
    this.anchorMap = {
      vessel: new THREE.Vector3(3.65, 0.9, 0),
      blanket: new THREE.Vector3(2.9, 1.35, 0),
      divertor: new THREE.Vector3(2.9, -1.55, 0),
      magnets: new THREE.Vector3(4.55, 2.2, 0),
      plasma: new THREE.Vector3(2.55, 0.35, 0),
      cryostat: new THREE.Vector3(5.35, 3.1, 0),
      whole: new THREE.Vector3(0, 3.15, 0),
    };
    this.worldAnchor = new THREE.Vector3();

    this.resize();
    this.onResize = () => this.resize();
    window.addEventListener('resize', this.onResize);
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  setupLights() {
    const hemi = new THREE.HemisphereLight(0xffffff, 0xbfd7ea, 0.95);
    this.scene.add(hemi);
    const key = new THREE.DirectionalLight(0xfff0d6, 2.3);
    key.position.set(7, 9, 7);
    key.castShadow = false;
    this.scene.add(key);
    const fill = new THREE.DirectionalLight(0xcfe8ff, 1.25);
    fill.position.set(-8, 4, 6);
    this.scene.add(fill);
    const rim = new THREE.DirectionalLight(0xffd6a0, 1.5);
    rim.position.set(-2, 6, -9);
    this.scene.add(rim);
    const top = new THREE.DirectionalLight(0xffffff, 0.65);
    top.position.set(0, 12, 0);
    this.scene.add(top);
    this.plasmaLight = new THREE.PointLight(0x6ff5ff, 3.2, 18, 2);
    this.plasmaLight.position.set(0, 0.2, 0);
    this.scene.add(this.plasmaLight);
  }

  buildGround() {
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0xc7e3f7, roughness: 0.92, metalness: 0.02, transparent: true, opacity: 0.95 });
    const base = new THREE.Mesh(new THREE.CircleGeometry(8.6, 96), mat);
    base.rotation.x = -Math.PI / 2;
    base.position.y = -4.55;
    g.add(base);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x8fc4e8, transparent: true, opacity: 0.35 });
    [5.8, 6.8, 7.8, 8.5].forEach(r => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.012, 6, 128), ringMat);
      ring.rotation.x = Math.PI / 2; ring.position.y = -4.54;
      g.add(ring);
    });
    // soft shadow
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const ctx = c.getContext('2d');
    const rad = ctx.createRadialGradient(128, 128, 10, 128, 128, 128);
    rad.addColorStop(0, 'rgba(31,56,100,.24)');
    rad.addColorStop(0.55, 'rgba(31,56,100,.08)');
    rad.addColorStop(1, 'rgba(31,56,100,0)');
    ctx.fillStyle = rad; ctx.fillRect(0, 0, 256, 256);
    const tex = new THREE.CanvasTexture(c);
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(12.5, 12.5), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = -4.52;
    g.add(shadow);
    this.scene.add(g);
    this.ground = g;
  }

  buildCryostat() {
    const group = new THREE.Group();
    const mat = new THREE.MeshPhysicalMaterial({
      color: 0x9fd0f0, metalness: 0.2, roughness: 0.08, transparent: true, opacity: 0.03,
      side: THREE.DoubleSide, depthWrite: false, clearcoat: 1, clearcoatRoughness: 0.06
    });
    // The cryostat shell is intentionally omitted in the assembled view;
    // its rings and ribs define the volume without hiding the vessel.
    const shell = new THREE.Mesh(new THREE.CylinderGeometry(5.55, 5.55, 7.3, 96, 1, true), mat);
    shell.position.y = -0.15;
    shell.visible = false;
    group.add(shell);
    this.parts.cryostatShell = shell;
    this.materials.cryostatShell = mat;
    const edgeMat = new THREE.MeshBasicMaterial({ color: 0x9fd2f4, transparent: true, opacity: 0.55 });
    [-3.8, 3.5].forEach(y => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(5.55, 0.028, 8, 128), edgeMat);
      ring.rotation.x = Math.PI / 2; ring.position.y = y; group.add(ring);
    });
    const ribMat = new THREE.MeshBasicMaterial({ color: 0xb9e0fa, transparent: true, opacity: 0.32 });
    for (let i = 0; i < 16; i++) {
      const a = i / 16 * Math.PI * 2;
      const rib = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 7.3, 5), ribMat);
      rib.position.set(Math.cos(a) * 5.55, -0.15, Math.sin(a) * 5.55);
      group.add(rib);
    }
    this.machine.add(group);
    this.parts.cryostat = group;
    this.materials.cryostat = mat;
  }

  buildVessel() {
    const group = new THREE.Group();
    const mat = new THREE.MeshPhysicalMaterial({
      color: 0x3f7fb5, metalness: 0.52, roughness: 0.3, clearcoat: 0.7, clearcoatRoughness: 0.16,
      transparent: true, opacity: 0.13, side: THREE.DoubleSide
    });
    const innerMat = new THREE.MeshStandardMaterial({ color: 0x2f5f8f, metalness: 0.7, roughness: 0.42, side: THREE.DoubleSide, transparent: true, opacity: 0.10 });
    const pts = dProfile(3.25, 0.52, 1.35, 72);
    const geoA = new THREE.LatheGeometry(pts, 72, 0.22, Math.PI - 0.44);
    const geoB = new THREE.LatheGeometry(pts, 72, Math.PI + 0.22, Math.PI - 0.44);
    const halfA = new THREE.Group();
    const halfB = new THREE.Group();
    const a1 = new THREE.Mesh(geoA, mat); const b1 = new THREE.Mesh(geoB, mat);
    halfA.add(a1); halfB.add(b1);
    const ptsIn = dProfile(3.19, 0.44, 1.24, 64);
    const a2 = new THREE.Mesh(new THREE.LatheGeometry(ptsIn, 64, 0.24, Math.PI - 0.48), innerMat);
    const b2 = new THREE.Mesh(new THREE.LatheGeometry(ptsIn, 64, Math.PI + 0.24, Math.PI - 0.48), innerMat);
    halfA.add(a2); halfB.add(b2);
    // ports
    const portMat = new THREE.MeshStandardMaterial({ color: 0x8fb9de, metalness: 0.9, roughness: 0.22 });
    const portGeo = new THREE.CylinderGeometry(0.15, 0.18, 0.62, 14);
    for (let i = 0; i < 10; i++) {
      const a = i / 10 * Math.PI * 2;
      if (a < 0.12 || Math.abs(a - Math.PI) < 0.12) continue;
      const g = new THREE.Group();
      const m = new THREE.Mesh(portGeo, portMat);
      m.rotation.z = Math.PI / 2;
      m.position.x = 3.95;
      g.add(m);
      g.rotation.y = -a;
      g.position.y = (i % 3 - 1) * 0.55;
      (a < Math.PI ? halfA : halfB).add(g);
    }
    // poloidal ribs outline the D-shaped cross-section
    const ribMat = new THREE.MeshBasicMaterial({ color: 0x2a6fa8, transparent: true, opacity: 0.55 });
    const ribPts = dProfile(3.25, 0.55, 1.37, 48).map(p => new THREE.Vector3(p.x, p.y, 0));
    const ribCurve = new THREE.CatmullRomCurve3(ribPts, true, 'catmullrom', 0.5);
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2;
      const rib = new THREE.Mesh(new THREE.TubeGeometry(ribCurve, 64, 0.014, 6, true), ribMat);
      rib.rotation.y = -a;
      (a < Math.PI ? halfA : halfB).add(rib);
    }
    group.add(halfA, halfB);
    this.machine.add(group);
    this.parts.vessel = group;
    this.parts.vesselA = halfA;
    this.parts.vesselB = halfB;
    this.materials.vessel = mat;
    this.materials.vesselInner = innerMat;
  }

  buildBlanket() {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({
      color: 0xb56b2f, metalness: 0.7, roughness: 0.36,
      emissive: 0x2a1004, emissiveIntensity: 0.3, side: THREE.DoubleSide, transparent: true
    });
    const mat2 = new THREE.MeshStandardMaterial({ color: 0x6f7f8e, metalness: 0.8, roughness: 0.42, side: THREE.DoubleSide });
    const tiles = [];
    const n = 12;
    for (let i = 0; i < n; i++) {
      const start = i / n * Math.PI * 2 + 0.06;
      const len = Math.PI * 2 / n - 0.12;
      const pts = dProfile(3.02, 0.39, 1.16, 36);
      const geo = new THREE.LatheGeometry(pts, 24, start, len);
      const m = new THREE.Mesh(geo, mat);
      m.userData.base = new THREE.Vector3();
      m.userData.dir = new THREE.Vector3(Math.cos(start + len / 2), 0, Math.sin(start + len / 2));
      group.add(m); tiles.push(m);
    }
    const shoulder = new THREE.Mesh(new THREE.LatheGeometry(dProfile(2.94, 0.3, 1.05, 36), 64, 0.02, Math.PI * 2 - 0.04), mat2);
    group.add(shoulder);
    this.machine.add(group);
    this.parts.blanket = group;
    this.parts.blanketTiles = tiles;
    this.materials.blanket = mat;
  }

  buildDivertor() {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0x77828e, metalness: 0.92, roughness: 0.28, emissive: 0x170b02, emissiveIntensity: 0.2 });
    const glowMat = new THREE.MeshBasicMaterial({ color: 0xffa64a, transparent: true, opacity: 0.8 });
    const cassettes = [];
    const n = 16;
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2;
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.26, 0.46), mat);
      body.position.y = 0;
      g.add(body);
      const lip = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.035, 0.055), glowMat);
      lip.position.set(0, 0.15, -0.23);
      g.add(lip);
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.38, 8), mat);
      pipe.rotation.x = Math.PI / 2; pipe.position.set(0, -0.18, 0.28);
      g.add(pipe);
      g.position.set(Math.cos(a) * 2.93, -1.46, Math.sin(a) * 2.93);
      g.rotation.y = -a;
      group.add(g); cassettes.push(g);
    }
    this.machine.add(group);
    this.parts.divertor = group;
    this.parts.divertorCassettes = cassettes;
    this.materials.divertor = mat;
  }

  buildMagnets() {
    const coilMat = new THREE.MeshPhysicalMaterial({
      color: 0x1d55b0, metalness: 0.7, roughness: 0.3, clearcoat: 0.65, clearcoatRoughness: 0.2,
      emissive: 0x071f4a, emissiveIntensity: 0.4
    });
    const innerMat = new THREE.MeshBasicMaterial({ color: 0x88d6ff, transparent: true, opacity: 0.62 });
    const tf = new THREE.Group();
    const tfCoils = [];
    const n = 16;
    const curve = coilCurve(4.05, 2.55, 0.85);
    const outerTube = new THREE.TubeGeometry(curve, 100, 0.082, 8, true);
    const innerTube = new THREE.TubeGeometry(curve, 100, 0.026, 6, true);
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2;
      const g = new THREE.Group();
      g.add(new THREE.Mesh(outerTube, coilMat));
      g.add(new THREE.Mesh(innerTube, innerMat));
      g.rotation.y = -a;
      g.userData.base = new THREE.Vector3(0, 0, 0);
      g.userData.dir = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
      tf.add(g); tfCoils.push(g);
    }
    this.machine.add(tf);
    this.parts.tf = tf;
    this.parts.tfCoils = tfCoils;
    this.materials.tf = coilMat;

    const pfMat = new THREE.MeshStandardMaterial({ color: 0x0e8a78, metalness: 0.62, roughness: 0.36, emissive: 0x032a24, emissiveIntensity: 0.3 });
    const pf = new THREE.Group();
    const pfCoils = [];
    const rings = [
      [4.95, 1.55], [5.0, 1.95], [3.95, 2.35], [4.0, 2.78], [2.95, 2.95], [3.0, 3.32]
    ];
    rings.forEach(([r, y], idx) => {
      const m = new THREE.Mesh(new THREE.TorusGeometry(r, 0.058, 10, 96), pfMat);
      m.rotation.x = Math.PI / 2;
      m.position.y = idx % 2 === 0 ? -y : y;
      m.userData.baseY = m.position.y;
      m.userData.sign = Math.sign(m.position.y);
      pf.add(m); pfCoils.push(m);
    });
    this.machine.add(pf);
    this.parts.pf = pf;
    this.parts.pfCoils = pfCoils;
    this.materials.pf = pfMat;

    const csMat = new THREE.MeshStandardMaterial({ color: 0xb06a2c, metalness: 0.78, roughness: 0.32, emissive: 0x2a1404, emissiveIntensity: 0.25 });
    const cs = new THREE.Group();
    const csParts = [];
    for (let i = 0; i < 7; i++) {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.33, 32), csMat);
      m.position.y = -1.25 + i * 0.42;
      m.userData.baseY = m.position.y;
      cs.add(m); csParts.push(m);
    }
    const column = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 3.3, 24), new THREE.MeshStandardMaterial({ color: 0x9aa7b4, metalness: 0.9, roughness: 0.3 }));
    cs.add(column);
    this.machine.add(cs);
    this.parts.cs = cs;
    this.parts.csParts = csParts;
    this.materials.cs = csMat;
  }

  buildPlasma() {
    const geo = new THREE.TorusGeometry(2.98, 0.52, 32, 160);
    const uniforms = {
      uTime: { value: 0 },
      uColorA: { value: new THREE.Color(0x2fe3ff) },
      uColorB: { value: new THREE.Color(0xff9b4a) },
      uOpacity: { value: 0.55 },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.NormalBlending,
      side: THREE.DoubleSide,
      vertexShader: `
        varying vec3 vNormal; varying vec3 vView; varying vec2 vUv;
        void main(){
          vUv = uv;
          vec4 mv = modelViewMatrix * vec4(position,1.0);
          vNormal = normalize(normalMatrix * normal);
          vView = normalize(-mv.xyz);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        uniform float uTime; uniform vec3 uColorA; uniform vec3 uColorB; uniform float uOpacity;
        varying vec3 vNormal; varying vec3 vView; varying vec2 vUv;
        float hash(vec2 p){ return fract(sin(dot(p,vec2(41.3,289.1)))*43758.5453); }
        float noise(vec2 p){
          vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
          return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y);
        }
        void main(){
          float fres = pow(1.0 - abs(dot(normalize(vNormal), normalize(vView))), 2.4);
          float bands = 0.5 + 0.5 * sin(vUv.x * 46.0 + uTime * 1.4 + sin(vUv.y * 12.0) * 2.0);
          float n = noise(vec2(vUv.x * 28.0 + uTime * 0.12, vUv.y * 8.0 - uTime * 0.08));
          vec3 col = mix(uColorA, uColorB, 0.28 + 0.42 * n);
          float core = smoothstep(0.25, 1.0, fres) + 0.25 * bands;
          float alpha = clamp((0.32 + 0.85 * fres) * (0.55 + 0.45 * bands), 0.0, 1.0) * uOpacity;
          gl_FragColor = vec4(col * (1.1 + 1.6 * core), alpha);
        }
      `
    });
    const plasma = new THREE.Mesh(geo, mat);
    plasma.position.y = 0.16;
    plasma.rotation.x = Math.PI / 2;
    plasma.renderOrder = 10;
    plasma.visible = false;
    this.machine.add(plasma);
    const glowGeo = new THREE.TorusGeometry(2.98, 0.16, 16, 160);
    const glowMat = new THREE.MeshBasicMaterial({ color: 0x9fefff, transparent: true, opacity: 0.18, blending: THREE.NormalBlending, depthWrite: false });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.position.y = 0.16;
    glow.rotation.x = Math.PI / 2;
    glow.renderOrder = 11;
    glow.visible = false;
    this.machine.add(glow);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(3.36, 0.11, 16, 160),
      new THREE.MeshBasicMaterial({ color: 0x00cfe8, transparent: true, opacity: 0.9, blending: THREE.NormalBlending, depthTest: false, depthWrite: false })
    );
    ring.position.y = 0.16;
    ring.rotation.x = Math.PI / 2;
    ring.renderOrder = 12;
    ring.visible = false;
    this.machine.add(ring);
    this.parts.plasmaRing = ring;
    this.parts.plasma = plasma;
    this.parts.plasmaGlow = glow;
    this.materials.plasma = mat;
  }

  buildAuxiliary() {
    // support legs
    const legMat = new THREE.MeshStandardMaterial({ color: 0x9aa9b8, metalness: 0.8, roughness: 0.35 });
    for (let i = 0; i < 4; i++) {
      const a = Math.PI / 4 + i * Math.PI / 2;
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 1.1, 12), legMat);
      leg.position.set(Math.cos(a) * 4.3, -4.05, Math.sin(a) * 4.3);
      this.machine.add(leg);
    }
    // neutral beam boxes
    const beamMat = new THREE.MeshStandardMaterial({ color: 0x5f7891, metalness: 0.85, roughness: 0.28 });
    const beamGlow = new THREE.MeshBasicMaterial({ color: 0x8fe7ff, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false });
    for (let i = 0; i < 3; i++) {
      const a = -0.85 + i * 0.85;
      const g = new THREE.Group();
      const box = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.42, 0.62), beamMat);
      box.position.x = 5.05;
      g.add(box);
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1.6, 8), beamGlow);
      beam.rotation.z = Math.PI / 2;
      beam.position.x = 4.2;
      g.add(beam);
      g.rotation.y = -a;
      this.machine.add(g);
    }
    // top diagnostics
    const diagMat = new THREE.MeshStandardMaterial({ color: 0x7f93a8, metalness: 0.8, roughness: 0.3 });
    for (let i = 0; i < 3; i++) {
      const a = i / 3 * Math.PI * 2 + 0.2;
      const d = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.5, 10), diagMat);
      d.position.set(Math.cos(a) * 3.2, 3.55, Math.sin(a) * 3.2);
      d.rotation.z = Math.PI / 2;
      d.rotation.y = -a;
      this.machine.add(d);
    }
  }

  buildDust() {
    const n = 190;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const r = 4 + Math.random() * 8;
      const a = Math.random() * Math.PI * 2;
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = -3 + Math.random() * 10;
      pos[i * 3 + 2] = Math.sin(a) * r;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ color: 0xd8f2ff, size: 0.055, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending });
    this.dust = new THREE.Points(geo, mat);
    this.scene.add(this.dust);
  }

  makeCallout() {
    const layer = document.getElementById('callout-layer');
    const el = document.createElement('div');
    el.className = 'callout';
    el.innerHTML = `<div class="callout-dot"></div><div class="callout-line"></div><div class="callout-box"><strong></strong><span></span></div>`;
    layer.appendChild(el);
    return el;
  }

  setStep(step) {
    this.stepTarget = clamp(step, 0, 7);
    const map = { 0: 'whole', 1: 'vessel', 2: 'blanket', 3: 'divertor', 4: 'magnets', 5: 'plasma', 6: 'cryostat', 7: 'whole' };
    this.activePart = map[this.stepTarget] || 'whole';
    this.updateCalloutText();
  }

  updateCalloutText() {
    const box = this.callout.querySelector('.callout-box');
    const strong = box.querySelector('strong');
    const span = box.querySelector('span');
    const info = {
      vessel: ['真空室', '维持超高真空，隔离等离子体与外界'],
      blanket: ['包层', '吸收中子与热量，增殖氚，屏蔽辐射'],
      divertor: ['偏滤器', '排出氦灰与杂质，控制边缘热流'],
      magnets: ['磁体系统', 'TF / PF / CS：约束、成形、驱动等离子体'],
      plasma: ['等离子体', '1 亿度以上的 D-T 火球，Q>1 的目标'],
      cryostat: ['低温与辅助', '4 K 环境、加热与电流驱动、诊断'],
      whole: ['SPARC → ARC', '400 MW 净出力，early 2030s 并网'],
    }[this.activePart];
    strong.textContent = info[0]; span.textContent = info[1];
  }

  setActive(active) {
    this.active = active;
    if (active) this.clock.getDelta();
  }

  drag(dx, dy) {
    this.dragYaw += dx * 0.006;
    this.dragPitch = clamp(this.dragPitch + dy * 0.004, -0.35, 0.35);
  }

  resize() {
    this.width = this.canvas.clientWidth || window.innerWidth;
    this.height = this.canvas.clientHeight || window.innerHeight;
    this.isMobile = window.innerWidth < 820;
    this.lookOffsetX = this.isMobile ? 0 : -2.2;
    if (this.machine) this.machine.scale.setScalar(this.isMobile ? 0.72 : 0.88);
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width, this.height, false);
  }

  updateExplosion(dt) {
    const s = this.stepSmooth;
    const e = (threshold) => smooth(clamp((s - threshold) / 1.15, 0, 1));

    const sep = 1.55 * e(0.8);
    if (this.parts.vesselA) this.parts.vesselA.position.x = -sep;
    if (this.parts.vesselB) this.parts.vesselB.position.x = sep;

    const bt = e(1.8);
    (this.parts.blanketTiles || []).forEach(tile => {
      tile.position.copy(tile.userData.dir).multiplyScalar(0.45 * bt);
    });

    const dt3 = e(2.7);
    (this.parts.divertorCassettes || []).forEach((g, i) => {
      const a = i / 16 * Math.PI * 2;
      g.position.set(Math.cos(a) * (2.93 + 0.34 * dt3), -1.46 - 0.95 * dt3, Math.sin(a) * (2.93 + 0.34 * dt3));
    });

    const mt = e(3.3);
    (this.parts.tfCoils || []).forEach(g => {
      g.position.copy(g.userData.dir).multiplyScalar(2.35 * mt);
    });
    (this.parts.pfCoils || []).forEach(m => {
      m.position.y = m.userData.baseY + m.userData.sign * 1.85 * mt;
    });
    (this.parts.csParts || []).forEach((m, i) => {
      m.position.y = m.userData.baseY + (i - 3) * 0.24 * mt + 2.1 * mt;
    });

    const showPlasma = s > 4.15;
    const plasmaFocus = smooth(clamp((s - 4.2) / 0.8, 0, 1)) * (1 - smooth(clamp((s - 5.8) / 1.0, 0, 1)));
    if (this.parts.plasma) this.parts.plasma.visible = showPlasma && plasmaFocus > 0.25;
    if (this.parts.plasmaGlow) this.parts.plasmaGlow.visible = showPlasma && plasmaFocus > 0.25;
    if (this.parts.plasmaRing) {
      this.parts.plasmaRing.visible = showPlasma && plasmaFocus > 0.35;
      this.parts.plasmaRing.material.opacity = 0.25 + 0.7 * plasmaFocus;
    }
    if (this.materials.plasma && this.materials.plasma.uniforms) this.materials.plasma.uniforms.uOpacity.value = 0.45 + 0.45 * plasmaFocus;
    const vesselFocus = smooth(clamp((s - 0.65) / 0.55, 0, 1)) * (1 - smooth(clamp((s - 1.75) / 0.8, 0, 1)));
    if (this.materials.vessel) this.materials.vessel.opacity = (0.13 + 0.24 * vesselFocus) * (1 - 0.8 * plasmaFocus);
    if (this.materials.vesselInner) this.materials.vesselInner.opacity = (0.10 + 0.12 * vesselFocus) * (1 - 0.9 * plasmaFocus);
    if (this.parts.cryostatShell) {
      const showCryo = s > 5.35;
      this.parts.cryostatShell.visible = showCryo;
      if (showCryo) this.materials.cryostatShell.opacity = 0.16 * (1 - smooth(clamp((s - 6.8) / 1.0, 0, 1)));
    }
    if (this.materials.blanket) this.materials.blanket.opacity = 1 - 0.6 * plasmaFocus;
    if (this.parts.blanket) this.parts.blanket.visible = plasmaFocus < 0.55;

    const ct = e(5.8);
    if (this.parts.cryostat) {
      this.parts.cryostat.scale.setScalar(1 + 0.06 * ct);
      this.parts.cryostat.position.y = 0.35 * ct;
      this.materials.cryostat.opacity = 0.13 * (1 - 0.82 * ct) + 0.012;
    }

    // active glow
    const pulse = 0.82 + 0.18 * Math.sin(performance.now() * 0.003);
    const active = this.activePart;
    if (this.materials.vessel) { this.materials.vessel.emissive.setHex(active === 'vessel' ? 0x2a6fa8 : 0x000000); this.materials.vessel.emissiveIntensity = active === 'vessel' ? 0.35 * pulse : 0.0; }
    if (this.materials.blanket) this.materials.blanket.emissiveIntensity = active === 'blanket' ? 0.9 * pulse : 0.25;
    if (this.materials.divertor) this.materials.divertor.emissiveIntensity = active === 'divertor' ? 0.9 * pulse : 0.18;
    if (this.materials.tf) { this.materials.tf.emissive.setHex(active === 'magnets' ? 0x1f6fff : 0x071f4a); this.materials.tf.emissiveIntensity = active === 'magnets' ? 1.1 * pulse : 0.35; }
    if (this.materials.pf) { this.materials.pf.emissive.setHex(active === 'magnets' ? 0x1fd6b8 : 0x032a24); this.materials.pf.emissiveIntensity = active === 'magnets' ? 1.0 * pulse : 0.3; }
    if (this.materials.cs) { this.materials.cs.emissive.setHex(active === 'magnets' ? 0xffa64a : 0x2a1404); this.materials.cs.emissiveIntensity = active === 'magnets' ? 1.0 * pulse : 0.25; }
  }

  updateCamera(dt) {
    const step = this.stepTarget;
    const targets = {
      0: [12.5, 8.4, 17.8],
      1: [11.2, 7.4, 18.4],
      2: [10.6, 6.8, 18.4],
      3: [11.4, 5.0, 18.0],
      4: [13.4, 9.2, 16.8],
      5: [11.2, 4.8, 18.4],
      6: [12.4, 8.6, 19.0],
      7: [15.0, 10.8, 17.8],
    };
    let t = targets[step] || targets[0];
    if (this.isMobile) {
      const mt = { 0:[0,9,28], 1:[0,9,28], 2:[0,9,28], 3:[0,8.5,28], 4:[0,10,29], 5:[0,8,28], 6:[0,10,29], 7:[0,11,30] };
      t = mt[step] || mt[0];
    }
    const target = new THREE.Vector3(t[0], t[1], t[2]);
    const k = 1 - Math.exp(-dt * 2.4);
    this.camera.position.lerp(target, k);
    this.camera.lookAt(this.lookOffsetX, this.isMobile ? -2.5 : 0.15, 0);
  }

  updateCallout() {
    if (this.activePart === 'whole' && this.stepTarget === 0) {
      this.callout.classList.remove('visible');
      return;
    }
    const anchor = this.anchorMap[this.activePart];
    if (!anchor) { this.callout.classList.remove('visible'); return; }
    this.worldAnchor.copy(anchor);
    this.machine.updateMatrixWorld();
    this.machine.localToWorld(this.worldAnchor);
    const p = this.worldAnchor.clone().project(this.camera);
    if (p.z > 1 || p.z < -1) { this.callout.classList.remove('visible'); return; }
    const x = (p.x * 0.5 + 0.5) * this.width;
    const y = (-p.y * 0.5 + 0.5) * this.height;
    const onRight = x > this.width * 0.62;
    const offset = window.innerWidth < 820 ? 28 : 55;
    const boxX = onRight ? x - offset - 150 : x + offset;
    const boxY = y - 18;
    this.callout.style.transform = `translate(${boxX}px, ${boxY}px)`;
    this.callout.querySelector('.callout-dot').style.position = 'absolute';
    this.callout.querySelector('.callout-dot').style.left = (x - boxX) + 'px';
    this.callout.querySelector('.callout-dot').style.top = (y - boxY) + 'px';
    const line = this.callout.querySelector('.callout-line');
    line.style.position = 'absolute';
    line.style.left = (onRight ? (x - boxX - offset) : (x - boxX)) + 'px';
    line.style.top = (y - boxY) + 'px';
    line.style.width = offset + 'px';
    this.callout.querySelector('.callout-box').style.transform = onRight ? 'translateX(0)' : 'translateX(0)';
    this.callout.classList.add('visible');
  }

  animate() {
    requestAnimationFrame(this.animate);
    const dt = Math.min(this.clock.getDelta(), 0.05);
    if (!this.active) return;

    this.stepSmooth += (this.stepTarget - this.stepSmooth) * Math.min(1, dt * 4.2);
    this.autoRot += dt * 0.055;
    this.machine.rotation.y = this.baseRotY + this.autoRot + this.dragYaw;
    this.machine.rotation.x = this.baseRotX + this.dragPitch;

    this.updateExplosion(dt);
    this.updateCamera(dt);

    if (this.materials.plasma && this.materials.plasma.uniforms) {
      this.materials.plasma.uniforms.uTime.value += dt;
    }
    const pulse = 1 + Math.sin(performance.now() * 0.0018) * 0.018;
    if (this.parts.plasma) this.parts.plasma.scale.setScalar(pulse);
    if (this.parts.plasmaGlow) this.parts.plasmaGlow.scale.setScalar(pulse * 1.005);
    this.plasmaLight.intensity = 3.0 + Math.sin(performance.now() * 0.002) * 0.7;
    if (this.dust) this.dust.rotation.y += dt * 0.008;

    this.updateCallout();
    this.renderer.render(this.scene, this.camera);
  }
}
