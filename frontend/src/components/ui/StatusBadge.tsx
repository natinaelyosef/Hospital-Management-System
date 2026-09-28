import { Badge, type BadgeTone } from './Badge'
import { statusLabel, statusTone } from '@/utils/format'

export interface StatusBadgeProps {
  status: string | null | undefined
  className?: string
}

/** Single source of truth for status -> colour lives in `statusTone` (`@/utils/format`). */
export function StatusBadge({ status, className }: StatusBadgeProps) {
  const tone: BadgeTone = statusTone(status)
  return (
    <Badge tone={tone} dot className={className}>
      {statusLabel(status)}
    </Badge>
  )
}

export default StatusBadge
