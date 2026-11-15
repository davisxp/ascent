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
