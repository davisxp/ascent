import { useState } from 'react'
import { Button, Card, Input } from '../../ui/primitives'
import { BodyRepositoryImpl } from '../../data/repositories'
import { branded } from '../../domain/ids'
import type { DateISO, Centimeters } from '../../domain/ids'
import { useRouter } from '../../app/useRouter'

const bodyRepo = new BodyRepositoryImpl()

export const Onboarding = () => {
  const { navigate } = useRouter()
  const [age, setAge] = useState('')
  const [height, setHeight] = useState('')
  const [days, setDays] = useState('4')
  const [done, setDone] = useState(false)

  const submit = async () => {
    const a = Number(age)
    const h = Number(height)
    if (!(a > 0 && h > 0)) return
    await bodyRepo.saveProfile({
      userId: 'user',
      age: a,
      heightCm: branded<Centimeters>(h),
      sex: 'male',
      units: 'metric',
      goal: 'balanced',
      experience: 'beginner',
      daysPerWeek: Number(days) as 2 | 3 | 4 | 5 | 6,
      sessionLength: 45,
      barEnabled: false,
      assessmentCompleted: true,
      createdAt: new Date().toISOString() as unknown as DateISO,
      updatedAt: new Date().toISOString() as unknown as DateISO,
    })
    setDone(true)
    setTimeout(() => navigate('/'), 600)
  }

  return (
    <div className="p-6 pb-24 md:pb-6 max-w-md mx-auto">
      <h1 className="font-display text-3xl font-bold tracking-tight mb-1">Welcome to ASCENT</h1>
      <p className="text-sm text-ink/60 mb-4">A few details to tailor your plan.</p>
      <Card className="space-y-3">
        <label className="block text-sm">
          <span className="block text-[11px] font-mono uppercase text-ink/40 mb-1">Age</span>
          <Input type="number" min="10" max="100" value={age} onChange={(e) => setAge(e.target.value)} className="w-full h-11" />
        </label>
        <label className="block text-sm">
          <span className="block text-[11px] font-mono uppercase text-ink/40 mb-1">Height (cm)</span>
          <Input type="number" min="100" max="250" value={height} onChange={(e) => setHeight(e.target.value)} className="w-full h-11" />
        </label>
        <label className="block text-sm">
          <span className="block text-[11px] font-mono uppercase text-ink/40 mb-1">Days per week</span>
          <select
            value={days}
            onChange={(e) => setDays(e.target.value)}
            className="w-full h-11 rounded-[14px] border border-ink/20 bg-white px-3 text-sm"
          >
            {[2, 3, 4, 5, 6].map((d) => (
              <option key={d} value={d}>
                {d} days
              </option>
            ))}
          </select>
        </label>
        <Button onClick={submit} disabled={!age || !height} className="h-11 w-full">
          {done ? 'Saved — heading home…' : 'Start training'}
        </Button>
      </Card>
    </div>
  )
}