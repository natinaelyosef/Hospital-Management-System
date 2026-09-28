import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { KeyRound, Pencil, Plus, Trash2 } from 'lucide-react'
import { getErrorMessage, getFieldErrors } from '@/api/client'
import { userApi, type RoleInput } from '@/api/user.api'
import type { Role } from '@/types'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/ui/PageHeader'
import { PermissionGrid } from '@/components/modules/admin/PermissionGrid'
import { Table, type Column } from '@/components/ui/Table'
import { Textarea } from '@/components/ui/Textarea'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/contexts/AuthContext'
import { useConfirm } from '@/hooks/useConfirm'
import { statusLabel } from '@/utils/format'

interface RoleFormModalProps {
  open: boolean
  role: Role | null
  onClose: () => void
}

function RoleFormModal({ open, role, onClose }: RoleFormModalProps) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [name, setName] = useState('')
  const [label, setLabel] = useState('')
  const [description, setDescription] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const { data: permissions = [] } = useQuery({ queryKey: ['permissions'], queryFn: userApi.permissions })

  useEffect(() => {
    if (!open) return
    setName(role?.name ?? '')
    setLabel(role?.label ?? '')
    setDescription(role?.description ?? '')
    setSelected(role?.permissions ?? [])
    setErrors({})
    setFormError(null)
  }, [open, role])

  const mutation = useMutation({
    mutationFn: () => {
      const payload: RoleInput = {
        name: name.trim(),
        label: label.trim(),
        description: description.trim() || undefined,
        permissions: permissions.filter((permission) => selected.includes(permission.name)).map((permission) => permission.id),
      }
      return role ? userApi.updateRole(role.id, payload) : userApi.createRole(payload)
    },
    onSuccess: async (saved) => {
      await queryClient.invalidateQueries({ queryKey: ['roles'] })
      toast.success(role ? 'Role updated' : 'Role created', saved.label)
      onClose()
    },
    onError: (caught) => {
      const fieldErrors = getFieldErrors(caught)
      setErrors(fieldErrors)
      if (Object.keys(fieldErrors).length === 0) setFormError(getErrorMessage(caught, 'Unable to save role'))
    },
  })

  const submit = () => {
    const next: Record<string, string[]> = {}
    if (!name.trim()) next.name = ['Role identifier is required.']
    if (!label.trim()) next.label = ['Display name is required.']
    setErrors(next)
    setFormError(null)
    if (Object.keys(next).length === 0) mutation.mutate()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={role ? `Edit ${role.label}` : 'Create role'}
      description="Choose the permissions granted to this role"
      size="xl"
      footer={<><Button variant="outline" onClick={onClose} disabled={mutation.isPending}>Cancel</Button><Button onClick={submit} loading={mutation.isPending}>{role ? 'Save changes' : 'Create role'}</Button></>}
    >
      <div className="space-y-5">
        {formError && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">{formError}</p>}
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Display name" htmlFor="role-label" required error={errors.label?.[0]}>
            <Input id="role-label" value={label} onChange={(event) => setLabel(event.target.value)} placeholder="e.g. Ward Supervisor" />
          </FormField>
          <FormField label="Role identifier" htmlFor="role-name" required error={errors.name?.[0]} hint="Use lowercase letters and underscores.">
            <Input id="role-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. ward_supervisor" />
          </FormField>
          <FormField label="Description" htmlFor="role-description" className="sm:col-span-2" error={errors.description?.[0]}>
            <Textarea id="role-description" value={description} onChange={(event) => setDescription(event.target.value)} rows={2} />
          </FormField>
        </div>
        <div className="border-t pt-4">
          <h3 className="mb-3 text-sm font-semibold">Permissions</h3>
          <PermissionGrid permissions={permissions} value={selected} onChange={setSelected} />
        </div>
      </div>
    </Modal>
  )
}

export default function RolesPage() {
  const { hasPermission } = useAuth()
  const confirm = useConfirm()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<Role | null>(null)
  const [creating, setCreating] = useState(false)
  const canManage = hasPermission('roles.manage')
  const { data = [], isLoading } = useQuery({ queryKey: ['roles'], queryFn: userApi.roles })

  const remove = async (role: Role) => {
    const confirmed = await confirm({ title: `Delete ${role.label}?`, message: 'This role can only be deleted when no user is assigned to it.', confirmLabel: 'Delete role', tone: 'destructive' })
    if (!confirmed) return
    try {
      await userApi.removeRole(role.id)
      await queryClient.invalidateQueries({ queryKey: ['roles'] })
      toast.success('Role deleted', role.label)
    } catch (caught) {
      toast.error('Unable to delete role', getErrorMessage(caught))
    }
  }

  const columns: Column<Role>[] = [
    { key: 'label', header: 'Role', render: (row) => <div><p className="font-medium">{row.label}</p><p className="font-mono text-xs text-muted-foreground">{row.name}</p></div> },
    { key: 'description', header: 'Description', render: (row) => <span className="text-muted-foreground">{row.description ?? '—'}</span>, hideBelow: 'md' },
    { key: 'permissions', header: 'Access', render: (row) => <div className="flex max-w-lg flex-wrap gap-1">{row.permissions.slice(0, 4).map((permission) => <span key={permission} className="rounded-md border bg-muted/30 px-1.5 py-0.5 text-[10px] text-muted-foreground">{statusLabel(permission)}</span>)}{row.permissions.length > 4 && <span className="px-1.5 py-0.5 text-[10px] text-muted-foreground">+{row.permissions.length - 4}</span>}</div> },
    { key: 'users_count', header: 'Users', align: 'right', render: (row) => <span className="tabular-nums">{row.users_count}</span> },
    ...(canManage ? [{
      key: 'actions',
      header: '',
      align: 'right' as const,
      render: (row: Role) => <span className="flex items-center justify-end gap-1.5">
        <button type="button" aria-label={`Edit ${row.label}`} onClick={() => setEditing(row)} className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border text-muted-foreground hover:bg-muted hover:text-foreground"><Pencil size={14} /></button>
        {row.name !== 'admin' && <button type="button" aria-label={`Delete ${row.label}`} onClick={() => void remove(row)} className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border text-muted-foreground hover:border-destructive/40 hover:text-destructive"><Trash2 size={14} /></button>}
      </span>,
    }] : []),
  ]

  return (
    <div className="space-y-6">
      <PageHeader title="Roles" subtitle="Roles and permission sets" actions={canManage ? <Button icon={<Plus size={16} />} onClick={() => setCreating(true)}>Create role</Button> : undefined} />
      <Table columns={columns} data={data} loading={isLoading} rowKey={(row) => row.id} empty={<EmptyState icon={<KeyRound size={22} />} title="No roles found" description="Roles control access to hospital workflows." action={canManage ? <Button size="sm" onClick={() => setCreating(true)}>Create role</Button> : undefined} />} />
      <RoleFormModal open={creating} role={null} onClose={() => setCreating(false)} />
      <RoleFormModal open={Boolean(editing)} role={editing} onClose={() => setEditing(null)} />
    </div>
  )
}
