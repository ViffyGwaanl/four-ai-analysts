import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

/* 区域浮动标签（CSS2D）：名称 + 实时数字；点击飞往该区域 */
export function createLabels(labelScene, defs, onPick) {
  const items = new Map();
  for (const d of defs) {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'zlabel' + (d.minor ? ' zlabel--minor' : '');
    el.dataset.view = d.view;
    el.style.setProperty('--c', d.color);
    el.setAttribute('aria-label', d.name);
    const pill = document.createElement('span');
    pill.className = 'zl-pill';
    const dot = document.createElement('i');
    dot.className = 'zl-dot';
    const name = document.createElement('span');
    name.className = 'zl-name';
    const full = document.createElement('span');
    full.className = 'zl-full';
    full.textContent = d.name;
    const short = document.createElement('span');
    short.className = 'zl-short';
    short.textContent = d.short || d.name;
    name.append(full, short);
    const val = document.createElement('span');
    val.className = 'zl-val';
    const vk = document.createElement('span');
    vk.className = 'zl-k';
    const vn = document.createElement('b');
    vn.className = 'zl-n';
    const vu = document.createElement('span');
    vu.className = 'zl-u';
    val.append(vk, vn, vu);
    pill.append(dot, name, val);
    const stem = document.createElement('span');
    stem.className = 'zl-stem';
    el.append(pill, stem);
    if (d.view && onPick) {
      el.addEventListener('click', (e) => { e.stopPropagation(); onPick(d.view); });
    } else {
      el.tabIndex = -1;
    }
    const obj = new CSS2DObject(el);
    obj.position.copy(d.anchor);
    obj.center.set(0.5, 1);
    labelScene.add(obj);
    items.set(d.id, { el, obj, vk, vn, vu, last: null });
  }

  return {
    boxes() { return [...items.entries()].map(([id, it]) => ({ id, anchor: it.obj.position, el: it.el })); },
    /* k：指标名，n：数字（或状态文字），u：单位/补充 */
    set(id, k, n, u = '') {
      const it = items.get(id);
      const key = k + '|' + n + '|' + u;
      if (!it || it.last === key) return;
      if (it.vk.textContent !== k) it.vk.textContent = k;
      if (it.vn.textContent !== n) it.vn.textContent = n;
      if (it.vu.textContent !== u) it.vu.textContent = u;
      it.last = key;
    },
    show(id, on) {
      const it = items.get(id);
      if (!it || it.obj.visible === on) return;
      it.obj.visible = on;
    },
    setState(id, cls, on) {
      const it = items.get(id);
      if (it) it.el.classList.toggle(cls, on);
    },
    focus(view) {
      for (const it of items.values()) {
        const v = it.el.dataset.view;
        it.el.classList.toggle('is-focus', view !== 'overview' && v === view);
        it.el.classList.toggle('is-dim', view !== 'overview' && v !== view);
      }
    },
  };
}
