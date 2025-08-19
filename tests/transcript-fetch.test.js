import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fetchTranscript } from '../main.js';

const VIDEO_ID = 'i44jQvcDARo';

test('fetchTranscript returns transcript and title', async () => {
  const { transcript, title } = await fetchTranscript(VIDEO_ID);
  assert.equal(title, "You're using AI coding tools wrong");
  assert.ok(transcript.length > 0, 'Transcript should not be empty');
});
