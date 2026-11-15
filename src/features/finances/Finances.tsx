/**
 * Finances — The Ledger.
 * Mirrors the Compendium finances section and Full_Lifestyle.xlsm:
 * salary to net, the monthly budget, the yearly savings plan and the
 * debt tracker (loans, cards, informal). Every rate and row is editable
 * and the derived figures recompute from the same formulas as the workbook.
 */

import { useEffect, useMemo, useState } from 'react'
import { FinancePlanRepositoryImpl } from '../../data/repositories'
import { financeSeed } from '../../content/financePlan'
import {
  bonusTotal,
  computeFinance,
  daysUntilTaxYearEnd,
  projectLoan,
  taxYearEndISO,
} from '../../engine/finance'
import type { BudgetLine, FinancePlan } from '../../domain/finance'
import {
  Bar,
  EditToggle,
  NumberField,
  Panel,
  RowButton,
  Stat,
  TextField,
} from '../../ui/panels'
import { formatDateMed, money, money0, percent, percentInput, todayISO } from '../../ui/format'

const repo = new FinancePlanRepositoryImpl()

type BudgetGroup = 'bills' | 'regular' | 'savings'

const GROUPS: { key: BudgetGroup; label: string }[] = [
  { key: 'bills', label: 'Bills & subscriptions' },
  { key: 'regular', label: 'Regular spending' },
  { key: 'savings', label: 'Savings' },
]

const LedgerRow = ({
  label,
  hint,
  value,
  negative = false,
  strong = false,
  total = false,
}: {
  label: string
  hint?: string
  value: string
  negative?: boolean
  strong?: boolean
  total?: boolean
}) => (
  <tr className={total ? 'border-t border-ink/20' : 'border-b border-ink/5'}>
    <td className={`py-2 pr-3 ${strong || total ? 'font-bold' : ''}`}>
      {label}
      {hint && <span className="block text-[11px] text-ink/70">{hint}</span>}
    </td>
    <td
      className={`py-2 text-right font-mono tabular-nums ${negative ? 'text-clay-deep' : total ? 'text-pine' : 'text-ink'}`}
    >
      {value}
    </td>
  </tr>
)

export const Finances = () => {
  const [plan, setPlan] = useState<FinancePlan>(financeSeed)
  const [loaded, setLoaded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [selectedLoan, setSelectedLoan] = useState('')
  const [extra, setExtra] = useState(0)

  useEffect(() => {
    let cancelled = false
    repo
      .get()
      .then(async (stored) => {
        const next = stored ?? financeSeed
        if (!stored) await repo.save(next)
        if (!cancelled) {
          setPlan(next)
          setSelectedLoan(next.loans[0]?.id ?? '')
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

  const totals = useMemo(() => computeFinance(plan), [plan])
  const bonus = useMemo(() => bonusTotal(plan), [plan])
  const savingsShare = totals.outgoings ? totals.savings / totals.outgoings : 0
  const today = todayISO()

  const save = (next: FinancePlan) => {
    setPlan(next)
    void repo.save(next)
  }

  const update = (patch: Partial<FinancePlan>) => save({ ...plan, ...patch })

  const setRates = (patch: Partial<FinancePlan['rates']>) =>
    update({ rates: { ...plan.rates, ...patch } })

  const setGroup = (group: BudgetGroup, lines: BudgetLine[]) => {
    if (group === 'bills') update({ bills: lines })
    else if (group === 'regular') update({ regular: lines })
    else update({ savings: lines })
  }

  const updateLine = (group: BudgetGroup, id: string, patch: Partial<BudgetLine>) =>
    setGroup(
      group,
      plan[group].map((line) => (line.id === id ? { ...line, ...patch } : line)),
    )

  const addLine = (group: BudgetGroup) =>
    setGroup(group, [
      ...plan[group],
      { id: crypto.randomUUID(), name: 'New row', amount: 0 },
    ])

  const removeLine = (group: BudgetGroup, id: string) =>
    setGroup(
      group,
      plan[group].filter((line) => line.id !== id),
    )

  const loan = plan.loans.find((item) => item.id === selectedLoan) ?? plan.loans[0]
  const isStudent = loan?.id === plan.loans[0]?.id
  const basePayment = isStudent ? totals.loan / 12 : (loan?.pay ?? 0)
  const projection = loan ? projectLoan(loan, extra, basePayment) : null

  const maxSaving = Math.max(...totals.savingsPlan.map((line) => line.annual), 1)
  const maxItem = Math.max(
    ...GROUPS.flatMap((group) => plan[group.key].map((line) => Math.abs(line.amount) || 0)),
    1,
  )

  return (
    <main className="p-6 pb-24 md:pb-6 space-y-6 text-ink max-w-6xl mx-auto">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Finances</h1>
          <p className="text-ink/70 text-sm mt-1 max-w-2xl">
            Salary to net, the monthly budget, the savings plan and the debt tracker. Every
            gold-underlined figure is yours — tax, NI, pension and the loan all recompute from
            the rates.
          </p>
          <p className="text-[11px] font-mono uppercase tracking-widest text-ink/70 mt-2">
            Workbook review · {formatDateMed(plan.asOf)}
          </p>
        </div>
        <EditToggle editing={editing} onToggle={() => setEditing((value) => !value)} />
      </header>

      {!loaded && <p className="text-sm text-ink/70">Loading the ledger…</p>}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Annual net income"
          value={money(totals.annualNet)}
          sub={`gross ${money0(totals.gross)}`}
          tone="pine"
        />
        <Stat
          label="Monthly net income"
          value={money(totals.monthlyNet)}
          sub={`outgoings ${money0(totals.outgoings)}`}
          tone="ink"
        />
        <Stat
          label="Unbudgeted income"
          value={`${money(totals.unbudgeted)}/mo`}
          sub={totals.unbudgeted >= 0 ? 'Slack in the system' : 'Overspent'}
          tone={totals.unbudgeted >= 0 ? 'pine' : 'clay'}
        />
        <Stat
          label="Total debt"
          value={money(totals.debtsTotal)}
          sub="Loans & cards combined"
          tone="clay"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel
          title="From gross to net"
          sub="FY 2026/27 · live formulas"
          className="lg:col-span-2"
        >
          <table className="w-full text-sm">
            <tbody>
              {editing ? (
                <tr className="border-b border-ink/5">
                  <td className="py-2 pr-3">Gross base earnings</td>
                  <td className="py-2 w-44">
                    <NumberField
                      label="Amount"
                      ariaLabel="Gross base earnings"
                      value={plan.gross}
                      onChange={(gross) => update({ gross })}
                      prefix="£"
                      step={100}
                      min={0}
                    />
                  </td>
                </tr>
              ) : (
                <LedgerRow label="Gross base earnings" value={money0(plan.gross)} />
              )}
              {editing ? (
                <tr className="border-b border-ink/5">
                  <td className="py-2 pr-3">Tax-free allowance</td>
                  <td className="py-2 w-44">
                    <NumberField
                      label="Amount"
                      ariaLabel="Tax-free allowance"
                      value={plan.taxFree}
                      onChange={(taxFree) => update({ taxFree })}
                      prefix="£"
                      step={10}
                      min={0}
                    />
                  </td>
                </tr>
              ) : (
                <LedgerRow label="Tax-free allowance" value={`−${money0(plan.taxFree)}`} negative />
              )}
              <LedgerRow
                label="Pension contribution — tax-deductible"
                hint={`relief at ${percent(plan.rates.pension, 0)}`}
                value={`−${money0(totals.pension)}`}
                negative
              />
              <LedgerRow label="Taxable income" value={money0(totals.taxable)} strong />
              <LedgerRow
                label="Income tax"
                hint={`@ ${percent(plan.rates.tax, 0)} (${percent(plan.rates.higherTax, 0)} above ${money0(plan.rates.higherThreshold)})`}
                value={`−${money0(totals.tax)}`}
                negative
              />
              <LedgerRow
                label="National insurance"
                hint={`@ ${percent(plan.rates.ni, 0)}`}
                value={`−${money(totals.ni)}`}
                negative
              />
              <LedgerRow
                label="Pension contribution"
                hint={`@ ${percent(plan.rates.pension, 0)} (SIPP) — already removed from taxable income`}
                value={`−${money0(totals.pension)}`}
                negative
              />
              <LedgerRow
                label="Student loan"
                hint={`@ ${percent(plan.rates.loan, 0)} above ${money0(plan.rates.loanThreshold)}`}
                value={`−${money(totals.loan)}`}
                negative
              />
              <LedgerRow label="Annual net income" value={money(totals.annualNet)} total />
              <LedgerRow label="Monthly net income" value={money(totals.monthlyNet)} total />
            </tbody>
          </table>

          {editing && (
            <div className="mt-4 border-t border-ink/10 pt-4">
              <p className="text-[11px] font-mono uppercase tracking-widest text-ink/70 mb-3">
                Rates & thresholds
              </p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <NumberField
                  label="Basic tax"
                  value={percentInput(plan.rates.tax)}
                  onChange={(value) => setRates({ tax: value / 100 })}
                  suffix="%"
                  step={0.5}
                />
                <NumberField
                  label="Higher tax"
                  value={percentInput(plan.rates.higherTax)}
                  onChange={(value) => setRates({ higherTax: value / 100 })}
                  suffix="%"
                  step={0.5}
                />
                <NumberField
                  label="Higher threshold"
                  value={plan.rates.higherThreshold}
                  onChange={(value) => setRates({ higherThreshold: value })}
                  prefix="£"
                  step={100}
                />
                <NumberField
                  label="National insurance"
                  value={percentInput(plan.rates.ni)}
                  onChange={(value) => setRates({ ni: value / 100 })}
                  suffix="%"
                  step={0.5}
                />
                <NumberField
                  label="Pension rate"
                  value={percentInput(plan.rates.pension)}
                  onChange={(value) => setRates({ pension: value / 100 })}
                  suffix="%"
                  step={0.5}
                />
                <NumberField
                  label="Student loan rate"
                  value={percentInput(plan.rates.loan)}
                  onChange={(value) => setRates({ loan: value / 100 })}
                  suffix="%"
                  step={0.5}
                />
                <NumberField
                  label="Loan threshold"
                  value={plan.rates.loanThreshold}
                  onChange={(value) => setRates({ loanThreshold: value })}
                  prefix="£"
                  step={100}
                />
              </div>
            </div>
          )}
        </Panel>

        <Panel title="Yearly savings plan" sub={`${money0(totals.yearlySavings)} / yr`}>
          <div className="space-y-3">
            {totals.savingsPlan.map((line) => (
              <div key={line.id}>
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="truncate">{line.name}</span>
                  <span className="font-mono tabular-nums">{money0(line.annual)}</span>
                </div>
                <div className="mt-1">
                  <Bar
                    value={(line.annual / maxSaving) * 100}
                    tone="marigold"
                    slim
                    label={`${line.name} ${money0(line.annual)} a year`}
                  />
                </div>
              </div>
            ))}
          </div>
          {editing && (
            <button
              type="button"
              onClick={() => addLine('savings')}
              className="mt-3 min-h-11 w-full rounded-[10px] border border-dashed border-ink/20 text-sm text-ink/70 hover:bg-ink/5"
            >
              + Add saving
            </button>
          )}
          <hr className="my-3 border-ink/10" />
          <p className="text-xs text-ink/70 leading-relaxed">
            Monthly savings {money0(totals.savings)} — {percent(savingsShare, 0)} of all outgoings.
            Bonus log FY1 total: <b className="text-ink">{money0(bonus)}</b> recorded so far.
          </p>
        </Panel>
      </div>

      <Panel title="Monthly outgoings" sub={`Sum ${money0(totals.outgoings)}`}>
        <div className="grid gap-5 md:grid-cols-3">
          {GROUPS.map((group) => {
            const lines = plan[group.key]
            const groupTotal =
              group.key === 'bills'
                ? totals.bills
                : group.key === 'regular'
                  ? totals.regular
                  : totals.savings
            return (
              <div key={group.key}>
                <p className="text-[11px] font-mono uppercase tracking-widest text-marigold-deep mb-3">
                  {group.label} · {money0(groupTotal)}
                </p>
                <ul className="space-y-2">
                  {lines.map((line) => (
                    <li key={line.id} className="text-sm">
                      {editing ? (
                        <div className="grid grid-cols-[1fr_6rem_auto] items-end gap-2">
                          <TextField
                            label="Name"
                            value={line.name}
                            onChange={(name) => updateLine(group.key, line.id, { name })}
                          />
                          <NumberField
                            label="Amount"
                            value={line.amount}
                            onChange={(amount) => updateLine(group.key, line.id, { amount })}
                            prefix="£"
                            step={5}
                          />
                          <RowButton
                            label={`Remove ${line.name || 'row'}`}
                            tone="clay"
                            onClick={() => removeLine(group.key, line.id)}
                          >
                            ✕
                          </RowButton>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="truncate">{line.name}</span>
                            <span className="font-mono tabular-nums">{money0(line.amount)}</span>
                          </div>
                          <div className="mt-1">
                            <Bar
                              value={(Math.abs(line.amount) / maxItem) * 100}
                              tone={group.key === 'savings' ? 'marigold' : 'pine'}
                              slim
                              label={`${line.name} ${money0(line.amount)}`}
                            />
                          </div>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
                {editing && (
                  <button
                    type="button"
                    onClick={() => addLine(group.key)}
                    className="mt-3 min-h-11 w-full rounded-[10px] border border-dashed border-ink/20 text-sm text-ink/70 hover:bg-ink/5"
                  >
                    + Add row
                  </button>
                )}
              </div>
            )
          })}
        </div>
        <hr className="my-4 border-ink/10" />
        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          {[
            ['Savings', money0(totals.savings)],
            ['Non-savings spend', money0(totals.nonSavings)],
            ['Yearly cost of living', money0(totals.yearlyLiving)],
            [
              'Unbudgeted income',
              `${totals.unbudgeted >= 0 ? '+' : ''}${money(totals.unbudgeted)}`,
            ],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-[10px] uppercase tracking-widest font-mono text-ink/70">{label}</p>
              <p className="font-mono text-base mt-1">{value}</p>
            </div>
          ))}
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Loans" sub="Fixed-term debt">
          <div
            className="overflow-x-auto rounded-[10px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine focus-visible:ring-offset-2"
            role="region"
            aria-label="Loans table, scrollable"
            tabIndex={0}
          >
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-widest font-mono text-ink/70">
                  <th className="pb-2 pr-2 font-normal">Name</th>
                  <th className="pb-2 pr-2 text-right font-normal">Balance</th>
                  <th className="pb-2 pr-2 text-right font-normal">APR</th>
                  <th className="pb-2 font-normal">History</th>
                </tr>
              </thead>
              <tbody>
                {plan.loans.map((item) => (
                  <tr key={item.id} className="border-t border-ink/5 align-top">
                    <td className="py-2 pr-2">
                      {editing ? (
                        <div className="space-y-2 min-w-[9rem]">
                          <TextField
                            label="Loan name"
                            value={item.name}
                            onChange={(name) =>
                              update({
                                loans: plan.loans.map((row) =>
                                  row.id === item.id ? { ...row, name } : row,
                                ),
                              })
                            }
                          />
                          <NumberField
                            label="Balance"
                            value={item.balance}
                            onChange={(balance) =>
                              update({
                                loans: plan.loans.map((row) =>
                                  row.id === item.id ? { ...row, balance } : row,
                                ),
                              })
                            }
                            prefix="£"
                            step={100}
                          />
                          <NumberField
                            label="APR"
                            value={percentInput(item.apr)}
                            onChange={(value) =>
                              update({
                                loans: plan.loans.map((row) =>
                                  row.id === item.id ? { ...row, apr: value / 100 } : row,
                                ),
                              })
                            }
                            suffix="%"
                            step={0.1}
                          />
                          <RowButton
                            label={`Remove ${item.name}`}
                            tone="clay"
                            onClick={() =>
                              update({ loans: plan.loans.filter((row) => row.id !== item.id) })
                            }
                          >
                            ✕ remove loan
                          </RowButton>
                        </div>
                      ) : (
                        item.name
                      )}
                    </td>
                    <td className="py-2 pr-2 text-right font-mono tabular-nums">
                      {money(item.balance)}
                    </td>
                    <td className="py-2 pr-2 text-right font-mono tabular-nums">
                      {percent(item.apr, 1)}
                    </td>
                    <td className="py-2 text-[11px] text-ink/70">
                      {item.initial
                        ? `Opened at ${money0(item.initial)} · grown ${percent(item.balance / item.initial - 1, 1)}`
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {editing && (
            <button
              type="button"
              onClick={() =>
                update({
                  loans: [
                    ...plan.loans,
                    { id: crypto.randomUUID(), name: 'New loan', balance: 0, apr: 0.05 },
                  ],
                })
              }
              className="mt-3 min-h-11 w-full rounded-[10px] border border-dashed border-ink/20 text-sm text-ink/70 hover:bg-ink/5"
            >
              + Add loan
            </button>
          )}

          <hr className="my-4 border-ink/10" />
          <p className="text-[11px] font-mono uppercase tracking-widest text-ink/70 mb-2">
            Projection
          </p>
          {plan.loans.length === 0 ? (
            <p className="text-sm text-ink/70">Add a loan to project its pay-down.</p>
          ) : (
            <>
              <label className="block text-sm">
                <span className="text-[10px] uppercase tracking-widest font-mono text-ink/70">
                  Projection loan
                </span>
                <select
                  className="mt-1 w-full rounded-[8px] border border-ink/20 bg-white px-2 py-2"
                  value={loan?.id ?? ''}
                  onChange={(event) => setSelectedLoan(event.target.value)}
                >
                  {plan.loans.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="mt-3 block">
                <span className="flex justify-between text-sm">
                  <span>Extra monthly overpayment</span>
                  <b className="font-mono">{money0(extra)}</b>
                </span>
                <input
                  type="range"
                  className="mt-2 w-full accent-pine"
                  min={0}
                  max={600}
                  step={10}
                  value={extra}
                  onChange={(event) => setExtra(Number(event.target.value))}
                  aria-label="Extra monthly overpayment"
                />
              </label>
              {projection && (
                <div className="mt-3 text-sm leading-relaxed">
                  {projection.cleared ? (
                    <>
                      <p>
                        <b className="text-pine">
                          Cleared in {projection.years} yr {projection.months} mo
                        </b>{' '}
                        ({money0(projection.payment)}/mo total). Interest paid along the way:{' '}
                        <b>{money0(projection.interest)}</b>.
                      </p>
                      <div className="mt-2">
                        <Bar
                          value={Math.max(2, Math.min(100, 100 - (projection.years * 12 + projection.months) / 480 * 100))}
                          tone="pine"
                          slim
                          label="Progress against the 40-year write-off horizon"
                        />
                        <p className="text-[11px] text-ink/70 mt-1">vs. 40-year write-off horizon</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <p>
                        <b className="text-clay-deep">Never repaid at this rate.</b> Interest of{' '}
                        {money0((loan?.balance ?? 0) * ((loan?.apr ?? 0) / 12))}/mo exceeds the
                        payment; the balance would grow {money0(projection.growth12)} over the next
                        year. Break-even needs{' '}
                        <b>{money0(projection.breakevenExtra)}/mo</b> extra.
                      </p>
                      <p className="text-[11px] text-ink/70 mt-2">
                        English Plan 5-style loans are wiped 40 years from the April after
                        graduation regardless of balance.
                      </p>
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </Panel>

        <Panel
          title="Credit cards"
          sub={`${money0(plan.cards.reduce((total, card) => total + card.balance, 0))} outstanding`}
        >
          <div
            className="overflow-x-auto rounded-[10px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pine focus-visible:ring-offset-2"
            role="region"
            aria-label="Credit cards table, scrollable"
            tabIndex={0}
          >
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-widest font-mono text-ink/70">
                  <th className="pb-2 pr-2 font-normal">Account</th>
                  <th className="pb-2 pr-2 text-right font-normal">Balance</th>
                  <th className="pb-2 pr-2 text-right font-normal">Limit</th>
                  <th className="pb-2 text-right font-normal">APR</th>
                </tr>
              </thead>
              <tbody>
                {plan.cards.map((card) => (
                  <tr key={card.id} className="border-t border-ink/5 align-top">
                    <td className="py-2 pr-2">
                      {editing ? (
                        <div className="space-y-2 min-w-[9rem]">
                          <TextField
                            label="Card name"
                            value={card.name}
                            onChange={(name) =>
                              update({
                                cards: plan.cards.map((row) =>
                                  row.id === card.id ? { ...row, name } : row,
                                ),
                              })
                            }
                          />
                          <NumberField
                            label="Balance"
                            value={card.balance}
                            onChange={(balance) =>
                              update({
                                cards: plan.cards.map((row) =>
                                  row.id === card.id ? { ...row, balance } : row,
                                ),
                              })
                            }
                            prefix="£"
                          />
                          <NumberField
                            label="Limit"
                            value={card.limit}
                            onChange={(limit) =>
                              update({
                                cards: plan.cards.map((row) =>
                                  row.id === card.id ? { ...row, limit } : row,
                                ),
                              })
                            }
                            prefix="£"
                            step={100}
                          />
                          <NumberField
                            label="APR"
                            value={percentInput(card.apr)}
                            onChange={(value) =>
                              update({
                                cards: plan.cards.map((row) =>
                                  row.id === card.id ? { ...row, apr: value / 100 } : row,
                                ),
                              })
                            }
                            suffix="%"
                            step={0.1}
                          />
                          <RowButton
                            label={`Remove ${card.name}`}
                            tone="clay"
                            onClick={() =>
                              update({ cards: plan.cards.filter((row) => row.id !== card.id) })
                            }
                          >
                            ✕ remove card
                          </RowButton>
                        </div>
                      ) : (
                        card.name
                      )}
                    </td>
                    <td
                      className={`py-2 pr-2 text-right font-mono tabular-nums ${card.balance === 0 ? 'text-pine' : ''}`}
                    >
                      {money0(card.balance)}
                    </td>
                    <td className="py-2 pr-2 text-right font-mono tabular-nums">
                      {money0(card.limit)}
                    </td>
                    <td className="py-2 text-right font-mono tabular-nums">{percent(card.apr, 1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {editing && (
            <button
              type="button"
              onClick={() =>
                update({
                  cards: [
                    ...plan.cards,
                    {
                      id: crypto.randomUUID(),
                      name: 'New card',
                      balance: 0,
                      limit: 1000,
                      apr: 0.29,
                    },
                  ],
                })
              }
              className="mt-3 min-h-11 w-full rounded-[10px] border border-dashed border-ink/20 text-sm text-ink/70 hover:bg-ink/5"
            >
              + Add card
            </button>
          )}
          <p className="text-xs text-ink/70 mt-3 leading-relaxed">
            A card at £0 is a rule, not a balance: at ~29% APR it is the most expensive money
            available.
          </p>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Informal debt" sub="IOUs & favours">
          {editing ? (
            <div className="space-y-3">
              {plan.informal.map((debt) => (
                <div key={debt.id} className="grid grid-cols-[1fr_6rem_5rem_auto] items-end gap-2">
                  <TextField
                    label="Name"
                    value={debt.name}
                    onChange={(name) =>
                      update({
                        informal: plan.informal.map((row) =>
                          row.id === debt.id ? { ...row, name } : row,
                        ),
                      })
                    }
                  />
                  <NumberField
                    label="Balance"
                    value={debt.balance}
                    onChange={(balance) =>
                      update({
                        informal: plan.informal.map((row) =>
                          row.id === debt.id ? { ...row, balance } : row,
                        ),
                      })
                    }
                    prefix="£"
                  />
                  <NumberField
                    label="Rate"
                    value={percentInput(debt.rate)}
                    onChange={(value) =>
                      update({
                        informal: plan.informal.map((row) =>
                          row.id === debt.id ? { ...row, rate: value / 100 } : row,
                        ),
                      })
                    }
                    suffix="%"
                  />
                  <RowButton
                    label={`Remove ${debt.name}`}
                    tone="clay"
                    onClick={() =>
                      update({
                        informal: plan.informal.filter((row) => row.id !== debt.id),
                      })
                    }
                  >
                    ✕
                  </RowButton>
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  update({
                    informal: [
                      ...plan.informal,
                      { id: crypto.randomUUID(), name: 'New IOU', balance: 0, rate: 0 },
                    ],
                  })
                }
                className="min-h-11 w-full rounded-[10px] border border-dashed border-ink/20 text-sm text-ink/70 hover:bg-ink/5"
              >
                + Add informal debt
              </button>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-widest font-mono text-ink/70">
                  <th className="pb-2 font-normal">Name</th>
                  <th className="pb-2 text-right font-normal">Balance</th>
                  <th className="pb-2 text-right font-normal">Rate</th>
                </tr>
              </thead>
              <tbody>
                {plan.informal.map((debt) => (
                  <tr key={debt.id} className="border-t border-ink/5">
                    <td className="py-2">{debt.name}</td>
                    <td className="py-2 text-right font-mono tabular-nums">
                      {money(debt.balance)}
                    </td>
                    <td className="py-2 text-right font-mono tabular-nums">
                      {percent(debt.rate, 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>

        <Panel title="Bonus log FY1" sub={`${money0(bonus)} recorded`}>
          <p className="text-xs text-ink/70 mb-3">{plan.bonusFY1.label}</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3">
            {plan.bonusFY1.months.map((month) => (
              <div key={month.id} className="flex justify-between gap-2">
                <span className="text-ink/70">{month.label}</span>
                {editing ? (
                  <input
                    type="number"
                    className="w-16 border-b border-marigold/60 bg-transparent text-right font-mono text-sm outline-none focus:border-pine"
                    value={month.amount}
                    aria-label={`${month.label} bonus`}
                    onChange={(event) =>
                      update({
                        bonusFY1: {
                          ...plan.bonusFY1,
                          months: plan.bonusFY1.months.map((row) =>
                            row.id === month.id
                              ? { ...row, amount: Number(event.target.value) || 0 }
                              : row,
                          ),
                        },
                      })
                    }
                  />
                ) : (
                  <span className="font-mono tabular-nums">{money0(month.amount)}</span>
                )}
              </div>
            ))}
          </div>
          <div className="mt-3 flex justify-between border-t border-ink/20 pt-2 text-sm font-bold">
            <span>Total</span>
            <span className="font-mono tabular-nums">{money0(bonus)}</span>
          </div>
        </Panel>
      </div>

      <p className="text-[11px] font-mono uppercase tracking-widest text-ink/70">
        ISA / LISA allowances reset 5 April · {daysUntilTaxYearEnd(today)} days ·{' '}
        {formatDateMed(taxYearEndISO(today))}
      </p>
    </main>
  )
}
