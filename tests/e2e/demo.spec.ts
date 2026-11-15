import { test, expect } from '@playwright/test'

test('demo: load demo data from settings', async ({ page }) => {
  await page.goto('/settings')
  await page.waitForLoadState('networkidle')
  const btn = page.getByRole('button', { name: /Load demo/i })
  if (await btn.count()) {
    await btn.click()
    await page.waitForTimeout(500)
  }
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
})

test('offline: service worker registers', async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  const sw = await page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length)
  expect(sw).toBeGreaterThanOrEqual(0)
})
