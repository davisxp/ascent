/**
 * App shell — navigation containers.
 * Desktop: fixed sidebar. Mobile: bottom tabs.
 * Routes/nav items registered via registries.
 */

import { type ReactNode } from 'react'
import { useRouter } from '../useRouter'
import { navRegistry } from '../../contracts/registries'
import { Button } from '../../ui/primitives'

export const NavShell = ({ children }: { children: ReactNode }) => {
  const { currentPath, navigate } = useRouter()
  const mobileItems = navRegistry.getMobile()
  const desktopItems = navRegistry.getDesktop()

  const isActive = (href: string) => currentPath === href

  return (
    <div className="flex h-screen flex-col paper-bg overflow-hidden">
      <aside className="hidden md:flex w-64 flex-col border-r border-ink/10 bg-white/80 z-20">
        <div className="p-4">
          <h1 className="font-display text-xl font-bold tracking-tight">ASCENT</h1>
          <p className="text-[11px] text-ink/40 uppercase tracking-widest mt-1">
            training journal
          </p>
        </div>
        <nav className="mt-6 space-y-1 px-4">
          {desktopItems.map((item) => {
            const active = isActive(item.href)
            return (
              <Button
                key={item.id}
                variant={active ? 'primary' : 'outline'}
                className="w-full justify-start text-left px-3"
                onClick={() => navigate(item.href)}
              >
                {item.label}
              </Button>
            )
          })}
        </nav>
      </aside>

      <div className="flex-1 relative overflow-y-auto">{children}</div>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t border-ink/10 bg-white/90 backdrop-blur-md z-40">
        <div className="flex justify-around px-2 py-2">
          {mobileItems.map((item) => {
            const active = isActive(item.href)
            return (
              <button
                key={item.id}
                className="flex flex-col items-center gap-1 text-[11px]"
                onClick={() => navigate(item.href)}
              >
                <span className="text-sm">{item.label.slice(0, 1)}</span>
                <span className={active ? 'font-bold text-pine' : 'text-ink/50'}>
                  {item.label}
                </span>
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

export const Layout = ({ children }: { children: ReactNode }) => {
  return <div className="paper-bg min-h-screen">{children}</div>
}
