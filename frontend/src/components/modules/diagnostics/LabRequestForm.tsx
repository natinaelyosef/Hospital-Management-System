import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { labApi } from '@/api/lab.api'
import { miscApi } from '@/api/misc.api'
import { getFieldErrors, getErrorMessage } from '@/api/client'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/ui/Toast'
import { formatCurrency } from '@/utils/format'
import { PatientPicker } from './PatientPicker'
import type { Patient } from '@/types'

export interface LabRequestFormProps {
  open: boolean
  onClose: () => void
}

const PRIORITIES = [
  { value: 'routine', label: 'Routine' },
  { value: 'urgent', label: 'Urgent' },
]

export function LabRequestForm({ open, onClose }: LabRequestFormProps) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [patient, setPatient] = useState<Patient | null>(null)
  const [priority, setPriority] = useState('routine')
  const [doctorId, setDoctorId] = useState('')
  const [notes, setNotes] = useState('')
  const [selected, setSelected] = useState<number[]>([])
  const [filter, setFilter] = useState('')
  const [errors, setErrors] = useState<Record<string, string[]>>({})

  const tests = useQuery({
    queryKey: ['lab-tests', { per_page: 100 }],
    queryFn: () => labApi.tests({ per_page: 100 }),
    enabled: open,
  })
  const doctors = useQuery({
    queryKey: ['doctors', { per_page: 100 }],
    queryFn: () => miscApi.doctors.list({ per_page: 100 }),
    enabled: open,
  })

  useEffect(() => {
    if (open) {
      setPatient(null)
      setPriority('routine')
      setDoctorId('')
      setNotes('')
      setSelected([])
      setFilter('')
      setErrors({})
    }
  }, [open])

  const activeTests = useMemo(() => (tests.data?.data ?? []).filter((test) => test.is_active), [tests.data])
  const visibleTests = useMemo(() => {
    const term = filter.trim().toLowerCase()
    if (!term) return activeTests
    return activeTests.filter(
      (test) => test.name.toLowerCase().includes(term) || test.code.toLowerCase().includes(term),
    )
  }, [activeTests, filter])

  const total = useMemo(
    () => activeTests.filter((test) => selected.includes(test.id)).reduce((sum, test) => sum + Number(test.price), 0),
    [activeTests, selected],
  )

  const create = useMutation({
    mutationFn: () =>
      labApi.createRequest({
        patient_id: patient!.id,
        doctor_id: doctorId ? Number(doctorId) : undefined,
        priority,
        notes: notes.trim() || undefined,
        test_ids: selected,
      }),
  })

  const toggleTest = (id: number) =>
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setErrors({})

    if (!patient) {
      setErrors({ patient_id: ['Select a patient.'] })
      return
    }
    if (selected.length === 0) {
      setErrors({ test_ids: ['Select at least one test.'] })
      return
    }

    try {
      await create.mutateAsync()
      queryClient.invalidateQueries({ queryKey: ['lab-requests'] })
      toast.success('Lab request created', `${selected.length} test${selected.length === 1 ? '' : 's'} ordered`)
      onClose()
    } catch (caught) {
      const fields = getFieldErrors(caught)
      if (Object.keys(fields).length > 0) setErrors(fields)
      else toast.error('Unable to create lab request', getErrorMessage(caught))
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title="New lab request"
      description="Order investigations for a patient"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={create.isPending}>
            Cancel
          </Button>
          <Button type="submit" form="lab-request-form" loading={create.isPending}>
            Create request
          </Button>
        </>
      }
    >
      <form id="lab-request-form" onSubmit={onSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <PatientPicker
            value={patient}
            onChange={setPatient}
            error={errors.patient_id?.[0]}
            hint="Type at least 2 characters to search."
          />
          <FormField label="Priority" htmlFor="lab-priority" required error={errors.priority?.[0]}>
            <Select id="lab-priority" value={priority} onChange={(event) => setPriority(event.target.value)} options={PRIORITIES} />
          </FormField>
          <FormField label="Requesting doctor" htmlFor="lab-doctor" error={errors.doctor_id?.[0]} hint="Defaults to your account when empty">
            <Select
              id="lab-doctor"
              value={doctorId}
              onChange={(event) => setDoctorId(event.target.value)}
              options={[
                { value: '', label: 'No doctor' },
                ...(doctors.data?.data ?? []).map((doctor) => ({ value: String(doctor.id), label: `${doctor.name} · ${doctor.specialization}` })),
              ]}
            />
          </FormField>
          <FormField label="Notes" htmlFor="lab-notes" error={errors.notes?.[0]}>
            <Input id="lab-notes" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Clinical indication" />
          </FormField>
        </div>

        <div className="space-y-2 rounded-lg border bg-muted/40 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium text-foreground">Tests</p>
              <p className="text-xs text-muted-foreground">
                {selected.length} selected · total {formatCurrency(total)}
              </p>
            </div>
            <div className="w-56">
              <Input
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                placeholder="Filter tests…"
                aria-label="Filter tests"
              />
            </div>
          </div>

          {errors.test_ids?.[0] && <p className="text-xs font-medium text-destructive">{errors.test_ids[0]}</p>}

          <div className="max-h-64 overflow-y-auto rounded-lg border bg-card">
            {tests.isLoading ? (
              <p className="px-3 py-3 text-xs text-muted-foreground">Loading tests…</p>
            ) : visibleTests.length === 0 ? (
              <p className="px-3 py-3 text-xs text-muted-foreground">No tests match the filter.</p>
            ) : (
              visibleTests.map((test) => (
                <div
                  key={test.id}
                  className="flex items-center gap-3 border-b px-3 py-2.5 transition-colors last:border-b-0 hover:bg-muted/60"
                >
                  <Checkbox
                    className="min-w-0 flex-1"
                    checked={selected.includes(test.id)}
                    onChange={() => toggleTest(test.id)}
                    label={
                      <>
                        <span className="block truncate text-sm font-medium">{test.name}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {test.code} · {test.category}
                        </span>
                      </>
                    }
                  />
                  <span className="shrink-0 text-sm font-medium tabular-nums text-foreground">
                    {formatCurrency(Number(test.price))}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </form>
    </Modal>
  )
}

export default LabRequestForm
