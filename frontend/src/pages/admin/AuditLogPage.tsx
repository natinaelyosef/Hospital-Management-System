import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FileSearch } from 'lucide-react'
import { type AuditListQuery, miscApi } from '@/api/misc.api'
import type { AuditLog } from '@/types'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { Pagination } from '@/components/ui/Pagination'
import { SearchInput } from '@/components/ui/SearchInput'
import { Select } from '@/components/ui/Select'
import { Table, type Column } from '@/components/ui/Table'
import { usePagination } from '@/hooks/usePagination'
import { statusLabel } from '@/utils/format'

const actionOptions = ['created', 'updated', 'deleted', 'create', 'update', 'delete', 'login']

export default function AuditLogPage() {
  const { setPage, resetPage, query } = usePagination()
  const [term, setTerm] = useState('')
  const [search, setSearch] = useState('')
  const [action, setAction] = useState('')
  const params: AuditListQuery = { ...query, search: search.trim() || undefined, action: action || undefined }
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['audit-logs', params],
    queryFn: () => miscApi.audit.list(params),
  })

  const columns: Column<AuditLog>[] = [
    { key: 'created_at', header: 'When', render: (row) => <span className="whitespace-nowrap text-xs text-muted-foreground">{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(row.created_at))}</span> },
    { key: 'user', header: 'User', render: (row) => <span className="font-medium">{row.user ?? 'System'}</span> },
    { key: 'action', header: 'Action', render: (row) => <span className="rounded-md border bg-muted/30 px-2 py-1 text-xs">{statusLabel(row.action)}</span> },
    { key: 'description', header: 'Activity', render: (row) => <span>{row.description}</span> },
    { key: 'auditable_type', header: 'Record', render: (row) => <span className="text-xs text-muted-foreground">{row.auditable_type ? `${row.auditable_type.split('\\').pop()} #${row.auditable_id ?? ''}` : '—'}</span>, hideBelow: 'lg' },
    { key: 'ip_address', header: 'IP address', render: (row) => <span className="font-mono text-xs text-muted-foreground">{row.ip_address ?? '—'}</span>, hideBelow: 'lg' },
  ]

  return (
    <div className="space-y-6">
      <PageHeader title="Audit Log" subtitle="System activity trail" />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput value={term} onChange={setTerm} onDebouncedChange={(value) => { setSearch(value); resetPage() }} placeholder="Search activity..." containerClassName="sm:max-w-sm sm:flex-1" />
        <Select
          value={action}
          onChange={(event) => { setAction(event.target.value); resetPage() }}
          aria-label="Filter by action"
          className="sm:w-48"
        >
          <option value="">All actions</option>
          {actionOptions.map((value) => <option key={value} value={value}>{statusLabel(value)}</option>)}
        </Select>
      </div>
      <Table
        columns={columns}
        data={data?.data ?? []}
        loading={isLoading}
        rowKey={(row) => row.id}
        empty={<EmptyState icon={<FileSearch size={22} />} title="No activity found" description={search || action ? 'Try changing the search or action filter.' : 'System activity will appear here as staff use the application.'} />}
      />
      {data && <Pagination meta={data.meta} onPageChange={setPage} disabled={isFetching} />}
    </div>
  )
}
