# Changelog

## Unreleased

- Rate limiter: resetting an expired window no longer evicts an unrelated key; 429 responses carry
  `Retry-After`.
- Request body limit is measured in UTF-8 bytes instead of characters.
- Stricter TypeScript (`noUncheckedIndexedAccess`, `noUnusedLocals`, `noUnusedParameters`,
  `noImplicitReturns`) and stricter lint rules (complexity, depth, shadowing, no non-null
  assertions, consistent type imports).
- More tests: ProfileForm, rate limiter, byte-based size limit.

## 0.1.0

- First release: household exposure planner, CPCB AQI, Gemini intake, narration and Q&A behind a
  number guard, English and Hindi, accessibility bar, offline-safe fallbacks.
