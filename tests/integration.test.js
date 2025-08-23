import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseVideoId, stripTracking } from '../main.js';

test('stripTracking removes params and parseVideoId handles live URLs', () => {
  const raw = 'https://www.youtube.com/live/_IYY70_L8Yc?si=GZk8dX-DchIUsgyi';
  const cleaned = stripTracking(raw);
  assert.equal(cleaned, 'https://www.youtube.com/live/_IYY70_L8Yc');
  assert.equal(parseVideoId(cleaned), '_IYY70_L8Yc');
});
