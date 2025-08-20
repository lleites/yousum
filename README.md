# YouTube Video Summarizer

This project is a self-contained GitHub Pages site that summarizes the transcript of a YouTube video using the Together AI API. Provide a YouTube URL and your Together API key to generate a short summary and bullet-point conclusions.

## Usage
1. Open `settings.html` to configure the Together API key. Enter the key and choose a PIN, then save it.
2. (Optional) Use the **Decrypt stored key** button on the settings page to authenticate and verify the stored key by entering your PIN.
3. Navigate to `index.html` (or the deployed GitHub Pages site).
4. Enter the YouTube video URL and click **Summarize**. You will be prompted for your PIN to decrypt the stored API key before the summary is generated.
5. To remove or change the key later, return to the settings page and use **Reset API Key**.

## Notes
- The transcript is fetched from `youtubetotranscript.com`. If a transcript is unavailable or the request fails, an error will be shown.
- Summaries are generated via the `meta-llama/Llama-3.3-70B-Instruct-Turbo-Free` chat completion endpoint provided by Together AI.
- Long videos may exceed token limits; the app truncates transcripts and adjusts the output length to stay within Together AI's limits.
- The summarization prompt lives in `prompt.md`; edit it to change the summary style.
- Secure key storage uses the Web Crypto API to encrypt the API key with a PIN you choose.

## Development
No build step is required; the site is pure HTML/JS/CSS. Run `npm test` to execute the small test suite.
