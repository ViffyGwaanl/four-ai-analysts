/* 数据访问层：所有数字均来自 window.GAME_DATA（data/game-data.js），此处只做派生，不改原值。 */

const D = window.GAME_DATA;
if (!D || !Array.isArray(D.quarters) || D.quarters.length === 0) {
  throw new Error('GAME_DATA 缺失或格式不正确');
}

export const DATA = D;
export const META = D.meta || {};
export const OPENING = D.opening || {};
export const QUARTERS = D.quarters;
export const N = QUARTERS.length;

export const UNIT_MONEY = META.unit || '十亿美元';
export const UNIT_FLOW = META.waferUnit || '千片/季';
export const UNIT_STOCK = UNIT_FLOW.split('/')[0] || '千片';

/* 视觉映射常量（不是数据值）：1 台设备模块代表 5 千片/季产能；仓库 1 个晶圆箱 = 1 千片；负债 1 块 = 1 个金额单位 */
export const TOOL_KW = 5;
export const BOX_KW = 1;
export const DEBT_BLOCK = 1;
export const HBM_LAYERS = 10; // 每座堆叠塔 10 层，每层 = 1 千片 HBM
/* 若资本开支无法推断扩产下单季，则回退为投产前 4 季（模拟引擎的建设周期） */
const LEAD_FALLBACK = 4;

const num = (v) => (Number.isFinite(+v) ? +v : 0);
export const series = (key) => QUARTERS.map((q) => num(q[key]));
const maxOf = (key, extra = []) => Math.max(...series(key), ...extra.map(num));

export const MAX = {
  capacity: maxOf('capacity', [OPENING.capacity]),
  produced: maxOf('produced'),
  hbmOutput: maxOf('hbmOutput'),
  inventoryKw: maxOf('inventoryKw', [OPENING.inventoryKw]),
  cash: maxOf('cash', [OPENING.cash]),
  debt: maxOf('debt', [OPENING.debt]),
  equity: maxOf('equity', [OPENING.equity]),
  priceIndex: maxOf('priceIndex'),
  hbmPriceIndex: maxOf('hbmPriceIndex'),
};

/* 扩产批次：产能每次上台阶 = 一期新产线；下单季 = 第 k 个“资本开支高于维持水平”的季度 */
export const EXPANSIONS = (() => {
  const capex = series('capex');
  const minCapex = Math.min(...capex);
  const orders = QUARTERS.filter((q) => num(q.capex) > minCapex + 1e-9).map((q) => ({ q: q.q, extra: num(q.capex) - minCapex }));
  const list = [];
  let prev = num(OPENING.capacity);
  for (const q of QUARTERS) {
    const cap = num(q.capacity);
    if (cap > prev + 1e-9) list.push({ onlineQ: q.q, delta: cap - prev, after: cap });
    prev = cap;
  }
  list.forEach((e, i) => {
    const o = orders[i];
    if (o && o.q < e.onlineQ) {
      e.orderQ = o.q;
      e.capexExtra = o.extra;
    } else {
      e.orderQ = Math.max(1, e.onlineQ - LEAD_FALLBACK);
      e.capexExtra = null;
    }
  });
  return list;
})();

export const BASE_CAPACITY = num(OPENING.capacity) || num(QUARTERS[0].capacity);

/* 在建扩产（下单后、投产前） */
export function underConstruction(index) {
  const qn = QUARTERS[index].q;
  return EXPANSIONS.filter((e) => qn >= e.orderQ && qn < e.onlineQ);
}

export function hbmStage(index) {
  const q = QUARTERS[index];
  if (q.hbmQualified) return { key: 'live', text: '量产中' };
  if (num(q.hbmRnd) > 0) return { key: 'rnd', text: '研发中' };
  return { key: 'cert', text: '认证中' };
}

/* 时间轴里程碑（全部由数据推断） */
export const MILESTONES = (() => {
  const out = [];
  const add = (i, text, tone) => { if (i >= 0) out.push({ i, text, tone }); };
  add(QUARTERS.findIndex((q) => q.hbmQualified), 'HBM 认证通过', 'violet');
  add(QUARTERS.findIndex((q) => num(q.netIncome) > 0), '净利润转正', 'green');
  add(QUARTERS.findIndex((q) => num(q.capacity) > BASE_CAPACITY + 1e-9), '首批新产能投产', 'cyan');
  add(QUARTERS.findIndex((q, i) => num(q.debt) <= 1e-9 && num(i === 0 ? OPENING.debt : QUARTERS[i - 1].debt) > 1e-9), '借款清零', 'coral');
  return out;
})();

/* 某季度的目标状态（扁平数值，用于补间） */
export const TWEEN_KEYS = [
  'utilization', 'capacity', 'produced', 'hbmOutput', 'hbmSold', 'inventoryKw', 'inventory',
  'cash', 'debt', 'equity', 'revenue', 'netIncome', 'priceIndex', 'hbmPriceIndex',
];

export function stateFor(index) {
  const q = QUARTERS[index];
  const s = { qf: index, hbmLit: q.hbmQualified ? 1 : 0 };
  for (const k of TWEEN_KEYS) s[k] = num(q[k]);
  EXPANSIONS.forEach((e, k) => {
    const on = q.q >= e.onlineQ;
    const site = q.q >= e.orderQ && !on;
    s['on' + k] = on ? 1 : 0;
    s['site' + k] = site ? 1 : 0;
    s['prog' + k] = on ? 1 : site ? (q.q - e.orderQ + 1) / (e.onlineQ - e.orderQ + 1) : 0;
  });
  return s;
}
