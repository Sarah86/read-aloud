# read aloud

Upload a PDF and listen to it with natural AI voices, powered by OpenAI TTS. Works as a PWA — installable on mobile.

## How it works

- Drop a PDF → text is extracted in the browser (no upload to any server)
- Pick a page and press Listen → audio is generated via OpenAI TTS
- Generated audio is cached locally (IndexedDB) so replaying a page costs nothing
- Listened pages are tracked per file across sessions

**Bring your own key** — each user enters their own OpenAI API key directly in the app. It is sent with TTS requests and stored in their browser's `localStorage`. If you deploy with `OPENAI_API_KEY` set on the server, the input field is hidden and your key is used instead.

## Running locally

**Requirements:** [Bun](https://bun.sh) and [Node.js](https://nodejs.org) (≥18)

```bash
# Backend (TTS proxy)
cd backend
cp .env.local.example .env.local   # add your OPENAI_API_KEY
bun run server.ts
```

```bash
# Frontend
cd frontend
npm install
npm run dev
```

Opens at `http://localhost:5173`.

### Environment variables

| Variable | Where | Description |
|---|---|---|
| `OPENAI_API_KEY` | backend `.env.local` | Optional. If set, hides the key input in the UI. |

## Deploying to Vercel

1. Push this repo to GitHub
2. Import it in [vercel.com/new](https://vercel.com/new)
3. No framework preset needed — Vercel will use `vercel.json`
4. Optionally add `OPENAI_API_KEY` as an environment variable if you want to cover costs for all users

That's it. The `/api/config` and `/api/tts` routes are deployed as Edge Functions automatically.

## Voices

| Voice | Character |
|---|---|
| Nova | Feminine · warm |
| Alloy | Neutral · clear |
| Echo | Masculine · soft |
| Fable | Masculine · narrative |
| Onyx | Masculine · deep |
| Shimmer | Feminine · ethereal |

## Cost

OpenAI TTS-1: ~$15 per 1M characters ≈ 333 pages of A4 text. Casual use costs cents per week — and cached pages are free on replay.
