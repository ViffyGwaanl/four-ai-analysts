import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { canvasTextures } from './util.js';

/* 背景：屏幕空间柔和渐变（上：淡天蓝 → 下：暖桃色），中心略提亮，营造“影棚”纵深 */
const BACKDROP = {
  top: new THREE.Color('#8fbff0'),
  mid: new THREE.Color('#dfe9f3'),
  bottom: new THREE.Color('#f7c9a8'),
  glow: new THREE.Color('#fff3e4'),
};

function makeBackdrop() {
  const geo = new THREE.SphereGeometry(500, 32, 16);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      uRes: { value: new THREE.Vector2(1, 1) },
      uTop: { value: BACKDROP.top.clone() },
      uMid: { value: BACKDROP.mid.clone() },
      uBottom: { value: BACKDROP.bottom.clone() },
      uGlow: { value: BACKDROP.glow.clone() },
    },
    vertexShader: /* glsl */ `
      void main() {
        vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_Position = p.xyww;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec2 uRes; uniform vec3 uTop; uniform vec3 uMid; uniform vec3 uBottom; uniform vec3 uGlow;
      void main() {
        vec2 uv = gl_FragCoord.xy / uRes;
        vec3 c = mix(uBottom, uMid, smoothstep(0.0, 0.62, uv.y));
        c = mix(c, uTop, smoothstep(0.55, 1.05, uv.y));
        vec2 q = (uv - vec2(0.5, 0.5)) * vec2(uRes.x / uRes.y, 1.0);
        float g = 1.0 - smoothstep(0.0, 0.85, length(q));
        c = mix(c, uGlow, g * 0.35);
        gl_FragColor = vec4(c, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.renderOrder = -10;
  mesh.frustumCulled = false;
  return mesh;
}

export function createStage({ canvas, gl, quality, labelHost }) {
  const renderer = new THREE.WebGLRenderer({ canvas, context: gl, antialias: !quality.bloom, powerPreference: 'high-performance' });
  renderer.setPixelRatio(quality.dpr);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.06;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = quality.shadows;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
  renderer.info.autoReset = false; // 每帧手动清零，便于统计含后期在内的总绘制次数

  const scene = new THREE.Scene();
  scene.background = BACKDROP.mid.clone();
  const backdrop = makeBackdrop();
  scene.add(backdrop);

  /* 灯光：左前侧暖色主光（投射柔和阴影）+ 头顶柔光聚光（中心更亮、边缘自然衰减，形成景深感）+ 天空半球光 + 冷色轮廓光 */
  const hemi = new THREE.HemisphereLight(0xdcecff, 0xf2dccb, 0.42);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffeed6, 2.85);
  key.position.set(-105.1, 101.7, 50.3); // 方位角 -64°、仰角 41°：阴影向右后方铺开
  key.target.position.set(0, 0, -1);
  scene.add(key, key.target);
  if (quality.shadows) {
    key.castShadow = true;
    key.shadow.mapSize.set(quality.shadowSize, quality.shadowSize);
    const sc = key.shadow.camera;
    sc.left = -52; sc.right = 52; sc.top = 48; sc.bottom = -48;
    sc.near = 80; sc.far = 240;
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.03;
    key.shadow.radius = 3.2;
  }
  const pool = new THREE.SpotLight(0xfff3e2, 0.6, 0, THREE.MathUtils.degToRad(22), 0.8, 0);
  pool.position.set(-8, 165, 52);
  pool.target.position.set(0, 0, -1.5);
  scene.add(pool, pool.target);
  const rim = new THREE.DirectionalLight(0xc9e0ff, 0.75);
  rim.position.set(40, 30, -46);
  scene.add(rim);

  /* 环境反射 */
  let envRT = null;
  function buildEnvironment() {
    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    if (envRT) envRT.dispose();
    envRT = pmrem.fromScene(room, 0.035);
    scene.environment = envRT.texture;
    scene.environmentIntensity = 0.3;
    room.dispose();
    pmrem.dispose();
  }
  buildEnvironment();

  /* 相机与控制器 */
  const camera = new THREE.PerspectiveCamera(24, 16 / 9, 0.5, 1200);
  camera.position.set(0, 40, 60);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.075;
  controls.rotateSpeed = 0.55;
  controls.zoomSpeed = 0.8;
  controls.panSpeed = 0.8;
  controls.minDistance = 5;
  controls.maxDistance = 420;
  controls.minPolarAngle = 0.12;
  controls.maxPolarAngle = 1.36;
  controls.screenSpacePanning = true;
  controls.target.set(0, 1, -1);

  /* 后期：轻度泛光（阈值高于白色材质，只拾取自发光部件） */
  let composer = null, bloom = null;
  if (quality.bloom) {
    const rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: quality.msaa });
    rt.texture.name = 'memfab.rt';
    composer = new EffectComposer(renderer, rt);
    composer.addPass(new RenderPass(scene, camera));
    bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.34, 0.35, 2.3);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
  }

  /* HTML 标签层 */
  const labelScene = new THREE.Scene();
  const css2d = new CSS2DRenderer({ element: labelHost });

  let W = 1, H = 1;
  const safe = { cx: 0.5, cy: 0.5, fw: 1, fh: 1 };
  const buf = new THREE.Vector2();

  function resize(w, h, safeRect) {
    W = Math.max(1, w); H = Math.max(1, h);
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.fov = camera.aspect < 1 ? 36 : 24; // 竖屏用更广的视角
    if (safeRect) {
      safe.cx = (safeRect.left + safeRect.right) / 2 / W;
      safe.cy = (safeRect.top + safeRect.bottom) / 2 / H;
      safe.fw = Math.max(0.2, (safeRect.right - safeRect.left) / W);
      safe.fh = Math.max(0.2, (safeRect.bottom - safeRect.top) / H);
    }
    camera.setViewOffset(W, H, W / 2 - safe.cx * W, H / 2 - safe.cy * H, W, H);
    camera.updateProjectionMatrix();
    if (composer) {
      composer.setPixelRatio(renderer.getPixelRatio());
      composer.setSize(W, H);
    }
    renderer.getDrawingBufferSize(buf);
    backdrop.material.uniforms.uRes.value.copy(buf);
    css2d.setSize(W, H);
    renderer.shadowMap.needsUpdate = true;
  }

  /* 给定要框住的世界尺寸，求相机距离（考虑安全区与视角） */
  function fitDistance(fw, fh) {
    const tv = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const th = tv * camera.aspect;
    const dW = fw / 2 / (th * safe.fw);
    const dH = fh / 2 / (tv * safe.fh);
    return Math.max(dW, dH);
  }

  function render() {
    renderer.info.reset();
    if (composer) composer.render();
    else renderer.render(scene, camera);
    css2d.render(labelScene, camera);
  }

  function onContextRestored() {
    envRT = null; // 旧环境贴图属于已丢失的上下文：直接丢弃引用，不再 dispose（否则会删除不属于新上下文的对象）
    buildEnvironment();
    for (const t of canvasTextures) t.needsUpdate = true;
    renderer.shadowMap.needsUpdate = true;
  }

  return {
    renderer, scene, camera, controls, composer, bloom, key, labelScene,
    resize, fitDistance, render, onContextRestored,
    get size() { return { W, H }; },
  };
}
