/**
 * Wake-lock guard — keeps the screen on during a workout session.
 * Silent no-op when the API is unsupported (Electron, older browsers)
 * or permission is denied. Never throws.
 */

type WakeLockSentinel = { release: () => Promise<void> }

type WakeLockNavigator = Navigator & {
  wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinel> }
}

let sentinel: WakeLockSentinel | null = null

export const wakeLock = {
  async request(): Promise<void> {
    const nav = navigator as WakeLockNavigator
    if (!nav.wakeLock || sentinel) return
    try {
      sentinel = await nav.wakeLock.request('screen')
    } catch {
      sentinel = null
    }
  },

  async release(): Promise<void> {
    const current = sentinel
    sentinel = null
    try {
      await current?.release()
    } catch {
      // already released by the browser — nothing to do
    }
  },
}
