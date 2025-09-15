import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';
import { initIndexPage } from '../src/pages/index.js';

function createFakeIndexedDB() {
  return {
    open() {
      const request = {};
      setTimeout(() => {
        const getRequestFactory = () => {
          const getRequest = {};
          setTimeout(() => {
            getRequest.result = undefined;
            if (getRequest.onsuccess) getRequest.onsuccess();
          });
          return getRequest;
        };
        const db = {
          objectStoreNames: { contains: () => true },
          deleteObjectStore: () => {},
          createObjectStore: () => {},
          transaction: () => ({
            objectStore: () => ({
              get: () => getRequestFactory()
            })
          })
        };
        request.result = db;
        if (request.onupgradeneeded) request.onupgradeneeded();
        if (request.onsuccess) request.onsuccess();
      });
      return request;
    }
  };
}

test('clipboard button updates URL from clipboard and handles missing support', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const dom = new JSDOM(html, { url: 'https://example.com' });
  const originalWindow = global.window;
  const originalDocument = global.document;
  const navigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const originalIndexedDB = global.indexedDB;
  global.window = dom.window;
  global.document = dom.window.document;
  Object.defineProperty(globalThis, 'navigator', {
    value: dom.window.navigator,
    configurable: true,
    writable: true,
    enumerable: true
  });
  Object.defineProperty(dom.window.navigator, 'clipboard', {
    value: {
      readText: async () => '  https://youtu.be/demo  '
    },
    configurable: true
  });
  global.indexedDB = createFakeIndexedDB();
  await initIndexPage();
  const urlInput = document.getElementById('url');
  const clipboardButton = document.getElementById('paste-clipboard');
  clipboardButton.click();
  await new Promise(resolve => setTimeout(resolve));
  assert.equal(urlInput.value, 'https://youtu.be/demo');
  delete dom.window.navigator.clipboard;
  delete global.navigator.clipboard;
  clipboardButton.click();
  assert.equal(document.getElementById('status').textContent, 'Error: Clipboard unavailable');
  if (originalWindow === undefined) {
    delete global.window;
  } else {
    global.window = originalWindow;
  }
  if (originalDocument === undefined) {
    delete global.document;
  } else {
    global.document = originalDocument;
  }
  if (navigatorDescriptor) {
    Object.defineProperty(globalThis, 'navigator', navigatorDescriptor);
  } else {
    delete global.navigator;
  }
  if (originalIndexedDB === undefined) {
    delete global.indexedDB;
  } else {
    global.indexedDB = originalIndexedDB;
  }
});
