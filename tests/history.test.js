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
  await import('../history.js?policy');
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
  await import('../history.js?init');
  assert.equal(dom.window.document.querySelectorAll('li').length, 1);
  delete global.window;
  delete global.document;
  delete global.localStorage;
});
