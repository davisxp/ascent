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
