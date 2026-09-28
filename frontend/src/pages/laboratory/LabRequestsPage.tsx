import { useMemo, useState } from 'react'
<<<<<<< HEAD
import { useNavigate, useSearchParams } from 'react-router-dom'
=======
import { useNavigate } from 'react-router-dom'
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
import { useQuery } from '@tanstack/react-query'
import { FlaskConical, Plus } from 'lucide-react'
import { labApi } from '@/api/lab.api'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { Pagination } from '@/components/ui/Pagination'
import { SearchInput } from '@/components/ui/SearchInput'
import { Select } from '@/components/ui/Select'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Table, type Column } from '@/components/ui/Table'
import { LabRequestForm } from '@/components/modules/diagnostics/LabRequestForm'
import { useClientPagination } from '@/components/modules/diagnostics/useClientPagination'
import { useAuth } from '@/contexts/AuthContext'
import { useDebounce } from '@/hooks'
import type { LabRequest } from '@/types'
import { formatDateTime } from '@/utils/format'

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'requested', label: 'Requested' },
  { value: 'processing', label: 'Processing' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

const PRIORITY_OPTIONS = [
  { value: '', label: 'All priorities' },
  { value: 'routine', label: 'Routine' },
  { value: 'urgent', label: 'Urgent' },
]

export default function LabRequestsPage() {
  const { hasPermission } = useAuth()
  const canRequest = hasPermission('lab.request')
  const navigate = useNavigate()
<<<<<<< HEAD
  const [searchParams] = useSearchParams()

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState(searchParams.get('status') ?? '')
  const [priority, setPriority] = useState(searchParams.get('priority') ?? '')
=======

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [priority, setPriority] = useState('')
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
  const [date, setDate] = useState('')
  const [formOpen, setFormOpen] = useState(false)

  const debouncedSearch = useDebounce(search, 350).trim()
  const listQuery = {
    per_page: 100,
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(status ? { status } : {}),
    ...(date ? { date } : {}),
  }

  const list = useQuery({ queryKey: ['lab-requests', listQuery], queryFn: () => labApi.requests(listQuery) })

  const rows = useMemo(
    () => (list.data?.data ?? []).filter((request) => !priority || request.priority === priority),
    [list.data, priority],
  )
  const { paged, meta, setPage } = useClientPagination(rows)

  const columns: Column<LabRequest>[] = [
    {
      key: 'request_number',
      header: 'Request #',
      render: (request) => <span className="font-medium">{request.request_number}</span>,
    },
    {
      key: 'patient',
      header: 'Patient',
      render: (request) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{request.patient.full_name}</p>
          <p className="truncate text-xs text-muted-foreground">{request.patient.patient_number}</p>
        </div>
      ),
    },
    {
      key: 'doctor',
      header: 'Doctor',
      render: (request) => request.doctor?.name ?? '—',
      hideBelow: 'md',
    },
    {
      key: 'results',
      header: 'Tests',
      render: (request) => {
        const names = request.results.map((result) => result.test_name).join(', ')
        return (
          <span title={names} className="cursor-help">
            {request.results.length} test{request.results.length === 1 ? '' : 's'}
          </span>
        )
      },
    },
    {
      key: 'priority',
      header: 'Priority',
      render: (request) => (
        <Badge tone={request.priority === 'urgent' ? 'danger' : 'neutral'}>{request.priority}</Badge>
      ),
    },
    {
      key: 'requested_at',
      header: 'Requested',
      render: (request) => <span className="whitespace-nowrap">{formatDateTime(request.requested_at)}</span>,
      hideBelow: 'sm',
    },
    { key: 'status', header: 'Status', render: (request) => <StatusBadge status={request.status} /> },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lab requests"
        subtitle="Test queue from order to verified result"
        actions={
          canRequest && (
            <Button icon={<Plus size={16} />} onClick={() => setFormOpen(true)}>
              New lab request
            </Button>
          )
        }
      />

      <div className="flex flex-wrap items-center gap-2.5">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search request or patient…"
          containerClassName="w-full lg:w-72"
        />
        <div className="w-full sm:w-44">
          <Select value={status} onChange={(event) => setStatus(event.target.value)} options={STATUS_OPTIONS} />
        </div>
        <div className="w-full sm:w-44">
          <Select value={priority} onChange={(event) => setPriority(event.target.value)} options={PRIORITY_OPTIONS} />
        </div>
        <input
          type="date"
          aria-label="Filter by requested date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
          className="h-9.5 rounded-lg border border-input bg-card px-3 text-sm text-foreground shadow-xs focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none"
        />
      </div>

      <Table
        columns={columns}
        data={paged}
        loading={list.isLoading}
        rowKey={(row) => row.id}
        onRowClick={(row) => navigate(`/laboratory/requests/${row.id}`)}
        empty={
          <EmptyState
            icon={<FlaskConical size={22} />}
            title="No lab requests found"
            description="Adjust the filters or create a new request."
          />
        }
      />

      <Pagination meta={meta} onPageChange={setPage} disabled={list.isFetching} />

      <LabRequestForm open={formOpen} onClose={() => setFormOpen(false)} />
    </div>
  )
}
