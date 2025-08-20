import { getKeyRecord, decryptStoredKey } from './keyManager.js';

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
  const res = await fetch('https://api.together.xyz/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo-Free',
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

    const stored = await getKeyRecord();
    if (!stored) {
      setStatus('No API key stored. Visit the settings page to configure one.');
    }
    document.getElementById('summarize').addEventListener('click', async () => {
      const url = document.getElementById('url').value;
      const summaryEl = document.getElementById('summary');
      summaryEl.textContent = '';
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
        const { transcript, title } = await fetchTranscript(videoId);
        setStatus(`Summarizing "${title}"...`);
        const summary = await summarize(transcript, apiKey);
        summaryEl.textContent = summary;
        setStatus('Done.');
      } catch (e) {
        setStatus('Error: ' + e.message);
      }
    });
  });
}

