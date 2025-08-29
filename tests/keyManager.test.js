import { test } from 'node:test';
import assert from 'node:assert/strict';
import { indexedDB } from 'fake-indexeddb';
import {
  encryptAndStoreKey,
  decryptStoredKey,
  getKeyRecord,
  clearStorage
} from '../src/services/keys.js';

global.indexedDB = indexedDB;

test('encrypts, stores and decrypts API key', async () => {
  await clearStorage();
  const key = 'super-secret';
  await encryptAndStoreKey(key, '1234');
  const record = await getKeyRecord();
  assert.ok(record.data);
  const decrypted = await decryptStoredKey('1234');
  assert.equal(decrypted, key);
  await clearStorage();
  const after = await getKeyRecord();
  assert.equal(after, undefined);
});

test('decryptStoredKey errors', async () => {
  await clearStorage();
  await assert.rejects(() => decryptStoredKey('1234'), /No stored key/);
  await encryptAndStoreKey('key', '1111');
  await assert.rejects(() => decryptStoredKey(''), /PIN required/);
  await assert.rejects(() => decryptStoredKey('2222'), /Invalid PIN or corrupted data/);
  await clearStorage();
});
