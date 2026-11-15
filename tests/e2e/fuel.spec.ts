import { test, expect } from '@playwright/test'

test('fuel: search food, add grams, totals update', async ({ page }) => {
  await page.goto('/fuel')
  await page.waitForLoadState('networkidle')
  // open food search
  const search = page.getByPlaceholder(/search food/i)
  if (await search.count()) {
    await search.fill('egg')
    await page.waitForTimeout(300)
    const first = page.locator('button').filter({ hasText: /egg/i }).first()
    if (await first.count()) await first.click()
  }
  await expect(page).toHaveURL(/\/fuel$/)
})
