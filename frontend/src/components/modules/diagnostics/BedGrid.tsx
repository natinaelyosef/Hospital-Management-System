import { Plus } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/utils/cn'
import { formatCurrency } from '@/utils/format'
import type { Admission, Bed, BedStatus, Room } from '@/types'

export interface BedGridProps {
  room: Room
  onlyAvailable: boolean
  canManage: boolean
  canAdmit: boolean
  admissionsByBed: Map<number, Admission>
  onAdmit: (room: Room, bed: Bed) => void
  onOccupied: (room: Room, bed: Bed) => void
  onAddBed: (room: Room) => void
}

const BED_STYLES: Record<BedStatus, string> = {
  available: 'border-emerald-500/45 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20',
  occupied: 'border-rose-500/45 bg-rose-500/10 text-rose-700 dark:text-rose-300 hover:bg-rose-500/20',
  maintenance: 'border-amber-500/45 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  reserved: 'border-sky-500/45 bg-sky-500/10 text-sky-700 dark:text-sky-300',
}

const STATUS_LABEL: Record<BedStatus, string> = {
  available: 'Available',
  occupied: 'Occupied',
  maintenance: 'Maintenance',
  reserved: 'Reserved',
}

function occupiedLabel(bed: Bed, admissionsByBed: Map<number, Admission>): string {
  const admission = admissionsByBed.get(bed.id) ?? bed.admission
  return admission?.patient?.full_name ?? admission?.admission_number ?? 'Occupied'
}

export function BedGrid({
  room,
  onlyAvailable,
  canManage,
  canAdmit,
  admissionsByBed,
  onAdmit,
  onOccupied,
  onAddBed,
}: BedGridProps) {
  const beds = room.beds.filter((bed) => !onlyAvailable || bed.status === 'available')
  const free = room.beds.filter((bed) => bed.status === 'available').length

  return (
    <div className="rounded-xl border bg-card p-4 shadow-xs">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-foreground">Room {room.room_number}</p>
            <Badge tone="neutral">{room.type}</Badge>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {free}/{room.beds.length} free · {formatCurrency(room.tariff)}/day
          </p>
        </div>
        {canManage && (
          <button
            type="button"
            aria-label={`Add bed to room ${room.room_number}`}
            onClick={() => onAddBed(room)}
            className="inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-lg border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Plus size={14} />
          </button>
        )}
      </div>

      {beds.length === 0 ? (
        <p className="rounded-lg border border-dashed px-3 py-4 text-center text-xs text-muted-foreground">
          {room.beds.length === 0 ? 'No beds in this room' : 'No available beds in this room'}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {beds.map((bed) => {
            const clickable =
              bed.status === 'occupied' || (bed.status === 'available' && canAdmit)
            const className = cn(
              'flex w-full flex-col items-start gap-0.5 rounded-lg border px-2.5 py-2 text-left transition-colors',
              BED_STYLES[bed.status],
              clickable ? 'cursor-pointer' : 'cursor-default',
            )
            const content = (
              <>
                <span className="text-xs font-semibold tracking-tight">{bed.bed_number}</span>
                <span className="w-full truncate text-[10px] leading-tight opacity-90">
                  {bed.status === 'occupied' ? occupiedLabel(bed, admissionsByBed) : STATUS_LABEL[bed.status]}
                </span>
              </>
            )

            if (bed.status === 'available' && !canAdmit) {
              return (
                <div key={bed.id} className={className} title="You do not have permission to admit patients">
                  {content}
                </div>
              )
            }
            if (clickable) {
              return (
                <button
                  key={bed.id}
                  type="button"
                  className={className}
                  onClick={() => (bed.status === 'occupied' ? onOccupied(room, bed) : onAdmit(room, bed))}
                >
                  {content}
                </button>
              )
            }
            return (
              <div key={bed.id} className={className} title={STATUS_LABEL[bed.status]}>
                {content}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default BedGrid
