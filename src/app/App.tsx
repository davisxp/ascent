import { NavShell } from './shell/NavShell'
import { Router, RouterProvider } from './Router'

export const App = () => {
  return (
    <RouterProvider>
      <NavShell>
        <Router />
      </NavShell>
    </RouterProvider>
  )
}
