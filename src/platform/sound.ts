/**
 * Audio service — single WebAudio instance.
 * Rest beeps + PR chime. Default on; muted via header toggle.
 * All oscillators/gain nodes cleaned up after play.
 * Every call is guarded: missing/suspended WebAudio never throws.
 */

let audioCtx: AudioContext | null = null

const getCtx = (): AudioContext => {
  if (!audioCtx) {
    const Ctor =
      (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext })
        .AudioContext ??
      (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext
    if (!Ctor) throw new Error('WebAudio not available')
    audioCtx = new Ctor()
  }
  return audioCtx
}

const playTone = (freq: number, durationMs: number, type: OscillatorType = 'sine', volume = 0.08) => {
  const ctx = getCtx()
  const now = ctx.currentTime
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, now)
  gain.gain.setValueAtTime(volume, now)
  gain.gain.exponentialRampToValueAtTime(0.001, now + durationMs / 1000)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(now)
  osc.stop(now + durationMs / 1000)
}

/** Run an audio effect, swallowing failures when WebAudio is unavailable. */
const guard = (fn: () => void): void => {
  try {
    fn()
  } catch {
    // audio unavailable — silent fallback
  }
}

export const sound = {
  beep: () => guard(() => playTone(880, 60)),
  restTick: () => guard(() => playTone(660, 30)),
  restFinish: () => guard(() => playTone(1046, 120)),
  prChime: () =>
    guard(() => {
      playTone(659, 150)
      setTimeout(() => playTone(784, 150), 120)
      setTimeout(() => playTone(1046, 300), 240)
    }),
  levelUp: () =>
    guard(() => {
      playTone(523, 120)
      setTimeout(() => playTone(659, 120), 100)
      setTimeout(() => playTone(784, 120), 200)
      setTimeout(() => playTone(1046, 400), 300)
    }),
  unlock: () =>
    guard(() => {
      playTone(800, 100)
      setTimeout(() => playTone(1200, 250), 80)
    }),
  click: () => guard(() => playTone(900, 25, 'sine', 0.03)),
}

export const resumeAudio = () => {
  try {
    const ctx = getCtx()
    if (ctx.state === 'suspended') ctx.resume()
  } catch {
    // audio unavailable — silent fallback
  }
}
