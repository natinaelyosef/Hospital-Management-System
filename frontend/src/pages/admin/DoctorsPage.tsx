import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Stethoscope, Trash2 } from 'lucide-react'
import { getErrorMessage, getFieldErrors } from '@/api/client'
import { type DoctorInput, type DoctorListQuery, miscApi } from '@/api/misc.api'
import type { Doctor, DoctorSchedule } from '@/types'
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

const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

interface DoctorFormModalProps {
  open: boolean
  doctor: Doctor | null
  onClose: () => void
}

function DoctorFormModal({ open, doctor, onClose }: DoctorFormModalProps) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [licenseNumber, setLicenseNumber] = useState('')
  const [specialization, setSpecialization] = useState('')
  const [consultationFee, setConsultationFee] = useState('')
  const [phone, setPhone] = useState('')
  const [bio, setBio] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [schedules, setSchedules] = useState<DoctorSchedule[]>([])
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const { data: departments } = useQuery({
    queryKey: ['departments', { per_page: 100 }],
    queryFn: () => miscApi.departments.list({ per_page: 100 }),
  })

  useEffect(() => {
    if (!open) return
    setName(doctor?.name ?? '')
    setEmail(doctor?.email ?? '')
    setPassword('')
    setDepartmentId(doctor?.department_id ? String(doctor.department_id) : '')
    setLicenseNumber(doctor?.license_number ?? '')
    setSpecialization(doctor?.specialization ?? '')
    setConsultationFee(doctor ? String(doctor.consultation_fee) : '')
    setPhone(doctor?.phone ?? '')
    setBio(doctor?.bio ?? '')
    setIsActive(doctor?.is_active ?? true)
    setSchedules(doctor?.schedules.map((schedule) => ({ ...schedule })) ?? [])
    setErrors({})
    setFormError(null)
  }, [open, doctor])

  const mutation = useMutation({
    mutationFn: () => {
      const payload: DoctorInput = {
        name: name.trim(),
        email: email.trim() || null,
        department_id: departmentId ? Number(departmentId) : null,
        license_number: licenseNumber.trim(),
        specialization: specialization.trim(),
        consultation_fee: Number(consultationFee),
        phone: phone.trim() || null,
        bio: bio.trim() || null,
        is_active: isActive,
        schedules: schedules.map(({ day_of_week, start_time, end_time, slot_minutes, is_active }) => ({
          day_of_week,
          start_time,
          end_time,
          slot_minutes,
          is_active,
        })),
      }
      if (!doctor && password.trim()) payload.password = password
      return doctor ? miscApi.doctors.update(doctor.id, payload) : miscApi.doctors.create(payload)
    },
    onSuccess: async (saved) => {
      await queryClient.invalidateQueries({ queryKey: ['doctors'] })
      toast.success(doctor ? 'Doctor updated' : 'Doctor added', saved.name)
      onClose()
    },
    onError: (caught) => {
      const fieldErrors = getFieldErrors(caught)
      setErrors(fieldErrors)
      if (Object.keys(fieldErrors).length === 0) setFormError(getErrorMessage(caught, 'Unable to save doctor'))
    },
  })

  const submit = () => {
    const next: Record<string, string[]> = {}
    if (!name.trim()) next.name = ['Name is required.']
    if (!licenseNumber.trim()) next.license_number = ['License number is required.']
    if (!specialization.trim()) next.specialization = ['Specialization is required.']
    if (!Number.isFinite(Number(consultationFee)) || Number(consultationFee) < 0) {
      next.consultation_fee = ['Enter a valid consultation fee.']
    }
    schedules.forEach((schedule, index) => {
      if (!schedule.start_time || !schedule.end_time || schedule.start_time >= schedule.end_time) {
        next[`schedules.${index}.end_time`] = ['End time must be later than start time.']
      }
      if (!Number.isInteger(schedule.slot_minutes) || schedule.slot_minutes < 5 || schedule.slot_minutes > 720) {
        next[`schedules.${index}.slot_minutes`] = ['Slot length must be between 5 and 720 minutes.']
      }
    })
    setErrors(next)
    setFormError(null)
    if (Object.keys(next).length === 0) mutation.mutate()
  }

  const updateSchedule = (index: number, change: Partial<DoctorSchedule>) => {
    setSchedules((current) => current.map((schedule, row) => row === index ? { ...schedule, ...change } : schedule))
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={doctor ? `Edit ${doctor.name}` : 'Add doctor'}
      description="Doctor profile, department and appointment availability"
      size="xl"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>Cancel</Button>
          <Button onClick={submit} loading={mutation.isPending}>{doctor ? 'Save changes' : 'Add doctor'}</Button>
        </>
      }
    >
      <div className="space-y-5">
        {formError && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">{formError}</p>}
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Full name" htmlFor="doctor-name" required error={errors.name?.[0]}>
            <Input id="doctor-name" value={name} onChange={(event) => setName(event.target.value)} />
          </FormField>
          <FormField label="Email" htmlFor="doctor-email" error={errors.email?.[0]}>
            <Input id="doctor-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          </FormField>
          {!doctor && <FormField label="Initial password" htmlFor="doctor-password" hint="Leave blank to generate a temporary password.">
            <Input id="doctor-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" />
          </FormField>}
          <FormField label="Department" htmlFor="doctor-department" error={errors.department_id?.[0]}>
            <Select id="doctor-department" value={departmentId} onChange={(event) => setDepartmentId(event.target.value)}>
              <option value="">No department</option>
              {(departments?.data ?? []).map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
            </Select>
          </FormField>
          <FormField label="License number" htmlFor="doctor-license" required error={errors.license_number?.[0]}>
            <Input id="doctor-license" value={licenseNumber} onChange={(event) => setLicenseNumber(event.target.value)} />
          </FormField>
          <FormField label="Specialization" htmlFor="doctor-specialization" required error={errors.specialization?.[0]}>
            <Input id="doctor-specialization" value={specialization} onChange={(event) => setSpecialization(event.target.value)} />
          </FormField>
          <FormField label="Consultation fee" htmlFor="doctor-fee" required error={errors.consultation_fee?.[0]}>
            <Input id="doctor-fee" type="number" min="0" step="0.01" value={consultationFee} onChange={(event) => setConsultationFee(event.target.value)} />
          </FormField>
          <FormField label="Phone" htmlFor="doctor-phone" error={errors.phone?.[0]}>
            <Input id="doctor-phone" value={phone} onChange={(event) => setPhone(event.target.value)} />
          </FormField>
          <FormField label="Biography" htmlFor="doctor-bio" className="sm:col-span-2" error={errors.bio?.[0]}>
            <textarea id="doctor-bio" value={bio} onChange={(event) => setBio(event.target.value)} rows={3} className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40" />
          </FormField>
        </div>

        <div className="space-y-3 border-t pt-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold">Weekly schedule</h3>
              <p className="text-xs text-muted-foreground">Appointment slots use the selected duration.</p>
            </div>
            <Button size="sm" variant="outline" icon={<Plus size={14} />} onClick={() => setSchedules((rows) => [...rows, { day_of_week: 1, start_time: '09:00', end_time: '17:00', slot_minutes: 30, is_active: true }])}>Add time</Button>
          </div>
          {schedules.length === 0 ? <p className="rounded-lg border border-dashed px-3 py-4 text-center text-xs text-muted-foreground">No appointment hours configured.</p> : (
            <div className="space-y-2">
              {schedules.map((schedule, index) => (
                <div key={`${index}-${schedule.day_of_week}`} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[1.1fr_1fr_1fr_0.8fr_auto_auto] sm:items-end">
                  <FormField label="Day">
                    <Select value={schedule.day_of_week} onChange={(event) => updateSchedule(index, { day_of_week: Number(event.target.value) })}>
                      {weekdays.map((day, value) => <option key={day} value={value}>{day}</option>)}
                    </Select>
                  </FormField>
                  <FormField label="Starts">
                    <Input type="time" value={schedule.start_time.slice(0, 5)} onChange={(event) => updateSchedule(index, { start_time: event.target.value })} />
                  </FormField>
                  <FormField label="Ends" error={errors[`schedules.${index}.end_time`]?.[0]}>
                    <Input type="time" value={schedule.end_time.slice(0, 5)} onChange={(event) => updateSchedule(index, { end_time: event.target.value })} />
                  </FormField>
                  <FormField label="Slot (min)" error={errors[`schedules.${index}.slot_minutes`]?.[0]}>
                    <Input type="number" min="5" max="720" step="5" value={schedule.slot_minutes} onChange={(event) => updateSchedule(index, { slot_minutes: Number(event.target.value) })} />
                  </FormField>
                  <Checkbox label="Active" checked={schedule.is_active} onChange={(event) => updateSchedule(index, { is_active: event.target.checked })} />
                  <button type="button" aria-label={`Remove ${weekdays[schedule.day_of_week]} hours`} onClick={() => setSchedules((rows) => rows.filter((_, row) => row !== index))} className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 size={15} /></button>
                </div>
              ))}
            </div>
          )}
        </div>
        <Checkbox label="Active doctor" description="Inactive doctors are hidden from new appointment bookings." checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
      </div>
    </Modal>
  )
}

export default function DoctorsPage() {
  const { hasPermission } = useAuth()
  const confirm = useConfirm()
  const toast = useToast()
  const queryClient = useQueryClient()
  const { setPage, resetPage, query } = usePagination()
  const [term, setTerm] = useState('')
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<Doctor | null>(null)
  const [creating, setCreating] = useState(false)
  const canManage = hasPermission('doctors.manage')
  const params: DoctorListQuery = { ...query, search: search.trim() || undefined }
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['doctors', params],
    queryFn: () => miscApi.doctors.list(params),
  })

  const remove = async (doctor: Doctor) => {
    const confirmed = await confirm({
      title: `Remove ${doctor.name}?`,
      message: 'Doctors with upcoming appointments cannot be removed.',
      confirmLabel: 'Remove doctor',
      tone: 'destructive',
    })
    if (!confirmed) return
    try {
      await miscApi.doctors.remove(doctor.id)
      await queryClient.invalidateQueries({ queryKey: ['doctors'] })
      toast.success('Doctor removed', doctor.name)
    } catch (caught) {
      toast.error('Unable to remove doctor', getErrorMessage(caught))
    }
  }

  const columns: Column<Doctor>[] = [
    { key: 'name', header: 'Doctor', render: (row) => <div><p className="font-medium text-foreground">{row.name}</p><p className="text-xs text-muted-foreground">{row.email ?? row.phone ?? 'No contact details'}</p></div> },
    { key: 'specialization', header: 'Specialization', render: (row) => <span>{row.specialization}</span> },
    { key: 'department', header: 'Department', render: (row) => <span className="text-muted-foreground">{row.department?.name ?? 'Unassigned'}</span> },
    { key: 'license_number', header: 'License', render: (row) => <span className="font-mono text-xs">{row.license_number}</span>, hideBelow: 'lg' },
    { key: 'consultation_fee', header: 'Fee', align: 'right', render: (row) => <span className="font-medium">{formatCurrency(row.consultation_fee)}</span>, hideBelow: 'md' },
    { key: 'appointments_today', header: "Today's visits", align: 'center', render: (row) => <span className="tabular-nums">{row.appointments_today}</span>, hideBelow: 'sm' },
    { key: 'is_active', header: 'Status', render: (row) => <StatusBadge status={row.is_active ? 'active' : 'inactive'} /> },
    ...(canManage ? [{
      key: 'actions',
      header: '',
      align: 'right' as const,
      render: (row: Doctor) => <span className="flex items-center justify-end gap-1.5">
        <button type="button" aria-label={`Edit ${row.name}`} onClick={() => setEditing(row)} className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border text-muted-foreground hover:bg-muted hover:text-foreground"><Pencil size={14} /></button>
        <button type="button" aria-label={`Remove ${row.name}`} onClick={() => void remove(row)} className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border text-muted-foreground hover:border-destructive/40 hover:text-destructive"><Trash2 size={14} /></button>
      </span>,
    }] : []),
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Doctors"
        subtitle="Medical staff, appointment schedules and consultation fees"
        actions={canManage ? <Button icon={<Plus size={16} />} onClick={() => setCreating(true)}>Add doctor</Button> : undefined}
      />
      <SearchInput value={term} onChange={setTerm} onDebouncedChange={(value) => { setSearch(value); resetPage() }} placeholder="Search doctors, license or specialty..." containerClassName="sm:max-w-sm" />
      <Table
        columns={columns}
        data={data?.data ?? []}
        loading={isLoading}
        rowKey={(row) => row.id}
        empty={<EmptyState icon={<Stethoscope size={22} />} title="No doctors found" description={search ? 'Try another name, license or specialization.' : 'Add doctors to manage their profiles and appointment hours.'} action={canManage ? <Button size="sm" onClick={() => setCreating(true)}>Add doctor</Button> : undefined} />}
      />
      {data && <Pagination meta={data.meta} onPageChange={setPage} disabled={isFetching} />}
      <DoctorFormModal open={creating} doctor={null} onClose={() => setCreating(false)} />
      <DoctorFormModal open={Boolean(editing)} doctor={editing} onClose={() => setEditing(null)} />
    </div>
  )
}
