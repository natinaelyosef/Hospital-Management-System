import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { differenceInDays, parseISO } from 'date-fns'
import { Boxes, PackageSearch } from 'lucide-react'
import { pharmacyApi } from '@/api/pharmacy.api'
import { Checkbox } from '@/components/ui/Checkbox'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { Pagination } from '@/components/ui/Pagination'
import { SearchInput } from '@/components/ui/SearchInput'
import { Select } from '@/components/ui/Select'
import { StatCard } from '@/components/ui/StatCard'
import { Table, type Column } from '@/components/ui/Table'
import { useClientPagination } from '@/components/modules/diagnostics/useClientPagination'
import { useDebounce } from '@/hooks'
import { formatCurrency, formatDate } from '@/utils/format'
import type { Medicine } from '@/types'

interface StockRow {
  medicine: Medicine
  batchId: number
  batchNumber: string
  expiryDate: string
  quantity: number
  purchasePrice: number
  daysLeft: number
}

const EXPIRING_WINDOW = 90

export default function StockPage() {
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [expiredOnly, setExpiredOnly] = useState(false)
  const [expiringOnly, setExpiringOnly] = useState(false)

  const debouncedSearch = useDebounce(search, 350).trim()
  const listQuery = {
    per_page: 100,
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(categoryId ? { category_id: Number(categoryId) } : {}),
  }

  const list = useQuery({ queryKey: ['medicines', listQuery], queryFn: () => pharmacyApi.medicines(listQuery) })
  const categories = useQuery({ queryKey: ['medicine-categories'], queryFn: pharmacyApi.categories })
  const medicines = useMemo(() => list.data?.data ?? [], [list.data])

  const stats = useMemo(() => {
    let units = 0
    let value = 0
    for (const medicine of medicines) {
      for (const batch of medicine.batches) {
        units += batch.quantity_available
        value += batch.quantity_available * batch.purchase_price
      }
    }
    return { skus: medicines.length, units, value }
  }, [medicines])

  const rows = useMemo<StockRow[]>(() => {
    const flattened: StockRow[] = medicines.flatMap((medicine) =>
      medicine.batches.map((batch) => ({
        medicine,
        batchId: batch.id,
        batchNumber: batch.batch_number,
        expiryDate: batch.expiry_date,
        quantity: batch.quantity_available,
        purchasePrice: batch.purchase_price,
        daysLeft: differenceInDays(parseISO(batch.expiry_date), new Date()),
      })),
    )

    const filtered = flattened.filter((row) => {
      if (expiredOnly && expiringOnly) return row.daysLeft <= EXPIRING_WINDOW
      if (expiredOnly) return row.daysLeft < 0
      if (expiringOnly) return row.daysLeft >= 0 && row.daysLeft <= EXPIRING_WINDOW
      return true
    })

    const rank = (row: StockRow) => (row.daysLeft < 0 ? 0 : row.daysLeft <= EXPIRING_WINDOW ? 1 : 2)
    return filtered.sort(
      (a, b) => rank(a) - rank(b) || a.daysLeft - b.daysLeft || a.medicine.name.localeCompare(b.medicine.name),
    )
  }, [medicines, expiredOnly, expiringOnly])

  const { paged, meta, setPage } = useClientPagination(rows)

  const columns: Column<StockRow>[] = [
    {
      key: 'medicine',
      header: 'Medicine',
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{row.medicine.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {row.medicine.generic_name || row.medicine.form}
            {row.medicine.strength ? ` · ${row.medicine.strength}` : ''}
          </p>
        </div>
      ),
    },
    { key: 'batchNumber', header: 'Batch #', render: (row) => <span className="font-mono text-xs">{row.batchNumber}</span> },
    {
      key: 'expiryDate',
      header: 'Expiry',
      render: (row) => {
        const urgent = row.daysLeft <= EXPIRING_WINDOW
        const tone =
          row.daysLeft < 0
            ? 'text-red-600 dark:text-red-400'
            : urgent
              ? 'text-amber-600 dark:text-amber-400'
              : 'text-foreground'
        const hint = row.daysLeft < 0 ? 'Expired' : urgent ? `${row.daysLeft}d left` : null
        return (
          <div className={tone}>
            <p className="font-medium">{formatDate(row.expiryDate)}</p>
            {hint && <p className="text-xs opacity-80">{hint}</p>}
          </div>
        )
      },
    },
    {
      key: 'quantity',
      header: 'Qty available',
      align: 'right',
      render: (row) => <span className="tabular-nums">{row.quantity}</span>,
    },
    {
      key: 'purchasePrice',
      header: 'Purchase price',
      align: 'right',
      render: (row) => <span className="tabular-nums">{formatCurrency(row.purchasePrice)}</span>,
    },
    {
      key: 'total',
      header: 'Total value',
      align: 'right',
      render: (row) => (
        <span className="font-medium tabular-nums">{formatCurrency(row.quantity * row.purchasePrice)}</span>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader title="Stock" subtitle="Batch-level inventory with expiry and valuation" />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total SKUs" value={stats.skus} icon={<Boxes size={18} />} />
        <StatCard label="Units on hand" value={stats.units.toLocaleString('en-US')} icon={<PackageSearch size={18} />} />
        <StatCard label="Inventory value" value={formatCurrency(stats.value)} icon={<PackageSearch size={18} />} tone="success" />
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search medicines…"
          containerClassName="w-full lg:w-72"
        />
        <div className="w-full sm:w-52">
          <Select
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            options={[
              { value: '', label: 'All categories' },
              ...(categories.data ?? []).map((category) => ({ value: String(category.id), label: category.name })),
            ]}
          />
        </div>
        <Checkbox
          checked={expiredOnly}
          onChange={(event) => setExpiredOnly(event.target.checked)}
          label="Expired only"
        />
        <Checkbox
          checked={expiringOnly}
          onChange={(event) => setExpiringOnly(event.target.checked)}
          label={`Expiring ≤ ${EXPIRING_WINDOW} days`}
        />
      </div>

      <Table
        columns={columns}
        data={paged}
        loading={list.isLoading}
        rowKey={(row) => row.batchId}
        empty={
          <EmptyState
            icon={<Boxes size={22} />}
            title="No batches found"
            description="Adjust the filters or add stock from the medicines page."
          />
        }
      />

      <Pagination meta={meta} onPageChange={setPage} disabled={list.isFetching} />
    </div>
  )
}
