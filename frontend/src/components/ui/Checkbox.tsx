import type { InputHTMLAttributes, ReactNode } from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/utils/cn'

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: ReactNode
  description?: string
}

export function Checkbox({ label, description, className, ...rest }: CheckboxProps) {
  return (
    <label className={cn('group inline-flex cursor-pointer items-start gap-2.5 select-none', className)}>
      <span className="relative mt-0.5 inline-flex h-4.5 w-4.5 shrink-0 items-center justify-center">
        <input
          type="checkbox"
          className="peer h-4.5 w-4.5 cursor-pointer appearance-none rounded border border-input bg-card transition-colors checked:border-primary checked:bg-primary indeterminate:border-primary indeterminate:bg-primary hover:border-primary/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-60"
          {...rest}
        />
        <Check
          size={11}
          strokeWidth={3.5}
          className="pointer-events-none absolute text-primary-foreground opacity-0 peer-checked:opacity-100"
        />
      </span>
      {(label || description) && (
        <span className="flex flex-col gap-0.5">
          {label && <span className="text-sm leading-tight text-foreground">{label}</span>}
          {description && <span className="text-xs text-muted-foreground">{description}</span>}
        </span>
      )}
    </label>
  )
}

export default Checkbox
