import { test } from 'node:test';
import assert from 'node:assert/strict';

// Ensure history.js creates a default Trusted Types policy when needed
// and does not throw during import in a non-browser environment.
test('history.js sets trusted types policy', async () => {
  let created = false;
  global.window = {
    trustedTypes: {
      defaultPolicy: null,
      createPolicy(name, rules) {
        created = true;
        return {};
      }
    }
  };
  global.document = { addEventListener: () => {} };
  await import('../history.js');
  assert.ok(created, 'expected policy to be created');
  delete global.window;
  delete global.document;
});
