import { routeRegistry, navRegistry } from '../contracts/registries'
import {
  TodayScreen,
  TrainScreen,
  SkillsScreen,
  LibraryScreen,
  BodyScreen,
  FuelScreen,
  ProgressScreen,
  HistoryScreen,
  SettingsScreen,
} from './screens'

const routes = [
  { path: '/', element: TodayScreen, label: 'Today', icon: 'T' },
  { path: '/train', element: TrainScreen, label: 'Train', icon: 'T' },
  { path: '/skills', element: SkillsScreen, label: 'Skills', icon: 'S' },
  { path: '/library', element: LibraryScreen, label: 'Library', icon: 'L' },
  { path: '/body', element: BodyScreen, label: 'Body', icon: 'B' },
  { path: '/fuel', element: FuelScreen, label: 'Fuel', icon: 'F' },
  { path: '/progress', element: ProgressScreen, label: 'Progress', icon: 'P' },
  { path: '/history', element: HistoryScreen, label: 'History', icon: 'H' },
  { path: '/settings', element: SettingsScreen, label: 'Settings', icon: 'S' },
]

for (const r of routes) {
  routeRegistry.register(r)
  navRegistry.register({ id: r.path, label: r.label, href: r.path, icon: r.icon ?? '' })
}
