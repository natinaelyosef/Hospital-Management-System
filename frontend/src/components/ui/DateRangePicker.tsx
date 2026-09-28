import { CalendarDays } from 'lucide-react'
import { cn } from '@/utils/cn'

export interface DateRange {
  from: string
  to: string
}

export interface DateRangePickerProps {
  value: DateRange
  onChange: (value: DateRange) => void
  className?: string
  /** Quick preset spans rendered next to the inputs. */
  presets?: { label: string; days: number }[]
}

export function DateRangePicker({ value, onChange, className, presets }: DateRangePickerProps) {
  const applyPreset = (days: number) => {
    const to = new Date()
    const from = new Date()
    from.setDate(to.getDate() - days)
    const iso = (date: Date) => date.toISOString().slice(0, 10)
    onChange({ from: iso(from), to: iso(to) })
  }

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <span className="inline-flex items-center gap-2 rounded-lg border bg-card px-2.5 py-1.5 shadow-xs">
        <CalendarDays size={15} className="text-muted-foreground" />
        <input
          type="date"
          aria-label="From date"
          value={value.from}
          onChange={(event) => onChange({ ...value, from: event.target.value })}
          className="bg-transparent text-xs text-foreground focus:outline-none"
        />
        <span className="text-xs text-muted-foreground">→</span>
        <input
          type="date"
          aria-label="To date"
          value={value.to}
          onChange={(event) => onChange({ ...value, to: event.target.value })}
          className="bg-transparent text-xs text-foreground focus:outline-none"
        />
      </span>
      {presets?.map((preset) => (
        <button
          key={preset.label}
          type="button"
          onClick={() => applyPreset(preset.days)}
          className="h-8 cursor-pointer rounded-lg border bg-card px-3 text-xs font-medium text-muted-foreground shadow-xs transition-colors hover:bg-muted hover:text-foreground"
        >
          {preset.label}
        </button>
      ))}
    </div>
  )
}

export default DateRangePicker
