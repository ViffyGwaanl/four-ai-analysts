import { TokamakScene } from './tokamak.js';
import { EnergyScene } from './energy.js';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch (e) { return false; }
}

const PART_NAMES = {
  vessel: ['01', '真空室'],
  blanket: ['02', '包层'],
  divertor: ['03', '偏滤器'],
  magnets: ['04', '磁体系统'],
  plasma: ['05', '等离子体'],
  cryostat: ['06', '低温与辅助'],
  whole: ['07', '整机'],
};

const stage = $('#stage');
const progressBar = $('#progress-bar');
let tokamak = null;
let energy = null;
let currentScene = 'tokamak';
let currentStep = 0;
let ticking = false;

function updateNav(scene) {
  $$('.nav a').forEach(a => a.classList.toggle('active', a.dataset.nav === scene));
  $$('.parts-panel li').forEach(li => li.classList.remove('active'));
}

function updateParts(part) {
  $$('.parts-panel li').forEach(li => li.classList.toggle('active', li.dataset.part === part));
  const info = PART_NAMES[part];
  const gp = $('#global-part');
  if (gp) { gp.textContent = info ? info[0] + ' / 07' : '00 / 07'; gp.style.opacity = (currentScene === 'tokamak' && info) ? '1' : '0'; }
  if (info && currentScene === 'tokamak') {
    const n = $('#step-num'); const nm = $('#step-name');
    if (n) n.textContent = info[0];
    if (nm) nm.textContent = info[1];
  }
}

function setScene(scene) {
  if (scene === currentScene) return;
  currentScene = scene;
  stage.classList.toggle('energy', scene === 'energy');
  document.body.classList.toggle('energy', scene === 'energy');
  if (tokamak) tokamak.setActive(scene === 'tokamak');
  if (energy) energy.setActive(scene === 'energy');
  updateNav(scene);
  if (scene === 'energy') {
    const n = $('#step-num'); const nm = $('#step-name');
    if (n) n.textContent = '02'; if (nm) nm.textContent = '电力流向';
  }
}

function onScroll() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    const vh = window.innerHeight;
    const y = window.scrollY;
    const docH = document.documentElement.scrollHeight;
    const p = Math.max(0, Math.min(1, y / Math.max(1, docH - vh)));
    progressBar.style.width = (p * 100).toFixed(2) + '%';

    const sections = $$('[data-scene][data-step]');
    let active = sections[0];
    let best = Infinity;
    for (const sec of sections) {
      const r = sec.getBoundingClientRect();
      const center = r.top + r.height / 2;
      const d = Math.abs(center - vh * 0.52);
      if (r.top <= vh * 0.62 && r.bottom >= vh * 0.38 && d < best) {
        best = d; active = sec;
      }
    }
    if (!active) { ticking = false; return; }
    const scene = active.dataset.scene || 'tokamak';
    setScene(scene);
    const step = Number(active.dataset.step || 0);
    document.body.classList.toggle('energy-flow', scene === 'energy' && step >= 1);
    if (scene === 'tokamak') {
      currentStep = step;
      if (tokamak) tokamak.setStep(step);
      if (step === 0) {
        const n = $('#step-num'); const nm = $('#step-name');
        if (n) n.textContent = '00'; if (nm) nm.textContent = '整机';
        const gp = $('#global-part'); if (gp) gp.style.opacity = '0';
        $$('.parts-panel li').forEach(li => li.classList.remove('active'));
      } else {
        updateParts(active.dataset.part || '');
      }
    } else {
      if (energy) energy.setStep(step);
    }
    ticking = false;
  });
}

function bindUI() {
  $$('.parts-panel li').forEach(li => {
    li.addEventListener('click', () => {
      const part = li.dataset.part;
      const sec = document.querySelector(`[data-scene="tokamak"][data-part="${part}"]`);
      if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  });

  $$('.year-toggle button').forEach(btn => {
    btn.addEventListener('click', () => {
      const year = Number(btn.dataset.year);
      if (energy) energy.setYear(year);
      $$('.year-toggle button').forEach(b => b.classList.toggle('active', b === btn));
    });
  });

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', () => {
    if (tokamak) tokamak.resize();
    if (energy) energy.resize();
    onScroll();
  });
  // pointer drag for tokamak (page scroll still works on touch)
  const canvas = $('#canvas-tokamak');
  if (canvas) {
    let down = false, lx = 0, ly = 0;
    canvas.addEventListener('pointerdown', e => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      down = true; lx = e.clientX; ly = e.clientY;
      canvas.setPointerCapture?.(e.pointerId);
    });
    canvas.addEventListener('pointermove', e => {
      if (!down || !tokamak) return;
      const dx = e.clientX - lx; const dy = e.clientY - ly;
      lx = e.clientX; ly = e.clientY;
      if (Math.abs(dx) + Math.abs(dy) > 0) tokamak.drag(dx, dy);
    });
    const up = e => { down = false; try { canvas.releasePointerCapture?.(e.pointerId); } catch (_) {} };
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('pointerleave', up);
  }
}

function boot() {
  if (!hasWebGL()) {
    const fb = $('#webgl-fallback');
    if (fb) fb.hidden = false;
    return;
  }
  try {
    tokamak = new TokamakScene($('#canvas-tokamak'), window.AI_POWER);
  } catch (e) {
    console.error('TOKAMAK_INIT_FAILED', e);
    const fb = $('#webgl-fallback');
    if (fb) fb.hidden = false;
    return;
  }
  try {
    energy = new EnergyScene($('#canvas-energy'), window.AI_POWER);
  } catch (e) {
    console.error('ENERGY_INIT_FAILED', e);
    energy = null;
  }
  bindUI();
  onScroll();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
