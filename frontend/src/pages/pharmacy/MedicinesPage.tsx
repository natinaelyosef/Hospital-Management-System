import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { differenceInDays, parseISO } from 'date-fns'
import { Clock, Package, PackagePlus, Pencil, Pill, Plus, Trash2, TriangleAlert } from 'lucide-react'
import { getErrorMessage } from '@/api/client'
import { pharmacyApi } from '@/api/pharmacy.api'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/ui/PageHeader'
import { Pagination } from '@/components/ui/Pagination'
import { SearchInput } from '@/components/ui/SearchInput'
import { Select } from '@/components/ui/Select'
import { Spinner } from '@/components/ui/Spinner'
import { StatCard } from '@/components/ui/StatCard'
import { Table, type Column } from '@/components/ui/Table'
import { useToast } from '@/components/ui/Toast'
import { BatchForm } from '@/components/modules/diagnostics/BatchForm'
import { MedicineForm } from '@/components/modules/diagnostics/MedicineForm'
import { useAuth } from '@/contexts/AuthContext'
import { useConfirm, useDebounce, usePagination } from '@/hooks'
import type { Medicine, MedicineBatch } from '@/types'
import { formatCurrency, formatDate } from '@/utils/format'

function expiryTone(expiry: string): string {
  const days = differenceInDays(parseISO(expiry), new Date())
  if (days < 0) return 'text-red-600 dark:text-red-400'
  if (days <= 90) return 'text-amber-600 dark:text-amber-400'
  return ''
}

export default function MedicinesPage() {
  const { hasPermission } = useAuth()
  const canManage = hasPermission('pharmacy.manage')
  const queryClient = useQueryClient()
  const toast = useToast()
  const confirm = useConfirm()
  const { page, perPage, setPage, resetPage } = usePagination()

  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [lowOnly, setLowOnly] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Medicine | null>(null)
  const [detailId, setDetailId] = useState<number | null>(null)
  const [batchMedicine, setBatchMedicine] = useState<Medicine | null>(null)

  const debouncedSearch = useDebounce(search, 350).trim()
  const listQuery = {
    page,
    per_page: perPage,
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(categoryId ? { category_id: Number(categoryId) } : {}),
    ...(lowOnly ? { low_stock: 1 } : {}),
  }

  const list = useQuery({ queryKey: ['medicines', listQuery], queryFn: () => pharmacyApi.medicines(listQuery) })
  const categories = useQuery({ queryKey: ['medicine-categories'], queryFn: pharmacyApi.categories })
  const alerts = useQuery({ queryKey: ['pharmacy-alerts'], queryFn: pharmacyApi.alerts })
  const detail = useQuery({
    queryKey: ['medicine', detailId],
    queryFn: () => pharmacyApi.medicine(detailId!),
    enabled: detailId !== null,
  })

  const remove = useMutation({
    mutationFn: (id: number) => pharmacyApi.removeMedicine(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['medicines'] })
      queryClient.invalidateQueries({ queryKey: ['medicine', id] })
      queryClient.invalidateQueries({ queryKey: ['pharmacy-alerts'] })
      toast.success('Medicine deleted')
      setDetailId(null)
    },
    onError: (error) => toast.error('Unable to delete medicine', getErrorMessage(error)),
  })

  const handleSearch = (value: string) => {
    setSearch(value)
    resetPage()
  }

  const handleDelete = async (medicine: Medicine) => {
    const confirmed = await confirm({
      title: `Delete ${medicine.name}?`,
      message: 'The medicine is removed from the catalogue. Batches and past transactions are kept for audit.',
      confirmLabel: 'Delete',
      tone: 'destructive',
    })
    if (confirmed) remove.mutate(medicine.id)
  }

  const columns: Column<Medicine>[] = [
    {
      key: 'name',
      header: 'Medicine',
      render: (medicine) => <span className="font-medium">{medicine.name}</span>,
    },
    { key: 'generic_name', header: 'Generic', render: (medicine) => medicine.generic_name || '—' },
    { key: 'category', header: 'Category', render: (medicine) => medicine.category?.name ?? '—' },
    {
      key: 'form',
      header: 'Form / Strength',
      render: (medicine) => (
        <span>
          {medicine.form}
          {medicine.strength ? ` · ${medicine.strength}` : ''}
        </span>
      ),
    },
    {
      key: 'stock_quantity',
      header: 'Stock',
      align: 'right',
      render: (medicine) => {
        const low = medicine.stock_quantity <= medicine.reorder_level
        return low ? (
          <Badge tone="danger" title={`Reorder level ${medicine.reorder_level}`}>
            {medicine.stock_quantity}
          </Badge>
        ) : (
          <span className="tabular-nums">{medicine.stock_quantity}</span>
        )
      },
    },
    {
      key: 'selling_price',
      header: 'Price',
      align: 'right',
      render: (medicine) => <span className="tabular-nums">{formatCurrency(medicine.selling_price)}</span>,
    },
    {
      key: 'is_active',
      header: 'Status',
      render: (medicine) =>
        medicine.is_active ? (
          <Badge tone="success" dot>
            Active
          </Badge>
        ) : (
          <Badge tone="neutral">Inactive</Badge>
        ),
    },
  ]

  const batchColumns: Column<MedicineBatch>[] = [
    { key: 'batch_number', header: 'Batch', render: (batch) => <span className="font-medium">{batch.batch_number}</span> },
    {
      key: 'expiry_date',
      header: 'Expiry',
      render: (batch) => (
        <span className={expiryTone(batch.expiry_date)}>{formatDate(batch.expiry_date)}</span>
      ),
    },
    {
      key: 'quantity_available',
      header: 'Qty',
      align: 'right',
      render: (batch) => <span className="tabular-nums">{batch.quantity_available}</span>,
    },
    {
      key: 'purchase_price',
      header: 'Purchase price',
      align: 'right',
      render: (batch) => <span className="tabular-nums">{formatCurrency(batch.purchase_price)}</span>,
    },
  ]

  const medicine = detail.data ?? null

  return (
    <div className="space-y-6">
      <PageHeader
        title="Medicines"
        subtitle="Medicine catalogue, pricing and batch stock"
        actions={
          canManage && (
            <Button
              icon={<Plus size={16} />}
              onClick={() => {
                setEditing(null)
                setFormOpen(true)
              }}
            >
              Add medicine
            </Button>
          )
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Low stock medicines"
          value={alerts.data ? alerts.data.low_stock.length : '—'}
          icon={<Package size={18} />}
          tone="warning"
        />
        <StatCard
          label="Expiring within 90 days"
          value={alerts.data ? alerts.data.expiring_soon.length : '—'}
          icon={<Clock size={18} />}
        />
        <StatCard
          label="Expired batches"
          value={alerts.data ? alerts.data.expired.length : '—'}
          icon={<TriangleAlert size={18} />}
          tone="danger"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <SearchInput
          value={search}
          onChange={handleSearch}
          placeholder="Search name or generic…"
          containerClassName="w-full lg:w-72"
        />
        <div className="w-full sm:w-52">
          <Select
            value={categoryId}
            onChange={(event) => {
              setCategoryId(event.target.value)
              resetPage()
            }}
            options={[
              { value: '', label: 'All categories' },
              ...(categories.data ?? []).map((category) => ({ value: String(category.id), label: category.name })),
            ]}
          />
        </div>
        <Checkbox
          checked={lowOnly}
          onChange={(event) => {
            setLowOnly(event.target.checked)
            resetPage()
          }}
          label="Low stock only"
        />
      </div>

      <Table
        columns={columns}
        data={list.data?.data ?? []}
        loading={list.isLoading}
        rowKey={(row) => row.id}
        onRowClick={(row) => setDetailId(row.id)}
        empty={
          <EmptyState
            icon={<Pill size={22} />}
            title="No medicines found"
            description={debouncedSearch || categoryId || lowOnly ? 'Try adjusting the filters.' : 'Add your first medicine to get started.'}
          />
        }
      />

      <Pagination meta={list.data?.meta ?? { current_page: 1, last_page: 1, per_page: perPage, total: 0 }} onPageChange={setPage} disabled={list.isFetching} />

      <MedicineForm open={formOpen} medicine={editing} onClose={() => setFormOpen(false)} />
      <BatchForm open={batchMedicine !== null} medicine={batchMedicine} onClose={() => setBatchMedicine(null)} />

      <Modal
        open={detailId !== null}
        onClose={() => setDetailId(null)}
        size="lg"
        title={medicine?.name ?? 'Medicine'}
        description={medicine ? `${medicine.form}${medicine.strength ? ` · ${medicine.strength}` : ''} · ${medicine.unit}` : undefined}
        footer={
          <div className="flex w-full flex-wrap items-center justify-between gap-2">
            <div>
              {canManage && medicine && (
                <Button
                  variant="destructive"
                  size="sm"
                  icon={<Trash2 size={14} />}
                  loading={remove.isPending}
                  onClick={() => handleDelete(medicine)}
                >
                  Delete
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setDetailId(null)}>
                Close
              </Button>
              {canManage && medicine && (
                <>
                  <Button
                    variant="outline"
                    icon={<Pencil size={15} />}
                    onClick={() => {
                      setEditing(medicine)
                      setFormOpen(true)
                    }}
                  >
                    Edit
                  </Button>
                  <Button icon={<PackagePlus size={15} />} onClick={() => setBatchMedicine(medicine)}>
                    Add batch
                  </Button>
                </>
              )}
            </div>
          </div>
        }
      >
        {detail.isLoading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Spinner size="sm" /> Loading medicine…
          </div>
        ) : !medicine ? (
          <EmptyState compact title="Medicine unavailable" description="It may have been deleted, or you lack access." />
        ) : (
          <div className="space-y-5">
            <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
              <div>
                <dt className="text-xs text-muted-foreground">Generic name</dt>
                <dd className="text-sm font-medium text-foreground">{medicine.generic_name || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Category</dt>
                <dd className="text-sm font-medium text-foreground">{medicine.category?.name ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Supplier</dt>
                <dd className="text-sm font-medium text-foreground">{medicine.supplier?.name ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Selling price</dt>
                <dd className="text-sm font-medium text-foreground">{formatCurrency(medicine.selling_price)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Stock on hand</dt>
                <dd className="text-sm font-medium text-foreground">
                  {medicine.stock_quantity} {medicine.unit}
                  <span className="ml-1 text-xs font-normal text-muted-foreground">(reorder at {medicine.reorder_level})</span>
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Status</dt>
                <dd>
                  {medicine.is_active ? (
                    <Badge tone="success" dot>
                      Active
                    </Badge>
                  ) : (
                    <Badge tone="neutral">Inactive</Badge>
                  )}
                </dd>
              </div>
            </dl>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-foreground">Batches</h4>
                <span className="text-xs text-muted-foreground">{medicine.batches.length} total</span>
              </div>
              <Table
                columns={batchColumns}
                data={medicine.batches}
                compact
                rowKey={(row) => row.id}
                empty={<EmptyState compact title="No batches yet" description="Add stock to start tracking inventory." />}
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
