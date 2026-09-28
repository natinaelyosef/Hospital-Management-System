import type { ReactNode } from 'react'
import { Droplet, MapPin, Pencil, Phone, TriangleAlert } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import type { Patient } from '@/types'
import { formatDate, formatDateTime, initials } from '@/utils/format'

export interface PatientHeaderProps {
  patient: Patient
  onEdit?: () => void
  actions?: ReactNode
}

function Meta({ label, value, icon }: { label: string; value: string; icon?: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{label}</span>
      <span className="flex items-center gap-1.5 text-sm text-foreground">
        {icon && <span className="text-muted-foreground">{icon}</span>}
        <span className="truncate">{value}</span>
      </span>
    </div>
  )
}

export function PatientHeader({ patient, onEdit, actions }: PatientHeaderProps) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-5 pt-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            {patient.photo_url ? (
              <img
                src={patient.photo_url}
                alt={patient.full_name}
                className="h-16 w-16 shrink-0 rounded-full border object-cover"
              />
            ) : (
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary/12 text-lg font-semibold text-primary">
                {initials(patient.full_name)}
              </span>
            )}
            <div className="flex min-w-0 flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">{patient.full_name}</h1>
                <Badge tone="info">{patient.patient_number}</Badge>
                {patient.blood_group ? <Badge tone="danger">{patient.blood_group}</Badge> : null}
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span>
                  {patient.age} yrs · <span className="capitalize">{patient.gender}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Phone size={13} /> {patient.phone}
                </span>
                <span>Registered {formatDate(patient.created_at)}</span>
              </div>
              {patient.allergies ? (
                <span className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-red-500/35 bg-red-500/10 px-2.5 py-1 text-xs font-semibold text-red-700 dark:text-red-300">
                  <TriangleAlert size={14} />
                  Allergy: {patient.allergies}
                </span>
              ) : (
                <span className="inline-flex w-fit items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> No known allergies
                </span>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 print:hidden">
            {actions}
            {onEdit && (
              <Button variant="outline" icon={<Pencil size={15} />} onClick={onEdit}>
                Edit
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 border-t pt-4 sm:grid-cols-2 lg:grid-cols-4">
          <Meta label="Blood group" value={patient.blood_group ?? 'Not known'} icon={<Droplet size={14} />} />
          <Meta label="Address" value={patient.address || '—'} icon={<MapPin size={14} />} />
          <Meta
            label="Emergency contact"
            value={
              patient.emergency_contact_name
                ? `${patient.emergency_contact_name}${patient.emergency_contact_phone ? ` · ${patient.emergency_contact_phone}` : ''}`
                : '—'
            }
            icon={<Phone size={14} />}
          />
          <Meta label="Last updated" value={formatDateTime(patient.created_at)} />
        </div>
      </CardContent>
    </Card>
  )
}

export default PatientHeader
