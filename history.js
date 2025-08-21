import { loadHistory } from './historyManager.js';

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
    const titleLink = document.createElement('a');
    titleLink.href = item.url;
    titleLink.textContent = item.title;
    titleLink.target = '_blank';
    li.appendChild(titleLink);
    const info = document.createElement('div');
    info.textContent = `${item.channel} – ${item.summary}`;
    li.appendChild(info);
    list.appendChild(li);
  }
});
