import { useState, useCallback } from 'react'
import { routeRegistry } from '../contracts/registries'
import { RouterContext } from './RouterContext'

export const Router = () => {
  const [currentPath, setCurrentPath] = useState(window.location.pathname || '/')

  const navigate = useCallback((path: string) => {
    setCurrentPath(path)
    window.history.pushState({}, '', path)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }, [])

  const route = routeRegistry.getByPath(currentPath)
  const Element = route?.element

  return (
    <RouterContext.Provider value={{ currentPath, navigate }}>
      {Element ? <Element /> : null}
    </RouterContext.Provider>
  )
}
