import { routeRegistry, navRegistry, sliceRegistry } from '../contracts/registries'
import { Today } from '../features/today/Today'
import { Train } from '../features/train/WeekView'
import { Skills } from '../features/skills/Skills'
import { Library } from '../features/library/Library'
import { Body } from '../features/body/Body'
import { Fuel } from '../features/fuel/Fuel'
import { Progress } from '../features/insights/Progress'
import { History } from '../features/history/History'
import { Settings } from '../features/settings/Settings'
import { Onboarding } from '../features/onboarding/Onboarding'
import { useTrainStore } from '../features/train/store'

const routes = [
  { path: '/', element: Today, label: 'Today', icon: 'home' },
  { path: '/train', element: Train, label: 'Train', icon: 'dumbbell' },
  { path: '/skills', element: Skills, label: 'Skills', icon: 'star' },
  { path: '/library', element: Library, label: 'Library', icon: 'book' },
  { path: '/body', element: Body, label: 'Body', icon: 'user' },
  { path: '/fuel', element: Fuel, label: 'Fuel', icon: 'utensils' },
  { path: '/progress', element: Progress, label: 'Progress', icon: 'chart' },
  { path: '/history', element: History, label: 'History', icon: 'clock' },
  { path: '/settings', element: Settings, label: 'Settings', icon: 'gear' },
  { path: '/onboarding', element: Onboarding, label: 'Onboarding', icon: 'star' },
]

for (const r of routes) {
  routeRegistry.register(r)
}

// Train slice — registered through the central slice registry.
sliceRegistry.register({ name: 'train', create: () => useTrainStore })

// Desktop sidebar: all routes except onboarding
for (const r of routes) {
  if (r.path === '/onboarding') continue
  navRegistry.register({ id: r.path, label: r.label, href: r.path, icon: r.icon, mobileOnly: false, desktopOnly: false })
}

// Mobile bottom tabs: Today, Train, Skills, Body, More (Settings as More)
// Mark the extra ones as desktop-only for mobile to keep 4 tabs? Simpler: mark Progress/History as desktopOnly on mobile.
for (const item of navRegistry.items) {
  if (['/progress', '/history', '/library', '/fuel'].includes(item.href)) {
    item.mobileOnly = false
    item.desktopOnly = true
  }
}
