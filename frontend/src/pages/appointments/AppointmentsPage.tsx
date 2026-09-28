import { useMemo, useState, type ReactNode } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarPlus, CalendarDays, PhoneCall, Play, Users } from 'lucide-react'
import { appointmentApi } from '@/api/appointment.api'
import { miscApi } from '@/api/misc.api'
import { getErrorMessage } from '@/api/client'
import { AppointmentForm } from '@/components/modules/clinical/AppointmentForm'
import { APPOINTMENT_STATUS_FILTER_OPTIONS } from '@/components/modules/clinical/constants'
import { Alert } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Dropdown } from '@/components/ui/Dropdown'
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
import { Tabs } from '@/components/ui/Tabs'
import { Textarea } from '@/components/ui/Textarea'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/contexts/AuthContext'
import { useDebounce, usePagination } from '@/hooks'
import { format } from 'date-fns'
import type { Appointment, AppointmentStatus } from '@/types'
import { cn } from '@/utils/cn'
import { formatTime, statusLabel } from '@/utils/format'

const STATUS_ACTIONS: { status: AppointmentStatus; label: string }[] = [
  { status: 'confirmed', label: 'Confirm' },
  { status: 'waiting', label: 'Mark waiting' },
  { status: 'in_progress', label: 'Start' },
  { status: 'completed', label: 'Complete' },
  { status: 'no_show', label: 'No show' },
  { status: 'cancelled', label: 'Cancel with reason…' },
]

const CALLABLE: AppointmentStatus[] = ['pending', 'confirmed', 'waiting']

function queueSort(a: Appointment, b: Appointment): number {
  const left = a.queue_number ?? Number.MAX_SAFE_INTEGER
  const right = b.queue_number ?? Number.MAX_SAFE_INTEGER
  return left - right || a.start_time.localeCompare(b.start_time)
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{label}</span>
      <span className="text-sm text-foreground">{value}</span>
    </div>
  )
}

export default function AppointmentsPage() {
  const queryClient = useQueryClient()
  const toast = useToast()
  const { hasPermission, hasAnyPermission, hasRole } = useAuth()
  const { setPage, resetPage, query } = usePagination()
  const today = useMemo(() => format(new Date(), 'yyyy-MM-dd'), [])

  const [view, setView] = useState('list')
  const [search, setSearch] = useState('')
  const [date, setDate] = useState('')
  const [status, setStatus] = useState('')
  const [doctorId, setDoctorId] = useState('')
  const [bookingOpen, setBookingOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)

  const debouncedSearch = useDebounce(search, 350)
  const canCreate = hasPermission('appointments.create')
  const canUpdate = hasPermission('appointments.edit')
  const canCall = hasAnyPermission('consultation.create', 'appointments.edit') || hasRole('doctor') || hasRole('nurse')

  const params = useMemo(
    () => ({
      ...query,
      search: debouncedSearch.trim() || undefined,
      date: date || undefined,
      status: status || undefined,
      doctor_id: doctorId ? Number(doctorId) : undefined,
    }),
    [query, debouncedSearch, date, status, doctorId],
  )

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['appointments', params],
    queryFn: () => appointmentApi.list(params),
    placeholderData: keepPreviousData,
  })

  const { data: todayList, isLoading: loadingToday } = useQuery({
    queryKey: ['appointments', 'today'],
    queryFn: () => appointmentApi.today(),
    enabled: view === 'queue',
  })

  const { data: doctors } = useQuery({
    queryKey: ['doctors', 'options'],
    queryFn: () => miscApi.doctors.list({ per_page: 100 }),
    staleTime: 5 * 60_000,
    retry: 0,
  })

  const { data: selected } = useQuery({
    queryKey: ['appointment', selectedId],
    queryFn: () => appointmentApi.get(selectedId!),
    enabled: selectedId !== null,
  })

  const callMutation = useMutation({
    mutationFn: (id: number) => appointmentApi.call(id),
    onSuccess: (appointment) => {
      toast.success('Patient called', `${appointment.appointment_number} · queue #${appointment.queue_number ?? '—'}`)
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      if (selectedId) queryClient.invalidateQueries({ queryKey: ['appointment', selectedId] })
    },
    onError: (caught) => toast.error('Unable to call patient', getErrorMessage(caught)),
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, appointmentStatus, reason }: { id: number; appointmentStatus: string; reason?: string }) =>
      appointmentApi.updateStatus(id, { status: appointmentStatus, cancelled_reason: reason }),
    onSuccess: (appointment) => {
      toast.success('Status updated', `${appointment.appointment_number} is now ${statusLabel(appointment.status)}`)
      setCancelTarget(null)
      setCancelReason('')
      setActionError(null)
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      if (selectedId) queryClient.invalidateQueries({ queryKey: ['appointment', selectedId] })
    },
    onError: (caught) => setActionError(getErrorMessage(caught, 'Unable to update status')),
  })

  const requestStatus = (appointment: Appointment, next: AppointmentStatus) => {
    if (next === 'cancelled') {
      setCancelTarget(appointment)
      setCancelReason('')
      setActionError(null)
      return
    }
    statusMutation.mutate({ id: appointment.id, appointmentStatus: next })
  }

  const columns: Column<Appointment>[] = [
    {
      key: 'start_time',
      header: 'Time',
      render: (row) => (
        <span className="flex flex-col">
          <span className="font-medium">{formatTime(row.start_time)}</span>
          <span className="text-[11px] text-muted-foreground">{formatTime(row.end_time)}</span>
        </span>
      ),
    },
    {
      key: 'appointment_number',
      header: 'Number',
      hideBelow: 'md',
      render: (row) => <span className="font-mono text-xs">{row.appointment_number}</span>,
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
    { key: 'doctor', header: 'Doctor', hideBelow: 'lg', render: (row) => row.doctor.name },
    { key: 'department', header: 'Department', hideBelow: 'lg', render: (row) => row.department?.name ?? '—' },
    { key: 'type', header: 'Type', hideBelow: 'sm', render: (row) => <span className="capitalize">{row.type.replace('_', ' ')}</span> },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    {
      key: 'queue_number',
      header: 'Queue #',
      align: 'center',
      hideBelow: 'md',
      render: (row) =>
        row.queue_number != null ? (
          <Badge tone="info">#{row.queue_number}</Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
  ]

  const todayColumns: Column<Appointment>[] = [
    {
      key: 'queue_number',
      header: 'Queue',
      align: 'center',
      width: '80px',
      render: (row) =>
        row.queue_number != null ? <Badge tone="info">#{row.queue_number}</Badge> : <span className="text-muted-foreground">—</span>,
    },
    { key: 'start_time', header: 'Time', render: (row) => formatTime(row.start_time) },
    {
      key: 'patient',
      header: 'Patient',
      render: (row) => (
        <span className="flex flex-col">
          <span className="font-medium text-foreground">{row.patient.full_name}</span>
          <span className="text-[11px] text-muted-foreground">{row.appointment_number}</span>
        </span>
      ),
    },
    { key: 'doctor', header: 'Doctor', hideBelow: 'md', render: (row) => row.doctor.name },
    { key: 'type', header: 'Type', hideBelow: 'lg', render: (row) => <span className="capitalize">{row.type.replace('_', ' ')}</span> },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) => (
        <span className="flex items-center justify-end gap-2">
          {canCall && CALLABLE.includes(row.status) && (
            <Button
              size="sm"
              icon={<Play size={13} />}
              loading={callMutation.isPending && callMutation.variables === row.id}
              onClick={() => callMutation.mutate(row.id)}
            >
              Call
            </Button>
          )}
          {canUpdate && (
            <Dropdown
              align="right"
              trigger={
                <Button variant="outline" size="sm">
                  Status
                </Button>
              }
            >
              {(close) => (
                <div className="flex flex-col">
                  {STATUS_ACTIONS.filter((action) => action.status !== row.status).map((action) => (
                    <button
                      key={action.status}
                      type="button"
                      onClick={() => {
                        close()
                        requestStatus(row, action.status)
                      }}
                      className={cn(
                        'flex cursor-pointer items-center rounded-md px-3 py-2 text-xs transition-colors hover:bg-muted',
                        action.status === 'cancelled' && 'text-destructive',
                      )}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </Dropdown>
          )}
        </span>
      ),
    },
  ]

  const sortedToday = [...(todayList ?? [])].sort(queueSort)
  const nowServing = sortedToday.filter((row) => row.status === 'in_progress').at(-1)
  const waitingCount = sortedToday.filter((row) => row.status === 'waiting').length

  return (
    <div className="space-y-6">
      <PageHeader
        title="Appointments"
        subtitle="Book, confirm and run the daily clinic queue"
        actions={
          canCreate ? (
            <Button icon={<CalendarPlus size={16} />} onClick={() => setBookingOpen(true)}>
              Book Appointment
            </Button>
          ) : undefined
        }
      />

      <Tabs
        items={[
          { value: 'list', label: 'List', icon: <CalendarDays size={14} /> },
          { value: 'queue', label: 'Today / Queue', icon: <PhoneCall size={14} /> },
        ]}
        value={view}
        onChange={setView}
      />

      {view === 'list' ? (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <SearchInput
              value={search}
              onChange={(value) => {
                setSearch(value)
                resetPage()
              }}
              placeholder="Search patient or appointment number…"
              containerClassName="xl:max-w-sm xl:flex-1"
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
              <Button
                variant={date === today ? 'primary' : 'outline'}
                size="md"
                onClick={() => {
                  setDate(date === today ? '' : today)
                  resetPage()
                }}
              >
                Today
              </Button>
              <Select
                aria-label="Filter by status"
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value)
                  resetPage()
                }}
                options={APPOINTMENT_STATUS_FILTER_OPTIONS}
                className="w-44"
              />
              <Select
                aria-label="Filter by doctor"
                value={doctorId}
                onChange={(event) => {
                  setDoctorId(event.target.value)
                  resetPage()
                }}
                options={[
                  { value: '', label: 'All doctors' },
                  ...(doctors?.data ?? []).map((doctor) => ({ value: doctor.id, label: doctor.name })),
                ]}
                className="w-48"
              />
            </div>
          </div>

          <Table
            columns={columns}
            data={data?.data ?? []}
            loading={isLoading}
            onRowClick={(row) => {
              setActionError(null)
              setSelectedId(row.id)
            }}
            rowKey={(row) => row.id}
            empty={
              <EmptyState
                icon={<CalendarDays size={22} />}
                title="No appointments found"
                description="Change the filters or book a new appointment."
              />
            }
          />

          {data && <Pagination meta={data.meta} onPageChange={setPage} disabled={isFetching} />}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border bg-card p-4 shadow-xs">
              <p className="text-xs text-muted-foreground">Now serving</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
                {nowServing ? `#${nowServing.queue_number ?? '—'}` : '—'}
              </p>
            </div>
            <div className="rounded-xl border bg-card p-4 shadow-xs">
              <p className="text-xs text-muted-foreground">Waiting</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">{waitingCount}</p>
            </div>
            <div className="rounded-xl border bg-card p-4 shadow-xs">
              <p className="text-xs text-muted-foreground">Today's appointments</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">{sortedToday.length}</p>
            </div>
          </div>

          <Table
            columns={todayColumns}
            data={sortedToday}
            loading={loadingToday}
            onRowClick={(row) => {
              setActionError(null)
              setSelectedId(row.id)
            }}
            rowKey={(row) => row.id}
            empty={<EmptyState icon={<Users size={22} />} title="No appointments scheduled today" />}
          />
        </div>
      )}

      <Modal
        open={selectedId !== null}
          onClose={() => {
            setSelectedId(null)
            setActionError(null)
          }}
          size="lg"
        title={selected ? `Appointment ${selected.appointment_number}` : 'Appointment'}
        description={selected ? `${selected.patient.full_name} · ${selected.appointment_date}` : undefined}
      >
        {!selected ? (
          <p className="text-sm text-muted-foreground">Loading appointment…</p>
        ) : (
          <div className="flex flex-col gap-5">
            {actionError && <Alert tone="danger">{actionError}</Alert>}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <DetailRow label="Status" value={<StatusBadge status={selected.status} />} />
              <DetailRow label="Time" value={`${formatTime(selected.start_time)} – ${formatTime(selected.end_time)}`} />
              <DetailRow label="Queue #" value={selected.queue_number != null ? `#${selected.queue_number}` : '—'} />
              <DetailRow label="Doctor" value={selected.doctor.name} />
              <DetailRow label="Department" value={selected.department?.name ?? '—'} />
              <DetailRow label="Type" value={statusLabel(selected.type)} />
              <DetailRow label="Patient" value={selected.patient.full_name} />
              <DetailRow label="Patient #" value={selected.patient.patient_number} />
              <DetailRow label="Phone" value={selected.patient.phone} />
              <DetailRow label="Reason" value={selected.reason || '—'} />
              <DetailRow label="Notes" value={selected.notes || '—'} />
              <DetailRow label="Cancelled reason" value={selected.cancelled_reason || '—'} />
            </div>

            {canUpdate && (
              <div className="flex flex-wrap items-center gap-2 border-t pt-4">
                <span className="mr-auto text-xs font-medium text-muted-foreground">Change status</span>
                {STATUS_ACTIONS.filter((action) => action.status !== selected.status).map((action) => (
                  <Button
                    key={action.status}
                    variant={action.status === 'cancelled' ? 'destructive' : 'outline'}
                    size="sm"
                    disabled={statusMutation.isPending}
                    onClick={() => requestStatus(selected, action.status)}
                  >
                    {action.label.replace('…', '')}
                  </Button>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal
        open={cancelTarget !== null}
        onClose={() => setCancelTarget(null)}
        size="sm"
        title="Cancel appointment"
        description={cancelTarget ? `${cancelTarget.appointment_number} · ${cancelTarget.patient.full_name}` : undefined}
      >
        <div className="flex flex-col gap-4">
          {actionError && <Alert tone="danger">{actionError}</Alert>}
          <FormField label="Reason for cancellation" htmlFor="cancel-reason" required>
            <Textarea
              id="cancel-reason"
              rows={3}
              value={cancelReason}
              onChange={(event) => setCancelReason(event.target.value)}
              placeholder="e.g. Patient asked to reschedule"
            />
          </FormField>
          <div className="flex justify-end gap-2.5">
            <Button variant="outline" onClick={() => setCancelTarget(null)} disabled={statusMutation.isPending}>
              Keep appointment
            </Button>
            <Button
              variant="destructive"
              loading={statusMutation.isPending}
              disabled={cancelReason.trim().length === 0}
              onClick={() =>
                cancelTarget &&
                statusMutation.mutate({
                  id: cancelTarget.id,
                  appointmentStatus: 'cancelled',
                  reason: cancelReason.trim(),
                })
              }
            >
              Cancel appointment
            </Button>
          </div>
        </div>
      </Modal>

      <AppointmentForm open={bookingOpen} onClose={() => setBookingOpen(false)} />
    </div>
  )
}
