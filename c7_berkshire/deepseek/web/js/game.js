/* 游戏状态机、UI、计分与音效。 */
(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const DECISIONS = window.DECISIONS || [];
  const LEDGER = window.LEDGER || [];
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const state = {
    index: 0,
    phase: "start",
    answers: [],
    sound: true,
    scene: null,
    locked: false
  };

  const dom = {};
  let audioCtx = null;

  function init() {
    [
      "hud", "start", "startBtn", "ledgerBtnStart", "ledgerBtnResult", "panel",
      "decisionView", "revealView", "panelFooter", "result", "replayBtn", "scoreBar", "scoreNum",
      "scoreHeadline", "scoreSub", "traits", "logList", "progressLabel",
      "progressCount", "dots", "soundBtn", "travel", "travelYear", "travelLabel",
      "ledger", "ledgerClose", "ledgerGrid", "loading"
    ].forEach(id => dom[id] = $(id));

    buildDots();
    renderLedger();
    bind();
    initScene();
    setTimeout(() => dom.loading.classList.add("is-hidden"), 750);
  }

  function initScene() {
    if (!window.THREE || !window.BerkshireScene) {
      document.body.classList.add("no-webgl");
      return;
    }
    try {
      const canvas = $("world");
      const test = document.createElement("canvas");
      const gl = test.getContext("webgl") || test.getContext("experimental-webgl");
      if (!gl) throw new Error("no webgl");
      state.scene = new window.BerkshireScene(canvas);
      state.scene.init();
      state.scene.startIntro();
    } catch (e) {
      state.scene = null;
      document.body.classList.add("no-webgl");
    }
  }

  function bind() {
    dom.startBtn.addEventListener("click", startGame);
    dom.ledgerBtnStart.addEventListener("click", () => openLedger(dom.ledgerBtnStart));
    dom.ledgerBtnResult.addEventListener("click", () => openLedger(dom.ledgerBtnResult));
    dom.ledgerClose.addEventListener("click", closeLedger);
    dom.ledger.addEventListener("click", e => { if (e.target === dom.ledger) closeLedger(); });
    dom.replayBtn.addEventListener("click", replay);
    dom.soundBtn.addEventListener("click", toggleSound);
    document.addEventListener("keydown", e => {
      if (e.key === "Escape") { closeLedger(); return; }
      if (state.phase !== "decision" || state.locked) return;
      const k = e.key.toUpperCase();
      if (["1", "2", "3"].includes(k) || ["A", "B", "C"].includes(k)) {
        const key = ["1", "2", "3"].includes(k) ? "ABC"[Number(k) - 1] : k;
        choose(key);
      }
    });
    loadSoundPref();
  }

  function loadSoundPref() {
    try {
      const v = localStorage.getItem("buffett_line_sound");
      if (v === "off") { state.sound = false; updateSoundButton(); }
    } catch (e) { /* ignore */ }
  }

  function updateSoundButton() {
    dom.soundBtn.classList.toggle("muted", !state.sound);
    dom.soundBtn.setAttribute("aria-label", state.sound ? "关闭声音" : "打开声音");
    dom.soundBtn.setAttribute("title", state.sound ? "关闭声音" : "打开声音");
  }

  function toggleSound() {
    state.sound = !state.sound;
    updateSoundButton();
    try { localStorage.setItem("buffett_line_sound", state.sound ? "on" : "off"); } catch (e) {}
    if (state.sound) { ensureAudio(); click(); }
  }

  function buildDots() {
    dom.dots.innerHTML = "";
    for (let i = 0; i < DECISIONS.length; i++) {
      const d = document.createElement("span");
      d.className = "dot";
      d.dataset.i = i;
      dom.dots.appendChild(d);
    }
  }

  function updateProgress() {
    const i = state.index;
    dom.progressLabel.textContent = `第 ${String(i + 1).padStart(2, "0")} 站`;
    dom.progressCount.textContent = `${String(i + 1).padStart(2, "0")} / 10`;
    [...dom.dots.children].forEach((d, j) => {
      d.classList.toggle("done", j < i || (j === i && state.phase === "reveal"));
      d.classList.toggle("current", j === i && state.phase !== "reveal");
    });
  }

  function startGame() {
    if (state.phase !== "start") return;
    ensureAudio();
    whistle();
    state.phase = "travel";
    state.index = 0;
    state.answers = [];
    state.locked = false;
    dom.start.classList.add("is-leaving");
    setTimeout(() => dom.start.classList.add("is-hidden"), 520);
    dom.hud.classList.remove("is-hidden");
    updateProgress();
    const d = DECISIONS[0];
    showTravel(d);
    moveScene(0, reduced ? 0.05 : 1.35, () => {
      hideTravel();
      state.phase = "decision";
      updateProgress();
      showDecision();
    });
  }

  function moveScene(index, duration, cb) {
    if (state.scene) state.scene.moveTo(index, duration, cb);
    else setTimeout(cb, Math.min(500, duration * 400));
  }

  function showTravel(d) {
    dom.travelYear.textContent = d.year;
    dom.travelLabel.textContent = "下一站 · " + d.kicker;
    dom.travel.classList.add("is-visible");
  }
  function hideTravel() { dom.travel.classList.remove("is-visible"); }

  function showDecision() {
    const d = DECISIONS[state.index];
    state.locked = false;
    state.phase = "decision";
    dom.revealView.classList.add("is-hidden");
    dom.decisionView.classList.remove("is-hidden");
    dom.panelFooter.classList.add("is-hidden");
    dom.panelFooter.innerHTML = "";
    dom.decisionView.innerHTML = `
      <div class="station-head">
        <span class="station-no">第 ${String(state.index + 1).padStart(2, "0")} 站 / 10</span>
        <span class="station-year">${d.year}</span>
      </div>
      <div class="kicker">${d.kicker}</div>
      <h2>${d.title}</h2>
      <p class="situation">${d.situation}</p>
      <div class="prompt">你会怎么选？</div>
      <div class="options" role="group" aria-label="选项">
        ${d.options.map(o => `
          <button class="option" data-key="${o.key}" type="button">
            <span class="opt-key">${o.key}</span>
            <span class="opt-copy"><b>${o.label}</b><small>${o.desc}</small></span>
            <span class="opt-arrow">→</span>
          </button>`).join("")}
      </div>
      <p class="panel-hint">没有标准答案。选完再揭晓。</p>`;
    dom.decisionView.querySelectorAll(".option").forEach(btn => {
      btn.addEventListener("click", () => choose(btn.dataset.key));
    });
    showPanel();
    updateProgress();
    dom.panel.querySelector(".panel-scroll").scrollTop = 0;
  }

  function choose(key) {
    if (state.locked || state.phase !== "decision") return;
    const d = DECISIONS[state.index];
    const picked = d.options.find(o => o.key === key);
    if (!picked) return;
    state.locked = true;
    click();
    dom.decisionView.querySelectorAll(".option").forEach(b => {
      b.disabled = true;
      if (b.dataset.key === key) b.classList.add("picked");
    });
    setTimeout(() => reveal(picked), reduced ? 60 : 620);
  }

  function reveal(picked) {
    const d = DECISIONS[state.index];
    const actual = d.options.find(o => o.key === d.actual);
    const match = picked.key === d.actual;
    state.phase = "reveal";
    state.answers.push({
      index: state.index,
      key: picked.key,
      label: picked.label,
      weight: picked.weight,
      match,
      traits: picked.traits || []
    });
    dom.decisionView.classList.add("is-hidden");
    dom.revealView.classList.remove("is-hidden");
    dom.revealView.innerHTML = `
      <div class="reveal-top">
        <span class="badge ${match ? "match" : "miss"}">${match ? "✓ 同路" : "× 分岔"}</span>
        <span class="station-year">${d.year}</span>
      </div>
      <p class="reveal-choice">你选了 <b>${picked.key} · ${picked.label}</b></p>
      <p class="reveal-choice">巴菲特选了 <b>${actual.key} · ${actual.label}</b></p>
      ${match
        ? `<p class="split-note">你和他选了同一个方向：${actual.verdict}</p>`
        : `<p class="split-note">你的选择：${picked.verdict}<br/>他的取舍：${actual.verdict}</p>`}
      <div class="section-label">他为什么这么做</div>
      <p>${d.why}</p>
      <div class="quote">
        <div class="quote-mark">“</div>
        <p class="quote-en">${d.quoteEn}</p>
        <p class="quote-zh">${d.quoteZh}</p>
        <div class="quote-src">— ${d.quoteSrc}（原文，≤2 句）</div>
      </div>
      <div class="section-label">后来</div>
      <p>${d.outcome}</p>
      <div class="section-label">巴菲特的思路标签</div>
      <div class="chips">${(actual.traits || []).map(t => `<span># ${t}</span>`).join("")}</div>`;
    dom.panelFooter.innerHTML = `<button id="nextBtn" class="btn btn-primary" type="button">${state.index === DECISIONS.length - 1 ? "看结果 →" : "下一站 →"}</button>`;
    dom.panelFooter.classList.remove("is-hidden");
    const next = $("nextBtn");
    if (next) next.addEventListener("click", nextStation);
    if (state.scene) state.scene.pulse();
    soundReveal(match);
    updateProgress();
    dom.panel.querySelector(".panel-scroll").scrollTop = 0;
  }

  function nextStation() {
    if (state.phase !== "reveal") return;
    click();
    if (state.index >= DECISIONS.length - 1) {
      showResult();
      return;
    }
    state.phase = "travel";
    state.locked = true;
    hidePanel();
    state.index += 1;
    const d = DECISIONS[state.index];
    showTravel(d);
    moveScene(state.index, reduced ? 0.05 : 1.75, () => {
      hideTravel();
      state.phase = "decision";
      updateProgress();
      showPanel();
      showDecision();
    });
    updateProgress();
  }

  function showPanel() {
    dom.panel.classList.remove("is-hidden");
    dom.panel.classList.add("is-visible");
  }
  function hidePanel() {
    dom.panel.classList.remove("is-visible");
    dom.panel.classList.add("is-hidden");
    dom.panelFooter.classList.add("is-hidden");
    dom.panelFooter.innerHTML = "";
  }

  function showResult() {
    state.phase = "result";
    hidePanel();
    const score = Math.round(state.answers.reduce((s, a) => s + a.weight, 0) / DECISIONS.length * 100);
    const matches = state.answers.filter(a => a.match).length;
    const headline = score >= 90 ? "几乎同频：你和他看的是同一张地图"
      : score >= 75 ? "同一套底层逻辑，偶尔分岔"
      : score >= 60 ? "有时同路，有时各走各的"
      : score >= 45 ? "你更相信另一套办法"
      : "你是另一条路上的投资者";
    dom.scoreHeadline.textContent = headline;
    dom.scoreSub.textContent = `同路 ${matches} / 10 · 分岔 ${10 - matches} / 10 · 思路契合度 ${score}%`;
    dom.result.classList.remove("is-hidden");
    dom.result.scrollTop = 0;
    if (state.scene) state.scene.celebrate();
    soundSuccess();
    animateScore(score);
    renderTraits();
    renderLog();
    updateProgress();
  }

  function animateScore(score) {
    const circle = dom.scoreBar;
    const total = 2 * Math.PI * 78;
    circle.style.strokeDasharray = String(total);
    circle.style.strokeDashoffset = String(total);
    dom.scoreNum.textContent = String(score);
    // force reflow so the ring transition starts from zero
    void circle.getBoundingClientRect();
    circle.style.strokeDashoffset = String(total * (1 - score / 100));
  }

  function renderTraits() {
    const order = ["长期主义", "逆向思维", "能力圈", "资本配置", "纠错", "风险控制"];
    const counts = {};
    order.forEach(t => counts[t] = 0);
    state.answers.forEach(a => (a.traits || []).forEach(t => { if (counts[t] != null) counts[t] += 1; }));
    const top = order.slice().sort((a, b) => counts[b] - counts[a] || order.indexOf(a) - order.indexOf(b)).slice(0, 4);
    dom.traits.innerHTML = '<div class="section-label" style="grid-column:1/-1;text-align:left;margin:0 0 2px">你的思路标签</div>' + top.map(t => `
      <div class="trait">
        <b>${t}</b>
        <div class="track"><div class="fill" style="transform:scaleX(${Math.min(1, counts[t] / 10)})"></div></div>
        <em>${counts[t]}/10</em>
      </div>`).join("");
  }

  function renderLog() {
    dom.logList.innerHTML = state.answers.map((a, i) => {
      const d = DECISIONS[a.index];
      const actual = d.options.find(o => o.key === d.actual);
      return `
        <div class="log-row">
          <span>${d.year}</span>
          <span>你：<b>${a.key} · ${a.label}</b></span>
          <span>他：<b>${actual.key} · ${actual.label}</b></span>
          <span class="mark ${a.match ? "ok" : "no"}">${a.match ? "✓" : "×"}</span>
          <details>
            <summary>看这一站的原文</summary>
            <p>${d.quoteEn}</p>
            <p style="color:#7A8B9A">— ${d.quoteSrc}</p>
          </details>
        </div>`;
    }).join("");
  }

  function replay() {
    state.phase = "start";
    state.index = 0;
    state.answers = [];
    state.locked = false;
    dom.result.classList.add("is-hidden");
    dom.hud.classList.add("is-hidden");
    dom.panel.classList.add("is-hidden");
    dom.panel.classList.remove("is-visible");
    dom.panelFooter.classList.add("is-hidden");
    dom.panelFooter.innerHTML = "";
    dom.start.classList.remove("is-hidden", "is-leaving");
    buildDots();
    if (state.scene) {
      state.scene.setStationInstant(0);
      state.scene.startIntro();
    }
  }

  function renderLedger() {
    dom.ledgerGrid.innerHTML = LEDGER.map(item => `
      <div class="ledger-item">
        <small>${item.label}</small>
        <b>${item.value}<span>${item.unit}</span></b>
        <em>${item.note}</em>
      </div>`).join("");
  }

  function openLedger(trigger) {
    dom.ledger.classList.remove("is-hidden");
    dom.ledger.classList.add("is-visible");
    dom.ledgerClose.focus({ preventScroll: true });
    dom.ledger.dataset.trigger = trigger ? trigger.id : "";
  }
  function closeLedger() {
    if (dom.ledger.classList.contains("is-hidden")) return;
    dom.ledger.classList.remove("is-visible");
    dom.ledger.classList.add("is-hidden");
    const trigger = dom.ledger.dataset.trigger ? $(dom.ledger.dataset.trigger) : null;
    if (trigger) trigger.focus({ preventScroll: true });
  }

  /* ---------- 音效：全部用 WebAudio 生成，没有外部音频文件 ---------- */
  function ensureAudio() {
    if (!state.sound) return null;
    try {
      if (!audioCtx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        audioCtx = new AC();
      }
      if (audioCtx.state === "suspended") audioCtx.resume();
      return audioCtx;
    } catch (e) { return null; }
  }

  function tone(freq, dur, type, gain, when, slideTo) {
    if (!state.sound) return;
    const ac = ensureAudio();
    if (!ac) return;
    const t0 = ac.currentTime + (when || 0);
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type || "sine";
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain || 0.04, t0 + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(ac.destination);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }

  function click() { tone(520, 0.07, "sine", 0.028); }
  function whistle() {
    tone(440, 0.45, "sine", 0.035, 0, 660);
    tone(554, 0.45, "triangle", 0.022, 0.05, 830);
  }
  function soundReveal(match) {
    const chord = match ? [523.25, 659.25, 783.99] : [392, 466.16, 587.33];
    chord.forEach((f, i) => tone(f, 0.55, "sine", 0.035, i * 0.06));
  }
  function soundSuccess() {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, 0.7, "triangle", 0.03, i * 0.12));
  }

  if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
})();
