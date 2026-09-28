import type { ReactNode } from 'react'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { cn } from '@/utils/cn'

export interface ChartShellProps {
  title: string
  subtitle?: string
  action?: ReactNode
  height?: number
  className?: string
  legend?: ReactNode
  children: ReactNode
}

export function ChartShell({ title, subtitle, action, height = 260, className, legend, children }: ChartShellProps) {
  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader className="flex-row items-start justify-between gap-3 pb-2">
        <div className="flex flex-col gap-1">
          <CardTitle>{title}</CardTitle>
          {subtitle && <CardDescription>{subtitle}</CardDescription>}
        </div>
        {action}
      </CardHeader>
      <div className="flex flex-1 flex-col gap-3 px-3 pb-4">
        <div style={{ height }} className="w-full min-w-0">
          {children}
        </div>
        {legend}
      </div>
    </Card>
  )
}

export interface ChartTooltipProps {
  active?: boolean
  label?: string | number
  payload?: {
    name?: string
    value?: number | string
    color?: string
    dataKey?: string | number
  }[]
}

export function ChartTooltip({ active, label, payload }: ChartTooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-lg">
      {label !== undefined && <p className="mb-1 font-semibold text-popover-foreground">{label}</p>}
      <div className="flex flex-col gap-1">
        {payload.map((entry, index) => (
          <span key={`${String(entry.dataKey)}-${index}`} className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-muted-foreground">{entry.name}</span>
            <span className="ml-auto font-medium text-popover-foreground">{String(entry.value)}</span>
          </span>
        ))}
      </div>
    </div>
  )
}
