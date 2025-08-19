# YouTube Video Summarizer

This project is a self-contained GitHub Pages site that summarizes the transcript of a YouTube video using the OpenAI API. Provide a YouTube URL and your OpenAI API key to generate a short summary and bullet-point conclusions.

## Usage
1. Open `index.html` (or the deployed GitHub Pages site).
2. Enter the YouTube video URL.
3. Enter an OpenAI API key (the free tier works) the first time you use the app. It will be stored encrypted in your browser for future visits.
4. Click **Summarize** to generate a summary.
5. To remove or change the key later, use the **Reset API Key** button.

## Notes
- The transcript is fetched from `youtubetotranscript.com`. If a transcript is unavailable or the request fails, an error will be shown.
- Summaries are generated via the `gpt-5-mini` chat completion endpoint.
- Long videos might exceed token limits; short videos work best.
- The summarization prompt lives in `prompt.md`; edit it to change the summary style.

## Development
No build step is required; the site is pure HTML/JS/CSS. Tests are not defined.
