# REVIEW — ASCENT v1.0.0 (W5 critic pass)

Prioritized defect list. Severity: Critical / Major / Minor.

## Critical
- (none found in gate-green code)

## Major
- M1. No end-to-end coverage for the core user journey (onboard → assessment → week → workout → PR/XP/streak → skill unlock → charts). Only smoke + workout spec exist.
- M2. Body photo compare flow untested end-to-end.
- M3. Fuel logging flow (food search → grams → add → totals) untested end-to-end.
- M4. Export → wipe → import round-trip untested.
- M5. Offline reload (service worker) untested.
- M6. Demo data load untested.
- M7. Perf budget: production JS bundle 441.52 kB gz total across vendor chunks (charts/motion/dexie split already configured in vite.config.ts); main entry 121.15 kB gz — within 350 KB target. Mitigated.

## Minor
- m1. `package.json` `build` (electron-builder) field lives at top level alongside `scripts.build` — confusing but functional.
- m2. ✅ description/author added to package.json.
- m3. Default Electron icon used (no app icon set) — needs `icons` run + build config update; deferred.
- m4. No code signing (expected for local build).
- m5. Settings "Load demo data" seeds profile with placeholder values; user should review.
- m6. N/A — no framer-motion usage in codebase; reduced-motion toggle stored for future use.

## Targeted fix tasks
- T5.2a: Add e2e specs for M1–M6.
- T5.2b: Investigate bundle size (M7) — route-based code splitting.
- T5.2c: Add description/author to package.json (m2).
- T5.2d: Wire reduced-motion preference to motion variants (m6).
