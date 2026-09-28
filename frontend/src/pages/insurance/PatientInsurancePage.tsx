import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FileCheck, Pencil, Plus } from 'lucide-react'
import { getFieldErrors, getErrorMessage } from '@/api/client'
import { insuranceApi, type PatientInsuranceInput, type PatientInsuranceListQuery } from '@/api/insurance.api'
import type { InsuranceCompany, Patient, PatientInsurance } from '@/types'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { EmptyState } from '@/components/ui/EmptyState'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/ui/PageHeader'
import { Pagination } from '@/components/ui/Pagination'
import { Select } from '@/components/ui/Select'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Table, type Column } from '@/components/ui/Table'
import { useToast } from '@/components/ui'
import { PatientPicker } from '@/components/modules/finance/PatientPicker'
import { useAuth } from '@/contexts/AuthContext'
import { usePagination } from '@/hooks/usePagination'
import { formatCurrency, formatDate } from '@/utils/format'

const LOOKUP = { page: 1, per_page: 100 }

function useCompanyOptions() {
  return useQuery({
    queryKey: ['insurance-companies', LOOKUP],
    queryFn: () => insuranceApi.companies(LOOKUP),
    staleTime: 5 * 60_000,
  })
}

interface PolicyFormModalProps {
  open: boolean
  policy: PatientInsurance | null
  onClose: () => void
}

function PolicyFormModal({ open, policy, onClose }: PolicyFormModalProps) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const { data: companies } = useCompanyOptions()
  const [patient, setPatient] = useState<Patient | null>(null)
  const [form, setForm] = useState({
    company_id: '',
    policy_number: '',
    holder_name: '',
    coverage_percent: '70',
    coverage_limit: '',
    start_date: '',
    end_date: '',
    is_active: true,
  })
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setPatient(policy?.patient ?? null)
    setForm({
      company_id: policy ? String(policy.company.id) : '',
      policy_number: policy?.policy_number ?? '',
      holder_name: policy?.holder_name ?? '',
      coverage_percent: policy ? String(policy.coverage_percent) : '70',
      coverage_limit: policy?.coverage_limit != null ? String(policy.coverage_limit) : '',
      start_date: policy?.start_date ?? '',
      end_date: policy?.end_date ?? '',
      is_active: policy?.is_active ?? true,
    })
    setErrors({})
    setFormError(null)
  }, [open, policy])

  const companyOptions = (companies?.data ?? []).map((company) => ({ value: company.id, label: company.name }))

  const mutation = useMutation({
    mutationFn: () => {
      const payload: PatientInsuranceInput = {
        patient_id: patient!.id,
        company_id: Number(form.company_id),
        policy_number: form.policy_number.trim(),
        holder_name: form.holder_name.trim(),
        coverage_percent: Number(form.coverage_percent),
        coverage_limit: form.coverage_limit ? Number(form.coverage_limit) : null,
        start_date: form.start_date,
        end_date: form.end_date || null,
        is_active: form.is_active,
      }
      return policy ? insuranceApi.updatePolicy(policy.id, payload) : insuranceApi.createPolicy(payload)
    },
    onSuccess: async (saved) => {
      await queryClient.invalidateQueries({ queryKey: ['patient-insurances'] })
      toast.success(policy ? 'Policy updated' : 'Policy added', saved.policy_number)
      onClose()
    },
    onError: (caught) => {
      const fieldErrors = getFieldErrors(caught)
      setErrors(fieldErrors)
      if (Object.keys(fieldErrors).length === 0) setFormError(getErrorMessage(caught, 'Unable to save policy'))
    },
  })

  const submit = () => {
    const next: Record<string, string[]> = {}
    if (!patient) next.patient_id = ['Select a patient.']
    if (!form.company_id) next.company_id = ['Select an insurance company.']
    if (!form.policy_number.trim()) next.policy_number = ['Policy number is required.']
    if (!form.holder_name.trim()) next.holder_name = ['Holder name is required.']
    if (!form.start_date) next.start_date = ['Start date is required.']
    const coverage = Number(form.coverage_percent)
    if (!Number.isFinite(coverage) || coverage <= 0 || coverage > 100) next.coverage_percent = ['Enter a percentage between 1 and 100.']
    setErrors(next)
    setFormError(null)
    if (Object.keys(next).length === 0 && patient) mutation.mutate()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={policy ? 'Edit policy' : 'New policy'}
      description="Cover a patient under an insurance company"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button onClick={submit} loading={mutation.isPending}>
            {policy ? 'Save changes' : 'Add policy'}
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
          <PatientPicker value={patient} onChange={setPatient} error={errors.patient_id?.[0]} />
          <FormField label="Insurance company" htmlFor="policy-company" required error={errors.company_id?.[0]}>
            <Select
              id="policy-company"
              value={form.company_id}
              onChange={(event) => setForm({ ...form, company_id: event.target.value })}
              placeholder="Select company"
              options={companyOptions}
            />
          </FormField>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Policy number" htmlFor="policy-number" required error={errors.policy_number?.[0]}>
            <Input
              id="policy-number"
              value={form.policy_number}
              onChange={(event) => setForm({ ...form, policy_number: event.target.value })}
              placeholder="e.g. NYL-88921"
            />
          </FormField>
          <FormField label="Holder name" htmlFor="policy-holder" required error={errors.holder_name?.[0]}>
            <Input
              id="policy-holder"
              value={form.holder_name}
              onChange={(event) => setForm({ ...form, holder_name: event.target.value })}
              placeholder="Primary member"
            />
          </FormField>
          <FormField label="Coverage %" htmlFor="policy-coverage" required error={errors.coverage_percent?.[0]}>
            <Input
              id="policy-coverage"
              type="number"
              min={1}
              max={100}
              value={form.coverage_percent}
              onChange={(event) => setForm({ ...form, coverage_percent: event.target.value })}
            />
          </FormField>
          <FormField label="Coverage limit" htmlFor="policy-limit" hint="Leave empty for no limit" error={errors.coverage_limit?.[0]}>
            <Input
              id="policy-limit"
              type="number"
              min={0}
              value={form.coverage_limit}
              onChange={(event) => setForm({ ...form, coverage_limit: event.target.value })}
            />
          </FormField>
          <FormField label="Start date" htmlFor="policy-start" required error={errors.start_date?.[0]}>
            <Input
              id="policy-start"
              type="date"
              value={form.start_date}
              onChange={(event) => setForm({ ...form, start_date: event.target.value })}
            />
          </FormField>
          <FormField label="End date" htmlFor="policy-end" hint="Optional" error={errors.end_date?.[0]}>
            <Input
              id="policy-end"
              type="date"
              value={form.end_date}
              onChange={(event) => setForm({ ...form, end_date: event.target.value })}
            />
          </FormField>
        </div>
        <Checkbox
          label="Active policy"
          description="Currently valid for claims"
          checked={form.is_active}
          onChange={(event) => setForm({ ...form, is_active: event.target.checked })}
        />
      </div>
    </Modal>
  )
}

export default function PatientInsurancePage() {
  const { hasPermission } = useAuth()
  const { setPage, query } = usePagination()

  const [companyFilter, setCompanyFilter] = useState('')
  const [editing, setEditing] = useState<PatientInsurance | null>(null)
  const [creating, setCreating] = useState(false)

  const { data: companies } = useCompanyOptions()

  const params: PatientInsuranceListQuery = {
    ...query,
    company_id: companyFilter ? Number(companyFilter) : undefined,
  }

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['patient-insurances', params],
    queryFn: () => insuranceApi.policies(params),
  })

  const canManage = hasPermission('insurance.manage')

  const columns: Column<PatientInsurance>[] = [
    {
      key: 'patient',
      header: 'Patient',
      render: (row) => (
        <span className="flex flex-col">
          <span className="font-medium text-foreground">{row.patient.full_name}</span>
          <span className="text-[11px] text-muted-foreground">{row.patient.patient_number}</span>
        </span>
      ),
    },
    { key: 'company', header: 'Company', render: (row) => <span className="text-foreground">{row.company.name}</span> },
    { key: 'policy_number', header: 'Policy #', render: (row) => <span className="font-mono text-xs font-semibold">{row.policy_number}</span> },
    {
      key: 'coverage_percent',
      header: 'Coverage',
      align: 'right',
      render: (row) => (
        <span className="font-semibold">
          {row.coverage_percent}%
          {row.coverage_limit != null && (
            <span className="ml-1 text-[11px] font-normal text-muted-foreground">/ {formatCurrency(row.coverage_limit)}</span>
          )}
        </span>
      ),
    },
    {
      key: 'start_date',
      header: 'Period',
      hideBelow: 'sm',
      render: (row) => (
        <span className="text-muted-foreground">
          {formatDate(row.start_date)} → {row.end_date ? formatDate(row.end_date) : 'open'}
        </span>
      ),
    },
    { key: 'is_active', header: 'Status', render: (row) => <StatusBadge status={row.is_active ? 'active' : 'inactive'} /> },
    ...(canManage
      ? [
          {
            key: 'actions',
            header: '',
            align: 'right' as const,
            render: (row: PatientInsurance) => (
              <span className="flex items-center justify-end">
                <button
                  type="button"
                  aria-label="Edit policy"
                  onClick={() => setEditing(row)}
                  className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <Pencil size={14} />
                </button>
              </span>
            ),
          },
        ]
      : []),
  ]

  const hasFilters = Boolean(companyFilter)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Patient policies"
        subtitle="Insurance coverage per patient"
        actions={
          canManage ? (
            <Button icon={<Plus size={16} />} onClick={() => setCreating(true)}>
              New policy
            </Button>
          ) : undefined
        }
      />

      <Select
        value={companyFilter}
        onChange={(event) => setCompanyFilter(event.target.value)}
        options={[
          { value: '', label: 'All companies' },
          ...(companies?.data ?? []).map((company: InsuranceCompany) => ({ value: company.id, label: company.name })),
        ]}
        aria-label="Filter by insurance company"
        className="sm:w-64"
      />

      <Table
        columns={columns}
        data={data?.data ?? []}
        loading={isLoading}
        rowKey={(row) => row.id}
        empty={
          <EmptyState
            icon={<FileCheck size={22} />}
            title="No policies found"
            description={hasFilters ? 'No policy for the selected company.' : 'Cover a patient to get started.'}
            action={
              canManage ? (
                <Button size="sm" onClick={() => setCreating(true)}>
                  New policy
                </Button>
              ) : undefined
            }
          />
        }
      />

      {data && <Pagination meta={data.meta} onPageChange={setPage} disabled={isFetching} />}

      <PolicyFormModal open={creating} policy={null} onClose={() => setCreating(false)} />
      <PolicyFormModal open={Boolean(editing)} policy={editing} onClose={() => setEditing(null)} />
    </div>
  )
}
