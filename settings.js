/* c8 ignore file */
import { encryptAndStoreKey, decryptStoredKey, getKeyRecord, clearStorage } from './keyManager.js';
import { loadHistory, mergeHistory } from './historyManager.js';

function showError(message) {
  const status = document.getElementById('status');
  const logEl = document.getElementById('log');
  if (status) status.textContent = 'Error: ' + message;
  if (logEl) logEl.textContent += 'Error: ' + message + '\n';
}

window.addEventListener('error', (e) => showError(e.error?.message || e.message));
window.addEventListener('unhandledrejection', (e) => {
  e.preventDefault();
  const msg = e.reason?.message || e.reason;
  showError(msg);
});

if (typeof window !== 'undefined' && window.trustedTypes && !window.trustedTypes.defaultPolicy) {
  window.trustedTypes.createPolicy('default', {
    createHTML: s => s,
    createScript: s => s,
    createScriptURL: s => s
  });
}

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
      const key = apiInput.value.trim();
      const pin = pinInput.value;
      if (!key || !pin) {
        setStatus('Please enter an API key and PIN.');
        return;
      }
      try {
        setStatus('Saving key...');
        await encryptAndStoreKey(key, pin);
        apiInput.value = '';
        pinInput.value = '';
        apiInput.classList.add('hidden');
        pinInput.classList.add('hidden');
        saveBtn.classList.add('hidden');
        decryptBtn.classList.remove('hidden');
        resetBtn.classList.remove('hidden');
        setStatus('API key saved.');
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
      const pin = await promptForPin('Enter PIN');
      if (!pin) {
        setStatus('PIN required.');
        return;
      }
      try {
        setStatus('Authenticating...');
        await decryptStoredKey(pin);
        setStatus('API key successfully decrypted.');
      } catch (e) {
        showError(e.message);
      }
    });

    resetBtn.addEventListener('click', async () => {
      await clearStorage();
      apiInput.classList.remove('hidden');
      pinInput.classList.remove('hidden');
      saveBtn.classList.remove('hidden');
      decryptBtn.classList.add('hidden');
      resetBtn.classList.add('hidden');
      setStatus('Stored key cleared.');
    });

    const exportBtn = document.getElementById('exportHistory');
    const importBtn = document.getElementById('importHistory');
    const fileInput = document.getElementById('importFile');

    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        const items = loadHistory();
        const data = JSON.stringify(items, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const now = new Date();
        const pad = n => String(n).padStart(2, '0');
        const name = `yousum-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}.json`;
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
          const entries = JSON.parse(text);
          const { added, total } = mergeHistory(Array.isArray(entries) ? entries : []);
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
