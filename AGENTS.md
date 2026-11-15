# AGENTS.md — ASCENT v1.0.0

You are an agent working on ASCENT, an offline-first calisthenics improvement app for home training. Read this file and `docs/ARCHITECTURE.md` before writing code.

## Mission
Build a complete, working calisthenics app. **Every feature must actually work when clicked.** No TODOs, no stubs, no placeholder handlers, no lorem ipsum, no `any`, no dead code, no mock data in production paths, no runtime network calls, no accounts, no AI/camera features. If something is genuinely impossible, implement an honest working fallback, document it in `docs/DECISIONS.md`, and never silently cut scope.

## Commands
| Script | Purpose |
|---|---|
| `npm run dev` | Start Vite dev server (http://localhost:5173) |
| `npm run build` | Typecheck + Vite production build |
| `npm run preview` | Serve production build locally |
| `npm run typecheck` | `tsc -b --force` (strict) |
| `npm run lint` | `eslint src tests --max-warnings 0` |
| `npm run test` | `vitest run` (unit + property tests) |
| `npm run test:watch` | `vitest` watch mode |
| `npm run e2e` | Playwright test suite |
| `npm run audit` | `audit:a11y` + `audit:content` |
| `npm run gate` | typecheck + lint + test + audit + build (must be green) |
| `npm run dist:win` | Electron/Windows exe via electron-builder |
| `npm run demo:reset` | Seed demo data (wipes + reseeds IndexedDB) |

## Architecture map (folder ownership)
- `src/domain/` — pure types (shared, no imports from features)
- `src/contracts/` — zod schemas + repository interfaces + registries (FROZEN after W1)
- `src/data/` — Dexie DB, repositories, migrations, export/import (only layer touching Dexie)
- `src/engine/` — pure deterministic logic (progression, plan generator, nutrition math, XP/PR/streak; seeded mulberry32 RNG)
- `src/content/` — typed seed data (exercises, chains, foods, cues)
- `src/ui/` — design tokens + primitives (no feature logic)
- `src/app/` — shell, routes, central registries
- `src/features/*` - vertical slices (today, train, skills, library, body, fuel, insights, history, curriculum, grooming, wardrobe, onboarding, settings)
- `src/platform/` — PWA, Electron, audio, wakelock
- `tests/` — unit, property, e2e, a11y

## Ownership rules
- Features never import other features. Cross-feature reuse lives in `domain/`, `engine/`, or `ui/`.
- All persistence goes through repositories — **no component touches Dexie directly**.
- Routes, nav items, and Zustand slices register through central registries.
- One timer service and one audio service; all intervals/listeners cleaned up on unmount.
- Engine is pure: same inputs → same outputs; seeded RNG for demo data.
- Import shared types from `src/contracts` — never redefine them.
- Never edit another agent's files; report needed changes upward (orchestrator).

## Design system ("training journal", NOT generic AI look)
- Paper `#FBF8F3`, white cards, ink `#20241F`, 1px ink-tinted borders, 14px radii, soft shadows.
- Pine `#2F6B4F` primary, clay `#C65A3A` PRs, marigold `#E9A13B` streaks/XP.
- Fraunces (display), Atkinson Hyperlegible (body), IBM Plex Mono (numerals).
- BANNED: glassmorphism, neon-on-dark, purple gradients, generic hero sections, emoji-as-icons.
- WCAG AA: 44px touch targets, visible focus rings, focus traps in modals/player, `prefers-reduced-motion` honored.

## Definition of done (per feature)
1. Contracts frozen + documented (types + zod schemas).
2. Feature implemented end-to-end (works when clicked).
3. Unit/property tests pass.
4. E2E flow passes.
5. axe scan on every affected route: zero critical violations.
6. `npm run gate` green.
7. Committed with conventional commit referencing feature ID (e.g., `feat(F3): ...`).

## Forbidden patterns
- `any` type, `@ts-ignore`, `// @ts-nocheck`
- `console.log`/debugger in committed code
- Mock data imported by feature code (demo data lives in `scripts/demo/`, gated behind `demo:reset`)
- `setTimeout`/`setInterval` in components (use `src/platform/timer.ts`)
- Direct `db.` calls in components (use repositories)
- Feature-to-feature imports
- Network calls in production code (fetch/axios/XMLHttpRequest)
- `localStorage`/`sessionStorage` (use Dexie via repositories)

## Tech lead note
The orchestrator owns `.opencode/`, `docs/`, config files, and cross-cutting concerns. Subagents own their exclusive paths only. Update `docs/TASKS.md` and `docs/PROGRESS.md` after every wave.
