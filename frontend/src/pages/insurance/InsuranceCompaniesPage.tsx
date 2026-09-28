import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, ShieldCheck, Trash2 } from 'lucide-react'
import { getFieldErrors, getErrorMessage } from '@/api/client'
import { insuranceApi, type CompanyInput, type CompanyListQuery } from '@/api/insurance.api'
import type { InsuranceCompany } from '@/types'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { EmptyState } from '@/components/ui/EmptyState'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/ui/PageHeader'
import { Pagination } from '@/components/ui/Pagination'
import { SearchInput } from '@/components/ui/SearchInput'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Table, type Column } from '@/components/ui/Table'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/contexts/AuthContext'
import { useConfirm } from '@/hooks/useConfirm'
import { usePagination } from '@/hooks/usePagination'

interface CompanyFormModalProps {
  open: boolean
  company: InsuranceCompany | null
  onClose: () => void
}

function CompanyFormModal({ open, company, onClose }: CompanyFormModalProps) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [form, setForm] = useState<CompanyInput>({ name: '', code: '', phone: '', email: '', address: '', is_active: true })
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setForm({
      name: company?.name ?? '',
      code: company?.code ?? '',
      phone: company?.phone ?? '',
      email: company?.email ?? '',
      address: company?.address ?? '',
      is_active: company?.is_active ?? true,
    })
    setErrors({})
    setFormError(null)
  }, [open, company])

  const mutation = useMutation({
    mutationFn: () => (company ? insuranceApi.updateCompany(company.id, form) : insuranceApi.createCompany(form)),
    onSuccess: async (saved) => {
      await queryClient.invalidateQueries({ queryKey: ['insurance-companies'] })
      await queryClient.invalidateQueries({ queryKey: ['insurance-claims'] })
      toast.success(company ? 'Company updated' : 'Company added', saved.name)
      onClose()
    },
    onError: (caught) => {
      const fieldErrors = getFieldErrors(caught)
      setErrors(fieldErrors)
      if (Object.keys(fieldErrors).length === 0) setFormError(getErrorMessage(caught, 'Unable to save company'))
    },
  })

  const submit = () => {
    const next: Record<string, string[]> = {}
    if (!form.name.trim()) next.name = ['Name is required.']
    if (!form.code.trim()) next.code = ['Code is required.']
    setErrors(next)
    setFormError(null)
    if (Object.keys(next).length === 0) mutation.mutate()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={company ? `Edit ${company.name}` : 'New insurance company'}
      description="Payers your patients are covered by"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button onClick={submit} loading={mutation.isPending}>
            {company ? 'Save changes' : 'Create company'}
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
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Name" htmlFor="company-name" required error={errors.name?.[0]}>
            <Input id="company-name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="e.g. Nyala Insurance" />
          </FormField>
          <FormField label="Code" htmlFor="company-code" required error={errors.code?.[0]}>
            <Input id="company-code" value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} placeholder="e.g. NYL" />
          </FormField>
          <FormField label="Phone" htmlFor="company-phone" error={errors.phone?.[0]}>
            <Input id="company-phone" value={form.phone ?? ''} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
          </FormField>
          <FormField label="Email" htmlFor="company-email" error={errors.email?.[0]}>
            <Input id="company-email" type="email" value={form.email ?? ''} onChange={(event) => setForm({ ...form, email: event.target.value })} />
          </FormField>
        </div>
        <FormField label="Address" htmlFor="company-address" error={errors.address?.[0]}>
          <Input id="company-address" value={form.address ?? ''} onChange={(event) => setForm({ ...form, address: event.target.value })} />
        </FormField>
        <Checkbox
          label="Active"
          description="Accept new policies and claims"
          checked={form.is_active}
          onChange={(event) => setForm({ ...form, is_active: event.target.checked })}
        />
      </div>
    </Modal>
  )
}

export default function InsuranceCompaniesPage() {
  const { hasPermission } = useAuth()
  const confirm = useConfirm()
  const toast = useToast()
  const queryClient = useQueryClient()
  const { setPage, resetPage, query } = usePagination()

  const [term, setTerm] = useState('')
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<InsuranceCompany | null>(null)
  const [creating, setCreating] = useState(false)

  const params: CompanyListQuery = { ...query, search: search.trim() || undefined }
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['insurance-companies', params],
    queryFn: () => insuranceApi.companies(params),
  })

  const canManage = hasPermission('insurance.manage')

  const remove = async (company: InsuranceCompany) => {
    const confirmed = await confirm({
      title: `Delete ${company.name}?`,
      message: 'Policies and claims already linked to this company are kept.',
      confirmLabel: 'Delete',
      tone: 'destructive',
    })
    if (!confirmed) return
    try {
      await insuranceApi.removeCompany(company.id)
      await queryClient.invalidateQueries({ queryKey: ['insurance-companies'] })
      toast.success('Company deleted', company.name)
    } catch (caught) {
      toast.error('Unable to delete company', getErrorMessage(caught))
    }
  }

  const columns: Column<InsuranceCompany>[] = [
    { key: 'name', header: 'Company', render: (row) => <span className="font-medium text-foreground">{row.name}</span> },
    { key: 'code', header: 'Code', render: (row) => <span className="font-mono text-xs font-semibold">{row.code}</span> },
    { key: 'phone', header: 'Phone', hideBelow: 'sm', render: (row) => <span className="text-muted-foreground">{row.phone ?? '—'}</span> },
    { key: 'email', header: 'Email', hideBelow: 'md', render: (row) => <span className="text-muted-foreground">{row.email ?? '—'}</span> },
    {
      key: 'patients_count',
      header: 'Patients',
      align: 'right',
      render: (row) => <span className="font-semibold">{row.patients_count}</span>,
    },
    { key: 'is_active', header: 'Status', render: (row) => <StatusBadge status={row.is_active ? 'active' : 'inactive'} /> },
    ...(canManage
      ? [
          {
            key: 'actions',
            header: '',
            align: 'right' as const,
            render: (row: InsuranceCompany) => (
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
        title="Insurance companies"
        subtitle="Payers, policies and claims"
        actions={
          canManage ? (
            <Button icon={<Plus size={16} />} onClick={() => setCreating(true)}>
              New company
            </Button>
          ) : undefined
        }
      />

      <SearchInput
        value={term}
        onChange={setTerm}
        onDebouncedChange={(value) => {
          setSearch(value)
          resetPage()
        }}
        placeholder="Search company or code…"
        containerClassName="sm:max-w-sm"
      />

      <Table
        columns={columns}
        data={data?.data ?? []}
        loading={isLoading}
        rowKey={(row) => row.id}
        empty={
          <EmptyState
            icon={<ShieldCheck size={22} />}
            title="No insurance companies"
            description={search ? 'No company matched your search.' : 'Add the payers you work with.'}
            action={
              canManage ? (
                <Button size="sm" onClick={() => setCreating(true)}>
                  New company
                </Button>
              ) : undefined
            }
          />
        }
      />

      {data && <Pagination meta={data.meta} onPageChange={setPage} disabled={isFetching} />}

      <CompanyFormModal open={creating} company={null} onClose={() => setCreating(false)} />
      <CompanyFormModal open={Boolean(editing)} company={editing} onClose={() => setEditing(null)} />
    </div>
  )
}
