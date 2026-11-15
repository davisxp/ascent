# Compendium.exe → ASCENT Integration Plan

Goal: turn ASCENT from a workout app into an everything-lifestyle app by
integrating the compendium (The Life Organisation) detail and functionality.

## Current state
- ASCENT features import static `src/content/compendium.json` (read-only).
- compendium.exe serves `/__state` (full compendium data) on a loopback server.
- Features already ported as UI shells: career, finances, nutrition, workouts,
  wardrobe, curriculum, grooming, investments, estate, medical, network, body.

## Gaps
1. No persistence: features render seed JSON, no Dexie repos for most entities.
2. No loopback bridge to compendium.exe in Electron mode.
3. No import/export of compendium backup JSON format.
4. Several features lack CRUD + tests (per AGENTS.md Definition of Done).

## Waves
- W A: Add zod contracts + repository interfaces for each compendium entity.
- W B: Implement Dexie tables + repos; migrate seed JSON into DB on first run.
- W C: Wire features to repos (CRUD, forms, lists); add unit + e2e tests.
- W D: Electron main: spawn/attach to compendium.exe loopback; sync /__state.
- W E: Backup import/export in compendium format; round-trip tests.
- W F: Gate (typecheck, lint, tests, audit, build) green; docs updated.

## Risks
- Large scope; do in waves with gate between each.
- Never post personal data online; keep backup files local.

## First step
Audit which features lack persistence/repos; create contracts for the
highest-value entities (tasks, finances, investments) first.
