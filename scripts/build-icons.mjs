/**
 * Renders the ASCENT app icons from public/favicon.svg.
 * Outputs: icon-192.png, icon-512.png, icon-maskable-512.png, apple-touch-icon.png
 * Run: node scripts/build-icons.mjs
 */
import { chromium } from 'playwright'
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const publicDir = path.join(root, 'public')
const svg = await readFile(path.join(publicDir, 'favicon.svg'), 'utf8')

const PAGE = (size, mark) => `<!doctype html><html><head><meta charset="utf-8"><style>
  html, body { margin: 0; width: ${size}px; height: ${size}px; background: #FBF8F3; overflow: hidden }
  svg { display: block; width: ${mark}px; height: ${mark}px; margin: ${(size - mark) / 2}px }
</style></head><body>${svg}</body></html>`

const targets = [
  { file: 'icon-192.png', size: 192, mark: 192 },
  { file: 'icon-512.png', size: 512, mark: 512 },
  // Maskable: full-bleed paper background, mark inside the 80% safe zone.
  { file: 'icon-maskable-512.png', size: 512, mark: 410 },
  { file: 'apple-touch-icon.png', size: 180, mark: 180 },
]

const browser = await chromium.launch()
const tab = await browser.newPage()

for (const { file, size, mark } of targets) {
  await tab.setViewportSize({ width: size, height: size })
  await tab.setContent(PAGE(size, mark))
  const buffer = await tab.screenshot({ type: 'png' })
  await writeFile(path.join(publicDir, file), buffer)
  console.log(`wrote public/${file} (${size}x${size})`)
}

await browser.close()
