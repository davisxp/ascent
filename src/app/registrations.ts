import { routeRegistry, navRegistry, sliceRegistry } from '../contracts/registries'
import { Today } from '../features/today/Today'
import { Skills } from '../features/skills/Skills'
import { Settings } from '../features/settings/Settings'
import { Onboarding } from '../features/onboarding/Onboarding'
import { Wardrobe } from '../features/wardrobe/Wardrobe'
import { Curriculum as Intellectuals } from '../features/curriculum/Curriculum'
import { Grooming as Skincare } from '../features/grooming/Grooming'
import { Finances } from '../features/finances/Finances'
import { Investments } from '../features/investments/Investments'
import { Workouts } from '../features/workouts/Workouts'
import { Medical } from '../features/medical/Medical'
import { Nutrition } from '../features/nutrition/Nutrition'
import { Network } from '../features/network/Network'
import { Career } from '../features/career/Career'
import { Estate } from '../features/estate/Estate'
import { useTrainStore } from '../features/train/store'

const routes = [
  { path: '/', element: Today, label: 'Dashboard', icon: 'home' },
  { path: '/finances', element: Finances, label: 'Finances', icon: 'chart' },
  { path: '/investments', element: Investments, label: 'Investments', icon: 'chart' },
  { path: '/wardrobe', element: Wardrobe, label: 'Wardrobe', icon: 'shirt' },
  { path: '/intellectuals', element: Intellectuals, label: 'Intellectuals', icon: 'book' },
  { path: '/skincare', element: Skincare, label: 'Skincare', icon: 'sparkles' },
  { path: '/workouts', element: Workouts, label: 'Workouts', icon: 'dumbbell' },
  { path: '/skills', element: Skills, label: 'Skills', icon: 'star' },
  { path: '/medical', element: Medical, label: 'Medical', icon: 'user' },
  { path: '/nutrition', element: Nutrition, label: 'Nutrition', icon: 'utensils' },
  { path: '/network', element: Network, label: 'Network', icon: 'users' },
  { path: '/career', element: Career, label: 'Career', icon: 'star' },
  { path: '/estate', element: Estate, label: 'Estate & Home', icon: 'home' },
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

// No dead nav entries: every route in `routes` above is registered,
// so there are no /progress,/history,/library,/fuel items to filter.
