const HISTORY_KEY = 'yousum-history';

export function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
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
