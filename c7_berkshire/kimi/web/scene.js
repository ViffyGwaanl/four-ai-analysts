import * as THREE from './vendor/three.module.min.js';

export function createDecisionScene(container, { reducedMotion = false } = {}) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  } catch (_) {
    container.style.background = 'radial-gradient(circle at 30% 20%, #ffffff, #e5f2ff 55%, #dcf1ed)';
    return { update() {}, setScreen() {}, setReducedMotion() {}, resize() {} };
  }

  const lowPower = window.matchMedia('(max-width: 900px)').matches || (navigator.hardwareConcurrency || 8) <= 4;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowPower ? 1.25 : 1.75));
  renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);
  renderer.shadowMap.enabled = !lowPower;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xedf6ff);
  scene.fog = new THREE.Fog(0xedf6ff, 17, 43);
  const camera = new THREE.PerspectiveCamera(42, 1, .1, 100);
  camera.position.set(0, 4.6, 16.5);
  const lookTarget = new THREE.Vector3(-.5, -.2, -1.5);
  const desiredLook = lookTarget.clone();
  const desiredCamera = camera.position.clone();
  const pointer = new THREE.Vector2();
  let motion = !reducedMotion;
  let mode = 'start';
  let activeIndex = 0;
  let revealed = false;
  let sculpture = null;
  let bornAt = 0;

  scene.add(new THREE.HemisphereLight(0xffffff, 0xbad8df, 2.2));
  const sun = new THREE.DirectionalLight(0xffffff, 3.2);
  sun.position.set(-3, 10, 7);
  sun.castShadow = !lowPower;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -14;
  sun.shadow.camera.right = 14;
  sun.shadow.camera.top = 12;
  sun.shadow.camera.bottom = -10;
  scene.add(sun);
  const rim = new THREE.DirectionalLight(0x9de8ff, 1.4);
  rim.position.set(9, 3, -5);
  scene.add(rim);
  const warm = new THREE.PointLight(0xffd98a, 18, 18, 2);
  warm.position.set(-5, 3, 2);
  scene.add(warm);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(160, 160),
    new THREE.MeshStandardMaterial({ color: 0xf2f7fa, roughness: .94, metalness: 0 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -1.72;
  ground.receiveShadow = !lowPower;
  scene.add(ground);
  const grid = new THREE.GridHelper(70, 70, 0xb7d5df, 0xd8e6ec);
  grid.position.y = -1.705;
  grid.material.transparent = true;
  grid.material.opacity = .32;
  scene.add(grid);

  const platform = new THREE.Group();
  platform.position.set(-3.1, -1.25, 0);
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(1.75, 2.05, .38, 64),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .3, metalness: .12 })
  );
  base.castShadow = !lowPower;
  base.receiveShadow = !lowPower;
  platform.add(base);
  const baseRing = new THREE.Mesh(
    new THREE.TorusGeometry(1.77, .045, 12, 80),
    new THREE.MeshStandardMaterial({ color: 0xe7b44a, roughness: .25, metalness: .55, emissive: 0xe7b44a, emissiveIntensity: .08 })
  );
  baseRing.rotation.x = Math.PI / 2;
  baseRing.position.y = .21;
  platform.add(baseRing);
  scene.add(platform);

  const orbitGroup = new THREE.Group();
  orbitGroup.position.set(-3.1, .25, 0);
  const orbitMaterial = new THREE.MeshBasicMaterial({ color: 0x75c9d2, transparent: true, opacity: .28, depthWrite: false });
  for (let i = 0; i < 3; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.25 + i * .32, .012, 8, 100), orbitMaterial);
    ring.rotation.set(Math.PI / 2.6 + i * .35, i * .65, i * .4);
    orbitGroup.add(ring);
  }
  scene.add(orbitGroup);

  const timelineGroup = new THREE.Group();
  const nodes = [];
  const nodePoints = [];
  for (let i = 0; i < 10; i++) {
    const point = new THREE.Vector3((i - 4.5) * 2.25, -1.23 + Math.sin(i * .7) * .08, -5.3 - Math.cos(i * .55) * .7);
    nodePoints.push(point);
    const group = new THREE.Group();
    group.position.copy(point);
    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(.45, .65, .22, 28),
      new THREE.MeshStandardMaterial({ color: 0xf9fcff, roughness: .45, metalness: .05 })
    );
    group.add(pedestal);
    const gemMaterial = new THREE.MeshStandardMaterial({ color: 0x8faec7, roughness: .3, metalness: .25, emissive: 0x8faec7, emissiveIntensity: .04 });
    const gem = new THREE.Mesh(new THREE.IcosahedronGeometry(.25, 1), gemMaterial);
    gem.position.y = .48;
    group.add(gem);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.42, .015, 8, 36), new THREE.MeshBasicMaterial({ color: 0xa9c8d8, transparent: true, opacity: .5 }));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = .16;
    group.add(ring);
    timelineGroup.add(group);
    nodes.push({ group, gem, ring });
  }
  const pathCurve = new THREE.CatmullRomCurve3(nodePoints.map(p => p.clone().add(new THREE.Vector3(0, .06, 0))));
  const pathMesh = new THREE.Mesh(
    new THREE.TubeGeometry(pathCurve, 140, .022, 8, false),
    new THREE.MeshBasicMaterial({ color: 0x75bcc8, transparent: true, opacity: .55 })
  );
  timelineGroup.add(pathMesh);
  scene.add(timelineGroup);

  const particleCount = lowPower ? 90 : 180;
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);
  const palette = [new THREE.Color(0x6e9fe9), new THREE.Color(0x70c8c2), new THREE.Color(0xf0c764)];
  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = (Math.random() - .5) * 36;
    positions[i * 3 + 1] = Math.random() * 10 - 1;
    positions[i * 3 + 2] = Math.random() * -18 + 5;
    const color = palette[i % palette.length];
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }
  const particleGeometry = new THREE.BufferGeometry();
  particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const particles = new THREE.Points(particleGeometry, new THREE.PointsMaterial({ size: .065, vertexColors: true, transparent: true, opacity: .55, depthWrite: false }));
  scene.add(particles);

  const clouds = new THREE.Group();
  const cloudMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .25, depthWrite: false });
  for (let i = 0; i < (lowPower ? 5 : 9); i++) {
    const cloud = new THREE.Group();
    for (let j = 0; j < 4; j++) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(1 + Math.random() * .8, 16, 12), cloudMaterial);
      puff.position.set(j * 1.15, Math.sin(j) * .4, Math.cos(j) * .4);
      puff.scale.y = .55;
      cloud.add(puff);
    }
    cloud.position.set((Math.random() - .5) * 32, 3 + Math.random() * 5, -8 - Math.random() * 13);
    cloud.scale.setScalar(.65 + Math.random() * .75);
    clouds.add(cloud);
  }
  scene.add(clouds);

  function material(color, roughness = .3, metalness = .16) {
    const c = new THREE.Color(color);
    return new THREE.MeshStandardMaterial({ color: c, roughness, metalness, emissive: c, emissiveIntensity: .045 });
  }

  function addMesh(group, geometry, mat, position = [0, 0, 0], scale = [1, 1, 1], rotation = [0, 0, 0]) {
    const mesh = new THREE.Mesh(geometry, mat);
    mesh.position.set(...position);
    mesh.scale.set(...scale);
    mesh.rotation.set(...rotation);
    mesh.castShadow = !lowPower;
    mesh.receiveShadow = !lowPower;
    group.add(mesh);
    return mesh;
  }

  function buildSculpture(question) {
    const group = new THREE.Group();
    const main = material(question.color || '#2d6cdf');
    const gold = material('#f4c65c', .24, .45);
    const white = material('#f8fcff', .24, .1);
    const dark = material('#315673', .35, .25);
    const teal = material('#4cc2c6', .28, .2);
    const shape = question.shape;

    if (shape === 'candy') {
      addMesh(group, new THREE.CylinderGeometry(.64, .64, 1.65, 36), main, [0, 0, 0], [1, 1, 1], [0, 0, Math.PI / 2]);
      addMesh(group, new THREE.ConeGeometry(.64, .95, 36), gold, [-1.25, 0, 0], [1, 1, 1], [0, 0, -Math.PI / 2]);
      addMesh(group, new THREE.ConeGeometry(.64, .95, 36), gold, [1.25, 0, 0], [1, 1, 1], [0, 0, Math.PI / 2]);
      addMesh(group, new THREE.TorusGeometry(.65, .055, 10, 40), white, [-.55, 0, 0], [1, 1, 1], [0, Math.PI / 2, 0]);
      addMesh(group, new THREE.TorusGeometry(.65, .055, 10, 40), white, [.55, 0, 0], [1, 1, 1], [0, Math.PI / 2, 0]);
    } else if (shape === 'store') {
      addMesh(group, new THREE.BoxGeometry(2.35, 1.35, 1.45), main, [0, 0, 0]);
      addMesh(group, new THREE.ConeGeometry(1.85, .75, 4), gold, [0, 1.02, 0], [1, 1, 1], [0, Math.PI / 4, 0]);
      addMesh(group, new THREE.BoxGeometry(.48, .88, .06), dark, [0, -.24, .76]);
      for (const x of [-.75, .75]) addMesh(group, new THREE.BoxGeometry(.48, .48, .07), white, [x, .15, .77]);
      addMesh(group, new THREE.BoxGeometry(2.5, .18, 1.65), teal, [0, -.76, 0]);
    } else if (shape === 'bottle') {
      addMesh(group, new THREE.CylinderGeometry(.57, .65, 1.65, 36), main, [0, -.1, 0]);
      addMesh(group, new THREE.SphereGeometry(.58, 32, 18), main, [0, .72, 0], [1, .55, 1]);
      addMesh(group, new THREE.CylinderGeometry(.24, .29, .62, 32), main, [0, 1.18, 0]);
      addMesh(group, new THREE.CylinderGeometry(.28, .28, .18, 32), gold, [0, 1.56, 0]);
      addMesh(group, new THREE.CylinderGeometry(.655, .655, .42, 36), white, [0, -.15, 0]);
    } else if (shape === 'shoe') {
      addMesh(group, new THREE.BoxGeometry(2.55, .24, 1.08), white, [0, -.55, 0]);
      addMesh(group, new THREE.SphereGeometry(1, 32, 20), main, [-.25, -.02, 0], [1.12, .55, .57]);
      addMesh(group, new THREE.SphereGeometry(.8, 32, 18), main, [.88, -.2, 0], [1, .5, .65]);
      addMesh(group, new THREE.BoxGeometry(.5, .8, 1), dark, [-1.03, -.08, 0]);
      for (let i = 0; i < 4; i++) addMesh(group, new THREE.CylinderGeometry(.035, .035, .65, 10), white, [-.35 + i * .2, .35 - i * .05, .45], [1, 1, 1], [Math.PI / 2, 0, 0]);
    } else if (shape === 'shield') {
      const s = new THREE.Shape();
      s.moveTo(-1, 1.05); s.lineTo(1, 1.05); s.lineTo(.92, -.25);
      s.quadraticCurveTo(.75, -.95, 0, -1.35); s.quadraticCurveTo(-.75, -.95, -.92, -.25); s.closePath();
      addMesh(group, new THREE.ExtrudeGeometry(s, { depth: .24, bevelEnabled: true, bevelSize: .07, bevelThickness: .07, bevelSegments: 3 }), main, [0, .1, -.12]);
      addMesh(group, new THREE.CylinderGeometry(.09, .09, .85, 14), gold, [-.25, .05, .35], [1, 1, 1], [0, 0, -.65]);
      addMesh(group, new THREE.CylinderGeometry(.09, .09, 1.35, 14), gold, [.32, .03, .35], [1, 1, 1], [0, 0, .72]);
    } else if (shape === 'tool') {
      addMesh(group, new THREE.CylinderGeometry(.86, .86, .48, 40), main, [0, 0, 0], [1, 1, 1], [Math.PI / 2, 0, 0]);
      addMesh(group, new THREE.CylinderGeometry(.35, .35, .56, 32), dark, [0, 0, 0], [1, 1, 1], [Math.PI / 2, 0, 0]);
      for (let i = 0; i < 12; i++) {
        const a = i / 12 * Math.PI * 2;
        addMesh(group, new THREE.BoxGeometry(.26, .38, .52), i % 2 ? gold : main, [Math.cos(a) * .96, Math.sin(a) * .96, 0], [1, 1, 1], [0, 0, a]);
      }
    } else if (shape === 'bolt') {
      const s = new THREE.Shape();
      s.moveTo(.25, 1.45); s.lineTo(-.85, .05); s.lineTo(-.15, .05); s.lineTo(-.45, -1.45); s.lineTo(.9, -.05); s.lineTo(.2, -.05); s.closePath();
      addMesh(group, new THREE.ExtrudeGeometry(s, { depth: .34, bevelEnabled: true, bevelSize: .07, bevelThickness: .07, bevelSegments: 3 }), main, [0, 0, -.17], [1, 1, 1], [0, 0, -.08]);
      addMesh(group, new THREE.TorusGeometry(1.65, .035, 10, 70), gold, [0, 0, -.35]);
    } else if (shape === 'rail') {
      addMesh(group, new THREE.BoxGeometry(1.55, .78, .85), main, [-.8, -.05, 0]);
      addMesh(group, new THREE.BoxGeometry(.62, .75, .85), dark, [-1.25, .65, 0]);
      addMesh(group, new THREE.BoxGeometry(.55, .35, .87), gold, [-.1, .12, 0]);
      for (const x of [1.0, 2.25]) {
        addMesh(group, new THREE.BoxGeometry(1.05, .7, .85), x === 1 ? teal : gold, [x, -.12, 0]);
      }
      for (const x of [-1.25, -.35, .72, 1.28, 2.0, 2.52]) {
        for (const z of [-.46, .46]) addMesh(group, new THREE.CylinderGeometry(.19, .19, .13, 18), dark, [x, -.58, z], [1, 1, 1], [Math.PI / 2, 0, 0]);
      }
      for (const z of [-.58, .58]) addMesh(group, new THREE.BoxGeometry(5.4, .08, .09), dark, [.45, -.86, z]);
    } else if (shape === 'plane') {
      addMesh(group, new THREE.CylinderGeometry(.3, .44, 3.1, 32), main, [0, 0, 0], [1, 1, 1], [0, 0, Math.PI / 2]);
      addMesh(group, new THREE.SphereGeometry(.43, 28, 16), main, [1.52, 0, 0], [1.15, 1, 1]);
      addMesh(group, new THREE.BoxGeometry(1.3, .12, 3.3), white, [0, 0, 0], [1, 1, 1], [0, 0, -.08]);
      addMesh(group, new THREE.BoxGeometry(.62, .1, 1.55), teal, [-1.25, .2, 0]);
      addMesh(group, new THREE.BoxGeometry(.55, .72, .12), gold, [-1.25, .55, 0], [1, 1, 1], [0, 0, -.2]);
      for (const z of [-.82, .82]) addMesh(group, new THREE.CylinderGeometry(.17, .17, .55, 20), dark, [.15, -.25, z], [1, 1, 1], [Math.PI / 2, 0, 0]);
    } else if (shape === 'repurchase') {
      for (let i = 0; i < 6; i++) addMesh(group, new THREE.CylinderGeometry(.65, .65, .18, 36), gold, [0, -.55 + i * .18, 0]);
      const arrow1 = addMesh(group, new THREE.TorusGeometry(1.25, .075, 12, 70, Math.PI * 1.45), main, [0, .1, .15], [1, 1, 1], [0, 0, .2]);
      arrow1.rotation.z = .2;
      addMesh(group, new THREE.ConeGeometry(.22, .5, 24), main, [-1.18, .45, .15], [1, 1, 1], [0, 0, -1.1]);
      addMesh(group, new THREE.TorusGeometry(1.55, .035, 10, 70, Math.PI * 1.4), teal, [0, .1, -.2], [1, 1, 1], [0, 0, Math.PI]);
    }
    group.scale.setScalar(.88);
    return group;
  }

  function disposeGroup(group) {
    group.traverse(obj => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
        materials.forEach(m => m.dispose());
      }
    });
    scene.remove(group);
  }

  function update(question, index, isRevealed) {
    activeIndex = index;
    revealed = isRevealed;
    if (sculpture) disposeGroup(sculpture);
    sculpture = buildSculpture(question);
    sculpture.position.set(-3.1, .15, 0);
    sculpture.rotation.y = -.28;
    scene.add(sculpture);
    bornAt = clock.getElapsedTime();
    const activeColor = new THREE.Color(question.color || '#2d6cdf');
    nodes.forEach((node, i) => {
      const isActive = i === index;
      const isDone = i < index || (i === index && isRevealed);
      const color = isActive ? activeColor : new THREE.Color(isDone ? 0x149ba6 : 0x8faec7);
      node.gem.material.color.copy(color);
      node.gem.material.emissive.copy(color);
      node.gem.material.emissiveIntensity = isActive ? .35 : .04;
      node.ring.material.color.copy(color);
      node.ring.material.opacity = isActive ? 1 : .5;
    });
  }

  function setScreen(nextMode) {
    mode = nextMode;
    if (mode === 'start') {
      desiredCamera.set(0, 4.6, 16.5);
      desiredLook.set(-.5, -.2, -1.5);
    } else if (mode === 'game') {
      desiredCamera.set(.8, 3.4, 12.8);
      desiredLook.set(-2.1, .05, 0);
    } else {
      desiredCamera.set(0, 5.8, 18);
      desiredLook.set(0, -.5, -2);
    }
    if (!motion) {
      camera.position.copy(desiredCamera);
      lookTarget.copy(desiredLook);
    }
  }

  function setReducedMotion(value) {
    motion = !value;
    if (!motion) setScreen(mode);
  }

  function resize() {
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    renderer.setSize(width, height);
    camera.aspect = width / Math.max(height, 1);
    camera.updateProjectionMatrix();
  }

  window.addEventListener('resize', resize, { passive: true });
  window.addEventListener('pointermove', event => {
    pointer.x = event.clientX / Math.max(window.innerWidth, 1) - .5;
    pointer.y = event.clientY / Math.max(window.innerHeight, 1) - .5;
  }, { passive: true });
  resize();
  setScreen('start');

  const clock = new THREE.Clock();
  function animate() {
    const t = clock.getElapsedTime();
    const easing = motion ? .035 : 1;
    const parallax = motion && mode !== 'end' ? .45 : 0;
    const targetPosition = desiredCamera.clone();
    targetPosition.x += pointer.x * parallax;
    targetPosition.y -= pointer.y * parallax * .45;
    camera.position.lerp(targetPosition, easing);
    lookTarget.lerp(desiredLook, easing);
    camera.lookAt(lookTarget);

    if (sculpture) {
      const age = Math.max(0, t - bornAt);
      const enter = motion ? Math.min(1, age / 1.1) : 1;
      const eased = 1 - Math.pow(1 - enter, 4);
      const pulse = revealed && motion ? 1 + Math.sin(t * 3) * .025 : 1;
      sculpture.scale.setScalar(.88 * eased * pulse);
      if (motion) {
        sculpture.rotation.y = -.28 + age * .16;
        sculpture.position.y = .15 + Math.sin(t * 1.2) * .08;
      } else {
        sculpture.rotation.y = -.28;
        sculpture.position.y = .15;
      }
      sculpture.traverse(obj => {
        if (obj.material && obj.material.emissive) obj.material.emissiveIntensity = revealed ? .14 : .045;
      });
    }
    nodes.forEach((node, i) => {
      const target = i === activeIndex ? 1.5 : 1;
      node.group.scale.lerp(new THREE.Vector3(target, target, target), motion ? .06 : 1);
      if (motion) node.gem.rotation.y = t * .45 + i;
    });
    if (motion) {
      orbitGroup.rotation.y = t * .09;
      orbitGroup.rotation.z = Math.sin(t * .15) * .15;
      particles.rotation.y = t * .006;
      clouds.position.x = Math.sin(t * .035) * 1.2;
      baseRing.rotation.z = t * .12;
    }
    renderer.render(scene, camera);
  }

  renderer.setAnimationLoop(animate);
  document.addEventListener('visibilitychange', () => {
    renderer.setAnimationLoop(document.hidden ? null : animate);
  });

  return { update, setScreen, setReducedMotion, resize };
}
