import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Pill, Plus } from 'lucide-react'
import { prescriptionApi } from '@/api/prescription.api'
import { PrescriptionBuilder } from '@/components/modules/clinical/PrescriptionBuilder'
import { PRESCRIPTION_STATUS_FILTER_OPTIONS } from '@/components/modules/clinical/constants'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { Pagination } from '@/components/ui/Pagination'
import { SearchInput } from '@/components/ui/SearchInput'
import { Select } from '@/components/ui/Select'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Table, type Column } from '@/components/ui/Table'
import { useAuth } from '@/contexts/AuthContext'
import { useDebounce, usePagination } from '@/hooks'
import type { Prescription } from '@/types'
import { formatDate } from '@/utils/format'

const columns: Column<Prescription>[] = [
  {
    key: 'prescription_number',
    header: 'RX #',
    render: (row) => <span className="font-mono text-xs font-semibold text-primary">{row.prescription_number}</span>,
  },
  { key: 'created_at', header: 'Date', render: (row) => formatDate(row.created_at) },
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
  { key: 'doctor', header: 'Doctor', hideBelow: 'md', render: (row) => row.doctor.name },
  { key: 'items', header: '# Items', align: 'center', hideBelow: 'sm', render: (row) => row.items.length },
  { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
]

export default function PrescriptionsPage() {
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const { setPage, resetPage, query } = usePagination()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [builderOpen, setBuilderOpen] = useState(false)
  const debouncedSearch = useDebounce(search, 350)

  const params = useMemo(
    () => ({
      ...query,
      search: debouncedSearch.trim() || undefined,
      status: status || undefined,
    }),
    [query, debouncedSearch, status],
  )

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['prescriptions', params],
    queryFn: () => prescriptionApi.list(params),
    placeholderData: keepPreviousData,
  })

  const canCreate = hasPermission('prescriptions.create')

  return (
    <div className="space-y-6">
      <PageHeader
        title="Prescriptions"
        subtitle="Track prescriptions from issue through dispensing"
        actions={
          canCreate ? (
            <Button icon={<Plus size={16} />} onClick={() => setBuilderOpen(true)}>
              New Prescription
            </Button>
          ) : undefined
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          value={search}
          onChange={(value) => {
            setSearch(value)
            resetPage()
          }}
          placeholder="Search RX number, patient or diagnosis…"
          containerClassName="sm:max-w-sm sm:flex-1"
        />
        <Select
          aria-label="Filter by status"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value)
            resetPage()
          }}
          options={PRESCRIPTION_STATUS_FILTER_OPTIONS}
          className="w-44"
        />
      </div>

      <Table
        columns={columns}
        data={data?.data ?? []}
        loading={isLoading}
        onRowClick={(row) => void navigate(`/prescriptions/${row.id}`)}
        rowKey={(row) => row.id}
        empty={
          <EmptyState
            icon={<Pill size={22} />}
            title="No prescriptions found"
            description="Adjust the filters or create a new prescription."
          />
        }
      />

      {data && <Pagination meta={data.meta} onPageChange={setPage} disabled={isFetching} />}

      <PrescriptionBuilder open={builderOpen} onClose={() => setBuilderOpen(false)} />
    </div>
  )
}
