import * as THREE from 'three';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const fmt1 = v => (Math.round(v * 10) / 10).toFixed(1);
const smooth = t => t * t * (3 - 2 * t);

function makeEnvTexture() {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 512;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0, '#e7f6ff'); g.addColorStop(0.45, '#ffffff');
  g.addColorStop(0.58, '#fff2d8'); g.addColorStop(0.8, '#d9ecfb'); g.addColorStop(1, '#bcd9ef');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 1024, 512);
  const sun = ctx.createRadialGradient(760, 150, 0, 760, 150, 260);
  sun.addColorStop(0, 'rgba(255,255,255,1)'); sun.addColorStop(0.3, 'rgba(255,236,190,.8)'); sun.addColorStop(1, 'rgba(255,214,150,0)');
  ctx.fillStyle = sun; ctx.fillRect(0, 0, 1024, 512);
  const tex = new THREE.CanvasTexture(c);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function windowTexture() {
  const c = document.createElement('canvas'); c.width = 128; c.height = 256;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#14243b'; ctx.fillRect(0, 0, 128, 256);
  for (let y = 12; y < 246; y += 16) {
    for (let x = 8; x < 120; x += 14) {
      const r = Math.random();
      if (r > 0.34) {
        ctx.fillStyle = r > 0.78 ? '#ffd28a' : (r > 0.55 ? '#a7ecff' : '#6bbcff');
        ctx.globalAlpha = 0.55 + Math.random() * 0.45;
        ctx.fillRect(x, y, 9, 8);
      }
    }
  }
  ctx.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function circleSprite(color = '#ffffff') {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, color);
  g.addColorStop(0.28, color);
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(32, 32, 32, 0, Math.PI * 2); ctx.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class EnergyScene {
  constructor(canvas, data) {
    this.canvas = canvas;
    this.data = data;
    this.active = false;
    this.width = canvas.clientWidth || window.innerWidth;
    this.height = canvas.clientHeight || window.innerHeight;
    this.year = 2030;
    this.step = 0;
    this.clock = new THREE.Clock();
    this.orbit = 0;
    this.curTotal = 0;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 820 ? 1.4 : 1.7));
    this.renderer.setSize(this.width, this.height, false);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.95;
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setClearAlpha(0);

    this.scene = new THREE.Scene();
    this.envTex = makeEnvTexture();
    this.scene.environment = this.envTex;
    this.scene.environmentIntensity = 0.55;
    this.scene.background = null;
    this.scene.backgroundIntensity = 0;
    this.scene.fog = new THREE.FogExp2(0xeaf6ff, 0.012);

    this.isMobile = window.innerWidth < 820;
    this.camera = new THREE.PerspectiveCamera(this.isMobile ? 46 : 40, this.width / this.height, 0.1, 240);
    this.camera.position.set(0, this.isMobile ? 18 : 12.0, this.isMobile ? 27 : 17.0);
    this.camera.lookAt(0, 2.0, 0);

    this.setupLights();
    this.buildGround();
    this.buildCampus();
    this.sources = [];
    this.flows = [];
    this.labels = [];
    this.buildSources();
    this.buildFlows();
    this.buildLabels();


    this.hud = {
      total: document.getElementById('energy-total'),
      bar: document.getElementById('mix-bar'),
      legend: document.getElementById('mix-legend'),
      caption: document.getElementById('energy-caption'),
    };
    this.buildHUD();
    this.setYear(2030, true);
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  setupLights() {
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0xc5dff2, 0.85));
    const key = new THREE.DirectionalLight(0xfff0d8, 1.9);
    key.position.set(10, 16, 8); this.scene.add(key);
    const fill = new THREE.DirectionalLight(0xcfe8ff, 1.0);
    fill.position.set(-12, 8, 6); this.scene.add(fill);
    const rim = new THREE.DirectionalLight(0xffd2a0, 0.85);
    rim.position.set(0, 8, -14); this.scene.add(rim);
  }

  buildGround() {
    const plane = new THREE.Mesh(
      new THREE.CircleGeometry(30, 128),
      new THREE.MeshStandardMaterial({ color: 0xcfe8fa, roughness: 0.9, metalness: 0.03 })
    );
    plane.rotation.x = -Math.PI / 2;
    this.scene.add(plane);
    const grid = new THREE.GridHelper(44, 44, 0x94c6e8, 0xbfe2f5);
    grid.position.y = 0.012;
    grid.material.transparent = true; grid.material.opacity = 0.35;
    this.scene.add(grid);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x7fc3ee, transparent: true, opacity: 0.4 });
    [6.5, 10.5, 15, 21].forEach(r => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.018, 6, 160), ringMat);
      ring.rotation.x = Math.PI / 2; ring.position.y = 0.02;
      this.scene.add(ring);
    });
  }

  buildCampus() {
    const group = new THREE.Group();
    const tex = windowTexture();
    const base = new THREE.MeshStandardMaterial({ color: 0x24476e, roughness: 0.32, metalness: 0.5, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 1.15 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x6f8ba6, roughness: 0.42, metalness: 0.65 });
    const units = [
      { x: -1.25, z: 0.25, w: 1.8, h: 2.2, d: 1.5 },
      { x: 0.35, z: -0.55, w: 1.35, h: 3.0, d: 1.3 },
      { x: 1.45, z: 0.5, w: 1.55, h: 2.0, d: 1.4 },
      { x: -0.6, z: 1.25, w: 1.4, h: 1.5, d: 1.0 },
      { x: 1.0, z: -1.35, w: 1.2, h: 1.75, d: 1.1 },
    ];
    units.forEach((u, i) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(u.w, u.h, u.d), base.clone());
      if (m.material.emissiveMap) {
        m.material.emissiveMap = tex.clone();
        m.material.emissiveMap.needsUpdate = true;
        m.material.emissiveMap.repeat.set(1.2, u.h / 1.4);
      }
      m.position.set(u.x, u.h / 2 + 0.05, u.z);
      m.castShadow = false; m.receiveShadow = false;
      group.add(m);
      const roof = new THREE.Mesh(new THREE.BoxGeometry(u.w * 1.04, 0.09, u.d * 1.04), roofMat);
      roof.position.set(u.x, u.h + 0.06, u.z);
      group.add(roof);
      if (i < 3) {
        const fan = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.08, 16), roofMat);
        fan.position.set(u.x + u.w * 0.15, u.h + 0.13, u.z);
        group.add(fan);
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.018, 6, 24), new THREE.MeshBasicMaterial({ color: 0x8fe3ff, transparent: true, opacity: 0.7 }));
        ring.rotation.x = Math.PI / 2; ring.position.copy(fan.position); ring.position.y += 0.05;
        group.add(ring);
      }
    });
    // glowing core
    const core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.34, 2),
      new THREE.MeshBasicMaterial({ color: 0x4fdcff, transparent: true, opacity: 0.62, blending: THREE.NormalBlending, depthWrite: false })
    );
    core.position.set(0, 3.6, 0);
    group.add(core);
    this.core = core;
    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(0.9, 32, 32),
      new THREE.MeshBasicMaterial({ color: 0x5fd8ff, transparent: true, opacity: 0.08, blending: THREE.NormalBlending, depthWrite: false })
    );
    glow.position.copy(core.position);
    group.add(glow);
    this.coreGlow = glow;
    // substation
    const subMat = new THREE.MeshStandardMaterial({ color: 0x5f7891, roughness: 0.5, metalness: 0.7 });
    for (let i = 0; i < 3; i++) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.65, 0.42), subMat);
      b.position.set(-2.4 + i * 0.7, 0.33, -1.5);
      group.add(b);
    }
    this.campus = group;
    group.scale.setScalar(1.12);
    this.scene.add(group);
    this.campusLabel = new THREE.Vector3(0, 5.2, 0);
  }

  addSource(key, name, color, pos, icon, anchorY = 2.8) {
    const g = new THREE.Group();
    g.position.set(pos[0], 0, pos[2]);
    g.add(icon);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.05, 0.035, 8, 64),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5 })
    );
    ring.rotation.x = Math.PI / 2; ring.position.y = 0.04;
    g.add(ring);
    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(1.0, 48),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.07, depthWrite: false })
    );
    disc.rotation.x = -Math.PI / 2; disc.position.y = 0.03;
    g.add(disc);
    this.scene.add(g);
    const src = { key, name, color, pos: new THREE.Vector3(pos[0], 0, pos[2]), group: g, anchor: new THREE.Vector3(pos[0], anchorY, pos[2]), twh: 0, share: 0, targetTwh: 0, targetShare: 0 };
    this.sources.push(src);
    return src;
  }

  buildSources() {
    // gas
    const gas = new THREE.Group();
    const gasMat = new THREE.MeshStandardMaterial({ color: 0xf3a53a, metalness: 0.6, roughness: 0.3, emissive: 0x5a2a00, emissiveIntensity: 0.25 });
    const gasBody = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.72, 0.95, 24), gasMat);
    gasBody.position.y = 0.5; gas.add(gasBody);
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.8, 20), new THREE.MeshBasicMaterial({ color: 0xffc36b, transparent: true, opacity: 0.82, blending: THREE.AdditiveBlending }));
    flame.position.y = 1.42; gas.add(flame);
    for (let i = 0; i < 3; i++) {
      const pipe = new THREE.Mesh(new THREE.TorusGeometry(0.82, 0.045, 8, 32), gasMat);
      pipe.rotation.x = Math.PI / 2; pipe.position.y = 0.28 + i * 0.3; gas.add(pipe);
    }
    this.addSource('gas', '天然气', '#F5A623', [-8.2, 0, 4.2], gas, 2.4);

    // nuclear
    const nuc = new THREE.Group();
    const nucMat = new THREE.MeshStandardMaterial({ color: 0xd7e9fb, metalness: 0.45, roughness: 0.35 });
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.72, 1.8, 32, 1, true), nucMat);
    tower.position.y = 1.0; nuc.add(tower);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.62, 28, 18, 0, Math.PI * 2, 0, Math.PI / 2), nucMat);
    dome.position.y = 1.9; nuc.add(dome);
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.22, 20, 16), new THREE.MeshBasicMaterial({ color: 0x79d9ff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending }));
    core.position.y = 1.0; nuc.add(core);
    this.addSource('nuclear', '核电', '#4A7BD0', [-8.6, 0, -3.4], nuc, 2.8);

    // renewables
    const ren = new THREE.Group();
    const panelMat = new THREE.MeshStandardMaterial({ color: 0x2f7fbf, metalness: 0.5, roughness: 0.25, emissive: 0x062a4a, emissiveIntensity: 0.25 });
    for (let i = 0; i < 3; i++) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.05, 0.55), panelMat);
      p.position.set(-0.7 + i * 0.55, 0.28 + i * 0.12, 0.2);
      p.rotation.x = -0.35; p.rotation.y = -0.25;
      ren.add(p);
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.4, 6), new THREE.MeshStandardMaterial({ color: 0x8ca0b2, metalness: 0.7, roughness: 0.4 }));
      leg.position.set(-0.7 + i * 0.55, 0.12, 0.2); ren.add(leg);
    }
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 1.7, 10), new THREE.MeshStandardMaterial({ color: 0xd7e9fb, metalness: 0.6, roughness: 0.3 }));
    mast.position.set(1.15, 0.9, -0.35); ren.add(mast);
    const hub = new THREE.Group(); hub.position.set(1.15, 1.75, -0.35); ren.add(hub);
    for (let i = 0; i < 3; i++) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.9, 0.16), new THREE.MeshStandardMaterial({ color: 0xe9f6ff, metalness: 0.3, roughness: 0.4 }));
      blade.position.y = 0.45; blade.rotation.z = i * Math.PI * 2 / 3;
      const arm = new THREE.Group(); arm.rotation.z = i * Math.PI * 2 / 3; arm.add(blade); hub.add(arm);
    }
    this.renHub = hub;
    this.addSource('renew', '可再生能源', '#3BB273', [-3.4, 0, -8.2], ren, 2.6);

    // coal
    const coal = new THREE.Group();
    const coalMat = new THREE.MeshStandardMaterial({ color: 0x7f8b98, metalness: 0.4, roughness: 0.6 });
    const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.3, 2.1, 18), coalMat);
    stack.position.y = 1.1; coal.add(stack);
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.035, 6, 24), new THREE.MeshBasicMaterial({ color: 0xffb15a, transparent: true, opacity: 0.55 }));
    band.rotation.x = Math.PI / 2; band.position.y = 1.9; coal.add(band);
    const pile = new THREE.Mesh(new THREE.ConeGeometry(0.7, 0.55, 20), new THREE.MeshStandardMaterial({ color: 0x3d4956, roughness: 0.9 }));
    pile.position.set(0.55, 0.28, 0.25); coal.add(pile);
    this.addSource('coal', '煤电', '#8C8C8C', [6.6, 0, 5.4], coal, 2.8);

    // other (small)
    const oth = new THREE.Group();
    const othMat = new THREE.MeshStandardMaterial({ color: 0xc9a227, metalness: 0.5, roughness: 0.4 });
    const othBox = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.55), othMat);
    othBox.position.y = 0.35; oth.add(othBox);
    // 'other' is kept in the HUD only; a separate 3D node would add clutter for 1% of the mix.

    // fusion ghost
    const fus = new THREE.Group();
    const fusMat = new THREE.MeshStandardMaterial({ color: 0xff9a5a, metalness: 0.7, roughness: 0.25, transparent: true, opacity: 0.68, emissive: 0x4a1500, emissiveIntensity: 0.4 });
    const torus = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.12, 12, 48), fusMat);
    torus.rotation.x = Math.PI / 2.6; fus.add(torus);
    const fusGlow = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.04, 8, 48), new THREE.MeshBasicMaterial({ color: 0xffc58a, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending }));
    fusGlow.rotation.copy(torus.rotation); fus.add(fusGlow);
    fus.position.y = 0.9;
    this.addSource('fusion', '聚变', '#C55A11', [8.4, 0, -4.2], fus, 2.6);
    this.sources.find(s => s.key === 'fusion').ghost = true;
  }

  makeFlowMaterial(color, opacity = 0.9, speed = 1.0) {
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
      side: THREE.DoubleSide,
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(color) },
        uRadius: { value: 0.06 },
        uOpacity: { value: opacity },
        uSpeed: { value: speed },
      },
      vertexShader: `
        uniform float uRadius;
        void main(){
          vec3 p = position + normal * uRadius;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p,1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime; uniform vec3 uColor; uniform float uOpacity; uniform float uSpeed;
        void main(){
          float band = 0.5 + 0.5 * sin(uTime * 3.0 * uSpeed);
          float alpha = uOpacity * (0.55 + 0.45 * band);
          gl_FragColor = vec4(uColor * (0.95 + 0.25 * band), alpha);
        }
      `
    });
  }

  buildFlows() {
    const order = ['gas', 'renew', 'nuclear', 'coal', 'other', 'fusion'];
    const sorted = order.map(k => this.sources.find(s => s.key === k)).filter(Boolean);
    sorted.forEach(src => {
      const start = new THREE.Vector3(src.pos.x, 1.25, src.pos.z);
      const mid1 = new THREE.Vector3(src.pos.x * 0.62, 5.5, src.pos.z * 0.62);
      const mid2 = new THREE.Vector3(src.pos.x * 0.18, 6.4, src.pos.z * 0.18);
      const end = new THREE.Vector3(0, 4.1, 0);
      const curve = new THREE.CatmullRomCurve3([start, mid1, mid2, end], false, 'catmullrom', 0.5);
      const geo = new THREE.TubeGeometry(curve, 120, 0.09, 10, false);
      const mat = this.makeFlowMaterial(src.color, src.ghost ? 0.18 : 0.9, 1.0);
      const mesh = new THREE.Mesh(geo, mat);
      const glowMat = this.makeFlowMaterial(src.color, src.ghost ? 0.05 : 0.18, 1.0);
      const glow = new THREE.Mesh(new THREE.TubeGeometry(curve, 120, 0.19, 10, false), glowMat);
      this.scene.add(mesh); this.scene.add(glow);

      // particles
      const count = src.ghost ? 0 : 54;
      const positions = new Float32Array(Math.max(1, count) * 3);
      const pGeo = new THREE.BufferGeometry();
      pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const pMat = new THREE.PointsMaterial({
        color: new THREE.Color(src.color), size: src.key === 'other' ? 0.10 : 0.15,
        map: circleSprite('#ffffff'), transparent: true, opacity: 1.0,
        blending: THREE.NormalBlending, depthWrite: false, sizeAttenuation: true
      });
      const points = new THREE.Points(pGeo, pMat);
      points.visible = count > 0;
      this.scene.add(points);

      this.flows.push({
        src, curve, mesh, glow, mat, glowMat, points, count,
        offsets: Array.from({ length: count }, () => Math.random()),
        cur: src.ghost ? 0 : 0.1, target: 0.1,
        phase: Math.random() * 10,
      });
    });
  }

  buildLabels() {
    const layer = document.getElementById('source-labels');
    this.labelLayer = layer;
    const order = ['gas', 'renew', 'nuclear', 'coal', 'other', 'fusion'];
    order.forEach(k => {
      const src = this.sources.find(s => s.key === k);
      if (!src) return;
      const el = document.createElement('div');
      el.className = 'source-label' + (src.ghost ? ' ghost' : '');
      el.innerHTML = `<div class="sl-top"><i style="background:${src.color}"></i><strong>${src.name}</strong></div><div class="sl-val"><b>0.0</b><em>TWh · 0%</em></div>`;
      layer.appendChild(el);
      this.labels.push({ src, el, val: el.querySelector('b'), em: el.querySelector('em') });
    });
  }

  buildHUD() {
    const mix = this.data.usMix2030;
    this.hud.bar.innerHTML = mix.map(s => `<span data-key="${s.key}" style="background:${s.color};width:${s.share * 100}%"></span>`).join('');
    this.hud.legend.innerHTML = mix.map(s => `<span class="legend-item" data-key="${s.key}"><i style="background:${s.color}"></i>${s.name} <strong>${s.share * 100}%</strong><em>${s.twh.toFixed(1)} TWh</em></span>`).join('');
    this.hud.total.textContent = fmt1(this.data.us.y2030);
    this.hud.caption.textContent = '2030 年：气电 46%、可再生 33%、核电 20%、煤电 1%。';
  }

  setYear(year, immediate = false) {
    this.year = year;
    const mix = year === 2024 ? this.data.usMix2024 : this.data.usMix2030;
    this.targetMix = mix;
    this.targetTotal = year === 2024 ? this.data.us.y2024 : this.data.us.y2030;
    if (immediate) {
      this.curTotal = this.targetTotal;
      this.flows.forEach(f => {
        const m = mix.find(x => x.key === f.src.key);
        const share = m ? m.share : 0;
        f.cur = share; f.target = share;
      });
    }
    // HUD
    this.hud.total.textContent = fmt1(this.targetTotal);
    const kicker = document.querySelector('.energy-head .kicker');
    if (kicker) kicker.textContent = 'POWER FLOW / ' + year;
    this.hud.caption.textContent = year === 2024
      ? '2024 年：气电 40%、可再生 24%、核电 20%、煤电 15%。'
      : '2030 年：气电 46%、可再生 33%、核电 20%、煤电 1%。';
    Array.from(this.hud.bar.children).forEach(el => {
      const m = mix.find(x => x.key === el.dataset.key);
      el.style.width = ((m ? m.share : 0) * 100).toFixed(2) + '%';
    });
    Array.from(this.hud.legend.children).forEach(el => {
      const m = mix.find(x => x.key === el.dataset.key);
      if (!m) return;
      el.querySelector('strong').textContent = (m.share * 100).toFixed(0) + '%';
      el.querySelector('em').textContent = fmt1(m.twh) + ' TWh';
    });
  }

  setStep(step) {
    this.step = step;
    // camera targets per step
  }

  setActive(active) {
    this.active = active;
    if (active) this.clock.getDelta();
  }

  resize() {
    this.width = this.canvas.clientWidth || window.innerWidth;
    this.height = this.canvas.clientHeight || window.innerHeight;
    this.isMobile = window.innerWidth < 820;
    this.camera.fov = this.isMobile ? 46 : 40;
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width, this.height, false);
  }

  updateFlows(dt) {
    const k = 1 - Math.exp(-dt * 3.0);
    this.curTotal += (this.targetTotal - this.curTotal) * k;
    const mix = this.targetMix || this.data.usMix2030;
    this.flows.forEach((f, i) => {
      const m = mix.find(x => x.key === f.src.key);
      const target = m ? m.share : 0;
      f.cur += (target - f.cur) * k;
      f.target = target;
      const norm = clamp(f.cur / 0.46, 0, 1.3);
      const radius = f.src.ghost ? 0.012 : (0.01 + 0.06 * Math.sqrt(norm));
      f.mat.uniforms.uRadius.value = radius;
      f.glowMat.uniforms.uRadius.value = radius + 0.06;
      f.mat.uniforms.uOpacity.value = f.src.ghost ? 0.10 : (0.5 + 0.35 * Math.min(1, norm * 1.4));
      f.glowMat.uniforms.uOpacity.value = f.src.ghost ? 0.02 : (0.04 + 0.10 * Math.min(1, norm * 1.4));
      f.mat.uniforms.uTime.value += dt;
      f.glowMat.uniforms.uTime.value += dt;
      f.mat.uniforms.uSpeed.value = 0.6 + norm * 1.8;
      f.glowMat.uniforms.uSpeed.value = 0.6 + norm * 1.8;

      if (f.points && f.count) {
        f.points.visible = f.cur > 0.006;
        const pos = f.points.geometry.attributes.position;
        const speed = (0.035 + 0.12 * norm) * dt;
        for (let j = 0; j < f.count; j++) {
          f.offsets[j] = (f.offsets[j] + speed) % 1;
          const p = f.curve.getPointAt(f.offsets[j]);
          pos.setXYZ(j, p.x, p.y, p.z);
        }
        pos.needsUpdate = true;
        f.points.material.opacity = 0.4 + 0.55 * Math.min(1, norm * 1.8);
      }
    });
  }

  updateLabels() {
    const rect = this.canvas.getBoundingClientRect();
    const w = this.width, h = this.height;
    const placed = [];
    this.labels.forEach(({ src, el, val, em }) => {
      const m = this.targetMix ? this.targetMix.find(x => x.key === src.key) : null;
      const share = m ? m.share : 0;
      const twh = m ? m.twh : 0;
      val.textContent = fmt1(twh);
      em.textContent = 'TWh · ' + (share * 100).toFixed(0) + '%';
      el.style.opacity = (src.ghost || share > 0.004) ? 1 : 0.35;
      const p = src.anchor.clone().project(this.camera);
      if (p.z > 1 || p.z < -1) { el.style.display = 'none'; return; }
      let x = clamp((p.x * 0.5 + 0.5) * w, 95, w - 95);
      let y = clamp((-p.y * 0.5 + 0.5) * h, 90, h - 110);
      // collision avoidance
      for (let pass = 0; pass < 2; pass++) {
        for (const q of placed) {
          if (Math.abs(q.x - x) < 118 && Math.abs(q.y - y) < 42) {
            y = q.y + 44;
          }
        }
      }
      y = clamp(y, 90, h - 110);
      placed.push({ x, y });
      el.style.display = 'block';
      el.style.left = x + 'px';
      el.style.top = y + 'px';
    });
  }

  updateCamera(dt) {
    this.orbit += dt * 0.035;
    const step = this.step;
    const radius = this.isMobile ? 27 : (step === 0 ? 17.5 : (step === 2 ? 18.5 : 16.2));
    const height = this.isMobile ? 18 : (step === 0 ? 15.5 : 13.5);
    const targetX = Math.sin(this.orbit) * 1.4;
    const targetZ = radius;
    const tx = targetX, ty = height, tz = targetZ;
    const k = 1 - Math.exp(-dt * 1.6);
    this.camera.position.x += (tx - this.camera.position.x) * k;
    this.camera.position.y += (ty - this.camera.position.y) * k;
    this.camera.position.z += (tz - this.camera.position.z) * k;
    this.camera.lookAt(0, this.isMobile ? 2.8 : 2.2, 0);
  }

  animate() {
    requestAnimationFrame(this.animate);
    const dt = Math.min(this.clock.getDelta(), 0.05);
    if (!this.active) return;
    this.updateFlows(dt);
    this.updateCamera(dt);
    this.updateLabels();
    if (this.core) {
      this.core.rotation.y += dt * 0.6;
      this.core.rotation.x += dt * 0.25;
      const s = 0.9 + Math.sin(performance.now() * 0.002) * 0.08;
      this.core.scale.setScalar(s);
      this.coreGlow.scale.setScalar(s * 1.15);
    }
    if (this.renHub) this.renHub.rotation.z += dt * 0.5;
    this.renderer.render(this.scene, this.camera);
  }
}
