import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, ClipboardList, Send, Sparkles } from 'lucide-react'
import { getFieldErrors, getErrorMessage } from '@/api/client'
import { miscApi } from '@/api/misc.api'
import { visitApi, type IntakePayload } from '@/api/visit.api'
import { PatientPicker } from '@/components/modules/clinical/PatientPicker'
import { VISIT_PRIORITY_OPTIONS, VISIT_SEVERITY_OPTIONS, VISIT_TYPE_OPTIONS } from '@/components/modules/clinical/constants'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { useAuth } from '@/contexts/AuthContext'
import type { Patient, SuggestedDepartment, Visit } from '@/types'
import { cn } from '@/utils/cn'

interface IntakeModalProps {
  open: boolean
  onClose: () => void
  /** When set, intake is recorded for this patient (picker hidden). */
  patientId?: number
  onCreated?: (visit: Visit) => void
}

const EMPTY = {
  type: 'opd',
  priority: 'normal',
  chief_complaint: '',
  symptoms: '',
  symptom_duration: '',
  severity: '',
  previous_conditions: '',
  current_medications: '',
  allergies: '',
  intake_notes: '',
  bp_systolic: '',
  bp_diastolic: '',
  temperature: '',
  pulse: '',
}

export function IntakeModal({ open, onClose, patientId, onCreated }: IntakeModalProps) {
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const [patient, setPatient] = useState<Patient | null>(null)
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [created, setCreated] = useState<Visit | null>(null)
  const [suggested, setSuggested] = useState<SuggestedDepartment[]>([])

  // Routing step state — intake and routing happen in one sitting so the case
  // never sits in the queue waiting for someone to come back to it.
  const canRoute = hasPermission('patients.edit')
  const [departmentId, setDepartmentId] = useState('')
  const [doctorId, setDoctorId] = useState('')
  const [priority, setPriority] = useState('normal')
  const [routing, setRouting] = useState(false)
  const [routingError, setRoutingError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setPatient(null)
    setForm(EMPTY)
    setErrors({})
    setFormError(null)
    setCreated(null)
    setSuggested([])
    setDepartmentId('')
    setDoctorId('')
    setRouting(false)
    setRoutingError(null)
  }, [open])

  const { data: departments } = useQuery({
    queryKey: ['departments', 'options'],
    queryFn: () => miscApi.departments.list({ per_page: 100 }),
    staleTime: 5 * 60_000,
    enabled: open && Boolean(created) && canRoute,
  })

  const { data: doctors } = useQuery({
    queryKey: ['doctors', 'options'],
    queryFn: () => miscApi.doctors.list({ per_page: 100 }),
    staleTime: 5 * 60_000,
    enabled: open && Boolean(created) && canRoute,
    retry: 0,
  })

  const update = (key: keyof typeof EMPTY, value: string) => setForm((prev) => ({ ...prev, [key]: value }))

  const submit = async () => {
    const targetId = patientId ?? patient?.id
    const next: Record<string, string[]> = {}
    if (!targetId) next.patient_id = ['Select a patient first.']
    if (!form.chief_complaint.trim()) next.chief_complaint = ['Describe the main complaint.']
    setErrors(next)
    setFormError(null)
    if (Object.keys(next).length > 0 || !targetId) return

    const vitals: Record<string, number> = {}
    for (const key of ['bp_systolic', 'bp_diastolic', 'temperature', 'pulse'] as const) {
      const raw = form[key].trim()
      if (raw !== '' && Number.isFinite(Number(raw))) vitals[key] = Number(raw)
    }

    const payload: IntakePayload = {
      patient_id: targetId,
      type: form.type,
      priority: form.priority as IntakePayload['priority'],
      chief_complaint: form.chief_complaint.trim(),
      symptoms: form.symptoms.trim() || undefined,
      symptom_duration: form.symptom_duration.trim() || undefined,
      severity: (form.severity || undefined) as IntakePayload['severity'],
      previous_conditions: form.previous_conditions.trim() || undefined,
      current_medications: form.current_medications.trim() || undefined,
      allergies: form.allergies.trim() || undefined,
      intake_notes: form.intake_notes.trim() || undefined,
      vitals: Object.keys(vitals).length > 0 ? vitals : undefined,
    }

    setPending(true)
    try {
      const result = await visitApi.intake(payload)
      setCreated(result.visit)
      setSuggested(result.suggested_departments)
      setPriority(payload.priority ?? 'normal')
      onCreated?.(result.visit)
    } catch (caught) {
      const fieldErrors = getFieldErrors(caught)
      setErrors(fieldErrors)
      if (Object.keys(fieldErrors).length === 0) setFormError(getErrorMessage(caught, 'Unable to record intake'))
    } finally {
      setPending(false)
    }
  }

  const route = async () => {
    if (!created) return
    if (!departmentId) {
      setRoutingError('Choose the receiving department.')
      return
    }

    setRouting(true)
    setRoutingError(null)
    try {
      const referred = await visitApi.refer(created.id, {
        department_id: Number(departmentId),
        doctor_id: doctorId ? Number(doctorId) : undefined,
        priority: priority as 'normal' | 'urgent' | 'emergency',
      })
      setCreated(referred)
      onCreated?.(referred)
    } catch (caught) {
      setRoutingError(getErrorMessage(caught, 'Unable to route this case'))
    } finally {
      setRouting(false)
    }
  }

  const routed = created?.status === 'referred'

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={routed ? 'Case routed' : created ? 'Route this case' : 'Record complaint & symptoms'}
      description={
        routed
          ? `${created?.visit_number} is with the receiving team.`
          : created
            ? `${created?.visit_number} — pick the qualified department so the right doctor and nurse pick it up.`
            : 'Initial assessment — symptoms and triage info, never a diagnosis.'
      }
      footer={
        created ? (
          <>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            {canRoute && !routed && (
              <Button icon={<Send size={15} />} onClick={() => void route()} loading={routing}>
                Route to department
              </Button>
            )}
            <Button icon={<ArrowRight size={15} />} onClick={() => { onClose(); void navigate(`/consultation/${created.id}`) }}>
              Open case
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline" onClick={onClose} disabled={pending}>Cancel</Button>
            <Button icon={<ClipboardList size={15} />} onClick={() => void submit()} loading={pending}>
              Save intake
            </Button>
          </>
        )
      }
    >
      {created ? (
        <div className="space-y-4">
          {routed ? (
            <Alert tone="success" title={`${created.visit_number} routed`}>
              The receiving team has been notified. The nurse picks the case up for triage next.
            </Alert>
          ) : (
            <Alert tone="success" title={`Case ${created.visit_number} created`}>
              The patient is in the routing queue at <strong>Intake completed</strong>. Route the case now so the
              qualified doctor and nurse pick it up.
            </Alert>
          )}

          {!routed && canRoute && (
            <>
              {routingError && <Alert tone="danger">{routingError}</Alert>}

              {suggested.length > 0 && (
                <div className="rounded-xl border bg-muted/40 p-4">
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <Sparkles size={13} className="text-primary" /> Matched to this complaint
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
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    Ranked from the complaint and symptoms above — pick one, or choose any other department below.
                  </p>
                </div>
              )}

              <FormField label="Department" htmlFor="intake-route-department" required>
                <Select
                  id="intake-route-department"
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
                <FormField
                  label="Doctor (optional)"
                  htmlFor="intake-route-doctor"
                  hint="Leave empty to route to the department pool for nurse triage."
                >
                  <Select
                    id="intake-route-doctor"
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
                <FormField label="Priority" htmlFor="intake-route-priority">
                  <Select
                    id="intake-route-priority"
                    value={priority}
                    onChange={(event) => setPriority(event.target.value)}
                    options={VISIT_PRIORITY_OPTIONS}
                  />
                </FormField>
              </div>
            </>
          )}

          {!routed && !canRoute && (
            <Alert tone="info" title="Waiting for reception">
              Your complaint is recorded. Reception will route you to the right department and you will be notified
              when the nurse starts your triage.
            </Alert>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {formError && <Alert tone="danger">{formError}</Alert>}
          {!patientId && (
            <FormField label="Patient" htmlFor="intake-patient" required error={errors.patient_id?.[0]}>
              <PatientPicker value={patient} onChange={setPatient} />
            </FormField>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FormField label="Visit type" htmlFor="intake-type">
              <Select id="intake-type" value={form.type} onChange={(e) => update('type', e.target.value)} options={VISIT_TYPE_OPTIONS} />
            </FormField>
            <FormField label="Priority" htmlFor="intake-priority">
              <Select id="intake-priority" value={form.priority} onChange={(e) => update('priority', e.target.value)} options={VISIT_PRIORITY_OPTIONS} />
            </FormField>
            <FormField label="Severity" htmlFor="intake-severity">
              <Select id="intake-severity" value={form.severity} onChange={(e) => update('severity', e.target.value)} options={VISIT_SEVERITY_OPTIONS} />
            </FormField>
          </div>
          <FormField label="Main complaint" htmlFor="intake-complaint" required error={errors.chief_complaint?.[0]}>
            <Textarea id="intake-complaint" rows={2} value={form.chief_complaint} onChange={(e) => update('chief_complaint', e.target.value)} placeholder="e.g. Persistent cough" />
          </FormField>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Symptoms" htmlFor="intake-symptoms" error={errors.symptoms?.[0]}>
              <Textarea id="intake-symptoms" rows={2} value={form.symptoms} onChange={(e) => update('symptoms', e.target.value)} placeholder="Cough, fever, chest discomfort" />
            </FormField>
            <FormField label="Duration" htmlFor="intake-duration" error={errors.symptom_duration?.[0]}>
              <Input id="intake-duration" value={form.symptom_duration} onChange={(e) => update('symptom_duration', e.target.value)} placeholder="e.g. 5 days" />
            </FormField>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Previous conditions" htmlFor="intake-conditions">
              <Textarea id="intake-conditions" rows={2} value={form.previous_conditions} onChange={(e) => update('previous_conditions', e.target.value)} />
            </FormField>
            <FormField label="Current medications" htmlFor="intake-meds">
              <Textarea id="intake-meds" rows={2} value={form.current_medications} onChange={(e) => update('current_medications', e.target.value)} />
            </FormField>
          </div>
          <FormField label="Allergies" htmlFor="intake-allergies" hint="Saved to the patient record when it has none yet.">
            <Input id="intake-allergies" value={form.allergies} onChange={(e) => update('allergies', e.target.value)} placeholder="e.g. Penicillin" />
          </FormField>
          <div>
            <p className="mb-2 text-xs font-semibold text-foreground">Basic vitals <span className="font-normal text-muted-foreground">(optional — when available)</span></p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <FormField label="BP sys" htmlFor="intake-bpsys">
                <Input id="intake-bpsys" inputMode="numeric" value={form.bp_systolic} onChange={(e) => update('bp_systolic', e.target.value)} />
              </FormField>
              <FormField label="BP dia" htmlFor="intake-bpdia">
                <Input id="intake-bpdia" inputMode="numeric" value={form.bp_diastolic} onChange={(e) => update('bp_diastolic', e.target.value)} />
              </FormField>
              <FormField label="Temp °C" htmlFor="intake-temp">
                <Input id="intake-temp" inputMode="decimal" value={form.temperature} onChange={(e) => update('temperature', e.target.value)} />
              </FormField>
              <FormField label="Pulse" htmlFor="intake-pulse">
                <Input id="intake-pulse" inputMode="numeric" value={form.pulse} onChange={(e) => update('pulse', e.target.value)} />
              </FormField>
            </div>
          </div>
          <FormField label="Additional notes" htmlFor="intake-notes">
            <Textarea id="intake-notes" rows={2} value={form.intake_notes} onChange={(e) => update('intake_notes', e.target.value)} />
          </FormField>
        </div>
      )}
    </Modal>
  )
}
