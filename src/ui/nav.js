if (typeof document !== 'undefined') {
  const init = () => {
    const nav = document.querySelector('nav');
    if (!nav) return;
    while (nav.firstChild) nav.removeChild(nav.firstChild);
    const linkSum = document.createElement('a');
    linkSum.href = 'index.html';
    linkSum.textContent = '📝 Sum';
    const linkHistory = document.createElement('a');
    linkHistory.href = 'history.html';
    linkHistory.textContent = '📜 History';
    const linkSettings = document.createElement('a');
    linkSettings.href = 'settings.html';
    linkSettings.textContent = '⚙️';
    linkSettings.className = 'settings-link';
    linkSettings.setAttribute('aria-label', 'Settings');
    nav.appendChild(linkSum);
    nav.appendChild(linkHistory);
    nav.appendChild(linkSettings);
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}

