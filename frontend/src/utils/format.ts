import { format, isValid, parseISO } from 'date-fns'

export type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral'

let currency = 'ETB'

/** Settings may override the display currency; defaults to `ETB`. */
export function setCurrency(value: string): void {
  if (value) currency = value
}

export function getCurrency(): string {
  return currency
}

function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null
  const date = typeof value === 'string' ? parseISO(value) : value
  return isValid(date) ? date : null
}

export function formatCurrency(value: number | null | undefined): string {
  const amount = typeof value === 'number' && Number.isFinite(value) ? value : 0
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
  return `${currency} ${formatted}`
}

export function formatDate(value: string | Date | null | undefined, pattern = 'dd MMM yyyy'): string {
  const date = toDate(value)
  return date ? format(date, pattern) : '—'
}

export function formatDateTime(value: string | Date | null | undefined): string {
  const date = toDate(value)
  return date ? format(date, 'dd MMM yyyy, HH:mm') : '—'
}

export function formatTime(value: string | Date | null | undefined): string {
  if (typeof value === 'string' && /^\d{2}:\d{2}(:\d{2})?$/.test(value)) {
    return value.length === 5 ? value : value.slice(0, 5)
  }
  const date = toDate(value)
  return date ? format(date, 'HH:mm') : '—'
}

export function formatAge(dateOfBirth: string | Date | null | undefined): string {
  const dob = toDate(dateOfBirth)
  if (!dob) return '—'
  const now = new Date()
  let years = now.getFullYear() - dob.getFullYear()
  const monthDiff = now.getMonth() - dob.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) years -= 1

  if (years >= 1) return `${years} y`
  const months = years * 12 + monthDiff + (now.getDate() < dob.getDate() ? -1 : 0)
  if (months >= 1) return `${months} m`
  const days = Math.max(0, Math.floor((now.getTime() - dob.getTime()) / 86400000))
  return `${days} d`
}

export function initials(name: string | null | undefined): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

const STATUS_TONES: Record<string, Tone> = {
  pending: 'warning',
  confirmed: 'info',
  waiting: 'warning',
  in_progress: 'info',
  completed: 'success',
  cancelled: 'danger',
  no_show: 'danger',
  processing: 'info',
  dispensed: 'success',
  requested: 'info',
  unpaid: 'danger',
  partial: 'warning',
  paid: 'success',
  admitted: 'info',
  transferred: 'warning',
  discharged: 'success',
  available: 'success',
  occupied: 'info',
  maintenance: 'warning',
  reserved: 'info',
  failed: 'danger',
  refunded: 'warning',
  routine: 'neutral',
  urgent: 'danger',
  draft: 'neutral',
  submitted: 'info',
  approved: 'success',
  rejected: 'danger',
<<<<<<< HEAD
  active: 'success',
  inactive: 'neutral',
  suspended: 'danger',
  registered: 'info',
  intake_completed: 'info',
  referred: 'warning',
  waiting_for_nurse: 'warning',
  nurse_assessment_completed: 'info',
  waiting_for_doctor: 'warning',
  in_consultation: 'info',
  lab_requested: 'warning',
  lab_in_progress: 'info',
  lab_completed: 'success',
  prescription_created: 'info',
  pharmacy_processing: 'info',
  payment_required: 'danger',
  payment_approved: 'success',
  medication_dispensed: 'success',
  visit_completed: 'success',
  normal: 'neutral',
  emergency: 'danger',
  mild: 'neutral',
  moderate: 'warning',
  severe: 'danger',
=======
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
}

export function statusTone(status: string | null | undefined): Tone {
  if (!status) return 'neutral'
  return STATUS_TONES[status.trim().toLowerCase()] ?? 'neutral'
}

export function statusLabel(status: string | null | undefined): string {
  if (!status) return '—'
  return status
    .trim()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export function downloadFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}

export function csvToDownload(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  downloadFile(blob, filename.endsWith('.csv') ? filename : `${filename}.csv`)
}
