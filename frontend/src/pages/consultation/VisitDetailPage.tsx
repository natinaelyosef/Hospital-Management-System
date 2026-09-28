<<<<<<< HEAD
=======
<<<<<<< HEAD
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a
import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Check, ClipboardCheck, FlaskConical, Heart, History, NotebookPen, Pill, Plus, Receipt, Save, Send, Stethoscope, User, UserCheck, XCircle } from 'lucide-react'
import { getErrorMessage } from '@/api/client'
import { billingApi } from '@/api/billing.api'
import { labApi } from '@/api/lab.api'
import { visitApi, type MedicalNoteInput, type VisitInput } from '@/api/visit.api'
import { JourneyTimeline } from '@/components/modules/clinical/JourneyTimeline'
import { PrescriptionBuilder } from '@/components/modules/clinical/PrescriptionBuilder'
import { ReferDialog } from '@/components/modules/clinical/ReferDialog'
import { VisitStepper } from '@/components/modules/clinical/VisitStepper'
<<<<<<< HEAD
=======
=======
import { useMemo, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Check, FlaskConical, Heart, NotebookPen, Pill, Plus, Save, Stethoscope, User } from 'lucide-react'
import { getErrorMessage } from '@/api/client'
import { labApi } from '@/api/lab.api'
import { visitApi, type MedicalNoteInput, type VisitInput } from '@/api/visit.api'
import { PrescriptionBuilder } from '@/components/modules/clinical/PrescriptionBuilder'
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a
import { VitalsForm } from '@/components/modules/clinical/VitalsForm'
import { NOTE_TYPE_OPTIONS } from '@/components/modules/clinical/constants'
import { Alert } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Checkbox } from '@/components/ui/Checkbox'
import { EmptyState } from '@/components/ui/EmptyState'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/ui/PageHeader'
import { PageLoader } from '@/components/ui/Spinner'
import { Select } from '@/components/ui/Select'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Table, type Column } from '@/components/ui/Table'
import { Tabs } from '@/components/ui/Tabs'
import { Textarea } from '@/components/ui/Textarea'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/contexts/AuthContext'
import { useConfirm } from '@/hooks'
import type { LabRequest, MedicalNote, Prescription, VitalSign, Visit } from '@/types'
import { formatCurrency, formatDate, formatDateTime, initials, statusLabel } from '@/utils/format'

const EMPTY_CLINICAL = {
  chief_complaint: '',
  symptoms: '',
  diagnosis: '',
  treatment: '',
  medical_notes: '',
  follow_up_date: '',
}

<<<<<<< HEAD
=======
<<<<<<< HEAD
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a
const TERMINAL_STATUSES = ['visit_completed', 'cancelled']

const CONSULT_STATUSES = ['in_consultation', 'lab_completed', 'waiting_for_doctor']

/** Stages from which the doctor may order lab work or write a prescription. */
const DOCTOR_STAGES = ['in_consultation', 'lab_completed', 'waiting_for_doctor']

/** Mirrors VisitWorkflow::COMPLETABLE — the stages a case may be closed from. */
const COMPLETABLE_STAGES = [
  'in_consultation',
  'lab_completed',
  'prescription_created',
  'pharmacy_processing',
  'payment_required',
  'payment_approved',
  'medication_dispensed',
]

/**
 * Stage-aware handoff bar: each role sees only the next legal move for the
 * case. The backend owns the state machine; failures surface as toasts.
 */
function WorkflowActions({ visit }: { visit: Visit }) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const confirm = useConfirm()
  const { hasPermission } = useAuth()
  const [referOpen, setReferOpen] = useState(false)
  const [pending, setPending] = useState<string | null>(null)

  const canRefer = hasPermission('patients.edit')
  const canTriage = hasPermission('consultation.create')
  const canConsult = hasPermission('consultation.edit')

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['visit', visit.id] })
    queryClient.invalidateQueries({ queryKey: ['visits'] })
    queryClient.invalidateQueries({ queryKey: ['visit', visit.id, 'timeline'] })
  }

  const run = async (key: string, action: () => Promise<Visit>, success: string) => {
    setPending(key)
    try {
      await action()
      toast.success(success, visit.visit_number)
      refresh()
    } catch (caught) {
      toast.error('Unable to move this case', getErrorMessage(caught))
    } finally {
      setPending(null)
    }
  }

  const cancelCase = async () => {
    const approved = await confirm({
      title: 'Cancel this case?',
      message: 'The case leaves every queue. This cannot be undone, but the history is preserved.',
      confirmLabel: 'Cancel case',
      tone: 'destructive',
    })
    if (approved) void run('cancel', () => visitApi.cancelVisit(visit.id), 'Case cancelled')
  }

  const buttons: ReactNode[] = []
  const busy = (key: string) => pending === key

  if (visit.status === 'intake_completed' && canRefer) {
    buttons.push(
      <Button key="refer" icon={<Send size={15} />} loading={busy('refer')} onClick={() => setReferOpen(true)}>
        Refer to department
      </Button>,
    )
  }
  if (visit.status === 'referred' && canTriage) {
    buttons.push(
      <Button key="triage" variant="outline" icon={<UserCheck size={15} />} loading={busy('triage')} onClick={() => void run('triage', () => visitApi.startTriage(visit.id), 'Triage started')}>
        Start triage
      </Button>,
    )
  }
  if (visit.status === 'waiting_for_nurse' && canTriage) {
    buttons.push(
      <Button key="assess" icon={<ClipboardCheck size={15} />} loading={busy('assess')} onClick={() => void run('assess', () => visitApi.completeTriage(visit.id), 'Assessment completed — queued for doctor')}>
        Complete triage
      </Button>,
    )
  }
  if ((visit.status === 'nurse_assessment_completed' || visit.status === 'waiting_for_doctor') && canConsult) {
    buttons.push(
      <Button key="consult" icon={<Stethoscope size={15} />} loading={busy('consult')} onClick={() => void run('consult', () => visitApi.startConsultation(visit.id), 'Consultation started')}>
        Start consultation
      </Button>,
    )
  }
  if (visit.status === 'lab_completed' && canConsult) {
    buttons.push(
      <Button key="reviewed" icon={<FlaskConical size={15} />} loading={busy('reviewed')} onClick={() => void run('reviewed', () => visitApi.labReviewed(visit.id), 'Results reviewed — back in consultation')}>
        Review lab results
      </Button>,
    )
  }
  if (!TERMINAL_STATUSES.includes(visit.status) && canConsult) {
    buttons.push(
      <Button key="cancel" variant="ghost" icon={<XCircle size={15} />} loading={busy('cancel')} onClick={() => void cancelCase()}>
        Cancel case
      </Button>,
    )
  }

  if (buttons.length === 0) return null

  return (
    <>
      <div className="flex flex-wrap items-center gap-2.5 rounded-xl border bg-card p-3 shadow-xs print:hidden">
        <span className="mr-auto text-xs font-semibold tracking-wide text-muted-foreground uppercase">Next step</span>
        {buttons}
      </div>
      <ReferDialog open={referOpen} onClose={() => setReferOpen(false)} visit={visit} onReferred={() => refresh()} />
    </>
  )
}

<<<<<<< HEAD
=======
=======
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a
function Metric({ label, value, unit }: { label: string; value: number | null; unit: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-lg border bg-muted/30 px-3 py-2">
      <span className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">{label}</span>
      <span className="text-sm font-semibold text-foreground">
        {value ?? '—'}
        {value != null && <span className="ml-1 text-[11px] font-normal text-muted-foreground">{unit}</span>}
      </span>
    </div>
  )
}

function PatientSidebar({ patient, vitals }: { patient: Visit['patient']; vitals: VitalSign[] }) {
  const latest = vitals.length > 0 ? [...vitals].sort((a, b) => b.recorded_at.localeCompare(a.recorded_at))[0] : null

  return (
    <Card className="h-fit">
      <CardHeader className="flex-row items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/12 text-sm font-semibold text-primary">
          {initials(patient.full_name)}
        </span>
        <div className="min-w-0">
          <CardTitle>{patient.full_name}</CardTitle>
          <p className="text-[11px] text-muted-foreground">
            {patient.patient_number} · {patient.age} yrs · <span className="capitalize">{patient.gender}</span>
          </p>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-xs">
        <div className="flex flex-wrap gap-1.5">
          <Badge tone="info">{patient.phone}</Badge>
          {patient.blood_group && <Badge tone="danger">{patient.blood_group}</Badge>}
        </div>
        {patient.allergies ? (
          <p className="rounded-lg border border-red-500/35 bg-red-500/10 px-3 py-2 font-medium text-red-700 dark:text-red-300">
            Allergy: {patient.allergies}
          </p>
        ) : (
          <p className="text-muted-foreground">No known allergies</p>
        )}
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">Latest vitals</span>
          {latest ? (
            <span className="text-foreground">
              {latest.bp_systolic != null && latest.bp_diastolic != null
                ? `BP ${latest.bp_systolic}/${latest.bp_diastolic} mmHg`
                : 'BP —'}
              {' · '}
              {latest.pulse != null ? `${latest.pulse} bpm` : 'Pulse —'}
              {' · '}
              {latest.temperature != null ? `${latest.temperature} °C` : 'Temp —'}
            </span>
          ) : (
            <span className="text-muted-foreground">No vitals recorded</span>
          )}
        </div>
        <Link
          to={`/patients/${patient.id}`}
          className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-center font-medium text-primary transition-colors hover:bg-muted"
        >
          <User size={14} /> Open full record
        </Link>
      </CardContent>
    </Card>
  )
}

function VitalsPanel({
  vitals,
  loading,
  canRecord,
  onRecord,
}: {
  vitals: VitalSign[]
  loading: boolean
  canRecord: boolean
  onRecord: () => void
}) {
  const latest = vitals.length > 0 ? [...vitals].sort((a, b) => b.recorded_at.localeCompare(a.recorded_at))[0] : null

  return (
    <Card className="h-fit">
      <CardHeader className="flex-row items-center justify-between gap-3">
        <CardTitle>Vitals</CardTitle>
        {canRecord && (
          <Button variant="outline" size="sm" icon={<Heart size={14} />} onClick={onRecord}>
            Record
          </Button>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {loading ? (
          <p className="text-xs text-muted-foreground">Loading vitals…</p>
        ) : !latest ? (
          <p className="text-xs text-muted-foreground">No vitals recorded for this visit yet.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              <Metric label="BP" value={latest.bp_systolic} unit="/ dia" />
              <Metric label="Pulse" value={latest.pulse} unit="bpm" />
              <Metric label="Temperature" value={latest.temperature} unit="°C" />
              <Metric label="SpO₂" value={latest.oxygen_saturation} unit="%" />
              <Metric label="Weight" value={latest.weight} unit="kg" />
              <Metric label="Height" value={latest.height} unit="cm" />
              <Metric label="Resp. rate" value={latest.respiratory_rate} unit="/min" />
              <div className="flex flex-col gap-0.5 rounded-lg border bg-muted/30 px-3 py-2">
                <span className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">Recorded</span>
                <span className="text-xs font-semibold text-foreground">{formatDateTime(latest.recorded_at)}</span>
              </div>
            </div>
            <div className="flex flex-col gap-2 border-t pt-3">
              <span className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">History</span>
              {vitals.slice(0, 5).map((entry) => (
                <div key={entry.id} className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="text-muted-foreground">{formatDateTime(entry.recorded_at)}</span>
                  <span className="text-foreground">
                    {entry.bp_systolic != null && entry.bp_diastolic != null
                      ? `${entry.bp_systolic}/${entry.bp_diastolic}`
                      : '—'}
                    {' · '}
                    {entry.pulse ?? '—'} bpm
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

function ClinicalForm({ visit, canEdit, canComplete }: { visit: Visit; canEdit: boolean; canComplete: boolean }) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const confirm = useConfirm()
  const [form, setForm] = useState(() => ({
    chief_complaint: visit.chief_complaint ?? '',
    symptoms: visit.symptoms ?? '',
    diagnosis: visit.diagnosis ?? '',
    treatment: visit.treatment ?? '',
    medical_notes: visit.medical_notes ?? '',
    follow_up_date: visit.follow_up_date ?? '',
  }))
  const [error, setError] = useState<string | null>(null)

  const set = (key: keyof typeof EMPTY_CLINICAL, value: string) =>
    setForm((current) => ({ ...current, [key]: value }))

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['visit', visit.id] })
    queryClient.invalidateQueries({ queryKey: ['visits'] })
  }

  const saveMutation = useMutation({
    mutationFn: () =>
      visitApi.update(visit.id, {
        chief_complaint: form.chief_complaint.trim(),
        symptoms: form.symptoms.trim(),
        diagnosis: form.diagnosis.trim(),
        treatment: form.treatment.trim(),
        medical_notes: form.medical_notes.trim(),
        follow_up_date: form.follow_up_date || null,
      } satisfies Partial<VisitInput>),
    onSuccess: () => {
      setError(null)
      toast.success('Consultation saved', visit.visit_number)
      refresh()
    },
    onError: (caught) => setError(getErrorMessage(caught, 'Unable to save the consultation')),
  })

  const completeVisit = async () => {
    const approved = await confirm({
      title: 'Complete this consultation?',
      message: 'The visit will be marked as completed. Make sure the diagnosis is recorded first.',
      confirmLabel: 'Complete visit',
    })
    if (!approved) return
    try {
      await visitApi.complete(visit.id)
      toast.success('Consultation completed', visit.visit_number)
      refresh()
    } catch (caught) {
      toast.error('Unable to complete visit', getErrorMessage(caught))
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-3">
        <CardTitle>Clinical notes</CardTitle>
        <StatusBadge status={visit.status} />
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {error && <Alert tone="danger">{error}</Alert>}

        <FormField label="Chief complaint" htmlFor="clinical-complaint">
          <Textarea
            id="clinical-complaint"
            rows={2}
            value={form.chief_complaint}
            disabled={!canEdit}
            onChange={(event) => set('chief_complaint', event.target.value)}
          />
        </FormField>
        <FormField label="Symptoms" htmlFor="clinical-symptoms">
          <Textarea
            id="clinical-symptoms"
            rows={3}
            value={form.symptoms}
            disabled={!canEdit}
            onChange={(event) => set('symptoms', event.target.value)}
          />
        </FormField>
        <FormField label="Diagnosis" htmlFor="clinical-diagnosis" hint="Required before the visit can be completed">
          <Textarea
            id="clinical-diagnosis"
            rows={2}
            value={form.diagnosis}
            disabled={!canEdit}
            onChange={(event) => set('diagnosis', event.target.value)}
          />
        </FormField>
        <FormField label="Treatment plan" htmlFor="clinical-treatment">
          <Textarea
            id="clinical-treatment"
            rows={3}
            value={form.treatment}
            disabled={!canEdit}
            onChange={(event) => set('treatment', event.target.value)}
          />
        </FormField>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Medical notes" htmlFor="clinical-notes">
            <Textarea
              id="clinical-notes"
              rows={3}
              value={form.medical_notes}
              disabled={!canEdit}
              onChange={(event) => set('medical_notes', event.target.value)}
            />
          </FormField>
          <FormField label="Follow-up date" htmlFor="clinical-followup">
            <Input
              id="clinical-followup"
              type="date"
              value={form.follow_up_date}
              disabled={!canEdit}
              onChange={(event) => set('follow_up_date', event.target.value)}
            />
          </FormField>
        </div>

        <div className="flex flex-wrap justify-end gap-2.5 border-t pt-4">
          {canEdit && (
            <Button variant="outline" icon={<Save size={15} />} loading={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
              Save
            </Button>
          )}
<<<<<<< HEAD
=======
<<<<<<< HEAD
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a
          {canComplete && !TERMINAL_STATUSES.includes(visit.status) && (
            <Button
              icon={<Check size={15} />}
              disabled={!COMPLETABLE_STAGES.includes(visit.status)}
              title={COMPLETABLE_STAGES.includes(visit.status) ? undefined : 'The case cannot be closed from this stage yet.'}
              onClick={() => void completeVisit()}
            >
<<<<<<< HEAD
=======
=======
          {canComplete && visit.status === 'in_progress' && (
            <Button icon={<Check size={15} />} onClick={() => void completeVisit()}>
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a
              Complete Visit
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

const prescriptionColumns: Column<Prescription>[] = [
  { key: 'prescription_number', header: 'RX #', render: (row) => <span className="font-mono text-xs">{row.prescription_number}</span> },
  { key: 'created_at', header: 'Date', render: (row) => formatDate(row.created_at) },
  { key: 'items', header: 'Items', render: (row) => row.items.length },
  { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
]

const labColumns: Column<LabRequest>[] = [
  { key: 'request_number', header: 'Request #', render: (row) => <span className="font-mono text-xs">{row.request_number}</span> },
  { key: 'requested_at', header: 'Requested', render: (row) => formatDateTime(row.requested_at) },
  { key: 'priority', header: 'Priority', render: (row) => <StatusBadge status={row.priority} /> },
  { key: 'tests', header: 'Tests', hideBelow: 'md', render: (row) => row.results.map((result) => result.test_name).join(', ') || '—' },
  { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
]

const noteColumns: Column<MedicalNote>[] = [
  { key: 'created_at', header: 'When', render: (row) => formatDateTime(row.created_at) },
  { key: 'note_type', header: 'Type', render: (row) => <Badge>{statusLabel(row.note_type)}</Badge> },
  { key: 'content', header: 'Note', render: (row) => <span className="line-clamp-2">{row.content}</span> },
  { key: 'author_name', header: 'Author', hideBelow: 'md', render: (row) => row.author_name },
]

function LabRequestModal({
  open,
  onClose,
  patientId,
  visitId,
  doctorId,
}: {
  open: boolean
  onClose: () => void
  patientId: number
  visitId: number
  doctorId?: number
}) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [selected, setSelected] = useState<number[]>([])
  const [priority, setPriority] = useState('routine')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  const { data: tests } = useQuery({
    queryKey: ['lab-tests', 'options'],
    queryFn: () => labApi.tests({ per_page: 200 }),
    enabled: open,
    staleTime: 5 * 60_000,
    retry: 0,
  })

  const mutation = useMutation({
    mutationFn: () =>
      labApi.createRequest({
        patient_id: patientId,
        visit_id: visitId,
        doctor_id: doctorId,
        priority,
        notes: notes.trim() || undefined,
        test_ids: selected,
      }),
    onSuccess: (request) => {
      toast.success('Lab request created', `${request.request_number} · ${request.results.length} test(s)`)
      queryClient.invalidateQueries({ queryKey: ['visit', visitId] })
      setSelected([])
      setNotes('')
      setPriority('routine')
      onClose()
    },
    onError: (caught) => setError(getErrorMessage(caught, 'Unable to create the lab request')),
  })

  const toggle = (testId: number) =>
    setSelected((current) => (current.includes(testId) ? current.filter((id) => id !== testId) : [...current, testId]))

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (selected.length === 0) {
      setError('Select at least one test.')
      return
    }
    setError(null)
    mutation.mutate()
  }

  return (
    <Modal open={open} onClose={onClose} size="lg" title="Request lab tests" description="Select the tests to order">
      <form onSubmit={submit} className="flex flex-col gap-4">
        {error && <Alert tone="danger">{error}</Alert>}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Priority" htmlFor="lab-priority">
            <Select
              id="lab-priority"
              value={priority}
              onChange={(event) => setPriority(event.target.value)}
              options={[
                { value: 'routine', label: 'Routine' },
                { value: 'urgent', label: 'Urgent' },
              ]}
            />
          </FormField>
          <FormField label="Notes" htmlFor="lab-notes">
            <Input id="lab-notes" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Fasting, clinical context…" />
          </FormField>
        </div>

        <div className="max-h-72 overflow-y-auto rounded-lg border">
          {(tests?.data ?? []).map((test) => (
            <div
              key={test.id}
              className="flex cursor-pointer items-center justify-between gap-3 border-b px-3 py-2.5 last:border-b-0 hover:bg-muted/50"
            >
              <Checkbox
                checked={selected.includes(test.id)}
                onChange={() => toggle(test.id)}
                label={test.name}
                description={`${test.code} · ${test.category}`}
              />
              <span className="shrink-0 text-xs font-medium text-muted-foreground">{formatCurrency(test.price)}</span>
            </div>
          ))}
          {(tests?.data ?? []).length === 0 && (
            <p className="px-3 py-6 text-center text-xs text-muted-foreground">No lab tests available.</p>
          )}
        </div>

        <div className="flex justify-end gap-2.5 border-t pt-4">
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" loading={mutation.isPending}>
            Request tests
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function AddNoteModal({
  open,
  onClose,
  visitId,
}: {
  open: boolean
  onClose: () => void
  visitId: number
}) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [noteType, setNoteType] = useState('general')
  const [content, setContent] = useState('')
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: (payload: MedicalNoteInput) => visitApi.addNote(visitId, payload),
    onSuccess: () => {
      toast.success('Note added')
      queryClient.invalidateQueries({ queryKey: ['visit', visitId] })
      setContent('')
      setError(null)
      onClose()
    },
    onError: (caught) => setError(getErrorMessage(caught, 'Unable to add the note')),
  })

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!content.trim()) {
      setError('Write the note before saving.')
      return
    }
    setError(null)
    mutation.mutate({ note_type: noteType as MedicalNoteInput['note_type'], content: content.trim() })
  }

  return (
    <Modal open={open} onClose={onClose} title="Add note" description="Attaches a timestamped note to this visit">
      <form onSubmit={submit} className="flex flex-col gap-4">
        {error && <Alert tone="danger">{error}</Alert>}
        <FormField label="Note type" htmlFor="note-type">
          <Select id="note-type" value={noteType} onChange={(event) => setNoteType(event.target.value)} options={NOTE_TYPE_OPTIONS} />
        </FormField>
        <FormField label="Content" htmlFor="note-content" required>
          <Textarea id="note-content" rows={5} value={content} onChange={(event) => setContent(event.target.value)} />
        </FormField>
        <div className="flex justify-end gap-2.5 border-t pt-4">
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" loading={mutation.isPending}>
            Add note
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default function VisitDetailPage() {
  const { id } = useParams()
<<<<<<< HEAD
  const navigate = useNavigate()
=======
<<<<<<< HEAD
  const navigate = useNavigate()
=======
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a
  const visitId = Number(id)
  const { hasPermission } = useAuth()

  const [section, setSection] = useState('prescriptions')
  const [vitalsOpen, setVitalsOpen] = useState(false)
  const [rxOpen, setRxOpen] = useState(false)
  const [labOpen, setLabOpen] = useState(false)
  const [noteOpen, setNoteOpen] = useState(false)
<<<<<<< HEAD
=======
<<<<<<< HEAD
=======

>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a
  const { data: visit, isLoading, isError, refetch } = useQuery({
    queryKey: ['visit', visitId],
    queryFn: () => visitApi.get(visitId),
    enabled: Number.isFinite(visitId) && visitId > 0,
  })

  const { data: vitals = [], isLoading: loadingVitals } = useQuery({
    queryKey: ['visit', visitId, 'vitals'],
    queryFn: () => visitApi.vitals(visitId),
    enabled: Boolean(visit),
  })

  const { data: notes = [], isLoading: loadingNotes } = useQuery({
    queryKey: ['visit', visitId, 'notes'],
    queryFn: () => visitApi.notes(visitId),
    enabled: Boolean(visit),
  })

<<<<<<< HEAD
=======
<<<<<<< HEAD
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a
  const { data: timeline = [], isLoading: loadingTimeline } = useQuery({
    queryKey: ['visit', visitId, 'timeline'],
    queryFn: () => visitApi.timeline(visitId),
    enabled: Boolean(visit) && section === 'journey',
  })

  const canViewBilling = hasPermission('billing.view')
  const { data: invoicesData } = useQuery({
    queryKey: ['visit', visitId, 'invoices'],
    queryFn: () => billingApi.invoices({ visit_id: visitId, per_page: 20 }),
    enabled: Boolean(visit) && canViewBilling,
    staleTime: 15_000,
    retry: 0,
  })
  const invoices = invoicesData?.data ?? []

<<<<<<< HEAD
=======
=======
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a
  const canEdit = hasPermission('consultation.edit')
  const canCreateVitals = hasPermission('consultation.create')
  const canPrescribe = hasPermission('prescriptions.create')
  const canRequestLab = hasPermission('lab.request')
  const canAddNote = hasPermission('consultation.create')
<<<<<<< HEAD
=======
<<<<<<< HEAD
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a
  const canBill = hasPermission('billing.invoice.create') || hasPermission('prescriptions.create') || hasPermission('prescriptions.dispense')

  const queryClient = useQueryClient()
  const toast = useToast()
  const refreshVisit = () => {
    queryClient.invalidateQueries({ queryKey: ['visit', visitId] })
    queryClient.invalidateQueries({ queryKey: ['visit', visitId, 'timeline'] })
    queryClient.invalidateQueries({ queryKey: ['visit', visitId, 'invoices'] })
    queryClient.invalidateQueries({ queryKey: ['visits'] })
  }
<<<<<<< HEAD
=======
=======

  const queryClient = useQueryClient()
  const toast = useToast()
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a
  const recordVitals = async (payload: Parameters<typeof visitApi.recordVitals>[1]) => {
    await visitApi.recordVitals(visitId, payload)
    toast.success('Vitals recorded')
    queryClient.invalidateQueries({ queryKey: ['visit', visitId, 'vitals'] })
<<<<<<< HEAD
    refreshVisit()
=======
<<<<<<< HEAD
    refreshVisit()
=======
    queryClient.invalidateQueries({ queryKey: ['visit', visitId] })
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a
  }

  const sectionItems = useMemo(
    () => [
      { value: 'prescriptions', label: 'Prescriptions', icon: <Pill size={14} />, count: visit?.prescriptions.length },
      { value: 'labs', label: 'Lab Requests', icon: <FlaskConical size={14} />, count: visit?.lab_requests.length },
<<<<<<< HEAD
=======
<<<<<<< HEAD
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a
      { value: 'billing', label: 'Billing', icon: <Receipt size={14} />, count: invoices.length },
      { value: 'notes', label: 'Notes', icon: <NotebookPen size={14} />, count: notes.length },
      { value: 'journey', label: 'Journey', icon: <History size={14} /> },
    ],
    [visit, notes.length, invoices.length],
<<<<<<< HEAD
=======
=======
      { value: 'notes', label: 'Notes', icon: <NotebookPen size={14} />, count: notes.length },
    ],
    [visit, notes.length],
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a
  )

  if (isLoading) return <PageLoader label="Loading consultation…" />
  if (isError || !visit) {
    return (
      <EmptyState
        icon={<Stethoscope size={22} />}
        title="Consultation not found"
        description="This visit may have been removed."
        action={<Button variant="outline" onClick={() => void refetch()}>Retry</Button>}
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="print:hidden">
        <PageHeader
          title={`Consultation ${visit.visit_number}`}
<<<<<<< HEAD
          subtitle={`${visit.patient.full_name} · ${formatDate(visit.visit_date)} · ${statusLabel(visit.type)} · ${statusLabel(visit.priority)} priority`}
=======
<<<<<<< HEAD
          subtitle={`${visit.patient.full_name} · ${formatDate(visit.visit_date)} · ${statusLabel(visit.type)} · ${statusLabel(visit.priority)} priority`}
=======
          subtitle={`${visit.patient.full_name} · ${formatDate(visit.visit_date)} · ${statusLabel(visit.type)}`}
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a
          actions={
            <Link
              to="/consultation"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border bg-card px-3.5 text-sm font-medium text-foreground shadow-xs transition-colors hover:bg-muted/60"
            >
              <ArrowLeft size={15} /> All consultations
            </Link>
          }
        />
      </div>

<<<<<<< HEAD
=======
<<<<<<< HEAD
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a
      <WorkflowActions visit={visit} />

      <VisitStepper status={visit.status} />

      {visit.status === 'lab_completed' && (
        <Alert tone="info" title="Lab results are back with the doctor">
          The lab finished its work and sent the results here. Review them, then prescribe — the case stays in your
          consultation, so you can also order a second round of tests.
        </Alert>
      )}
      {(visit.status === 'prescription_created' || visit.status === 'pharmacy_processing') && (
        <Alert tone="info" title="Prescription handed to pharmacy">
          The doctor assigned the medicines. The pharmacist now prepares the bill document (medicine prices + lab
          costs) for the accountant.
        </Alert>
      )}
      {visit.status === 'payment_required' && (
        <Alert tone="warning" title="Waiting on the accountant">
          The bill is ready. The patient pays cash at billing — the accountant records it and approves the payment,
          and only then can pharmacy dispense.
        </Alert>
      )}
      {visit.status === 'payment_approved' && (
        <Alert tone="success" title="Payment approved — ready to dispense">
          The accountant approved payment. Pharmacy can now hand the medicines to the patient.
        </Alert>
      )}

<<<<<<< HEAD
=======
=======
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,300px)_minmax(0,1fr)] xl:grid-cols-[minmax(0,280px)_minmax(0,320px)_minmax(0,1fr)]">
        <PatientSidebar patient={visit.patient} vitals={vitals} />
        <VitalsPanel
          vitals={vitals}
          loading={loadingVitals}
<<<<<<< HEAD
          canRecord={canCreateVitals && !TERMINAL_STATUSES.includes(visit.status)}
=======
<<<<<<< HEAD
          canRecord={canCreateVitals && !TERMINAL_STATUSES.includes(visit.status)}
=======
          canRecord={canCreateVitals && visit.status === 'in_progress'}
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a
          onRecord={() => setVitalsOpen(true)}
        />
        <div className="lg:col-span-2 xl:col-span-1">
          <ClinicalForm
            key={visit.id}
            visit={visit}
<<<<<<< HEAD
            canEdit={canEdit && CONSULT_STATUSES.includes(visit.status)}
=======
<<<<<<< HEAD
            canEdit={canEdit && CONSULT_STATUSES.includes(visit.status)}
=======
            canEdit={canEdit && visit.status === 'in_progress'}
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a
            canComplete={canEdit}
          />
        </div>
      </div>

      <div className="space-y-4 print:hidden">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Tabs items={sectionItems} value={section} onChange={setSection} className="sm:max-w-md" />
          {section === 'prescriptions' && canPrescribe && (
<<<<<<< HEAD
=======
<<<<<<< HEAD
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a
            <Button
              icon={<Plus size={15} />}
              disabled={!DOCTOR_STAGES.includes(visit.status)}
              title={DOCTOR_STAGES.includes(visit.status) ? undefined : 'Prescriptions are written while the case is with the doctor.'}
              onClick={() => setRxOpen(true)}
            >
<<<<<<< HEAD
=======
=======
            <Button icon={<Plus size={15} />} onClick={() => setRxOpen(true)}>
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a
              New Prescription
            </Button>
          )}
          {section === 'labs' && canRequestLab && (
<<<<<<< HEAD
=======
<<<<<<< HEAD
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a
            <Button
              icon={<Plus size={15} />}
              disabled={!DOCTOR_STAGES.includes(visit.status)}
              title={DOCTOR_STAGES.includes(visit.status) ? undefined : 'Lab tests are ordered while the case is with the doctor.'}
              onClick={() => setLabOpen(true)}
            >
<<<<<<< HEAD
=======
=======
            <Button icon={<Plus size={15} />} onClick={() => setLabOpen(true)}>
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a
              Request Lab Tests
            </Button>
          )}
          {section === 'notes' && canAddNote && (
            <Button icon={<Plus size={15} />} onClick={() => setNoteOpen(true)}>
              Add Note
            </Button>
          )}
        </div>

        {section === 'prescriptions' && (
          <Table
            columns={prescriptionColumns}
            data={visit.prescriptions}
<<<<<<< HEAD
            onRowClick={(row) => void navigate(`/prescriptions/${row.id}`)}
            rowKey={(row) => row.id}
=======
<<<<<<< HEAD
            onRowClick={(row) => void navigate(`/prescriptions/${row.id}`)}
            rowKey={(row) => row.id}
=======
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a
            empty={
              <EmptyState
                icon={<Pill size={22} />}
                title="No prescriptions for this visit"
<<<<<<< HEAD
                description={canPrescribe ? 'Create one from the button above — it routes straight to pharmacy.' : undefined}
=======
<<<<<<< HEAD
                description={canPrescribe ? 'Create one from the button above — it routes straight to pharmacy.' : undefined}
=======
                description={canPrescribe ? 'Create one from the button above.' : undefined}
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a
                compact
              />
            }
          />
        )}

        {section === 'labs' && (
          <Table
            columns={labColumns}
            data={visit.lab_requests}
<<<<<<< HEAD
            onRowClick={(row) => void navigate(`/laboratory/requests/${row.id}`)}
            rowKey={(row) => row.id}
=======
<<<<<<< HEAD
            onRowClick={(row) => void navigate(`/laboratory/requests/${row.id}`)}
            rowKey={(row) => row.id}
=======
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a
            empty={<EmptyState icon={<FlaskConical size={22} />} title="No lab requests for this visit" compact />}
          />
        )}

<<<<<<< HEAD
=======
<<<<<<< HEAD
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a
        {section === 'billing' && (
          <div className="space-y-3">
            {invoices.length === 0 ? (
              <EmptyState
                icon={<Receipt size={22} />}
                title="No bill prepared yet"
                description={
                  canBill
                    ? 'Open a prescription and use “Prepare bill” — the pharmacist document with all medicine costs.'
                    : 'The pharmacist prepares the bill once a prescription exists.'
                }
                compact
              />
            ) : (
              <Table
                columns={[
                  { key: 'invoice_number', header: 'Invoice #', render: (row) => <span className="font-mono text-xs">{row.invoice_number}</span> },
                  { key: 'created_at', header: 'Issued', render: (row) => formatDate(row.created_at) },
                  { key: 'total', header: 'Total', align: 'right', render: (row) => formatCurrency(row.total) },
                  { key: 'balance', header: 'Balance', align: 'right', render: (row) => formatCurrency(row.balance) },
                  { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
                ]}
                data={invoices}
                onRowClick={(row) => void navigate(`/billing/invoices/${row.id}`)}
                rowKey={(row) => row.id}
              />
            )}
            <p className="text-xs text-muted-foreground">
              Flow: pharmacist prepares the bill → accountant records the cash and approves it → pharmacy dispenses.
              Dispensing stays blocked until the payment is approved.
            </p>
          </div>
        )}

<<<<<<< HEAD
=======
=======
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a
        {section === 'notes' && (
          <Table
            columns={noteColumns}
            data={notes}
            loading={loadingNotes}
            empty={<EmptyState icon={<NotebookPen size={22} />} title="No notes yet" compact />}
          />
        )}
<<<<<<< HEAD
=======
<<<<<<< HEAD
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a

        {section === 'journey' && (
          <Card>
            <CardHeader>
              <CardTitle>Patient journey</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingTimeline ? (
                <p className="text-sm text-muted-foreground">Loading handoff history…</p>
              ) : (
                <JourneyTimeline entries={timeline} />
              )}
            </CardContent>
          </Card>
        )}
<<<<<<< HEAD
=======
=======
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a
      </div>

      <VitalsForm open={vitalsOpen} onClose={() => setVitalsOpen(false)} onSubmit={recordVitals} title="Record vitals" />
      <PrescriptionBuilder
        open={rxOpen}
        onClose={() => setRxOpen(false)}
        initialPatient={visit.patient}
        visitId={visit.id}
        diagnosis={visit.diagnosis}
<<<<<<< HEAD
=======
<<<<<<< HEAD
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a
        onCreated={() => {
          refreshVisit()
          setSection('prescriptions')
        }}
      />
      <LabRequestModal
        open={labOpen}
        onClose={() => {
          setLabOpen(false)
          refreshVisit()
          setSection('labs')
        }}
        patientId={visit.patient.id}
        visitId={visit.id}
        doctorId={visit.doctor?.id}
<<<<<<< HEAD
=======
=======
      />
      <LabRequestModal
        open={labOpen}
        onClose={() => setLabOpen(false)}
        patientId={visit.patient.id}
        visitId={visit.id}
        doctorId={visit.doctor.id}
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a
      />
      <AddNoteModal open={noteOpen} onClose={() => setNoteOpen(false)} visitId={visit.id} />
    </div>
  )
}
