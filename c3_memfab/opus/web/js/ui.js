import { QUARTERS, N, META, UNIT_MONEY, UNIT_FLOW, UNIT_STOCK, MILESTONES } from './data.js';
import { money, kw, pct, index } from './format.js';
import { createChart, CHART_SERIES } from './chart.js';

const KPI_GROUPS = [
  {
    name: '运营',
    items: [
      { key: 'utilization', label: '开工率', fmt: pct, unit: '', color: '#06b6d4' },
      { key: 'capacity', label: '产能', fmt: kw, unit: UNIT_FLOW, color: '#06b6d4' },
      { key: 'hbmOutput', label: 'HBM 产量', fmt: kw, unit: UNIT_FLOW, color: '#8b5cf6' },
      { key: 'inventoryKw', label: '库存', fmt: kw, unit: UNIT_STOCK, color: '#f59e0b', second: { key: 'inventory', fmt: money, unit: UNIT_MONEY } },
    ],
  },
  {
    name: '财务',
    items: [
      { key: 'cash', label: '现金', fmt: money, unit: UNIT_MONEY, color: '#e0a100' },
      { key: 'debt', label: '负债', fmt: money, unit: UNIT_MONEY, color: '#ef5a4c' },
      { key: 'equity', label: '股东权益', fmt: money, unit: UNIT_MONEY, color: '#2563eb' },
      { key: 'revenue', label: '营收', fmt: money, unit: UNIT_MONEY, color: '#64748b' },
      { key: 'netIncome', label: '净利润', fmt: money, unit: UNIT_MONEY, color: '#64748b' },
    ],
  },
  {
    name: '市场',
    items: [
      { key: 'priceIndex', label: '价格指数', fmt: index, unit: '', color: '#0ea5e9' },
      { key: 'hbmPriceIndex', label: 'HBM 价格指数', fmt: index, unit: '', color: '#c026d3' },
    ],
  },
];

export const VIEW_NAMES = [
  ['overview', '总览', '#0f172a'],
  ['fab', '洁净室', '#06b6d4'],
  ['hbm', 'HBM 产线', '#8b5cf6'],
  ['warehouse', '仓库', '#f59e0b'],
  ['vault', '金库', '#e0a100'],
  ['debt', '负债', '#ef5a4c'],
  ['boardroom', '董事会', '#b7794a'],
  ['market', '市场', '#0ea5e9'],
];

const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};

export function createUI(h) {
  const $ = (id) => document.getElementById(id);
  const mq = window.matchMedia('(max-width: 760px)');
  const isMobile = () => mq.matches;

  /* 标题与脚注（来自数据元信息） */
  if (META.title) {
    $('title').textContent = META.title;
    document.title = `${META.title} · 剖开的工厂`;
  }
  {
    const src = META.source || '';
    const id = (src.match(/编号\s*([A-Za-z0-9_-]+)/) || [])[1];
    const date = (src.match(/(\d{4}-\d{2}-\d{2})/) || [])[1];
    if (id && date) $('footnote').textContent = `数据：经营模拟引擎导出（${id}），${date} · 单位：${UNIT_MONEY}、${UNIT_FLOW} · 示意模型，非真实工厂`;
  }
  $('qTotal').textContent = String(N);
  $('chartSub').textContent = `${UNIT_MONEY} · ${QUARTERS[0].label}–${QUARTERS[N - 1].label}`;

  /* KPI 面板 */
  const kpiBody = $('kpiGroups');
  const cells = [];
  for (const grp of KPI_GROUPS) {
    const sec = el('section', 'kpi-group');
    sec.appendChild(el('h3', null, grp.name));
    for (const it of grp.items) {
      const row = el('div', 'kpi');
      row.dataset.key = it.key;
      const dot = el('i', 'k-dot');
      dot.style.setProperty('--c', it.color);
      const label = el('span', 'k-label', it.label);
      const val = el('span', 'k-val');
      const b1 = el('b');
      val.appendChild(b1);
      if (it.unit) val.appendChild(el('small', null, it.unit));
      cells.push({ it, node: b1, key: it.key, fmt: it.fmt, last: '' });
      if (it.second) {
        val.appendChild(el('span', 'k-sep', '·'));
        const b2 = el('b');
        val.appendChild(b2);
        val.appendChild(el('small', null, it.second.unit));
        cells.push({ it: it.second, node: b2, key: it.second.key, fmt: it.second.fmt, last: '' });
      }
      row.append(dot, label, val);
      sec.appendChild(row);
    }
    kpiBody.appendChild(sec);
  }
  const negRow = kpiBody.querySelector('[data-key="netIncome"]');

  /* 小图 */
  const legend = $('chartLegend');
  const legendVals = [];
  for (const s of CHART_SERIES) {
    const item = el('span', 'lg');
    const sw = el('i', 'sw' + (s.dash.length ? ' sw-dash' : ''));
    sw.style.setProperty('--c', s.color);
    const v = el('b');
    item.append(sw, el('span', null, s.name), v);
    legend.appendChild(item);
    legendVals.push({ key: s.key, node: v, last: '' });
  }
  const chart = createChart($('chart'), $('chartTip'), { onPick: (i) => h.onSeek(i) });

  /* 视角按钮 */
  const nav = $('zoneNav');
  const navBtns = new Map();
  for (const [v, name, c] of VIEW_NAMES) {
    const b = el('button', 'zbtn');
    b.type = 'button';
    b.dataset.view = v;
    const d = el('i', 'zdot');
    d.style.setProperty('--c', c);
    b.append(d, el('span', null, name));
    b.addEventListener('click', () => h.onView(v));
    nav.appendChild(b);
    navBtns.set(v, b);
  }

  /* 时间轴 */
  const slider = $('slider');
  slider.min = '1';
  slider.max = String(N);
  const ticks = $('ticks');
  const tickEls = [];
  const msByIdx = new Map();
  for (const m of MILESTONES) {
    if (!msByIdx.has(m.i)) msByIdx.set(m.i, []);
    msByIdx.get(m.i).push(m);
  }
  QUARTERS.forEach((q, i) => {
    const t = el('button', 'tick');
    t.type = 'button';
    t.style.setProperty('--i', String(i / (N - 1)));
    t.textContent = q.label;
    if (!(i === 0 || i === N - 1 || (i + 1) % 4 === 0)) t.classList.add('minor');
    const ms = msByIdx.get(i);
    t.title = `${q.label} · ${q.title}` + (ms ? `（${ms.map((m) => m.text).join('、')}）` : '');
    if (ms) {
      t.classList.add('has-ms');
      const dot = el('i', 'ms-dot ms-' + ms[0].tone);
      t.appendChild(dot);
    }
    t.addEventListener('click', () => h.onSeek(i));
    ticks.appendChild(t);
    tickEls.push(t);
  });
  slider.addEventListener('input', () => h.onSeek(Number(slider.value) - 1));
  $('playBtn').addEventListener('click', () => h.onPlay());
  $('speedBtn').addEventListener('click', () => h.onSpeed());

  /* 决策笔记展开 */
  const noteBtn = $('noteToggle');
  const notePanel = $('notePanel');
  noteBtn.addEventListener('click', () => {
    const open = noteBtn.getAttribute('aria-expanded') !== 'true';
    noteBtn.setAttribute('aria-expanded', String(open));
    notePanel.hidden = !open;
    document.body.classList.toggle('note-open', open);
  });

  /* 移动端抽屉 */
  const drawerBtn = $('drawerBtn');
  drawerBtn.addEventListener('click', () => {
    if (!isMobile()) return;
    const open = !document.body.classList.contains('drawer-open');
    document.body.classList.toggle('drawer-open', open);
    drawerBtn.setAttribute('aria-expanded', String(open));
    if (open) requestAnimationFrame(() => chart.resize());
  });

  /* 键盘 */
  window.addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const k = e.key;
    if (k === 'ArrowRight' || k === 'ArrowLeft') {
      e.preventDefault();
      h.onStep(k === 'ArrowRight' ? 1 : -1);
    } else if (k === ' ' || k === 'Spacebar') {
      e.preventDefault();
      if (!e.repeat) h.onPlay();
    } else if (k === 'Home' || k === 'End') {
      e.preventDefault();
      h.onSeek(k === 'Home' ? 0 : N - 1);
    } else if (k === 'Escape') {
      if (!notePanel.hidden) noteBtn.click();
      document.body.classList.remove('drawer-open');
    }
  });
  window.addEventListener('keyup', (e) => { if (e.key === ' ') e.preventDefault(); });

  /* 输出接口 */
  let curIdx = -1;
  function setQuarter(i) {
    const q = QUARTERS[i];
    curIdx = i;
    $('qLabel').textContent = q.label;
    $('qTitle').textContent = q.title;
    $('qEvent').textContent = q.event;
    $('noteText').textContent = q.note;
    $('kpiQ').textContent = q.label;
    slider.value = String(i + 1);
    slider.style.setProperty('--pp', String(i / (N - 1)));
    slider.setAttribute('aria-valuetext', `${q.label}：${q.title}`);
    tickEls.forEach((t, j) => {
      t.classList.toggle('is-past', j < i);
      t.classList.toggle('is-cur', j === i);
    });
    const card = $('quarterCard');
    card.classList.remove('bump');
    void card.offsetWidth;
    card.classList.add('bump');
  }

  function renderValues(disp, settled) {
    for (const c of cells) {
      const s = c.fmt(disp[c.key]);
      if (s !== c.last) { c.last = s; c.node.textContent = s; }
    }
    negRow.classList.toggle('is-neg', disp.netIncome < 0);
    for (const lv of legendVals) {
      const s = money(disp[lv.key]);
      if (s !== lv.last) { lv.last = s; lv.node.textContent = s; }
    }
    const mini = `现金 ${money(disp.cash)} · 负债 ${money(disp.debt)} · 权益 ${money(disp.equity)}`;
    if (mini !== renderValues.lastMini) { renderValues.lastMini = mini; $('kpiMini').textContent = mini; }
    chart.setQuarter(disp.qf, curIdx);
  }

  function setPlaying(mode, speed, intervalMs) {
    const btn = $('playBtn');
    btn.dataset.mode = mode;
    btn.setAttribute('aria-label', mode === 'playing' ? '暂停' : mode === 'ended' ? '从 Q1 重播' : '播放');
    btn.title = btn.getAttribute('aria-label') + '（空格）';
    const first = QUARTERS[0].label, last = QUARTERS[N - 1].label;
    const secs = (intervalMs / 1000).toFixed(intervalMs % 1000 === 0 ? 0 : intervalMs % 100 === 0 ? 1 : 2);
    $('playStatus').textContent = mode === 'playing'
      ? `自动播放中 · 每 ${secs} 秒一季 · 到 ${last} 停止`
      : mode === 'ended' ? `已播放到 ${last} · 点击 ↻ 从 ${first} 重播` : `已暂停 · 点击 ▶ 播放（每 ${secs} 秒一季）`;
    $('speedBtn').textContent = `${speed}×`;
    $('speedBtn').setAttribute('aria-label', `播放速度 ${speed} 倍，点击切换`);
  }

  function setView(v) {
    for (const [k, b] of navBtns) b.classList.toggle('is-active', k === v);
  }

  function safeRect() {
    const W = window.innerWidth, H = window.innerHeight;
    const r = (id) => $(id).getBoundingClientRect();
    if (isMobile()) {
      const top = r('quarterCard').bottom + 6;
      const bottom = r('zoneNav').top - 4;
      return { left: 0, right: W, top: Math.min(top, H * 0.45), bottom: Math.max(bottom, H * 0.55) };
    }
    const left = Math.max(r('brand').right, r('quarterCard').right) + 8;
    const right = r('kpiPanel').left - 8;
    const navR = r('zoneNav');
    const top = navR.top < H / 2 ? navR.bottom + 4 : 12;
    const bottom = (navR.top > H / 2 ? navR.top : r('timeline').top) - 6;
    return { left, right: Math.max(right, left + 200), top, bottom: Math.max(bottom, top + 200) };
  }

  /* 各面板在视口中的矩形（供 3D 总览构图避让） */
  function layoutRects() {
    const box = (id) => {
      const r = $(id).getBoundingClientRect();
      return { left: r.left, right: r.right, top: r.top, bottom: r.bottom };
    };
    const b = box('brand'), q = box('quarterCard');
    return {
      cards: { left: Math.min(b.left, q.left), right: Math.max(b.right, q.right), top: Math.min(b.top, q.top), bottom: Math.max(b.bottom, q.bottom) },
      kpi: box('kpiPanel'),
      nav: box('zoneNav'),
      timeline: box('timeline'),
    };
  }

  function toast(msg, ms = 3500) {
    const t = $('toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toast.tm);
    if (ms > 0) toast.tm = setTimeout(() => { t.hidden = true; }, ms);
  }

  return { setQuarter, renderValues, setPlaying, setView, safeRect, layoutRects, toast, chart, isMobile, mq };
}
