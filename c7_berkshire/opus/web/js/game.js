// 游戏流程：开场 → 年份转场 + 镜头飞行 → 出题 → 选择 → 揭晓（股东信原文）→ … → 结算
import { QUESTIONS, DIMS, RANKS, LEDGER, SOURCES_NOTE } from './data.js';
import { Sfx } from './audio.js';

const $ = s => document.querySelector(s);
const LETTERS = ['A', 'B', 'C', 'D'];
const DIM_NAME = Object.fromEntries(DIMS.map(d => [d.key, d.name]));
const wait = ms => new Promise(r => setTimeout(r, ms));
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export class Game {
  constructor(world) {
    this.world = world; this.sfx = new Sfx();
    this.idx = -1; this.answers = []; this.hints = 3; this.locked = true; this.phase = 'intro';
    try { this.sfx.muted = localStorage.getItem('bk-muted') === '1'; } catch (e) { /* 无痕模式等 */ }
    document.body.classList.toggle('muted', this.sfx.muted);
    this.buildProgress(); this.bind(); this.renderStatic();
  }

  bind() {
    $('#btn-start').addEventListener('click', () => this.start());
    $('#btn-next').addEventListener('click', () => this.next());
    $('#btn-hint').addEventListener('click', () => this.useHint());
    $('#btn-replay').addEventListener('click', () => { this.sfx.click(); location.reload(); });
    $('#btn-card').addEventListener('click', () => this.saveCard());
    $('#btn-sound').addEventListener('click', () => {
      this.sfx.setMuted(!this.sfx.muted); document.body.classList.toggle('muted', this.sfx.muted);
      try { localStorage.setItem('bk-muted', this.sfx.muted ? '1' : '0'); } catch (e) { /* 忽略 */ }
      if (!this.sfx.muted) { this.sfx.resume(); this.sfx.click(); }
    });
    addEventListener('keydown', e => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (this.phase === 'question' && !this.locked) {
        const n = '1234'.indexOf(k) >= 0 ? '1234'.indexOf(k) : 'abcd'.indexOf(k);
        if (n >= 0) { e.preventDefault(); this.choose(n); return; }
        if (k === 'h') { this.useHint(); return; }
      }
      if (k === 'enter') {
        if (this.phase === 'intro' && !$('#btn-start').disabled) { e.preventDefault(); this.start(); }
        else if (this.phase === 'revealed') { e.preventDefault(); this.next(); }
      }
    });
    addEventListener('resize', () => { if (this.phase !== 'intro' && this.phase !== 'ending') this.updateShift(); });
  }

  setState(s) {
    document.body.classList.remove('state-loading', 'state-intro', 'state-play', 'state-ending');
    document.body.classList.add('state-' + s);
  }

  buildProgress() {
    const ol = $('#progress'); ol.innerHTML = '';
    QUESTIONS.forEach((q, i) => { const li = document.createElement('li'); li.textContent = String(q.year).slice(2); li.title = `${q.year} · ${q.short}`; ol.appendChild(li); });
  }
  renderStatic() {
    $('#end-foot').textContent = SOURCES_NOTE;
    $('#ledger-asof').textContent = `（截至 ${LEDGER.asof}）`;
    $('#ledger-note').textContent = LEDGER.note;
    $('#ledger').innerHTML = LEDGER.items.map(it => `<li><span class="lk">${esc(it.k)}</span><span class="lv">${esc(it.v)}</span><span class="ld">${esc(it.d)}</span></li>`).join('');
  }
  ready() { $('#btn-start').disabled = false; this.setState('intro'); this.introShift(); addEventListener('resize', () => { if (this.phase === 'intro') this.introShift(); }); }
  introShift() {
    const mobileLayout = innerWidth <= 820 || (matchMedia('(pointer: coarse)').matches && innerWidth <= 1024);
    if (mobileLayout) this.world.setShift(0, Math.round(innerHeight * .38)); else this.world.setShift(-Math.round(innerWidth * .34), 0);
  }

  // ---------------------------------------------------------------- 流程
  start() {
    if (this.phase !== 'intro') return;
    this.sfx.resume(); this.sfx.click();
    this.phase = 'flying'; this.setState('play');
    this.updateShift();
    this.goTo(0);
  }

  async goTo(i) {
    this.idx = i; this.phase = 'flying'; this.locked = true;
    const q = QUESTIONS[i];
    $('#panel').classList.remove('show');
    this.markProgress();
    const yc = $('#yearcard'); yc.querySelector('.yc-year').textContent = q.year; yc.querySelector('.yc-title').textContent = q.short;
    yc.classList.remove('show'); void yc.offsetWidth; yc.classList.add('show');
    this.sfx.whoosh(2.6);
    await Promise.all([this.world.flyTo(i), wait(1700)]);
    this.renderQuestion(q);
    $('#panel').classList.add('show');
    this.phase = 'question'; this.locked = false;
    setTimeout(() => { const f = document.querySelector('.opt'); if (f && !matchMedia('(pointer: coarse)').matches) f.focus({ preventScroll: true }); }, 700);
  }

  renderQuestion(q) {
    $('#q-year').textContent = q.year;
    $('#q-no').textContent = `第 ${q.id} / ${QUESTIONS.length} 题`;
    $('#q-dim').textContent = DIM_NAME[q.dim];
    $('#q-title').textContent = q.title;
    $('#q-place').textContent = q.place;
    $('#q-situation').textContent = q.situation;
    $('#q-ask').textContent = q.ask;
    const box = $('#options'); box.className = 'options'; box.innerHTML = '';
    q.options.forEach((o, k) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'opt'; b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', 'false');
      b.innerHTML = `<span class="k">${LETTERS[k]}</span><span class="t">${esc(o.t)}</span><span class="fb">${esc(o.fb)}</span><span class="tag tb">巴菲特的选择</span><span class="tag ty">你的选择</span>`;
      b.addEventListener('click', () => this.choose(k));
      box.appendChild(b);
    });
    $('#reveal').hidden = true;
    $('#hint-text').hidden = true; $('#hint-text').textContent = q.hint;
    $('#btn-hint').disabled = this.hints <= 0; $('#hint-left').textContent = `×${this.hints}`;
    $('#panel-scroll').scrollTop = 0;
  }

  useHint() {
    if (this.phase !== 'question' || this.hints <= 0 || !$('#hint-text').hidden) return;
    this.hints--; this.sfx.click();
    $('#hint-text').hidden = false; $('#btn-hint').disabled = true; $('#hint-left').textContent = `×${this.hints}`;
  }

  async choose(k) {
    if (this.locked || this.phase !== 'question') return;
    this.locked = true; this.phase = 'locking';
    const q = QUESTIONS[this.idx], opts = [...document.querySelectorAll('.opt')];
    opts.forEach((b, j) => { b.disabled = true; b.setAttribute('aria-checked', j === k ? 'true' : 'false'); });
    opts[k].classList.add('picked', 'suspense'); $('#options').classList.add('locked');
    this.sfx.select(); setTimeout(() => this.sfx.suspense(), 160);
    await wait(900);
    opts[k].classList.remove('suspense');
    const score = q.options[k].s;
    this.answers[this.idx] = { k, s: score };
    $('#options').classList.add('revealed');
    const bo = opts[q.answer]; bo.classList.add('buffett', 'stamp');
    this.renderReveal(q, score);
    this.world.reveal(this.idx, score);
    this.sfx.result(score);
    this.markProgress(); this.updateHud();
    this.phase = 'revealed';
    await wait(250);
    const sc = $('#panel-scroll'), rv = $('#reveal');
    sc.scrollTo({ top: Math.max(0, bo.offsetTop - 70), behavior: 'smooth' });
    setTimeout(() => { if (this.phase === 'revealed') sc.scrollTo({ top: rv.offsetTop - 20, behavior: 'smooth' }); }, 1500);
  }

  renderReveal(q, score) {
    const v = $('#verdict');
    const cls = score >= 100 ? 'v100' : score >= 30 ? 'v50' : 'v0';
    const head = score >= 100 ? '完全契合' : score >= 30 ? '部分契合' : '思路不同';
    const sub = score >= 100 ? '你和巴菲特做了同样的选择。' : score >= 30 ? '你的思路和巴菲特有相通之处，但他走得更远一步。' : `巴菲特当年选择了 ${LETTERS[q.answer]}。`;
    v.className = 'verdict ' + cls;
    v.innerHTML = `<div class="pts">+${score}</div><div class="vt"><b>${head}</b><span>${sub}</span></div>`;
    $('#why').textContent = q.why;
    $('#quotes').innerHTML = q.quotes.map(qu => `<figure class="quote"><p class="en" lang="en">${esc(qu.en)}</p><p class="zh">${esc(qu.zh)}</p><p class="src">—— 伯克希尔·哈撒韦 <b>${qu.y} 年</b>致股东信</p></figure>`).join('');
    $('#after').textContent = q.after;
    $('#btn-next-label').textContent = this.idx < QUESTIONS.length - 1 ? `下一站：${QUESTIONS[this.idx + 1].year}` : '查看我的契合度';
    $('#reveal').hidden = false;
  }

  next() {
    if (this.phase !== 'revealed') return;
    this.sfx.click();
    if (this.idx < QUESTIONS.length - 1) this.goTo(this.idx + 1);
    else this.ending();
  }

  // ---------------------------------------------------------------- HUD
  markProgress() {
    [...document.querySelectorAll('#progress li')].forEach((li, i) => {
      li.className = '';
      const a = this.answers[i];
      if (a) li.classList.add(a.s >= 100 ? 'm100' : a.s >= 30 ? 'm50' : 'm0');
      if (i === this.idx && this.phase !== 'ending') li.classList.add('cur');
    });
  }
  avg() { const a = this.answers.filter(Boolean); return a.length ? a.reduce((x, y) => x + y.s, 0) / a.length : 0; }
  updateHud() {
    const n = this.answers.filter(Boolean).length, v = Math.round(this.avg());
    $('#hud-score-val').textContent = n ? v + '%' : '—';
    document.querySelector('#hud-score .ring-fg').style.strokeDashoffset = String(97.4 * (1 - (n ? v : 0) / 100));
  }
  updateShift() {
    const p = $('#panel'), cs = getComputedStyle(p);
    const bottomSheet = cs.top === 'auto' || parseFloat(cs.left) < innerWidth * .3;
    if (bottomSheet) this.world.setShift(0, Math.min(innerHeight * .72, p.offsetHeight + 12));
    else this.world.setShift(p.offsetWidth + parseFloat(cs.right || 0) + 10, 0);
  }

  // ---------------------------------------------------------------- 结算
  async ending() {
    this.phase = 'ending'; $('#panel').classList.remove('show');
    this.markProgress();
    this.world.setShift(0, 0);
    this.world.toOverview(); this.sfx.whoosh(3);
    await wait(1400);
    this.setState('ending');
    const total = Math.round(this.avg());
    const rank = RANKS.find(r => total >= r.min);
    $('#end-title').textContent = rank.name; $('#end-desc').textContent = rank.text;
    this.world.celebrate(); this.sfx.fanfare();
    const el = $('#end-score'); const t0 = performance.now();
    const tick = now => { const k = Math.min(1, (now - t0) / 2000); el.textContent = Math.round(total * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
    requestAnimationFrame(() => { $('#g-fg').style.strokeDashoffset = String(540.35 * (1 - total / 100)); });
    const dims = DIMS.map(d => ({ name: d.name, v: Math.round(d.q.reduce((s, id) => s + (this.answers[id - 1] ? this.answers[id - 1].s : 0), 0) / d.q.length) }));
    $('#dim-list').innerHTML = dims.map(d => `<li><span>${esc(d.name)}</span><b>${d.v}%</b></li>`).join('');
    drawRadar($('#radar'), dims);
    $('#recap').innerHTML = QUESTIONS.map((q, i) => {
      const a = this.answers[i] || { k: -1, s: 0 }, pc = a.s >= 100 ? 'p100' : a.s >= 30 ? 'p50' : 'p0';
      return `<li><span class="ry">${q.year}</span><span class="rt">${esc(q.title)}<small>你选 ${LETTERS[a.k] || '—'} · 巴菲特选 ${LETTERS[q.answer]}</small></span><span class="rp ${pc}">+${a.s}</span></li>`;
    }).join('');
    this.result = { total, rank, dims };
  }

  saveCard() {
    if (!this.result) return;
    this.sfx.click();
    const W = 1080, H = 1440, c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d');
    const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#8fd0ff'); bg.addColorStop(.5, '#d9f0ff'); bg.addColorStop(1, '#ffe2c2');
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    const sun = g.createRadialGradient(820, 170, 10, 820, 170, 380); sun.addColorStop(0, 'rgba(255,248,214,1)'); sun.addColorStop(1, 'rgba(255,248,214,0)'); g.fillStyle = sun; g.fillRect(0, 0, W, H);
    const font = '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC", sans-serif';
    g.fillStyle = '#23395d'; g.font = `900 76px ${font}`; g.fillText('和巴菲特一起做决定', 80, 170);
    g.font = `600 30px ${font}`; g.fillStyle = '#3b4d66'; g.fillText('十个真实的历史抉择 · 1983—2012', 82, 225);
    roundRect(g, 60, 280, W - 120, 330, 40, 'rgba(255,255,255,.82)');
    const grd = g.createLinearGradient(0, 330, 0, 560); grd.addColorStop(0, '#ffcc4d'); grd.addColorStop(1, '#f08c00');
    g.fillStyle = grd; g.font = `900 200px "Avenir Next", "Helvetica Neue", Arial, sans-serif`; g.fillText(String(this.result.total), 110, 520);
    const wNum = g.measureText(String(this.result.total)).width;
    g.font = `800 56px ${font}`; g.fillStyle = '#f08c00'; g.fillText('%', 120 + wNum, 520);
    g.fillStyle = '#23395d'; g.font = `900 64px ${font}`; g.fillText(this.result.rank.name, 520, 420);
    g.font = `500 28px ${font}`; g.fillStyle = '#3b4d66'; wrapText(g, this.result.rank.text, 520, 475, 470, 42);
    roundRect(g, 60, 640, W - 120, 640, 40, 'rgba(255,255,255,.82)');
    const rc = document.createElement('canvas'); rc.width = 840; rc.height = 720; drawRadar(rc, this.result.dims, true);
    g.drawImage(rc, 70, 660, 470, 403);
    g.font = `700 30px ${font}`; g.fillStyle = '#23395d'; g.fillText('十个决定', 580, 710);
    QUESTIONS.forEach((q, i) => {
      const a = this.answers[i] || { s: 0 }, y = 770 + i * 48;
      g.font = `800 28px "Avenir Next", Arial, sans-serif`; g.fillStyle = '#c47a00'; g.fillText(String(q.year), 580, y);
      g.font = `500 27px ${font}`; g.fillStyle = '#23395d'; g.fillText(q.short, 670, y);
      const col = a.s >= 100 ? '#f2a91c' : a.s >= 30 ? '#ffd88a' : '#d5dde8';
      roundRect(g, 880, y - 30, 120, 40, 20, col); g.fillStyle = '#3b2a00'; g.font = `800 24px "Avenir Next", Arial, sans-serif`; g.fillText('+' + a.s, 905, y - 1);
    });
    g.font = `500 24px ${font}`; g.fillStyle = '#3b4d66';
    wrapText(g, '引文均出自伯克希尔·哈撒韦致股东信。只讲历史决定，不涉及当下买卖任何股票，不构成投资建议。', 80, 1340, W - 160, 36);
    c.toBlob(blob => {
      if (!blob) return;
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `巴菲特契合度-${this.result.total}.png`;
      document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
      toast('成绩卡已生成');
    }, 'image/png');
  }
}

function roundRect(g, x, y, w, h, r, fill) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); g.fillStyle = fill; g.fill(); }
function wrapText(g, text, x, y, maxW, lh) { let line = ''; for (const ch of text) { if (g.measureText(line + ch).width > maxW) { g.fillText(line, x, y); line = ch; y += lh; } else line += ch; } if (line) g.fillText(line, x, y); }
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 2200); }

export function drawRadar(canvas, dims, big = false) {
  const W = 840, H = 720; canvas.width = W; canvas.height = H;
  const g = canvas.getContext('2d'); g.clearRect(0, 0, W, H);
  const cx = W / 2, cy = H / 2 + 22, R = 228, n = dims.length;
  const font = '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC", sans-serif';
  const pt = (i, r) => { const a = -Math.PI / 2 + i * 2 * Math.PI / n; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; };
  for (let k = 1; k <= 4; k++) {
    g.beginPath(); for (let i = 0; i < n; i++) { const [x, y] = pt(i, R * k / 4); i ? g.lineTo(x, y) : g.moveTo(x, y); } g.closePath();
    g.fillStyle = k % 2 ? 'rgba(35,57,93,.035)' : 'rgba(255,255,255,.4)'; g.fill(); g.strokeStyle = 'rgba(35,57,93,.14)'; g.lineWidth = 2; g.stroke();
  }
  for (let i = 0; i < n; i++) { const [x, y] = pt(i, R); g.beginPath(); g.moveTo(cx, cy); g.lineTo(x, y); g.strokeStyle = 'rgba(35,57,93,.14)'; g.stroke(); }
  const grad = g.createLinearGradient(cx - R, cy - R, cx + R, cy + R); grad.addColorStop(0, 'rgba(255,204,77,.75)'); grad.addColorStop(1, 'rgba(255,122,89,.6)');
  g.beginPath(); dims.forEach((d, i) => { const [x, y] = pt(i, Math.max(6, R * d.v / 100)); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.closePath();
  g.fillStyle = grad; g.fill(); g.strokeStyle = '#f08c00'; g.lineWidth = 5; g.lineJoin = 'round'; g.stroke();
  dims.forEach((d, i) => { const [x, y] = pt(i, Math.max(6, R * d.v / 100)); g.beginPath(); g.arc(x, y, 10, 0, Math.PI * 2); g.fillStyle = '#fff'; g.fill(); g.lineWidth = 5; g.strokeStyle = '#f08c00'; g.stroke(); });
  g.textAlign = 'center'; g.textBaseline = 'middle';
  dims.forEach((d, i) => {
    const [x, y] = pt(i, R + 78);
    g.font = `700 ${big ? 32 : 30}px ${font}`; g.fillStyle = '#23395d'; g.fillText(d.name, x, y - 16);
    g.font = `800 30px "Avenir Next", Arial, sans-serif`; g.fillStyle = '#c47a00'; g.fillText(d.v + '%', x, y + 20);
  });
}
