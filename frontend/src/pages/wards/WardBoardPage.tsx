import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Bed, BedDouble } from 'lucide-react'
import { wardApi } from '@/api/ward.api'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/ui/PageHeader'
import { Select } from '@/components/ui/Select'
import { StatCard } from '@/components/ui/StatCard'
import { AdmissionForm } from '@/components/modules/diagnostics/AdmissionForm'
import { WardCard } from '@/components/modules/diagnostics/WardCard'
import { useAuth } from '@/contexts/AuthContext'
import type { Bed as BedType, Room, Ward } from '@/types'

interface BedTarget {
  ward: Ward
  room: Room
  bed: BedType
}

const LEGEND = [
  { label: 'Available', className: 'bg-emerald-500' },
  { label: 'Occupied', className: 'bg-rose-500' },
  { label: 'Maintenance', className: 'bg-amber-500' },
  { label: 'Reserved', className: 'bg-sky-500' },
]

export default function WardBoardPage() {
  const { hasPermission } = useAuth()
  const navigate = useNavigate()
  const canAdmit = hasPermission('wards.admit')
  const canManage = hasPermission('wards.manage')

  const [wardFilter, setWardFilter] = useState('')
  const [onlyAvailable, setOnlyAvailable] = useState(false)
  const [admitTarget, setAdmitTarget] = useState<BedTarget | null>(null)
  const [occupiedTarget, setOccupiedTarget] = useState<BedTarget | null>(null)

  const availability = useQuery({ queryKey: ['bed-availability'], queryFn: wardApi.bedAvailability })
  const wards = useQuery({ queryKey: ['wards', { per_page: 100 }], queryFn: () => wardApi.wards({ per_page: 100 }) })
  const admitted = useQuery({
    queryKey: ['admissions', { status: 'admitted', per_page: 100 }],
    queryFn: () => wardApi.admissions({ status: 'admitted', per_page: 100 }),
  })

  const wardList = (wards.data?.data ?? []).filter((ward) => !wardFilter || ward.id === Number(wardFilter))
  const totals = availability.data
  const occupancy = totals && totals.total > 0 ? Math.round((totals.occupied / totals.total) * 100) : 0

  const admissionsByBed = new Map(
    (admitted.data?.data ?? []).map((admission) => [admission.bed.id, admission] as const),
  )
  const occupiedAdmission = occupiedTarget
    ? admissionsByBed.get(occupiedTarget.bed.id) ?? occupiedTarget.bed.admission
    : undefined

  return (
    <div className="space-y-6">
      <PageHeader title="Ward board" subtitle="Live bed occupancy across every ward and room" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total beds" value={totals ? totals.total : '—'} icon={<Bed size={18} />} />
        <StatCard label="Occupied" value={totals ? totals.occupied : '—'} icon={<BedDouble size={18} />} tone="danger" />
        <StatCard label="Available" value={totals ? totals.available : '—'} icon={<Bed size={18} />} tone="success" />
        <StatCard label="Occupancy" value={totals ? `${occupancy}%` : '—'} icon={<BedDouble size={18} />} tone={occupancy >= 90 ? 'danger' : 'warning'} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="w-full sm:w-52">
            <Select
              value={wardFilter}
              onChange={(event) => setWardFilter(event.target.value)}
              options={[
                { value: '', label: 'All wards' },
                ...(wards.data?.data ?? []).map((ward) => ({ value: String(ward.id), label: ward.name })),
              ]}
            />
          </div>
          <Checkbox
            checked={onlyAvailable}
            onChange={(event) => setOnlyAvailable(event.target.checked)}
            label="Only available beds"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {LEGEND.map((item) => (
            <span key={item.label} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className={`h-2.5 w-2.5 rounded-sm ${item.className}`} />
              {item.label}
            </span>
          ))}
        </div>
      </div>

      {wards.isLoading ? (
        <div className="grid gap-5 lg:grid-cols-2">
          {[0, 1].map((index) => (
            <div key={index} className="h-64 animate-pulse rounded-xl border bg-card" />
          ))}
        </div>
      ) : wards.isError ? (
        <EmptyState
          icon={<Bed size={22} />}
          title="Unable to load wards"
          description="Your account may not have permission to view ward data."
        />
      ) : wardList.length === 0 ? (
        <EmptyState
          icon={<Bed size={22} />}
          title="No wards found"
          description="Create a ward to start mapping rooms and beds."
        />
      ) : (
        <div className="grid gap-5 xl:grid-cols-2">
          {wardList.map((ward) => (
            <WardCard
              key={ward.id}
              ward={ward}
              onlyAvailable={onlyAvailable}
              canAdmit={canAdmit}
              canManage={canManage}
              admissionsByBed={admissionsByBed}
              onAdmit={(targetWard, room, bed) => setAdmitTarget({ ward: targetWard, room, bed })}
              onOccupied={(targetWard, room, bed) => setOccupiedTarget({ ward: targetWard, room, bed })}
            />
          ))}
        </div>
      )}

      <AdmissionForm
        open={admitTarget !== null}
        onClose={() => setAdmitTarget(null)}
        defaultWardId={admitTarget?.ward.id}
        defaultRoomId={admitTarget?.room.id}
        defaultBedId={admitTarget?.bed.id}
      />

      <Modal
        open={occupiedTarget !== null}
        onClose={() => setOccupiedTarget(null)}
        title={occupiedTarget ? `Bed ${occupiedTarget.bed.bed_number}` : 'Bed'}
        description={
          occupiedTarget
            ? `${occupiedTarget.ward.name} · Room ${occupiedTarget.room.room_number}`
            : undefined
        }
        footer={
          <>
            <Button variant="outline" onClick={() => setOccupiedTarget(null)}>
              Close
            </Button>
            {occupiedAdmission?.id ? (
              <Button onClick={() => navigate(`/wards/admissions/${occupiedAdmission.id}`)}>View admission</Button>
            ) : null}
          </>
        }
      >
        {occupiedTarget && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <Badge tone="info" dot>
                Occupied
              </Badge>
              {occupiedAdmission?.patient?.full_name && (
                <span className="truncate text-xs font-medium text-foreground">
                  {occupiedAdmission.patient.full_name}
                </span>
              )}
            </div>
            <dl className="grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-xs text-muted-foreground">Admission number</dt>
                <dd className="text-sm font-medium text-foreground">
                  {occupiedAdmission?.admission_number ?? '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Bed status</dt>
                <dd className="text-sm font-medium text-foreground">{occupiedTarget.bed.status}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs text-muted-foreground">Room type</dt>
                <dd className="text-sm font-medium text-foreground">
                  {occupiedTarget.room.type} · capacity {occupiedTarget.room.capacity}
                </dd>
              </div>
            </dl>
            <p className="text-xs text-muted-foreground">
              Open the admission record for the patient timeline, transfer and discharge actions.
            </p>
          </div>
        )}
      </Modal>
    </div>
  )
}
