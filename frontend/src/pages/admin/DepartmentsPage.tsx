import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Building, Pencil, Plus, Trash2 } from 'lucide-react'
import { getErrorMessage, getFieldErrors } from '@/api/client'
import { type DepartmentListQuery, miscApi } from '@/api/misc.api'
import type { Department } from '@/types'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/ui/PageHeader'
import { Pagination } from '@/components/ui/Pagination'
import { SearchInput } from '@/components/ui/SearchInput'
import { Table, type Column } from '@/components/ui/Table'
import { Textarea } from '@/components/ui/Textarea'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/contexts/AuthContext'
import { useConfirm } from '@/hooks/useConfirm'
import { usePagination } from '@/hooks/usePagination'

interface DepartmentFormModalProps {
  open: boolean
  department: Department | null
  onClose: () => void
}

function DepartmentFormModal({ open, department, onClose }: DepartmentFormModalProps) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [description, setDescription] = useState('')
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setName(department?.name ?? '')
    setCode(department?.code ?? '')
    setDescription(department?.description ?? '')
    setErrors({})
    setFormError(null)
  }, [open, department])

  const mutation = useMutation({
    mutationFn: () => {
      const payload = { name: name.trim(), code: code.trim(), description: description.trim() || undefined }
      return department ? miscApi.departments.update(department.id, payload) : miscApi.departments.create(payload)
    },
    onSuccess: async (saved) => {
      await queryClient.invalidateQueries({ queryKey: ['departments'] })
      toast.success(department ? 'Department updated' : 'Department added', saved.name)
      onClose()
    },
    onError: (caught) => {
      const fieldErrors = getFieldErrors(caught)
      setErrors(fieldErrors)
      if (Object.keys(fieldErrors).length === 0) setFormError(getErrorMessage(caught, 'Unable to save department'))
    },
  })

  const submit = () => {
    const next: Record<string, string[]> = {}
    if (!name.trim()) next.name = ['Name is required.']
    if (!code.trim()) next.code = ['Code is required.']
    setErrors(next)
    setFormError(null)
    if (Object.keys(next).length === 0) mutation.mutate()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={department ? `Edit ${department.name}` : 'Add department'}
      description="Departments organize clinical teams and doctor schedules"
      footer={<><Button variant="outline" onClick={onClose} disabled={mutation.isPending}>Cancel</Button><Button onClick={submit} loading={mutation.isPending}>{department ? 'Save changes' : 'Add department'}</Button></>}
    >
      <div className="space-y-4">
        {formError && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">{formError}</p>}
        <FormField label="Department name" htmlFor="department-name" required error={errors.name?.[0]}>
          <Input id="department-name" value={name} onChange={(event) => setName(event.target.value)} />
        </FormField>
        <FormField label="Code" htmlFor="department-code" required error={errors.code?.[0]}>
          <Input id="department-code" value={code} onChange={(event) => setCode(event.target.value)} placeholder="e.g. CARD" />
        </FormField>
        <FormField label="Description" htmlFor="department-description" error={errors.description?.[0]}>
          <Textarea id="department-description" value={description} onChange={(event) => setDescription(event.target.value)} rows={3} />
        </FormField>
      </div>
    </Modal>
  )
}

export default function DepartmentsPage() {
  const { hasPermission } = useAuth()
  const confirm = useConfirm()
  const toast = useToast()
  const queryClient = useQueryClient()
  const { setPage, resetPage, query } = usePagination()
  const [term, setTerm] = useState('')
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<Department | null>(null)
  const [creating, setCreating] = useState(false)
  const canManage = hasPermission('departments.manage')
  const params: DepartmentListQuery = { ...query, search: search.trim() || undefined }
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['departments', params],
    queryFn: () => miscApi.departments.list(params),
  })

  const remove = async (department: Department) => {
    const confirmed = await confirm({
      title: `Delete ${department.name}?`,
      message: 'Departments assigned to doctors cannot be deleted.',
      confirmLabel: 'Delete department',
      tone: 'destructive',
    })
    if (!confirmed) return
    try {
      await miscApi.departments.remove(department.id)
      await queryClient.invalidateQueries({ queryKey: ['departments'] })
      toast.success('Department deleted', department.name)
    } catch (caught) {
      toast.error('Unable to delete department', getErrorMessage(caught))
    }
  }

  const columns: Column<Department>[] = [
    { key: 'name', header: 'Department', render: (row) => <span className="font-medium">{row.name}</span> },
    { key: 'code', header: 'Code', render: (row) => <span className="font-mono text-xs">{row.code}</span> },
    { key: 'description', header: 'Description', render: (row) => <span className="text-muted-foreground">{row.description || '—'}</span>, hideBelow: 'md' },
    { key: 'doctors_count', header: 'Doctors', align: 'right', render: (row) => <span className="tabular-nums">{row.doctors_count}</span> },
    ...(canManage ? [{
      key: 'actions',
      header: '',
      align: 'right' as const,
      render: (row: Department) => <span className="flex items-center justify-end gap-1.5">
        <button type="button" aria-label={`Edit ${row.name}`} onClick={() => setEditing(row)} className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border text-muted-foreground hover:bg-muted hover:text-foreground"><Pencil size={14} /></button>
        <button type="button" aria-label={`Delete ${row.name}`} onClick={() => void remove(row)} className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border text-muted-foreground hover:border-destructive/40 hover:text-destructive"><Trash2 size={14} /></button>
      </span>,
    }] : []),
  ]

  return (
    <div className="space-y-6">
      <PageHeader title="Departments" subtitle="Clinical and administrative departments" actions={canManage ? <Button icon={<Plus size={16} />} onClick={() => setCreating(true)}>Add department</Button> : undefined} />
      <SearchInput value={term} onChange={setTerm} onDebouncedChange={(value) => { setSearch(value); resetPage() }} placeholder="Search departments..." containerClassName="sm:max-w-sm" />
      <Table
        columns={columns}
        data={data?.data ?? []}
        loading={isLoading}
        rowKey={(row) => row.id}
        empty={<EmptyState icon={<Building size={22} />} title="No departments found" description={search ? 'Try a different department name or code.' : 'Create departments to organize doctors and appointments.'} action={canManage ? <Button size="sm" onClick={() => setCreating(true)}>Add department</Button> : undefined} />}
      />
      {data && <Pagination meta={data.meta} onPageChange={setPage} disabled={isFetching} />}
      <DepartmentFormModal open={creating} department={null} onClose={() => setCreating(false)} />
      <DepartmentFormModal open={Boolean(editing)} department={editing} onClose={() => setEditing(null)} />
    </div>
  )
}
