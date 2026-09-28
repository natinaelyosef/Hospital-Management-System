import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Send, Sparkles } from 'lucide-react'
import { getFieldErrors, getErrorMessage } from '@/api/client'
import { miscApi } from '@/api/misc.api'
import { visitApi, type ReferPayload } from '@/api/visit.api'
import { workflowApi } from '@/api/workflow.api'
import { VISIT_PRIORITY_OPTIONS } from '@/components/modules/clinical/constants'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { FormField } from '@/components/ui/FormField'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import type { Visit } from '@/types'
import { cn } from '@/utils/cn'

interface ReferDialogProps {
  open: boolean
  onClose: () => void
  visit: Visit | null
  onReferred?: (visit: Visit) => void
}

/** Route a case to a department — suggestions guide, a human confirms. */
export function ReferDialog({ open, onClose, visit, onReferred }: ReferDialogProps) {
  const [departmentId, setDepartmentId] = useState('')
  const [doctorId, setDoctorId] = useState('')
  const [priority, setPriority] = useState<string>(visit?.priority ?? 'normal')
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (!open || !visit) return
    setDepartmentId(visit.department_id ? String(visit.department_id) : '')
    setDoctorId(visit.doctor?.id ? String(visit.doctor.id) : '')
    setPriority(visit.priority ?? 'normal')
    setNotes('')
    setErrors({})
    setFormError(null)
  }, [open, visit])

  const { data: departments } = useQuery({
    queryKey: ['departments', 'options'],
    queryFn: () => miscApi.departments.list({ per_page: 100 }),
    staleTime: 5 * 60_000,
    enabled: open,
  })

  const { data: doctors } = useQuery({
    queryKey: ['doctors', 'options'],
    queryFn: () => miscApi.doctors.list({ per_page: 100 }),
    staleTime: 5 * 60_000,
    enabled: open,
    retry: 0,
  })

  const complaint = useMemo(
    () => [visit?.chief_complaint, visit?.symptoms].filter(Boolean).join(' — '),
    [visit],
  )

  const { data: suggested = [] } = useQuery({
    queryKey: ['departments', 'suggest', complaint],
    queryFn: () => workflowApi.suggestDepartments(complaint),
    enabled: open && complaint.trim().length > 0,
    staleTime: 5 * 60_000,
    retry: 0,
  })

  const submit = async () => {
    if (!visit) return
    const next: Record<string, string[]> = {}
    if (!departmentId) next.department_id = ['Choose the receiving department.']
    setErrors(next)
    setFormError(null)
    if (Object.keys(next).length > 0) return

    const payload: ReferPayload = {
      department_id: Number(departmentId),
      doctor_id: doctorId ? Number(doctorId) : undefined,
      priority: priority as ReferPayload['priority'],
      notes: notes.trim() || undefined,
    }

    setPending(true)
    try {
      const referred = await visitApi.refer(visit.id, payload)
      onReferred?.(referred)
      onClose()
    } catch (caught) {
      const fieldErrors = getFieldErrors(caught)
      setErrors(fieldErrors)
      if (Object.keys(fieldErrors).length === 0) setFormError(getErrorMessage(caught, 'Unable to refer this case'))
    } finally {
      setPending(false)
    }
  }

  return (
    <Modal
      open={open && visit !== null}
      onClose={onClose}
      title={visit ? `Refer ${visit.visit_number}` : 'Refer case'}
      description={complaint ? `Complaint: ${complaint}` : 'Choose the receiving department.'}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={pending}>Cancel</Button>
          <Button icon={<Send size={15} />} onClick={() => void submit()} loading={pending}>
            Confirm referral
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {formError && <Alert tone="danger">{formError}</Alert>}

        {suggested.length > 0 && (
          <div className="rounded-xl border bg-muted/40 p-3.5">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <Sparkles size={13} className="text-primary" /> Suggested for this complaint
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {suggested.map((department) => (
                <button
                  key={department.id}
                  type="button"
                  onClick={() => setDepartmentId(String(department.id))}
                  className={cn(
                    'cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
                    departmentId === String(department.id)
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'bg-card text-foreground hover:border-primary/50',
                  )}
                >
                  {department.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <FormField label="Department" htmlFor="refer-department" required error={errors.department_id?.[0]}>
          <Select
            id="refer-department"
            value={departmentId}
            onChange={(event) => setDepartmentId(event.target.value)}
            placeholder="Select department"
          >
            {(departments?.data ?? []).map((department) => (
              <option key={department.id} value={department.id}>{department.name}</option>
            ))}
          </Select>
        </FormField>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Doctor (optional)" htmlFor="refer-doctor" hint="Leave empty to route to the department pool.">
            <Select
              id="refer-doctor"
              value={doctorId}
              onChange={(event) => setDoctorId(event.target.value)}
              placeholder="Department pool"
            >
              {(doctors?.data ?? [])
                .filter((doctor) => !departmentId || !doctor.department || doctor.department.id === Number(departmentId))
                .map((doctor) => (
                  <option key={doctor.id} value={doctor.id}>{doctor.name} · {doctor.specialization}</option>
                ))}
            </Select>
          </FormField>
          <FormField label="Priority" htmlFor="refer-priority">
            <Select id="refer-priority" value={priority} onChange={(event) => setPriority(event.target.value)} options={VISIT_PRIORITY_OPTIONS} />
          </FormField>
        </div>

        <FormField label="Handoff notes" htmlFor="refer-notes" error={errors.notes?.[0]}>
          <Textarea id="refer-notes" rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Anything the next team should know first." />
        </FormField>
      </div>
    </Modal>
  )
}
