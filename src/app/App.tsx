import { NavShell } from './shell/NavShell'
import { Router, RouterProvider } from './Router'
import { PwaUpdatePrompt } from '../platform/PwaUpdatePrompt'

export const App = () => {
  return (
    <RouterProvider>
      <NavShell>
        <Router />
      </NavShell>
      <PwaUpdatePrompt />
    </RouterProvider>
  )
}
