/**
 * Investments — The Portfolio.
 * Mirrors the Compendium investments section and Full_Lifestyle.xlsm:
 * five wrappers, target allocations, GIA pots, pension rates, the
 * emergency fund, performance against the all-world benchmark and a
 * compound projection calculator.
 */

import { useEffect, useMemo, useState } from 'react'
import {
  FinancePlanRepositoryImpl,
  InvestmentPlanRepositoryImpl,
} from '../../data/repositories'
import { financeSeed } from '../../content/financePlan'
import { investmentSeed } from '../../content/investmentPlan'
import { computeFinance, daysUntilTaxYearEnd, taxYearEndISO } from '../../engine/finance'
import {
  allocationTotal,
  computeInvestments,
  projectPortfolio,
} from '../../engine/investment'
import type { AccountKey, AllocationSlice, InvestmentAccount, InvestmentPlan } from '../../domain/investment'
import {
  Bar,
  EditToggle,
  NumberField,
  Panel,
  RowButton,
  Stat,
  CompactText,
} from '../../ui/panels'
import { clamp, formatDateMed, money, money0, percent, percentInput, signedMoney, signedPercent, todayISO } from '../../ui/format'

const financeRepo = new FinancePlanRepositoryImpl()
const investmentRepo = new InvestmentPlanRepositoryImpl()

const ALLOC_COLORS = [
  'var(--color-pine)',
  'var(--color-marigold)',
  'var(--color-teal)',
  'var(--color-clay)',
  'var(--color-slate-blue)',
  'var(--color-plum)',
]

type TargetKey = 'isaTarget' | 'lisaTarget' | 'sippTarget'

const Donut = ({
  slices,
  label,
  sub,
  size = 150,
}: {
  slices: AllocationSlice[]
  label: string
  sub: string
  size?: number
}) => {
  const radius = size / 2 - 10
  const circumference = 2 * Math.PI * radius
  const lengths = slices.map((slice) => circumference * clamp(slice.p, 0, 1))
  const offsets = lengths.map((_, index) =>
    lengths.slice(0, index).reduce((total, length) => total + length, 0),
  )

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={`${label} target allocation`}
      className="shrink-0"
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--color-border)"
        strokeWidth="17"
      />
      {slices.map((slice, index) => {
        const length = lengths[index]
        const dash = `${Math.max(0, length - 1.5)} ${circumference - length + 1.5}`
        const rotation = -90
        return (
          <circle
            key={`${slice.name}-${index}`}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={ALLOC_COLORS[index % ALLOC_COLORS.length]}
            strokeWidth="17"
            strokeDasharray={dash}
            strokeDashoffset={-offsets[index]}
            transform={`rotate(${rotation} ${size / 2} ${size / 2})`}
          />
        )
      })}
      <text
        x="50%"
        y="47%"
        textAnchor="middle"
        fontFamily="Fraunces, serif"
        fontSize="17"
        fill="var(--color-ink)"
      >
        {label}
      </text>
      <text
        x="50%"
        y="58%"
        textAnchor="middle"
        fontFamily="IBM Plex Mono, monospace"
        fontSize="9"
        letterSpacing="1.5"
        fill="var(--color-ink-soft)"
      >
        {sub}
      </text>
    </svg>
  )
}

const Stacked = ({ slices }: { slices: AllocationSlice[] }) => (
  <div
    className="flex h-3.5 w-full overflow-hidden rounded-full border border-ink/10"
    role="img"
    aria-label={slices.map((slice) => `${slice.name} ${percent(slice.p, 0)}`).join(', ')}
  >
    {slices.map((slice, index) => (
      <div
        key={`${slice.name}-${index}`}
        style={{
          width: `${clamp(slice.p, 0, 1) * 100}%`,
          backgroundColor: ALLOC_COLORS[index % ALLOC_COLORS.length],
        }}
        title={`${slice.name} ${percent(slice.p, 0)}`}
      />
    ))}
  </div>
)

const Legend = ({
  slices,
  withTicker = false,
  editing = false,
  onShare,
}: {
  slices: AllocationSlice[]
  withTicker?: boolean
  editing?: boolean
  onShare?: (index: number, p: number) => void
}) => (
  <ul className="space-y-1.5 text-sm">
    {slices.map((slice, index) => (
      <li key={`${slice.name}-${index}`} className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className="h-2.5 w-2.5 shrink-0 rounded-[3px]"
          style={{ backgroundColor: ALLOC_COLORS[index % ALLOC_COLORS.length] }}
        />
        <span className="min-w-0 truncate">
          {slice.name}
          {withTicker && slice.ticker && slice.ticker !== 'N/A' && (
            <span className="ml-1 font-mono text-[10px] text-ink/70">{slice.ticker}</span>
          )}
        </span>
        <span className="text-[10px] uppercase tracking-wider text-ink/70">{slice.cls}</span>
        {editing && onShare ? (
          <input
            type="number"
            aria-label={`${slice.name} share percent`}
            className="ml-auto w-14 border-b border-marigold/60 bg-transparent text-right font-mono text-sm outline-none focus:border-pine"
            value={Math.round(slice.p * 100)}
            min={0}
            max={100}
            step={1}
            onChange={(event) => onShare(index, (Number(event.target.value) || 0) / 100)}
          />
        ) : (
          <span className="ml-auto font-mono tabular-nums">{percent(slice.p, 0)}</span>
        )}
      </li>
    ))}
  </ul>
)

const ACCOUNT_ORDER: AccountKey[] = ['isa', 'lisa', 'sipp', 'company', 'gia']

export const Investments = () => {
  const [plan, setPlan] = useState<InvestmentPlan>(investmentSeed)
  const [monthlyNonSavings, setMonthlyNonSavings] = useState(
    computeFinance(financeSeed).nonSavings,
  )
  const [loaded, setLoaded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [years, setYears] = useState(20)
  const [rate, setRate] = useState(7)
  const [monthly, setMonthly] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([investmentRepo.get(), financeRepo.get()])
      .then(async ([stored, finance]) => {
        const nextInvestment = stored ?? investmentSeed
        const nextFinance = finance ?? financeSeed
        if (!stored) await investmentRepo.save(nextInvestment)
        if (!finance) await financeRepo.save(nextFinance)
        if (!cancelled) {
          setPlan(nextInvestment)
          setMonthlyNonSavings(computeFinance(nextFinance).nonSavings)
          setLoaded(true)
        }
      })
      .catch(() => {
        if (!cancelled) setLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const totals = useMemo(
    () => computeInvestments(plan, monthlyNonSavings),
    [plan, monthlyNonSavings],
  )
  const defaultMonthly =
    totals.accounts.isa.monthly +
    totals.accounts.lisa.monthly +
    totals.accounts.sipp.monthly +
    totals.accounts.gia.monthly
  const contribution = monthly ?? defaultMonthly
  const projection = projectPortfolio(totals.nav, years, rate, contribution)
  const today = todayISO()

  const save = (next: InvestmentPlan) => {
    setPlan(next)
    void investmentRepo.save(next)
  }

  const update = (patch: Partial<InvestmentPlan>) => save({ ...plan, ...patch })

  const setAccount = (key: AccountKey, patch: Partial<InvestmentAccount>) =>
    update({
      accounts: plan.accounts.map((account) =>
        account.key === key ? { ...account, ...patch } : account,
      ),
    })

  const setShare = (which: TargetKey, index: number, p: number) => {
    const next = (slices: AllocationSlice[]) =>
      slices.map((slice, i) => (i === index ? { ...slice, p } : slice))
    if (which === 'isaTarget') update({ isaTarget: next(plan.isaTarget) })
    else if (which === 'lisaTarget') update({ lisaTarget: next(plan.lisaTarget) })
    else update({ sippTarget: next(plan.sippTarget) })
  }

  const allowanceWidth = (left: number | null, total: number | null): number => {
    if (left === null || total === null || total <= 0) return 0
    return clamp((1 - left / total) * 100, 0, 100)
  }

  return (
    <main className="p-6 pb-24 md:pb-6 space-y-6 text-ink max-w-6xl mx-auto">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Investments</h1>
          <p className="text-ink/70 text-sm mt-1 max-w-2xl">
            Five wrappers, one allocation each. Values, capital, monthly contributions,
            allowances and pots are all yours — gains, headroom and the emergency target
            recompute instantly.
          </p>
          <p className="text-[11px] font-mono uppercase tracking-widest text-ink/70 mt-2">
            Workbook review · {formatDateMed(plan.asOf)} · benchmark as of{' '}
            {formatDateMed(plan.benchmark.asOf)}
          </p>
        </div>
        <EditToggle editing={editing} onToggle={() => setEditing((value) => !value)} />
      </header>

      {!loaded && <p className="text-sm text-ink/70">Loading the portfolio…</p>}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Personal NAV"
          value={money(totals.nav)}
          sub="ISA · LISA · SIPP"
          tone="pine"
        />
        <Stat
          label="Capital invested"
          value={money0(totals.investedSum)}
          sub="Across all accounts"
          tone="ink"
        />
        <Stat
          label="Total gain"
          value={signedMoney(totals.gain)}
          sub={`${signedPercent(totals.pct, 1)} all-time`}
          tone={totals.gain >= 0 ? 'pine' : 'clay'}
        />
        <Stat
          label="Accessible NAV"
          value={money0(totals.accessible)}
          sub={totals.accessible > 0 ? 'ISA = the liquid wrapper' : 'Everything is locked or invested'}
          tone={totals.accessible > 0 ? 'ink' : 'clay'}
        />
      </div>

      <Panel title="Accounts overview" sub={`Pension sum ${money0(totals.pensionSum)}`}>
        <div
          className="overflow-x-auto rounded-[10px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine focus-visible:ring-offset-2"
          role="region"
          aria-label="Accounts overview table, scrollable"
          tabIndex={0}
        >
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-widest font-mono text-ink/70">
                <th className="pb-2 pr-3 font-normal">Wrapper</th>
                <th className="pb-2 pr-3 text-right font-normal">Value</th>
                <th className="pb-2 pr-3 text-right font-normal">Invested</th>
                <th className="pb-2 pr-3 text-right font-normal">Gain</th>
                <th className="pb-2 pr-3 text-right font-normal">Annualised</th>
                <th className="pb-2 pr-3 text-right font-normal">Alpha</th>
                <th className="pb-2 pr-3 text-right font-normal">Monthly in</th>
                <th className="pb-2 font-normal">Allowance remaining</th>
              </tr>
            </thead>
            <tbody>
              {ACCOUNT_ORDER.map((key) => {
                const account = totals.accounts[key]
                const row = plan.accounts.find((item) => item.key === key)
                return (
                  <tr key={key} className="border-t border-ink/5">
                    <td className="py-2 pr-3">
                      <b>{account.name}</b>
                      {account.role && (
                        <span className="block text-[11px] text-ink/70">{account.role}</span>
                      )}
                    </td>
                    <td className="py-2 pr-3 text-right font-mono tabular-nums">
                      {money(account.value)}
                    </td>
                    <td className="py-2 pr-3 text-right font-mono tabular-nums">
                      {money0(account.invested)}
                    </td>
                    <td
                      className={`py-2 pr-3 text-right font-mono tabular-nums ${account.pct > 0 ? 'text-pine' : ''}`}
                    >
                      {account.invested ? `+${money(account.gain)} (${percent(account.pct, 2)})` : '—'}
                    </td>
                    <td className="py-2 pr-3 text-right font-mono tabular-nums">
                      {account.invested ? percent(account.annualised, 2) : '—'}
                    </td>
                    <td
                      className={`py-2 pr-3 text-right font-mono tabular-nums ${account.alpha >= 0 ? 'text-pine' : 'text-clay-deep'}`}
                    >
                      {account.invested
                        ? `${account.alpha >= 0 ? '+' : ''}${(account.alpha * 100).toFixed(2)} pp`
                        : '—'}
                    </td>
                    <td className="py-2 pr-3 text-right font-mono tabular-nums">
                      {money0(account.monthly)}
                    </td>
                    <td className="py-2 min-w-[190px]">
                      {account.allowanceLeft === null || row?.allowanceTotal === null ? (
                        <span className="text-ink/70 text-[11px]">n/a</span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Bar
                            value={allowanceWidth(account.allowanceLeft, account.allowanceTotal)}
                            tone="marigold"
                            slim
                            label={`${account.name} allowance used`}
                          />
                          <span className="whitespace-nowrap text-[11px] text-ink/70 font-mono">
                            {money0(account.allowanceLeft)} of {money0(account.allowanceTotal ?? 0)}
                          </span>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
              <tr className="border-t border-ink/20">
                <td className="py-2 pr-3 font-bold">Pension sum (SIPP + company)</td>
                <td className="py-2 pr-3 text-right font-mono tabular-nums" colSpan={7}>
                  {money0(totals.pensionSum)} · personal{' '}
                  {percent(plan.pensionRates.personal, 0)} + company{' '}
                  {percent(plan.pensionRates.company, 0)} contributions
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs text-ink/70 mt-3">
          Use-it-or-lose-it: the ISA and LISA allowances reset on 5 April —{' '}
          <b>{daysUntilTaxYearEnd(today)} days</b> (
          {formatDateMed(taxYearEndISO(today))}).
        </p>
      </Panel>

      {editing && (
        <Panel title="Account detail" sub="Value · capital · monthly · allowance">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {plan.accounts.map((account) => (
              <div key={account.key} className="rounded-[10px] border border-ink/10 p-3 space-y-3">
                <p className="font-medium">
                  {account.name}
                  {account.role && <span className="text-ink/70 text-[11px]"> · {account.role}</span>}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <NumberField
                    label="Value"
                    value={account.value}
                    onChange={(value) => setAccount(account.key, { value })}
                    prefix="£"
                  />
                  <NumberField
                    label="Capital invested"
                    value={account.invested}
                    onChange={(invested) => setAccount(account.key, { invested })}
                    prefix="£"
                  />
                  <NumberField
                    label="Monthly in"
                    value={account.monthly}
                    onChange={(monthlyIn) => setAccount(account.key, { monthly: monthlyIn })}
                    prefix="£"
                    step={5}
                  />
                  {account.allowanceTotal !== null && (
                    <NumberField
                      label="Allowance cap"
                      value={account.allowanceTotal}
                      onChange={(allowanceTotal) => setAccount(account.key, { allowanceTotal })}
                      prefix="£"
                      step={100}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
          <hr className="my-4 border-ink/10" />
          <div className="grid gap-3 sm:grid-cols-3">
            <NumberField
              label="Personal pension rate"
              value={percentInput(plan.pensionRates.personal)}
              onChange={(value) =>
                update({
                  pensionRates: { ...plan.pensionRates, personal: value / 100 },
                })
              }
              suffix="%"
              step={0.5}
            />
            <NumberField
              label="Company pension rate"
              value={percentInput(plan.pensionRates.company)}
              onChange={(value) =>
                update({
                  pensionRates: { ...plan.pensionRates, company: value / 100 },
                })
              }
              suffix="%"
              step={0.5}
            />
            <NumberField
              label="Emergency fund months"
              value={plan.emergencyMonths}
              onChange={(emergencyMonths) => update({ emergencyMonths })}
              suffix="mo"
              step={1}
            />
            <NumberField
              label="Benchmark (5-yr VT)"
              value={percentInput(plan.benchmark.value)}
              onChange={(value) =>
                update({
                  benchmark: { ...plan.benchmark, value: value / 100 },
                })
              }
              suffix="%"
              step={0.1}
            />
          </div>
        </Panel>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="ISA target allocation" sub="Funds from Oct 2026">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:flex-wrap">
            <Donut slices={plan.isaTarget} label="ISA" sub="TARGET MODEL" />
            <div className="w-full min-w-[9rem] flex-1">
              <Legend
                slices={plan.isaTarget}
                withTicker
                editing={editing}
                onShare={(index, p) => setShare('isaTarget', index, p)}
              />
            </div>
          </div>
        </Panel>

        <Panel title="LISA allocation" sub="House deposit">
          <Stacked slices={plan.lisaTarget} />
          <div className="mt-3">
            <Legend
              slices={plan.lisaTarget}
              editing={editing}
              onShare={(index, p) => setShare('lisaTarget', index, p)}
            />
          </div>
          <hr className="my-3 border-ink/10" />
          <p className="font-display text-base mb-2">SIPP allocation</p>
          <Stacked slices={plan.sippTarget} />
          <div className="mt-3">
            <Legend
              slices={plan.sippTarget}
              editing={editing}
              onShare={(index, p) => setShare('sippTarget', index, p)}
            />
          </div>
        </Panel>

        <Panel title="GIA pots" sub={`${money0(totals.potMonthly)}/mo to split`}>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-widest font-mono text-ink/70">
                <th className="pb-2 font-normal">Pot</th>
                <th className="pb-2 text-right font-normal">Share</th>
                <th className="pb-2 text-right font-normal">Monthly</th>
                {editing && <th className="pb-2" />}
              </tr>
            </thead>
            <tbody>
              {plan.pots.map((pot) => (
                <tr key={pot.id} className="border-t border-ink/5">
                  <td className="py-2 pr-2">
                    {editing ? (
                      <CompactText
                        label={`${pot.name} name`}
                        value={pot.name}
                        onChange={(name) =>
                          update({
                            pots: plan.pots.map((row) =>
                              row.id === pot.id ? { ...row, name } : row,
                            ),
                          })
                        }
                      />
                    ) : (
                      pot.name
                    )}
                  </td>
                  <td className="py-2 text-right font-mono tabular-nums">
                    {editing ? (
                      <input
                        type="number"
                        aria-label={`${pot.name} share percent`}
                        className="w-14 border-b border-marigold/60 bg-transparent text-right font-mono text-sm outline-none focus:border-pine"
                        value={Math.round(pot.p * 100)}
                        min={0}
                        max={100}
                        onChange={(event) =>
                          update({
                            pots: plan.pots.map((row) =>
                              row.id === pot.id
                                ? { ...row, p: (Number(event.target.value) || 0) / 100 }
                                : row,
                            ),
                          })
                        }
                      />
                    ) : (
                      percent(pot.p, 0)
                    )}
                  </td>
                  <td className="py-2 text-right font-mono tabular-nums">
                    {money(totals.potMonthly * pot.p)}
                  </td>
                  {editing && (
                    <td className="py-2 pl-2">
                      <RowButton
                        label={`Remove ${pot.name}`}
                        tone="clay"
                        onClick={() =>
                          update({ pots: plan.pots.filter((row) => row.id !== pot.id) })
                        }
                      >
                        ✕
                      </RowButton>
                    </td>
                  )}
                </tr>
              ))}
              <tr className="border-t border-ink/20">
                <td className="py-2 font-bold">Total</td>
                <td className="py-2 text-right font-mono tabular-nums">
                  {percent(allocationTotal(plan.pots), 0)}
                </td>
                <td className="py-2 text-right font-mono tabular-nums">
                  {money0(totals.potMonthly)}
                </td>
                {editing && <td />}
              </tr>
            </tbody>
          </table>
          {editing && (
            <button
              type="button"
              onClick={() =>
                update({
                  pots: [...plan.pots, { id: crypto.randomUUID(), name: 'New pot', p: 0 }],
                })
              }
              className="mt-3 min-h-11 w-full rounded-[10px] border border-dashed border-ink/20 text-sm text-ink/70 hover:bg-ink/5"
            >
              + Add pot
            </button>
          )}
          <p className="text-xs text-ink/70 mt-3">
            All pots currently hold {money0(totals.accounts.gia.value)} — funding begins with the
            October payroll.
          </p>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          title="Emergency fund"
          sub={`${plan.emergencyMonths} × monthly non-savings spend`}
        >
          <div className="flex items-baseline gap-2">
            <span className="font-display text-3xl">{money0(totals.accessible)}</span>
            <span className="text-xs text-ink/70">of {money0(totals.emergencyTarget)} target</span>
          </div>
          <div className="my-3">
            <Bar
              value={
                totals.emergencyTarget ? (totals.accessible / totals.emergencyTarget) * 100 : 0
              }
              tone="clay"
              label="Emergency fund progress"
            />
          </div>
          <p className="text-xs text-ink/70 leading-relaxed">
            Target = {plan.emergencyMonths} × {money0(monthlyNonSavings)} of monthly non-savings
            spend, held in the ISA.{' '}
            {totals.emergencyTarget - totals.accessible >= 0 ? (
              <>
                Required today: <b>{money0(totals.emergencyTarget - totals.accessible)}</b> more.
              </>
            ) : (
              <>
                <b>{money0(totals.accessible - totals.emergencyTarget)}</b> above target.
              </>
            )}
          </p>
        </Panel>

        <Panel
          title="Performance vs benchmark"
          sub={`${plan.benchmark.label}: ${percent(plan.benchmark.value, 2)}`}
        >
          {(() => {
            const rows = [
              { label: 'SIPP', value: totals.accounts.sipp.annualised },
              { label: 'LISA', value: totals.accounts.lisa.annualised },
            ]
            const scale = Math.max(...rows.map((row) => row.value), plan.benchmark.value, 0.0001)
            return (
              <div className="space-y-4">
                {rows.map((row) => {
                  const delta = (row.value - plan.benchmark.value) * 100
                  return (
                    <div key={row.label}>
                      <div className="flex items-baseline justify-between gap-2 text-sm">
                        <span>
                          {row.label} — annualised {percent(row.value, 2)}
                        </span>
                        <b className={delta >= 0 ? 'text-pine' : 'text-clay-deep'}>
                          {delta >= 0 ? '+' : ''}
                          {delta.toFixed(2)} pp
                        </b>
                      </div>
                      <div className="mt-1">
                        <Bar
                          value={(row.value / scale) * 100}
                          tone={delta >= 0 ? 'pine' : 'clay'}
                          slim
                          label={`${row.label} ${percent(row.value, 2)}`}
                        />
                      </div>
                    </div>
                  )
                })}
                <div>
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span>Benchmark (VT)</span>
                    <b>{percent(plan.benchmark.value, 2)}</b>
                  </div>
                  <div className="mt-1">
                    <Bar
                      value={(plan.benchmark.value / scale) * 100}
                      tone="marigold"
                      slim
                      label={`Benchmark ${percent(plan.benchmark.value, 2)}`}
                    />
                  </div>
                </div>
              </div>
            )
          })()}
          <p className="text-[11px] text-ink/70 mt-3">
            Annualised = percentage gain ÷ years held, as in the workbook.
          </p>
        </Panel>
      </div>

      <Panel title="Projection calculator" sub="Illustrative · pre-inflation">
        <div className="grid gap-6 md:grid-cols-3">
          <label className="block">
            <span className="flex justify-between text-sm">
              <span>Years</span>
              <b className="font-mono">{years}</b>
            </span>
            <input
              type="range"
              className="mt-2 w-full accent-pine"
              min={1}
              max={40}
              value={years}
              onChange={(event) => setYears(Number(event.target.value))}
              aria-label="Projection years"
            />
          </label>
          <label className="block">
            <span className="flex justify-between text-sm">
              <span>Annual return</span>
              <b className="font-mono">{rate}%</b>
            </span>
            <input
              type="range"
              className="mt-2 w-full accent-pine"
              min={0}
              max={12}
              step={0.5}
              value={rate}
              onChange={(event) => setRate(Number(event.target.value))}
              aria-label="Projection annual return"
            />
          </label>
          <label className="block">
            <span className="flex justify-between text-sm">
              <span>Monthly in</span>
              <b className="font-mono">{money0(contribution)}</b>
            </span>
            <input
              type="range"
              className="mt-2 w-full accent-pine"
              min={0}
              max={3000}
              step={25}
              value={contribution}
              onChange={(event) => setMonthly(Number(event.target.value))}
              aria-label="Projection monthly contribution"
            />
          </label>
        </div>
        <div className="mt-4 flex flex-wrap items-baseline gap-4">
          <span className="font-display text-4xl text-marigold-deep">
            {money0(projection.futureValue)}
          </span>
          <span className="text-xs text-ink/70">
            from {money0(totals.nav)} today + {money0(projection.contributions)} of contributions
            over {years} years
          </span>
        </div>
      </Panel>
    </main>
  )
}
