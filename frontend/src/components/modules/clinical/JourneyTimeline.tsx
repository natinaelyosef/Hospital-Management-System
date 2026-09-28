import { CheckCircle2, Circle } from 'lucide-react'
import type { TimelineEntry } from '@/types'
import { formatDateTime } from '@/utils/format'
import { cn } from '@/utils/cn'

/** Vertical Patient Journey: every handoff of the case, oldest first. */
export function JourneyTimeline({ entries }: { entries: TimelineEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">No handoff history recorded for this case yet.</p>
  }

  return (
    <ol className="relative ml-2 flex flex-col gap-0 border-l pl-0">
      {entries.map((entry, index) => {
        const last = index === entries.length - 1
        return (
          <li key={entry.id} className="relative flex gap-3 pb-5 pl-6 last:pb-0">
            <span
              className={cn(
                'absolute top-0.5 -left-[7px] flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 bg-card',
                last ? 'border-primary text-primary' : 'border-border text-muted-foreground',
              )}
            >
              {last ? <CheckCircle2 size={10} /> : <Circle size={8} />}
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <p className={cn('text-sm', last ? 'font-semibold text-foreground' : 'font-medium text-foreground')}>
                {entry.label}
              </p>
              {entry.note && <p className="text-xs leading-relaxed text-muted-foreground">{entry.note}</p>}
              <p className="text-[11px] text-muted-foreground">
                {entry.at ? formatDateTime(entry.at) : '—'}
                {entry.actor ? ` · ${entry.actor}` : ''}
              </p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
