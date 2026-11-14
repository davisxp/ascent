/**
 * Audio service — single WebAudio instance.
 * Rest beeps + PR chime. Default on; muted via header toggle.
 * All oscillators/gain nodes cleaned up after play.
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

export const sound = {
  beep: () => playTone(880, 60),
  restTick: () => playTone(660, 30),
  restFinish: () => playTone(1046, 120),
  prChime: () => {
    playTone(659, 150)
    setTimeout(() => playTone(784, 150), 120)
    setTimeout(() => playTone(1046, 300), 240)
  },
  levelUp: () => {
    playTone(523, 120)
    setTimeout(() => playTone(659, 120), 100)
    setTimeout(() => playTone(784, 120), 200)
    setTimeout(() => playTone(1046, 400), 300)
  },
  unlock: () => {
    playTone(800, 100)
    setTimeout(() => playTone(1200, 250), 80)
  },
  click: () => playTone(900, 25, 'sine', 0.03),
}

export const resumeAudio = () => {
  const ctx = getCtx()
  if (ctx.state === 'suspended') ctx.resume()
}
