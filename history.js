import { loadHistory } from './historyManager.js';
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
  document.addEventListener('DOMContentLoaded', () => {
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
      const titleLink = document.createElement('a');
      titleLink.href = item.url;
      titleLink.textContent = item.title;
      titleLink.target = '_blank';
      summary.appendChild(titleLink);
      summary.append(` – ${item.channel}`);
      details.appendChild(summary);
      const content = document.createElement('div');
      content.innerHTML = renderMarkdown(item.summary);
      details.appendChild(content);
      li.appendChild(details);
      list.appendChild(li);
    }
  });
}
/* c8 ignore end */
