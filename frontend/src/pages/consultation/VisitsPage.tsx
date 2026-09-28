import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ClipboardList, Stethoscope } from 'lucide-react'
import { getFieldErrors, getErrorMessage } from '@/api/client'
import { miscApi } from '@/api/misc.api'
import { visitApi, type VisitInput } from '@/api/visit.api'
import { IntakeModal } from '@/components/modules/clinical/IntakeModal'
import { PatientPicker } from '@/components/modules/clinical/PatientPicker'
import { VISIT_STATUS_FILTER_OPTIONS, VISIT_TYPE_OPTIONS } from '@/components/modules/clinical/constants'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/ui/PageHeader'
import { Pagination } from '@/components/ui/Pagination'
import { SearchInput } from '@/components/ui/SearchInput'
import { Select } from '@/components/ui/Select'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Table, type Column } from '@/components/ui/Table'
import { Textarea } from '@/components/ui/Textarea'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/contexts/AuthContext'
import { useDebounce, usePagination } from '@/hooks'
import type { Patient, Visit } from '@/types'
import { formatDate } from '@/utils/format'

const columns: Column<Visit>[] = [
  {
    key: 'visit_number',
    header: 'Visit #',
    render: (row) => <span className="font-mono text-xs font-semibold text-primary">{row.visit_number}</span>,
  },
  {
    key: 'patient',
    header: 'Patient',
    render: (row) => (
      <span className="flex flex-col">
        <span className="font-medium text-foreground">{row.patient.full_name}</span>
        <span className="text-[11px] text-muted-foreground">{row.patient.patient_number}</span>
      </span>
    ),
  },
  { key: 'doctor', header: 'Doctor', hideBelow: 'md', render: (row) => row.doctor?.name ?? <span className="text-muted-foreground">Unassigned</span> },
  { key: 'visit_date', header: 'Date', hideBelow: 'sm', render: (row) => formatDate(row.visit_date) },
  {
    key: 'priority',
    header: 'Priority',
    hideBelow: 'lg',
    render: (row) => <StatusBadge status={row.priority} />,
  },
  {
    key: 'diagnosis',
    header: 'Diagnosis',
    hideBelow: 'lg',
    render: (row) => <span className="line-clamp-1 max-w-64">{row.diagnosis || '—'}</span>,
  },
  { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
]

interface NewVisitModalProps {
  open: boolean
  onClose: () => void
}

function NewVisitModal({ open, onClose }: NewVisitModalProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const toast = useToast()
  const { user } = useAuth()
  const defaultDoctorId = user?.doctor_id ? String(user.doctor_id) : ''

  const [patient, setPatient] = useState<Patient | null>(null)
  const [doctorId, setDoctorId] = useState(defaultDoctorId)
  const [type, setType] = useState('opd')
  const [chiefComplaint, setChiefComplaint] = useState('')
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [formError, setFormError] = useState<string | null>(null)

  const { data: doctors } = useQuery({
    queryKey: ['doctors', 'options'],
    queryFn: () => miscApi.doctors.list({ per_page: 100 }),
    staleTime: 5 * 60_000,
    retry: 0,
  })

  const mutation = useMutation({
    mutationFn: (payload: VisitInput) => visitApi.create(payload),
    onSuccess: (visit) => {
      toast.success('Consultation started', visit.visit_number)
      queryClient.invalidateQueries({ queryKey: ['visits'] })
      onClose()
      void navigate(`/consultation/${visit.id}`)
    },
    onError: (caught) => {
      const fieldErrors = getFieldErrors(caught)
      setErrors(fieldErrors)
      setFormError(Object.keys(fieldErrors).length === 0 ? getErrorMessage(caught, 'Unable to start consultation') : null)
    },
  })

  const reset = () => {
    setPatient(null)
    setDoctorId(defaultDoctorId)
    setType('opd')
    setChiefComplaint('')
    setErrors({})
    setFormError(null)
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    const local: Record<string, string[]> = {}
    if (!patient) local.patient_id = ['Select a patient']
    if (!chiefComplaint.trim()) local.chief_complaint = ['Describe the chief complaint']
    setErrors(local)
    setFormError(null)
    if (Object.keys(local).length > 0 || !patient) return

    mutation.mutate({
      patient_id: patient.id,
      doctor_id: doctorId ? Number(doctorId) : undefined,
      type,
      chief_complaint: chiefComplaint.trim(),
    })
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        reset()
        onClose()
      }}
      size="lg"
      title="New consultation"
      description="Start a visit — it opens right after it is created"
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {formError && <Alert tone="danger">{formError}</Alert>}

        <FormField label="Patient" required error={errors.patient_id?.[0]}>
          <PatientPicker
            value={patient}
            onChange={setPatient}
            error={errors.patient_id?.[0]}
          />
        </FormField>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Doctor" htmlFor="visit-doctor" required error={errors.doctor_id?.[0]}>
            <Select
              id="visit-doctor"
              value={doctorId}
              onChange={(event) => setDoctorId(event.target.value)}
              options={(doctors?.data ?? []).map((doctor) => ({ value: doctor.id, label: doctor.name }))}
              placeholder="Select doctor"
              invalid={Boolean(errors.doctor_id?.[0])}
            />
          </FormField>
          <FormField label="Visit type" htmlFor="visit-type" error={errors.type?.[0]}>
            <Select id="visit-type" value={type} onChange={(event) => setType(event.target.value)} options={VISIT_TYPE_OPTIONS} />
          </FormField>
        </div>

        <FormField label="Chief complaint" htmlFor="visit-complaint" required error={errors.chief_complaint?.[0]}>
          <Textarea
            id="visit-complaint"
            rows={3}
            value={chiefComplaint}
            onChange={(event) => setChiefComplaint(event.target.value)}
            invalid={Boolean(errors.chief_complaint?.[0])}
            placeholder="Why is the patient presenting today?"
          />
        </FormField>

        <div className="flex justify-end gap-2.5 border-t pt-4">
          <Button
            variant="outline"
            disabled={mutation.isPending}
            onClick={() => {
              reset()
              onClose()
            }}
          >
            Cancel
          </Button>
          <Button type="submit" loading={mutation.isPending}>
            Start consultation
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default function VisitsPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { hasPermission, hasRole, user } = useAuth()
  const { setPage, resetPage, query } = usePagination()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState(searchParams.get('status') ?? '')
  const [date, setDate] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [intakeOpen, setIntakeOpen] = useState(false)
  const debouncedSearch = useDebounce(search, 350)

  // Deep links from dashboards / notifications (e.g. ?status=waiting_for_doctor)
  // and the post-registration handoff (?openIntake=1) stay in sync with the UI.
  useEffect(() => {
    const nextStatus = searchParams.get('status') ?? ''
    setStatus((current) => (current === nextStatus ? current : nextStatus))
    if (searchParams.get('openIntake') === '1') {
      setIntakeOpen(true)
      searchParams.delete('openIntake')
      setSearchParams(searchParams, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const params = useMemo(
    () => ({
      ...query,
      search: debouncedSearch.trim() || undefined,
      status: status || undefined,
      date: date || undefined,
    }),
    [query, debouncedSearch, status, date],
  )

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['visits', params],
    queryFn: () => visitApi.list(params),
    placeholderData: keepPreviousData,
  })

  const canCreate = hasPermission('consultation.create')
  const canIntake = hasPermission('patients.create') || hasRole('patient')
  const intakePatientId = hasRole('patient') && !hasPermission('patients.create') ? (user?.patient_id ?? undefined) : undefined

  return (
    <div className="space-y-6">
      <PageHeader
        title="Consultations"
        subtitle="Track every visit from intake to completion"
        actions={
          <span className="flex flex-wrap items-center gap-2.5">
            {canIntake && (
              <Button variant="outline" icon={<ClipboardList size={16} />} onClick={() => setIntakeOpen(true)}>
                Record Intake
              </Button>
            )}
            {canCreate ? (
              <Button icon={<Stethoscope size={16} />} onClick={() => setModalOpen(true)}>
                New Consultation
              </Button>
            ) : undefined}
          </span>
        }
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <SearchInput
          value={search}
          onChange={(value) => {
            setSearch(value)
            resetPage()
          }}
          placeholder="Search visit number, patient or diagnosis…"
          containerClassName="lg:max-w-sm lg:flex-1"
        />
        <div className="flex flex-wrap items-center gap-2.5">
          <Input
            type="date"
            aria-label="Filter by date"
            value={date}
            onChange={(event) => {
              setDate(event.target.value)
              resetPage()
            }}
            className="w-40"
          />
          <Select
            aria-label="Filter by status"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value)
              resetPage()
            }}
            options={VISIT_STATUS_FILTER_OPTIONS}
            className="w-44"
          />
        </div>
      </div>

      <Table
        columns={columns}
        data={data?.data ?? []}
        loading={isLoading}
        onRowClick={(row) => void navigate(`/consultation/${row.id}`)}
        rowKey={(row) => row.id}
        empty={
          <EmptyState
            icon={<Stethoscope size={22} />}
            title="No consultations found"
            description="Adjust the filters or start a new consultation."
          />
        }
      />

      {data && <Pagination meta={data.meta} onPageChange={setPage} disabled={isFetching} />}

      <NewVisitModal open={modalOpen} onClose={() => setModalOpen(false)} />
      <IntakeModal open={intakeOpen} onClose={() => setIntakeOpen(false)} patientId={intakePatientId} />
    </div>
  )
}
