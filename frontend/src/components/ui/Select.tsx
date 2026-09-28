import type { SelectHTMLAttributes } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/utils/cn'

export interface SelectOption {
  value: string | number
  label: string
  disabled?: boolean
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options?: SelectOption[]
  invalid?: boolean
  placeholder?: string
}

export function Select({ className, options, invalid, placeholder, children, ...rest }: SelectProps) {
  return (
    <span className="relative block">
      <select
        className={cn(
          'h-9.5 w-full appearance-none rounded-lg border bg-card px-3 pr-9 text-sm text-foreground shadow-xs transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:border-primary/60',
          'disabled:cursor-not-allowed disabled:opacity-60',
          invalid ? 'border-destructive/70' : 'border-input',
          className,
        )}
        aria-invalid={invalid || undefined}
        {...rest}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options?.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
        {children}
      </select>
      <ChevronDown
        size={16}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
      />
    </span>
  )
}

export default Select
