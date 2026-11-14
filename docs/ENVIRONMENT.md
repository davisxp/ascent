# Environment Findings — ASCENT v1.0.0

Probed during Phase 0 bootstrap. Adapted build plan accordingly.

## Host OS
- Windows 11 (PowerShell 5.1.26100.9818, OS build 26100)
- Shell: PowerShell (no `&&`/`||` support; `;` and `&` call operator used instead)

## Toolchain
- Git: 2.51.2.1 (C:\Program Files\Git\cmd\git.exe)
- Node.js: v26.13.1 (installed via `winget install OpenJS.NodeJS.LTS`, not pre-installed)
- npm: 11.20.0
- npx: 11.20.0
- winget: available
- Internet access: confirmed (nodejs.org reachable)

## Disk
- C: 457.62 GB total, 272.83 GB free — ample space for node_modules, Playwright browsers, Electron builds

## Windows packaging
- Windows native host: `npm run dist:win` (electron-builder) is supported on this machine.
- No Wine needed; Windows artifacts can be built locally.
- CI fallback (.github/workflows/release.yml on windows-latest) prepared in case local builds fail.

## Adaptations made
- PowerShell-specific: shell commands avoid `&&`/`||`; use `;` and `&` call operator.
- Node.js installed via winget before scaffolding (was absent from environment).
- Tailwind CSS v4 used (configured via CSS layer, no tailwind.config.js required).
