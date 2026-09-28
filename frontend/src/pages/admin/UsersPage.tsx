import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
<<<<<<< HEAD
import { Ban, Check, CheckCircle2, Copy, KeyRound, MailPlus, MoreHorizontal, Pencil, Plus, Send, Trash2, UserCog } from 'lucide-react'
import { getErrorMessage, getFieldErrors } from '@/api/client'
import { userApi, type InviteResponse, type UserListQuery } from '@/api/user.api'
import type { User, UserStatus } from '@/types'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { Dropdown } from '@/components/ui/Dropdown'
=======
import { Pencil, Plus, Trash2, UserCog } from 'lucide-react'
import { getErrorMessage, getFieldErrors } from '@/api/client'
import { userApi, type UserListQuery } from '@/api/user.api'
import type { User } from '@/types'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
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
<<<<<<< HEAD
import { Textarea } from '@/components/ui/Textarea'
import { useToast } from '@/components/ui/Toast'
import { Can } from '@/components/auth/Can'
=======
import { useToast } from '@/components/ui/Toast'
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
import { useAuth } from '@/contexts/AuthContext'
import { useConfirm } from '@/hooks/useConfirm'
import { usePagination } from '@/hooks/usePagination'

<<<<<<< HEAD
const STATUS_OPTIONS: Array<{ value: UserStatus | ''; label: string }> = [
  { value: '', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'pending', label: 'Pending' },
]

=======
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
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
<<<<<<< HEAD
  const [status, setStatus] = useState<UserStatus>('active')
=======
  const [isActive, setIsActive] = useState(true)
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
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
<<<<<<< HEAD
    setStatus(user?.status ?? 'active')
=======
    setIsActive(user?.is_active ?? true)
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
    setErrors({})
    setFormError(null)
  }, [open, user])

  const mutation = useMutation({
    mutationFn: () => user
<<<<<<< HEAD
      ? userApi.update(user.id, { name: name.trim(), email: email.trim(), phone: phone.trim() || undefined, role_id: Number(roleId), status })
      : userApi.create({ name: name.trim(), email: email.trim(), password, phone: phone.trim() || undefined, role_id: Number(roleId), status }),
=======
      ? userApi.update(user.id, { name: name.trim(), email: email.trim(), phone: phone.trim() || undefined, role_id: Number(roleId), is_active: isActive })
      : userApi.create({ name: name.trim(), email: email.trim(), password, phone: phone.trim() || undefined, role_id: Number(roleId), is_active: isActive }),
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
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
<<<<<<< HEAD
      description="Account details, role assignment and lifecycle status"
=======
      description="Staff account details and role assignment"
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
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
<<<<<<< HEAD
        <FormField label="Role" htmlFor="user-role" required error={errors.role_id?.[0]} hint="Any number of users may share the same role.">
=======
        <FormField label="Role" htmlFor="user-role" required error={errors.role_id?.[0]}>
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
          <Select id="user-role" value={roleId} onChange={(event) => setRoleId(event.target.value)} placeholder="Select a role">
            {roles.map((role) => <option key={role.id} value={role.id}>{role.label}</option>)}
          </Select>
        </FormField>
<<<<<<< HEAD
        <FormField label="Account status" htmlFor="user-status" error={errors.status?.[0]} hint="Only Active accounts can sign in.">
          <Select id="user-status" value={status} onChange={(event) => setStatus(event.target.value as UserStatus)}>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="inactive">Inactive</option>
          </Select>
        </FormField>
        {user?.status === 'suspended' && user.suspension_reason && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            Suspended: {user.suspension_reason}
          </div>
        )}
        {!user && <Checkbox label="Active account" description="Inactive users cannot sign in." checked={status === 'active'} onChange={(event) => setStatus(event.target.checked ? 'active' : 'inactive')} />}
=======
        <Checkbox label="Active account" description="Inactive users cannot sign in." checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
      </div>
    </Modal>
  )
}

<<<<<<< HEAD
interface ReasonModalProps {  open: boolean
  title: string
  description: string
  label: string
  placeholder?: string
  confirmLabel: string
  required?: boolean
  tone?: 'destructive' | 'primary'
  onSubmit: (reason: string) => Promise<void>
  onClose: () => void
}

function ReasonModal({ open, title, description, label, placeholder, confirmLabel, required = true, tone = 'primary', onSubmit, onClose }: ReasonModalProps) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (!open) return
    setReason('')
    setError(null)
  }, [open])

  const submit = async () => {
    if (required && reason.trim().length < 5) {
      setError('Please give a reason of at least 5 characters.')
      return
    }
    setError(null)
    setPending(true)
    try {
      await onSubmit(reason.trim())
      onClose()
    } catch (caught) {
      setError(getErrorMessage(caught, 'Unable to complete the action'))
    } finally {
      setPending(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={pending}>Cancel</Button>
          <Button variant={tone} onClick={() => void submit()} loading={pending}>{confirmLabel}</Button>
        </>
      }
    >
      <div className="space-y-3">
        {error && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">{error}</p>}
        <FormField label={label} htmlFor="reason-input" required={required} hint="Stored in the audit trail.">
          <Textarea id="reason-input" rows={3} value={reason} onChange={(event) => setReason(event.target.value)} placeholder={placeholder} />
        </FormField>
      </div>
    </Modal>
  )
}

function InviteModal({ open, onClose, onInvited }: { open: boolean; onClose: () => void; onInvited: (invite: InviteResponse) => void }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [roleId, setRoleId] = useState('')
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const { data: roles = [] } = useQuery({ queryKey: ['roles'], queryFn: userApi.roles })

  useEffect(() => {
    if (!open) return
    setName('')
    setEmail('')
    setPhone('')
    setRoleId('')
    setErrors({})
    setFormError(null)
  }, [open ])

  const submit = async () => {
    const next: Record<string, string[]> = {}
    if (!name.trim()) next.name = ['Name is required.']
    if (!email.trim()) next.email = ['Email is required.']
    if (!roleId) next.role_id = ['Select a role.']
    setErrors(next)
    setFormError(null)
    if (Object.keys(next).length > 0) return

    setPending(true)
    try {
      const invite = await userApi.invite({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        role_id: Number(roleId),
      })
      onInvited(invite)
      onClose()
    } catch (caught) {
      const fieldErrors = getFieldErrors(caught)
      setErrors(fieldErrors)
      if (Object.keys(fieldErrors).length === 0) setFormError(getErrorMessage(caught, 'Unable to send invitation'))
    } finally {
      setPending(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Invite staff member"
      description="Creates a pending account — the invitee sets their own password from the link"
      footer={<><Button variant="outline" onClick={onClose} disabled={pending}>Cancel</Button><Button icon={<Send size={15} />} onClick={() => void submit()} loading={pending}>Send invitation</Button></>}
    >
      <div className="space-y-4">
        {formError && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">{formError}</p>}
        <FormField label="Full name" htmlFor="invite-name" required error={errors.name?.[0]}>
          <Input id="invite-name" value={name} onChange={(event) => setName(event.target.value)} autoComplete="off" />
        </FormField>
        <FormField label="Email" htmlFor="invite-email" required error={errors.email?.[0]} hint="The invitee signs in with this address.">
          <Input id="invite-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="off" />
        </FormField>
        <FormField label="Phone" htmlFor="invite-phone" error={errors.phone?.[0]}>
          <Input id="invite-phone" value={phone} onChange={(event) => setPhone(event.target.value)} autoComplete="off" />
        </FormField>
        <FormField label="Role" htmlFor="invite-role" required error={errors.role_id?.[0]} hint="Controls what the invitee can access once they join.">
          <Select id="invite-role" value={roleId} onChange={(event) => setRoleId(event.target.value)} placeholder="Select a role">
            {roles.map((role) => <option key={role.id} value={role.id}>{role.label}</option>)}
          </Select>
        </FormField>
      </div>
    </Modal>
  )
}

function InviteLinkModal({ invite, onClose }: { invite: InviteResponse | null; onClose: () => void }) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (invite) setCopied(false)
  }, [invite])

  const copy = async () => {
    if (!invite) return
    try {
      await navigator.clipboard.writeText(invite.invite_url)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <Modal
      open={Boolean(invite)}
      onClose={onClose}
      title="Invitation ready"
      description={invite ? `Share this single-use link with ${invite.user.name} — it is shown only once.` : undefined}
      footer={<Button onClick={onClose}>Done</Button>}
    >
      {invite && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Input value={invite.invite_url} readOnly aria-label="Invitation link" className="font-mono text-xs" />
            <Button variant="outline" size="sm" icon={copied ? <Check size={14} /> : <Copy size={14} />} onClick={() => void copy()}>
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            The account stays <span className="font-medium text-foreground">pending</span> until the link is used.
            Re-sending an invitation invalidates the previous link immediately.
          </p>
        </div>
      )}
    </Modal>
  )
}

export default function UsersPage() {
  const { user: currentUser, hasPermission, hasRole } = useAuth()
=======
export default function UsersPage() {
  const { user: currentUser, hasPermission } = useAuth()
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
  const confirm = useConfirm()
  const toast = useToast()
  const queryClient = useQueryClient()
  const { setPage, resetPage, query } = usePagination()
  const [term, setTerm] = useState('')
  const [search, setSearch] = useState('')
<<<<<<< HEAD
  const [roleId, setRoleId] = useState('')
  const [status, setStatus] = useState<UserStatus | ''>('')
  const [editing, setEditing] = useState<User | null>(null)
  const [creating, setCreating] = useState(false)
  const [inviting, setInviting] = useState(false)
  const [inviteLink, setInviteLink] = useState<InviteResponse | null>(null)
  const [suspending, setSuspending] = useState<User | null>(null)
  const [deleting, setDeleting] = useState<User | null>(null)
  const [resetting, setResetting] = useState<User | null>(null)
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null)
  const canEdit = hasPermission('users.edit')
  const canDelete = hasPermission('users.delete')
  const params: UserListQuery = {
    ...query,
    search: search.trim() || undefined,
    role_id: roleId ? Number(roleId) : undefined,
    status: status || undefined,
  }
  const { data: roles = [] } = useQuery({ queryKey: ['roles'], queryFn: userApi.roles })
=======
  const [editing, setEditing] = useState<User | null>(null)
  const [creating, setCreating] = useState(false)
  const canCreate = hasPermission('users.create')
  const canEdit = hasPermission('users.edit')
  const canDelete = hasPermission('users.delete')
  const params: UserListQuery = { ...query, search: search.trim() || undefined }
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['users', params],
    queryFn: () => userApi.list(params),
  })

<<<<<<< HEAD
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['users'] })

  /** Super Administrator accounts are only manageable by another Super Administrator. */
  const canManage = (target: User) =>
    canEdit && target.id !== currentUser?.id && (target.role?.name !== 'super_admin' || hasRole('super_admin'))

  const remove = async (target: User, reason: string) => {
    await userApi.remove(target.id, reason || undefined)
    await invalidate()
    toast.success('Account removed', `${target.name} can no longer sign in. Clinical records are preserved.`)
  }

  const suspend = async (target: User, reason: string) => {
    await userApi.suspend(target.id, reason)
    await invalidate()
    toast.success('Account suspended', target.name)
  }

  const activate = async (target: User) => {
    try {
      await userApi.activate(target.id)
      await invalidate()
      toast.success('Account activated', target.name)
    } catch (caught) {
      toast.error('Unable to activate account', getErrorMessage(caught))
    }
  }

  const resetPassword = async (target: User) => {    try {
      const result = await userApi.resetPassword(target.id)
      setGeneratedPassword(result.password)
      await invalidate()
    } catch (caught) {
      toast.error('Unable to reset password', getErrorMessage(caught))
      setResetting(null)
    }
  }

  const resendInvite = async (target: User) => {
    try {
      const result = await userApi.resendInvite(target.id)
      setInviteLink(result)
      await invalidate()
      toast.success('Invitation re-sent', `The previous link for ${target.name} stopped working.`)
    } catch (caught) {
      toast.error('Unable to re-send invitation', getErrorMessage(caught))
    }
  }

  const confirmRemove = async (target: User) => {
    const confirmed = await confirm({
      title: `Remove ${target.name}?`,
      message: 'Their sign-in account is deactivated and hidden, but every clinical and financial record is preserved.',
      confirmLabel: 'Continue',
      tone: 'destructive',
    })
    if (confirmed) setDeleting(target)
  }

=======
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

>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
  const columns: Column<User>[] = [
    { key: 'name', header: 'User', render: (row) => <div><p className="font-medium text-foreground">{row.name}</p><p className="text-xs text-muted-foreground">{row.email}</p></div> },
    { key: 'role', header: 'Role', render: (row) => <span>{row.role?.label ?? 'Unassigned'}</span> },
    { key: 'phone', header: 'Phone', render: (row) => <span className="text-muted-foreground">{row.phone ?? '—'}</span>, hideBelow: 'md' },
    { key: 'last_login_at', header: 'Last sign in', render: (row) => <span className="text-muted-foreground">{row.last_login_at ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(row.last_login_at)) : 'Never'}</span>, hideBelow: 'lg' },
<<<<<<< HEAD
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <span className="inline-flex flex-col gap-0.5">
          <StatusBadge status={row.status} />
          {row.status === 'suspended' && row.suspension_reason && (
            <span className="max-w-40 truncate text-[11px] text-muted-foreground" title={row.suspension_reason}>{row.suspension_reason}</span>
          )}
        </span>
      ),
    },
=======
    { key: 'is_active', header: 'Status', render: (row) => <StatusBadge status={row.is_active ? 'active' : 'inactive'} /> },
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
    ...((canEdit || canDelete) ? [{
      key: 'actions',
      header: '',
      align: 'right' as const,
<<<<<<< HEAD
      render: (row: User) => (
        <span className="flex items-center justify-end gap-1.5">
          {canManage(row) || (canDelete && row.id !== currentUser?.id && (row.role?.name !== 'super_admin' || hasRole('super_admin'))) ? (
            <Dropdown
              align="right"
              trigger={
                <button type="button" aria-label={`Actions for ${row.name}`} className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border text-muted-foreground hover:bg-muted hover:text-foreground">
                  <MoreHorizontal size={15} />
                </button>
              }
            >
              {(close) => (
                <div className="flex flex-col">
                  {canEdit && (
                    <button type="button" onClick={() => { setEditing(row); close() }} className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium hover:bg-muted">
                      <Pencil size={13} /> Edit account
                    </button>
                  )}
                  {canManage(row) && row.status === 'pending' && (
                    <button type="button" onClick={() => { close(); void resendInvite(row) }} className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium hover:bg-muted">
                      <MailPlus size={13} /> Re-send invite
                    </button>
                  )}
                  {canManage(row) && row.status === 'suspended' && (
                    <button type="button" onClick={() => { void activate(row); close() }} className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium hover:bg-muted">
                      <CheckCircle2 size={13} /> Reactivate
                    </button>
                  )}
                  {canManage(row) && row.status !== 'suspended' && (
                    <button type="button" onClick={() => { setSuspending(row); close() }} className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-destructive hover:bg-destructive/10">
                      <Ban size={13} /> Suspend
                    </button>
                  )}
                  {canManage(row) && (
                    <button type="button" onClick={() => { setResetting(row); close() }} className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium hover:bg-muted">
                      <KeyRound size={13} /> Reset password
                    </button>
                  )}
                  {canDelete && row.id !== currentUser?.id && (row.role?.name !== 'super_admin' || hasRole('super_admin')) && (
                    <button type="button" onClick={() => { close(); void confirmRemove(row) }} className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-destructive hover:bg-destructive/10">
                      <Trash2 size={13} /> Remove account
                    </button>
                  )}
                </div>
              )}
            </Dropdown>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </span>
      ),
=======
      render: (row: User) => <span className="flex items-center justify-end gap-1.5">
        {canEdit && <button type="button" aria-label={`Edit ${row.name}`} onClick={() => setEditing(row)} className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border text-muted-foreground hover:bg-muted hover:text-foreground"><Pencil size={14} /></button>}
        {canDelete && row.id !== currentUser?.id && <button type="button" aria-label={`Remove ${row.name}`} onClick={() => void remove(row)} className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border text-muted-foreground hover:border-destructive/40 hover:text-destructive"><Trash2 size={14} /></button>}
      </span>,
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
    }] : []),
  ]

  return (
    <div className="space-y-6">
<<<<<<< HEAD
      <PageHeader
        title="Users"
        subtitle="Every role can hold any number of accounts"
        actions={
          <Can permission="users.create">
            <span className="flex flex-wrap items-center gap-2.5">
              <Button variant="outline" icon={<MailPlus size={16} />} onClick={() => setInviting(true)}>Invite user</Button>
              <Button icon={<Plus size={16} />} onClick={() => setCreating(true)}>Add user</Button>
            </span>
          </Can>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput value={term} onChange={setTerm} onDebouncedChange={(value) => { setSearch(value); resetPage() }} placeholder="Search users..." containerClassName="sm:max-w-sm" />
        <div className="flex flex-wrap gap-2">
          <Select value={roleId} onChange={(event) => { setRoleId(event.target.value); resetPage() }} aria-label="Filter by role" className="w-auto min-w-40">
            <option value="">All roles</option>
            {roles.map((role) => <option key={role.id} value={role.id}>{role.label}</option>)}
          </Select>
          <Select value={status} onChange={(event) => { setStatus(event.target.value as UserStatus | ''); resetPage() }} aria-label="Filter by status" className="w-auto min-w-36">
            {STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </Select>
        </div>
      </div>

=======
      <PageHeader title="Users" subtitle="Staff accounts and access control" actions={canCreate ? <Button icon={<Plus size={16} />} onClick={() => setCreating(true)}>Add user</Button> : undefined} />
      <SearchInput value={term} onChange={setTerm} onDebouncedChange={(value) => { setSearch(value); resetPage() }} placeholder="Search by name or email..." containerClassName="sm:max-w-sm" />
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
      <Table
        columns={columns}
        data={data?.data ?? []}
        loading={isLoading}
        rowKey={(row) => row.id}
<<<<<<< HEAD
        empty={<EmptyState icon={<UserCog size={22} />} title="No users found" description={search || roleId || status ? 'Try clearing the filters.' : 'Create accounts for staff who need system access.'} action={<Can permission="users.create"><Button size="sm" onClick={() => setCreating(true)}>Add user</Button></Can>} />}
      />
      {data && <Pagination meta={data.meta} onPageChange={setPage} disabled={isFetching} />}

      <UserFormModal open={creating} user={null} onClose={() => setCreating(false)} />
      <UserFormModal open={Boolean(editing)} user={editing} onClose={() => setEditing(null)} />

      <InviteModal
        open={inviting}
        onClose={() => setInviting(false)}
        onInvited={(invite) => { setInviteLink(invite); void invalidate() }}
      />
      <InviteLinkModal invite={inviteLink} onClose={() => setInviteLink(null)} />

      <ReasonModal
        open={Boolean(suspending)}
        title={suspending ? `Suspend ${suspending.name}?` : ''}
        description="The account cannot sign in and every active session is revoked."
        label="Suspension reason"
        placeholder="Temporary account suspension pending administrative review."
        confirmLabel="Suspend account"
        tone="destructive"
        onSubmit={(reason) => suspend(suspending!, reason)}
        onClose={() => setSuspending(null)}
      />

      <ReasonModal
        open={Boolean(deleting)}
        title={deleting ? `Remove ${deleting.name}?` : ''}
        description="The sign-in account is soft-deleted. Medical history, prescriptions, results and invoices are never erased."
        label="Deletion reason"
        placeholder="Employee left the hospital."
        confirmLabel="Remove account"
        tone="destructive"
        required={false}
        onSubmit={(reason) => remove(deleting!, reason)}
        onClose={() => setDeleting(null)}
      />

      <Modal
        open={Boolean(resetting)}
        onClose={() => { setResetting(null); setGeneratedPassword(null) }}
        title={generatedPassword ? 'New password generated' : 'Reset password'}
        description={generatedPassword ? 'Share it securely — it is shown only once.' : 'The user will be signed out of every device.'}
        footer={
          generatedPassword
            ? <Button onClick={() => { setResetting(null); setGeneratedPassword(null) }}>Done</Button>
            : <>
                <Button variant="outline" onClick={() => setResetting(null)}>Cancel</Button>
                <Button onClick={() => void resetPassword(resetting!)}>Reset password</Button>
              </>
        }
      >
        {generatedPassword ? (
          <div className="space-y-3">
            <code className="block select-all rounded-lg border bg-muted px-4 py-3 text-center text-sm font-semibold tracking-widest text-foreground">
              {generatedPassword}
            </code>
            <p className="text-center text-xs text-muted-foreground">Sign in with this password, then change it from Profile.</p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            A strong password will be generated for <span className="font-medium text-foreground">{resetting?.name}</span> and returned once.
          </p>
        )}
      </Modal>
=======
        empty={<EmptyState icon={<UserCog size={22} />} title="No users found" description={search ? 'Try another name or email address.' : 'Create accounts for staff who need system access.'} action={canCreate ? <Button size="sm" onClick={() => setCreating(true)}>Add user</Button> : undefined} />}
      />
      {data && <Pagination meta={data.meta} onPageChange={setPage} disabled={isFetching} />}
      <UserFormModal open={creating} user={null} onClose={() => setCreating(false)} />
      <UserFormModal open={Boolean(editing)} user={editing} onClose={() => setEditing(null)} />
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
    </div>
  )
}
