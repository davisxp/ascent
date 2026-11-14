import { createContext, useState, useCallback } from 'react'
import { routeRegistry } from '../contracts/registries'

type RouterContextValue = {
  currentPath: string
  navigate: (path: string) => void
}

const RouterContext = createContext<RouterContextValue>({
  currentPath: '/',
  navigate: () => {},
})

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
