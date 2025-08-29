import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseVideoId, renderMarkdown } from '../src/pages/index.js';

// parseVideoId tests

const youtubeUrl = 'https://www.youtube.com/watch?v=abc123';
const youtuUrl = 'https://youtu.be/xyz789';
const invalidUrl = 'https://example.com';
const malformed = 'not a url';

test('parseVideoId extracts id from youtube.com URL', () => {
  assert.equal(parseVideoId(youtubeUrl), 'abc123');
});

test('parseVideoId extracts id from youtu.be URL', () => {
  assert.equal(parseVideoId(youtuUrl), 'xyz789');
});

test('parseVideoId returns null for non YouTube URL', () => {
  assert.equal(parseVideoId(invalidUrl), null);
});

test('parseVideoId returns null for malformed URL', () => {
  assert.equal(parseVideoId(malformed), null);
});

// renderMarkdown tests

test('renderMarkdown converts markdown to HTML and escapes', () => {
  const md = '# Title\n## Subtitle\n### Tertiary\n\nSome & <text> with *emphasis* and **strong**.\n- item1\n- item2';
  const html = renderMarkdown(md);
  assert.equal(
    html,
    '<h1>Title</h1><h2>Subtitle</h2><h3>Tertiary</h3><p>Some &amp; &lt;text&gt; with <em>emphasis</em> and <strong>strong</strong>.</p><ul><li>item1</li><li>item2</li></ul>'
  );
});
