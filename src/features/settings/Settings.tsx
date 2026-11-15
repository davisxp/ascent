import { useEffect, useRef, useState } from 'react'
import { Card } from '../../ui/primitives'
import { SettingsRepositoryImpl } from '../../data/repositories'
import { exportBackup, importBackup, resetAllData } from '../../data/exportImport'
import type { UserSettings } from '../../domain/index'

export const Settings = () => {
  const fileRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<string>('')
  const [busy, setBusy] = useState(false)
  const [settings, setSettings] = useState<UserSettings | null>(null)

  useEffect(() => {
    new SettingsRepositoryImpl().get().then(setSettings)
  }, [])

  const save = async (next: UserSettings) => {
    setSettings(next)
    await new SettingsRepositoryImpl().save(next)
  }

  const onExport = async () => {
    setBusy(true)
    setStatus('')
    try {
      const { json, sizeMB, oversized } = await exportBackup()
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `ascent-backup-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      setStatus(`Exported (${sizeMB.toFixed(2)} MB)${oversized ? ' — large; consider pruning photos.' : ''}`)
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Export failed.')
    } finally {
      setBusy(false)
    }
  }

  const onImportFile = async (file: File) => {
    setBusy(true)
    setStatus('')
    try {
      const text = await file.text()
      const res = await importBackup(text)
      setStatus(res.ok ? 'Import complete.' : (res.error ?? 'Import failed.'))
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Import failed.')
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="p-6 pb-24 md:pb-6">
      <h1 className="font-display text-3xl font-bold mb-4">Settings</h1>
      <Card className="space-y-4">
        <p className="text-sm text-ink/50">Units, sound, rest defaults, export/import, demo data, reset.</p>

        {settings && (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <span className="block text-ink/60 mb-1">Sound</span>
              <select
                value={settings.sound}
                onChange={(e) => save({ ...settings, sound: e.target.value as UserSettings['sound'] })}
                className="w-full rounded-xl border border-ink/20 px-3 py-2"
              >
                <option value="on">On</option>
                <option value="off">Off</option>
              </select>
            </label>
            <label className="text-sm">
              <span className="block text-ink/60 mb-1">Theme</span>
              <select
                value={settings.theme}
                onChange={(e) => save({ ...settings, theme: e.target.value as UserSettings['theme'] })}
                className="w-full rounded-xl border border-ink/20 px-3 py-2"
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </label>
            <label className="text-sm">
              <span className="block text-ink/60 mb-1">Units</span>
              <select
                value={settings.units}
                onChange={(e) => save({ ...settings, units: e.target.value as UserSettings['units'] })}
                className="w-full rounded-xl border border-ink/20 px-3 py-2"
              >
                <option value="metric">Metric</option>
                <option value="imperial">Imperial</option>
              </select>
            </label>
            <label className="text-sm flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.wakeLock}
                onChange={(e) => save({ ...settings, wakeLock: e.target.checked })}
              />
              <span>Wake lock during workouts</span>
            </label>
            <label className="text-sm">
              <span className="block text-ink/60 mb-1">Default rest (s)</span>
              <input
                type="number"
                min={15}
                max={300}
                value={settings.defaultRestSeconds}
                onChange={(e) => save({ ...settings, defaultRestSeconds: Number(e.target.value) })}
                className="w-full rounded-xl border border-ink/20 px-3 py-2"
              />
            </label>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onExport}
            className="rounded-xl bg-pine text-white px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            Export backup
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
            className="rounded-xl border border-ink/20 px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            Import backup
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) onImportFile(f)
            }}
          />
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              if (!confirm('Reset ALL data? This cannot be undone.')) return
              setBusy(true)
              setStatus('')
              try {
                await resetAllData()
                setStatus('All data reset.')
              } catch (e) {
                setStatus(e instanceof Error ? e.message : 'Reset failed.')
              } finally {
                setBusy(false)
              }
            }}
            className="rounded-xl border border-red-500/40 text-red-600 px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            Reset all data
          </button>
        </div>
        {status && <p className="text-sm text-ink/70">{status}</p>}
      </Card>
    </div>
  )
}