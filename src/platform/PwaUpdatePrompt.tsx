import { useEffect, useState } from 'react'

export const PwaUpdatePrompt = () => {
  const [needRefresh, setNeedRefresh] = useState(false)

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', () => setNeedRefresh(true))
    }
  }, [])

  if (!needRefresh) return null
  return (
    <div className="fixed bottom-20 md:bottom-4 left-1/2 -translate-x-1/2 z-50 bg-ink text-paper px-4 py-2 rounded-xl shadow-lg text-sm">
      New version available. Reload to update.
      <button
        type="button"
        className="ml-3 underline"
        onClick={() => window.location.reload()}
      >
        Reload
      </button>
    </div>
  )
}