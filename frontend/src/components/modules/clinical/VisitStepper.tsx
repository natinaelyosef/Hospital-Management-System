import type { VisitStatus } from '@/types'
import { cn } from '@/utils/cn'

/**
 * Smooth handoff tracker: one glance tells every agent where the case sits
 * and who owns the next move.
 *
 * 1 Intake (patient / receptionist describes sickness)
 * 2 Routed (receptionist -> department / doctor / nurse pool)
 * 3 Nurse triage -> doctor queue
 * 4 Doctor consultation -> lab order
 * 5 Lab -> results back to doctor
 * 6 Prescription -> pharmacy
 * 7 Pharmacy bill -> accountant payment
 * 8 Payment approved -> dispense -> completed
 */
const STEPS: { key: string; label: string; owner: string; statuses: VisitStatus[] }[] = [
  { key: 'intake', label: 'Intake', owner: 'Patient / Reception', statuses: ['registered', 'intake_completed'] },
  {
    key: 'routed',
    label: 'Routed',
    owner: 'Reception → Dept / Nurse',
    statuses: ['referred', 'waiting_for_nurse', 'nurse_assessment_completed', 'waiting_for_doctor'],
  },
  { key: 'doctor', label: 'Doctor', owner: 'Consultation', statuses: ['in_consultation'] },
  {
    key: 'lab',
    label: 'Lab',
    owner: 'Lab Technician',
    statuses: ['lab_requested', 'lab_in_progress', 'lab_completed'],
  },
  {
    key: 'prescription',
    label: 'Prescription',
    owner: 'Doctor → Pharmacy',
    statuses: ['prescription_created', 'pharmacy_processing'],
  },
  { key: 'payment', label: 'Payment', owner: 'Accountant (cash)', statuses: ['payment_required'] },
  { key: 'approved', label: 'Approved', owner: 'Ready to dispense', statuses: ['payment_approved'] },
  {
    key: 'done',
    label: 'Dispensed',
    owner: 'Pharmacy → Patient',
    statuses: ['medication_dispensed', 'visit_completed'],
  },
]

export function stepIndexFor(status: VisitStatus): number {
  const index = STEPS.findIndex((step) => step.statuses.includes(status))
  return index === -1 ? 0 : index
}

export function VisitStepper({ status, compact = false }: { status: VisitStatus; compact?: boolean }) {
  if (status === 'cancelled') {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
        Case cancelled — history is preserved in the Journey tab.
      </div>
    )
  }

  const current = stepIndexFor(status)

  return (
    <ol className="flex flex-col gap-1 rounded-xl border bg-card p-3 shadow-xs sm:p-4">
      <li className="mb-1 flex items-center justify-between gap-2 px-1">
        <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
          Patient journey — who holds the case now
        </span>
        <span className="text-[11px] font-medium text-muted-foreground">
          Step {current + 1} of {STEPS.length}
        </span>
      </li>
      <div className={cn('grid gap-1.5', compact ? 'grid-cols-4 lg:grid-cols-8' : 'grid-cols-2 sm:grid-cols-4 lg:grid-cols-8')}>
        {STEPS.map((step, index) => {
          const done = index < current
          const active = index === current
          return (
            <li
              key={step.key}
              className={cn(
                'flex min-w-0 flex-col gap-0.5 rounded-lg border px-2.5 py-2 text-left transition-colors',
                active
                  ? 'border-primary bg-primary/10'
                  : done
                    ? 'border-emerald-500/30 bg-emerald-500/8'
                    : 'border-border bg-muted/30 opacity-70',
              )}
              title={`${step.label} — ${step.owner}`}
            >
              <span className="flex items-center gap-1.5">
                <span
                  className={cn(
                    'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
                    active
                      ? 'bg-primary text-primary-foreground'
                      : done
                        ? 'bg-emerald-500 text-white'
                        : 'bg-muted text-muted-foreground',
                  )}
                >
                  {done ? '✓' : index + 1}
                </span>
                <span className={cn('truncate text-xs font-semibold', active ? 'text-primary' : 'text-foreground')}>
                  {step.label}
                </span>
              </span>
              {!compact && (
                <span className="truncate text-[10px] text-muted-foreground">{step.owner}</span>
              )}
            </li>
          )
        })}
      </div>
    </ol>
  )
}

export default VisitStepper
