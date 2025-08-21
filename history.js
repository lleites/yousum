import { loadHistory, deleteHistory } from './historyManager.js';
import { renderMarkdown } from './render.js';

/* c8 ignore start */
if (typeof window !== 'undefined' && window.trustedTypes && !window.trustedTypes.defaultPolicy) {
  window.trustedTypes.createPolicy('default', {
    createHTML: s => s,
    createScript: s => s,
    createScriptURL: s => s
  });
}

if (typeof document !== 'undefined') {
  const init = () => {
    const list = document.getElementById('historyList');
    const items = loadHistory();
    if (!items.length) {
      const li = document.createElement('li');
      li.textContent = 'No history yet.';
      list.appendChild(li);
      return;
    }
    for (const item of items) {
      const li = document.createElement('li');
      const details = document.createElement('details');
      const summary = document.createElement('summary');

      const toggle = document.createElement('button');
      toggle.textContent = '▶';
      toggle.className = 'toggle';
      toggle.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        details.open = !details.open;
        toggle.textContent = details.open ? '▼' : '▶';
      });
      summary.appendChild(toggle);

      const titleLink = document.createElement('a');
      titleLink.href = item.url;
      titleLink.textContent = item.title;
      titleLink.target = '_blank';
      summary.appendChild(titleLink);
      summary.append(` – ${item.channel}`);

      const del = document.createElement('button');
      del.textContent = '🗑️';
      del.className = 'delete';
      del.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        if (confirm('Delete this entry?')) {
          const idx = Array.from(list.children).indexOf(li);
          deleteHistory(idx);
          li.remove();
          if (!list.children.length) {
            const empty = document.createElement('li');
            empty.textContent = 'No history yet.';
            list.appendChild(empty);
          }
        }
      });
      summary.appendChild(del);

      details.appendChild(summary);
      const content = document.createElement('div');
      content.innerHTML = renderMarkdown(item.summary);
      details.appendChild(content);
      li.appendChild(details);
      list.appendChild(li);
    }
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}
/* c8 ignore end */
