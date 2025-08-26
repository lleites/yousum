# Repository Guidelines

## Project Structure & Modules

- Root hosts the static site: `index.html`, `history.html`, `settings.html`, `styles.css`.
- JavaScript modules live at repo root: `main.js`, `api.js`, `render.js`, `historyManager.js`, `keyManager.js`, `errors.js`.
- Tests are in `tests/` with `*.test.js` using Node’s test runner.
- No build step; files are served as-is.

## Build, Test, Run

- Test: `npm test`
  - Runs Node’s test runner under `c8` with coverage checks (85% lines/functions/statements).
- Run locally: open `index.html` via a static server (any equivalent works), e.g. `npx http-server .` or `npx serve .`.
- Quick module test: `node --test tests/<file>.test.js` (without coverage).

## Coding Style & Conventions

- Language: modern ES modules (`type: module`).
- Indentation: 2 spaces; end lines with semicolons.
- Naming: camelCase for variables/functions, UPPER_SNAKE for constants, kebab-case for HTML ids/classes.
- Files: concise, purpose-focused modules at repo root; `.js` for code, `.html` for pages, `.css` for styles.
- Linting: none enforced; match existing style and keep functions small.

## Testing Guidelines

- Framework: Node’s built-in test (`node:test`), assertions via `node:assert/strict`.
- Location: `tests/`, filenames `*.test.js`; include focused unit tests and minimal DOM setup via `jsdom` when needed.
- Coverage: keep ≥85%; use `npm test` to verify locally.
- Mocks: prefer `t.mock` and lightweight fakes (`fake-indexeddb`, simple stubs) over network calls.

## Commit & Pull Requests

- Commits: prefer Conventional Commits (e.g., `feat:`, `fix:`, `docs:`). Use clear, imperative subjects and concise bodies.
- Branching: short, descriptive names (e.g., `feature/ask-transcript`, `fix/history-ui`).
- PRs: include summary, rationale, screenshots for UI changes, and linked issues. Ensure `npm test` passes and coverage thresholds met.
- Scope: keep PRs small and single-purpose; include tests for new behavior and edge cases.

## Security & Configuration

- Do not commit API keys. Configure via the settings page; stored keys are encrypted by the app.
- Be mindful of external requests (YouTube transcript fetch and summarization API). Avoid adding new dependencies without a clear need.
