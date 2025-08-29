import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

test('errors are logged to #log', async () => {
  const dom = new JSDOM('<pre id="log"></pre>');
  global.window = dom.window;
  global.document = dom.window.document;

  await import('../src/utils/errors.js');

  window.dispatchEvent(new dom.window.ErrorEvent('error', { message: 'boom' }));
  const rej = new dom.window.Event('unhandledrejection');
  rej.reason = new Error('fail');
  window.dispatchEvent(rej);

  const lines = document.getElementById('log').textContent.trim().split('\n');
  assert.equal(lines[0], 'Error: boom');
  assert.equal(lines[1], 'Error: fail');
});
