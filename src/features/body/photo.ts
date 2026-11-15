/**
 * Progress photo processing — file picker → downscaled JPEG data URLs.
 * Photos never leave the device (stored as base64 in IndexedDB).
 */

export type ProcessedPhoto = {
  base64: string
  thumbnail: string
  width: number
  height: number
}

const MAX_EDGE = 1024
const THUMB_EDGE = 240

function drawScaled(img: HTMLImageElement, maxEdge: number): {
  dataUrl: string
  width: number
  height: number
} {
  const scale = Math.min(1, maxEdge / Math.max(img.naturalWidth, img.naturalHeight))
  const width = Math.max(1, Math.round(img.naturalWidth * scale))
  const height = Math.max(1, Math.round(img.naturalHeight * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D unavailable')
  ctx.drawImage(img, 0, 0, width, height)
  return { dataUrl: canvas.toDataURL('image/jpeg', 0.85), width, height }
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Could not read file'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('Could not decode image'))
      img.onload = () => resolve(img)
      img.src = String(reader.result)
    }
    reader.readAsDataURL(file)
  })
}

/** Downscale a picked image to a full-size JPEG and a thumbnail. */
export async function processPhotoFile(file: File): Promise<ProcessedPhoto> {
  if (!file.type.startsWith('image/')) throw new Error('Not an image file')
  const img = await loadImage(file)
  const full = drawScaled(img, MAX_EDGE)
  const thumb = drawScaled(img, THUMB_EDGE)
  return {
    base64: full.dataUrl,
    thumbnail: thumb.dataUrl,
    width: full.width,
    height: full.height,
  }
}
