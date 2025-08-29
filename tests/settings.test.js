import assert from 'node:assert/strict';
import { test } from 'node:test';
import { JSDOM } from 'jsdom';
import {
  saveApiKey,
  decryptApiKey,
  resetApiKey,
  generateHistoryExport,
  importHistoryText
} from '../src/pages/settings.js';

test('saveApiKey validates inputs and stores key', async () => {
  const dom = new JSDOM('<input id="apiKey"><input id="pin"><button id="saveKey"></button><button id="decryptKey" class="hidden"></button><button id="resetKey" class="hidden"></button>');
  const { document } = dom.window;
  const apiInput = document.getElementById('apiKey');
  const pinInput = document.getElementById('pin');
  const saveBtn = document.getElementById('saveKey');
  const decryptBtn = document.getElementById('decryptKey');
  const resetBtn = document.getElementById('resetKey');
  const msgs = [];
  const setStatus = m => msgs.push(m);
  const encryptCalls = [];
  await saveApiKey(apiInput, pinInput, saveBtn, decryptBtn, resetBtn, setStatus, (key, pin) => encryptCalls.push([key, pin]));
  assert.equal(encryptCalls.length, 0);
  assert.equal(msgs.pop(), 'Please enter an API key and PIN.');
  apiInput.value = 'abc';
  pinInput.value = '1234';
  await saveApiKey(apiInput, pinInput, saveBtn, decryptBtn, resetBtn, setStatus, (key, pin) => encryptCalls.push([key, pin]));
  assert.deepEqual(encryptCalls[0], ['abc', '1234']);
  assert.equal(apiInput.value, '');
  assert.equal(pinInput.value, '');
  assert.ok(apiInput.classList.contains('hidden'));
  assert.ok(pinInput.classList.contains('hidden'));
  assert.ok(saveBtn.classList.contains('hidden'));
  assert.ok(!decryptBtn.classList.contains('hidden'));
  assert.ok(!resetBtn.classList.contains('hidden'));
  assert.equal(msgs.pop(), 'API key saved.');
});

test('decryptApiKey prompts for pin and decrypts', async () => {
  const msgs = [];
  const setStatus = m => msgs.push(m);
  const decryptCalls = [];
  await decryptApiKey(pin => { decryptCalls.push(pin); }, async () => '1111', setStatus);
  assert.deepEqual(decryptCalls, ['1111']);
  assert.deepEqual(msgs, ['Authenticating...', 'API key successfully decrypted.']);
  msgs.length = 0;
  decryptCalls.length = 0;
  await decryptApiKey(pin => { decryptCalls.push(pin); }, async () => '', setStatus);
  assert.equal(decryptCalls.length, 0);
  assert.equal(msgs[0], 'PIN required.');
});

test('resetApiKey clears storage and resets UI', async () => {
  const dom = new JSDOM('<input id="apiKey" class="hidden"><input id="pin" class="hidden"><button id="saveKey" class="hidden"></button><button id="decryptKey"></button><button id="resetKey"></button>');
  const { document } = dom.window;
  const apiInput = document.getElementById('apiKey');
  const pinInput = document.getElementById('pin');
  const saveBtn = document.getElementById('saveKey');
  const decryptBtn = document.getElementById('decryptKey');
  const resetBtn = document.getElementById('resetKey');
  const msgs = [];
  const setStatus = m => msgs.push(m);
  let cleared = false;
  await resetApiKey(apiInput, pinInput, saveBtn, decryptBtn, resetBtn, setStatus, async () => { cleared = true; });
  assert.ok(cleared);
  assert.ok(!apiInput.classList.contains('hidden'));
  assert.ok(!pinInput.classList.contains('hidden'));
  assert.ok(!saveBtn.classList.contains('hidden'));
  assert.ok(decryptBtn.classList.contains('hidden'));
  assert.ok(resetBtn.classList.contains('hidden'));
  assert.equal(msgs.pop(), 'Stored key cleared.');
});

test('generateHistoryExport builds data and filename', () => {
  const items = [{ a: 1 }];
  const now = new Date('2023-05-20T15:04:05Z');
  const { data, name } = generateHistoryExport(items, now);
  assert.equal(data, JSON.stringify(items, null, 2));
  assert.equal(name, 'yousum-20230520-150405.json');
});

test('importHistoryText parses and merges history', () => {
  const calls = [];
  const result = importHistoryText('[1,2]', arr => { calls.push(arr); return { added: 1, total: 2 }; });
  assert.deepEqual(calls[0], [1, 2]);
  assert.deepEqual(result, { added: 1, total: 2 });
  assert.throws(() => importHistoryText('bad', () => {}));
});
