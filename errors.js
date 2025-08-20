// Surface errors on the main page so users see why actions may fail.
// (Kept as an external file so CSP can remain `script-src 'self'` without inline allowances.)
(() => {
  function append(msg) {
    const el = document.getElementById('log');
    if (el) el.textContent += String(msg) + '\n';
  }
  window.addEventListener('error', (e) => {
    append('Error: ' + (e.error?.message || e.message));
  });
  window.addEventListener('unhandledrejection', (e) => {
    e.preventDefault();
    append('Error: ' + (e.reason?.message || e.reason));
  });
})();
