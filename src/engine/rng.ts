/**
 * mulberry32 seeded RNG — pure, deterministic.
 * Same seed → same sequence. Used only for demo data generation.
 */

export function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + (t ^ (t >>> 7))
    t ^= t << 13
    return ((t ^ (t >>> 16)) >>> 0) / 4294967296
  }
}

export function pickSeeded<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)]
}

export function rangeSeeded(rng: () => number, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1))
}
