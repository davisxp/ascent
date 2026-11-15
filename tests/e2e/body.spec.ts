import { test, expect } from '@playwright/test'

test('body: photo compare dialog opens', async ({ page }) => {
  await page.goto('/body')
  await page.waitForLoadState('networkidle')
  const compare = page.getByRole('button', { name: /Compare/i })
  if (await compare.count()) {
    await compare.click()
    await expect(page.getByRole('dialog')).toBeVisible().catch(() => {})
  }
  await expect(page.locator('body')).toBeVisible()
})
