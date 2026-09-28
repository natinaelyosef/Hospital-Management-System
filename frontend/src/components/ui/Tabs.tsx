import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

export interface TabItem {
  value: string
  label: ReactNode
  icon?: ReactNode
  count?: number
}

export interface TabsProps {
  items: TabItem[]
  value: string
  onChange: (value: string) => void
  className?: string
}

export function Tabs({ items, value, onChange, className }: TabsProps) {
  return (
    <div className={cn('flex gap-1 overflow-x-auto rounded-lg border bg-muted/50 p-1', className)} role="tablist">
      {items.map((item) => {
        const active = item.value === value
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.value)}
            className={cn(
              'inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md px-3 text-xs font-medium whitespace-nowrap transition-colors',
              active
                ? 'bg-card text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {item.icon}
            {item.label}
            {typeof item.count === 'number' && (
              <span
                className={cn(
                  'rounded-full px-1.5 py-px text-[10px] font-semibold',
                  active ? 'bg-primary/12 text-primary' : 'bg-muted-foreground/12 text-muted-foreground',
                )}
              >
                {item.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

export default Tabs
