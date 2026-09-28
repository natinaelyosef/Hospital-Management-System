import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import { Activity, ClipboardList, FileText, Heart, Trash2, Upload, Users } from 'lucide-react'
import { getErrorMessage } from '@/api/client'
import { patientApi } from '@/api/patient.api'
import { Can } from '@/components/auth/Can'
import { IntakeModal } from '@/components/modules/clinical/IntakeModal'
import { PatientFormModal } from '@/components/modules/clinical/PatientFormModal'
import { PatientHeader } from '@/components/modules/clinical/PatientHeader'
import { PatientQrCard } from '@/components/modules/clinical/PatientQrCard'
import { VitalsForm } from '@/components/modules/clinical/VitalsForm'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { PageLoader } from '@/components/ui/Spinner'
import { Pagination } from '@/components/ui/Pagination'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Table, type Column } from '@/components/ui/Table'
import { Tabs } from '@/components/ui/Tabs'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/contexts/AuthContext'
import { useConfirm } from '@/hooks'
import type { Appointment, Invoice, PatientDocument, Prescription, VitalSign, VitalSignInput, Visit } from '@/types'
import { formatCurrency, formatDate, formatDateTime } from '@/utils/format'

const TAB_ITEMS = [
  { value: 'overview', label: 'Overview' },
  { value: 'appointments', label: 'Appointments' },
  { value: 'visits', label: 'Visits' },
  { value: 'prescriptions', label: 'Prescriptions' },
  { value: 'bills', label: 'Bills' },
  { value: 'documents', label: 'Documents' },
  { value: 'vitals', label: 'Vitals' },
]

const appointmentColumns: Column<Appointment>[] = [
  { key: 'appointment_number', header: 'Number', render: (row) => <span className="font-mono text-xs">{row.appointment_number}</span> },
  { key: 'appointment_date', header: 'Date', render: (row) => formatDate(row.appointment_date) },
  { key: 'start_time', header: 'Time', render: (row) => row.start_time.slice(0, 5) },
  { key: 'doctor', header: 'Doctor', hideBelow: 'md', render: (row) => row.doctor?.name ?? <span className="text-muted-foreground">Unassigned</span> },
  { key: 'type', header: 'Type', hideBelow: 'lg', render: (row) => <span className="capitalize">{row.type.replace('_', ' ')}</span> },
  { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
]

const visitColumns: Column<Visit>[] = [
  { key: 'visit_number', header: 'Visit #', render: (row) => <span className="font-mono text-xs">{row.visit_number}</span> },
  { key: 'visit_date', header: 'Date', render: (row) => formatDate(row.visit_date) },
  { key: 'doctor', header: 'Doctor', hideBelow: 'md', render: (row) => row.doctor?.name ?? <span className="text-muted-foreground">Unassigned</span> },
  { key: 'diagnosis', header: 'Diagnosis', hideBelow: 'lg', render: (row) => <span className="line-clamp-1">{row.diagnosis || '—'}</span> },
  { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
]

const prescriptionColumns: Column<Prescription>[] = [
  { key: 'prescription_number', header: 'RX #', render: (row) => <span className="font-mono text-xs">{row.prescription_number}</span> },
  { key: 'created_at', header: 'Date', render: (row) => formatDate(row.created_at) },
  { key: 'doctor', header: 'Doctor', hideBelow: 'md', render: (row) => row.doctor?.name ?? <span className="text-muted-foreground">Unassigned</span> },
  { key: 'items', header: 'Items', render: (row) => row.items.length },
  { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
]

const invoiceColumns: Column<Invoice>[] = [
  { key: 'invoice_number', header: 'Invoice #', render: (row) => <span className="font-mono text-xs">{row.invoice_number}</span> },
  { key: 'created_at', header: 'Issued', render: (row) => formatDate(row.created_at) },
  { key: 'total', header: 'Total', align: 'right', render: (row) => formatCurrency(row.total) },
  { key: 'paid_amount', header: 'Paid', align: 'right', hideBelow: 'sm', render: (row) => formatCurrency(row.paid_amount) },
  { key: 'balance', header: 'Balance', align: 'right', render: (row) => formatCurrency(row.balance) },
  { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
]

const vitalColumns: Column<VitalSign>[] = [
  { key: 'recorded_at', header: 'Recorded', render: (row) => formatDateTime(row.recorded_at) },
  {
    key: 'bp',
    header: 'BP',
    render: (row) =>
      row.bp_systolic != null && row.bp_diastolic != null ? `${row.bp_systolic}/${row.bp_diastolic}` : '—',
  },
  { key: 'temperature', header: 'Temp °C', hideBelow: 'sm', render: (row) => row.temperature ?? '—' },
  { key: 'pulse', header: 'Pulse', hideBelow: 'sm', render: (row) => row.pulse ?? '—' },
  { key: 'oxygen_saturation', header: 'SpO₂', hideBelow: 'md', render: (row) => (row.oxygen_saturation != null ? `${row.oxygen_saturation}%` : '—') },
  { key: 'weight', header: 'Weight', hideBelow: 'md', render: (row) => (row.weight != null ? `${row.weight} kg` : '—') },
  { key: 'height', header: 'Height', hideBelow: 'lg', render: (row) => (row.height != null ? `${row.height} cm` : '—') },
  { key: 'respiratory_rate', header: 'RR', hideBelow: 'lg', render: (row) => row.respiratory_rate ?? '—' },
  { key: 'recorded_by_name', header: 'Recorded by', hideBelow: 'lg' },
]

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{label}</span>
      <span className="text-sm text-foreground">{value || '—'}</span>
    </div>
  )
}

export default function PatientDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const patientId = Number(id)
  const queryClient = useQueryClient()
  const toast = useToast()
  const confirm = useConfirm()
  const { hasPermission } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [tab, setTab] = useState('overview')
  const [page, setPage] = useState(1)
  const [editOpen, setEditOpen] = useState(false)
  const [vitalsOpen, setVitalsOpen] = useState(false)
  const [intakeOpen, setIntakeOpen] = useState(false)
  const [uploading, setUploading] = useState(false)

  useEffect(() => setPage(1), [tab])

  const { data: patient, isLoading, isError, refetch } = useQuery({
    queryKey: ['patient', patientId],
    queryFn: () => patientApi.get(patientId),
    enabled: Number.isFinite(patientId) && patientId > 0,
  })

  const { data: appointments } = useQuery({
    queryKey: ['patient', patientId, 'appointments', page],
    queryFn: () => patientApi.appointments(patientId, { page, per_page: 10 }),
    enabled: tab === 'appointments' && Boolean(patient),
    placeholderData: keepPreviousData,
  })

  const { data: visits } = useQuery({
    queryKey: ['patient', patientId, 'visits', page],
    queryFn: () => patientApi.visits(patientId, { page, per_page: 10 }),
    enabled: tab === 'visits' && Boolean(patient),
    placeholderData: keepPreviousData,
  })

  const { data: prescriptions } = useQuery({
    queryKey: ['patient', patientId, 'prescriptions', page],
    queryFn: () => patientApi.prescriptions(patientId, { page, per_page: 10 }),
    enabled: tab === 'prescriptions' && Boolean(patient),
    placeholderData: keepPreviousData,
  })

  const { data: invoices } = useQuery({
    queryKey: ['patient', patientId, 'invoices', page],
    queryFn: () => patientApi.invoices(patientId, { page, per_page: 10 }),
    enabled: tab === 'bills' && Boolean(patient),
    placeholderData: keepPreviousData,
  })

  const { data: documents, isLoading: loadingDocuments } = useQuery({
    queryKey: ['patient', patientId, 'documents', page],
    queryFn: () => patientApi.documents(patientId, { page, per_page: 10 }),
    enabled: tab === 'documents' && Boolean(patient),
    placeholderData: keepPreviousData,
  })

  const { data: vitals, isLoading: loadingVitals } = useQuery({
    queryKey: ['patient', patientId, 'vitals', page],
    queryFn: () => patientApi.vitals(patientId, { page, per_page: 10 }),
    enabled: tab === 'vitals' && Boolean(patient),
    placeholderData: keepPreviousData,
  })

  const canEdit = hasPermission('patients.edit')
  const canDocuments = hasPermission('patients.documents')
  const canRecordVitals = hasPermission('consultation.create')

  const uploadFile = async (file: File) => {
    setUploading(true)
    try {
      await patientApi.uploadDocument(patientId, file)
      toast.success('Document uploaded', file.name)
      queryClient.invalidateQueries({ queryKey: ['patient', patientId, 'documents'] })
    } catch (caught) {
      toast.error('Upload failed', getErrorMessage(caught))
    } finally {
      setUploading(false)
    }
  }

  const deleteDocument = async (document: PatientDocument) => {
    const approved = await confirm({
      title: 'Delete document?',
      message: `${document.name} will be permanently removed from this patient's record.`,
      confirmLabel: 'Delete',
      tone: 'destructive',
    })
    if (!approved) return
    try {
      await patientApi.removeDocument(document.id)
      toast.success('Document deleted')
      queryClient.invalidateQueries({ queryKey: ['patient', patientId, 'documents'] })
    } catch (caught) {
      toast.error('Unable to delete document', getErrorMessage(caught))
    }
  }

  const recordVitals = async (payload: VitalSignInput) => {
    await patientApi.recordVitals(patientId, payload)
    toast.success('Vitals recorded')
    queryClient.invalidateQueries({ queryKey: ['patient', patientId, 'vitals'] })
  }

  if (isLoading) return <PageLoader label="Loading patient record…" />
  if (isError || !patient) {
    return (
      <EmptyState
        icon={<Users size={22} />}
        title="Patient not found"
        description="This record may have been removed."
        action={<Button variant="outline" onClick={() => void refetch()}>Retry</Button>}
      />
    )
  }

  const documentColumns: Column<PatientDocument>[] = [
    {
      key: 'name',
      header: 'Document',
      render: (document) => (
        <span className="flex items-center gap-2">
          <FileText size={14} className="text-muted-foreground" />
          <span className="truncate font-medium">{document.name}</span>
        </span>
      ),
    },
    { key: 'file_name', header: 'File', hideBelow: 'md', render: (document) => <span className="truncate text-muted-foreground">{document.file_name}</span> },
    { key: 'size', header: 'Size', hideBelow: 'sm', render: (document) => formatSize(document.size) },
    { key: 'created_at', header: 'Uploaded', hideBelow: 'lg', render: (document) => formatDateTime(document.created_at) },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (document) =>
        canDocuments ? (
          <Button
            variant="ghost"
            size="sm"
            aria-label="Delete document"
            icon={<Trash2 size={14} />}
            onClick={() => void deleteDocument(document)}
          />
        ) : null,
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title={patient.full_name}
        subtitle={`${patient.patient_number} · registered ${formatDate(patient.created_at)}`}
        actions={
          <Can permission="patients.create">
            <Button variant="outline" icon={<ClipboardList size={15} />} onClick={() => setIntakeOpen(true)}>
              Record intake
            </Button>
          </Can>
        }
      />
      <PatientHeader patient={patient} onEdit={canEdit ? () => setEditOpen(true) : undefined} />

      <Tabs items={TAB_ITEMS} value={tab} onChange={setTab} />

      {tab === 'overview' && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Demographics</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <InfoItem label="Patient number" value={patient.patient_number} />
              <InfoItem label="Gender" value={patient.gender} />
              <InfoItem label="Date of birth" value={`${formatDate(patient.date_of_birth)} (${patient.age} yrs)`} />
              <InfoItem label="Blood group" value={patient.blood_group ?? 'Not known'} />
              <InfoItem label="Phone" value={patient.phone} />
              <InfoItem label="Email" value={patient.email ?? ''} />
              <InfoItem label="Address" value={patient.address} />
              <InfoItem
                label="Emergency contact"
                value={
                  patient.emergency_contact_name
                    ? `${patient.emergency_contact_name}${patient.emergency_contact_phone ? ` · ${patient.emergency_contact_phone}` : ''}`
                    : ''
                }
              />
            </CardContent>
          </Card>

          <div className="flex flex-col gap-5">
          <PatientQrCard patient={patient} />
          <Card>
            <CardHeader>
              <CardTitle>Medical history</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Allergies</span>
                {patient.allergies ? (
                  <Badge tone="danger">{patient.allergies}</Badge>
                ) : (
                  <span className="text-sm text-muted-foreground">No known allergies</span>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">History</span>
                <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">
                  {patient.medical_history || 'No recorded medical history.'}
                </p>
              </div>
            </CardContent>
          </Card>
          </div>
        </div>
      )}

      {tab === 'appointments' && (
        <div className="space-y-4">
          <Table
            columns={appointmentColumns}
            data={appointments?.data ?? []}
            empty={<EmptyState icon={<FileText size={22} />} title="No appointments yet" compact />}
          />
          {appointments && <Pagination meta={appointments.meta} onPageChange={setPage} />}
        </div>
      )}

      {tab === 'visits' && (
        <div className="space-y-4">
          <Table
            columns={visitColumns}
            data={visits?.data ?? []}
            onRowClick={(row) => void navigate(`/consultation/${row.id}`)}
            rowKey={(row) => row.id}
            empty={<EmptyState icon={<Heart size={22} />} title="No consultations yet" compact />}
          />
          {visits && <Pagination meta={visits.meta} onPageChange={setPage} />}
        </div>
      )}

      {tab === 'prescriptions' && (
        <div className="space-y-4">
          <Table
            columns={prescriptionColumns}
            data={prescriptions?.data ?? []}
            onRowClick={(row) => void navigate(`/prescriptions/${row.id}`)}
            rowKey={(row) => row.id}
            empty={<EmptyState icon={<FileText size={22} />} title="No prescriptions yet" compact />}
          />
          {prescriptions && <Pagination meta={prescriptions.meta} onPageChange={setPage} />}
        </div>
      )}

      {tab === 'bills' && (
        <div className="space-y-4">
          <Table
            columns={invoiceColumns}
            data={invoices?.data ?? []}
            onRowClick={(row) => void navigate(`/billing/invoices/${row.id}`)}
            rowKey={(row) => row.id}
            empty={<EmptyState icon={<FileText size={22} />} title="No invoices yet" compact />}
          />
          {invoices && <Pagination meta={invoices.meta} onPageChange={setPage} />}
        </div>
      )}

      {tab === 'documents' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">Accepted formats: PDF, JPG and PNG.</p>
            {canDocuments && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    event.target.value = ''
                    if (file) void uploadFile(file)
                  }}
                />
                <Button
                  variant="outline"
                  loading={uploading}
                  icon={<Upload size={15} />}
                  onClick={() => fileInputRef.current?.click()}
                >
                  Upload document
                </Button>
              </>
            )}
          </div>
          <Table
            columns={documentColumns}
            data={documents?.data ?? []}
            loading={loadingDocuments}
            empty={<EmptyState icon={<FileText size={22} />} title="No documents uploaded" compact />}
          />
          {documents && <Pagination meta={documents.meta} onPageChange={setPage} disabled={uploading} />}
        </div>
      )}

      {tab === 'vitals' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">Most recent measurements first.</p>
            {canRecordVitals && (
              <Button variant="outline" icon={<Activity size={15} />} onClick={() => setVitalsOpen(true)}>
                Record Vitals
              </Button>
            )}
          </div>
          <Table
            columns={vitalColumns}
            data={vitals?.data ?? []}
            loading={loadingVitals}
            empty={<EmptyState icon={<Activity size={22} />} title="No vitals recorded" compact />}
          />
          {vitals && <Pagination meta={vitals.meta} onPageChange={setPage} />}
        </div>
      )}

      <PatientFormModal open={editOpen} onClose={() => setEditOpen(false)} patient={patient} />
      <IntakeModal open={intakeOpen} onClose={() => setIntakeOpen(false)} patientId={patient.id} />
      <VitalsForm open={vitalsOpen} onClose={() => setVitalsOpen(false)} onSubmit={recordVitals} title="Record vitals" />
    </div>
  )
}
