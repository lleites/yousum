const DB_NAME = 'yousum-config';
const DB_VERSION = 2;
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
    },
    extensions: { largeBlob: { support: true } }
  };
  const cred = await navigator.credentials.create({ publicKey });
  const supported = cred.getClientExtensionResults?.().largeBlob?.supported;
  if (!supported) {
    throw new Error('WebAuthn largeBlob extension not supported in this browser');
  }
  await storeCredId(cred.rawId);
}

export async function encryptAndStoreKey(apiKey) {
  let credId = await getCredId();
  if (!credId) {
    await registerPasskey();
    credId = await getCredId();
  }

  const encoded = new TextEncoder().encode(apiKey);
  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      allowCredentials: [{ id: credId, type: 'public-key' }],
      userVerification: 'required',
      extensions: { largeBlob: { write: encoded } }
    }
  });
  const written = assertion.getClientExtensionResults()?.largeBlob?.written;
  if (!written) {
    throw new Error('Failed to store data in largeBlob');
  }

  await storeKeyRecord({ createdAt: Date.now() });
}

export async function decryptStoredKey() {
  const record = await getKeyRecord();
  if (!record) throw new Error('No stored key');

  const credId = await getCredId();
  if (!credId) throw new Error('No credential');

  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      allowCredentials: [{ id: credId, type: 'public-key' }],
      userVerification: 'required',
      extensions: { largeBlob: { read: true } }
    }
  });
  const blob = assertion.getClientExtensionResults()?.largeBlob?.blob;
  if (!blob) {
    throw new Error('Failed to read data from largeBlob');
  }
  return new TextDecoder().decode(new Uint8Array(blob));
}

