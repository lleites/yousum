import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addHistory, loadHistory } from '../historyManager.js';

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
