import { QUARTERS, N, UNIT_MONEY } from './data.js';
import { money } from './format.js';

/* 小图：股东权益 / 现金 / 负债（同一单位、同一纵轴），当前季度竖线标记；悬停显示数值，点击跳转 */
export const CHART_SERIES = [
  { key: 'equity', name: '股东权益', color: '#2563eb', dash: [] },
  { key: 'cash', name: '现金', color: '#c98a00', dash: [] },
  { key: 'debt', name: '负债', color: '#e5484d', dash: [5, 4] },
];

const FONT = '"PingFang SC","Hiragino Sans GB","Microsoft YaHei",system-ui,sans-serif';

function niceStep(max, target = 4) {
  const raw = max / target;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * mag >= raw) return m * mag;
  return 10 * mag;
}

export function createChart(canvas, tip, { onPick } = {}) {
  const g = canvas.getContext('2d');
  const data = CHART_SERIES.map((s) => QUARTERS.map((q) => +q[s.key] || 0));
  const max = Math.max(...data.flat());
  const step = niceStep(max);
  const yMax = Math.ceil(max / step) * step;
  let W = 0, H = 0, dpr = 1;
  let qf = 0, qi = 0, hover = -1;
  const pad = { l: 34, r: 10, t: 10, b: 22 };

  const X = (i) => pad.l + (i / (N - 1)) * (W - pad.l - pad.r);
  const Y = (v) => H - pad.b - (v / yMax) * (H - pad.t - pad.b);

  function resize() {
    const r = canvas.getBoundingClientRect();
    if (r.width < 10 || r.height < 10) return false;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = r.width; H = r.height;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    return true;
  }

  function valueAt(arr, f) {
    const i = Math.floor(f), k = f - i;
    if (i >= N - 1) return arr[N - 1];
    return arr[i] + (arr[i + 1] - arr[i]) * k;
  }

  function path(arr, upto) {
    g.beginPath();
    g.moveTo(X(0), Y(arr[0]));
    const last = Math.min(N - 1, Math.floor(upto));
    for (let i = 1; i <= last; i++) g.lineTo(X(i), Y(arr[i]));
    if (upto > last && last < N - 1) g.lineTo(X(upto), Y(valueAt(arr, upto)));
  }

  function draw() {
    if (!W && !resize()) return;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    // 网格（弱化）
    g.font = `500 10px ${FONT}`;
    g.textBaseline = 'middle';
    for (let v = 0; v <= yMax + 1e-9; v += step) {
      const y = Math.round(Y(v)) + 0.5;
      g.strokeStyle = v === 0 ? 'rgba(15,29,51,0.22)' : 'rgba(15,29,51,0.07)';
      g.lineWidth = 1;
      g.beginPath(); g.moveTo(pad.l, y); g.lineTo(W - pad.r, y); g.stroke();
      g.fillStyle = 'rgba(15,29,51,0.45)';
      const t = String(v);
      g.fillText(t, pad.l - 6 - g.measureText(t).width, y);
    }
    g.textBaseline = 'alphabetic';
    const xt = [0, Math.round((N - 1) / 3), Math.round((2 * (N - 1)) / 3), N - 1];
    for (const i of xt) {
      const t = QUARTERS[i].label;
      g.fillStyle = 'rgba(15,29,51,0.45)';
      const w = g.measureText(t).width;
      g.fillText(t, Math.min(W - pad.r - w, Math.max(pad.l - w / 2, X(i) - w / 2)), H - 6);
    }
    // 当前季度竖线
    const cx = X(qf);
    g.strokeStyle = 'rgba(15,29,51,0.28)';
    g.setLineDash([3, 3]);
    g.beginPath(); g.moveTo(cx, pad.t); g.lineTo(cx, H - pad.b); g.stroke();
    g.setLineDash([]);
    // 曲线：全程淡色 + 已发生部分实色
    CHART_SERIES.forEach((s, k) => {
      g.lineJoin = 'round'; g.lineCap = 'round';
      g.setLineDash(s.dash);
      g.strokeStyle = s.color;
      g.globalAlpha = 0.2;
      g.lineWidth = 2;
      path(data[k], N - 1);
      g.stroke();
      g.globalAlpha = 1;
      path(data[k], qf);
      g.stroke();
      g.setLineDash([]);
    });
    // 当前点（≥8px，带 2px 白环）
    CHART_SERIES.forEach((s, k) => {
      const v = valueAt(data[k], qf);
      g.fillStyle = '#ffffff';
      g.beginPath(); g.arc(cx, Y(v), 5.5, 0, Math.PI * 2); g.fill();
      g.fillStyle = s.color;
      g.beginPath(); g.arc(cx, Y(v), 3.75, 0, Math.PI * 2); g.fill();
    });
    // 悬停十字线
    if (hover >= 0) {
      const hx = X(hover);
      g.strokeStyle = 'rgba(15,29,51,0.4)';
      g.lineWidth = 1;
      g.beginPath(); g.moveTo(hx, pad.t); g.lineTo(hx, H - pad.b); g.stroke();
      CHART_SERIES.forEach((s, k) => {
        g.fillStyle = '#ffffff';
        g.beginPath(); g.arc(hx, Y(data[k][hover]), 4.5, 0, Math.PI * 2); g.fill();
        g.strokeStyle = s.color; g.lineWidth = 2;
        g.beginPath(); g.arc(hx, Y(data[k][hover]), 3.5, 0, Math.PI * 2); g.stroke();
      });
    }
  }

  function showTip(i, clientX) {
    if (!tip) return;
    const q = QUARTERS[i];
    tip.innerHTML = '';
    const head = document.createElement('div');
    head.className = 'tip-head';
    head.textContent = `${q.label} · ${q.title}`;
    tip.appendChild(head);
    CHART_SERIES.forEach((s) => {
      const row = document.createElement('div');
      row.className = 'tip-row';
      const sw = document.createElement('i');
      sw.className = 'sw' + (s.dash.length ? ' sw-dash' : '');
      sw.style.setProperty('--c', s.color);
      const name = document.createElement('span');
      name.textContent = s.name;
      const val = document.createElement('b');
      val.textContent = money(q[s.key]);
      row.append(sw, name, val);
      tip.appendChild(row);
    });
    const unit = document.createElement('div');
    unit.className = 'tip-unit';
    unit.textContent = `单位：${UNIT_MONEY} · 点击跳转`;
    tip.appendChild(unit);
    tip.hidden = false;
    const r = canvas.getBoundingClientRect();
    const x = X(i);
    tip.style.left = `${Math.max(4, Math.min(r.width - tip.offsetWidth - 4, x - tip.offsetWidth / 2))}px`;
  }

  function idxFromEvent(e) {
    const r = canvas.getBoundingClientRect();
    const x = e.clientX - r.left;
    const f = (x - pad.l) / (W - pad.l - pad.r);
    return Math.max(0, Math.min(N - 1, Math.round(f * (N - 1))));
  }

  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    const i = idxFromEvent(e);
    if (i !== hover) { hover = i; draw(); showTip(i, e.clientX); }
  });
  canvas.addEventListener('pointerleave', () => { hover = -1; if (tip) tip.hidden = true; draw(); });
  canvas.addEventListener('click', (e) => { if (onPick) onPick(idxFromEvent(e)); });

  return {
    setQuarter(f, i) { qf = f; qi = i; draw(); },
    resize() { if (resize()) draw(); },
    draw,
  };
}
