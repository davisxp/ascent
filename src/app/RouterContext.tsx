import { createContext } from 'react'

export type RouterContextValue = {
  currentPath: string
  navigate: (path: string) => void
}

export const RouterContext = createContext<RouterContextValue>({
  currentPath: '/',
  navigate: () => {},
})
