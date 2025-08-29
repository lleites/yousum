import { test } from 'node:test';
import assert from 'node:assert/strict';

// Ensure history.js creates a default Trusted Types policy when needed
// and does not throw during import in a non-browser environment.
test('history.js sets trusted types policy', async () => {
  let created = false;
  global.window = {
    trustedTypes: {
      defaultPolicy: null,
      createPolicy(name, rules) {
        created = true;
        return {};
      }
    }
  };
  global.document = { addEventListener: () => {}, readyState: 'loading' };
  await import('../src/pages/history.js?policy');
  assert.ok(created, 'expected policy to be created');
  delete global.window;
  delete global.document;
});

test('history.js initializes if DOM is already loaded', async () => {
  const { JSDOM } = await import('jsdom');
  const dom = new JSDOM('<ul id="historyList"></ul>');
  Object.defineProperty(dom.window.document, 'readyState', { value: 'complete', configurable: true });
  global.window = dom.window;
  global.document = dom.window.document;
  global.localStorage = {
    getItem() {
      return JSON.stringify([{ url: 'u', title: 't', channel: 'c', summary: 's' }]);
    },
    setItem() {}
  };
  await import('../src/pages/history.js?init');
  assert.equal(dom.window.document.querySelectorAll('li').length, 1);
  delete global.window;
  delete global.document;
  delete global.localStorage;
});

test('history.js delete button removes entry', async () => {
  const { JSDOM } = await import('jsdom');
  const dom = new JSDOM('<ul id="historyList"></ul>');
  Object.defineProperty(dom.window.document, 'readyState', { value: 'complete', configurable: true });
  global.window = dom.window;
  global.document = dom.window.document;
  global.confirm = () => true;
  global.localStorage = {
    data: [{ url: 'u', title: 't', channel: 'c', summary: 's' }],
    getItem() { return JSON.stringify(this.data); },
    setItem(_k, v) { this.data = JSON.parse(v); }
  };
  await import('../src/pages/history.js?delete');
  dom.window.document.querySelector('button.delete').click();
  const list = dom.window.document.querySelectorAll('li');
  assert.equal(list.length, 1);
  assert.equal(list[0].textContent, 'No history yet.');
  delete global.window;
  delete global.document;
  delete global.localStorage;
  delete global.confirm;
});

import { selectRecent, calculatePeriod } from '../src/pages/history.js';

test('selectRecent sorts by date and limits results', () => {
  const items = [
    { createdAt: '2020-01-01', id: 1 },
    { createdAt: '2020-01-03', id: 3 },
    { createdAt: '2020-01-02', id: 2 }
  ];
  const res = selectRecent(items, 2);
  assert.deepEqual(res.map(i => i.id), [3, 2]);
});

test('calculatePeriod returns ISO date range', () => {
  const items = [
    { createdAt: '2020-01-04T00:00:00Z' },
    { createdAt: '2020-01-02T00:00:00Z' },
    { createdAt: '2020-01-03T00:00:00Z' }
  ];
  const period = calculatePeriod(items);
  assert.deepEqual(period, { startStr: '2020-01-02', endStr: '2020-01-04' });
  assert.deepEqual(calculatePeriod([]), { startStr: '', endStr: '' });
});
