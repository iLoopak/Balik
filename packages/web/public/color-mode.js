/* Runs before styles/React so a saved or system choice never flashes the other palette. */
(function () {
  var preference = 'system';
  try { var saved = localStorage.getItem('balik.colorMode'); if (saved === 'dark' || saved === 'light') preference = saved; } catch (_) {}
  var dark = !window.matchMedia || window.matchMedia('(prefers-color-scheme: dark)').matches;
  var mode = preference === 'system' ? (dark ? 'dark' : 'light') : preference;
  document.documentElement.dataset.colorMode = mode;
  document.documentElement.style.colorScheme = mode;
  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', mode === 'light' ? '#f5f0e6' : '#10141f');
}());
