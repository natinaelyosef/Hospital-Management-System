import type { ReactNode } from 'react'
import { TrendingDown, TrendingUp } from 'lucide-react'
import { cn } from '@/utils/cn'

export interface StatCardProps {
  label: string
  value: ReactNode
  icon?: ReactNode
  trend?: string
  trendDirection?: 'up' | 'down'
  tone?: 'default' | 'success' | 'warning' | 'danger'
  className?: string
}

const toneClasses = {
  default: 'bg-primary/10 text-primary',
  success: 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400',
  warning: 'bg-amber-500/14 text-amber-600 dark:text-amber-400',
  danger: 'bg-red-500/12 text-red-600 dark:text-red-400',
} as const

export function StatCard({
  label,
  value,
  icon,
  trend,
  trendDirection,
  tone = 'default',
  className,
}: StatCardProps) {
  const direction = trendDirection ?? (trend?.trim().startsWith('-') ? 'down' : 'up')
  return (
    <div
      className={cn(
        'flex items-start justify-between gap-4 rounded-xl border bg-card p-4 text-card-foreground shadow-xs sm:p-5',
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-1.5">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className="truncate text-2xl leading-none font-semibold tracking-tight text-foreground">{value}</span>
        {trend && (
          <span
            className={cn(
              'inline-flex items-center gap-1 text-xs font-medium',
              direction === 'up' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400',
            )}
          >
            {direction === 'up' ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
            {trend}
          </span>
        )}
      </div>
      {icon && (
        <span className={cn('inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', toneClasses[tone])}>
          {icon}
        </span>
      )}
    </div>
  )
}

export default StatCard
