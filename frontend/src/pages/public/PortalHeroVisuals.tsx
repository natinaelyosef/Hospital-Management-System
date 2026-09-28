import {
  Activity,
  BadgeCheck,
  BellRing,
  Check,
  ClipboardList,
  FlaskConical,
  Pill,
  Receipt,
  Stethoscope,
} from 'lucide-react'
import { cn } from '@/utils/cn'

/**
 * Product-preview mockups for the two heroes. They illustrate the interface,
 * not real data — the same role the illustration plays on the marketing page.
 */

function FloatingChip({
  className,
  icon,
  title,
  text,
}: {
  className?: string
  icon: React.ReactNode
  title: string
  text: string
}) {
  return (
    <div
      className={cn(
        'absolute z-10 flex items-center gap-2.5 rounded-2xl border border-white/20 bg-white/95 px-4 py-3 text-foreground shadow-xl backdrop-blur',
        className,
      )}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        {icon}
      </span>
      <span className="flex flex-col">
        <span className="text-xs font-semibold">{title}</span>
        <span className="text-[11px] text-muted-foreground">{text}</span>
      </span>
    </div>
  )
}

/** Mini visit tracker: what a patient watches move in their portal. */
export function PatientJourneyPreview() {
  const steps = [
    { icon: ClipboardList, label: 'Registered', detail: 'Complaint recorded', state: 'done' as const },
    { icon: Activity, label: 'Triage', detail: 'Vitals taken', state: 'done' as const },
    { icon: Stethoscope, label: 'With the doctor', detail: 'Consultation in progress', state: 'active' as const },
    { icon: Pill, label: 'Pharmacy', detail: 'Collect after approval', state: 'todo' as const },
  ]

  return (
    <>
      <div className="rounded-2xl bg-card p-4 text-foreground shadow-xl">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold">Your visit</p>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
            Live
          </span>
        </div>
        <ol className="mt-3 space-y-0.5">
          {steps.map((step) => (
            <li key={step.label} className="flex items-center gap-3 rounded-lg px-2 py-2">
              <span
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                  step.state === 'done' && 'bg-emerald-500 text-white',
                  step.state === 'active' && 'bg-primary text-primary-foreground',
                  step.state === 'todo' && 'bg-muted text-muted-foreground',
                )}
              >
                {step.state === 'done' ? <Check size={14} /> : <step.icon size={14} />}
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className={cn('truncate text-xs font-semibold', step.state === 'todo' && 'text-muted-foreground')}>
                  {step.label}
                </span>
                <span className="truncate text-[11px] text-muted-foreground">{step.detail}</span>
              </span>
              {step.state === 'active' && (
                <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  Now
                </span>
              )}
            </li>
          ))}
        </ol>
        <div className="mt-3 flex items-center gap-2 border-t border-border pt-3 text-[11px]">
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 font-medium text-muted-foreground">
            <FlaskConical size={11} /> Lab result ready
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 font-medium text-muted-foreground">
            <Receipt size={11} /> Bill prepared
          </span>
        </div>
      </div>

      <FloatingChip
        className="-top-5 -right-4"
        icon={<FlaskConical size={16} />}
        title="Lab result ready"
        text="Sent back to your doctor"
      />
      <FloatingChip
        className="-bottom-5 -left-4"
        icon={<BadgeCheck size={16} />}
        title="Payment approved"
        text="Collect your medicines"
      />
    </>
  )
}

/** Mini queue board: what each role picks up in the workspace. */
export function StaffQueuePreview() {
  const rows = [
    { dot: 'bg-sky-500', label: 'Ready to route', owner: 'Reception', pill: 'intake', pillTone: 'bg-sky-500/15 text-sky-600 dark:text-sky-400' },
    { dot: 'bg-amber-500', label: 'Triage in progress', owner: 'Nurse', pill: 'vitals', pillTone: 'bg-amber-500/15 text-amber-600 dark:text-amber-400' },
    { dot: 'bg-violet-500', label: 'Lab results back', owner: 'Doctor', pill: 'review', pillTone: 'bg-violet-500/15 text-violet-600 dark:text-violet-400' },
    { dot: 'bg-emerald-500', label: 'Payment approved', owner: 'Pharmacy', pill: 'dispense', pillTone: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' },
  ]

  return (
    <>
      <div className="rounded-2xl bg-card p-4 text-foreground shadow-xl">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold">Today&apos;s floor</p>
          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold text-primary">
            4 cases moving
          </span>
        </div>
        <ul className="mt-3 space-y-2">
          {rows.map((row) => (
            <li
              key={row.label}
              className="flex items-center gap-3 rounded-xl border border-border px-3 py-2.5"
            >
              <span className={cn('h-2 w-2 shrink-0 rounded-full', row.dot)} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-xs font-semibold">{row.label}</span>
                <span className="truncate text-[11px] text-muted-foreground">{row.owner}</span>
              </span>
              <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold', row.pillTone)}>
                {row.pill}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 border-t border-border pt-3 text-[11px] text-muted-foreground">
          Every handoff is recorded — and the next owner is notified.
        </p>
      </div>

      <FloatingChip
        className="-top-5 -right-4"
        icon={<BellRing size={16} />}
        title="Nurse notified"
        text="New case routed to triage"
      />
      <FloatingChip
        className="-bottom-5 -left-4"
        icon={<BadgeCheck size={16} />}
        title="Handoff recorded"
        text="Doctor → lab → pharmacy"
      />
    </>
  )
}
