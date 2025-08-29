export async function fetchWithRetry(url, options, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, options);
      if (res.status === 503 && i < retries - 1) {
        await new Promise(r => setTimeout(r, 1000 * (i + 1)));
        continue;
      }
      return res;
    } catch (e) {
      if (i === retries - 1) throw e;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
}

export async function summarize(text, apiKey) {
  const promptRes = await fetch('prompts/summary.md');
  if (!promptRes.ok) throw new Error('Prompt not found');
  const prompt = await promptRes.text();
  const res = await fetchWithRetry('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'openai/gpt-oss-120b',
      max_completion_tokens: 8192,
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

export async function askTranscript(transcript, question, apiKey) {
  const promptRes = await fetch('prompts/qa.md');
  if (!promptRes.ok) throw new Error('Prompt not found');
  const prompt = await promptRes.text();
  const res = await fetchWithRetry('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'openai/gpt-oss-120b',
      max_completion_tokens: 8192,
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: transcript },
        { role: 'user', content: question }
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

export async function summarizeNews(items, apiKey) {
  const promptRes = await fetch('prompts/news.md');
  if (!promptRes.ok) throw new Error('Prompt not found');
  const prompt = await promptRes.text();
  const body = items
    .map((it, idx) => {
      const date = it.createdAt || '';
      const title = it.title || '';
      const channel = it.channel || '';
      const url = it.url || '';
      const summary = it.summary || '';
      return `#${idx + 1} | ${date} | ${title} — ${channel} | ${url}\n${summary}`;
    })
    .join('\n\n');
  const res = await fetchWithRetry('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'openai/gpt-oss-120b',
      max_completion_tokens: 8192,
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: body }
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
