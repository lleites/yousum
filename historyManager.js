const HISTORY_KEY = 'yousum-history';

export function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    const fallback = '2025-08-01T00:00:00.000Z';
    return Array.isArray(parsed)
      ? parsed.map(e => ({ ...e, createdAt: e && e.createdAt ? e.createdAt : fallback }))
      : [];
  } catch {
    return [];
  }
}

export function addHistory(entry) {
  const items = loadHistory();
  items.unshift(entry);
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(items));
  } catch {
    // ignore storage errors
  }
}

export function deleteHistory(index) {
  const items = loadHistory();
  items.splice(index, 1);
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(items));
  } catch {
    // ignore storage errors
  }
}

export function mergeHistory(entries) {
  if (!Array.isArray(entries) || !entries.length) return { added: 0, total: loadHistory().length };
  const existing = loadHistory();
  const seen = new Set(existing.map(e => e && e.url));
  let added = 0;
  for (const entry of entries) {
    const url = entry && entry.url;
    if (!url || seen.has(url)) continue;
    existing.push(entry);
    seen.add(url);
    added++;
  }
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(existing));
  } catch {}
  return { added, total: existing.length };
}
