import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ClipboardCheck, Plus } from 'lucide-react'
import { billingApi } from '@/api/billing.api'
import { getFieldErrors, getErrorMessage } from '@/api/client'
import { insuranceApi, type ClaimInput, type ClaimListQuery } from '@/api/insurance.api'
import type { InsuranceClaim, InsuranceClaimStatus } from '@/types'
import { Button } from '@/components/ui/Button'
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
import { Textarea } from '@/components/ui/Textarea'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/contexts/AuthContext'
import { useConfirm } from '@/hooks/useConfirm'
import { usePagination } from '@/hooks/usePagination'
import { formatCurrency, formatDate, statusLabel } from '@/utils/format'

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'paid', label: 'Paid' },
]

/** Mirrors the transitions the API accepts; anything else stays disabled. */
const ALLOWED: Record<InsuranceClaimStatus, InsuranceClaimStatus[]> = {
  draft: ['submitted', 'rejected'],
  submitted: ['approved', 'rejected'],
  approved: ['paid'],
  rejected: ['submitted'],
  paid: [],
}

interface ClaimFormModalProps {
  open: boolean
  onClose: () => void
}

function ClaimFormModal({ open, onClose }: ClaimFormModalProps) {
  const queryClient = useQueryClient()
  const toast = useToast()

  const [invoiceId, setInvoiceId] = useState('')
  const [policyId, setPolicyId] = useState('')
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [formError, setFormError] = useState<string | null>(null)

  const invoices = useQuery({
    queryKey: ['invoices', 'claim-options'],
    queryFn: async () => {
      const [unpaid, partial] = await Promise.all([
        billingApi.invoices({ status: 'unpaid', per_page: 100 }),
        billingApi.invoices({ status: 'partial', per_page: 100 }),
      ])
      return [...unpaid.data, ...partial.data]
    },
    enabled: open,
    staleTime: 60_000,
  })

  const policies = useQuery({
    queryKey: ['patient-insurances', 'claim-options'],
    queryFn: () => insuranceApi.policies({ per_page: 100 }),
    enabled: open,
    staleTime: 60_000,
  })

  useEffect(() => {
    if (!open) return
    setInvoiceId('')
    setPolicyId('')
    setAmount('')
    setNotes('')
    setErrors({})
    setFormError(null)
  }, [open])

  const invoice = (invoices.data ?? []).find((row) => row.id === Number(invoiceId))
  const policy = (policies.data?.data ?? []).find((row) => row.id === Number(policyId))

  const selectInvoice = (id: string) => {
    setInvoiceId(id)
    const chosen = (invoices.data ?? []).find((row) => row.id === Number(id))
    if (chosen && chosen.balance > 0) setAmount(String(chosen.balance))
  }

  const mutation = useMutation({
    mutationFn: (payload: ClaimInput & { patient_insurance_id: number }) => insuranceApi.createClaim(payload),
    onSuccess: async (saved) => {
      await queryClient.invalidateQueries({ queryKey: ['insurance-claims'] })
      toast.success('Claim created', `${saved.claim_number} saved as draft`)
      onClose()
    },
    onError: (caught) => {
      const fieldErrors = getFieldErrors(caught)
      setErrors(fieldErrors)
      if (Object.keys(fieldErrors).length === 0) setFormError(getErrorMessage(caught, 'Unable to create claim'))
    },
  })

  const submit = () => {
    const next: Record<string, string[]> = {}
    if (!invoice) next.invoice_id = ['Select an unpaid or partially paid invoice.']
    if (!policy) next.policy_id = ['Select the patient insurance covering this claim.']
    const value = Number(amount)
    if (!amount || !Number.isFinite(value) || value <= 0) next.amount = ['Enter a claim amount greater than zero.']
    else if (invoice && value > invoice.total + 0.001)
      next.amount = [`Amount cannot exceed the invoice total of ${formatCurrency(invoice.total)}.`]
    setErrors(next)
    setFormError(null)
    if (Object.keys(next).length === 0 && invoice && policy) {
      mutation.mutate({
        invoice_id: invoice.id,
        company_id: policy.company.id,
        patient_insurance_id: policy.id,
        amount: value,
        notes: notes.trim() || undefined,
      })
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New insurance claim"
      description="Bill an unpaid invoice to the patient's insurer"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button onClick={submit} loading={mutation.isPending}>
            Create claim
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
        <FormField label="Invoice" htmlFor="claim-invoice" required error={errors.invoice_id?.[0]}>
          <Select
            id="claim-invoice"
            value={invoiceId}
            onChange={(event) => selectInvoice(event.target.value)}
            placeholder={invoices.isLoading ? 'Loading invoices…' : 'Select an invoice'}
            options={(invoices.data ?? []).map((row) => ({
              value: row.id,
              label: `${row.invoice_number} · ${row.patient.full_name} · ${formatCurrency(row.total)}`,
            }))}
          />
        </FormField>

        <FormField
          label="Patient insurance"
          htmlFor="claim-policy"
          required
          error={errors.policy_id?.[0]}
          hint="Determines the insurance company this claim is sent to"
        >
          <Select
            id="claim-policy"
            value={policyId}
            onChange={(event) => setPolicyId(event.target.value)}
            placeholder={policies.isLoading ? 'Loading policies…' : 'Select patient insurance'}
            options={(policies.data?.data ?? []).map((row) => ({
              value: row.id,
              label: `${row.patient.full_name} · ${row.company.name} · ${row.policy_number}`,
            }))}
          />
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Claim amount"
            htmlFor="claim-amount"
            required
            error={errors.amount?.[0]}
            hint={invoice ? `Invoice total ${formatCurrency(invoice.total)}` : 'Select an invoice first'}
          >
            <Input
              id="claim-amount"
              type="number"
              min={0}
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="0.00"
            />
          </FormField>
          <FormField label="Notes" htmlFor="claim-notes" hint="Optional">
            <Textarea
              id="claim-notes"
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Diagnosis codes, coverage details…"
            />
          </FormField>
        </div>
      </div>
    </Modal>
  )
}

interface DecisionModalProps {
  claim: InsuranceClaim | null
  mode: 'approve' | 'reject'
  onClose: () => void
}

function DecisionModal({ claim, mode, onClose }: DecisionModalProps) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const approving = mode === 'approve'

  const [approvedAmount, setApprovedAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    if (!claim) return
    setApprovedAmount(approving ? String(claim.amount) : '')
    setNotes('')
    setErrors({})
    setFormError(null)
  }, [claim, approving])

  const mutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: { status: InsuranceClaimStatus; approved_amount?: number; notes?: string } }) =>
      insuranceApi.updateClaimStatus(id, payload),
    onSuccess: async (saved) => {
      await queryClient.invalidateQueries({ queryKey: ['insurance-claims'] })
      toast.success(
        approving ? 'Claim approved' : 'Claim rejected',
        `${saved.claim_number} is now ${statusLabel(saved.status)}`,
      )
      onClose()
    },
    onError: (caught) => {
      const fieldErrors = getFieldErrors(caught)
      setErrors(fieldErrors)
      if (Object.keys(fieldErrors).length === 0) setFormError(getErrorMessage(caught, 'Unable to update claim'))
    },
  })

  const submit = () => {
    const next: Record<string, string[]> = {}
    let value: number | undefined
    if (approving) {
      value = Number(approvedAmount)
      if (!approvedAmount || !Number.isFinite(value) || value < 0) {
        next.approved_amount = ['Enter the approved amount.']
      } else if (claim && value > claim.amount + 0.001) {
        next.approved_amount = [`Cannot exceed the claim amount of ${formatCurrency(claim.amount)}.`]
      }
    }
    if (!approving && !notes.trim()) next.notes = ['Add a reason for rejecting this claim.']
    setErrors(next)
    setFormError(null)
    if (Object.keys(next).length === 0 && claim) {
      mutation.mutate({
        id: claim.id,
        payload: approving
          ? { status: 'approved', approved_amount: value, notes: notes.trim() || undefined }
          : { status: 'rejected', notes: notes.trim() },
      })
    }
  }

  if (!claim) return null

  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title={approving ? `Approve ${claim.claim_number}` : `Reject ${claim.claim_number}`}
      description={
        approving
          ? `Claimed ${formatCurrency(claim.amount)} · ${claim.company.name}`
          : `${claim.claim_number} · ${claim.company.name}`
      }
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button
            variant={approving ? 'primary' : 'destructive'}
            loading={mutation.isPending}
            onClick={submit}
          >
            {approving ? 'Approve claim' : 'Reject claim'}
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
        {approving ? (
          <>
            <FormField
              label="Approved amount"
              htmlFor="approve-amount"
              required
              error={errors.approved_amount?.[0]}
              hint={`Claim amount ${formatCurrency(claim.amount)}`}
            >
              <Input
                id="approve-amount"
                type="number"
                min={0}
                step="0.01"
                value={approvedAmount}
                onChange={(event) => setApprovedAmount(event.target.value)}
              />
            </FormField>
            <FormField label="Notes" htmlFor="decision-notes" hint="Optional, stored on the claim">
              <Textarea
                id="decision-notes"
                rows={3}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Internal note…"
              />
            </FormField>
          </>
        ) : (
          <FormField label="Reason" htmlFor="reject-notes" required error={errors.notes?.[0]}>
            <Textarea
              id="reject-notes"
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Coverage exceeded, policy expired…"
            />
          </FormField>
        )}
      </div>
    </Modal>
  )
}

export default function ClaimsPage() {
  const { hasPermission } = useAuth()
  const confirm = useConfirm()
  const toast = useToast()
  const queryClient = useQueryClient()
  const { setPage, resetPage, query } = usePagination()

  const [term, setTerm] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [creating, setCreating] = useState(false)
  const [decision, setDecision] = useState<{ claim: InsuranceClaim; mode: 'approve' | 'reject' } | null>(null)

  const params: ClaimListQuery = { ...query, status: status || undefined }
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['insurance-claims', params],
    queryFn: () => insuranceApi.claims(params),
  })

  const canManage = hasPermission('insurance.manage')

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['insurance-claims'] })
  }

  const transition = async (claim: InsuranceClaim, next: InsuranceClaimStatus) => {
    try {
      const saved = await insuranceApi.updateClaimStatus(claim.id, { status: next })
      await invalidate()
      toast.success('Claim updated', `${saved.claim_number} is now ${statusLabel(saved.status)}`)
    } catch (caught) {
      toast.error('Unable to update claim', getErrorMessage(caught))
    }
  }

  const submitClaim = async (claim: InsuranceClaim) => {
    const confirmed = await confirm({
      title: `Submit ${claim.claim_number}?`,
      message: `The claim for ${formatCurrency(claim.amount)} will be sent to ${claim.company.name}.`,
      confirmLabel: 'Submit claim',
    })
    if (confirmed) await transition(claim, 'submitted')
  }

  const markPaid = async (claim: InsuranceClaim) => {
    const confirmed = await confirm({
      title: `Mark ${claim.claim_number} as paid?`,
      message: `Records ${formatCurrency(claim.approved_amount ?? claim.amount)} as settled by ${claim.company.name}.`,
      confirmLabel: 'Mark paid',
    })
    if (confirmed) await transition(claim, 'paid')
  }

  const allowed = (claim: InsuranceClaim) => ALLOWED[claim.status] ?? []

  const columns: Column<InsuranceClaim>[] = [
    {
      key: 'claim_number',
      header: 'Claim #',
      render: (row) => <span className="font-mono text-xs font-semibold text-primary">{row.claim_number}</span>,
    },
    {
      key: 'invoice',
      header: 'Invoice',
      render: (row) => (
        <span className="flex flex-col">
          <span className="font-medium text-foreground">{row.invoice.invoice_number}</span>
          <span className="text-[11px] text-muted-foreground">{row.invoice.patient.full_name}</span>
        </span>
      ),
    },
    { key: 'company', header: 'Company', hideBelow: 'sm', render: (row) => row.company.name },
    { key: 'amount', header: 'Amount', align: 'right', render: (row) => formatCurrency(row.amount) },
    {
      key: 'approved_amount',
      header: 'Approved',
      align: 'right',
      hideBelow: 'sm',
      render: (row) =>
        row.approved_amount != null ? (
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
            {formatCurrency(row.approved_amount)}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    {
      key: 'submitted_at',
      header: 'Submitted',
      hideBelow: 'md',
      render: (row) => <span className="text-muted-foreground">{formatDate(row.submitted_at)}</span>,
    },
    {
      key: 'decided_at',
      header: 'Decided',
      hideBelow: 'lg',
      render: (row) => <span className="text-muted-foreground">{formatDate(row.decided_at)}</span>,
    },
    ...(canManage
      ? [
          {
            key: 'actions',
            header: '',
            align: 'right' as const,
            render: (row: InsuranceClaim) => (
              <span className="flex items-center justify-end gap-1.5">
                {allowed(row).includes('submitted') && (
                  <Button size="sm" variant="outline" onClick={() => void submitClaim(row)}>
                    Submit
                  </Button>
                )}
                {allowed(row).includes('approved') && (
                  <Button size="sm" onClick={() => setDecision({ claim: row, mode: 'approve' })}>
                    Approve
                  </Button>
                )}
                {allowed(row).includes('rejected') && (
                  <Button size="sm" variant="outline" onClick={() => setDecision({ claim: row, mode: 'reject' })}>
                    Reject
                  </Button>
                )}
                {allowed(row).includes('paid') && (
                  <Button size="sm" onClick={() => void markPaid(row)}>
                    Mark paid
                  </Button>
                )}
                {allowed(row).length === 0 && <span className="text-xs text-muted-foreground">Closed</span>}
              </span>
            ),
          },
        ]
      : []),
  ]

  const needle = search.trim().toLowerCase()
  const rows = needle
    ? (data?.data ?? []).filter(
        (row) =>
          row.claim_number.toLowerCase().includes(needle) ||
          row.invoice.invoice_number.toLowerCase().includes(needle) ||
          row.invoice.patient.full_name.toLowerCase().includes(needle) ||
          row.company.name.toLowerCase().includes(needle),
      )
    : (data?.data ?? [])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Insurance claims"
        subtitle="Submit, decide and settle claims with insurance companies"
        actions={
          canManage ? (
            <Button icon={<Plus size={16} />} onClick={() => setCreating(true)}>
              New claim
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
          placeholder="Search claim, invoice or patient…"
          containerClassName="sm:max-w-xs sm:flex-1"
        />
        <Select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value)
            resetPage()
          }}
          options={STATUS_OPTIONS}
          aria-label="Filter by claim status"
          className="sm:w-44"
        />
      </div>

      <Table
        columns={columns}
        data={rows}
        loading={isLoading}
        rowKey={(row) => row.id}
        empty={
          <EmptyState
            icon={<ClipboardCheck size={22} />}
            title="No claims found"
            description={
              search || status ? 'Try adjusting your filters.' : 'Create a claim to bill an invoice to an insurer.'
            }
            action={
              canManage ? (
                <Button size="sm" onClick={() => setCreating(true)}>
                  New claim
                </Button>
              ) : undefined
            }
          />
        }
      />

      {data && <Pagination meta={data.meta} onPageChange={setPage} disabled={isFetching} />}

      <ClaimFormModal open={creating} onClose={() => setCreating(false)} />
      <DecisionModal
        claim={decision?.claim ?? null}
        mode={decision?.mode ?? 'approve'}
        onClose={() => setDecision(null)}
      />
    </div>
  )
}
