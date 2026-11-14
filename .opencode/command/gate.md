---
description: Run the full quality gate: typecheck, lint, unit tests, audit (a11y + content), and production build. Must be green before W6 and before the final report.
---
# /gate

Run the complete ASCENT quality gate. Aborts on first failure.

Usage: `/gate`

Steps:
1. `npm run typecheck` — strict TypeScript build
2. `npm run lint` — ESLint on src + tests, zero warnings
3. `npm run test` — Vitest unit + property tests
4. `npm run audit:a11y` — Playwright axe scan on every route (zero critical violations)
5. `npm run audit:content` — content lint via scripts/audit/content.mjs
6. `npm run build` — `tsc -b && vite build` (production)

Success: all steps exit 0. Paste real output; never claim untested success.
Failure: fix the reported step, then re-run `/gate`. Do not proceed to the next wave until green.
