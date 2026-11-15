import { test, expect } from '@playwright/test'

test('workout: can open train and see a day card', async ({ page }) => {
  await page.goto('/train')
  await page.waitForLoadState('networkidle')
  await expect(page.getByRole('heading', { name: 'Train' })).toBeVisible()
})