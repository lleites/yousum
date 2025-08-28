import { loadHistory, deleteHistory } from './historyManager.js';
import { renderMarkdown } from './render.js';
import { summarizeNews } from './api.js';
import { askTranscript } from './api.js';
import { getKeyRecord, decryptStoredKey } from './keyManager.js';

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
    const newsBtn = document.getElementById('summarizeNews');
    const newsOut = document.getElementById('newsSummary');
    const newsPeriod = document.getElementById('newsPeriod');
    let apiKey;
    let keyClearTimer;
    const scheduleKeyClear = () => {
      if (keyClearTimer) clearTimeout(keyClearTimer);
      keyClearTimer = setTimeout(() => { apiKey = undefined; }, 120000);
    };
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) apiKey = undefined;
    });
    window.addEventListener('beforeunload', () => { apiKey = undefined; });
    if (newsBtn) {
      newsBtn.addEventListener('click', async e => {
        e.preventDefault();
        newsOut.textContent = '';
        newsPeriod.textContent = '';
        const sorted = [...items].sort((a, b) => {
          const da = new Date(a.createdAt || 0).getTime();
          const db = new Date(b.createdAt || 0).getTime();
          return db - da;
        });
        const selected = sorted.slice(0, 20);
        if (!selected.length) {
          newsOut.textContent = 'No items to summarize.';
          return;
        }
        const start = selected.reduce((min, it) => Math.min(min, new Date(it.createdAt).getTime()), Infinity);
        const end = selected.reduce((max, it) => Math.max(max, new Date(it.createdAt).getTime()), -Infinity);
        const startStr = new Date(start).toISOString().slice(0, 10);
        const endStr = new Date(end).toISOString().slice(0, 10);
        newsOut.textContent = 'Summarizing...';
        try {
          if (!apiKey) {
            const record = await getKeyRecord();
            if (!record) throw new Error('No stored API key. Use the settings page.');
            const { promptForPin } = await import('./pinPrompt.js');
            const pin = await promptForPin('Enter PIN');
            if (!pin) throw new Error('PIN required');
            apiKey = await decryptStoredKey(pin);
          }
          let result = await summarizeNews(selected, apiKey);
          result = result.replace(/^(\s*Period:[^\n]*\n?)+/i, '').trim();
          newsPeriod.textContent = `Period: ${startStr} – ${endStr} (${selected.length} videos)`;
          newsOut.innerHTML = renderMarkdown(result);
          scheduleKeyClear();
        } catch (err) {
          newsOut.textContent = 'Error: ' + err.message;
        }
      });
    }

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

      const askWrap = document.createElement('div');
      const qInput = document.createElement('input');
      qInput.type = 'text';
      qInput.placeholder = 'Ask a question';
      const askBtn = document.createElement('button');
      askBtn.textContent = 'Ask';
      const answer = document.createElement('div');
      askWrap.appendChild(qInput);
      askWrap.appendChild(askBtn);
      askWrap.appendChild(answer);
      details.appendChild(askWrap);
      qInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          e.preventDefault();
          askBtn.click();
        }
      });
      askBtn.addEventListener('click', async e => {
        e.preventDefault();
        const q = qInput.value.trim();
        if (!q) return;
        try {
          if (!apiKey) {
            const record = await getKeyRecord();
            if (!record) throw new Error('No stored API key. Use the settings page.');
            const { promptForPin } = await import('./pinPrompt.js');
            const pin = await promptForPin('Enter PIN');
            if (!pin) throw new Error('PIN required');
            apiKey = await decryptStoredKey(pin);
          }
          answer.textContent = 'Asking...';
          const ans = await askTranscript(item.transcript, q, apiKey);
          answer.innerHTML = renderMarkdown(ans);
          scheduleKeyClear();
        } catch (err) {
          answer.textContent = 'Error: ' + err.message;
        }
      });

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
