export function parseVideoId(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtu.be')) {
      return u.pathname.slice(1);
    }
    if (u.hostname.includes('youtube.com')) {
      return u.searchParams.get('v');
    }
  } catch {
    // ignore
  }
  return null;
}

async function parseHtml(html) {
  if (typeof DOMParser !== 'undefined') {
    return new DOMParser().parseFromString(html, 'text/html');
  }
  const { JSDOM } = await import('jsdom');
  return new JSDOM(html).window.document;
}

export async function fetchTranscript(videoId) {
  const url = `https://youtubetotranscript.com/transcript?v=${videoId}`;
  let html;
  if (typeof window === 'undefined') {
    const { spawnSync } = await import('node:child_process');
    const result = spawnSync('curl', ['-s', '-A', 'Mozilla/5.0', url], { encoding: 'utf8' });
    if (result.status !== 0) throw new Error('Transcript not available');
    html = result.stdout;
  } else {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) throw new Error('Transcript not available');
    html = await res.text();
  }
  const doc = await parseHtml(html);
  const segments = Array.from(doc.querySelectorAll('span[data-start]'));
  if (!segments.length) throw new Error('Transcript not found');
  const transcript = segments.map(s => s.textContent.trim()).join(' ');
  let title = '';
  const titleEl = doc.querySelector('title');
  if (titleEl) {
    const raw = titleEl.textContent.trim();
    const m = raw.match(/^Transcript of (.+?) - YouTubeToTranscript.com$/);
    title = m ? m[1] : raw;
  }
  return { transcript, title };
}

async function summarize(text, apiKey) {
  const promptRes = await fetch('prompt.md');
  if (!promptRes.ok) throw new Error('Prompt not found');
  const prompt = await promptRes.text();
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-5-mini',
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: text }
      ]
    })
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err);
  }
  const json = await res.json();
  return json.choices[0].message.content.trim();
}

const DB_NAME = 'yousum-config';
const STORE_NAME = 'keys';

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getCryptoKey() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get('api');
    req.onsuccess = async () => {
      let key = req.result;
      if (!key) {
        key = await crypto.subtle.generateKey(
          { name: 'AES-GCM', length: 256 },
          false,
          ['encrypt', 'decrypt']
        );
        const txw = db.transaction(STORE_NAME, 'readwrite');
        txw.objectStore(STORE_NAME).put(key, 'api');
        txw.oncomplete = () => resolve(key);
        txw.onerror = () => reject(txw.error);
      } else {
        resolve(key);
      }
    };
    req.onerror = () => reject(req.error);
  });
}

async function saveApiKey(apiKey) {
  const key = await getCryptoKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(apiKey);
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
  const payload = { iv: Array.from(iv), data: Array.from(new Uint8Array(ciphertext)) };
  localStorage.setItem('apiKey', JSON.stringify(payload));
}

async function loadApiKey() {
  const stored = localStorage.getItem('apiKey');
  if (!stored) return '';
  const key = await getCryptoKey();
  const { iv, data } = JSON.parse(stored);
  const ciphertext = new Uint8Array(data);
  const buffer = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(iv) }, key, ciphertext);
  return new TextDecoder().decode(buffer);
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', async () => {
    const apiInput = document.getElementById('apiKey');
    const resetBtn = document.getElementById('resetKey');
    const status = document.getElementById('status');
    const saved = await loadApiKey();
    if (saved) {
      apiInput.value = saved;
      apiInput.style.display = 'none';
      resetBtn.style.display = 'block';
      status.textContent = 'Using stored API key.';
    }
    resetBtn.addEventListener('click', async () => {
      localStorage.removeItem('apiKey');
      const db = await openDB();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete('api');
      tx.oncomplete = () => {
        apiInput.value = '';
        apiInput.style.display = 'block';
        resetBtn.style.display = 'none';
        status.textContent = 'API key cleared. Enter a new key.';
      };
    });
  });

  document.getElementById('summarize').addEventListener('click', async () => {
    const url = document.getElementById('url').value;
    const apiInput = document.getElementById('apiKey');
    const resetBtn = document.getElementById('resetKey');
    const apiKey = apiInput.value;
    await saveApiKey(apiKey);
    apiInput.style.display = 'none';
    resetBtn.style.display = 'block';
    const status = document.getElementById('status');
    const summaryEl = document.getElementById('summary');
    summaryEl.textContent = '';
    try {
      status.textContent = 'Fetching transcript...';
      const videoId = parseVideoId(url);
      if (!videoId) throw new Error('Invalid URL');
      const { transcript, title } = await fetchTranscript(videoId);
      status.textContent = `Summarizing "${title}"...`;
      const summary = await summarize(transcript, apiKey);
      summaryEl.textContent = summary;
      status.textContent = 'Done.';
    } catch (e) {
      status.textContent = 'Error: ' + e.message;
    }
  });
}

