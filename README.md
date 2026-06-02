# FoundersFrame Image Studio

Turn a video transcript (`.srt`) into a full batch of on-brand explainer
graphics in TJ's style — ready to drop into the Hyperframes animation pipeline.

```
SRT transcript  →  AI picks the key moments + writes styled prompts
                →  you review/edit
                →  Nano Banana generates all images in parallel
                →  download ZIP + manifest.json
```

One API key powers everything (transcript analysis **and** image generation).

---

## 1. Setup (one time)

```bash
npm install
cp .env.local.example .env.local
```

Open `.env.local` and paste your Gemini key:

```
GEMINI_API_KEY=your-key-here
```

### Getting the key

1. Go to **https://aistudio.google.com** → **Get API Key** → **Create API key**
2. Click **"Restrict to Gemini API"** (required from June 19, 2026)
3. Free tier covers ~500 Flash images/day — no credit card needed to start.
   Add billing only if you switch to Nano Banana Pro.

---

## 2. Run

```bash
npm run dev
```

Open http://localhost:3000

1. **Upload** your `.srt`
2. Pick a **model** + **image count** (leave blank for auto ~6/min)
3. **Analyze transcript** → review and edit the prompts
4. **Generate** → watch them fill in
5. **Download ZIP** — images named by sequence + timestamp, plus a
   `manifest.json` that carries the prompt/concept/label for each image into
   your Hyperframes step.

---

## Models

| Model | String | Cost | When |
|---|---|---|---|
| Nano Banana (Flash) | `gemini-2.5-flash-image` | free tier / ~$0.039 | testing, high volume |
| Nano Banana 2 | `gemini-3.1-flash-image-preview` | ~$0.045 | best speed/quality balance |
| Nano Banana Pro | `gemini-3-pro-image-preview` | ~$0.134 | best text + character consistency |

A typical 8-min / 50-image video costs roughly **$2 on Flash** or **$7 on Pro**.

---

## Tuning the style

All of TJ's visual DNA lives in **`lib/style-preset.ts`** — colours, line-art
rules, the gold accent, the character look. Edit that one file to shift the
whole channel's look; every prompt inherits it automatically.

Concurrency (how many images generate at once) is the `CONCURRENCY` constant
near the top of `app/page.tsx`. Lower it if you hit rate limits.
