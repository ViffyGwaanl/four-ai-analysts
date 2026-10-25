// 轻量音效：全部用 WebAudio 合成，无外部音频文件
export class Sfx {
  constructor() { this.ctx = null; this.muted = false; this.master = null; }
  ensure() {
    if (this.ctx) return this.ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try {
      this.ctx = new AC();
      this.master = this.ctx.createGain(); this.master.gain.value = this.muted ? 0 : .5;
      const comp = this.ctx.createDynamicsCompressor(); this.master.connect(comp); comp.connect(this.ctx.destination);
    } catch (e) { this.ctx = null; }
    return this.ctx;
  }
  resume() { const c = this.ensure(); if (c && c.state === 'suspended') c.resume().catch(() => {}); }
  setMuted(m) { this.muted = m; if (this.master) this.master.gain.setTargetAtTime(m ? 0 : .5, this.ctx.currentTime, .05); }
  tone(freq, t0, dur, type = 'sine', vol = .3, attack = .01) {
    const c = this.ctx; if (!c || this.muted) return;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + attack); g.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
    o.connect(g); g.connect(this.master); o.start(t0); o.stop(t0 + dur + .05);
  }
  bell(freq, t0, dur = 1.4, vol = .22) { this.tone(freq, t0, dur, 'sine', vol); this.tone(freq * 2.01, t0, dur * .6, 'sine', vol * .35); this.tone(freq * 3.02, t0, dur * .35, 'triangle', vol * .12); }
  click() { const c = this.ensure(); if (!c) return; this.tone(1320, c.currentTime, .07, 'triangle', .12, .003); }
  select() { const c = this.ensure(); if (!c) return; const t = c.currentTime; this.tone(660, t, .12, 'triangle', .16, .004); this.tone(990, t + .06, .16, 'triangle', .12, .004); }
  whoosh(dur = 2.4) {
    const c = this.ensure(); if (!c || this.muted) return;
    const len = Math.floor(c.sampleRate * dur), buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * .6;
    const src = c.createBufferSource(); src.buffer = buf;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = .8;
    const t = c.currentTime; f.frequency.setValueAtTime(260, t); f.frequency.exponentialRampToValueAtTime(1400, t + dur * .5); f.frequency.exponentialRampToValueAtTime(320, t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.16, t + dur * .45); g.gain.linearRampToValueAtTime(0, t + dur);
    src.connect(f); f.connect(g); g.connect(this.master); src.start(t); src.stop(t + dur);
  }
  suspense() { const c = this.ensure(); if (!c) return; const t = c.currentTime; [0, .14, .28, .42].forEach((d, i) => this.tone(220 + i * 30, t + d, .12, 'sine', .1, .005)); }
  result(score) {
    const c = this.ensure(); if (!c) return; const t = c.currentTime + .02;
    if (score >= 100) { [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.bell(f, t + i * .09, 1.5, .2)); }
    else if (score >= 30) { [523.25, 659.25].forEach((f, i) => this.bell(f, t + i * .12, 1.1, .18)); }
    else { this.bell(392, t, .9, .16); this.bell(329.63, t + .16, 1.1, .14); }
  }
  fanfare() {
    const c = this.ensure(); if (!c) return; const t = c.currentTime + .05;
    [[392, 0], [523.25, .14], [659.25, .28], [783.99, .42], [1046.5, .62], [1318.5, .78]].forEach(([f, d]) => this.bell(f, t + d, 1.8, .18));
  }
}
