import { test } from 'node:test';
import assert from 'node:assert/strict';
import { summarizeNews } from '../src/services/api.js';

test('summarizeNews returns trimmed content and sends items', async (t) => {
  const items = [
    { createdAt: '2025-08-02T00:00:00.000Z', title: 'A', channel: 'Ch', url: 'http://a', summary: 'sum a' },
    { createdAt: '2025-08-01T00:00:00.000Z', title: 'B', channel: 'Ch', url: 'http://b', summary: 'sum b' }
  ];
  let call = 0;
  const origFetch = global.fetch;
  global.fetch = t.mock.fn(async (url, options) => {
    call++;
    if (call === 1) return { ok: true, text: async () => 'prompt' };
    const body = JSON.parse(options.body);
    const content = body.messages[1].content;
    assert.ok(content.includes('#1 | 2025-08-02'));
    assert.ok(content.includes('A'));
    assert.ok(content.includes('http://a'));
    return { ok: true, json: async () => ({ choices: [{ message: { content: ' result ' } }] }) };
  });
  const res = await summarizeNews(items, 'KEY');
  assert.equal(res, 'result');
  global.fetch = origFetch;
});

test('summarizeNews throws on API error', async (t) => {
  const items = [{ createdAt: '2025-08-01T00:00:00.000Z', title: 'A', channel: 'C', url: 'u', summary: 's' }];
  let call = 0;
  const origFetch = global.fetch;
  global.fetch = t.mock.fn(async (url, options) => {
    call++;
    if (call === 1) return { ok: true, text: async () => 'prompt' };
    return { ok: false, text: async () => 'bad' };
  });
  await assert.rejects(() => summarizeNews(items, 'KEY'), /bad/);
  global.fetch = origFetch;
});
