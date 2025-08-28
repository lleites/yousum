# YouTube Video Summarizer

This project is a self-contained GitHub Pages site that summarizes the transcript of a YouTube video using the Groq API. Provide a YouTube URL and your Groq API key to generate a short summary and bullet-point conclusions.

## Features

- **End‑to‑end transcript summarization:** Fetches the full transcript from YouTube via `youtubetotranscript.com` and generates a concise summary with Groq's `openai/gpt-oss-120b` model.
- **Ask follow‑up questions:** After summarizing, pose additional questions about the transcript and receive answers powered by the same model.
- **Encrypted API key storage:** Stores your Groq API key in IndexedDB encrypted with a PIN using the Web Crypto API.
- **Persistent history:** Saves past summaries in local storage so you can revisit, delete, or ask questions about them later.
- **News synthesis from history:** On the History page, aggregate the latest 20 summaries into a concise overview with the covered period and source attributions per key point.
- **History export/import:** Export all history to a timestamped JSON file and import it back from the settings page; duplicate videos are skipped based on URL.
- **No build step:** Pure HTML/JS/CSS site that runs entirely in the browser with a small automated test suite.

## Usage
1. Open `settings.html` to configure the Groq API key. Enter the key and choose a PIN, then save it.
2. (Optional) Use the **Decrypt stored key** button on the settings page to authenticate and verify the stored key by entering your PIN.
3. Navigate to `index.html` (or the deployed GitHub Pages site).
4. Enter the YouTube video URL and click **Summarize**. You will be prompted for your PIN to decrypt the stored API key before the summary is generated. The log, summary, and **Ask Transcript** sections remain hidden until a summary is successfully created.
5. To remove or change the key later, return to the settings page and use **Reset API Key**.
6. Open `history.html` and click **Summarize recent news (latest 20)** to generate an aggregated overview across your most recent items; the app shows the period covered and the output cites which videos support each point.

### Export/Import History
- Open `settings.html` and use **Export History (JSON)** to download a file named like `yousum-YYYYMMDD-HHMMSS.json`.
- Use **Import History (JSON)** to select a previously exported file. Items with URLs already in your history are ignored.

## Notes
- The transcript is fetched from `youtubetotranscript.com`. If a transcript is unavailable or the request fails, an error will be shown.
- Summaries are generated via the `openai/gpt-oss-120b` chat completion endpoint provided by Groq.
- The `openai/gpt-oss-120b` model offers a large context window, so the app sends the full transcript without calculating token limits.
- The summarization prompt lives in `summaryPrompt.md`, and the Q&A prompt in `qaPrompt.md`; edit them to change the styles.
- The cross‑video news prompt lives in `newsSummaryPrompt.md`.
- Secure key storage uses the Web Crypto API to encrypt the API key with a PIN you choose.

## Development
No build step is required; the site is pure HTML/JS/CSS. Run `npm test` to execute the small test suite.
