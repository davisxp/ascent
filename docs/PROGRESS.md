# PROGRESS — Running Ledger

Updated after every wave by the orchestrator from subagent reports.

## W0 Bootstrap (done)
- T0.1 docs/ENVIRONMENT.md recorded (Windows 11, Node v26.13.1 installed via winget, Git 2.51.2, 272 GB free)
- T0.2 Vite + React 18 + TypeScript strict + Tailwind v4 + all deps scaffolded; scripts configured
- T0.3 AGENTS.md, SPEC.md, ARCHITECTURE.md, TASKS.md, PROGRESS.md, DECISIONS.md written
- T0.4 .opencode/agent/*.md + .opencode/command/gate.md written
- T0.5 Commit `chore: bootstrap tooling, spec, and agent roster` — pending

## W1 contracts (BLOCKING)
- Domain types + zod schemas + Dexie schema v1 + repository interfaces + registries written
- typecheck, lint, test all green
- Not yet committed

## W2 (content, engine, design-system, platform persistence)
- Not started

## GATE A
- Not run

## W3 (train, skills-library, body-fuel)
- T3.1 train (in progress): WorkoutPlayer, ExerciseSwap, FinishSummary implemented end-to-end.
  - Fullscreen player: focus trap + Escape, wake lock, per-exercise form cues, set chips,
    SetLogger integration, rest overlay (RestTimer), hold overlay (HoldTimer), swap overlay,
    quit-confirm flow.
  - ExerciseSwap: engine-driven adjacent-step candidates (pattern + ±1 difficulty + bar filter).
  - FinishSummary: duration, sets, XP breakdown, PR list with chime, level/rank, streak.
  - Slice: session timing (startedAt → durationSeconds), quitWorkout, swap applies to the
    active workout AND regenerates/persists the week via the plan generator; registered in
    sliceRegistry via `src/features/train/store.ts` (zustand).
  - Bug fixes: HoldTimer count-up now uses `timer.startCountUp` (interval-restart bug),
    sound service guarded against missing WebAudio, mobility chains wired into the plan
    generator (mobility days were previously empty), unified `exerciseById` content lookup,
    1-based `exercise.step` handled correctly in swap paths.
  - Tests: 45 unit tests green (swap engine + FinishSummary render added).
- T3.2 skills-library (in progress): both features implemented end-to-end.
  - Skills: interactive SVG skill trees per strength chain (nodes clickable, unlocked/
    current/locked states) driven by the new pure `engine/skillTree.ts` (best-for-metric
    over workout history, criteria evaluation, frontier detection). Accessible step-list
    mirror, chain chips with per-chain progress, node detail + exercise detail dialog,
    mobility hold-progress cards. 10 engine tests.
  - Library: search + pattern filter (pure `features/library/filter.ts`), fixed-height
    virtualized list (56px rows, overscan windowing), full detail dialog (cues, mistakes,
    safety, equipment, chain step). Data from typed content seed. 8 filter tests.
  - Shared `ui/useDialog.ts` hook: focus trap + Escape + focus restore for all dialogs.
- body-fuel: NOT started.

## GATE B
- Not run

## W5 critic + fixes
- Not started

## W6 release
- Not started
