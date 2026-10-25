// 入口：检测 WebGL → 动态加载 3D 世界（失败则自动退回 2D 模式）→ 启动游戏
import { QUESTIONS } from './data.js';
import { Game } from './game.js';

// 无 WebGL 时的“空世界”，保持与 World 相同的接口
class FlatWorld {
  flyTo() { return new Promise(r => setTimeout(r, 650)); }
  toOverview() { return Promise.resolve(); }
  reveal() {}
  celebrate() {}
  setShift() {}
  resetAll() {}
}

function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch (e) { return false; }
}

async function boot() {
  let world = null;
  if (webglAvailable()) {
    try {
      const { World } = await import('./scene.js');
      const lowPower = /Android [4-7]\b/.test(navigator.userAgent) || (navigator.deviceMemory && navigator.deviceMemory <= 2);
      world = new World(document.getElementById('stage'), QUESTIONS, { lowPower });
      world.init();
      world.onLost = () => document.body.classList.add('no-webgl');
    } catch (e) {
      world = null;
    }
  }
  if (!world) { document.body.classList.add('no-webgl'); world = new FlatWorld(); }
  const game = new Game(world);
  if (/[?&]debug\b/.test(location.search)) window.__bk = { game, world };  // 仅供自动化测试
  // 给首帧一点时间完成着色器编译，再撤掉加载层
  requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(() => game.ready(), 350)));
}

boot();
