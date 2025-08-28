import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';

test('initial sections are hidden', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const { document } = new JSDOM(html).window;
  assert.ok(document.getElementById('logBox').classList.contains('hidden'));
  assert.ok(document.getElementById('summary-heading').classList.contains('hidden'));
  assert.ok(document.getElementById('summary').classList.contains('hidden'));
  assert.ok(document.getElementById('ask-heading').classList.contains('hidden'));
  assert.ok(document.getElementById('askSection').classList.contains('hidden'));
});
