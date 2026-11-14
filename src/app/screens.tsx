import { NavShell } from './shell/NavShell'

const screen = (title: string, subtitle: string) => () => (
  <NavShell>
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="font-display text-3xl font-bold tracking-tight mb-2">{title}</h1>
      <p className="text-ink/60 text-sm">{subtitle}</p>
    </div>
  </NavShell>
)

export const TodayScreen = screen('Today', 'Your daily training overview.')
export const TrainScreen = screen('Train', 'Workout player and week view.')
export const SkillsScreen = screen('Skills', 'Skill trees.')
export const LibraryScreen = screen('Library', 'Exercise library.')
export const BodyScreen = screen('Body', 'Body metrics and photos.')
export const FuelScreen = screen('Fuel', 'Nutrition and macros.')
export const ProgressScreen = screen('Progress', 'Progress charts and stats.')
export const HistoryScreen = screen('History', 'Workout history.')
export const SettingsScreen = screen('Settings', 'App settings.')
