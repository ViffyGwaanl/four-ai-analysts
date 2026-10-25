import { GAME_DATA, DIMENSIONS } from './data.js';
import { createDecisionScene } from './scene.js';

const $ = id => document.getElementById(id);
const STORAGE_KEY = 'decisionAtlas.v1';
const screens = { start: $('startScreen'), game: $('gameScreen'), end: $('endScreen') };
const reducedBySystem = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let motion = !reducedBySystem;
let soundEnabled = false;
let audioContext = null;
let toastTimer = null;
let started = false;

function loadSaved() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { index: 0, answers: [], best: 0, motion: !reducedBySystem };
    const parsed = JSON.parse(raw);
    const answers = Array.isArray(parsed.answers) ? parsed.answers.slice(0, 10).map(answer => {
      if (!answer || !Number.isInteger(answer.choice) || answer.choice < 0 || answer.choice > 2) return null;
      return { choice: answer.choice, score: Number(answer.score) || 0, dims: Array.isArray(answer.dims) ? answer.dims.slice(0, 4) : [0, 0, 0, 0] };
    }) : [];
    return {
      index: Math.max(0, Math.min(10, Number(parsed.index) || 0)),
      answers,
      best: Math.max(0, Math.min(100, Number(parsed.best) || 0)),
      motion: typeof parsed.motion === 'boolean' ? parsed.motion : !reducedBySystem,
    };
  } catch (_) {
    return { index: 0, answers: [], best: 0, motion: !reducedBySystem };
  }
}

let state = loadSaved();
motion = state.motion;
const scene = createDecisionScene($('scene'), { reducedMotion: !motion });
scene.update(GAME_DATA[0], 0, false);
scene.setScreen('start');

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, motion }));
  } catch (_) {}
}

function makeElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function showToast(message) {
  clearTimeout(toastTimer);
  $('toast').textContent = message;
  $('toast').classList.add('show');
  toastTimer = setTimeout(() => $('toast').classList.remove('show'), 2300);
}

function showScreen(name) {
  Object.entries(screens).forEach(([key, element]) => {
    element.hidden = key !== name;
    element.classList.toggle('active', key === name);
  });
  $('topProgress').hidden = name !== 'game';
  scene.setScreen(name);
  window.scrollTo({ top: 0, behavior: motion ? 'smooth' : 'auto' });
}

function updateContinue() {
  const hasProgress = state.answers.some(Boolean);
  $('continueBtn').hidden = !hasProgress;
  if (hasProgress) $('continueBtn').textContent = state.index >= 10 || state.answers.filter(Boolean).length >= 10 ? '查看上次决策画像' : '继续上次旅程';
}

function newGame() {
  state.index = 0;
  state.answers = [];
  started = true;
  saveState();
  showScreen('game');
  renderQuestion();
  playNotes([392, 523], .07);
}

function continueGame() {
  started = true;
  if (state.index >= 10 || state.answers.filter(Boolean).length >= 10) {
    showEnd(false);
  } else {
    showScreen('game');
    renderQuestion();
  }
}

function renderTimeline() {
  $('timeline').replaceChildren();
  GAME_DATA.forEach((question, index) => {
    const node = makeElement('div', 'timeline-node', question.year);
    node.title = `${question.year} · ${question.title}`;
    const answered = Boolean(state.answers[index]);
    node.classList.toggle('done', answered || index < state.index);
    node.classList.toggle('active', index === state.index);
    if (index === state.index) node.setAttribute('aria-current', 'step');
    $('timeline').appendChild(node);
  });
}

function renderQuestion() {
  const question = GAME_DATA[state.index];
  if (!question) {
    showEnd();
    return;
  }
  const answer = state.answers[state.index];
  const isRevealed = Boolean(answer);
  document.title = `${question.year} · ${question.title}｜Decision Atlas`;
  $('yearWatermark').textContent = question.year;
  $('questionKicker').textContent = question.kicker;
  $('decisionIndex').textContent = `DECISION ${String(question.id).padStart(2, '0')}`;
  $('decisionYear').textContent = question.year;
  $('questionTitle').textContent = question.title;
  $('questionContext').textContent = question.context;
  $('progressLabel').textContent = `决策 ${question.id} / ${GAME_DATA.length}`;
  $('progressBar').style.width = `${question.id / GAME_DATA.length * 100}%`;
  $('panelStep').textContent = isRevealed ? 'STEP 2 · 历史揭晓' : 'STEP 1 · 先做选择';
  $('optionsWrap').hidden = isRevealed;
  $('revealWrap').hidden = !isRevealed;
  $('lessonChip').hidden = !isRevealed;
  $('optionsWrap').replaceChildren();

  question.options.forEach((option, index) => {
    const button = makeElement('button', 'option-button');
    button.type = 'button';
    button.dataset.choice = index;
    button.setAttribute('aria-label', `选项${index + 1}：${option.title}。${option.desc}`);
    const number = makeElement('span', 'option-number', String(index + 1).padStart(2, '0'));
    const copy = makeElement('span', 'option-copy');
    copy.appendChild(makeElement('strong', '', option.title));
    copy.appendChild(makeElement('small', '', option.desc));
    const arrow = makeElement('span', 'option-arrow', '→');
    arrow.setAttribute('aria-hidden', 'true');
    button.append(number, copy, arrow);
    button.addEventListener('click', () => selectOption(index));
    $('optionsWrap').appendChild(button);
  });

  if (isRevealed) fillReveal(question, answer);
  renderTimeline();
  scene.update(question, state.index, isRevealed);
  scene.setScreen('game');
}

function fillReveal(question, answer) {
  const selected = question.options[answer.choice];
  const sameAsHistory = answer.choice === question.actual;
  $('yourChoice').textContent = selected.title;
  $('choiceScore').textContent = `+${answer.score}`;
  $('matchNote').textContent = sameAsHistory
    ? '你与巴菲特当年的选择相同。契合不等于结果正确，仍要读完整复盘。'
    : '你的选择与历史不同。分数衡量思路接近程度，不是简单判定对错。';
  $('actualText').textContent = question.actual_text;
  $('whyText').textContent = question.why;
  $('quoteText').textContent = question.quote;
  $('quoteSource').textContent = `${question.source}｜决策年份 ${question.year}`;
  $('quoteYear').textContent = `${question.quote_year}年股东信`;
  $('lessonText').textContent = question.lesson;
  $('nextBtn').querySelector('span').textContent = state.index === GAME_DATA.length - 1 ? '查看我的契合度' : '下一个历史现场';
}

function selectOption(index) {
  if (state.answers[state.index]) return;
  const question = GAME_DATA[state.index];
  const option = question.options[index];
  state.answers[state.index] = { choice: index, score: option.score, dims: [...option.dims] };
  saveState();
  renderQuestion();
  const sameAsHistory = index === question.actual;
  showToast(sameAsHistory ? '与历史选择一致，看看为什么' : '选择已锁定，历史答案揭晓');
  playNotes(sameAsHistory ? [523, 659, 784] : [440, 554], .08);
  if (motion && sameAsHistory) launchConfetti(question.color);
}

function nextQuestion() {
  if (!state.answers[state.index]) {
    showToast('请先锁定一个选择');
    return;
  }
  if (state.index < GAME_DATA.length - 1) {
    state.index += 1;
    saveState();
    showScreen('game');
    renderQuestion();
  } else {
    showEnd();
  }
}

function computeScores() {
  const answers = state.answers.filter(Boolean);
  const average = values => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
  const score = Math.round(average(answers.map(answer => answer.score)));
  const dimensions = DIMENSIONS.map((_, index) => Math.round(average(answers.map(answer => Number(answer.dims[index]) || 0))));
  return { score, dimensions };
}

function showEnd(countForBest = true) {
  const { score, dimensions } = computeScores();
  state.index = 10;
  if (countForBest) state.best = Math.max(state.best || 0, score);
  saveState();
  showScreen('end');
  document.title = `${score}分 · 你的长期决策画像｜Decision Atlas`;
  $('finalScore').textContent = '0';
  $('scoreRing').style.setProperty('--score', 0);
  const profile = score >= 90
    ? ['长期主义同路人', '你倾向于先理解企业，再权衡价格、风险与时间。也请保留一份清醒：历史契合并不保证结果。']
    : score >= 75
      ? ['资本配置思路相近', '你已经抓住多数关键原则。复盘那些不同选择，看看是质量、价格、风险边界还是耐心改变了答案。']
      : score >= 60
        ? ['部分同频，继续修炼', '你正在形成自己的决策框架。把每次选择背后的理由说清楚，比记住历史答案更有价值。']
        : ['换个角度，再看一局', '这是一次思路校准，而不是考试。试着少问“会涨吗”，多问“企业如何创造价值、代价是什么”。'];
  $('scoreTitle').textContent = profile[0];
  $('scoreDescription').textContent = profile[1];
  $('bestScore').textContent = `本机最佳：${state.best || score} 分 · 进度仅保存在此浏览器`;

  $('dimensionBars').replaceChildren();
  dimensions.forEach((value, index) => {
    const row = makeElement('div', 'dimension-row');
    row.appendChild(makeElement('span', '', DIMENSIONS[index]));
    const track = makeElement('div', 'dimension-track');
    const bar = makeElement('i');
    track.appendChild(bar);
    row.appendChild(track);
    row.appendChild(makeElement('b', '', String(value)));
    $('dimensionBars').appendChild(row);
    requestAnimationFrame(() => { bar.style.width = `${value}%`; });
  });
  buildReview();
  animateScore(score);
  playNotes([392, 523, 659, 784], .1);
}

function animateScore(target) {
  if (!motion) {
    $('finalScore').textContent = target;
    $('scoreRing').style.setProperty('--score', target);
    return;
  }
  const start = performance.now();
  const duration = 1250;
  function frame(now) {
    const progress = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(target * eased);
    $('finalScore').textContent = current;
    $('scoreRing').style.setProperty('--score', current);
    if (progress < 1 && !screens.end.hidden) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

function buildReview() {
  $('reviewList').replaceChildren();
  GAME_DATA.forEach((question, index) => {
    const answer = state.answers[index];
    if (!answer) return;
    const details = makeElement('details', 'review-item');
    const summary = makeElement('summary');
    summary.appendChild(makeElement('span', 'review-year', question.year));
    summary.appendChild(makeElement('span', 'review-title', question.title));
    summary.appendChild(makeElement('span', 'review-score', `${answer.score}分`));
    summary.appendChild(makeElement('span', 'review-toggle', '＋'));
    details.appendChild(summary);
    const content = makeElement('div', 'review-content');
    content.appendChild(makeElement('p', '', `你的选择：${question.options[answer.choice].title}`));
    const actual = makeElement('p');
    actual.appendChild(makeElement('strong', '', '历史做法：'));
    actual.appendChild(document.createTextNode(question.actual_text));
    content.appendChild(actual);
    content.appendChild(makeElement('p', '', `本题要点：${question.lesson}`));
    content.appendChild(makeElement('blockquote', '', `${question.quote} — ${question.quote_year}年股东信`));
    details.appendChild(content);
    $('reviewList').appendChild(details);
  });
}

function launchConfetti(accent) {
  const colors = ['#2d6cdf', '#149ba6', '#e7b44a', accent || '#ef7d72', '#ffffff'];
  for (let i = 0; i < 34; i++) {
    const piece = makeElement('i', 'confetti');
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.background = colors[i % colors.length];
    piece.style.setProperty('--duration', `${2.2 + Math.random() * 1.7}s`);
    piece.style.setProperty('--delay', `${Math.random() * .35}s`);
    piece.style.setProperty('--drift', `${(Math.random() - .5) * 240}px`);
    piece.style.transform = `rotate(${Math.random() * 180}deg)`;
    $('confettiLayer').appendChild(piece);
    setTimeout(() => piece.remove(), 4500);
  }
}

function getAudioContext() {
  if (!audioContext) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    audioContext = new AudioContextClass();
  }
  if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
  return audioContext;
}

function playNotes(notes, duration = .07) {
  if (!soundEnabled) return;
  const context = getAudioContext();
  if (!context) return;
  notes.forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const start = context.currentTime + index * duration * .85;
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(.0001, start);
    gain.gain.exponentialRampToValueAtTime(.035, start + .018);
    gain.gain.exponentialRampToValueAtTime(.0001, start + duration * 1.8);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + duration * 1.9);
  });
}

function openInfo(mode = 'sources') {
  $('dialogBody').replaceChildren();
  if (mode === 'scoring') {
    $('dialogTitle').textContent = '契合度如何计算';
    const intro = makeElement('p', '', '每题先锁定选择，再揭晓历史答案。总契合度是十个选项思路分的平均值；四个维度分别是商业质量、价格纪律、风险边界和长期耐心。分数不是投资能力评级，也不使用事后股价。');
    $('dialogBody').appendChild(intro);
    $('dialogBody').appendChild(makeElement('h3', '', '为什么和历史相同可得100分？'));
    $('dialogBody').appendChild(makeElement('p', '', '因为本游戏衡量的是与巴菲特当年思路的接近程度，而不是结果对错。Dexter 一题中，历史选择本身后来被巴菲特承认为错误，这正是最重要的复盘。'));
    $('dialogBody').appendChild(makeElement('h3', '', '四个维度'));
    const list = makeElement('ol');
    ['商业质量：定价权、成本优势、客户价值与管理者。', '价格纪律：支付多少、用什么支付，以及是否保留安全边际。', '风险边界：流动性、集中度、杠杆和不可逆后果。', '长期耐心：能否让企业、管理团队和时间共同发挥作用。'].forEach(text => list.appendChild(makeElement('li', '', text)));
    $('dialogBody').appendChild(list);
  } else {
    $('dialogTitle').textContent = '十段原文与素材出处';
    $('dialogBody').appendChild(makeElement('p', '', '所有题目均来自本地股东信材料。决策年份与引文所在股东信年份分别标注；每段英文引文不超过两句。网页不放外部链接。'));
    GAME_DATA.forEach(question => {
      const item = makeElement('div', 'source-item');
      item.appendChild(makeElement('strong', '', `${String(question.id).padStart(2, '0')} · ${question.year}｜${question.kicker}`));
      item.appendChild(makeElement('span', '', `${question.source}；引文为${question.quote_year}年股东信。`));
      item.appendChild(makeElement('em', '', question.quote));
      $('dialogBody').appendChild(item);
    });
    $('dialogBody').appendChild(makeElement('p', '', '画面使用Three.js 0.160.0与抽象几何体，库文件随游戏本地提供。无公司标志、无国旗、无外部图片、无当前证券交易内容。'));
  }
  const dialog = $('infoDialog');
  if (typeof dialog.showModal === 'function') dialog.showModal();
  else dialog.setAttribute('open', '');
}

function closeInfo() {
  const dialog = $('infoDialog');
  if (typeof dialog.close === 'function') dialog.close();
  else dialog.removeAttribute('open');
}

function applyMotionPreference() {
  document.body.classList.toggle('reduced-motion', !motion);
  $('motionBtn').textContent = motion ? '动效 开' : '动效 关';
  $('motionBtn').setAttribute('aria-pressed', String(motion));
  scene.setReducedMotion(!motion);
}

$('startBtn').addEventListener('click', newGame);
$('continueBtn').addEventListener('click', continueGame);
$('nextBtn').addEventListener('click', nextQuestion);
$('restartBtn').addEventListener('click', newGame);
$('homeBtn').addEventListener('click', () => {
  showScreen('start');
  document.title = '和巴菲特一起做决定｜Decision Atlas';
  updateContinue();
});
$('reviewBtn').addEventListener('click', () => {
  const show = $('reviewSection').hidden;
  $('reviewSection').hidden = !show;
  $('reviewBtn').textContent = show ? '收起逐题复盘' : '查看逐题复盘';
  if (show) setTimeout(() => $('reviewSection').scrollIntoView({ behavior: motion ? 'smooth' : 'auto', block: 'start' }), 50);
});
$('sourcesBtn').addEventListener('click', () => openInfo('sources'));
$('endSourcesBtn').addEventListener('click', () => openInfo('sources'));
$('howBtn').addEventListener('click', () => openInfo('scoring'));
$('closeDialog').addEventListener('click', closeInfo);
$('infoDialog').addEventListener('click', event => {
  if (event.target === $('infoDialog')) closeInfo();
});
$('motionBtn').addEventListener('click', () => {
  motion = !motion;
  applyMotionPreference();
  saveState();
  showToast(motion ? '电影动效已开启' : '已减少动效');
});
$('soundBtn').addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  $('soundBtn').textContent = soundEnabled ? '声音 开' : '声音 关';
  $('soundBtn').setAttribute('aria-pressed', String(soundEnabled));
  if (soundEnabled) playNotes([523, 659], .08);
  showToast(soundEnabled ? '声音已开启' : '已静音');
});

document.addEventListener('keydown', event => {
  if ($('infoDialog').open || screens.game.hidden) return;
  const answer = state.answers[state.index];
  if (!answer && ['1', '2', '3'].includes(event.key)) {
    event.preventDefault();
    selectOption(Number(event.key) - 1);
  } else if (answer && event.key === 'Enter') {
    event.preventDefault();
    nextQuestion();
  }
});

applyMotionPreference();
renderTimeline();
updateContinue();
