import { test } from 'node:test';
import assert from 'node:assert/strict';

test('news summary button shows message when no items', async () => {
  const { JSDOM } = await import('jsdom');
  const dom = new JSDOM('<section id="news-summary-section"><button id="summarizeNews"></button><span id="newsPeriod"></span><div id="newsSummary"></div></section><ul id="historyList"></ul>');
  Object.defineProperty(dom.window.document, 'readyState', { value: 'complete', configurable: true });
  global.window = dom.window;
  global.document = dom.window.document;
  global.localStorage = { getItem() { return null; }, setItem() {} };
  await import('../history.js?news');
  dom.window.document.getElementById('summarizeNews').click();
  assert.equal(dom.window.document.getElementById('newsSummary').textContent, 'No items to summarize.');
  delete global.window;
  delete global.document;
  delete global.localStorage;
});

