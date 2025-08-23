import { getKeyRecord, decryptStoredKey } from './keyManager.js';
import { addHistory } from './historyManager.js';
import { renderMarkdown } from './render.js';
import { summarize, askTranscript, fetchWithRetry } from './api.js';

export { renderMarkdown };
export { summarize, askTranscript, fetchWithRetry } from './api.js';

export function stripTracking(url) {
  try {
    const u = new URL(url);
    u.hash = '';
    if (u.hostname.includes('youtube.com')) {
      if (u.pathname.startsWith('/watch')) {
        const v = u.searchParams.get('v');
        u.search = v ? `?v=${v}` : '';
      } else {
        u.search = '';
      }
    } else if (u.hostname.includes('youtu.be')) {
      u.search = '';
    }
    return u.toString();
  } catch {
    return url;
  }
}

export function parseVideoId(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtu.be')) {
      return u.pathname.slice(1);
    }
    if (u.hostname.includes('youtube.com')) {
      if (u.pathname.startsWith('/live/')) {
        return u.pathname.split('/')[2] || null;
      }
      return u.searchParams.get('v');
    }
  } catch {
    // ignore invalid URLs
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
  let channel = '';
  const titleEl = doc.querySelector('title');
  if (titleEl) {
    const raw = titleEl.textContent.trim();
    const m = raw.match(/^Transcript of (.+?) - YouTubeToTranscript.com$/);
    title = m ? m[1] : raw;
  }
  const channelEl = doc.querySelector('a[title="Visit YouTube Channel"]');
  if (channelEl) channel = channelEl.textContent.trim();
  return { transcript, title, channel };
}

/* c8 ignore start */
if (typeof window !== 'undefined' && window.trustedTypes && !window.trustedTypes.defaultPolicy) {
  window.trustedTypes.createPolicy('default', {
    createHTML: s => s,
    createScript: s => s,
    createScriptURL: s => s
  });
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', async () => {
    const status = document.getElementById('status');
    const logEl = document.getElementById('log');
    const log = msg => { if (logEl) logEl.textContent += msg + '\n'; };
    const setStatus = msg => { status.textContent = msg; log(msg); };
    const askSection = document.getElementById('askSection');
    const questionEl = document.getElementById('question');
    const askBtn = document.getElementById('ask');
    const answerEl = document.getElementById('answer');
    if (askSection) askSection.style.display = 'none';
    let lastTranscript = '';
    let currentApiKey = '';
    if (askBtn) {
      askBtn.addEventListener('click', async () => {
        const q = questionEl.value.trim();
        if (!q) return;
        try {
          setStatus('Asking...');
          const ans = await askTranscript(lastTranscript, q, currentApiKey);
          answerEl.innerHTML = renderMarkdown(ans);
          setStatus('Done.');
        } catch (e) {
          setStatus('Error: ' + e.message);
        }
      });
    }

    const stored = await getKeyRecord();
    if (!stored) {
      setStatus('No API key stored. Visit the settings page to configure one.');
    }
      document.getElementById('summarize').addEventListener('click', async () => {
        const url = stripTracking(document.getElementById('url').value);
      const summaryEl = document.getElementById('summary');
      summaryEl.innerHTML = '';
      if (logEl) logEl.textContent = '';
      try {
        const record = await getKeyRecord();
        if (!record) throw new Error('No stored API key. Use the settings page.');
        const pin = prompt('Enter PIN');
        if (!pin) throw new Error('PIN required');
        setStatus('Authenticating...');
        const apiKey = await decryptStoredKey(pin);
        setStatus('Fetching transcript...');
        const videoId = parseVideoId(url);
        if (!videoId) throw new Error('Invalid URL');
        const { transcript, title, channel } = await fetchTranscript(videoId);
        setStatus(`Summarizing "${title}"...`);
        const summary = await summarize(transcript, apiKey);
        summaryEl.innerHTML = renderMarkdown(summary);
        addHistory({ title, channel, url, summary, transcript });
        lastTranscript = transcript;
        currentApiKey = apiKey;
        if (askSection) {
          askSection.style.display = '';
          answerEl.innerHTML = '';
          questionEl.value = '';
        }
        setStatus('Done.');
      } catch (e) {
        setStatus('Error: ' + e.message);
      }
    });
  });
}
/* c8 ignore end */

