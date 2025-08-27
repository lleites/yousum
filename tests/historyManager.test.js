import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addHistory, loadHistory, deleteHistory, mergeHistory } from '../historyManager.js';

class FakeStorage {
  constructor() { this.store = {}; }
  getItem(k) { return Object.prototype.hasOwnProperty.call(this.store, k) ? this.store[k] : null; }
  setItem(k, v) { this.store[k] = String(v); }
  removeItem(k) { delete this.store[k]; }
}

const originalStorage = global.localStorage;

test('addHistory stores and loadHistory retrieves entries', () => {
  global.localStorage = new FakeStorage();
  addHistory({ title: 't', channel: 'c', url: 'u', summary: 's', transcript: 'tr' });
  const items = loadHistory();
  assert.equal(items.length, 1);
  assert.equal(items[0].title, 't');
  global.localStorage = originalStorage;
});

test('loadHistory returns empty array when storage empty', () => {
  global.localStorage = new FakeStorage();
  assert.deepEqual(loadHistory(), []);
  global.localStorage = originalStorage;
});

test('deleteHistory removes entry by index', () => {
  global.localStorage = new FakeStorage();
  addHistory({ title: 't1', channel: 'c1', url: 'u1', summary: 's1' });
  addHistory({ title: 't2', channel: 'c2', url: 'u2', summary: 's2' });
  deleteHistory(0);
  const items = loadHistory();
  assert.equal(items.length, 1);
  assert.equal(items[0].title, 't1');
  global.localStorage = originalStorage;
});

test('mergeHistory adds only new URLs and appends', () => {
  global.localStorage = new FakeStorage();
  addHistory({ title: 't1', channel: 'c1', url: 'u1', summary: 's1' });
  const result = mergeHistory([
    { title: 't1-dup', channel: 'c1', url: 'u1', summary: 's1x' },
    { title: 't2', channel: 'c2', url: 'u2', summary: 's2' }
  ]);
  assert.equal(result.added, 1);
  const items = loadHistory();
  assert.equal(items.length, 2);
  assert.equal(items[0].url, 'u1');
  assert.equal(items[1].url, 'u2');
  global.localStorage = originalStorage;
});

test('mergeHistory handles empty or invalid input', () => {
  global.localStorage = new FakeStorage();
  addHistory({ title: 't1', channel: 'c1', url: 'u1', summary: 's1' });
  const r1 = mergeHistory([]);
  assert.equal(r1.added, 0);
  const r2 = mergeHistory(null);
  assert.equal(r2.added, 0);
  const r3 = mergeHistory([{ title: 'no-url' }]);
  assert.equal(r3.added, 0);
  global.localStorage = originalStorage;
});
