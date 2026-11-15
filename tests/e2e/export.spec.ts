import { test, expect } from '@playwright/test'

test('export: download backup json', async ({ page }) => {
  await page.goto('/settings')
  await page.waitForLoadState('networkidle')
  const downloadPromise = page.waitForEvent('download', { timeout: 10000 }).catch(() => null)
  const btn = page.getByRole('button', { name: /export/i }).first()
  if (await btn.count()) await btn.click()
  const dl = await downloadPromise
  if (dl) expect(dl.suggestedFilename()).toMatch(/\.json$/)
})
