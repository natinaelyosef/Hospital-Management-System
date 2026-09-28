import { useEffect, useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { getFieldErrors, getErrorMessage } from '@/api/client'
import { wardApi, type RoomInput } from '@/api/ward.api'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Spinner } from '@/components/ui/Spinner'
import { useToast } from '@/components/ui/Toast'
import { BedGrid } from './BedGrid'
import { useWardRooms } from './useWardRooms'
import type { Admission, Bed, Room, Ward } from '@/types'

export interface WardCardProps {
  ward: Ward
  onlyAvailable: boolean
  canAdmit: boolean
  canManage: boolean
  admissionsByBed: Map<number, Admission>
  onAdmit: (ward: Ward, room: Room, bed: Bed) => void
  onOccupied: (ward: Ward, room: Room, bed: Bed) => void
}

interface RoomFormState {
  room_number: string
  type: string
  tariff: string
  capacity: string
}

interface BedFormState {
  bed_number: string
}

export function WardCard({
  ward,
  onlyAvailable,
  canAdmit,
  canManage,
  admissionsByBed,
  onAdmit,
  onOccupied,
}: WardCardProps) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [roomModal, setRoomModal] = useState(false)
  const [bedModal, setBedModal] = useState<Room | null>(null)
  const [roomForm, setRoomForm] = useState<RoomFormState>({ room_number: '', type: 'general', tariff: '', capacity: '2' })
  const [bedForm, setBedForm] = useState<BedFormState>({ bed_number: '' })
  const [roomErrors, setRoomErrors] = useState<Record<string, string[]>>({})
  const [bedErrors, setBedErrors] = useState<Record<string, string[]>>({})

  const { rooms: roomList, isLoading: roomsLoading, isError: roomsError } = useWardRooms(ward)

  const createRoom = useMutation({
    mutationFn: (payload: RoomInput) => wardApi.createRoom(ward.id, payload),
  })
  const createBed = useMutation({
    mutationFn: (payload: { roomId: number; bed_number: string }) =>
      wardApi.createBed(payload.roomId, { bed_number: payload.bed_number }),
  })

  useEffect(() => {
    if (roomModal) {
      setRoomForm({ room_number: '', type: 'general', tariff: '', capacity: '2' })
      setRoomErrors({})
    }
  }, [roomModal])

  useEffect(() => {
    if (bedModal) {
      setBedForm({ bed_number: '' })
      setBedErrors({})
    }
  }, [bedModal])

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['ward-rooms', ward.id] })
    queryClient.invalidateQueries({ queryKey: ['wards'] })
    queryClient.invalidateQueries({ queryKey: ['bed-availability'] })
  }

  const onSubmitRoom = async (event: FormEvent) => {
    event.preventDefault()
    setRoomErrors({})
    try {
      await createRoom.mutateAsync({
        room_number: roomForm.room_number.trim(),
        type: roomForm.type.trim(),
        tariff: Number(roomForm.tariff) || 0,
        capacity: Number(roomForm.capacity) || 1,
      })
      invalidate()
      toast.success('Room added', `${ward.name} · room ${roomForm.room_number.trim()}`)
      setRoomModal(false)
    } catch (caught) {
      const fields = getFieldErrors(caught)
      if (Object.keys(fields).length > 0) setRoomErrors(fields)
      else toast.error('Unable to add room', getErrorMessage(caught))
    }
  }

  const onSubmitBed = async (event: FormEvent) => {
    event.preventDefault()
    if (!bedModal) return
    setBedErrors({})
    try {
      await createBed.mutateAsync({ roomId: bedModal.id, bed_number: bedForm.bed_number.trim() })
      invalidate()
      toast.success('Bed added', `Room ${bedModal.room_number} · bed ${bedForm.bed_number.trim()}`)
      setBedModal(null)
    } catch (caught) {
      const fields = getFieldErrors(caught)
      if (Object.keys(fields).length > 0) setBedErrors(fields)
      else toast.error('Unable to add bed', getErrorMessage(caught))
    }
  }

  const totalBeds = roomList.reduce((sum, room) => sum + room.beds.length, 0)
  const occupiedBeds = roomList.reduce(
    (sum, room) => sum + room.beds.filter((bed) => bed.status === 'occupied').length,
    0,
  )
  const occupancy = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0

  return (
    <section className="rounded-xl border bg-card shadow-xs">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b px-5 py-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">{ward.name}</h3>
            <Badge tone="neutral">{ward.code}</Badge>
            <Badge tone={occupancy >= 90 ? 'danger' : occupancy >= 70 ? 'warning' : 'success'}>{occupancy}% full</Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {ward.type}
            {ward.floor ? ` · Floor ${ward.floor}` : ''} · {occupiedBeds}/{totalBeds || ward.beds_count} beds occupied
          </p>
          <div className="mt-2 h-1.5 w-full max-w-56 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${occupancy}%` }} />
          </div>
        </div>
        {canManage && (
          <Button size="sm" variant="outline" icon={<Plus size={14} />} onClick={() => setRoomModal(true)}>
            Add room
          </Button>
        )}
      </div>

      <div className="p-5">
        {roomsLoading ? (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Spinner size="sm" /> Loading rooms…
          </div>
        ) : roomsError ? (
          <p className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
            Rooms could not be loaded for this ward.
          </p>
        ) : roomList.length === 0 ? (
          <p className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
            No rooms in this ward yet.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {roomList.map((room) => (
              <BedGrid
                key={room.id}
                room={room}
                onlyAvailable={onlyAvailable}
                canManage={canManage}
                canAdmit={canAdmit}
                admissionsByBed={admissionsByBed}
                onAdmit={(targetRoom, bed) => onAdmit(ward, targetRoom, bed)}
                onOccupied={(targetRoom, bed) => onOccupied(ward, targetRoom, bed)}
                onAddBed={setBedModal}
              />
            ))}
          </div>
        )}
      </div>

      <Modal
        open={roomModal}
        onClose={() => setRoomModal(false)}
        title={`Add room — ${ward.name}`}
        footer={
          <>
            <Button variant="outline" onClick={() => setRoomModal(false)} disabled={createRoom.isPending}>
              Cancel
            </Button>
            <Button type="submit" form="ward-room-form" loading={createRoom.isPending}>
              Add room
            </Button>
          </>
        }
      >
        <form id="ward-room-form" onSubmit={onSubmitRoom} className="grid gap-4 sm:grid-cols-2">
          <FormField label="Room number" htmlFor="room-number" required error={roomErrors.room_number?.[0]}>
            <Input
              id="room-number"
              required
              value={roomForm.room_number}
              onChange={(event) => setRoomForm((current) => ({ ...current, room_number: event.target.value }))}
              placeholder="101"
            />
          </FormField>
          <FormField label="Room type" htmlFor="room-type" required error={roomErrors.type?.[0]}>
            <Input
              id="room-type"
              required
              value={roomForm.type}
              onChange={(event) => setRoomForm((current) => ({ ...current, type: event.target.value }))}
              placeholder="general, private, ICU…"
            />
          </FormField>
          <FormField label="Tariff per day" htmlFor="room-tariff" required error={roomErrors.tariff?.[0]}>
            <Input
              id="room-tariff"
              type="number"
              min={0}
              step="0.01"
              required
              value={roomForm.tariff}
              onChange={(event) => setRoomForm((current) => ({ ...current, tariff: event.target.value }))}
            />
          </FormField>
          <FormField label="Capacity" htmlFor="room-capacity" required error={roomErrors.capacity?.[0]}>
            <Input
              id="room-capacity"
              type="number"
              min={1}
              required
              value={roomForm.capacity}
              onChange={(event) => setRoomForm((current) => ({ ...current, capacity: event.target.value }))}
            />
          </FormField>
        </form>
      </Modal>

      <Modal
        open={bedModal !== null}
        onClose={() => setBedModal(null)}
        title={bedModal ? `Add bed — room ${bedModal.room_number}` : 'Add bed'}
        footer={
          <>
            <Button variant="outline" onClick={() => setBedModal(null)} disabled={createBed.isPending}>
              Cancel
            </Button>
            <Button type="submit" form="ward-bed-form" loading={createBed.isPending}>
              Add bed
            </Button>
          </>
        }
      >
        <form id="ward-bed-form" onSubmit={onSubmitBed}>
          <FormField label="Bed number" htmlFor="bed-number" required error={bedErrors.bed_number?.[0]} hint="e.g. A, 2, or 101-A">
            <Input
              id="bed-number"
              required
              value={bedForm.bed_number}
              onChange={(event) => setBedForm({ bed_number: event.target.value })}
            />
          </FormField>
        </form>
      </Modal>
    </section>
  )
}

export default WardCard
