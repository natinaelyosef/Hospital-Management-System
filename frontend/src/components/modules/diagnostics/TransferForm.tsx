import { useEffect, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getFieldErrors, getErrorMessage } from '@/api/client'
import { wardApi } from '@/api/ward.api'
import { Button } from '@/components/ui/Button'
import { FormField } from '@/components/ui/FormField'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/ui/Toast'
import { useWardRooms } from './useWardRooms'
import type { Admission } from '@/types'

export interface TransferFormProps {
  open: boolean
  admission: Admission | null
  onClose: () => void
}

export function TransferForm({ open, admission, onClose }: TransferFormProps) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [wardId, setWardId] = useState('')
  const [roomId, setRoomId] = useState('')
  const [bedId, setBedId] = useState('')
  const [errors, setErrors] = useState<Record<string, string[]>>({})

  const selectedWard = wardId ? Number(wardId) : 0

  const wards = useQuery({
    queryKey: ['wards', { per_page: 100 }],
    queryFn: () => wardApi.wards({ per_page: 100 }),
    enabled: open,
  })
  const wardRecord = (wards.data?.data ?? []).find((ward) => ward.id === selectedWard)
  const { rooms: roomList, isLoading: roomsLoading } = useWardRooms(wardRecord, open)

  useEffect(() => {
    if (open) {
      setWardId('')
      setRoomId('')
      setBedId('')
      setErrors({})
    }
  }, [open])

  const selectedRoom = roomList.find((room) => room.id === Number(roomId))
  const roomOptions = roomList.map((room) => ({
    value: String(room.id),
    label: `Room ${room.room_number} · ${room.type}`,
  }))
  const bedOptions = (selectedRoom?.beds ?? [])
    .filter((bed) => bed.status === 'available')
    .map((bed) => ({ value: String(bed.id), label: `Bed ${bed.bed_number}` }))

  const transfer = useMutation({
    mutationFn: (payload: { ward_id: number; room_id: number; bed_id: number }) => {
      if (!admission) throw new Error('No admission selected')
      return wardApi.transfer(admission.id, payload)
    },
  })

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!admission) return
    setErrors({})

    if (!wardId || !roomId || !bedId) {
      setErrors({ bed_id: ['Select a ward, room and available bed.'] })
      return
    }

    try {
      await transfer.mutateAsync({ ward_id: Number(wardId), room_id: Number(roomId), bed_id: Number(bedId) })
      queryClient.invalidateQueries({ queryKey: ['admission', admission.id] })
      queryClient.invalidateQueries({ queryKey: ['admissions'] })
      queryClient.invalidateQueries({ queryKey: ['wards'] })
      queryClient.invalidateQueries({ queryKey: ['ward-rooms'] })
      queryClient.invalidateQueries({ queryKey: ['bed-availability'] })
      toast.success('Transfer saved', `${admission.patient.full_name} moved to a new bed`)
      onClose()
    } catch (caught) {
      const fields = getFieldErrors(caught)
      if (Object.keys(fields).length > 0) setErrors(fields)
      else toast.error('Unable to transfer patient', getErrorMessage(caught))
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Transfer patient"
      description={
        admission
          ? `Currently in ${admission.ward.name} · Room ${admission.room.room_number} · Bed ${admission.bed.bed_number}`
          : undefined
      }
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={transfer.isPending}>
            Cancel
          </Button>
          <Button type="submit" form="transfer-form" loading={transfer.isPending}>
            Transfer
          </Button>
        </>
      }
    >
      <form id="transfer-form" onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-3">
        <FormField label="New ward" htmlFor="transfer-ward" required error={errors.ward_id?.[0]}>
          <Select
            id="transfer-ward"
            value={wardId}
            placeholder="Select ward"
            onChange={(event) => {
              setWardId(event.target.value)
              setRoomId('')
              setBedId('')
            }}
            options={(wards.data?.data ?? []).map((ward) => ({ value: String(ward.id), label: ward.name }))}
          />
        </FormField>
        <FormField label="New room" htmlFor="transfer-room" required error={errors.room_id?.[0]}>
          <Select
            id="transfer-room"
            value={roomId}
            placeholder={!wardId ? 'Select ward first' : roomsLoading ? 'Loading rooms…' : 'Select room'}
            disabled={!wardId || roomsLoading}
            onChange={(event) => {
              setRoomId(event.target.value)
              setBedId('')
            }}
            options={roomOptions}
          />
        </FormField>
        <FormField label="New bed" htmlFor="transfer-bed" required error={errors.bed_id?.[0]} hint="Available beds only">
          <Select
            id="transfer-bed"
            value={bedId}
            placeholder={roomId ? 'Select bed' : 'Select room first'}
            disabled={!roomId}
            onChange={(event) => setBedId(event.target.value)}
            options={bedOptions}
          />
        </FormField>
      </form>
    </Modal>
  )
}

export default TransferForm
