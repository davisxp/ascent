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
- T3.3 body-fuel (in progress): both features implemented end-to-end.
  - Body: weight logging with SVG trend chart, measurement entries per site with
    deltas (pure `features/body/stats.ts`: weightSeries, latestBySite, BMI/WHO bands),
    body profile inputs, photo capture via file picker (canvas downscale to 1024px JPEG
    + 240px thumb, pure `features/body/photo.ts`), photo compare dialog with focus trap.
  - Fuel: kcal/protein/fat/carbs rings against a TDEE target built by the pure
    nutrition engine (session-scoped targets editor: weight/height/age/sex/activity/goal),
    food search over the 89-food seeded database, grams + meal + add flow, custom-food
    creation, per-meal today log with delete, water tracking (250 ml increments) and a
    7-day kcal bar chart (pure `features/fuel/chart.ts`: lastNDays, totalsByDay,
    dailyTotalsSeries with zero-fill).
  - Data layer: `FoodRepositoryImpl.ensureSeeded()` populates the food table from the
    typed content seed when empty (idempotent); water tracked as zero-kcal food-log
    entries with reserved `WATER_FOOD_ID` ('water') and summed separately in `totals()`.
  - Tests: 74 unit tests green (body stats + fuel chart suites added).

## GATE B
- Not run

## W4 (insights, platform, qa)
- T4.1 insights (in progress): Today, Progress, History + badge cabinet implemented end-to-end.
  - Today: real dashboard — level/XP ring, streak, kcal/water today (food log), latest
    weight, today's planned session read from the persisted day plan (scans the last 7
    day-keys for the generated week), recent workouts; "Start session" routes to /train
    via the router instead of importing across features.
  - Progress: level/rank/XP + streak + totals summary, 12-week SVG training heatmap
    (Monday-start, future cells hidden), volume-by-pattern bars from completed sets,
    PR timeline from recorded `workout.prs`, badge cabinet (all 24 badges with earned/
    unearned states + category colors from `GamificationRepositoryImpl.getAwards()`).
  - History: month calendar (Monday-start grid, done-days highlighted) with prev/next
    month, month session list with expandable detail, inline set editing (reps/hold/
    level/RPE saved through the workout repository), delete with undo (XP subtracted on
    delete via `addXP(-xp)`, restored on undo).
  - Pure modules + tests: `features/insights/charts.ts` (heatmapGrid, volumeByPattern,
    prTimeline, bestEffortCurve) and `features/history/calendar.ts` (monthGrid,
    monthTitle, shiftMonth); 12 new unit tests (86 total).

## W5 critic + fixes
- Not started

## W6 release
- Not started

## Local dev (OpenBot agent)
- Settings: export/import/reset/load-demo-data UI; sound/units/rest/theme/wakeLock/reducedMotion controls wired to settings repo.
- Platform: Electron shell + builder config; PWA update prompt; offline status indicator.
- Tests: axe scan on all 9 routes (chromium+mobile); e2e smoke + workout spec; playwright testMatch fixed.
- Demo seeder: 14 days weight + profile + settings + 7 days food/water logs.
- Train: regenerate-week button.
