# ASCENT

Offline-first calisthenics training journal for home training. React + TypeScript + Vite PWA, installable on a phone and fully usable offline (IndexedDB via Dexie, no accounts, no network calls at runtime).

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
| `npm run e2e` | Playwright end-to-end suite |
| `npm run gate` | typecheck + lint + test + audit + build |
| `npm run icons` | Re-render the app icons from `public/favicon.svg` |
| `npm run dist:win` | Windows desktop build via electron-builder |

To check the Pages sub-path locally:

```bash
BASE_PATH=/ascent/ npm run build
npx serve dist   # open http://localhost:3000/ascent/
```

See `AGENTS.md` and `docs/` for architecture, contracts, and design rules.
