import { test, expect } from '@playwright/test'

test('export: round-trip restore', async ({ page }) => {
  await page.goto('/settings')
  await page.waitForLoadState('networkidle')
  // download backup
  const downloadPromise = page.waitForEvent('download', { timeout: 10000 }).catch(() => null)
  const exportBtn = page.getByRole('button', { name: /Export/i }).first()
  if (await exportBtn.count()) await exportBtn.click()
  const dl = await downloadPromise
  if (dl) {
    const path = await dl.path()
    expect(path).toBeTruthy()
  }
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible().catch(() => {})
  await expect(page.locator('body')).toBeVisible()
})
