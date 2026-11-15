# ARCHITECTURE — ASCENT v1.0.0

## Folder map
```
src/
  domain/        Pure shared types (branded ids, enums, unit types). No feature imports.
  contracts/     Zod schemas, repository interfaces, registries. FROZEN after W1.
  data/          Dexie DB instance, repositories, migrations, export/import. ONLY layer touching Dexie.
  engine/        Pure deterministic logic: progression, plan generator, nutrition math, XP/PR/streak. No React.
  content/       Typed seed data: exercises, chains, skill trees, foods, cues.
  ui/            Design tokens, primitives, shell components. No feature logic.
  app/           Shell, routes, central registries (routes, nav, zustand slices).
  features/*     Vertical slices: today, train, skills, library, body, fuel, insights, history, curriculum, grooming, wardrobe, onboarding, settings.
platform/        PWA, Electron, audio service, timer service, wakelock.
tests/           Unit, property, e2e, a11y.
scripts/         Content audit, demo seeder, reset.
```

## Data flow
1. UI → Zustand slice (optimistic update) → repository → Dexie (autosave).
2. Repositories return domain types; components never call `db.*` directly.
3. Engine functions take plain inputs, return plain outputs; deterministic, seeded RNG only for demo seed.
4. Mutations flow through a single `db.transaction('rw')` where atomicity matters (export/import rollback).

## Contracts (owned by `contracts` agent, frozen after W1)
- `src/contracts/schema.ts` — Dexie schema v1 + zod validation schemas.
- `src/contracts/repositories.ts` — repository interfaces (exercise, workout, set, body, food, photo, settings).
- `src/contracts/registries.ts` — route registry, nav registry, zustand slice registry.
- `src/domain/*.ts` — branded ID types, enums, metric types, preference types.

## Ownership boundaries
- Features never import other features. Cross-feature reuse lives in `domain/`, `engine/`, or `ui/`.
- All persistence through repositories; no component touches Dexie directly.
- Routes, nav items, Zustand slices register through central registries.
- One timer service + one audio service; all intervals/listeners cleaned up on unmount.

## Persistence
- Single Dexie database, versioned schema with tested migrations.
- Every mutation autosaves; export = full JSON (photos base64) with size warning; import = zod validate → backup-before-replace → atomic rollback.
- Lossless round-trip required.

## Engine purity
- Same inputs → same outputs. No Date.now()/Math.random() in engine (inject clock + seeded mulberry32).
- No React, no DOM, no network.
