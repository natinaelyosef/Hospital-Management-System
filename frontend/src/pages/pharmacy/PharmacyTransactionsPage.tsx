import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import { ScrollText } from 'lucide-react'
import { pharmacyApi } from '@/api/pharmacy.api'
import { Badge, type BadgeTone } from '@/components/ui/Badge'
import { DateRangePicker, type DateRange } from '@/components/ui/DateRangePicker'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { Pagination } from '@/components/ui/Pagination'
import { SearchInput } from '@/components/ui/SearchInput'
import { Select } from '@/components/ui/Select'
import { Table, type Column } from '@/components/ui/Table'
import { useClientPagination } from '@/components/modules/diagnostics/useClientPagination'
import { useDebounce } from '@/hooks'
import { formatCurrency, formatDateTime } from '@/utils/format'
import type { PharmacyTransaction, PharmacyTransactionType } from '@/types'

const TYPE_TONES: Record<PharmacyTransactionType, BadgeTone> = {
  purchase: 'info',
  dispense: 'neutral',
  sale: 'success',
  expired: 'danger',
  adjustment: 'warning',
  return: 'neutral',
}

const TYPE_OPTIONS = [
  { value: '', label: 'All types' },
  { value: 'purchase', label: 'Purchase' },
  { value: 'dispense', label: 'Dispense' },
  { value: 'sale', label: 'Sale' },
  { value: 'expired', label: 'Expired' },
  { value: 'adjustment', label: 'Adjustment' },
  { value: 'return', label: 'Return' },
]

const EMPTY_RANGE: DateRange = { from: '', to: '' }

export default function PharmacyTransactionsPage() {
  const [search, setSearch] = useState('')
  const [type, setType] = useState('')
  const [range, setRange] = useState<DateRange>(EMPTY_RANGE)

  const debouncedSearch = useDebounce(search, 350).trim()
  const listQuery = {
    per_page: 100,
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(type ? { type } : {}),
  }

  const list = useQuery({
    queryKey: ['pharmacy-transactions', listQuery],
    queryFn: () => pharmacyApi.transactions(listQuery),
  })

  const rows = useMemo(() => {
    const all = list.data?.data ?? []
    return all.filter((transaction) => {
      const day = format(parseISO(transaction.created_at), 'yyyy-MM-dd')
      if (range.from && day < range.from) return false
      if (range.to && day > range.to) return false
      return true
    })
  }, [list.data, range])

  const { paged, meta, setPage } = useClientPagination(rows)

  const columns: Column<PharmacyTransaction>[] = [
    {
      key: 'created_at',
      header: 'Date / time',
      render: (transaction) => <span className="whitespace-nowrap">{formatDateTime(transaction.created_at)}</span>,
    },
    {
      key: 'medicine_name',
      header: 'Medicine',
      render: (transaction) => <span className="font-medium">{transaction.medicine_name}</span>,
    },
    {
      key: 'type',
      header: 'Type',
      render: (transaction) => (
        <Badge tone={TYPE_TONES[transaction.type] ?? 'neutral'}>{transaction.type}</Badge>
      ),
    },
    {
      key: 'quantity',
      header: 'Qty',
      align: 'right',
      render: (transaction) => <span className="tabular-nums">{transaction.quantity}</span>,
    },
    {
      key: 'unit_price',
      header: 'Unit price',
      align: 'right',
      render: (transaction) => <span className="tabular-nums">{formatCurrency(transaction.unit_price)}</span>,
    },
    {
      key: 'total_price',
      header: 'Total',
      align: 'right',
      render: (transaction) => (
        <span className="font-medium tabular-nums">{formatCurrency(transaction.total_price)}</span>
      ),
    },
    {
      key: 'reference',
      header: 'Reference',
      render: (transaction) => transaction.reference || '—',
      hideBelow: 'md',
    },
    {
      key: 'performed_by_name',
      header: 'Performed by',
      render: (transaction) => transaction.performed_by_name,
      hideBelow: 'sm',
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader title="Transactions" subtitle="Audit log of every pharmacy stock movement" />

      <div className="flex flex-wrap items-center gap-2.5">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search medicine or reference…"
          containerClassName="w-full lg:w-72"
        />
        <div className="w-full sm:w-44">
          <Select value={type} onChange={(event) => setType(event.target.value)} options={TYPE_OPTIONS} />
        </div>
        <DateRangePicker value={range} onChange={setRange} />
      </div>

      <Table
        columns={columns}
        data={paged}
        loading={list.isLoading}
        rowKey={(row) => row.id}
        empty={
          <EmptyState
            icon={<ScrollText size={22} />}
            title="No transactions found"
            description="Movements appear here as stock is purchased, dispensed, sold or adjusted."
          />
        }
      />

      <Pagination meta={meta} onPageChange={setPage} disabled={list.isFetching} />
    </div>
  )
}
