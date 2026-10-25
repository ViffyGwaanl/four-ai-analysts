/* Three.js r128 · 明亮的低多边形“时间铁路”
   所有几何、材质、纹理都在本地生成，不依赖外部图片或字体。 */
(function () {
  "use strict";
  const THREE = window.THREE;
  const isMobile = window.matchMedia("(max-width: 860px)").matches ||
    /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  const rand = mulberry32(20261022);
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = t => t * t * (3 - 2 * t);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function radialTexture(inner, outer, stops) {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const ctx = c.getContext("2d");
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    (stops || [[0, inner], [0.5, inner], [1, outer]]).forEach(s => g.addColorStop(s[0], s[1]));
    ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c);
    t.encoding = THREE.sRGBEncoding;
    return t;
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function cloudTexture() {
    const c = document.createElement("canvas");
    c.width = c.height = 512;
    const ctx = c.getContext("2d");
    ctx.clearRect(0, 0, 512, 512);
    for (let i = 0; i < 90; i++) {
      const x = Math.random() * 512, y = Math.random() * 512;
      const r = 26 + Math.random() * 80;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, "rgba(255,255,255,.95)");
      g.addColorStop(0.55, "rgba(255,250,240,.75)");
      g.addColorStop(1, "rgba(255,250,240,0)");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(5, 5);
    t.encoding = THREE.sRGBEncoding;
    return t;
  }

  function signTexture(year, name) {
    const c = document.createElement("canvas");
    c.width = 512; c.height = 256;
    const ctx = c.getContext("2d");
    ctx.clearRect(0, 0, 512, 256);
    ctx.fillStyle = "rgba(255,249,238,.97)";
    roundRect(ctx, 10, 10, 492, 236, 34); ctx.fill();
    ctx.lineWidth = 6; ctx.strokeStyle = "rgba(14,124,123,.85)";
    roundRect(ctx, 10, 10, 492, 236, 34); ctx.stroke();
    ctx.fillStyle = "#14283C";
    ctx.font = "900 116px Georgia, 'Songti SC', serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(year, 256, 112);
    ctx.fillStyle = "#0E7C7B";
    ctx.font = "700 34px 'PingFang SC','Microsoft YaHei',sans-serif";
    ctx.fillText(name, 256, 198);
    const t = new THREE.CanvasTexture(c);
    t.encoding = THREE.sRGBEncoding;
    t.anisotropy = 4;
    return t;
  }

  function glowSprite(color, scale, opacity) {
    const mat = new THREE.SpriteMaterial({
      map: radialTexture(color, "rgba(255,255,255,0)"),
      color: new THREE.Color(color), transparent: true, opacity: opacity == null ? 0.8 : opacity,
      depthWrite: false, blending: THREE.AdditiveBlending
    });
    const s = new THREE.Sprite(mat);
    s.scale.set(scale, scale, 1);
    return s;
  }

  class BerkshireScene {
    constructor(canvas) {
      this.canvas = canvas;
      this.scene = null;
      this.camera = null;
      this.renderer = null;
      this.composer = null;
      this.bloom = null;
      this.clock = null;
      this.time = 0;
      this.mode = "intro";
      this.current = 0;
      this.u = 0;
      this.travel = null;
      this.stations = [];
      this.clouds = [];
      this.decor = [];
      this.smoke = [];
      this.smokeTimer = 0;
      this.moving = false;
      this.onArrive = null;
      this.look = new THREE.Vector3(0, 4, 0);
      this.trainBaseY = 0;
      this.ready = false;
    }

    init() {
      const w = window.innerWidth, h = window.innerHeight;
      this.scene = new THREE.Scene();
      this.scene.fog = new THREE.Fog(0xFFE3B8, 95, 280);
      this.camera = new THREE.PerspectiveCamera(isMobile ? 58 : 48, w / h, 0.1, 650);
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas, antialias: !isMobile, alpha: false,
        powerPreference: "high-performance"
      });
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2));
      this.renderer.setSize(w, h, false);
      this.renderer.outputEncoding = THREE.sRGBEncoding;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 0.94;
      this.renderer.shadowMap.enabled = !isMobile;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.renderer.setClearColor(0x9BDFFF, 1);

      this.buildSky();
      this.buildLights();
      this.buildWorld();
      this.buildTrain();
      this.buildParticles();
      this.fixColors();
      if (!isMobile && !reducedMotion) this.buildComposer();

      this.setStationInstant(0);
      this.mode = "intro";
      this.clock = new THREE.Clock();
      this.ready = true;
      this.animate();
      window.addEventListener("resize", () => this.resize(), { passive: true });
      return true;
    }

    buildSky() {
      const geo = new THREE.SphereGeometry(320, 32, 18);
      const mat = new THREE.ShaderMaterial({
        side: THREE.BackSide, depthWrite: false,
        uniforms: {
          top: { value: new THREE.Color(0x54C6FF) },
          mid: { value: new THREE.Color(0xAFE8FF) },
          low: { value: new THREE.Color(0xFFD59A) },
          bottom: { value: new THREE.Color(0xFFF1D9) }
        },
        vertexShader: `varying vec3 vWorld; void main(){ vWorld=(modelMatrix*vec4(position,1.0)).xyz; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
        fragmentShader: `
          varying vec3 vWorld; uniform vec3 top; uniform vec3 mid; uniform vec3 low; uniform vec3 bottom;
          void main(){
            float h = normalize(vWorld).y;
            vec3 c = mix(bottom, low, smoothstep(-0.10, 0.02, h));
            c = mix(c, mid, smoothstep(0.02, 0.16, h));
            c = mix(c, top, smoothstep(0.16, 0.55, h));
            gl_FragColor = vec4(c, 1.0);
          }`
      });
      this.skyMat = mat;
      this.scene.add(new THREE.Mesh(geo, mat));

      const sun = glowSprite("#FFF6D8", 28, 0.75);
      sun.position.set(120, 76, -160);
      this.scene.add(sun);
      const core = glowSprite("#FFFFFF", 9, 0.85);
      core.position.copy(sun.position);
      this.scene.add(core);

      // distant cloud bank
      for (let i = 0; i < (isMobile ? 6 : 11); i++) {
        const cloud = this.makeCloud();
        const a = rand() * Math.PI * 2;
        const r = 80 + rand() * 110;
        cloud.position.set(Math.cos(a) * r, 24 + rand() * 26, Math.sin(a) * r - 20);
        cloud.scale.setScalar(0.8 + rand() * 1.2);
        this.clouds.push(cloud);
        this.scene.add(cloud);
      }
    }

    makeCloud() {
      const g = new THREE.Group();
      const mat = new THREE.MeshStandardMaterial({
        color: 0xFFFFFF, roughness: 1, metalness: 0,
        flatShading: true, transparent: true, opacity: 0.94
      });
      const n = 5 + Math.floor(rand() * 3);
      for (let i = 0; i < n; i++) {
        const s = new THREE.Mesh(new THREE.SphereGeometry(1, 7, 5), mat);
        s.scale.set(2.4 + rand() * 3.2, 1.1 + rand() * 1.2, 1.8 + rand() * 2.2);
        s.position.set((rand() - 0.5) * 7, (rand() - 0.5) * 1.4, (rand() - 0.5) * 4);
        g.add(s);
      }
      return g;
    }

    buildLights() {
      const hemi = new THREE.HemisphereLight(0xBFE8FF, 0xFFD9A8, 0.58);
      this.scene.add(hemi);
      const amb = new THREE.AmbientLight(0xFFFFFF, 0.20);
      this.scene.add(amb);
      const sun = new THREE.DirectionalLight(0xFFF0D0, 1.38);
      sun.position.set(62, 86, 42);
      sun.castShadow = !isMobile;
      if (!isMobile) {
        sun.shadow.mapSize.set(2048, 2048);
        sun.shadow.camera.left = -90; sun.shadow.camera.right = 90;
        sun.shadow.camera.top = 90; sun.shadow.camera.bottom = -90;
        sun.shadow.camera.near = 1; sun.shadow.camera.far = 220;
        sun.shadow.bias = -0.0006;
      }
      this.scene.add(sun);
      const fill = new THREE.DirectionalLight(0xBFE8FF, 0.35);
      fill.position.set(-60, 30, -50);
      this.scene.add(fill);
    }

    buildWorld() {
      const pts = [
        new THREE.Vector3(-38, 6.5, -62),
        new THREE.Vector3(-25, 7.5, -41),
        new THREE.Vector3(-7, 5.8, -23),
        new THREE.Vector3(11, 8.2, -7),
        new THREE.Vector3(28, 6.6, 11),
        new THREE.Vector3(34, 9.0, 31),
        new THREE.Vector3(20, 7.2, 49),
        new THREE.Vector3(0, 10.2, 58),
        new THREE.Vector3(-20, 8.0, 47),
        new THREE.Vector3(-35, 6.4, 27)
      ];
      this.curve = new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.42);
      this.buildTrack();
      this.buildStations();
      this.buildDecor();
      this.buildCloudSea();
      this.buildBirds();
    }

    buildTrack() {
      const N = 340;
      const roadMat = new THREE.MeshStandardMaterial({ color: 0xFFD08A, roughness: 0.9, metalness: 0.02, flatShading: true });
      const railMat = new THREE.MeshStandardMaterial({ color: 0xD99A2B, roughness: 0.35, metalness: 0.65 });
      const road = new THREE.Mesh(new THREE.TubeGeometry(this.curve, N, 0.24, 8, false), roadMat);
      road.receiveShadow = !isMobile;
      this.scene.add(road);

      const left = [], right = [];
      for (let i = 0; i <= N; i++) {
        const u = i / N;
        const p = this.curve.getPointAt(u);
        const t = this.curve.getTangentAt(u).normalize();
        const side = new THREE.Vector3().crossVectors(t, new THREE.Vector3(0, 1, 0)).normalize();
        left.push(p.clone().addScaledVector(side, 0.30).add(new THREE.Vector3(0, 0.10, 0)));
        right.push(p.clone().addScaledVector(side, -0.30).add(new THREE.Vector3(0, 0.10, 0)));
      }
      [left, right].forEach(points => {
        const rc = new THREE.CatmullRomCurve3(points);
        const rail = new THREE.Mesh(new THREE.TubeGeometry(rc, N, 0.045, 5, false), railMat);
        rail.receiveShadow = false;
        this.scene.add(rail);
      });

      const sleeperMat = new THREE.MeshStandardMaterial({ color: 0xD8A97E, roughness: 1, flatShading: true });
      const count = Math.floor(N / 3);
      this.sleepers = new THREE.InstancedMesh(new THREE.BoxGeometry(0.95, 0.075, 0.18), sleeperMat, count);
      const dummy = new THREE.Object3D();
      for (let i = 0; i < count; i++) {
        const u = (i * 3) / N;
        const p = this.curve.getPointAt(u);
        const t = this.curve.getTangentAt(u).normalize();
        dummy.position.copy(p).add(new THREE.Vector3(0, 0.02, 0));
        dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), t);
        dummy.updateMatrix();
        this.sleepers.setMatrixAt(i, dummy.matrix);
      }
      this.sleepers.instanceMatrix.needsUpdate = true;
      this.sleepers.receiveShadow = !isMobile;
      this.scene.add(this.sleepers);

      // 细支柱：让悬空的铁路有“桥”的感觉
      const pillarMat = new THREE.MeshStandardMaterial({ color: 0xFFF0D8, roughness: 0.85, flatShading: true });
      for (let i = 10; i < N; i += 26) {
        const p = this.curve.getPointAt(i / N);
        const h = 4 + (i % 3);
        const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.16, h, 5), pillarMat);
        pillar.position.set(p.x, p.y - h / 2 - 0.2, p.z);
        pillar.castShadow = !isMobile;
        this.scene.add(pillar);
      }
    }

    makeIsland(radius, height) {
      const g = new THREE.Group();
      const grassMat = new THREE.MeshStandardMaterial({ color: 0x3F9E62, roughness: 0.95, flatShading: true });
      const grass2Mat = new THREE.MeshStandardMaterial({ color: 0x2F8B57, roughness: 0.95, flatShading: true });
      const rockMat = new THREE.MeshStandardMaterial({ color: 0xC08E5E, roughness: 1, flatShading: true });
      const sandMat = new THREE.MeshStandardMaterial({ color: 0xFFC172, roughness: 1, flatShading: true });

      const top = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 0.94, 0.55, 14), grassMat);
      top.position.y = 0; top.castShadow = !isMobile; top.receiveShadow = !isMobile; g.add(top);
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(radius * 1.02, radius * 0.98, 0.22, 14), sandMat);
      ring.position.y = -0.3; ring.castShadow = !isMobile; g.add(ring);
      const rock = new THREE.Mesh(new THREE.ConeGeometry(radius * 0.92, height, 8), rockMat);
      rock.rotation.x = Math.PI; rock.position.y = -height / 2 - 0.35;
      rock.castShadow = !isMobile; g.add(rock);

      const trees = isMobile ? 2 : 4;
      for (let i = 0; i < trees; i++) {
        const a = rand() * Math.PI * 2, r = radius * (0.35 + rand() * 0.45);
        const x = Math.cos(a) * r, z = Math.sin(a) * r;
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, 1.0, 5),
          new THREE.MeshStandardMaterial({ color: 0xA9744F, roughness: 1, flatShading: true }));
        trunk.position.set(x, 0.8, z); g.add(trunk);
        const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.62, 1.7, 7),
          new THREE.MeshStandardMaterial({ color: i % 2 ? 0x2A9D8F : 0x3E9B72, roughness: 0.9, flatShading: true }));
        leaf.position.set(x, 1.9, z); leaf.castShadow = !isMobile; g.add(leaf);
      }
      for (let i = 0; i < (isMobile ? 1 : 3); i++) {
        const a = rand() * Math.PI * 2, r = radius * (0.25 + rand() * 0.55);
        const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.22 + rand() * 0.25, 0),
          new THREE.MeshStandardMaterial({ color: 0xD9C6A9, roughness: 1, flatShading: true }));
        stone.position.set(Math.cos(a) * r, 0.5, Math.sin(a) * r);
        g.add(stone);
      }
      return g;
    }

    buildStations() {
      const names = ["保险转身", "喜诗糖果", "GEICO", "纺织退出", "可口可乐", "General Re", "危机注资", "BNSF", "IBM", "日本商社"];
      const years = ["1967", "1972", "1976", "1985", "1988", "1998", "2008", "2009", "2011", "2020"];
      const up = new THREE.Vector3(0, 1, 0);
      for (let i = 0; i < 10; i++) {
        const u = i / 9;
        const p = this.curve.getPointAt(u);
        const t = this.curve.getTangentAt(u).normalize();
        const side = new THREE.Vector3().crossVectors(t, up).normalize();
        const group = new THREE.Group();
        group.position.copy(p);

        const island = this.makeIsland(5.4, 3.6);
        island.position.y = -0.58;
        group.add(island);

        const platform = new THREE.Mesh(
          new THREE.CylinderGeometry(4.1, 4.25, 0.28, 24),
          new THREE.MeshStandardMaterial({ color: 0xFFF4DF, roughness: 0.85, flatShading: true })
        );
        platform.position.y = -0.28; platform.receiveShadow = !isMobile; platform.castShadow = !isMobile;
        group.add(platform);

        const ringMat = new THREE.MeshStandardMaterial({
          color: 0x2A9D8F, emissive: 0x2A9D8F, emissiveIntensity: 0.5,
          roughness: 0.3, metalness: 0.25
        });
        const ring = new THREE.Mesh(new THREE.TorusGeometry(3.55, 0.075, 8, 64), ringMat);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = 0.12;
        group.add(ring);
        const ring2 = new THREE.Mesh(new THREE.TorusGeometry(2.35, 0.035, 6, 48), ringMat.clone());
        ring2.rotation.x = Math.PI / 2; ring2.position.y = 0.16; group.add(ring2);

        const pylonMat = new THREE.MeshStandardMaterial({ color: 0xFFF0D6, roughness: 0.65, metalness: 0.15 });
        const glowMat = new THREE.MeshStandardMaterial({ color: 0xF2B544, emissive: 0xF2B544, emissiveIntensity: 1.6, roughness: 0.3 });
        [-1, 1].forEach(sign => {
          const pylon = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 3.6, 6), pylonMat);
          pylon.position.copy(side.clone().multiplyScalar(3.65 * sign)).add(new THREE.Vector3(0, 1.7, 0));
          pylon.castShadow = !isMobile;
          group.add(pylon);
          const orb = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), glowMat);
          orb.position.copy(pylon.position).add(new THREE.Vector3(0, 1.9, 0));
          group.add(orb);
        });

        const crystalMat = new THREE.MeshStandardMaterial({
          color: 0x2A9D8F, emissive: 0x2A9D8F, emissiveIntensity: 1.6,
          roughness: 0.18, metalness: 0.35, flatShading: true
        });
        const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.46, 0), crystalMat);
        crystal.position.copy(side.clone().multiplyScalar(-3.3)).add(new THREE.Vector3(0, 4.0, 0));
        group.add(crystal);

        const sign = new THREE.Sprite(new THREE.SpriteMaterial({
          map: signTexture(years[i], names[i]), transparent: true, depthWrite: false, opacity: 0.7
        }));
        sign.scale.set(4.6, 2.3, 1);
        sign.position.set(0, 5.9, 0);
        group.add(sign);

        const glow = glowSprite("#F2B544", 1.9, 0.08); glow.visible=false;
        glow.position.set(0, 3.15, 0);
        group.add(glow);

        if (i % 3 === 0) this.buildStationHouse(group, side, t, i);
        this.buildPlatformProps(group, side, t, i);

        this.scene.add(group);
        this.stations.push({
          index: i, u, pos: p.clone(), tangent: t.clone(), side: side.clone(),
          group, island, ring, ring2, crystal, sign, glow,
          phase: rand() * Math.PI * 2, baseY: p.y
        });
      }
      this.setActiveStation(0);
      if (!isMobile) {
        this.stations.forEach(s => this.addOutlines(s.group, 0x1F3A4D, 0.12));
      }
    }

    addOutlines(root, color, opacity) {
      const mat = new THREE.LineBasicMaterial({ color: color, transparent: true, opacity: opacity, depthWrite: false });
      root.traverse(o => {
        if (!o.isMesh || !o.geometry || o.isInstancedMesh) return;
        const type = o.geometry.type;
        if (!["BoxGeometry", "CylinderGeometry", "ConeGeometry", "SphereGeometry"].includes(type)) return;
        const edges = new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry, 45), mat);
        edges.scale.setScalar(1.004);
        o.add(edges);
      });
    }

    buildPlatformProps(group, side, tangent, i) {
      const n = isMobile ? 2 : 5;
      const colors = [0xE4573D, 0xE8A62E, 0x0E7C7B, 0xFFFFFF];
      for (let k = 0; k < n; k++) {
        const a = rand() * Math.PI * 2;
        const r = 2.4 + rand() * 1.4;
        const pos = side.clone().multiplyScalar(Math.cos(a) * r).addScaledVector(tangent, Math.sin(a) * r);
        if (k < 2) {
          const box = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.36, 0.4),
            new THREE.MeshStandardMaterial({ color: colors[k % colors.length], roughness: 0.7, flatShading: true }));
          box.position.copy(pos).add(new THREE.Vector3(0, 0.45, 0));
          box.rotation.y = rand() * Math.PI;
          group.add(box);
        } else {
          const flower = new THREE.Mesh(new THREE.DodecahedronGeometry(0.12 + rand() * 0.08, 0),
            new THREE.MeshStandardMaterial({ color: colors[k % colors.length], roughness: 0.6, flatShading: true }));
          flower.position.copy(pos).add(new THREE.Vector3(0, 0.45, 0));
          group.add(flower);
        }
      }
    }

    buildDecor() {
      const up = new THREE.Vector3(0, 1, 0);
      for (let i = 0; i < (isMobile ? 6 : 12); i++) {
        let pos, tries = 0;
        do {
          pos = new THREE.Vector3(-90 + rand() * 180, 2 + rand() * 9, -105 + rand() * 200);
          tries++;
        } while (tries < 30 && this.stations.some(s => s.pos.distanceTo(pos) < 13));
        const r = 1.4 + rand() * 2.8;
        const island = this.makeIsland(r, 2.5 + rand() * 2.5);
        island.position.copy(pos);
        this.scene.add(island);
        this.decor.push({ obj: island, baseY: pos.y, phase: rand() * Math.PI * 2 });
      }
      const rockMat = new THREE.MeshStandardMaterial({ color: 0xE8C9A0, roughness: 1, flatShading: true });
      for (let i = 0; i < (isMobile ? 8 : 18); i++) {
        const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.3 + rand() * 0.8, 0), rockMat);
        const a = rand() * Math.PI * 2, r = 45 + rand() * 70;
        rock.position.set(Math.cos(a) * r, 4 + rand() * 16, Math.sin(a) * r);
        rock.rotation.set(rand() * 3, rand() * 3, rand() * 3);
        this.scene.add(rock);
        this.decor.push({ obj: rock, baseY: rock.position.y, phase: rand() * Math.PI * 2 });
      }
    }

    buildCloudSea() {
      const planeMat = new THREE.MeshBasicMaterial({
        map: cloudTexture(), color: 0xFFFFFF, transparent: true, opacity: 0.96,
        depthWrite: false, side: THREE.DoubleSide
      });
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(520, 520), planeMat);
      plane.rotation.x = -Math.PI / 2;
      plane.position.y = -21;
      this.scene.add(plane);
      const puffMat = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 1, metalness: 0, flatShading: true, transparent: true, opacity: 0.92 });
      const n = isMobile ? 12 : 34;
      for (let i = 0; i < n; i++) {
        const g = new THREE.Group();
        const k = 3 + Math.floor(rand() * 3);
        for (let j = 0; j < k; j++) {
          const s = new THREE.Mesh(new THREE.SphereGeometry(1, 7, 5), puffMat);
          s.scale.set(3 + rand() * 6, 0.8 + rand() * 1.2, 2 + rand() * 5);
          s.position.set((rand() - 0.5) * 9, (rand() - 0.5) * 0.8, (rand() - 0.5) * 6);
          g.add(s);
        }
        g.position.set(-150 + rand() * 300, -17 + rand() * 7, -130 + rand() * 300);
        this.scene.add(g);
      }
      this.cloudSea = plane;
    }

    buildStationHouse(group, side, tangent, i) {
      const house = new THREE.Group();
      const bodyMat = new THREE.MeshStandardMaterial({ color: 0xFFF2DA, roughness: 0.8, flatShading: true });
      const roofMat = new THREE.MeshStandardMaterial({ color: 0x0E7C7B, roughness: 0.6, flatShading: true });
      const doorMat = new THREE.MeshStandardMaterial({ color: 0xE4573D, roughness: 0.7, flatShading: true });
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.1, 1.25), bodyMat);
      body.position.y = 0.55; body.castShadow = !isMobile; house.add(body);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(1.25, 0.75, 4), roofMat);
      roof.rotation.y = Math.PI / 4; roof.position.y = 1.45; roof.castShadow = !isMobile; house.add(roof);
      const door = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.62, 0.06), doorMat);
      door.position.set(0, 0.31, 0.64); house.add(door);
      const win = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.26, 0.05), new THREE.MeshStandardMaterial({ color: 0xFFE7A0, emissive: 0xFFD070, emissiveIntensity: 0.9 }));
      win.position.set(0.52, 0.72, 0.64); house.add(win);
      house.position.copy(side.clone().multiplyScalar(2.7)).addScaledVector(tangent, -1.6).add(new THREE.Vector3(0, 0.55, 0));
      house.rotation.y = Math.atan2(side.x, side.z);
      group.add(house);
    }

    buildBirds() {
      this.birds = [];
      const mat = new THREE.LineBasicMaterial({ color: 0x365166, transparent: true, opacity: 0.55 });
      const n = isMobile ? 3 : 7;
      for (let i = 0; i < n; i++) {
        const geo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(-0.9, 0, 0), new THREE.Vector3(0, 0.45, 0), new THREE.Vector3(0.9, 0, 0)
        ]);
        const bird = new THREE.Line(geo, mat);
        bird.position.set(-70 + rand() * 140, 30 + rand() * 22, -90 + rand() * 120);
        bird.scale.setScalar(0.8 + rand() * 0.6);
        bird.userData = { speed: 0.6 + rand() * 0.7, phase: rand() * Math.PI * 2 };
        this.birds.push(bird);
        this.scene.add(bird);
      }
    }

    buildTrain() {
      this.train = new THREE.Group();
      this.wheels = [];
      const bodyCoral = new THREE.MeshStandardMaterial({ color: 0xE4573D, roughness: 0.55, metalness: 0.05, flatShading: true });
      const bodyCream = new THREE.MeshStandardMaterial({ color: 0xFFF1D8, roughness: 0.65, metalness: 0.02, flatShading: true });
      const bodyTeal = new THREE.MeshStandardMaterial({ color: 0x0B6B6A, roughness: 0.5, metalness: 0.08, flatShading: true });
      const bodyGold = new THREE.MeshStandardMaterial({ color: 0xE8A62E, roughness: 0.5, metalness: 0.1, flatShading: true });
      const dark = new THREE.MeshStandardMaterial({ color: 0x22384A, roughness: 0.7, metalness: 0.2, flatShading: true });
      const windowMat = new THREE.MeshStandardMaterial({ color: 0x9FE8E4, emissive: 0x2A9D8F, emissiveIntensity: 1.5, roughness: 0.2, metalness: 0.3 });

      const loco = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(2.15, 1.05, 2.7), bodyCoral);
      body.position.set(0, 1.15, 0.15); body.castShadow = !isMobile; loco.add(body);
      const cab = new THREE.Mesh(new THREE.BoxGeometry(1.95, 1.45, 1.2), bodyCream);
      cab.position.set(0, 1.35, -1.25); cab.castShadow = !isMobile; loco.add(cab);
      const roof = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.16, 1.35), bodyTeal);
      roof.position.set(0, 2.1, -1.25); loco.add(roof);
      const nose = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.9, 1.15, 12), bodyCoral);
      nose.rotation.x = Math.PI / 2; nose.position.set(0, 1.12, 1.75); nose.castShadow = !isMobile; loco.add(nose);
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.17, 0.14, 2.72), bodyGold);
      stripe.position.set(0, 0.96, 0.15); loco.add(stripe);
      const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 0.75, 8), bodyTeal);
      stack.position.set(0, 2.0, 0.75); loco.add(stack);
      const stackTop = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.24, 0.18, 8), bodyGold);
      stackTop.position.set(0, 2.42, 0.75); loco.add(stackTop);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8),
        new THREE.MeshStandardMaterial({ color: 0xFFF6D8, emissive: 0xFFE7A0, emissiveIntensity: 2.2 }));
      lamp.position.set(0, 1.3, 2.35); loco.add(lamp);
      const light = new THREE.PointLight(0xFFE7A0, 0.8, 14);
      light.position.set(0, 1.4, 2.6); loco.add(light);
      // 车窗
      [-0.66, 0.0, 0.66].forEach((z, i) => {
        const win = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.36, 0.44), windowMat);
        win.position.set(1.09, 1.45, z - 0.1); loco.add(win);
        const win2 = win.clone(); win2.position.x = -1.09; loco.add(win2);
      });
      this.addWheels(loco, 1.08, 0.42, [1.0, -1.0], dark);
      this.train.add(loco);

      const carColors = [bodyTeal, bodyGold, bodyCream];
      for (let i = 0; i < 3; i++) {
        const car = new THREE.Group();
        const b = new THREE.Mesh(new THREE.BoxGeometry(2.05, 1.0, 2.7), carColors[i]);
        b.position.set(0, 1.15, 0); b.castShadow = !isMobile; car.add(b);
        const r = new THREE.Mesh(new THREE.BoxGeometry(2.12, 0.14, 2.78), bodyCream);
        r.position.set(0, 1.7, 0); car.add(r);
        const under = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.26, 2.5), dark);
        under.position.set(0, 0.55, 0); car.add(under);
        // 集装箱
        const box = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.72, 1.85),
          i === 1 ? bodyCoral : bodyCream);
        box.position.set(0, 1.95, 0); box.castShadow = !isMobile; car.add(box);
        [-0.62, 0.62].forEach(x => {
          const win = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.3, 0.36), windowMat);
          win.position.set(x, 1.3, 1.36); car.add(win);
        });
        this.addWheels(car, 1.02, 0.38, [0.95, -0.95], dark);
        car.position.z = -3.55 - i * 3.2;
        this.train.add(car);
      }

      this.train.position.copy(this.curve.getPointAt(0)).add(new THREE.Vector3(0, 0.22, 0));
      this.trainBaseY = this.train.position.y;
      this.scene.add(this.train);

      // 车头前的光晕
      this.trainGlow = glowSprite("#FFE7A0", 2.4, 0.08); this.trainGlow.visible=false;
      this.trainGlow.position.set(0, 1.2, 3.0);
      this.train.add(this.trainGlow);
      if (!isMobile) this.addOutlines(this.train, 0x1F3A4D, 0.18);
    }

    addWheels(parent, x, y, zs, mat) {
      zs.forEach(z => {
        [-x, x].forEach(px => {
          const w = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.16, 10), mat);
          w.rotation.z = Math.PI / 2;
          w.position.set(px, y, z);
          parent.add(w);
          this.wheels.push(w);
        });
      });
    }

    buildParticles() {
      // 空气中的金色尘埃
      const n = isMobile ? 90 : 220;
      const pos = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        pos[i * 3] = (rand() - 0.5) * 220;
        pos[i * 3 + 1] = 4 + rand() * 48;
        pos[i * 3 + 2] = (rand() - 0.5) * 220;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      this.dust = new THREE.Points(geo, new THREE.PointsMaterial({
        color: 0xFFF0C4, size: 0.16, transparent: true, opacity: 0.55,
        depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true
      }));
      this.scene.add(this.dust);

      // 结果页的金色纸屑
      const m = 220;
      const cp = new Float32Array(m * 3);
      const cc = new Float32Array(m * 3);
      this.confettiVel = [];
      for (let i = 0; i < m; i++) {
        cp[i * 3] = 0; cp[i * 3 + 1] = 0; cp[i * 3 + 2] = 0;
        const c = new THREE.Color(i % 3 === 0 ? 0xF2B544 : i % 3 === 1 ? 0x0E7C7B : 0xE76F51);
        cc[i * 3] = c.r; cc[i * 3 + 1] = c.g; cc[i * 3 + 2] = c.b;
        this.confettiVel.push(new THREE.Vector3((rand() - 0.5) * 18, 8 + rand() * 16, (rand() - 0.5) * 18));
      }
      const cg = new THREE.BufferGeometry();
      cg.setAttribute("position", new THREE.BufferAttribute(cp, 3));
      cg.setAttribute("color", new THREE.BufferAttribute(cc, 3));
      this.confetti = new THREE.Points(cg, new THREE.PointsMaterial({
        size: 0.28, vertexColors: true, transparent: true, opacity: 0,
        depthWrite: false, blending: THREE.AdditiveBlending
      }));
      this.scene.add(this.confetti);
      this.confettiLife = 0;

      // 烟
      this.smokeGroup = new THREE.Group();
      this.scene.add(this.smokeGroup);
    }

    fixColors() {
      const seen = new Set();
      this.scene.traverse(o => {
        if (o.isLight && o.color) o.color.convertSRGBToLinear();
        const mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
        mats.forEach(m => {
          if (!m || seen.has(m) || m.type === "ShaderMaterial") return;
          seen.add(m);
          if (m.color) m.color.convertSRGBToLinear();
          if (m.emissive) m.emissive.convertSRGBToLinear();
        });
      });
      if (this.skyMat) {
        ["top", "mid", "low", "bottom"].forEach(k => this.skyMat.uniforms[k].value.convertSRGBToLinear());
      }
      if (this.scene.fog) this.scene.fog.color.convertSRGBToLinear();
    }

    buildComposer() {
      this.composer = new THREE.EffectComposer(this.renderer);
      this.composer.addPass(new THREE.RenderPass(this.scene, this.camera));
      this.bloom = new THREE.UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight), 0.30, 0.45, 0.92
      );
      this.composer.addPass(this.bloom);
    }

    setActiveStation(index) {
      this.stations.forEach((s, i) => {
        const active = i === index;
        const done = i < index;
        const em = active ? 0xF2B544 : done ? 0xF2B544 : 0x2A9D8F;
        const col = active ? 0xF2B544 : done ? 0xF2B544 : 0x2A9D8F;
        [s.ring, s.ring2].forEach(r => {
          r.material.color.setHex(col);
          r.material.emissive.setHex(em);
          r.material.emissiveIntensity = active ? 2.4 : done ? 0.85 : 0.35;
        });
        s.crystal.material.color.setHex(active ? 0xF2B544 : done ? 0xF2B544 : 0x2A9D8F);
        s.crystal.material.emissive.setHex(active ? 0xF2B544 : done ? 0xF2B544 : 0x2A9D8F);
        s.crystal.material.emissiveIntensity = active ? 2.0 : done ? 0.7 : 0.55;
        s.crystal.scale.setScalar(active ? 1.35 : 1);
        s.sign.material.opacity = active ? 1 : done ? 0.82 : 0.62;
        s.glow.material.opacity = active ? 0.14 : done ? 0.05 : 0.02;
      });
    }

    stationCam(index, intro) {
      const s = this.stations[index];
      const sign = (index % 2 === 0) ? 1 : -1;
      const cam = s.pos.clone()
        .addScaledVector(s.side, 21.0 * sign)
        .add(new THREE.Vector3(0, 5.4, 0))
        .addScaledVector(s.tangent, -6.5);
      const frame = intro ? (isMobile ? -3.5 : -13.0) : 3.0;
      const look = s.pos.clone().addScaledVector(s.side, frame).add(new THREE.Vector3(0, 3.6, 0));
      return { cam, look };
    }

    setStationInstant(index) {
      this.current = index;
      this.u = index / 9;
      const p = this.curve.getPointAt(this.u);
      const t = this.curve.getTangentAt(this.u).normalize();
      this.train.position.copy(p).add(new THREE.Vector3(0, 0.22, 0));
      this.train.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), t);
      const c = this.stationCam(index);
      this.camera.position.copy(c.cam);
      this.look.copy(c.look);
      this.camera.lookAt(this.look);
      this.setActiveStation(index);
    }

    moveTo(index, duration, cb) {
      if (index === this.current && !this.travel && this.mode !== "intro") {
        if (cb) cb();
        return;
      }
      const to = this.stationCam(index);
      const dur = Math.max(0.01, duration || (isMobile ? 1.6 : 2.0));
      this.travel = {
        fromU: this.u, toU: index / 9, t: 0,
        dur: dur, start: performance.now(), durMs: dur * 1000,
        fromPos: this.camera.position.clone(), toPos: to.cam,
        fromLook: this.look.clone(), toLook: to.look,
        toIndex: index, cb: cb || null
      };
      this.mode = "travel";
      this.moving = true;
      this.setActiveStation(index);
    }

    setStationCamera(index) {
      const c = this.stationCam(index);
      this.camera.position.copy(c.cam);
      this.look.copy(c.look);
      this.camera.lookAt(this.look);
    }

    overview() {
      this.mode = "overview";
      this.moving = false;
      this.overviewFrom = this.camera.position.clone();
      this.overviewLookFrom = this.look.clone();
      this.overviewT = 0;
      this.overviewDur = reducedMotion ? 0.01 : 2.4;
    }

    startIntro() {
      this.mode = "intro";
    }

    pulse() {
      const s = this.stations[this.current];
      if (!s) return;
      s.pulse = 1;
    }

    celebrate() {
      this.overview();
      this.confettiLife = 1.6;
      const pos = this.confetti.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const s = this.stations[this.current].pos;
        pos.setXYZ(i, s.x + (rand() - 0.5) * 2, s.y + 6, s.z + (rand() - 0.5) * 2);
      }
      pos.needsUpdate = true;
      this.confetti.material.opacity = 1;
      this.confettiVel = [];
      for (let i = 0; i < pos.count; i++) {
        this.confettiVel.push(new THREE.Vector3((rand() - 0.5) * 22, 10 + rand() * 20, (rand() - 0.5) * 22));
      }
    }

    resize() {
      if (!this.renderer) return;
      const w = window.innerWidth, h = window.innerHeight;
      this.camera.aspect = w / h;
      this.camera.fov = isMobile ? 54 : 42;
      this.camera.updateProjectionMatrix();
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2));
      this.renderer.setSize(w, h, false);
      if (this.composer) this.composer.setSize(w, h);
    }

    spawnSmoke() {
      if (isMobile && this.smoke.length > 10) return;
      const mat = new THREE.SpriteMaterial({
        map: radialTexture("#FFF3DD", "rgba(255,243,221,0)"),
        transparent: true, opacity: 0.55, depthWrite: false
      });
      const s = new THREE.Sprite(mat);
      const p = new THREE.Vector3(0, 2.55, 0.75);
      this.train.localToWorld(p);
      s.position.copy(p);
      s.scale.set(0.5, 0.5, 1);
      s.userData = { life: 1.0, max: 1.0, vx: (rand() - 0.5) * 0.35, vy: 0.8 + rand() * 0.5, vz: (rand() - 0.5) * 0.35 };
      this.smokeGroup.add(s);
      this.smoke.push(s);
    }

    updateSmoke(dt) {
      for (let i = this.smoke.length - 1; i >= 0; i--) {
        const s = this.smoke[i], u = s.userData;
        u.life -= dt;
        if (u.life <= 0) {
          this.smokeGroup.remove(s);
          s.material.dispose();
          this.smoke.splice(i, 1);
          continue;
        }
        s.position.x += u.vx * dt;
        s.position.y += u.vy * dt;
        s.position.z += u.vz * dt;
        const k = 1 - u.life / u.max;
        s.scale.setScalar(0.5 + k * 1.9);
        s.material.opacity = 0.5 * (u.life / u.max);
      }
    }

    updateTravel(dt) {
      const tr = this.travel;
      tr.t = (performance.now() - tr.start) / tr.durMs;
      const raw = clamp(tr.t, 0, 1);
      const k = smooth(raw);
      this.u = lerp(tr.fromU, tr.toU, k);
      const p = this.curve.getPointAt(this.u);
      const t = this.curve.getTangentAt(this.u).normalize();
      this.train.position.copy(p).add(new THREE.Vector3(0, 0.22, 0));
      this.train.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), t);
      this.camera.position.lerpVectors(tr.fromPos, tr.toPos, k);
      this.look.lerpVectors(tr.fromLook, tr.toLook, k);
      this.camera.lookAt(this.look);
      if (raw >= 1) {
        this.current = tr.toIndex;
        this.u = tr.toU;
        this.travel = null;
        this.mode = "station";
        this.moving = false;
        this.setActiveStation(this.current);
        if (tr.cb) tr.cb();
      }
    }

    update(dt) {
      this.time += dt;
      const t = this.time;

      if (this.birds) {
        this.birds.forEach(b => {
          b.position.x += dt * b.userData.speed;
          b.position.y += Math.sin(t * 1.5 + b.userData.phase) * dt * 0.15;
          if (b.position.x > 100) b.position.x = -100;
        });
      }
      this.clouds.forEach((c, i) => {
        c.position.x += dt * (0.18 + i * 0.012);
        if (c.position.x > 150) c.position.x = -150;
      });
      this.decor.forEach(d => {
        d.obj.position.y = d.baseY + Math.sin(t * 0.45 + d.phase) * 0.18;
        d.obj.rotation.y += dt * 0.02;
      });
      this.stations.forEach((s, i) => {
        const dist = this.camera.position.distanceTo(s.pos);
        const fade = clamp(1 - (dist - 62) / 55, 0.12, 1);
        s.sign.material.opacity = (i === this.current ? 1 : i < this.current ? 0.82 : 0.62) * fade;
        s.crystal.rotation.y += dt * (i === this.current ? 1.4 : 0.55);
        s.crystal.rotation.x = Math.sin(t * 0.5 + s.phase) * 0.15;
        s.crystal.position.y = 4.0 + Math.sin(t * 1.2 + s.phase) * 0.12;
        if (i === this.current) {
          const pulse = 1 + Math.sin(t * 3.2) * 0.045;
          s.ring.scale.setScalar(pulse);
          s.ring2.scale.setScalar(1 + Math.sin(t * 3.2 + 1) * 0.05);
          s.glow.material.opacity = 0.10 + Math.sin(t * 2.2) * 0.04;
        } else {
          s.ring.scale.setScalar(1);
          s.ring2.scale.setScalar(1);
        }
        if (s.pulse) {
          s.pulse = Math.max(0, s.pulse - dt * 1.8);
          s.ring.material.emissiveIntensity = 0.8 + s.pulse * 1.8;
        }
      });

      if (this.mode === "travel") {
        this.updateTravel(dt);
        this.moving = true;
      } else if (this.mode === "intro") {
        const c = this.stationCam(0, true);
        const a = t * 0.10;
        this.camera.position.set(c.cam.x + Math.cos(a) * 2.6, c.cam.y + Math.sin(a * 0.7) * 1.0, c.cam.z + Math.sin(a) * 2.6);
        this.look.copy(c.look).add(new THREE.Vector3(0, 0.6, 0));
        this.camera.lookAt(this.look);
      } else if (this.mode === "overview") {
        this.overviewT = Math.min(1, this.overviewT + dt / this.overviewDur);
        const k = smooth(this.overviewT);
        const target = new THREE.Vector3(0, 72, 138);
        const look = new THREE.Vector3(0, 2, 10);
        this.camera.position.lerpVectors(this.overviewFrom, target, k);
        this.look.lerpVectors(this.overviewLookFrom, look, k);
        this.camera.lookAt(this.look);
      } else {
        const s = this.stations[this.current];
        const target = s.pos.clone().addScaledVector(s.side, (this.current % 2 === 0 ? 21.0 : -21.0)).add(new THREE.Vector3(0, 5.4, 0)).addScaledVector(s.tangent, -6.5);
        this.camera.position.lerp(target, 1 - Math.pow(0.001, dt));
        const look = s.pos.clone().addScaledVector(s.side, 3.0).add(new THREE.Vector3(0, 3.6, 0));
        this.look.lerp(look, 1 - Math.pow(0.001, dt));
        this.camera.lookAt(this.look);
        this.train.position.y = s.baseY + 0.22 + Math.sin(t * 1.8) * 0.025;
        this.train.rotation.z = Math.sin(t * 1.1) * 0.005;
      }

      // wheels
      if (this.wheels.length) {
        const speed = this.mode === "travel" ? 8 : 0.7;
        this.wheels.forEach(w => { w.rotation.x += dt * speed; });
      }

      // smoke
      this.smokeTimer -= dt;
      if (this.moving && this.smokeTimer <= 0) {
        this.smokeTimer = isMobile ? 0.28 : 0.18;
        this.spawnSmoke();
      }
      this.updateSmoke(dt);

      // dust drift
      if (this.dust) {
        const p = this.dust.geometry.attributes.position;
        for (let i = 0; i < p.count; i++) {
          let y = p.getY(i) + dt * 0.08;
          if (y > 54) y = 3;
          p.setY(i, y);
        }
        p.needsUpdate = true;
      }

      // confetti
      if (this.confetti && this.confettiLife > 0) {
        this.confettiLife -= dt;
        const p = this.confetti.geometry.attributes.position;
        for (let i = 0; i < p.count; i++) {
          const v = this.confettiVel[i];
          p.setXYZ(i, p.getX(i) + v.x * dt, p.getY(i) + v.y * dt, p.getZ(i) + v.z * dt);
          v.y -= 7.5 * dt;
        }
        p.needsUpdate = true;
        this.confetti.material.opacity = Math.max(0, this.confettiLife / 1.6);
      }
    }

    render() {
      if (this.composer) this.composer.render();
      else this.renderer.render(this.scene, this.camera);
    }

    animate() {
      if (!this.ready) return;
      requestAnimationFrame(() => this.animate());
      if (document.hidden) return;
      const dt = Math.min(this.clock.getDelta(), 0.05);
      this.update(dt);
      this.render();
    }
  }

  window.BerkshireScene = BerkshireScene;
})();
