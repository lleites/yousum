import { encryptAndStoreKey, decryptStoredKey, getKeyRecord, clearStorage } from './keyManager.js';
import { loadHistory, mergeHistory } from './historyManager.js';

export function generateHistoryExport(items, now = new Date()) {
  const data = JSON.stringify(items, null, 2);
  const pad = n => String(n).padStart(2, '0');
  const name = `yousum-${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}-${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}.json`;
  return { data, name };
}

export function importHistoryText(text, mergeFn = mergeHistory) {
  const entries = JSON.parse(text);
  return mergeFn(Array.isArray(entries) ? entries : []);
}

export async function saveApiKey(apiInput, pinInput, saveBtn, decryptBtn, resetBtn, setStatus, encryptFn = encryptAndStoreKey) {
  const key = apiInput.value.trim();
  const pin = pinInput.value;
  if (!key || !pin) {
    setStatus('Please enter an API key and PIN.');
    return;
  }
  await encryptFn(key, pin);
  apiInput.value = '';
  pinInput.value = '';
  apiInput.classList.add('hidden');
  pinInput.classList.add('hidden');
  saveBtn.classList.add('hidden');
  decryptBtn.classList.remove('hidden');
  resetBtn.classList.remove('hidden');
  setStatus('API key saved.');
}

export async function decryptApiKey(decryptFn, promptForPinFn, setStatus) {
  const pin = await promptForPinFn('Enter PIN');
  if (!pin) {
    setStatus('PIN required.');
    return;
  }
  setStatus('Authenticating...');
  await decryptFn(pin);
  setStatus('API key successfully decrypted.');
}

export async function resetApiKey(apiInput, pinInput, saveBtn, decryptBtn, resetBtn, setStatus, clearFn = clearStorage) {
  await clearFn();
  apiInput.classList.remove('hidden');
  pinInput.classList.remove('hidden');
  saveBtn.classList.remove('hidden');
  decryptBtn.classList.add('hidden');
  resetBtn.classList.add('hidden');
  setStatus('Stored key cleared.');
}

/* c8 ignore start */
function showError(message) {
  const status = document.getElementById('status');
  const logEl = document.getElementById('log');
  if (status) status.textContent = 'Error: ' + message;
  if (logEl) logEl.textContent += 'Error: ' + message + '\n';
}
if (typeof window !== 'undefined') {
  window.addEventListener('error', (e) => showError(e.error?.message || e.message));
  window.addEventListener('unhandledrejection', (e) => {
    e.preventDefault();
    const msg = e.reason?.message || e.reason;
    showError(msg);
  });
}

if (typeof window !== 'undefined' && window.trustedTypes && !window.trustedTypes.defaultPolicy) {
  window.trustedTypes.createPolicy('default', {
    createHTML: s => s,
    createScript: s => s,
    createScriptURL: s => s
  });
}
/* c8 ignore end */

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', async () => {
    const apiInput = document.getElementById('apiKey');
    const saveBtn = document.getElementById('saveKey');
    const decryptBtn = document.getElementById('decryptKey');
    const resetBtn = document.getElementById('resetKey');
    const pinInput = document.getElementById('pin');
    const status = document.getElementById('status');
    const logEl = document.getElementById('log');
    const setStatus = msg => {
      status.textContent = msg;
      if (logEl) logEl.textContent += msg + '\n';
    };

    const stored = await getKeyRecord();
    if (stored) {
      apiInput.classList.add('hidden');
      pinInput.classList.add('hidden');
      saveBtn.classList.add('hidden');
      decryptBtn.classList.remove('hidden');
      resetBtn.classList.remove('hidden');
      setStatus('API key stored.');
    }

    saveBtn.addEventListener('click', async () => {
      try {
        setStatus('Saving key...');
        await saveApiKey(apiInput, pinInput, saveBtn, decryptBtn, resetBtn, setStatus);
      } catch (e) {
        showError(e.message);
      }
    });
    apiInput.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !saveBtn.classList.contains('hidden')) saveBtn.click();
    });
    pinInput.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !saveBtn.classList.contains('hidden')) saveBtn.click();
    });

    decryptBtn.addEventListener('click', async () => {
      const { promptForPin } = await import('./pinPrompt.js');
      try {
        await decryptApiKey(decryptStoredKey, promptForPin, setStatus);
      } catch (e) {
        showError(e.message);
      }
    });

    resetBtn.addEventListener('click', async () => {
      await resetApiKey(apiInput, pinInput, saveBtn, decryptBtn, resetBtn, setStatus);
    });

    const exportBtn = document.getElementById('exportHistory');
    const importBtn = document.getElementById('importHistory');
    const fileInput = document.getElementById('importFile');

    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        const items = loadHistory();
        const { data, name } = generateHistoryExport(items);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        setStatus('History exported.');
      });
    }

    if (importBtn && fileInput) {
      importBtn.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', async () => {
        const file = fileInput.files && fileInput.files[0];
        if (!file) return;
        try {
          const text = await file.text();
          const { added, total } = importHistoryText(text, mergeHistory);
          setStatus(`Imported ${added} new item(s). Total: ${total}.`);
        } catch (e) {
          showError(e.message || 'Invalid file');
        } finally {
          fileInput.value = '';
        }
      });
    }
  });
}
