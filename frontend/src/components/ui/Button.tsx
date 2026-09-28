import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Loader } from 'lucide-react'
import { cn } from '@/utils/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  icon?: ReactNode
  iconRight?: ReactNode
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 active:bg-primary/95 border border-transparent',
  secondary:
    'bg-secondary text-secondary-foreground hover:bg-secondary/70 border border-transparent',
  outline:
    'border border-border bg-card text-foreground hover:bg-muted/60 shadow-xs',
  ghost: 'border border-transparent text-foreground hover:bg-muted/70',
  destructive:
    'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 border border-transparent',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-9.5 px-4 text-sm gap-2',
  lg: 'h-11 px-5 text-sm gap-2',
}

const iconSize: Record<ButtonSize, number> = { sm: 14, md: 16, lg: 18 }

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconRight,
  className,
  children,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cn(
        'inline-flex cursor-pointer items-center justify-center rounded-lg font-medium transition-colors',
        'disabled:pointer-events-none disabled:opacity-55',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...rest}
    >
      {loading ? (
        <Loader className="animate-spin" size={iconSize[size]} />
      ) : (
        icon && <span className="shrink-0">{icon}</span>
      )}
      {children}
      {iconRight && !loading && <span className="shrink-0">{iconRight}</span>}
    </button>
  )
}

export default Button
