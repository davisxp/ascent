import { test, expect } from '@playwright/test'

test('smoke: navigates all primary routes', async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  for (const href of ['/train', '/skills', '/library', '/body', '/fuel', '/progress', '/history', '/settings']) {
    await page.goto(href)
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(new RegExp(href.replace('/', '\\/') + '$'))
  }
})