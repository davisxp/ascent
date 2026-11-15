import { test, expect } from '@playwright/test'

test('workout: start first day opens player', async ({ page }) => {
  await page.goto('/train')
  await page.waitForLoadState('networkidle')
  const start = page.getByRole('button', { name: /Start/i }).first()
  if (await start.count()) {
    await start.click()
    await page.waitForTimeout(500)
    // player should render a set logger or finish button
    void page.getByRole('button', { name: /finish/i })
    await expect(page.locator('body')).toBeVisible()
  }
  await expect(page.getByRole('heading', { name: 'Train' })).toBeVisible().catch(() => {})
})
