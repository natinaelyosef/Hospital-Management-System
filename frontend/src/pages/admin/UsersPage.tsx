import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Trash2, UserCog } from 'lucide-react'
import { getErrorMessage, getFieldErrors } from '@/api/client'
import { userApi, type UserListQuery } from '@/api/user.api'
import type { User } from '@/types'
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

interface UserFormModalProps {
  open: boolean
  user: User | null
  onClose: () => void
}

function UserFormModal({ open, user, onClose }: UserFormModalProps) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [roleId, setRoleId] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const { data: roles = [] } = useQuery({ queryKey: ['roles'], queryFn: userApi.roles })

  useEffect(() => {
    if (!open) return
    setName(user?.name ?? '')
    setEmail(user?.email ?? '')
    setPassword('')
    setPhone(user?.phone ?? '')
    setRoleId(user?.role ? String(user.role.id) : '')
    setIsActive(user?.is_active ?? true)
    setErrors({})
    setFormError(null)
  }, [open, user])

  const mutation = useMutation({
    mutationFn: () => user
      ? userApi.update(user.id, { name: name.trim(), email: email.trim(), phone: phone.trim() || undefined, role_id: Number(roleId), is_active: isActive })
      : userApi.create({ name: name.trim(), email: email.trim(), password, phone: phone.trim() || undefined, role_id: Number(roleId), is_active: isActive }),
    onSuccess: async (saved) => {
      await queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success(user ? 'User updated' : 'User created', saved.name)
      onClose()
    },
    onError: (caught) => {
      const fieldErrors = getFieldErrors(caught)
      setErrors(fieldErrors)
      if (Object.keys(fieldErrors).length === 0) setFormError(getErrorMessage(caught, 'Unable to save user'))
    },
  })

  const submit = () => {
    const next: Record<string, string[]> = {}
    if (!name.trim()) next.name = ['Name is required.']
    if (!email.trim()) next.email = ['Email is required.']
    if (!user && password.length < 8) next.password = ['Password must be at least 8 characters.']
    if (!roleId) next.role_id = ['Select a role.']
    setErrors(next)
    setFormError(null)
    if (Object.keys(next).length === 0) mutation.mutate()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={user ? `Edit ${user.name}` : 'Add user'}
      description="Staff account details and role assignment"
      footer={<><Button variant="outline" onClick={onClose} disabled={mutation.isPending}>Cancel</Button><Button onClick={submit} loading={mutation.isPending}>{user ? 'Save changes' : 'Create user'}</Button></>}
    >
      <div className="space-y-4">
        {formError && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">{formError}</p>}
        <FormField label="Full name" htmlFor="user-name" required error={errors.name?.[0]}>
          <Input id="user-name" value={name} onChange={(event) => setName(event.target.value)} />
        </FormField>
        <FormField label="Email" htmlFor="user-email" required error={errors.email?.[0]}>
          <Input id="user-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" />
        </FormField>
        {!user && <FormField label="Initial password" htmlFor="user-password" required error={errors.password?.[0]} hint="Use at least 8 characters.">
          <Input id="user-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" />
        </FormField>}
        <FormField label="Phone" htmlFor="user-phone" error={errors.phone?.[0]}>
          <Input id="user-phone" value={phone} onChange={(event) => setPhone(event.target.value)} />
        </FormField>
        <FormField label="Role" htmlFor="user-role" required error={errors.role_id?.[0]}>
          <Select id="user-role" value={roleId} onChange={(event) => setRoleId(event.target.value)} placeholder="Select a role">
            {roles.map((role) => <option key={role.id} value={role.id}>{role.label}</option>)}
          </Select>
        </FormField>
        <Checkbox label="Active account" description="Inactive users cannot sign in." checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
      </div>
    </Modal>
  )
}

export default function UsersPage() {
  const { user: currentUser, hasPermission } = useAuth()
  const confirm = useConfirm()
  const toast = useToast()
  const queryClient = useQueryClient()
  const { setPage, resetPage, query } = usePagination()
  const [term, setTerm] = useState('')
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<User | null>(null)
  const [creating, setCreating] = useState(false)
  const canCreate = hasPermission('users.create')
  const canEdit = hasPermission('users.edit')
  const canDelete = hasPermission('users.delete')
  const params: UserListQuery = { ...query, search: search.trim() || undefined }
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['users', params],
    queryFn: () => userApi.list(params),
  })

  const remove = async (user: User) => {
    const confirmed = await confirm({ title: `Remove ${user.name}?`, message: 'This user will no longer be able to sign in.', confirmLabel: 'Remove user', tone: 'destructive' })
    if (!confirmed) return
    try {
      await userApi.remove(user.id)
      await queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('User removed', user.name)
    } catch (caught) {
      toast.error('Unable to remove user', getErrorMessage(caught))
    }
  }

  const columns: Column<User>[] = [
    { key: 'name', header: 'User', render: (row) => <div><p className="font-medium text-foreground">{row.name}</p><p className="text-xs text-muted-foreground">{row.email}</p></div> },
    { key: 'role', header: 'Role', render: (row) => <span>{row.role?.label ?? 'Unassigned'}</span> },
    { key: 'phone', header: 'Phone', render: (row) => <span className="text-muted-foreground">{row.phone ?? '—'}</span>, hideBelow: 'md' },
    { key: 'last_login_at', header: 'Last sign in', render: (row) => <span className="text-muted-foreground">{row.last_login_at ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(row.last_login_at)) : 'Never'}</span>, hideBelow: 'lg' },
    { key: 'is_active', header: 'Status', render: (row) => <StatusBadge status={row.is_active ? 'active' : 'inactive'} /> },
    ...((canEdit || canDelete) ? [{
      key: 'actions',
      header: '',
      align: 'right' as const,
      render: (row: User) => <span className="flex items-center justify-end gap-1.5">
        {canEdit && <button type="button" aria-label={`Edit ${row.name}`} onClick={() => setEditing(row)} className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border text-muted-foreground hover:bg-muted hover:text-foreground"><Pencil size={14} /></button>}
        {canDelete && row.id !== currentUser?.id && <button type="button" aria-label={`Remove ${row.name}`} onClick={() => void remove(row)} className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border text-muted-foreground hover:border-destructive/40 hover:text-destructive"><Trash2 size={14} /></button>}
      </span>,
    }] : []),
  ]

  return (
    <div className="space-y-6">
      <PageHeader title="Users" subtitle="Staff accounts and access control" actions={canCreate ? <Button icon={<Plus size={16} />} onClick={() => setCreating(true)}>Add user</Button> : undefined} />
      <SearchInput value={term} onChange={setTerm} onDebouncedChange={(value) => { setSearch(value); resetPage() }} placeholder="Search by name or email..." containerClassName="sm:max-w-sm" />
      <Table
        columns={columns}
        data={data?.data ?? []}
        loading={isLoading}
        rowKey={(row) => row.id}
        empty={<EmptyState icon={<UserCog size={22} />} title="No users found" description={search ? 'Try another name or email address.' : 'Create accounts for staff who need system access.'} action={canCreate ? <Button size="sm" onClick={() => setCreating(true)}>Add user</Button> : undefined} />}
      />
      {data && <Pagination meta={data.meta} onPageChange={setPage} disabled={isFetching} />}
      <UserFormModal open={creating} user={null} onClose={() => setCreating(false)} />
      <UserFormModal open={Boolean(editing)} user={editing} onClose={() => setEditing(null)} />
    </div>
  )
}
