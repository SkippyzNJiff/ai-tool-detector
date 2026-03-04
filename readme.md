# Signal Draft

Signal Draft is a Next.js AI detector app with:

- a polished detector-first frontend
- a server-side analysis API
- provider normalization and aggregation
- optional GPTZero login automation through Playwright

## What is implemented

- `app/page.tsx`: landing page + detector interface
- `app/api/analyze/route.ts`: analysis endpoint with validation and rate limiting
- `app/api/providers/status/route.ts`: provider health endpoint for the frontend
- `lib/providers.ts`: ZeroGPT, QuillBot, and GPTZero adapters
- `lib/session/playwright-gptzero-auth.ts`: GPTZero login workflow using Playwright
- `lib/session-manager.ts`: in-memory session cache and refresh lock
- `tests/*.test.ts`: validation and scoring unit tests

## Security notes

The previous README content contained credentials, cookies, and token material. That content has been removed from the app implementation and should not be restored.

Before using GPTZero in any real environment:

1. Rotate the credentials that were previously exposed.
2. Store fresh credentials in environment variables only.
3. Never commit cookies, JWTs, or copied browser headers.

## Environment variables

Copy `.env.example` to `.env.local` and fill in the values you need.

Core flags:

- `ENABLE_ZEROGPT`
- `ENABLE_QUILLBOT`
- `ENABLE_GPTZERO`
- `STRICT_STABLE_ONLY_MODE`

GPTZero automation:

- `GPTZERO_EMAIL`
- `GPTZERO_PASSWORD`
- `GPTZERO_HEADLESS`
- `GPTZERO_LOGIN_URL`
- `GPTZERO_REFERER`

## Install

```bash
npm install
```

## Run locally

```bash
npm run dev
```

Open `http://localhost:3000`.

## Test

```bash
npm test
npm run typecheck
```

## Current provider behavior

- `zerogpt`: enabled by default and used as the baseline public provider
- `quillbot`: disabled by default and treated as optional
- `gptzero`: disabled by default until credentials are configured

If GPTZero login or session refresh fails, the app returns a partial result instead of failing the whole analysis request.
