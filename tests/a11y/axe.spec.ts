import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const routes = [
  '/',
  '/train',
  '/skills',
  '/library',
  '/body',
  '/fuel',
  '/progress',
  '/history',
  '/settings',
  '/finances',
  '/investments',
]

for (const route of routes) {
  test(`a11y: ${route} has no critical violations`, async ({ page }) => {
    await page.goto(route)
    await page.waitForLoadState('networkidle')
    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations.filter((v) => v.impact === 'critical')).toHaveLength(0)
  })
}