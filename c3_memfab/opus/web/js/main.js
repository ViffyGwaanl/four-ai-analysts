/* 入口：按依赖顺序逐个加载模块（同一时刻只有一个请求在途），
   避免简易静态服务器（如 python3 -m http.server）在并发请求下偶发重置连接。 */
const M = window.__memfab || (window.__memfab = {});
M.booted = true;

const ORDER = ['./data.js', './format.js', './chart.js', './ui.js', './app.js'];

(async () => {
  for (const m of ORDER) {
    try {
      await import(m);
    } catch (err) {
      if (window.__memfabRetry && window.__memfabRetry()) return; // 自动刷新一次
      const f = document.getElementById('fallback');
      f.querySelector('h2').textContent = '页面脚本加载失败';
      f.querySelector('p').textContent = '请刷新页面重试；若仍失败，请确认通过本地静态服务器打开本页（例如在本目录运行 python3 -m http.server）。';
      f.querySelector('.fb-detail').textContent = String(err && err.message ? err.message : err);
      f.querySelector('.fb-note').textContent = '';
      f.hidden = false;
      document.body.classList.add('is-ready', 'no-webgl');
      return;
    }
  }
})();
