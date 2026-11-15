/**
 * Body — weight tracking, tape measurements, and progress photos.
 * Everything is stored locally via repositories; photos are picked
 * from files (no camera) and downscaled before being saved as base64.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { Badge, Button, Card, Input } from '../../ui/primitives'
import { useDialog } from '../../ui/useDialog'
import {
  BodyRepositoryImpl,
} from '../../data/repositories'
import { id, todayISO, branded } from '../../domain/ids'
import type {
  BodyEntryId,
  MeasurementId,
  PhotoId,
  DateISO,
  Kilograms,
  Centimeters,
} from '../../domain/ids'
import type {
  WeightEntry,
  MeasurementEntry,
  MeasurementSite,
  Photo,
  BodyProfile,
} from '../../domain/index'
import { weightSeries, latestBySite, bmi, bmiLabel } from './stats'
import { processPhotoFile } from './photo'

const bodyRepo = new BodyRepositoryImpl()

const SITES: MeasurementSite[] = ['shoulders', 'chest', 'waist', 'hips', 'arm', 'thigh', 'calf']

const deltaLabel = (latest: number, previous: number | null): string => {
  if (previous === null) return ''
  const d = Math.round((latest - previous) * 10) / 10
  if (d === 0) return '±0.0 cm'
  return `${d > 0 ? '+' : ''}${d.toFixed(1)} cm`
}

const WeightChart = ({ points }: { points: { date: string; kg: number }[] }) => {
  if (points.length < 2) return null
  const W = 320
  const H = 96
  const pad = 6
  const kgs = points.map((p) => p.kg)
  const min = Math.min(...kgs)
  const max = Math.max(...kgs)
  const span = Math.max(0.5, max - min)
  const x = (i: number) => pad + (i / (points.length - 1)) * (W - pad * 2)
  const y = (kg: number) => H - pad - ((kg - min) / span) * (H - pad * 2)
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(p.kg).toFixed(1)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`Weight trend from ${points[0].date} to ${points[points.length - 1].date}, between ${min} and ${max} kilograms`}>
      <path d={path} fill="none" stroke="var(--color-pine)" strokeWidth={2.5} strokeLinecap="round" />
      {points.map((p, i) => (
        <circle key={p.date + i} cx={x(i)} cy={y(p.kg)} r={2.5} fill="var(--color-pine)" />
      ))}
    </svg>
  )
}

export const Body = () => {
  const [weights, setWeights] = useState<WeightEntry[]>([])
  const [measurements, setMeasurements] = useState<MeasurementEntry[]>([])
  const [photos, setPhotos] = useState<Photo[]>([])
  const [profile, setProfile] = useState<BodyProfile | null>(null)

  const [weightInput, setWeightInput] = useState('')
  const [site, setSite] = useState<MeasurementSite>('waist')
  const [measureInput, setMeasureInput] = useState('')
  const [ageInput, setAgeInput] = useState('')
  const [heightInput, setHeightInput] = useState('')
  const [sexInput, setSexInput] = useState<'male' | 'female' | 'other'>('male')
  const [photoView, setPhotoView] = useState<Photo['view']>('front')
  const [photoBusy, setPhotoBusy] = useState(false)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [compare, setCompare] = useState<{ view: Photo['view'] } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const reload = useCallback(async () => {
    const [w, m, p, prof] = await Promise.all([
      bodyRepo.getWeightEntries(),
      bodyRepo.getMeasurementEntries(),
      bodyRepo.getPhotos(),
      bodyRepo.getProfile(),
    ])
    setWeights(w)
    setMeasurements(m)
    setPhotos(p)
    setProfile(prof)
    if (prof) {
      setAgeInput(String(prof.age ?? ''))
      setHeightInput(String(prof.heightCm ?? ''))
      setSexInput((prof.sex as 'male' | 'female' | 'other') ?? 'male')
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    Promise.all([
      bodyRepo.getWeightEntries(),
      bodyRepo.getMeasurementEntries(),
      bodyRepo.getPhotos(),
      bodyRepo.getProfile(),
    ])
      .then(([w, m, p, prof]) => {
        if (cancelled) return
        setWeights(w)
        setMeasurements(m)
        setPhotos(p)
        setProfile(prof)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const saveProfile = () => {
    const age = Number(ageInput)
    const height = Number(heightInput)
    if (!(age > 0 && height > 0)) return
    const next: BodyProfile = {
      userId: profile?.userId ?? 'user',
      age,
      heightCm: branded<Centimeters>(height),
      sex: sexInput,
      units: profile?.units ?? 'metric',
      goal: profile?.goal ?? 'balanced',
      experience: profile?.experience ?? 'beginner',
      daysPerWeek: profile?.daysPerWeek ?? 3,
      sessionLength: profile?.sessionLength ?? 45,
      barEnabled: profile?.barEnabled ?? false,
      assessmentCompleted: true,
      createdAt: profile?.createdAt ?? (new Date().toISOString() as unknown as DateISO),
      updatedAt: new Date().toISOString() as unknown as DateISO,
    }
    void bodyRepo.saveProfile(next).then(reload)
  }

  const addWeight = () => {
    const kg = Number(weightInput)
    if (!(kg > 20 && kg < 400)) return
    const entry: WeightEntry = {
      id: id() as unknown as BodyEntryId,
      date: todayISO(),
      weightKg: branded<Kilograms>(kg),
      source: 'manual',
    }
    void bodyRepo.saveWeightEntry(entry).then(reload)
    setWeightInput('')
  }

  const addMeasurement = () => {
    const cm = Number(measureInput)
    if (!(cm > 0 && cm < 250)) return
    const entry: MeasurementEntry = {
      id: id() as unknown as MeasurementId,
      date: todayISO(),
      site,
      valueCm: branded<Centimeters>(cm),
    }
    void bodyRepo.saveMeasurementEntry(entry).then(reload)
    setMeasureInput('')
  }

  const deleteWeight = (entryId: string) => {
    void bodyRepo.deleteWeightEntry(entryId).then(reload)
  }

  const pickPhoto = async (files: FileList | null) => {
    const file = files?.[0]
    if (!file) return
    setPhotoBusy(true)
    setPhotoError(null)
    try {
      const processed = await processPhotoFile(file)
      const photo: Photo = {
        id: id() as unknown as PhotoId,
        date: todayISO() as unknown as DateISO,
        view: photoView,
        blob: processed.base64,
        thumbnail: processed.thumbnail,
        width: processed.width,
        height: processed.height,
      }
      await bodyRepo.savePhoto(photo)
      await reload()
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : 'Could not process photo')
    } finally {
      setPhotoBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const deletePhoto = (photoId: string) => {
    void bodyRepo.deletePhoto(photoId).then(reload)
  }

  const series = weightSeries(weights)
  const latestWeight = series.at(-1)?.kg ?? null
  const siteSummaries = latestBySite(measurements)
  const bmiValue = latestWeight != null && profile?.heightCm ? bmi(latestWeight, profile.heightCm) : 0

  const views: Photo['view'][] = ['front', 'side', 'back']

  return (
    <div className="p-6 pb-24 md:pb-6 max-w-2xl mx-auto">
      <h1 className="font-display text-3xl font-bold tracking-tight mb-1">Body</h1>
      <p className="text-sm text-ink/60 mb-4">Weight, tape measurements, and progress photos — all on this device.</p>

      {/* profile */}
      <Card className="mb-4">
        <h2 className="font-display text-lg font-bold mb-2">Body profile</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
          <label className="text-sm">
            <span className="block text-[11px] font-mono uppercase text-ink/40 mb-1">Age</span>
            <input
              type="number"
              min="10"
              max="100"
              value={ageInput}
              onChange={(e) => setAgeInput(e.target.value)}
              className="w-full h-11 rounded-[14px] border border-ink/20 px-3"
            />
          </label>
          <label className="text-sm">
            <span className="block text-[11px] font-mono uppercase text-ink/40 mb-1">Height cm</span>
            <input
              type="number"
              min="100"
              max="250"
              value={heightInput}
              onChange={(e) => setHeightInput(e.target.value)}
              className="w-full h-11 rounded-[14px] border border-ink/20 px-3"
            />
          </label>
          <label className="text-sm">
            <span className="block text-[11px] font-mono uppercase text-ink/40 mb-1">Sex</span>
            <select
              value={sexInput}
              onChange={(e) => setSexInput(e.target.value as 'male' | 'female' | 'other')}
              className="w-full h-11 rounded-[14px] border border-ink/20 bg-white px-3 text-sm"
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </label>
          <div className="flex items-end">
            <Button onClick={saveProfile} disabled={!ageInput || !heightInput} className="h-11 px-5 w-full">
              Save
            </Button>
          </div>
        </div>
      </Card>

      {/* weight */}
      <Card className="mb-4">
        <div className="flex items-start justify-between gap-3 mb-2">
          <h2 className="font-display text-lg font-bold">Weight</h2>
          {latestWeight != null && (
            <div className="text-right">
              <p className="font-mono text-2xl font-bold">{latestWeight.toFixed(1)} kg</p>
              {profile?.heightCm ? (
                <p className="text-xs text-ink/50">
                  BMI {bmiValue} · {bmiLabel(bmiValue)}
                </p>
              ) : null}
            </div>
          )}
        </div>
        {series.length >= 2 && (
          <div className="mb-2">
            <WeightChart points={series} />
          </div>
        )}
        {series.length > 0 ? (
          <ul className="divide-y divide-ink/5 mb-3">
            {[...series].reverse().slice(0, 5).map((p) => (
              <li key={p.date} className="flex items-center justify-between py-1.5 text-sm">
                <span className="font-mono text-ink/60">{p.date}</span>
                <span className="font-mono font-bold">{p.kg.toFixed(1)} kg</span>
                <Button
                  variant="ghost"
                  className="h-8 w-8 p-0 text-ink/40"
                  aria-label={`Delete weight entry ${p.date}`}
                  onClick={() => deleteWeight(weights.find((w) => w.date === p.date && w.weightKg === p.kg)?.id ?? '')}
                >
                  ✕
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink/50 mb-3">No entries yet — log your weight to see the trend.</p>
        )}
        <div className="flex gap-2">
          <Input
            type="number"
            inputMode="decimal"
            step="0.1"
            min="20"
            max="400"
            value={weightInput}
            onChange={(e) => setWeightInput(e.target.value)}
            placeholder="kg"
            aria-label="Weight in kilograms"
            className="w-28 h-11"
          />
          <Button onClick={addWeight} disabled={!weightInput} className="h-11 px-5">
            Log weight
          </Button>
        </div>
      </Card>

      {/* measurements */}
      <Card className="mb-4">
        <h2 className="font-display text-lg font-bold mb-2">Measurements</h2>
        {siteSummaries.length > 0 ? (
          <ul className="grid grid-cols-2 gap-x-4 gap-y-1 mb-3">
            {siteSummaries.map((s) => (
              <li key={s.site} className="text-sm flex items-baseline justify-between gap-2">
                <span className="text-ink/60 capitalize">{s.site}</span>
                <span className="font-mono font-bold">
                  {s.latest.toFixed(1)}
                  {s.previous !== null && (
                    <span className={`ml-1 text-xs font-normal ${s.latest > s.previous ? 'text-pine' : s.latest < s.previous ? 'text-clay' : 'text-ink/40'}`}>
                      {deltaLabel(s.latest, s.previous)}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink/50 mb-3">No tape entries yet.</p>
        )}
        <div className="flex flex-wrap gap-2">
          <select
            value={site}
            onChange={(e) => setSite(e.target.value as MeasurementSite)}
            aria-label="Measurement site"
            className="h-11 rounded-[14px] border border-ink/20 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine"
          >
            {SITES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <Input
            type="number"
            inputMode="decimal"
            step="0.1"
            min="1"
            max="250"
            value={measureInput}
            onChange={(e) => setMeasureInput(e.target.value)}
            placeholder="cm"
            aria-label="Measurement in centimeters"
            className="w-24 h-11"
          />
          <Button onClick={addMeasurement} disabled={!measureInput} className="h-11 px-5">
            Log tape
          </Button>
        </div>
      </Card>

      {/* photos */}
      <Card>
        <div className="flex items-start justify-between gap-3 mb-2">
          <h2 className="font-display text-lg font-bold">Progress photos</h2>
          <Badge variant="info">On device only</Badge>
        </div>
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {views.map((v) => (
            <button
              key={v}
              aria-pressed={photoView === v}
              onClick={() => setPhotoView(v)}
              className={`h-11 px-4 rounded-[14px] border text-sm capitalize ${
                photoView === v ? 'bg-pine text-white border-pine' : 'bg-white border-ink/15 hover:bg-ink/5'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={(e) => void pickPhoto(e.target.files)}
            aria-label={`Pick a ${photoView} progress photo`}
            className="text-sm text-ink/60 file:h-11 file:px-4 file:rounded-[14px] file:border-0 file:bg-pine file:text-white file:mr-3"
          />
          {photoBusy && <span className="text-sm text-ink/50">Processing…</span>}
        </div>
        {photoError && (
          <p role="alert" className="text-sm text-clay mb-3">
            {photoError}
          </p>
        )}
        {photos.length === 0 ? (
          <p className="text-sm text-ink/50">No photos yet. Compare front/side/back over time.</p>
        ) : (
          <div className="space-y-4">
            {views.map((v) => {
              const forView = photos
                .filter((p) => p.view === v)
                .sort((a, b) => (a.date < b.date ? 1 : -1))
              if (forView.length === 0) return null
              return (
                <div key={v}>
                  <p className="text-[11px] font-mono uppercase tracking-widest text-ink/40 mb-1">
                    {v} ({forView.length})
                  </p>
                  <ul className="flex gap-2 overflow-x-auto pb-1">
                    {forView.map((p) => (
                      <li key={p.id} className="shrink-0">
                        <img
                          src={p.thumbnail}
                          alt={`${v} progress photo, ${p.date}`}
                          width={96}
                          height={96}
                          className="rounded-[10px] border border-ink/10 object-cover w-24 h-24"
                        />
                        <div className="flex items-center justify-between mt-1">
                          <span className="font-mono text-[10px] text-ink/40">{p.date}</span>
                          <Button
                            variant="ghost"
                            className="h-6 w-6 p-0 text-ink/40"
                            aria-label={`Delete ${v} photo from ${p.date}`}
                            onClick={() => deletePhoto(p.id)}
                          >
                            ✕
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
            {photos.filter((p) => p.view === photoView).length >= 2 && (
              <Button variant="outline" className="h-11 px-4" onClick={() => setCompare({ view: photoView })}>
                Compare {photoView} photos
              </Button>
            )}
          </div>
        )}
      </Card>

      {compare && <CompareDialog view={compare.view} onClose={() => setCompare(null)} />}
    </div>
  )
}

const PhotoPicker = ({
  photos,
  value,
  onChange,
  label,
}: {
  photos: Photo[]
  value: Photo | null
  onChange: (id: string) => void
  label: string
}) => (
  <div className="flex-1">
    <p className="text-[11px] font-mono uppercase tracking-widest text-ink/40 mb-1">{label}</p>
    <select
      value={value?.id ?? ''}
      onChange={(e) => onChange(e.target.value)}
      aria-label={`${label} photo date`}
      className="w-full h-10 rounded-[8px] border border-ink/20 bg-white px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine"
    >
      {photos.map((p) => (
        <option key={p.id} value={p.id}>
          {p.date}
        </option>
      ))}
    </select>
    {value ? (
      <img
        src={value.thumbnail}
        alt={`${label} ${value.view} photo, ${value.date}`}
        className="mt-2 w-full rounded-[10px] border border-ink/10"
      />
    ) : (
      <div className="mt-2 h-40 rounded-[10px] border border-dashed border-ink/20" />
    )}
  </div>
)

const CompareDialog = ({ view, onClose }: { view: Photo['view']; onClose: () => void }) => {
  const { containerRef, handleKeyDown } = useDialog(onClose)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [leftId, setLeftId] = useState<string | null>(null)
  const [rightId, setRightId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    bodyRepo
      .getPhotos()
      .then((all) => {
        if (cancelled) return
        const forView = all.filter((p) => p.view === view).sort((a, b) => (a.date < b.date ? 1 : -1))
        setPhotos(forView)
        setLeftId(forView[0]?.id ?? null)
        setRightId(forView[forView.length - 1]?.id ?? null)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [view])

  const left = photos.find((p) => p.id === leftId) ?? null
  const right = photos.find((p) => p.id === rightId) ?? null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Compare ${view} photos`}
      className="fixed inset-0 z-50 bg-ink/40 overflow-y-auto flex items-center justify-center p-4"
    >
      <Card ref={containerRef} tabIndex={-1} onKeyDown={handleKeyDown} className="max-w-lg w-full">
        <div className="flex items-start justify-between gap-3 mb-3">
          <h2 className="font-display text-lg font-bold capitalize">Compare {view} photos</h2>
          <Button variant="ghost" onClick={onClose} aria-label="Close compare" className="h-9 w-9 p-0">
            ✕
          </Button>
        </div>
        {photos.length < 2 ? (
          <p className="text-sm text-ink/50 mb-3">Need at least two {view} photos to compare.</p>
        ) : (
          <div className="flex gap-4">
            <PhotoPicker photos={photos} value={left} onChange={setLeftId} label="Earlier" />
            <PhotoPicker photos={photos} value={right} onChange={setRightId} label="Latest" />
          </div>
        )}
        <Button variant="outline" className="h-11 px-4 mt-4 w-full" onClick={onClose}>
          Done
        </Button>
      </Card>
    </div>
  )
}
