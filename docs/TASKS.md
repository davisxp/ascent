# TASKS — ASCENT v1.0.0 Task Graph

ID | Owner | Dependencies | Wave | Acceptance | Status
---|---|---|---|---|---
T0.1 | orchestrator | — | W0 | docs/ENVIRONMENT.md recorded | done
T0.2 | orchestrator | T0.1 | W0 | Vite+React18+TS+Tailwind+all deps installed; scripts present | in-progress
T0.3 | orchestrator | T0.2 | W0 | AGENTS.md, SPEC.md, ARCHITECTURE.md, TASKS.md, PROGRESS.md, DECISIONS.md written | pending
T0.4 | orchestrator | T0.3 | W0 | .opencode/agent/*.md + .opencode/command/gate.md written; schema confirmed | pending
T0.5 | orchestrator | T0.4 | W0 | Commit `chore: bootstrap tooling, spec, and agent roster` | pending
T1.1 | contracts | T0.5 | W1 | Domain types + branded IDs | pending
T1.2 | contracts | T1.1 | W1 | Zod schemas + Dexie schema v1 | pending
T1.3 | contracts | T1.2 | W1 | Repository interfaces | pending
T1.4 | contracts | T1.3 | W1 | Registries (routes, nav, zustand slices) | pending
T1.5 | contracts | T1.4 | W1 | typecheck passes; docs/ARCHITECTURE.md published; contracts frozen | pending
T2.1 | content | T1.5 | W2 | 100+ exercises, chains, ~80 foods, cues; audit:content passes | pending
T2.2 | engine | T1.5 | W2 | Progression, plan generator, nutrition math, XP/PR/streak; unit+property tests pass | pending
T2.3 | design-system | T1.5 | W2 | Tokens, primitives, nav shell, motion, sound; catalog renders; axe clean | pending
T2.4 | platform | T1.5,T2.2 | W2 | Dexie DB, repositories, migrations core | pending
GATE A | orchestrator | T2.1-T2.4 | W2 | typecheck + lint + unit tests + audit:content + build green | pending
T3.1 | train | GATE A | W3 | Program week view + workout player + timers; e2e workout flow passes | pending
T3.2 | skills-library | GATE A | W3 | SVG skill trees + library + detail; e2e unlock + filter flows pass | pending
T3.3 | body-fuel | GATE A | W3 | Weight/measures/photos + nutrition logging; e2e persistence + photo compare pass | pending
T4.1 | insights | GATE A | W4 | Today, Progress, History, badge cabinet; charts render real data; undo works | pending
T4.2 | platform | GATE A | W4 | PWA + Electron + export/import + demo seeder; offline reload + round-trip | pending
T4.3 | qa | GATE A | W4 | Playwright suite + axe scans + content lint + perf budget | pending
GATE B | orchestrator | T3.1-T4.3 | W4 | Full build + e2e smoke + axe on every route green | pending
T5.1 | critic | GATE B | W5 | docs/REVIEW.md prioritized defect list | pending
T5.2 | orchestrator | T5.1 | W5 | Targeted fix tasks (max 3 concurrent) until zero critical/major | pending
T5.3 | qa | T5.2 | W5 | Full gate re-run green | pending
T6.1 | orchestrator | GATE B | W6 | Portable exe (or CI fallback), README, screenshots, tag v1.0.0 | pending
T6.2 | orchestrator | T6.1 | W6 | Final report with real gate output | pending
