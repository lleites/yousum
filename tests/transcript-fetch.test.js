import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

const VIDEO_ID = 'i44jQvcDARo';
const URL = `https://youtubetotranscript.com/transcript?v=${VIDEO_ID}`;

function fetchTranscript() {
  return spawnSync('curl', ['-s', '-A', 'Mozilla/5.0', URL], { encoding: 'utf8' });
}

test('fetches transcript HTML for the video without an API key', () => {
  const result = fetchTranscript();
  assert.equal(result.status, 0, `curl failed: ${result.stderr}`);
  const hasSegment = /class="transcript-segment/.test(result.stdout);
  assert.ok(hasSegment, 'No transcript segments returned');
});
