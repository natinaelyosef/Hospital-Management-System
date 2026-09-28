import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'
import { Skeleton } from './Spinner'

export interface Column<T> {
  key: string
  header: ReactNode
  render?: (row: T) => ReactNode
  className?: string
  align?: 'left' | 'center' | 'right'
  width?: string
  hideBelow?: 'sm' | 'md' | 'lg'
}

export interface TableProps<T> {
  columns: Column<T>[]
  data: T[]
  loading?: boolean
  empty?: ReactNode
  onRowClick?: (row: T) => void
  rowKey?: (row: T) => string | number
  stickyHeader?: boolean
  className?: string
  compact?: boolean
}

const alignClass = { left: 'text-left', center: 'text-center', right: 'text-right' } as const
const hideClass = { sm: 'hidden sm:table-cell', md: 'hidden md:table-cell', lg: 'hidden lg:table-cell' } as const

export function Table<T>({
  columns,
  data,
  loading = false,
  empty,
  onRowClick,
  rowKey,
  stickyHeader = true,
  className,
  compact = false,
}: TableProps<T>) {
  if (loading) {
    return (
      <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
        <div className="space-y-px p-px">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className={cn('w-full rounded-lg', compact ? 'h-10' : 'h-12')} />
          ))}
        </div>
      </div>
    )
  }

  if (data.length === 0) {
    return <div className="rounded-xl border bg-card shadow-xs">{empty}</div>
  }

  return (
    <div className={cn('overflow-hidden rounded-xl border bg-card shadow-xs', className)}>
      <div className="w-full overflow-x-auto">
        <table className="w-full min-w-full border-collapse text-sm">
          <thead className={cn('bg-muted/60', stickyHeader && 'sticky top-0 z-10')}>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  style={column.width ? { width: column.width } : undefined}
                  className={cn(
                    'border-b px-4 py-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase',
                    alignClass[column.align ?? 'left'],
                    column.className,
                    column.hideBelow && hideClass[column.hideBelow],
                  )}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIndex) => (
              <tr
                key={rowKey ? rowKey(row) : rowIndex}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  'border-b last:border-b-0 transition-colors',
                  onRowClick && 'cursor-pointer hover:bg-muted/50',
                )}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn(
                      compact ? 'px-4 py-2' : 'px-4 py-3',
                      'text-foreground',
                      alignClass[column.align ?? 'left'],
                      column.className,
                      column.hideBelow && hideClass[column.hideBelow],
                    )}
                  >
                    {column.render
                      ? column.render(row)
                      : String((row as unknown as Record<string, unknown>)[column.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default Table
