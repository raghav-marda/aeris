# Security policy

## Reporting a vulnerability

Please open a private security advisory on GitHub (Security tab, "Report a vulnerability")
rather than a public issue. Include steps to reproduce and the affected route or file.

## What the app does to limit risk

- The Gemini key is read only in `lib/env.ts`, sent in a request header, never logged and never
  returned to the browser.
- Every API route validates input with a strict zod schema (unknown keys are rejected), enforces a
  20 KB UTF-8 body limit and rate limits per client (`429` with `Retry-After`).
- User text sent to the model is fenced and the model's output is checked by a number guard, so
  numbers it was not given are rejected and replaced by deterministic text.
- Error responses are generic; details go to the server log only, and only the error name.
- Security headers and a Content Security Policy are set in `next.config.ts`.

## Known limits

The rate limiter is per serverless instance and in memory, so it is abuse prevention, not billing
enforcement.
