import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test.describe('a11y', () => {
  test('root has no critical violations', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations.filter((v) => v.impact === 'critical')).toHaveLength(0)
  })
})
