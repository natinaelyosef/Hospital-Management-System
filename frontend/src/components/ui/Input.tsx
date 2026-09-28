import type { InputHTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean
  wrapperClassName?: string
}

export function Input({ className, invalid, wrapperClassName, ...rest }: InputProps) {
  return (
    <span className={cn('block', wrapperClassName)}>
      <input
        className={cn(
          'flex h-9.5 w-full rounded-lg border bg-card px-3 py-1.5 text-sm text-foreground shadow-xs transition-colors',
          'placeholder:text-muted-foreground/70',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:border-primary/60',
          'disabled:cursor-not-allowed disabled:opacity-60',
          invalid ? 'border-destructive/70' : 'border-input',
          className,
        )}
        aria-invalid={invalid || undefined}
        {...rest}
      />
    </span>
  )
}

export default Input
