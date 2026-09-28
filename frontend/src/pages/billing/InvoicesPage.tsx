import { useState } from 'react'
<<<<<<< HEAD
import { useNavigate, useSearchParams } from 'react-router-dom'
=======
import { useNavigate } from 'react-router-dom'
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
import { useQuery } from '@tanstack/react-query'
import { Receipt } from 'lucide-react'
import { billingApi, type InvoiceListQuery } from '@/api/billing.api'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input } from '@/components/ui/Input'
import { PageHeader } from '@/components/ui/PageHeader'
import { Pagination } from '@/components/ui/Pagination'
import { SearchInput } from '@/components/ui/SearchInput'
import { Select } from '@/components/ui/Select'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Table, type Column } from '@/components/ui/Table'
import { InvoiceFormModal } from '@/components/modules/finance/InvoiceFormModal'
import { useAuth } from '@/contexts/AuthContext'
import { usePagination } from '@/hooks/usePagination'
import type { Invoice } from '@/types'
import { formatCurrency, formatDate } from '@/utils/format'

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'partial', label: 'Partial' },
  { value: 'paid', label: 'Paid' },
  { value: 'cancelled', label: 'Cancelled' },
]

export default function InvoicesPage() {
  const navigate = useNavigate()
<<<<<<< HEAD
  const [searchParams] = useSearchParams()
=======
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
  const { hasPermission } = useAuth()
  const { setPage, resetPage, query } = usePagination()

  const [term, setTerm] = useState('')
  const [search, setSearch] = useState('')
<<<<<<< HEAD
  const [status, setStatus] = useState(searchParams.get('status') ?? '')
=======
  const [status, setStatus] = useState('')
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
  const [date, setDate] = useState('')
  const [creating, setCreating] = useState(false)

  const params: InvoiceListQuery = {
    ...query,
    search: search.trim() || undefined,
    status: status || undefined,
    date: date || undefined,
  }

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['invoices', params],
    queryFn: () => billingApi.invoices(params),
  })

  const canCreate = hasPermission('billing.invoice.create')

  const columns: Column<Invoice>[] = [
    {
      key: 'invoice_number',
      header: 'Invoice #',
      render: (invoice) => <span className="font-semibold text-foreground">{invoice.invoice_number}</span>,
    },
    {
      key: 'patient',
      header: 'Patient',
      render: (invoice) => (
        <span className="flex flex-col">
          <span className="font-medium text-foreground">{invoice.patient.full_name}</span>
          <span className="text-[11px] text-muted-foreground">{invoice.patient.patient_number}</span>
        </span>
      ),
    },
    {
      key: 'created_at',
      header: 'Issued',
      render: (invoice) => <span className="text-muted-foreground">{formatDate(invoice.created_at)}</span>,
    },
    { key: 'total', header: 'Total', align: 'right', render: (invoice) => formatCurrency(invoice.total) },
    {
      key: 'paid_amount',
      header: 'Paid',
      align: 'right',
      hideBelow: 'sm',
      render: (invoice) => <span className="text-muted-foreground">{formatCurrency(invoice.paid_amount)}</span>,
    },
    {
      key: 'balance',
      header: 'Balance',
      align: 'right',
      render: (invoice) => (
        <span className={invoice.balance > 0 ? 'font-semibold text-destructive' : 'text-muted-foreground'}>
          {formatCurrency(invoice.balance)}
        </span>
      ),
    },
    { key: 'status', header: 'Status', render: (invoice) => <StatusBadge status={invoice.status} /> },
  ]

  const filtersActive = Boolean(search || status || date)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoices"
        subtitle="Issue, settle and track patient billing"
        actions={
          canCreate ? (
            <Button icon={<Receipt size={16} />} onClick={() => setCreating(true)}>
              New invoice
            </Button>
          ) : undefined
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          value={term}
          onChange={setTerm}
          onDebouncedChange={(value) => {
            setSearch(value)
            resetPage()
          }}
          placeholder="Search invoice # or patient…"
          containerClassName="sm:max-w-xs sm:flex-1"
        />
        <Select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value)
            resetPage()
          }}
          options={STATUS_OPTIONS}
          aria-label="Filter by status"
          className="sm:w-44"
        />
        <Input
          type="date"
          value={date}
          aria-label="Filter by issue date"
          onChange={(event) => {
            setDate(event.target.value)
            resetPage()
          }}
          className="sm:w-44"
        />
      </div>

      <Table
        columns={columns}
        data={data?.data ?? []}
        loading={isLoading}
        onRowClick={(invoice) => void navigate(`/billing/invoices/${invoice.id}`)}
        rowKey={(invoice) => invoice.id}
        empty={
          <EmptyState
            icon={<Receipt size={22} />}
            title="No invoices found"
            description={filtersActive ? 'Try adjusting your filters.' : 'Create your first invoice to get started.'}
            action={
              canCreate ? (
                <Button size="sm" onClick={() => setCreating(true)}>
                  New invoice
                </Button>
              ) : undefined
            }
          />
        }
      />

      {data && <Pagination meta={data.meta} onPageChange={setPage} disabled={isFetching} />}

      <InvoiceFormModal
        open={creating}
        onClose={() => setCreating(false)}
        onSaved={(invoice) => void navigate(`/billing/invoices/${invoice.id}`)}
      />
    </div>
  )
}
