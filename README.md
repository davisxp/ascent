# ASCENT

Offline-first lifestyle training journal for home training and daily life. React + TypeScript + Vite PWA, installable on a phone and fully usable offline (IndexedDB via Dexie, no accounts, no network calls at runtime).

Originally a calisthenics improvement app, ASCENT is now a broader lifestyle compendium: strength/skill/flexibility training, body metrics, nutrition logging, finances, investments, wardrobe, grooming, career, medical, estate, curriculum, network, and workouts — all first-class, all local.

## Live app

- **Web:** https://davisxp.github.io/ascent/
- **Install on a phone:** open the link in Chrome (Android) or Safari (iOS), then *Install app* / *Add to Home Screen*. It then launches full-screen like a native app, and keeps working with no connection.

## Deploy

Every push to `master` (or `main`) runs `.github/workflows/deploy.yml`: typecheck + build the PWA with `BASE_PATH=/ascent/`, add a `404.html` SPA fallback plus `.nojekyll`, and publish `dist/` to GitHub Pages.

The sub-path is baked in at build time, so if the repository is ever renamed, update `BASE_PATH` in the workflow (and the workflow's `environment.url` follows automatically).

## Local development

| Script | Purpose |
|---|---|
| `npm run dev` | Vite dev server at http://localhost:5173 |
| `npm run build` | Typecheck + production build into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run test` | Unit and property tests (Vitest) |
| `npm run test:watch` | Vitest watch mode |
| `npm run e2e` | Playwright end-to-end suite |
| `npm run audit:a11y` | Axe accessibility scan on every route |
| `npm run audit:content` | Content lint (unique IDs, contiguous chains, valid cues/equipment) |
| `npm run audit` | a11y + content audit |
| `npm run gate` | typecheck + lint + test + audit + build (must be green before release) |
| `npm run icons` | Re-render the app icons from `public/favicon.svg` |
| `npm run dist:win` | Windows desktop build via electron-builder |
| `npm run demo:reset` | Wipe + reseed demo data in IndexedDB |

To check the Pages sub-path locally:

```bash
BASE_PATH=/ascent/ npm run build
npx serve dist   # open http://localhost:3000/ascent/
```

## Data & privacy

Everything lives in IndexedDB on your device. Photos are stored as blobs and never leave the device. There are no accounts, no cloud sync, no AI, no camera, and no runtime network calls. Use **Settings → Export backup** to download a full JSON backup; **Import backup** restores it with backup-before-replace and atomic rollback.

## Packaging

`npm run dist:win` builds a portable Windows installer via electron-builder (guard service-worker/wake-lock to web; IndexedDB persists in Electron). See `.github/workflows/release.yml` for the CI fallback.

## Screens

Dashboard (Today), Workouts, Train, Skills, Library, Body, Fuel, Progress, History, Settings, Finances, Investments, Wardrobe, Intellectuals, Skincare, Medical, Nutrition, Network, Career, Estate & Home, Onboarding.

See `AGENTS.md` and `docs/` for architecture, contracts, and design rules.
