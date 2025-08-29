import assert from 'node:assert/strict';
import { test } from 'node:test';
import { stripTracking, parseVideoId } from '../src/pages/index.js';

test('stripTracking removes tracking parameters', () => {
  assert.equal(
    stripTracking('https://www.youtube.com/watch?v=abc123&feature=youtu.be#t=5'),
    'https://www.youtube.com/watch?v=abc123'
  );
  assert.equal(
    stripTracking('https://youtu.be/abc123?t=5'),
    'https://youtu.be/abc123'
  );
  assert.equal(stripTracking('invalid'), 'invalid');
});

test('parseVideoId extracts ID from URL', () => {
  assert.equal(parseVideoId('https://youtu.be/abc123'), 'abc123');
  assert.equal(parseVideoId('https://www.youtube.com/watch?v=abc123'), 'abc123');
  assert.equal(parseVideoId('https://www.youtube.com/live/xyz'), 'xyz');
  assert.equal(parseVideoId('https://example.com'), null);
});
