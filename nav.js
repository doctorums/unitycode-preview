/* ═══════════════════════════════════════════════════════
   UNITYCODE — nav.js  v7.6
   Автоматически проставляет класс .active на текущую ссылку
═══════════════════════════════════════════════════════ */
(function () {
  const file = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('nav a').forEach(a => {
    const href = a.getAttribute('href');
    if (href === file || (file === '' && href === 'index.html')) {
      a.classList.add('active');
    }
  });
})();
