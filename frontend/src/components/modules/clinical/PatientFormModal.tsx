import { useEffect, useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ClipboardList } from 'lucide-react'
import { getFieldErrors, getErrorMessage } from '@/api/client'
import { patientApi } from '@/api/patient.api'
import { IntakeModal } from '@/components/modules/clinical/IntakeModal'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { useToast } from '@/components/ui/Toast'
import type { Gender, Patient, PatientInput } from '@/types'
import { BLOOD_GROUP_OPTIONS, GENDER_OPTIONS } from './constants'

export interface PatientFormModalProps {
  open: boolean
  onClose: () => void
  patient?: Patient | null
}

interface FormState {
  first_name: string
  last_name: string
  gender: Gender | ''
  date_of_birth: string
  phone: string
  email: string
  address: string
  emergency_contact_name: string
  emergency_contact_phone: string
  blood_group: string
  allergies: string
  medical_history: string
}

const EMPTY_FORM: FormState = {
  first_name: '',
  last_name: '',
  gender: '',
  date_of_birth: '',
  phone: '',
  email: '',
  address: '',
  emergency_contact_name: '',
  emergency_contact_phone: '',
  blood_group: '',
  allergies: '',
  medical_history: '',
}

function toForm(patient: Patient | null | undefined): FormState {
  if (!patient) return EMPTY_FORM
  return {
    first_name: patient.first_name,
    last_name: patient.last_name,
    gender: patient.gender,
    date_of_birth: patient.date_of_birth,
    phone: patient.phone,
    email: patient.email ?? '',
    address: patient.address,
    emergency_contact_name: patient.emergency_contact_name ?? '',
    emergency_contact_phone: patient.emergency_contact_phone ?? '',
    blood_group: patient.blood_group ?? '',
    allergies: patient.allergies ?? '',
    medical_history: patient.medical_history ?? '',
  }
}

export function PatientFormModal({ open, onClose, patient }: PatientFormModalProps) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [savedPatient, setSavedPatient] = useState<Patient | null>(null)
  const [intakeOpen, setIntakeOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    setForm(toForm(patient))
    setErrors({})
    setFormError(null)
    setSavedPatient(null)
  }, [open, patient])

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }))

  const mutation = useMutation({
    mutationFn: (payload: PatientInput) =>
      patient ? patientApi.update(patient.id, payload) : patientApi.create(payload),
    onSuccess: (saved) => {
      toast.success(patient ? 'Patient updated' : 'Patient registered', `${saved.full_name} · ${saved.patient_number}`)
      queryClient.invalidateQueries({ queryKey: ['patients'] })
      queryClient.invalidateQueries({ queryKey: ['patient', saved.id] })
      if (patient) {
        onClose()
      } else {
        // New registration: keep the dialog open on the handoff step so
        // reception immediately describes the sickness (intake) instead of
        // losing the patient in the list.
        setSavedPatient(saved)
      }
    },
    onError: (caught) => {
      const fieldErrors = getFieldErrors(caught)
      setErrors(fieldErrors)
      if (Object.keys(fieldErrors).length === 0) setFormError(getErrorMessage(caught))
      else setFormError(null)
    },
  })

  const fieldError = (name: string) => errors[name]?.[0]

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    const required: (keyof FormState)[] = ['first_name', 'last_name', 'gender', 'date_of_birth', 'phone']
    const local: Record<string, string[]> = {}
    for (const key of required) {
      if (!String(form[key]).trim()) local[key as string] = ['This field is required']
    }
    setErrors(local)
    setFormError(null)
    if (Object.keys(local).length > 0) return

    mutation.mutate({
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      gender: form.gender as Gender,
      date_of_birth: form.date_of_birth,
      phone: form.phone.trim(),
      email: form.email.trim() || null,
      address: form.address.trim(),
      emergency_contact_name: form.emergency_contact_name.trim() || null,
      emergency_contact_phone: form.emergency_contact_phone.trim() || null,
      blood_group: form.blood_group || null,
      allergies: form.allergies.trim() || null,
      medical_history: form.medical_history.trim() || null,
    })
  }

  const closeAll = () => {
    setSavedPatient(null)
    onClose()
  }

  return (
    <>
    <Modal
      open={open}
      onClose={closeAll}
      size="lg"
      title={savedPatient ? `Patient ${savedPatient.patient_number} registered` : patient ? 'Edit patient' : 'Register patient'}
      description={
        savedPatient
          ? `${savedPatient.full_name} is registered. Next: describe the sickness and route the case to the right department, doctor and nurse.`
          : patient
            ? `Update the record for ${patient.full_name}`
            : 'Create a new patient record — name, gender, date of birth and phone are required'
      }
      footer={
        savedPatient ? (
          <>
            <Button variant="outline" onClick={closeAll}>
              Done
            </Button>
            <Button icon={<ClipboardList size={15} />} onClick={() => setIntakeOpen(true)}>
              Describe sickness & route
            </Button>
          </>
        ) : undefined
      }
    >
      {savedPatient ? (
        <div className="flex flex-col gap-4">
          <Alert tone="success" title={`${savedPatient.full_name} · ${savedPatient.patient_number}`}>
            Registration is done. Describe the main complaint, symptoms and severity, then route the case to the
            qualified department, doctor and nurse — all in one step.
          </Alert>
          <p className="text-sm text-muted-foreground">
            Use “Describe sickness &amp; route” below. It opens the intake form for this patient with department
            suggestions matched to the complaint, and routes the case without leaving the modal.
          </p>
        </div>
      ) : (
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {formError && <Alert tone="danger">{formError}</Alert>}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="First name" htmlFor="patient-first-name" required error={fieldError('first_name')}>
            <Input
              id="patient-first-name"
              value={form.first_name}
              onChange={(event) => set('first_name', event.target.value)}
              invalid={Boolean(fieldError('first_name'))}
              autoComplete="off"
            />
          </FormField>
          <FormField label="Last name" htmlFor="patient-last-name" required error={fieldError('last_name')}>
            <Input
              id="patient-last-name"
              value={form.last_name}
              onChange={(event) => set('last_name', event.target.value)}
              invalid={Boolean(fieldError('last_name'))}
              autoComplete="off"
            />
          </FormField>
          <FormField label="Gender" htmlFor="patient-gender" required error={fieldError('gender')}>
            <Select
              id="patient-gender"
              value={form.gender}
              onChange={(event) => set('gender', event.target.value as Gender | '')}
              options={GENDER_OPTIONS}
              placeholder="Select gender"
              invalid={Boolean(fieldError('gender'))}
            />
          </FormField>
          <FormField label="Date of birth" htmlFor="patient-dob" required error={fieldError('date_of_birth')}>
            <Input
              id="patient-dob"
              type="date"
              value={form.date_of_birth}
              onChange={(event) => set('date_of_birth', event.target.value)}
              invalid={Boolean(fieldError('date_of_birth'))}
            />
          </FormField>
          <FormField label="Phone" htmlFor="patient-phone" required error={fieldError('phone')}>
            <Input
              id="patient-phone"
              value={form.phone}
              onChange={(event) => set('phone', event.target.value)}
              invalid={Boolean(fieldError('phone'))}
              placeholder="+251 9…"
            />
          </FormField>
          <FormField label="Email" htmlFor="patient-email" error={fieldError('email')}>
            <Input
              id="patient-email"
              type="email"
              value={form.email}
              onChange={(event) => set('email', event.target.value)}
              invalid={Boolean(fieldError('email'))}
            />
          </FormField>
          <FormField label="Blood group" htmlFor="patient-blood" error={fieldError('blood_group')}>
            <Select
              id="patient-blood"
              value={form.blood_group}
              onChange={(event) => set('blood_group', event.target.value)}
              options={BLOOD_GROUP_OPTIONS}
            />
          </FormField>
          <FormField label="Address" htmlFor="patient-address" error={fieldError('address')}>
            <Input
              id="patient-address"
              value={form.address}
              onChange={(event) => set('address', event.target.value)}
              invalid={Boolean(fieldError('address'))}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Emergency contact name" htmlFor="patient-emergency-name" error={fieldError('emergency_contact_name')}>
            <Input
              id="patient-emergency-name"
              value={form.emergency_contact_name}
              onChange={(event) => set('emergency_contact_name', event.target.value)}
              invalid={Boolean(fieldError('emergency_contact_name'))}
            />
          </FormField>
          <FormField label="Emergency contact phone" htmlFor="patient-emergency-phone" error={fieldError('emergency_contact_phone')}>
            <Input
              id="patient-emergency-phone"
              value={form.emergency_contact_phone}
              onChange={(event) => set('emergency_contact_phone', event.target.value)}
              invalid={Boolean(fieldError('emergency_contact_phone'))}
            />
          </FormField>
        </div>

        <FormField
          label="Allergies"
          htmlFor="patient-allergies"
          error={fieldError('allergies')}
          hint="Leave empty when there are no known allergies"
        >
          <Textarea
            id="patient-allergies"
            rows={2}
            value={form.allergies}
            onChange={(event) => set('allergies', event.target.value)}
            invalid={Boolean(fieldError('allergies'))}
            placeholder="e.g. Penicillin, peanuts"
          />
        </FormField>

        <FormField label="Medical history" htmlFor="patient-history" error={fieldError('medical_history')}>
          <Textarea
            id="patient-history"
            rows={3}
            value={form.medical_history}
            onChange={(event) => set('medical_history', event.target.value)}
            invalid={Boolean(fieldError('medical_history'))}
          />
        </FormField>

        <div className="flex justify-end gap-2.5 border-t pt-4">
          <Button variant="outline" onClick={closeAll} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" loading={mutation.isPending}>
            {patient ? 'Save changes' : 'Register patient'}
          </Button>
        </div>
      </form>
      )}
    </Modal>
    {savedPatient && (
      <IntakeModal
        open={intakeOpen}
        onClose={() => {
          setIntakeOpen(false)
          closeAll()
        }}
        patientId={savedPatient.id}
      />
    )}
    </>
  )
}

export default PatientFormModal
