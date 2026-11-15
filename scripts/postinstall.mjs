/**
 * Installs the Chromium build Playwright needs, except in CI where the
 * browser download would only slow the Pages deploy down.
 */
import { execSync } from 'node:child_process'

if (process.env.CI) {
  console.log('CI detected: skipping Playwright browser install')
} else {
  execSync('playwright install --with-deps chromium', { stdio: 'inherit' })
}
