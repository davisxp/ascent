# DECISIONS — ASCENT v1.0.0

Dated decision log with rationale. Updated by the orchestrator; subagents log cross-cutting decisions here too.

## 2026-11-14 — Node.js installation
**Decision:** Install Node.js LTS v26.13.1 via `winget install OpenJS.NodeJS.LTS`.
**Rationale:** Node/npm were absent from the Windows 11 host; winget is available and internet access confirmed. v26 LTS is current and supports Vite 8 / Vitest 5 / ES2023.

## 2026-11-14 — Shell command syntax
**Decision:** Avoid PowerShell `&&`/`||` (unsupported in this PS 5.1 build); use `;` statement separator and `&` call operator for external binaries.
**Rationale:** `&&`/`||` are parse errors in the harness PowerShell. Node/npm invoked via `& "C:\Program Files\nodejs\npm.cmd"` with `$env:PATH` extended per call.

## 2026-11-14 — TypeScript strict
**Decision:** `tsconfig.app.json` sets `"strict": true`; `@typescript-eslint/no-explicit-any` set to `error`.
**Rationale:** Mission forbids `any`; strict catches type errors at build time.

## 2026-11-14 — Tailwind CSS v4
**Decision:** Use Tailwind v4 (installed v4.3.5), configured via CSS layer (`@import "tailwindcss"` + theme in `src/index.css`) rather than `tailwind.config.js`.
**Rationale:** v4 is the installed major; zero-config content scanning; design tokens live in CSS custom properties aligned with the training-journal palette.

## 2026-11-14 — React 18 pin
**Decision:** Pin `react@18` / `react-dom@18` despite Vite react-ts defaulting newer.
**Rationale:** Mission specifies React 18; `@types/react` pinned to ^18.3.1 to match.

## 2026-11-14 — ESLint over oxlint
**Decision:** Replace scaffold's `oxlint` with `eslint` + `typescript-eslint` + `eslint-plugin-react-hooks` + `eslint-plugin-react-refresh`.
**Rationale:** Flat-config ESLint integrates with TypeScript project types and enforces `no-explicit-any`; oxlint config was a placeholder.

## 2026-11-14 — PWA rollup manualChunks
**Decision:** Lazy-load chunks: `charts` (recharts), `motion` (framer-motion), `dexie` (dexie/dexie-react-hooks).
**Rationale:** Perf budget: initial JS <350KB gz; charts/trees/photos lazy-loaded.

## 2026-11-15 — Chain steps are 1-based
**Decision:** `Exercise.step` and `ChainStep.step` are 1-based; all array access into `Chain.steps` subtracts 1 (`steps[step - 1]`). Chain placements in `TrainState.placements` are 0-based array indexes consumed directly by the plan generator.
**Rationale:** Seed data (and chain definitions) number steps 1..n. Treating `step` as an array index produced off-by-one swaps (e.g., Incline Push-Up resolving to Knee Push-Up). Normalizing once, with an invariant test over all seeded chains, prevents recurrence.

## 2026-11-15 — Mobility chains resolve through a separate map
**Decision:** `exerciseForChain` (plan generator) falls back to `mobilityChainById` when a chain id is absent from `chainById`; content exposes `allExercises`/`exerciseById` covering strength + mobility.
**Rationale:** Mobility chains live in `src/content/mobility.ts`, so the generator's mobility day previously produced zero exercises and slice/player lookups returned undefined names for mobility moves.

## 2026-11-15 — Active workout is in-memory until completion
**Decision:** The in-flight workout lives in the zustand train slice only; it is persisted exactly once via `WorkoutRepositoryImpl.save` on completion. Quitting discards it (with an explicit confirm dialog).
**Rationale:** Avoids partial-workout rows and PR/XP double-counting from half-saved sessions. Known limitation: an app reload mid-session loses progress — acceptable for v1; revisit if e2e shows users expect crash recovery.

## 2026-11-15 — Water is a zero-kcal food-log entry
**Decision:** Water intake is stored as `FoodLogEntry` rows with the reserved id `WATER_FOOD_ID` ('water'), grams = millilitres, kcal = 0. `totals()` sums water from those rows into `dailyWaterMl` instead of a separate table; Fuel filters them out of the food rings/list.
**Rationale:** Contracts are frozen after W1, so no new `WaterLog` table is available. Reusing the existing append-only food-log repository keeps persistence schema-free while remaining queryable per day/range. Reserved ids are documented in `src/domain/fuel.ts`.

## 2026-11-15 — Fuel nutrition targets are session-scoped
**Decision:** TDEE/macros targets are recomputed via `useMemo` from editable inputs (weight, height, age, sex, activity, goal) prefilled from the body profile and latest weight entry; they are not persisted.
**Rationale:** The body profile is the durable source of truth; duplicating targets in a second table risks drift. Editing inputs in Fuel is instant and stateless across reloads. Revisit with a persisted "nutrition settings" record if users expect target history.

## 2026-11-15 — Food database seeded lazily at first Fuel visit
**Decision:** `FoodRepositoryImpl.ensureSeeded(seed)` bulk-inserts the typed content foods only when the table is empty; Fuel calls it on mount. Custom foods are ordinary rows flagged `custom: true`.
**Rationale:** Keeps the 89-food seed in `src/content` as the single source of truth while allowing user-created foods to persist alongside it, without a migration or app-start cost for non-Fuel users.

## 2026-11-15 — Body photos come from the file picker only
**Decision:** Photo capture uses `<input type="file">` and canvas downscaling to a 1024px JPEG plus a 240px thumbnail stored as data URLs; no camera APIs (`getUserMedia`) are used.
**Rationale:** Mission forbids camera features in v1; the file picker covers gallery/mostly-camera workflows on desktop and mobile while staying offline-first.

## 2026-11-15 — Deleting a workout subtracts its XP; undo restores it
**Decision:** History's delete removes the workout row and calls `addXP(-workout.xpAwarded)`; the undo action re-saves the row and re-adds the XP. The streak is not recomputed on delete, and re-running PR detection against edited sets is out of scope for v1.
**Rationale:** XP is the only gamification value persisted in the gamification row, so compensating it keeps the total honest without a full recalculation engine. Streak decay after a delete is an acceptable, documented limitation; PRs are already recorded on surviving workout rows and best-effort checks scan history live.

## 2026-11-15 — Today links to Train instead of importing the train slice
**Decision:** The Today screen shows today's planned session read directly from the day-plan repository and routes to `/train` with the router to start a session; it does not import `features/train`.
**Rationale:** AGENTS.md forbids feature-to-feature imports; the router and repositories are the sanctioned cross-feature seams. Today scans the last 7 day-keys for the persisted week because `generateWeek` stamps rows with the generation date, not the Monday of that week.
