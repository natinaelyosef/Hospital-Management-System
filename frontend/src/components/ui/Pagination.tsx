import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { PaginationMeta } from '@/types'
import { cn } from '@/utils/cn'

export interface PaginationProps {
  meta: PaginationMeta
  onPageChange: (page: number) => void
  disabled?: boolean
  className?: string
}

function pageWindow(current: number, last: number): number[] {
  const start = Math.max(1, Math.min(current - 2, last - 4))
  const end = Math.min(last, start + 4)
  const pages: number[] = []
  for (let page = start; page <= end; page += 1) pages.push(page)
  return pages
}

export function Pagination({ meta, onPageChange, disabled = false, className }: PaginationProps) {
  const { current_page: current, last_page: last, per_page, total } = meta
  if (total === 0) return null

  const from = (current - 1) * per_page + 1
  const to = Math.min(current * per_page, total)

  return (
    <div className={cn('flex flex-col items-center justify-between gap-3 sm:flex-row', className)}>
      <p className="text-xs text-muted-foreground">
        Showing <span className="font-medium text-foreground">{from}</span>–
        <span className="font-medium text-foreground">{to}</span> of{' '}
        <span className="font-medium text-foreground">{total}</span>
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(current - 1)}
          disabled={disabled || current <= 1}
          aria-label="Previous page"
          className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-45"
        >
          <ChevronLeft size={15} />
        </button>
        {pageWindow(current, last).map((page) => (
          <button
            key={page}
            type="button"
            onClick={() => onPageChange(page)}
            disabled={disabled || page === current}
            aria-current={page === current ? 'page' : undefined}
            className={cn(
              'inline-flex h-8 min-w-8 cursor-pointer items-center justify-center rounded-lg border px-2 text-xs font-medium transition-colors disabled:pointer-events-none',
              page === current
                ? 'border-primary bg-primary text-primary-foreground'
                : 'bg-card text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            {page}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onPageChange(current + 1)}
          disabled={disabled || current >= last}
          aria-label="Next page"
          className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-45"
        >
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  )
}

export default Pagination
