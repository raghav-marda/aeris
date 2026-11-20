# Aeris — Urban Air Quality Assistant

Aeris is a GenAI-powered assistant that helps families and communities get through severe winter smog.
It combines **live air quality** for your city with **your household's routine** (commute, children,
seniors, windows, purifier) and produces a **ranked plan**: low-emission daily routines, indoor air
hacks and sustainable alternatives, each with the **exact, quantified impact** of the choice.

> Built for Hack2Skill PromptWars, Challenge 6: _Urban Air Quality Assistant_.

**Live demo:** https://aeris-plum-five.vercel.app · **Languages:** English and Hindi

---

## What it does

1. **Where are you?** Search a city, use device location, or type a PM2.5 reading.
2. **Live air.** Shows an indicative India CPCB AQI, PM2.5 now, the 24-hour average, a
   cigarette-equivalent comparison and an hour-by-hour chart (with a screen-reader table).
3. **Your household.** Fill a short form, or describe your routine in plain words and let Gemini
   fill the form for you.
4. **Your plan.** A ranked list of actions tailored to location _and_ lifestyle. Each one states
   how many µg/m³ it removes from a member's daily exposure and the cigarettes-a-day it equals, the
   best hour to do it, and why it works.
5. **Ask Aeris.** Ask follow-up questions; answers are grounded in your plan's numbers.

## Where AI is used (and how it is kept honest)

The design rule is **code decides, AI explains**. Gemini is used in three places:

| Feature        | What Gemini does                                                    | Safety net                                          |
| -------------- | ------------------------------------------------------------------- | --------------------------------------------------- |
| Intake         | Turns a free-text description into structured profile fields        | Schema-validated; keyword parser if AI is down      |
| Plan narration | Writes a headline, summary and a personalised note for every action | Number guard + repair loop; catalogue text fallback |
| Grounded Q&A   | Answers questions about the user's plan (EN/HI)                     | Number guard; scope rules; deterministic fallback   |

All numbers (exposure, savings, AQI, best hour) are computed by deterministic code in
`lib/exposure`. The model only receives those numbers as `FACTS` and may only restate them:

- **Number guard** (`lib/ai/numberGuard.ts`) rejects any figure in model text that is not in the
  facts, including Devanagari digits. A rejected reply gets one repair attempt, then falls back.
- **Schema validation** (zod) on every model reply; unknown shapes are discarded.
- **Prompt-injection defence:** user text is fenced as data, system rules forbid following it, and
  the output is validated, so hidden instructions cannot change what the app does.
- **Graceful degradation:** with no API key, a failed call or an invalid reply, the app serves
  deterministic text from the message catalogue. It never shows an empty or broken screen.

## How the numbers work

Exposure is a **time-weighted 24-hour average** across travelling, outdoor time and indoor time
(`lib/exposure/engine.ts`). Every protective action is a **pure transformation** of those inputs, so
a benefit is simply "exposure before minus exposure after". Actions are ranked by value for effort
(weighted up for children, seniors and anyone with breathing trouble) and applied in order, so
overlapping actions (for example a mask _and_ a cleaner commute hour) never double count.

Safety rules are explicit: children and seniors are never sent outdoors into air that is "poor" or
worse, even in the cleanest hour; they are told to stay in instead.

### Data and assumptions (all shown in the app under "How these numbers are calculated")

| Item                               | Value                          | Source / status                            |
| ---------------------------------- | ------------------------------ | ------------------------------------------ |
| AQI categories and PM2.5 bands     | CPCB 24-hour bands             | India CPCB National AQI                    |
| Cigarette equivalence              | 22 µg/m³ per day ≈ 1 cigarette | [Berkeley Earth][be] (rough rule of thumb) |
| Live air quality and 24 h forecast | Open-Meteo Air Quality API     | [Open-Meteo][om] (CAMS model, CC BY 4.0)   |
| Indoor share of outdoor PM2.5      | 90% windows open, 60% closed   | Planning assumption                        |
| Purifier / N95 effect              | 50% / 50%                      | Planning assumption (conservative)         |
| Travel exposure vs outdoor         | car 70%, bus 90%, metro 50%    | Planning assumption                        |

Assumptions are conservative and centralised in `lib/exposure/constants.ts`. They are **not
measurements** and the app says so. Live values are modelled grid estimates, not a monitoring
station, so the AQI shown is _indicative_.

[be]: https://berkeleyearth.org/air-pollution-and-cigarette-equivalence
[om]: https://open-meteo.com/en/docs/air-quality-api

## Quality, mapped to the evaluation criteria

- **Code quality.** TypeScript `strict`, zero ESLint warnings (`--max-warnings=0`), Prettier,
  small single-purpose modules, no duplicated route plumbing (`lib/api/handler.ts`), all tunable
  constants named and documented, JSDoc on public functions.
- **Security.** Strict zod schemas on every route (unknown keys rejected), body-size cap, per-IP
  rate limiting, no internal error details returned, API key only in a server-side header (never in
  a URL or the client bundle), strict CSP and security headers, no user data stored or logged, and
  `npm audit` clean.
- **Efficiency.** Upstream calls are cached (10 min air, 24 h geocoding, bounded size), every
  request has a timeout, the model runs with thinking disabled and token caps, the browser makes no
  third-party calls, and there are no heavy client dependencies.
- **Testing.** 130+ tests: engine and planner unit tests, number-guard and Gemini client tests,
  API route tests (validation, limits, rate limiting, upstream failure), full user-flow component
  tests, and automated accessibility checks with axe.
- **Accessibility.** Semantic landmarks and heading order, labelled controls, live regions for
  status and errors, focus moved to the plan, keyboard-only use, skip link, 44px touch targets,
  high-contrast and large-text modes, `prefers-color-scheme`, colour never the only signal
  (categories always have text), chart with an equivalent data table, and a full Hindi interface.
- **Problem alignment.** Location- and lifestyle-tailored low-emission routines, indoor air hacks
  and sustainable alternatives, each with a clear, quantified explanation of its direct impact.

## Run it locally

```bash
npm install
cp .env.example .env.local        # add a free Gemini key from https://aistudio.google.com/apikey
npm run dev                       # http://localhost:3000
```

The app works without a key (deterministic explanations) so you can try it immediately.

| Command                 | What it does                                |
| ----------------------- | ------------------------------------------- |
| `npm run check`         | Lint, typecheck, format check and all tests |
| `npm run test:coverage` | Tests with a coverage report                |
| `npm run build`         | Production build                            |

## Deploy (free)

Push to GitHub, import the repo in [Vercel](https://vercel.com/new), and add one environment
variable: `GEMINI_API_KEY`. No database is needed.

## Project structure

```
app/                 Next.js routes: page + api/{air,plan,ask,intake}
components/          UI sections (location, air, household form, plan, ask) and shared fields
lib/aqi/             CPCB bands, AQI maths, cigarette equivalence
lib/exposure/        Profile schema, constants, exposure engine, actions, planner
lib/air/             Open-Meteo client with validation and caching
lib/ai/              Gemini client, facts, number guard, narration, Q&A, intake
lib/api/             Request schemas and shared route handler
lib/i18n/            English and Hindi message catalogues
lib/client/          Browser API wrappers and the app state hook
__tests__/           Unit, API, component and accessibility tests
```

## Limitations (stated honestly)

- Air data is a model estimate at roughly city scale, not a street-level or station reading.
- Protective effects are planning assumptions; real results depend on fit, filters and the home.
- The in-memory cache and rate limiter are per server instance, which is fine for abuse prevention
  but not strict billing enforcement.
- Aeris gives general guidance, not medical advice.

## Credits

Air quality data by [Open-Meteo](https://open-meteo.com/) (CC BY 4.0). Cigarette-equivalence rule
of thumb from Berkeley Earth. AQI bands from India's Central Pollution Control Board.
