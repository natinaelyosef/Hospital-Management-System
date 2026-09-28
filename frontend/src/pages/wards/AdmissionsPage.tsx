import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Plus, Users } from 'lucide-react'
import { wardApi } from '@/api/ward.api'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { Pagination } from '@/components/ui/Pagination'
import { SearchInput } from '@/components/ui/SearchInput'
import { Select } from '@/components/ui/Select'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Table, type Column } from '@/components/ui/Table'
import { AdmissionForm } from '@/components/modules/diagnostics/AdmissionForm'
import { useAuth } from '@/contexts/AuthContext'
import { useDebounce, usePagination } from '@/hooks'
import type { Admission } from '@/types'
import { formatDateTime } from '@/utils/format'

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'admitted', label: 'Admitted' },
  { value: 'transferred', label: 'Transferred' },
  { value: 'discharged', label: 'Discharged' },
]

export default function AdmissionsPage() {
  const { hasPermission } = useAuth()
  const canAdmit = hasPermission('wards.admit')
  const navigate = useNavigate()
  const { page, perPage, setPage, resetPage } = usePagination()

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [wardId, setWardId] = useState('')
  const [formOpen, setFormOpen] = useState(false)

  const debouncedSearch = useDebounce(search, 350).trim()
  const listQuery = {
    page,
    per_page: perPage,
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(status ? { status } : {}),
    ...(wardId ? { ward_id: Number(wardId) } : {}),
  }

  const list = useQuery({ queryKey: ['admissions', listQuery], queryFn: () => wardApi.admissions(listQuery) })
  const wards = useQuery({ queryKey: ['wards', { per_page: 100 }], queryFn: () => wardApi.wards({ per_page: 100 }) })

  const columns: Column<Admission>[] = [
    {
      key: 'admission_number',
      header: 'Admission #',
      render: (admission) => <span className="font-medium">{admission.admission_number}</span>,
    },
    {
      key: 'patient',
      header: 'Patient',
      render: (admission) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{admission.patient.full_name}</p>
          <p className="truncate text-xs text-muted-foreground">{admission.patient.patient_number}</p>
        </div>
      ),
    },
    {
      key: 'location',
      header: 'Ward / Room / Bed',
      render: (admission) => (
        <span>
          {admission.ward?.name ?? '—'} · {admission.room?.room_number ?? '—'} · {admission.bed?.bed_number ?? '—'}
        </span>
      ),
    },
    {
      key: 'consultant',
      header: 'Consultant',
      render: (admission) => admission.consultant?.name ?? '—',
      hideBelow: 'md',
    },
    {
      key: 'admitted_at',
      header: 'Admitted at',
      render: (admission) => <span className="whitespace-nowrap">{formatDateTime(admission.admitted_at)}</span>,
      hideBelow: 'sm',
    },
    {
      key: 'total_days',
      header: 'Days',
      align: 'right',
      render: (admission) => <span className="tabular-nums">{admission.total_days}</span>,
    },
    { key: 'status', header: 'Status', render: (admission) => <StatusBadge status={admission.status} /> },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admissions"
        subtitle="Inpatient stays across all wards"
        actions={
          canAdmit && (
            <Button icon={<Plus size={16} />} onClick={() => setFormOpen(true)}>
              New admission
            </Button>
          )
        }
      />

      <div className="flex flex-wrap items-center gap-2.5">
        <SearchInput
          value={search}
          onChange={(value) => {
            setSearch(value)
            resetPage()
          }}
          placeholder="Search admission or patient…"
          containerClassName="w-full lg:w-72"
        />
        <div className="w-full sm:w-44">
          <Select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value)
              resetPage()
            }}
            options={STATUS_OPTIONS}
          />
        </div>
        <div className="w-full sm:w-52">
          <Select
            value={wardId}
            onChange={(event) => {
              setWardId(event.target.value)
              resetPage()
            }}
            options={[
              { value: '', label: 'All wards' },
              ...(wards.data?.data ?? []).map((ward) => ({ value: String(ward.id), label: ward.name })),
            ]}
          />
        </div>
      </div>

      <Table
        columns={columns}
        data={list.data?.data ?? []}
        loading={list.isLoading}
        rowKey={(row) => row.id}
        onRowClick={(row) => navigate(`/wards/admissions/${row.id}`)}
        empty={
          list.isError ? (
            <EmptyState
              icon={<Users size={22} />}
              title="Unable to load admissions"
              description="Your account may not have permission to view admissions."
            />
          ) : (
            <EmptyState
              icon={<Users size={22} />}
              title="No admissions found"
              description="Adjust the filters or admit a patient from the ward board."
            />
          )
        }
      />

      <Pagination
        meta={list.data?.meta ?? { current_page: 1, last_page: 1, per_page: perPage, total: 0 }}
        onPageChange={setPage}
        disabled={list.isFetching}
      />

      <AdmissionForm open={formOpen} onClose={() => setFormOpen(false)} />
    </div>
  )
}
