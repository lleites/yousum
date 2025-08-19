import { encryptAndStoreKey, decryptStoredKey, getKeyRecord, clearStorage } from './keyManager.js';

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
    const status = document.getElementById('status');

    const stored = await getKeyRecord();
    if (stored) {
      apiInput.style.display = 'none';
      saveBtn.style.display = 'none';
      decryptBtn.style.display = 'inline';
      resetBtn.style.display = 'inline';
      status.textContent = 'Encrypted API key stored.';
    }

    saveBtn.addEventListener('click', async () => {
      const key = apiInput.value.trim();
      if (!key) {
        status.textContent = 'Please enter an API key.';
        return;
      }
      try {
        status.textContent = 'Saving key...';
        await encryptAndStoreKey(key);
        apiInput.value = '';
        apiInput.style.display = 'none';
        saveBtn.style.display = 'none';
        decryptBtn.style.display = 'inline';
        resetBtn.style.display = 'inline';
        status.textContent = 'API key saved and encrypted.';
      } catch (e) {
        status.textContent = 'Error: ' + e.message;
      }
    });

    decryptBtn.addEventListener('click', async () => {
      try {
        status.textContent = 'Authenticating...';
        const key = await decryptStoredKey();
        status.textContent = 'API key successfully decrypted.';
      } catch (e) {
        status.textContent = 'Error: ' + e.message;
      }
    });

    resetBtn.addEventListener('click', async () => {
      await clearStorage();
      apiInput.style.display = 'inline';
      saveBtn.style.display = 'inline';
      decryptBtn.style.display = 'none';
      resetBtn.style.display = 'none';
      status.textContent = 'Stored key cleared.';
    });
  });
}
