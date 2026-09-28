import { useEffect, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { miscApi } from '@/api/misc.api'
import { getFieldErrors, getErrorMessage } from '@/api/client'
import { wardApi, type AdmissionInput } from '@/api/ward.api'
import { Button } from '@/components/ui/Button'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/ui/Toast'
import { PatientPicker } from './PatientPicker'
import { useWardRooms } from './useWardRooms'
import type { Patient } from '@/types'

export interface AdmissionFormProps {
  open: boolean
  onClose: () => void
  defaultWardId?: number
  defaultRoomId?: number
  defaultBedId?: number
}

export function AdmissionForm({
  open,
  onClose,
  defaultWardId,
  defaultRoomId,
  defaultBedId,
}: AdmissionFormProps) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [patient, setPatient] = useState<Patient | null>(null)
  const [wardId, setWardId] = useState('')
  const [roomId, setRoomId] = useState('')
  const [bedId, setBedId] = useState('')
  const [consultantId, setConsultantId] = useState('')
  const [diagnosis, setDiagnosis] = useState('')
  const [errors, setErrors] = useState<Record<string, string[]>>({})

  const selectedWard = wardId ? Number(wardId) : 0

  const wards = useQuery({
    queryKey: ['wards', { per_page: 100 }],
    queryFn: () => wardApi.wards({ per_page: 100 }),
    enabled: open,
  })
  const doctors = useQuery({
    queryKey: ['doctors', { per_page: 100 }],
    queryFn: () => miscApi.doctors.list({ per_page: 100 }),
    enabled: open,
  })

  const wardRecord = (wards.data?.data ?? []).find((ward) => ward.id === selectedWard)
  const { rooms: roomList, isLoading: roomsLoading } = useWardRooms(wardRecord, open)

  useEffect(() => {
    if (open) {
      setPatient(null)
      setWardId(defaultWardId ? String(defaultWardId) : '')
      setRoomId(defaultRoomId ? String(defaultRoomId) : '')
      setBedId(defaultBedId ? String(defaultBedId) : '')
      setConsultantId('')
      setDiagnosis('')
      setErrors({})
    }
  }, [open, defaultWardId, defaultRoomId, defaultBedId])

  const selectedRoom = roomList.find((room) => room.id === Number(roomId))
  const roomOptions = roomList.map((room) => ({
    value: String(room.id),
    label: `Room ${room.room_number} · ${room.type}`,
  }))
  const bedOptions = (selectedRoom?.beds ?? [])
    .filter((bed) => bed.status === 'available')
    .map((bed) => ({ value: String(bed.id), label: `Bed ${bed.bed_number}` }))

  const admit = useMutation({
    mutationFn: (payload: AdmissionInput) => wardApi.admit(payload),
  })

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setErrors({})

    if (!patient) {
      setErrors({ patient_id: ['Select a patient.'] })
      return
    }
    if (!wardId || !roomId || !bedId) {
      setErrors({ bed_id: ['Select a ward, room and available bed.'] })
      return
    }

    try {
      await admit.mutateAsync({
        patient_id: patient.id,
        ward_id: Number(wardId),
        room_id: Number(roomId),
        bed_id: Number(bedId),
        consultant_id: consultantId ? Number(consultantId) : undefined,
        diagnosis: diagnosis.trim() || undefined,
      })
      queryClient.invalidateQueries({ queryKey: ['admissions'] })
      queryClient.invalidateQueries({ queryKey: ['wards'] })
      queryClient.invalidateQueries({ queryKey: ['ward-rooms'] })
      queryClient.invalidateQueries({ queryKey: ['bed-availability'] })
      toast.success('Patient admitted', patient.full_name)
      onClose()
    } catch (caught) {
      const fields = getFieldErrors(caught)
      if (Object.keys(fields).length > 0) setErrors(fields)
      else toast.error('Unable to admit patient', getErrorMessage(caught))
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Admit patient"
      description="Assign an inpatient bed"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={admit.isPending}>
            Cancel
          </Button>
          <Button type="submit" form="admission-form" loading={admit.isPending}>
            Admit patient
          </Button>
        </>
      }
    >
      <form id="admission-form" onSubmit={onSubmit} className="space-y-4">
        <PatientPicker value={patient} onChange={setPatient} error={errors.patient_id?.[0]} />

        <div className="grid gap-4 sm:grid-cols-3">
          <FormField label="Ward" htmlFor="admission-ward" required error={errors.ward_id?.[0]}>
            <Select
              id="admission-ward"
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
          <FormField label="Room" htmlFor="admission-room" required error={errors.room_id?.[0]}>
            <Select
              id="admission-room"
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
          <FormField label="Bed" htmlFor="admission-bed" required error={errors.bed_id?.[0]} hint="Available beds only">
            <Select
              id="admission-bed"
              value={bedId}
              placeholder={roomId ? 'Select bed' : 'Select room first'}
              disabled={!roomId}
              onChange={(event) => setBedId(event.target.value)}
              options={bedOptions}
            />
          </FormField>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Consultant" htmlFor="admission-consultant" error={errors.consultant_id?.[0]}>
            <Select
              id="admission-consultant"
              value={consultantId}
              onChange={(event) => setConsultantId(event.target.value)}
              options={[
                { value: '', label: 'No consultant' },
                ...(doctors.data?.data ?? []).map((doctor) => ({
                  value: String(doctor.id),
                  label: `${doctor.name} · ${doctor.specialization}`,
                })),
              ]}
            />
          </FormField>
          <FormField label="Diagnosis" htmlFor="admission-diagnosis" error={errors.diagnosis?.[0]}>
            <Input
              id="admission-diagnosis"
              value={diagnosis}
              onChange={(event) => setDiagnosis(event.target.value)}
              placeholder="Provisional diagnosis"
            />
          </FormField>
        </div>
      </form>
    </Modal>
  )
}

export default AdmissionForm
