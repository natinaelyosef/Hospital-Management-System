import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarDays, Clock } from 'lucide-react'
import { appointmentApi, type AppointmentInput } from '@/api/appointment.api'
import { miscApi } from '@/api/misc.api'
import { getFieldErrors, getErrorMessage } from '@/api/client'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { Spinner } from '@/components/ui/Spinner'
import { Textarea } from '@/components/ui/Textarea'
import { useToast } from '@/components/ui/Toast'
import { format } from 'date-fns'
import type { Appointment, Patient } from '@/types'
import { cn } from '@/utils/cn'
import { formatTime } from '@/utils/format'
import { APPOINTMENT_TYPE_OPTIONS } from './constants'
import { PatientPicker } from './PatientPicker'

export interface AppointmentFormProps {
  open: boolean
  onClose: () => void
  onCreated?: (appointment: Appointment) => void
}

export function AppointmentForm({ open, onClose, onCreated }: AppointmentFormProps) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const today = useMemo(() => format(new Date(), 'yyyy-MM-dd'), [])

  const [patient, setPatient] = useState<Patient | null>(null)
  const [departmentId, setDepartmentId] = useState('')
  const [doctorId, setDoctorId] = useState('')
  const [date, setDate] = useState(today)
  const [slot, setSlot] = useState('')
  const [type, setType] = useState('opd')
  const [reason, setReason] = useState('')
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setPatient(null)
    setDepartmentId('')
    setDoctorId('')
    setDate(today)
    setSlot('')
    setType('opd')
    setReason('')
    setErrors({})
    setFormError(null)
  }, [open, today])

  const { data: departments } = useQuery({
    queryKey: ['departments', 'options'],
    queryFn: () => miscApi.departments.list({ per_page: 100 }),
    enabled: open,
    staleTime: 5 * 60_000,
    retry: 0,
  })

  const { data: doctors } = useQuery({
    queryKey: ['doctors', 'options', departmentId || 'all'],
    queryFn: () =>
      miscApi.doctors.list(departmentId ? { per_page: 100, department_id: Number(departmentId) } : { per_page: 100 }),
    enabled: open,
    staleTime: 5 * 60_000,
    retry: 0,
  })

  const { data: slots, isFetching: loadingSlots } = useQuery({
    queryKey: ['appointments', 'slots', doctorId, date],
    queryFn: () => appointmentApi.slots(Number(doctorId), date),
    enabled: open && Boolean(doctorId) && Boolean(date),
    staleTime: 30_000,
    retry: 0,
  })

  const mutation = useMutation({
    mutationFn: (payload: AppointmentInput) => appointmentApi.create(payload),
    onSuccess: (appointment) => {
      toast.success('Appointment booked', `${appointment.appointment_number} · ${formatTime(appointment.start_time)}`)
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      onCreated?.(appointment)
      onClose()
    },
    onError: (caught) => {
      const fieldErrors = getFieldErrors(caught)
      setErrors(fieldErrors)
      setFormError(Object.keys(fieldErrors).length === 0 ? getErrorMessage(caught) : null)
    },
  })

  const fieldError = (name: string) => errors[name]?.[0]

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    const local: Record<string, string[]> = {}
    if (!patient) local.patient_id = ['Select a patient']
    if (!doctorId) local.doctor_id = ['Select a doctor']
    if (!date) local.appointment_date = ['Pick a date']
    if (!slot) local.start_time = ['Pick a time slot']
    setErrors(local)
    setFormError(null)
    if (Object.keys(local).length > 0 || !patient) return

    mutation.mutate({
      patient_id: patient.id,
      doctor_id: Number(doctorId),
      appointment_date: date,
      start_time: slot,
      type,
      reason: reason.trim() || undefined,
    })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Book appointment"
      description="Pick the patient, doctor and an available slot"
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {formError && <Alert tone="danger" title="Unable to book appointment">{formError}</Alert>}

        <FormField label="Patient" required error={fieldError('patient_id')}>
          <PatientPicker value={patient} onChange={setPatient} error={fieldError('patient_id')} />
        </FormField>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Department" htmlFor="appt-department">
            <Select
              id="appt-department"
              value={departmentId}
              onChange={(event) => {
                setDepartmentId(event.target.value)
                setDoctorId('')
                setSlot('')
              }}
              options={[
                { value: '', label: 'All departments' },
                ...(departments?.data ?? []).map((department) => ({
                  value: department.id,
                  label: department.name,
                })),
              ]}
            />
          </FormField>
          <FormField label="Doctor" htmlFor="appt-doctor" required error={fieldError('doctor_id')}>
            <Select
              id="appt-doctor"
              value={doctorId}
              onChange={(event) => {
                setDoctorId(event.target.value)
                setSlot('')
              }}
              options={(doctors?.data ?? []).map((doctor) => ({
                value: doctor.id,
                label: doctor.specialization ? `${doctor.name} — ${doctor.specialization}` : doctor.name,
              }))}
              placeholder="Select doctor"
              invalid={Boolean(fieldError('doctor_id'))}
            />
          </FormField>
          <FormField label="Date" htmlFor="appt-date" required error={fieldError('appointment_date')}>
            <Input
              id="appt-date"
              type="date"
              min={today}
              value={date}
              onChange={(event) => {
                setDate(event.target.value)
                setSlot('')
              }}
              invalid={Boolean(fieldError('appointment_date'))}
            />
          </FormField>
          <FormField label="Type" htmlFor="appt-type">
            <Select id="appt-type" value={type} onChange={(event) => setType(event.target.value)} options={APPOINTMENT_TYPE_OPTIONS} />
          </FormField>
        </div>

        <FormField label="Available slots" required error={fieldError('start_time')}>
          {!doctorId ? (
            <p className="flex items-center gap-2 rounded-lg border border-dashed px-3 py-3 text-xs text-muted-foreground">
              <CalendarDays size={14} /> Select a doctor to load available slots
            </p>
          ) : loadingSlots ? (
            <p className="flex items-center gap-2 rounded-lg border border-dashed px-3 py-3 text-xs text-muted-foreground">
              <Spinner size="sm" /> Loading slots…
            </p>
          ) : (slots ?? []).length === 0 ? (
            <p className="flex items-center gap-2 rounded-lg border border-dashed px-3 py-3 text-xs text-muted-foreground">
              <Clock size={14} /> No slots published for this doctor on {date}
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {slots?.map((item) => (
                <button
                  key={item.start_time}
                  type="button"
                  disabled={!item.available}
                  onClick={() => setSlot(item.start_time)}
                  className={cn(
                    'flex h-9 cursor-pointer items-center justify-center rounded-lg border text-xs font-medium transition-colors',
                    !item.available && 'cursor-not-allowed border-border bg-muted text-muted-foreground line-through opacity-60',
                    item.available && slot === item.start_time
                      ? 'border-primary bg-primary text-primary-foreground'
                      : item.available && 'border-input bg-card text-foreground hover:bg-muted/60',
                  )}
                >
                  {formatTime(item.start_time)}
                </button>
              ))}
            </div>
          )}
        </FormField>

        <FormField label="Reason" htmlFor="appt-reason" error={fieldError('reason')}>
          <Textarea
            id="appt-reason"
            rows={3}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            invalid={Boolean(fieldError('reason'))}
            placeholder="Chief complaint or purpose of the visit"
          />
        </FormField>

        <div className="flex justify-end gap-2.5 border-t pt-4">
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" loading={mutation.isPending}>
            Book appointment
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default AppointmentForm
