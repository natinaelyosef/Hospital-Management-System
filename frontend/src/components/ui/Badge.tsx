import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/utils/cn'
import type { Tone } from '@/utils/format'

export type BadgeTone = Tone

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone
  children: ReactNode
  dot?: boolean
}

const toneClasses: Record<BadgeTone, string> = {
  success: 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 ring-emerald-600/25',
  warning: 'bg-amber-500/14 text-amber-700 dark:text-amber-300 ring-amber-600/25',
  danger: 'bg-red-500/12 text-red-700 dark:text-red-300 ring-red-600/25',
  info: 'bg-sky-500/12 text-sky-700 dark:text-sky-300 ring-sky-600/25',
  neutral: 'bg-muted text-muted-foreground ring-border',
}

const dotClasses: Record<BadgeTone, string> = {
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
  info: 'bg-sky-500',
  neutral: 'bg-muted-foreground/60',
}

export function Badge({ tone = 'neutral', dot, className, children, ...rest }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium leading-5 ring-1 ring-inset whitespace-nowrap',
        toneClasses[tone],
        className,
      )}
      {...rest}
    >
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full', dotClasses[tone])} />}
      {children}
    </span>
  )
}

export default Badge
