import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

// Prepare minimal browser-like globals before importing
const dom = new JSDOM('');
global.window = {};
global.DOMParser = dom.window.DOMParser;

import { fetchTranscript, fetchWithRetry, summarize } from '../main.js';

// fetchTranscript tests

test('fetchTranscript parses transcript and title', async (t) => {
  const html = '<title>Transcript of Some Title - YouTubeToTranscript.com</title>' +
               '<span data-start="0">Hello</span><span data-start="1">World</span>';
  const origFetch = global.fetch;
  global.fetch = t.mock.fn(async () => ({ ok: true, text: async () => html }));
  const { transcript, title } = await fetchTranscript('id');
  assert.equal(transcript, 'Hello World');
  assert.equal(title, 'Some Title');
  global.fetch = origFetch;
});

test('fetchTranscript throws when not ok', async (t) => {
  const origFetch = global.fetch;
  global.fetch = t.mock.fn(async () => ({ ok: false }));
  await assert.rejects(() => fetchTranscript('id'), /Transcript not available/);
  global.fetch = origFetch;
});

test('fetchTranscript throws when no segments', async (t) => {
  const origFetch = global.fetch;
  global.fetch = t.mock.fn(async () => ({ ok: true, text: async () => '<html></html>' }));
  await assert.rejects(() => fetchTranscript('id'), /Transcript not found/);
  global.fetch = origFetch;
});

test('fetchTranscript works when DOMParser unavailable', async (t) => {
  const origFetch = global.fetch;
  const origDOMParser = global.DOMParser;
  delete global.DOMParser;
  global.fetch = t.mock.fn(async () => ({ ok: true, text: async () => '<span data-start="0">Hi</span>' }));
  const { transcript } = await fetchTranscript('id');
  assert.equal(transcript, 'Hi');
  global.fetch = origFetch;
  global.DOMParser = origDOMParser;
});


// summarize tests

test('summarize returns trimmed content', async (t) => {
  let call = 0;
  const origFetch = global.fetch;
  global.fetch = t.mock.fn(async (url, options) => {
    call++;
    if (call === 1) return { ok: true, text: async () => 'prompt' };
    return { ok: true, json: async () => ({ choices: [{ message: { content: ' result ' } }] }) };
  });
  const summary = await summarize('text', 'KEY');
  assert.equal(summary, 'result');
  global.fetch = origFetch;
});

test('summarize throws on API error', async (t) => {
  let call = 0;
  const origFetch = global.fetch;
  global.fetch = t.mock.fn(async (url, options) => {
    call++;
    if (call === 1) return { ok: true, text: async () => 'prompt' };
    return { ok: false, text: async () => 'bad' };
  });
  await assert.rejects(() => summarize('text', 'KEY'), /bad/);
  global.fetch = origFetch;
});
