import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Spinner'
import { cn } from '@/utils/cn'

export interface PanelProps {
  title: string
  icon?: ReactNode
  to?: string
  linkLabel?: string
  count?: number
  loading?: boolean
  className?: string
  children: ReactNode
}

export function Panel({ title, icon, to, linkLabel = 'View all', count, loading, className, children }: PanelProps) {
  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader className="flex-row items-center justify-between gap-3 pb-3">
        <div className="flex min-w-0 items-center gap-2">
          {icon && <span className="text-muted-foreground">{icon}</span>}
          <CardTitle className="truncate">{title}</CardTitle>
          {typeof count === 'number' && (
            <span className="rounded-full bg-primary/10 px-1.5 py-px text-[10px] font-semibold text-primary">
              {count}
            </span>
          )}
        </div>
        {to && (
          <Link
            to={to}
            className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-primary transition-colors hover:underline"
          >
            {linkLabel}
            <ArrowRight size={13} />
          </Link>
        )}
      </CardHeader>
      <CardContent className="flex-1">
        {loading ? (
          <div className="space-y-2.5">
            {[0, 1, 2, 3].map((row) => (
              <Skeleton key={row} className="h-9 w-full" />
            ))}
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  )
}

export interface PanelRowProps {
  title: ReactNode
  meta?: ReactNode
  leading?: ReactNode
  trailing?: ReactNode
  to?: string
}

export function PanelRow({ title, meta, leading, trailing, to }: PanelRowProps) {
  const body = (
    <div className="flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted/60">
      {leading}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium text-foreground">{title}</span>
        {meta && <span className="truncate text-[11px] text-muted-foreground">{meta}</span>}
      </span>
      {trailing}
    </div>
  )

  return to ? (
    <Link to={to} className="block">
      {body}
    </Link>
  ) : (
    body
  )
}
