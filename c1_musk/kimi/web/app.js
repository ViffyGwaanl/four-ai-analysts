(() => {
  'use strict';
  const data = window.MERGER_DATA;
  const $ = id => document.getElementById(id);
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const ease = v => v * v * (3 - 2 * v);
  const bn = v => `${v < 0 ? '−' : ''}US$${Math.abs(v / 1000).toFixed(1)}bn`;
  const pct = v => `${(v * 100).toFixed(1)}%`;
  const ratio = v => `${v.toFixed(2)}x`;
  const set = (id, value) => { const el = $(id); if (el) el.textContent = value; };

  function populate() {
    set('hero-revenue', bn(data.combined.revenue));
    set('hero-fcf', bn(data.combined.fcf));
    data.segments.forEach(d => {
      set(`desc-${d.name}`, d.desc);
      set(`revenue-${d.name}`, bn(d.revenue));
      set(`mix-${d.name}`, pct(d.revenue_mix));
      set(`gross-${d.name}`, bn(d.gross));
      set(`op-${d.name}`, d.op === null ? '未披露' : bn(d.op));
      set(`source-${d.name}`, `${d.source}  ·  LTM毛利=收入−成本`);
      const panel = $(`stage-${d.name}`);
      if (panel) panel.style.setProperty('--stage-color', d.color);
      const copy = panel && panel.querySelector('.stage-copy');
      if (copy) copy.style.borderTopColor = d.color;
    });
    set('final-revenue', bn(data.combined.revenue));
    set('final-gross', `${bn(data.combined.gross)} / ${pct(data.combined.gross_margin)}`);
    set('final-op', bn(data.combined.op));
    set('final-fcf', bn(data.combined.fcf));
    set('final-cash', bn(data.combined.cash));
    set('final-debt', `${bn(data.combined.debt)} / ${bn(data.combined.net_cash)}`);
    const grid = $('scenario-grid');
    if (grid) {
      grid.innerHTML = '';
      data.methods.forEach(m => {
        const card = document.createElement('article');
        card.className = 'scenario-card';
        card.innerHTML = `<h3>${m.short}${m.key === 'revenue' || m.key === 'ebitda' ? ' / 假设' : ''}</h3><div class="scenario-ratio">${ratio(m.ratio)}</div><p>SpaceX 原股东 <b>${pct(m.s_legacy)}</b></p><p>Tesla 原股东 <b>${pct(m.t_legacy)}</b></p><p>Musk 合并后 <b>${pct(m.musk_post)}</b></p>`;
        grid.appendChild(card);
      });
    }
  }
  populate();

  const panels = [...document.querySelectorAll('.panel')];
  const rail = [...document.querySelectorAll('.rail-dot')];
  let activeIndex = 0;
  let scrollY = window.scrollY || 0;
  let scrollDirty = true;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobile = () => window.matchMedia('(max-width: 700px)').matches;

  function updateActive() {
    const marker = window.innerHeight * .43;
    let next = 0;
    panels.forEach((p, i) => { if (p.getBoundingClientRect().top <= marker) next = i; });
    if (next !== activeIndex) {
      activeIndex = next;
      panels.forEach((p, i) => p.classList.toggle('is-active', i === activeIndex));
      rail.forEach((b, i) => b.classList.toggle('is-active', i === activeIndex));
      const status = $('scene-status');
      if (status) {
        if (activeIndex === 0) status.textContent = 'ASSEMBLED / 总装';
        else if (activeIndex === panels.length - 1) status.textContent = 'EXPLODED VIEW / 整体';
        else {
          const d = data.segments[activeIndex - 1];
          status.textContent = `SEPARATING / ${d ? d.en : ''}`;
        }
      }
    }
    const note = document.querySelector('.scroll-note');
    if (note) note.style.opacity = scrollY > 40 ? '0' : '1';
  }
  function onScroll() { scrollY = window.scrollY || 0; scrollDirty = true; updateActive(); }
  window.addEventListener('scroll', onScroll, { passive: true });
  rail.forEach(btn => btn.addEventListener('click', () => { const el = $(btn.dataset.target); if (el) el.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' }); }));
  const restart = $('restart');
  if (restart) restart.addEventListener('click', () => window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' }));
  updateActive();

  function fallback(error) {
    const el = $('fallback');
    if (el) { el.hidden = false; el.querySelector('p').textContent = '三维场景不可用，但所有业务数据与换股情景仍可查看。'; }
    const canvas = $('scene'); if (canvas) canvas.style.opacity = '.12';
    if (error) console.warn('3D view fallback:', error.message || error);
  }

  let renderer, scene, camera, rocket, stageObjects = [], flame, particles;
  let pointer = { x: 0, y: 0 };
  let threeReady = false;
  try {
    if (!window.THREE) throw new Error('Three.js unavailable');
    const canvas = $('scene');
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile() ? 1.5 : 2));
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.16;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    scene = new THREE.Scene();
    scene.background = new THREE.Color('#eaf6ff');
    scene.fog = new THREE.Fog('#eaf6ff', 28, 75);
    camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, .1, 160);
    camera.position.set(11, 6.4, 20);

    const hemi = new THREE.HemisphereLight('#ffffff', '#b8d4e5', 2.2); scene.add(hemi);
    const sun = new THREE.DirectionalLight('#fff5df', 3.3); sun.position.set(-8, 16, 12); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048); sun.shadow.camera.left = -15; sun.shadow.camera.right = 15; sun.shadow.camera.top = 18; sun.shadow.camera.bottom = -8; sun.shadow.camera.near = .5; sun.shadow.camera.far = 55; scene.add(sun);
    const fill = new THREE.DirectionalLight('#c4e7ff', 1.4); fill.position.set(10, 8, -12); scene.add(fill);
    const rim = new THREE.PointLight('#6de0d5', 1.5, 25); rim.position.set(-5, 6, 4); scene.add(rim);

    const mat = (color, options = {}) => new THREE.MeshStandardMaterial(Object.assign({ color, metalness: .35, roughness: .3 }, options));
    const white = mat('#f4f8fc', { metalness: .72, roughness: .22 });
    const dark = mat('#28465e', { metalness: .65, roughness: .24 });
    const padMat = mat('#d2e2ec', { metalness: .55, roughness: .32 });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), mat('#f2f7fa', { metalness: .05, roughness: .82 }));
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
    const grid = new THREE.GridHelper(70, 35, '#b9d4e3', '#d7e7ef'); grid.position.y = .012; grid.material.transparent = true; grid.material.opacity = .35; scene.add(grid);
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.35, .16, 64), padMat); pad.position.y = .08; pad.receiveShadow = true; scene.add(pad);
    const padRing = new THREE.Mesh(new THREE.TorusGeometry(2.75, .035, 8, 64), new THREE.MeshStandardMaterial({ color: '#00a6a6', metalness: .6, roughness: .25, emissive: '#003b3b', emissiveIntensity: .12 })); padRing.rotation.x = Math.PI / 2; padRing.position.y = .18; scene.add(padRing);

    function box(w, h, d, material, x, y, z, parent = scene) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; }
    function factory() {
      const group = new THREE.Group(); group.position.set(-5.7, 0, -9); scene.add(group);
      const building = mat('#d8e8f1', { metalness: .2, roughness: .55 });
      const roof = mat('#8eb7cc', { metalness: .45, roughness: .32 });
      const windowMat = new THREE.MeshStandardMaterial({ color: '#9ce8e1', emissive: '#2baea7', emissiveIntensity: .65, metalness: .2, roughness: .2 });
      const specs = [[3.4,1.7,2.2,-1.8,.85,0],[2.4,2.7,2.0,1.1,1.35,-.3],[1.7,1.2,1.7,3.1,.6,.3]];
      specs.forEach(([w,h,d,x,y,z], idx) => {
        box(w,h,d,building,x,y,z,group);
        const r = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w,d)*.72,.55,4), roof); r.rotation.y = Math.PI / 4; r.position.set(x,y+h/2+.26,z); r.castShadow = true; group.add(r);
        for (let j=0;j<Math.max(2,Math.floor(w*2));j++) box(.16,.22,.035,windowMat,x-w/2+.35+j*.42,y+.15,z+d/2+.02,group);
        if (idx === 1) box(w*.75,.08,d*.75,dark,x,y+h/2+.58,z,group);
      });
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(.12,.16,3.8,12), dark); tower.position.set(4.3,1.9,-.2); tower.castShadow = true; group.add(tower);
      const beacon = new THREE.Mesh(new THREE.SphereGeometry(.19,16,8), new THREE.MeshBasicMaterial({ color:'#f2994a' })); beacon.position.set(4.3,3.85,-.2); group.add(beacon);
    }
    factory();

    function cloud(x,y,z,s) {
      const g = new THREE.Group(); g.position.set(x,y,z); g.scale.setScalar(s);
      const cm = new THREE.MeshBasicMaterial({ color:'#ffffff', transparent:true, opacity:.52, depthWrite:false });
      [[0,0,0,1.2],[1.1,.12,.1,.9],[-1.05,.08,.05,.85],[.2,.42,0,.8]].forEach(([xx,yy,zz,r])=>{const m=new THREE.Mesh(new THREE.SphereGeometry(r,20,12),cm);m.position.set(xx,yy,zz);g.add(m);});
      scene.add(g); return g;
    }
    const clouds=[cloud(-9,8,-18,1.4),cloud(8,10,-22,1.8),cloud(1,12,-30,1.5)];
    const particleGeo = new THREE.BufferGeometry(); const positions=[];
    for(let i=0;i<180;i++) positions.push((Math.random()-.5)*45,Math.random()*18+1,(Math.random()-.5)*35-8);
    particleGeo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    particles = new THREE.Points(particleGeo,new THREE.PointsMaterial({color:'#ffffff',size:.045,transparent:true,opacity:.62,depthWrite:false})); scene.add(particles);

    rocket = new THREE.Group(); rocket.position.set(mobile() ? 1.7 : -1.5,mobile() ? 2.6 : 0,0); rocket.scale.setScalar(mobile() ? .60 : 1); scene.add(rocket);
    const totalHeight = 8.4; let yCursor = .72;
    const radiusBy = { Automotive:1.16, Energy:1.03, Connectivity:.91, SI:.80, Space:.69 };
    function torus(r, tube, material, parent, y) { const t=new THREE.Mesh(new THREE.TorusGeometry(r,tube,10,48),material);t.rotation.x=Math.PI/2;t.position.y=y;t.castShadow=true;parent.add(t);return t; }
    function createStage(d, index) {
      const h = d.revenue_mix * totalHeight;
      const r = radiusBy[d.name];
      const g = new THREE.Group();
      const homeY = yCursor + h / 2; yCursor += h;
      g.position.set(0,homeY,0); g.userData = { homeX:0, homeY, homeZ:0, height:h, index, name:d.name };
      const accent = new THREE.Color(d.color);
      const bodyColor = accent.clone().lerp(new THREE.Color('#ffffff'),.64);
      const bodyMat = mat(bodyColor,{metalness:.72,roughness:.23});
      const body = new THREE.Mesh(new THREE.CylinderGeometry(r,r*.985,h,48),bodyMat); body.castShadow=true;body.receiveShadow=true;g.add(body);
      const bandMat = mat(d.color,{metalness:.62,roughness:.22,emissive:d.color,emissiveIntensity:.055});
      const band = new THREE.Mesh(new THREE.CylinderGeometry(r*1.006,r*1.006,Math.max(.06,h*.19),48),bandMat);band.position.y=h*.09;band.castShadow=true;g.add(band);
      torus(r*1.015,.035,white,g,-h/2+.025); torus(r*1.015,.035,bandMat,g,h/2-.025);
      for(let k=0;k<4;k++) {
        const a=k*Math.PI/2; const seam=box(.025,Math.max(.08,h*.76),.025,bandMat,Math.cos(a)*r*1.006,0,Math.sin(a)*r*1.006,g); seam.rotation.y=-a;
      }
      // A small generic service panel, deliberately without any company mark.
      const panel = box(r*.34,Math.min(.34,h*.34),.025,dark,r*.38,0,r*.94,g); panel.rotation.y=.22;
      if (index === 0) {
        for(let k=0;k<4;k++) {
          const a=k*Math.PI/2; const fin=box(.16,1.0,.62,bandMat,Math.cos(a)*r*.92,-h/2-.28,Math.sin(a)*r*.92,g); fin.rotation.y=a; fin.rotation.z=(k%2?-.22:.22);
        }
        const flameMat = new THREE.MeshBasicMaterial({color:'#f2994a',transparent:true,opacity:.83});
        flame = new THREE.Mesh(new THREE.ConeGeometry(.54,1.55,32),flameMat); flame.position.y=-h/2-1.02; flame.rotation.x=Math.PI; g.add(flame);
        const flameCore = new THREE.Mesh(new THREE.ConeGeometry(.22,1.05,24),new THREE.MeshBasicMaterial({color:'#fff2b2',transparent:true,opacity:.92})); flameCore.position.y=-h/2-.88; flameCore.rotation.x=Math.PI; g.add(flameCore);
        const light = new THREE.PointLight('#f2994a',2.3,6); light.position.y=-h/2-.7; g.add(light);
      }
      if (index === data.segments.length-1) {
        const nose = new THREE.Mesh(new THREE.ConeGeometry(r,.95,48),white); nose.position.y=h/2+.475; nose.castShadow=true; g.add(nose);
        torus(r*.98,.035,bandMat,g,h/2+.02);
        const tip = new THREE.Mesh(new THREE.CylinderGeometry(.035,.035,.45,12),bandMat); tip.position.y=h/2+1.14; g.add(tip);
      }
      rocket.add(g); stageObjects.push(g);
    }
    data.segments.forEach(createStage);
    // Small separation guides become visible only as the rocket opens.
    const guideMat = new THREE.LineBasicMaterial({color:'#8cc9d7',transparent:true,opacity:.38});
    const guideGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-4,.7,0),new THREE.Vector3(4,.7,0)]);
    const guide = new THREE.Line(guideGeo,guideMat); guide.visible=false; scene.add(guide);

    function resize() {
      if (!renderer || !camera) return;
      camera.aspect=window.innerWidth/window.innerHeight; camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1,mobile()?1.5:2)); renderer.setSize(window.innerWidth,window.innerHeight,false);
      if (rocket) { rocket.position.x=mobile()?1.7:-1.5; rocket.position.y=mobile()?2.6:0; rocket.scale.setScalar(mobile()?.60:1); }
    }
    window.addEventListener('resize',resize);
    window.addEventListener('pointermove',e=>{pointer.x=(e.clientX/window.innerWidth-.5);pointer.y=(e.clientY/window.innerHeight-.5);},{passive:true});
    threeReady = true;
    document.body.dataset.ready='true';
    window.mergerReady = true;
    window.mergerState = { data, stageObjects, scene, camera, renderer };

    const clock = new THREE.Clock();
    function animate() {
      requestAnimationFrame(animate);
      const t=clock.getElapsedTime();
      if (scrollDirty) { updateActive(); scrollDirty=false; }
      const introH = $('intro').offsetHeight || window.innerHeight;
      const stageH = window.innerHeight;
      const finalStart = $('final').offsetTop;
      let maxExplode=0;
      stageObjects.forEach((g,i)=>{
        const start=introH + i*stageH - stageH*.28;
        const local=ease(clamp((scrollY-start)/(stageH*.88)));
        maxExplode=Math.max(maxExplode,local);
        const direction=i%2===0?-1:1;
        const spread=local*(1.05+i*.22);
        g.position.x=g.userData.homeX+direction*spread;
        g.position.y=g.userData.homeY+local*(i*.48);
        g.position.z=g.userData.homeZ+local*(i%2===0?.25:-.18);
        g.rotation.z=direction*local*.055;
        g.rotation.y=local*(i%2===0?.07:-.06);
      });
      const finalBoost=clamp((scrollY-finalStart+window.innerHeight*.25)/(window.innerHeight*.8));
      if (finalBoost>0) stageObjects.forEach((g,i)=>{g.position.x+=(i%2===0?-1:1)*finalBoost*.18;});
      if (flame) { flame.scale.set(1+Math.sin(t*12)*.07,1+Math.sin(t*15)*.12,1+Math.sin(t*11)*.07); flame.material.opacity=.78+Math.sin(t*10)*.08; }
      if (particles) particles.rotation.y=t*.003;
      clouds.forEach((c,i)=>{c.position.x+=Math.sin(t*.025+i)*.0008;});
      const zoom=maxExplode*5.0+finalBoost*2.0;
      const mobileView=mobile();
      const baseX=mobileView?8.8:11;
      camera.position.x += ((baseX+pointer.x*(mobileView?.35:.8))-camera.position.x)*.035;
      camera.position.y += (((mobileView?6.0:6.4)+zoom*.16-pointer.y*.3)-camera.position.y)*.035;
      camera.position.z += (((mobileView?22.5:20)+zoom)-camera.position.z)*.035;
      const targetY=4.2+maxExplode*.45;
      camera.lookAt(mobileView?0:-.55,targetY,0);
      rocket.rotation.y=(reducedMotion?0:Math.sin(t*.16)*.035)+scrollY*.00012;
      rocket.rotation.x=reducedMotion?0:Math.sin(t*.11)*.008;
      guide.visible=maxExplode>.35;
      renderer.render(scene,camera);
    }
    animate();
  } catch (e) { fallback(e); }
})();
