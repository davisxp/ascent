import { useState, useCallback, useEffect, type ReactNode } from 'react'
import { routeRegistry } from '../contracts/registries'
import { RouterContext } from './RouterContext'
import { useRouter } from './useRouter'

/** Deployment base, e.g. "/ascent/" on GitHub Pages, "/" locally. */
const BASE = import.meta.env.BASE_URL || '/'

/** Maps a browser pathname ("/ascent/train") onto an app route ("/train"). */
const normalize = (pathname: string): string => {
  let path = pathname
  if (BASE !== '/') {
    const base = BASE.replace(/\/$/, '')
    if (path === base || path === `${base}/`) path = '/'
    else if (path.startsWith(`${base}/`)) path = path.slice(base.length)
  }
  if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1)
  return path || '/'
}

/**
 * Holds the current route. Wrap the whole shell so navigation controls and the
 * routed screen share one history and one current path.
 */
export const RouterProvider = ({ children }: { children: ReactNode }) => {
  const [currentPath, setCurrentPath] = useState(() =>
    normalize(window.location.pathname || '/'),
  )

  const navigate = useCallback((path: string) => {
    const target = `${BASE.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`
    window.history.pushState({}, '', target)
    setCurrentPath(normalize(path))
  }, [])

  useEffect(() => {
    const onPopState = () => setCurrentPath(normalize(window.location.pathname))
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  return (
    <RouterContext.Provider value={{ currentPath, navigate }}>{children}</RouterContext.Provider>
  )
}

/** Renders the screen registered for the current path, falling back to home. */
export const Router = () => {
  const { currentPath } = useRouter()
  const route = routeRegistry.getByPath(currentPath) ?? routeRegistry.getByPath('/')
  const Element = route?.element

  return Element ? <Element /> : null
}
