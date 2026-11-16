import { test, expect } from '@playwright/test'
import path from 'node:path'
import fs from 'node:fs'

const SCREENSHOT_DIR = path.join(process.cwd(), 'docs', 'screenshots')

const routes = [
  '/', '/train', '/skills', '/library', '/body', '/fuel', '/progress', '/history',
  '/settings', '/finances', '/investments', '/wardrobe', '/intellectuals', '/skincare',
  '/medical', '/nutrition', '/network', '/career', '/estate', '/onboarding'
]

test.describe('desktop screenshots', () => {
  test.beforeAll(async ({ browser }) => {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true })
  })

  for (const route of routes) {
    test(`desktop ${route}`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 900 })
      await page.goto('http://localhost:5173' + route, { waitUntil: 'networkidle' })
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, route.replace(/^\//, '') || 'index') + '-desktop.png', fullPage: true })
    })
  }
})
