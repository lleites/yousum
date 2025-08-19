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

export async function getKeyRecord() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(KEY_STORE, 'readonly');
    const req = tx.objectStore(KEY_STORE).get('apiKey');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function clearStorage() {
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

export async function encryptAndStoreKey(apiKey) {
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

export async function decryptStoredKey() {
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

