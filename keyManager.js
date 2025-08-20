const DB_NAME = 'yousum-config';
const DB_VERSION = 3;
const KEY_STORE = 'keys.store';
const WEBAUTHN_STORE = 'webauthn';

function openDB() {
  return new Promise((resolve, reject) => {
    // Bump the database version when new object stores are introduced so that
    // onupgradeneeded runs for users with older databases.
    const request = indexedDB.open(DB_NAME, DB_VERSION);
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
    }
  };
  const cred = await navigator.credentials.create({ publicKey });
  await storeCredId(cred.rawId);
}

function bufToBase64(buf) {
  if (typeof btoa !== 'undefined') {
    return btoa(String.fromCharCode(...new Uint8Array(buf)));
  }
  return Buffer.from(buf).toString('base64');
}

function base64ToBuf(b64) {
  if (typeof atob !== 'undefined') {
    return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  }
  return new Uint8Array(Buffer.from(b64, 'base64'));
}

async function deriveKey(pin, salt) {
  const enc = new TextEncoder().encode(pin);
  const baseKey = await crypto.subtle.importKey('raw', enc, 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptAndStoreKey(apiKey, pin) {
  let credId = await getCredId();
  if (!credId && navigator.credentials) {
    try {
      await registerPasskey();
      credId = await getCredId();
    } catch {}
  }
  if (credId && navigator.credentials) {
    await navigator.credentials.get({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        allowCredentials: [{ id: credId, type: 'public-key' }],
        userVerification: 'required'
      }
    });
  }
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(pin, salt);
  const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(apiKey));
  await storeKeyRecord({
    salt: bufToBase64(salt),
    iv: bufToBase64(iv),
    data: bufToBase64(data),
    createdAt: Date.now()
  });
}

export async function decryptStoredKey(pin) {
  const record = await getKeyRecord();
  if (!record) throw new Error('No stored key');
  const credId = await getCredId();
  if (credId && navigator.credentials) {
    await navigator.credentials.get({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        allowCredentials: [{ id: credId, type: 'public-key' }],
        userVerification: 'required'
      }
    });
  }
  const salt = base64ToBuf(record.salt);
  const iv = base64ToBuf(record.iv);
  const data = base64ToBuf(record.data);
  const key = await deriveKey(pin, salt);
  let decrypted;
  try {
    decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
  } catch {
    throw new Error('Invalid PIN or corrupted data');
  }
  return new TextDecoder().decode(decrypted);
}

