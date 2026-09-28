import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Trash2, Wallet } from 'lucide-react'
import { getFieldErrors, getErrorMessage } from '@/api/client'
import { billingApi } from '@/api/billing.api'
import { type ServiceListQuery } from '@/api/misc.api'
import type { Service } from '@/types'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
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
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/contexts/AuthContext'
import { useConfirm } from '@/hooks/useConfirm'
import { usePagination } from '@/hooks/usePagination'
import { formatCurrency } from '@/utils/format'

interface ServiceFormModalProps {
  open: boolean
  service: Service | null
  onClose: () => void
}

function ServiceFormModal({ open, service, onClose }: ServiceFormModalProps) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [category, setCategory] = useState('')
  const [price, setPrice] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setName(service?.name ?? '')
    setCode(service?.code ?? '')
    setCategory(service?.category ?? '')
    setPrice(service ? String(service.price) : '')
    setIsActive(service?.is_active ?? true)
    setErrors({})
    setFormError(null)
  }, [open, service])

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        name: name.trim(),
        code: code.trim(),
        category: category.trim(),
        price: Number(price),
        is_active: isActive,
      }
      return service ? billingApi.services.update(service.id, payload) : billingApi.services.create(payload)
    },
    onSuccess: async (saved) => {
      await queryClient.invalidateQueries({ queryKey: ['services'] })
      toast.success(service ? 'Service updated' : 'Service created', saved.name)
      onClose()
    },
    onError: (caught) => {
      const fieldErrors = getFieldErrors(caught)
      setErrors(fieldErrors)
      if (Object.keys(fieldErrors).length === 0) setFormError(getErrorMessage(caught, 'Unable to save service'))
    },
  })

  const submit = () => {
    const next: Record<string, string[]> = {}
    if (!name.trim()) next.name = ['Name is required.']
    if (!code.trim()) next.code = ['Code is required.']
    if (!category.trim()) next.category = ['Category is required.']
    if (!Number.isFinite(Number(price)) || Number(price) <= 0) next.price = ['Price must be greater than 0.']
    setErrors(next)
    setFormError(null)
    if (Object.keys(next).length === 0) mutation.mutate()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={service ? `Edit ${service.name}` : 'New service'}
      description="Catalogue entries available when building invoices"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button onClick={submit} loading={mutation.isPending}>
            {service ? 'Save changes' : 'Create service'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {formError && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
            {formError}
          </p>
        )}
        <FormField label="Name" htmlFor="service-name" required error={errors.name?.[0]}>
          <Input id="service-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Cardiology review" />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Code" htmlFor="service-code" required error={errors.code?.[0]}>
            <Input id="service-code" value={code} onChange={(event) => setCode(event.target.value)} placeholder="e.g. CAR-01" />
          </FormField>
          <FormField label="Category" htmlFor="service-category" required error={errors.category?.[0]}>
            <Input
              id="service-category"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              placeholder="e.g. Consultation"
            />
          </FormField>
        </div>
        <FormField label="Price" htmlFor="service-price" required error={errors.price?.[0]}>
          <Input
            id="service-price"
            type="number"
            min={0}
            step="0.01"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            placeholder="0.00"
          />
        </FormField>
        <Checkbox label="Active" description="Available for new invoices" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
      </div>
    </Modal>
  )
}

export default function ServicesPage() {
  const { hasPermission, hasAnyPermission } = useAuth()
  const confirm = useConfirm()
  const toast = useToast()
  const queryClient = useQueryClient()
  const { setPage, resetPage, query } = usePagination()

  const [term, setTerm] = useState('')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [editing, setEditing] = useState<Service | null>(null)
  const [creating, setCreating] = useState(false)

  const params: ServiceListQuery = {
    ...query,
    search: search.trim() || undefined,
    category: category || undefined,
  }

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['services', params],
    queryFn: () => billingApi.services.list(params),
  })

  const { data: catalogue } = useQuery({
    queryKey: ['services', 'catalogue'],
    queryFn: () => billingApi.services.list({ page: 1, per_page: 100 }),
    staleTime: 5 * 60_000,
  })

  const categories = Array.from(new Set((catalogue?.data ?? []).map((item) => item.category).filter(Boolean))).sort()

  const canCreate = hasAnyPermission('billing.invoice.edit', 'billing.invoice.create')
  const canManage = hasPermission('billing.invoice.edit')

  const remove = async (service: Service) => {
    const confirmed = await confirm({
      title: `Delete ${service.name}?`,
      message: 'This removes the service from the invoice catalogue. Existing invoices are unaffected.',
      confirmLabel: 'Delete',
      tone: 'destructive',
    })
    if (!confirmed) return
    try {
      await billingApi.services.remove(service.id)
      await queryClient.invalidateQueries({ queryKey: ['services'] })
      toast.success('Service deleted', service.name)
    } catch (caught) {
      toast.error('Unable to delete service', getErrorMessage(caught))
    }
  }

  const columns: Column<Service>[] = [
    { key: 'code', header: 'Code', render: (row) => <span className="font-mono text-xs font-semibold text-foreground">{row.code}</span> },
    { key: 'name', header: 'Name', render: (row) => <span className="font-medium text-foreground">{row.name}</span> },
    {
      key: 'category',
      header: 'Category',
      render: (row) => <span className="text-muted-foreground">{row.category}</span>,
    },
    { key: 'price', header: 'Price', align: 'right', render: (row) => <span className="font-semibold">{formatCurrency(row.price)}</span> },
    { key: 'is_active', header: 'Status', render: (row) => <StatusBadge status={row.is_active ? 'active' : 'inactive'} /> },
    ...(canManage
      ? [
          {
            key: 'actions',
            header: '',
            align: 'right' as const,
            render: (row: Service) => (
              <span className="flex items-center justify-end gap-1.5">
                <button
                  type="button"
                  aria-label={`Edit ${row.name}`}
                  onClick={() => setEditing(row)}
                  className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <Pencil size={14} />
                </button>
                <button
                  type="button"
                  aria-label={`Delete ${row.name}`}
                  onClick={() => void remove(row)}
                  className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
                >
                  <Trash2 size={14} />
                </button>
              </span>
            ),
          },
        ]
      : []),
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Services & pricing"
        subtitle="Price list used across invoices"
        actions={
          canCreate ? (
            <Button icon={<Plus size={16} />} onClick={() => setCreating(true)}>
              New service
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
          placeholder="Search name or code…"
          containerClassName="sm:max-w-xs sm:flex-1"
        />
        <Select
          value={category}
          onChange={(event) => {
            setCategory(event.target.value)
            resetPage()
          }}
          options={[{ value: '', label: 'All categories' }, ...categories.map((value) => ({ value, label: value }))]}
          aria-label="Filter by category"
          className="sm:w-52"
        />
      </div>

      <Table
        columns={columns}
        data={data?.data ?? []}
        loading={isLoading}
        rowKey={(row) => row.id}
        empty={
          <EmptyState
            icon={<Wallet size={22} />}
            title="No services found"
            description={search || category ? 'Try adjusting your filters.' : 'Add your first catalogue service.'}
            action={
              canCreate ? (
                <Button size="sm" onClick={() => setCreating(true)}>
                  New service
                </Button>
              ) : undefined
            }
          />
        }
      />

      {data && <Pagination meta={data.meta} onPageChange={setPage} disabled={isFetching} />}

      <ServiceFormModal open={creating} service={null} onClose={() => setCreating(false)} />
      <ServiceFormModal open={Boolean(editing)} service={editing} onClose={() => setEditing(null)} />
    </div>
  )
}
