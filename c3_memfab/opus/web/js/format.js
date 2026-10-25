/* 数字格式（与 Excel 工作簿一致）：
   - 所有显示数字先做“十进制四舍五入、远离零”（round half away from zero，按十进制字面值而非二进制值），再 toFixed；
     例：123.705 → 123.71，156.915 → 156.92，55.25 → 55.3（1 位）。
   - 金额 2 位小数；百分比 1 位；千片最多 1 位（去掉 .0）；指数 2 位。负号用 “−”。 */

const MINUS = '−';

/* 十进制移位：借助指数记法字符串避免二进制乘法误差 */
function shiftDecimal(x, d) {
  const [m, e] = String(x).split('e');
  return Number(m + 'e' + ((e ? Number(e) : 0) + d));
}

/* 十进制四舍五入（远离零）：对绝对值取整后再恢复符号 */
export function roundHalfUp(x, d) {
  const v = Number(x);
  if (!Number.isFinite(v)) return 0;
  const a = Math.abs(v);
  const r = shiftDecimal(Math.round(shiftDecimal(a, d)), -d);
  return v < 0 ? -r : r;
}

export function fixed(v, digits) {
  const r = roundHalfUp(v, digits);
  if (r === 0) return (0).toFixed(digits);
  const s = Math.abs(r).toFixed(digits);
  return r < 0 ? MINUS + s : s;
}

export const money = (v) => fixed(v, 2);
export const index = (v) => fixed(v, 2);
/* 百分比：先按十进制把小数移两位（0.235 → 23.5），再四舍五入到 1 位 */
export const pct = (v) => fixed(shiftDecimal(Number(v) || 0, 2), 1) + '%';

/* 千片：最多 1 位小数，整数时不显示 .0 */
export function kw(v) {
  const s = fixed(v, 1);
  return s.endsWith('.0') ? s.slice(0, -2) : s;
}
