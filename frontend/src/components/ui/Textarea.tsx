import type { TextareaHTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean
}

export function Textarea({ className, invalid, rows = 4, ...rest }: TextareaProps) {
  return (
    <textarea
      rows={rows}
      className={cn(
        'flex min-h-24 w-full rounded-lg border bg-card px-3 py-2 text-sm text-foreground shadow-xs transition-colors',
        'placeholder:text-muted-foreground/70',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:border-primary/60',
        'disabled:cursor-not-allowed disabled:opacity-60',
        invalid ? 'border-destructive/70' : 'border-input',
        className,
      )}
      aria-invalid={invalid || undefined}
      {...rest}
    />
  )
}

export default Textarea
