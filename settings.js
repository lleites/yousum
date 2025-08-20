import { encryptAndStoreKey, decryptStoredKey, getKeyRecord, clearStorage } from './keyManager.js';

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
      apiInput.style.display = 'none';
      pinInput.style.display = 'none';
      saveBtn.style.display = 'none';
      decryptBtn.style.display = 'inline';
      resetBtn.style.display = 'inline';
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
        apiInput.style.display = 'none';
        pinInput.style.display = 'none';
        saveBtn.style.display = 'none';
        decryptBtn.style.display = 'inline';
        resetBtn.style.display = 'inline';
        setStatus('API key saved.');
      } catch (e) {
        showError(e.message);
      }
    });

    decryptBtn.addEventListener('click', async () => {
      try {
        setStatus('Authenticating...');
        let key;
        try {
          key = await decryptStoredKey();
        } catch (e) {
          if (e.message === 'PIN required') {
            const pin = prompt('Enter PIN');
            if (!pin) {
              setStatus('PIN required.');
              return;
            }
            setStatus('Authenticating...');
            key = await decryptStoredKey(pin);
          } else {
            throw e;
          }
        }
        setStatus('API key successfully decrypted.');
      } catch (e) {
        showError(e.message);
      }
    });

    resetBtn.addEventListener('click', async () => {
      await clearStorage();
      apiInput.style.display = 'inline';
      pinInput.style.display = 'inline';
      saveBtn.style.display = 'inline';
      decryptBtn.style.display = 'none';
      resetBtn.style.display = 'none';
      setStatus('Stored key cleared.');
    });
  });
}
