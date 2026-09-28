import type { ReactNode } from 'react'
import { CircleAlert, CircleCheck, Info, TriangleAlert } from 'lucide-react'
import { cn } from '@/utils/cn'

export type AlertTone = 'info' | 'success' | 'warning' | 'danger'

export interface AlertProps {
  tone?: AlertTone
  title?: ReactNode
  children?: ReactNode
  icon?: ReactNode
  className?: string
}

const tones: Record<AlertTone, { wrapper: string; icon: ReactNode }> = {
  info: {
    wrapper: 'border-sky-500/30 bg-sky-500/10 text-sky-800 dark:text-sky-200',
    icon: <Info size={16} className="text-sky-600 dark:text-sky-300" />,
  },
  success: {
    wrapper: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200',
    icon: <CircleCheck size={16} className="text-emerald-600 dark:text-emerald-300" />,
  },
  warning: {
    wrapper: 'border-amber-500/35 bg-amber-500/10 text-amber-800 dark:text-amber-200',
    icon: <TriangleAlert size={16} className="text-amber-600 dark:text-amber-300" />,
  },
  danger: {
    wrapper: 'border-red-500/30 bg-red-500/10 text-red-800 dark:text-red-200',
    icon: <CircleAlert size={16} className="text-red-600 dark:text-red-300" />,
  },
}

export function Alert({ tone = 'info', title, children, icon, className }: AlertProps) {
  const config = tones[tone]
  return (
    <div role="alert" className={cn('flex items-start gap-3 rounded-lg border px-3.5 py-3', config.wrapper, className)}>
      <span className="mt-0.5 shrink-0">{icon ?? config.icon}</span>
      <div className="flex min-w-0 flex-col gap-0.5 text-xs">
        {title && <p className="text-sm font-semibold">{title}</p>}
        {children && <div className="leading-relaxed opacity-90">{children}</div>}
      </div>
    </div>
  )
}

export default Alert
