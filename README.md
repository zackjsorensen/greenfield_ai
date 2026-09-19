# Speech Translation Web App

Locally hosted English speech → transcript → translation. Vendors and hosting targets sit behind interfaces so you swap them in config, not code.

## Setup

1. Install [pnpm](https://pnpm.io/) 9+ (Node 20+).
2. From the repo root:

```bash
cp config/config.example.json config/config.json
```

3. Put your API keys in `config/config.json`. The default pairing is OpenAI for transcription and Gemini for translation, so those two keys are required unless you change `providers.*.active`.
4. Install and run:

```bash
pnpm install
pnpm dev
```

- UI: [http://localhost:5173](http://localhost:5173)
- API: [http://127.0.0.1:8787](http://127.0.0.1:8787)

Click **Start recording**, speak, click **Stop recording**. The English transcript appears first, then the translation into the language chosen in the dropdown.

## Switching providers

In `config/config.json`:

- `providers.transcription.active`: `openai` | `gemini` | `passthrough` | `web-speech`
- `providers.translation.active`: `gemini` | `openai`

`web-speech` uses the browser Web Speech API and skips the upload to `/api/transcribe`. Only the active provider's API key is required.

## Scripts

| Script | What it does |
| --- | --- |
| `pnpm dev` | API + Vite together |
| `pnpm test` | Vitest at the seams (pipeline, adapters, config, routes) |
| `pnpm typecheck` | `tsc` across packages |
| `pnpm lint` | ESLint |
| `pnpm build` | Production build of shared, core, server, and web |

## Moving off localhost

No application code changes:

1. Set `server.host` to `0.0.0.0` and add the public origin to `server.corsOrigins` (or set `HOST` / `CORS_ORIGINS`).
2. Set `VITE_API_BASE_URL` to the deployed API URL and run `pnpm build`.
3. Optionally set `server.serveStatic` to `true` so Express serves `packages/web/dist` from the same origin, which makes step 2 unnecessary.

Environment overrides: `OPENAI_API_KEY`, `GEMINI_API_KEY`, `PORT`, `HOST`, `CORS_ORIGINS`, `CONFIG_PATH`.
