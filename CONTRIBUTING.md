# Contributing

1. `npm install`, then `cp .env.example .env.local` (the app also runs without a key).
2. Make a change, then run `npm run check` (lint with zero warnings, typecheck, Prettier, tests).
3. Keep the design rule: **code decides, AI explains**. Numbers come from `lib/exposure`; Gemini
   only restates them, and `lib/ai/numberGuard.ts` must keep rejecting figures that are not in the facts.
4. Every new route validates input with a strict zod schema (`lib/api/schemas.ts`) and goes through
   `lib/api/handler.ts`. Every new user-facing string goes in both `lib/i18n/en.ts` and `hi.ts`.
5. Read `process.env` only in `lib/env.ts`; log errors only with `lib/log.ts`.
