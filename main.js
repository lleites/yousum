export function parseVideoId(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtu.be')) {
      return u.pathname.slice(1);
    }
    if (u.hostname.includes('youtube.com')) {
      return u.searchParams.get('v');
    }
  } catch {
    // ignore
  }
  return null;
}

async function parseHtml(html) {
  if (typeof DOMParser !== 'undefined') {
    return new DOMParser().parseFromString(html, 'text/html');
  }
  const { JSDOM } = await import('jsdom');
  return new JSDOM(html).window.document;
}

export async function fetchTranscript(videoId) {
  const url = `https://youtubetotranscript.com/transcript?v=${videoId}`;
  let html;
  if (typeof window === 'undefined') {
    const { spawnSync } = await import('node:child_process');
    const result = spawnSync('curl', ['-s', '-A', 'Mozilla/5.0', url], { encoding: 'utf8' });
    if (result.status !== 0) throw new Error('Transcript not available');
    html = result.stdout;
  } else {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) throw new Error('Transcript not available');
    html = await res.text();
  }
  const doc = await parseHtml(html);
  const segments = Array.from(doc.querySelectorAll('span[data-start]'));
  if (!segments.length) throw new Error('Transcript not found');
  const transcript = segments.map(s => s.textContent.trim()).join(' ');
  let title = '';
  const titleEl = doc.querySelector('title');
  if (titleEl) {
    const raw = titleEl.textContent.trim();
    const m = raw.match(/^Transcript of (.+?) - YouTubeToTranscript.com$/);
    title = m ? m[1] : raw;
  }
  return { transcript, title };
}

async function summarize(text, apiKey) {
  const promptRes = await fetch('prompt.md');
  if (!promptRes.ok) throw new Error('Prompt not found');
  const prompt = await promptRes.text();
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-5-mini',
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: text }
      ]
    })
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err);
  }
  const json = await res.json();
  return json.choices[0].message.content.trim();
}

const DB_NAME = 'yousum-config';
const KEY_STORE = 'keys.store';
const WEBAUTHN_STORE = 'webauthn';

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(KEY_STORE)) db.createObjectStore(KEY_STORE);
      if (!db.objectStoreNames.contains(WEBAUTHN_STORE)) db.createObjectStore(WEBAUTHN_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function storeCredId(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(WEBAUTHN_STORE, 'readwrite');
    tx.objectStore(WEBAUTHN_STORE).put(id, 'credId');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getCredId() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(WEBAUTHN_STORE, 'readonly');
    const req = tx.objectStore(WEBAUTHN_STORE).get('credId');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function storeKeyRecord(record) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(KEY_STORE, 'readwrite');
    tx.objectStore(KEY_STORE).put(record, 'apiKey');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getKeyRecord() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(KEY_STORE, 'readonly');
    const req = tx.objectStore(KEY_STORE).get('apiKey');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function clearStorage() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([KEY_STORE, WEBAUTHN_STORE], 'readwrite');
    tx.objectStore(KEY_STORE).delete('apiKey');
    tx.objectStore(WEBAUTHN_STORE).delete('credId');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function registerPasskey() {
  const publicKey = {
    challenge: crypto.getRandomValues(new Uint8Array(32)),
    rp: { name: 'YouSum' },
    user: {
      id: crypto.getRandomValues(new Uint8Array(32)),
      name: 'local',
      displayName: 'local'
    },
    pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
    authenticatorSelection: {
      authenticatorAttachment: 'platform',
      userVerification: 'required'
    },
    extensions: { prf: { enable: true } }
  };
  const cred = await navigator.credentials.create({ publicKey });
  await storeCredId(cred.rawId);
}

async function deriveAesKey(salt) {
  const credId = await getCredId();
  if (!credId) throw new Error('No credential');
  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      allowCredentials: [{ id: credId, type: 'public-key' }],
      userVerification: 'required',
      extensions: { prf: { eval: { first: salt } } }
    }
  });
  const exts = assertion.getClientExtensionResults();
  const prfBytes = exts?.prf?.results?.first;
  if (!prfBytes) throw new Error('PRF not supported');
  const base = await crypto.subtle.importKey('raw', prfBytes, 'HKDF', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt, info: new Uint8Array([]) },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function encryptAndStoreKey(apiKey) {
  let credId = await getCredId();
  if (!credId) {
    await registerPasskey();
  }
  const salt = crypto.getRandomValues(new Uint8Array(32));
  const aesKey = await deriveAesKey(salt);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(apiKey);
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aesKey, encoded);
  await storeKeyRecord({
    ciphertext: Array.from(new Uint8Array(ciphertext)),
    iv: Array.from(iv),
    salt: Array.from(salt),
    createdAt: Date.now()
  });
}

async function decryptStoredKey() {
  const record = await getKeyRecord();
  if (!record) throw new Error('No stored key');
  const { ciphertext, iv, salt } = record;
  const aesKey = await deriveAesKey(new Uint8Array(salt));
  const buffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(iv) },
    aesKey,
    new Uint8Array(ciphertext)
  );
  return new TextDecoder().decode(buffer);
}

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
    const decryptBtn = document.getElementById('decryptKey');
    const resetBtn = document.getElementById('resetKey');
    const status = document.getElementById('status');
    let apiKey = '';
    const stored = await getKeyRecord();
    if (stored) {
      apiInput.style.display = 'none';
      decryptBtn.style.display = 'block';
      resetBtn.style.display = 'block';
      status.textContent = 'Encrypted API key stored.';
    }

    decryptBtn.addEventListener('click', async () => {
      try {
        status.textContent = 'Authenticating...';
        apiKey = await decryptStoredKey();
        status.textContent = 'API key decrypted.';
        decryptBtn.style.display = 'none';
      } catch (e) {
        status.textContent = 'Error: ' + e.message;
      }
    });

    resetBtn.addEventListener('click', async () => {
      await clearStorage();
      apiKey = '';
      apiInput.value = '';
      apiInput.style.display = 'block';
      decryptBtn.style.display = 'none';
      resetBtn.style.display = 'none';
      status.textContent = 'API key cleared. Enter a new key.';
    });

    document.getElementById('summarize').addEventListener('click', async () => {
      const url = document.getElementById('url').value;
      const summaryEl = document.getElementById('summary');
      summaryEl.textContent = '';
      try {
        if (!apiKey) {
          apiKey = apiInput.value.trim();
          if (!apiKey) throw new Error('No API key');
          await encryptAndStoreKey(apiKey);
          apiInput.value = '';
          apiInput.style.display = 'none';
          resetBtn.style.display = 'block';
        }
        status.textContent = 'Fetching transcript...';
        const videoId = parseVideoId(url);
        if (!videoId) throw new Error('Invalid URL');
        const { transcript, title } = await fetchTranscript(videoId);
        status.textContent = `Summarizing "${title}"...`;
        const summary = await summarize(transcript, apiKey);
        summaryEl.textContent = summary;
        status.textContent = 'Done.';
      } catch (e) {
        status.textContent = 'Error: ' + e.message;
      }
    });
  });
}

