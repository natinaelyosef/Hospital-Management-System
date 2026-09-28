import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, BadgeCheck, CreditCard, Download, Pencil, Printer, Stethoscope } from 'lucide-react'
import { getFieldErrors, getErrorMessage } from '@/api/client'
import { billingApi } from '@/api/billing.api'
import { downloadBlob } from '@/utils/download'
import { Alert } from '@/components/ui/Alert'
import { miscApi } from '@/api/misc.api'
import { Badge, type BadgeTone } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { PageHeader } from '@/components/ui/PageHeader'
import { PageLoader } from '@/components/ui/Spinner'
import { Select } from '@/components/ui/Select'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Table, type Column } from '@/components/ui/Table'
import { Textarea } from '@/components/ui/Textarea'
import { useToast } from '@/components/ui/Toast'
import { InvoiceFormModal } from '@/components/modules/finance/InvoiceFormModal'
import { useAuth } from '@/contexts/AuthContext'
import type { Invoice, Payment, PaymentMethod } from '@/types'
import { formatCurrency, formatDate, formatDateTime, statusLabel } from '@/utils/format'

const METHOD_TONES: Record<PaymentMethod, BadgeTone> = {
  cash: 'success',
  card: 'info',
  bank_transfer: 'neutral',
  insurance: 'warning',
  mobile_money: 'info',
}

const METHOD_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'mobile_money', label: 'Mobile money' },
]

function PaymentModal({ invoice, onClose }: { invoice: Invoice; onClose: () => void }) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [amount, setAmount] = useState(() => (invoice.balance > 0 ? String(invoice.balance) : ''))
  const [method, setMethod] = useState<PaymentMethod>('cash')
  const [reference, setReference] = useState('')
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [formError, setFormError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: () =>
      billingApi.addPayment(invoice.id, {
        amount: Number(amount),
        method,
        reference: reference.trim() || undefined,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['invoice', invoice.id] })
      await queryClient.invalidateQueries({ queryKey: ['invoices'] })
      await queryClient.invalidateQueries({ queryKey: ['billing-summary'] })
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('Payment recorded', `Balance updated for ${invoice.invoice_number}`)
      onClose()
    },
    onError: (caught) => {
      const fieldErrors = getFieldErrors(caught)
      setErrors(fieldErrors)
      if (Object.keys(fieldErrors).length === 0) setFormError(getErrorMessage(caught, 'Unable to record payment'))
    },
  })

  const submit = () => {
    const value = Number(amount)
    const next: Record<string, string[]> = {}
    if (!Number.isFinite(value) || value <= 0) next.amount = ['Enter an amount greater than 0.']
    else if (value > invoice.balance) next.amount = [`Amount cannot exceed the balance of ${formatCurrency(invoice.balance)}.`]
    setErrors(next)
    setFormError(null)
    if (Object.keys(next).length > 0) return
    mutation.mutate()
  }

  const amountError = errors.amount?.[0]

  return (
    <Modal
      open
      onClose={onClose}
      title="Record payment"
      description={`${invoice.invoice_number} · balance ${formatCurrency(invoice.balance)}`}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button onClick={submit} loading={mutation.isPending}>
            Record payment
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
        <FormField label="Amount" htmlFor="payment-amount" required error={amountError}>
          <Input
            id="payment-amount"
            type="number"
            min={0}
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="0.00"
          />
        </FormField>
        <FormField label="Method" htmlFor="payment-method" required error={errors.method?.[0]}>
          <Select
            id="payment-method"
            value={method}
            onChange={(event) => setMethod(event.target.value as PaymentMethod)}
            options={METHOD_OPTIONS}
          />
        </FormField>
        <FormField label="Reference" htmlFor="payment-reference" hint="Receipt, transaction or transfer number" error={errors.reference?.[0]}>
          <Input
            id="payment-reference"
            value={reference}
            onChange={(event) => setReference(event.target.value)}
            placeholder="Optional"
          />
        </FormField>
      </div>
    </Modal>
  )
}

export default function InvoiceDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const invoiceId = Number(id)
  const { hasPermission } = useAuth()
  const [paying, setPaying] = useState(false)
  const [editing, setEditing] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const toast = useToast()

  const downloadPdf = async () => {
    setDownloading(true)
    try {
      const blob = await billingApi.invoicePdf(invoiceId)
      downloadBlob(blob, `${invoice?.invoice_number ?? 'invoice'}.pdf`)
    } catch (caught) {
      toast.error('Unable to download PDF', getErrorMessage(caught))
    } finally {
      setDownloading(false)
    }
  }

  const { data: invoice, isLoading } = useQuery({
    queryKey: ['invoice', invoiceId],
    queryFn: () => billingApi.invoice(invoiceId),
    enabled: Number.isFinite(invoiceId),
  })

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => miscApi.settings.get(),
    staleTime: Infinity,
    retry: 0,
  })

  const [approving, setApproving] = useState(false)
  const [approvalNotes, setApprovalNotes] = useState('')
  const queryClient = useQueryClient()

  const approveMutation = useMutation({
    mutationFn: () => billingApi.approveInvoice(invoiceId, approvalNotes.trim() || undefined),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] })
      await queryClient.invalidateQueries({ queryKey: ['invoices'] })
      await queryClient.invalidateQueries({ queryKey: ['prescriptions'] })
      await queryClient.invalidateQueries({ queryKey: ['visit'] })
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setApproving(false)
      setApprovalNotes('')
      toast.success('Payment approved', 'Pharmacy can now dispense to the patient')
    },
    onError: (caught) => toast.error('Unable to approve payment', getErrorMessage(caught)),
  })

  if (isLoading || !invoice) {
    if (isLoading) return <PageLoader label="Loading invoice…" />
    return (
      <div className="space-y-6">
        <PageHeader title="Invoice" />
        <EmptyState
          title="Invoice not found"
          description="It may have been deleted, or the link is wrong."
          action={
            <Button size="sm" onClick={() => void navigate('/billing/invoices')}>
              Back to invoices
            </Button>
          }
        />
      </div>
    )
  }

  const canPay = hasPermission('billing.payment.manage') && invoice.balance > 0 && invoice.status !== 'cancelled'
  const canEdit = hasPermission('billing.invoice.edit') && invoice.status === 'unpaid'
  // Approval is a separate decision from recording the cash: it is the gate
  // that releases the medication to the patient.
  const canApprove =
    hasPermission('billing.payment.approve') &&
    !invoice.is_approved &&
    invoice.status !== 'cancelled' &&
    invoice.balance <= 0.001
  const awaitingApproval = !invoice.is_approved && invoice.balance <= 0.001 && invoice.status !== 'cancelled'

  const paymentColumns: Column<Payment>[] = [
    { key: 'payment_number', header: 'Receipt', render: (row) => <span className="font-medium">{row.payment_number}</span> },
    { key: 'paid_at', header: 'Date', render: (row) => <span className="text-muted-foreground">{formatDateTime(row.paid_at)}</span> },
    {
      key: 'method',
      header: 'Method',
      render: (row) => <Badge tone={METHOD_TONES[row.method] ?? 'neutral'}>{statusLabel(row.method)}</Badge>,
    },
    { key: 'reference', header: 'Reference', hideBelow: 'sm', render: (row) => row.reference ?? '—' },
    { key: 'received_by_name', header: 'Received by', hideBelow: 'md', render: (row) => row.received_by_name },
    { key: 'amount', header: 'Amount', align: 'right', render: (row) => <span className="font-semibold">{formatCurrency(row.amount)}</span> },
  ]

  return (
    <div className="space-y-6">
      {invoice.visit_id != null && (
        <Alert tone="info" title="Linked consultation case">
          <span className="flex flex-wrap items-center gap-2">
            <span>
              This bill belongs to a case. Approving the cash payment here unblocks pharmacy dispensing.
            </span>
            <Link
              to={`/consultation/${invoice.visit_id}`}
              className="inline-flex items-center gap-1.5 rounded-lg border bg-card px-2.5 py-1 text-xs font-semibold text-primary hover:bg-muted"
            >
              <Stethoscope size={13} /> Open case
            </Link>
          </span>
        </Alert>
      )}
      {invoice.is_approved && (
        <Alert tone="success" title="Payment approved — pharmacy can dispense">
          Approved by {invoice.approved_by_name ?? 'the accountant'}
          {invoice.approved_at ? ` on ${formatDateTime(invoice.approved_at)}` : ''}. The pharmacist can now hand the
          medicines to the patient
          {invoice.visit_id != null ? ' from the linked case.' : '.'}
        </Alert>
      )}
      {awaitingApproval && (
        <Alert tone="warning" title="Cash received — your approval is required">
          The full balance has been recorded, but the medication is still held by the pharmacy. Approve the payment
          below to release it to the patient.
        </Alert>
      )}
      {invoice.balance > 0 && invoice.status !== 'cancelled' && (
        <Alert tone="warning" title="Cash payment pending at the accountant">
          Collect {formatCurrency(invoice.balance)} in cash (or another method) and record it below. Once the balance is
          clear you approve the payment, which releases the medicines.
        </Alert>
      )}
      <div className="print:hidden">
        <PageHeader
          title={invoice.invoice_number}
          subtitle={`${invoice.patient.full_name} · issued ${formatDate(invoice.created_at)}`}
          actions={
            <>
              <Button variant="outline" size="sm" icon={<ArrowLeft size={15} />} onClick={() => void navigate('/billing/invoices')}>
                Back
              </Button>
              {canEdit && (
                <Button variant="outline" size="sm" icon={<Pencil size={15} />} onClick={() => setEditing(true)}>
                  Edit items
                </Button>
              )}
              <Button variant="outline" size="sm" icon={<Printer size={15} />} onClick={() => window.print()}>
                Print
              </Button>
              <Button variant="outline" size="sm" icon={<Download size={15} />} loading={downloading} onClick={() => void downloadPdf()}>
                PDF
              </Button>
              {canPay && (
                <Button size="sm" icon={<CreditCard size={15} />} onClick={() => setPaying(true)}>
                  Record payment
                </Button>
              )}
              {canApprove && (
                <Button size="sm" icon={<BadgeCheck size={15} />} onClick={() => setApproving(true)}>
                  Approve payment
                </Button>
              )}
            </>
          }
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
          <div className="border-b px-6 py-5 sm:px-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 flex-col gap-1">
                <p className="text-lg font-semibold tracking-tight text-foreground">
                  {settings?.hospital_name || 'MediCare General Hospital'}
                </p>
                <p className="text-xs text-muted-foreground">{settings?.address || 'Hospital address on file'}</p>
                <p className="text-xs text-muted-foreground">
                  {settings?.phone || ''}
                  {settings?.phone && settings?.email ? ' · ' : ''}
                  {settings?.email || ''}
                </p>
              </div>
              <div className="flex flex-col items-start gap-1 sm:items-end">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Invoice</p>
                <p className="text-xl font-semibold text-foreground">{invoice.invoice_number}</p>
                <StatusBadge status={invoice.status} />
              </div>
            </div>
          </div>

          <div className="grid gap-5 border-b px-6 py-5 sm:grid-cols-2 sm:px-8">
            <div className="flex flex-col gap-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Billed to</p>
              <p className="text-sm font-semibold text-foreground">{invoice.patient.full_name}</p>
              <p className="text-xs text-muted-foreground">{invoice.patient.patient_number}</p>
              <p className="text-xs text-muted-foreground">
                {invoice.patient.address || 'Address on file'}
                {invoice.patient.phone ? ` · ${invoice.patient.phone}` : ''}
              </p>
            </div>
            <div className="flex flex-col gap-1 sm:items-end">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Details</p>
              <p className="text-xs text-muted-foreground">Issued {formatDate(invoice.created_at)}</p>
              <p className="text-xs text-muted-foreground">Issued by {invoice.issued_by_name || '—'}</p>
              {invoice.insurance_covered > 0 && (
                <p className="text-xs text-muted-foreground">Insurance covered {formatCurrency(invoice.insurance_covered)}</p>
              )}
            </div>
          </div>

          <div className="px-4 py-5 sm:px-8">
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[520px] text-sm">
                <thead className="bg-muted/60">
                  <tr>
                    <th className="border-b px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Description
                    </th>
                    <th className="border-b px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Type
                    </th>
                    <th className="border-b px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Qty
                    </th>
                    <th className="border-b px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Unit price
                    </th>
                    <th className="border-b px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-xs text-muted-foreground">
                        No line items on this invoice.
                      </td>
                    </tr>
                  )}
                  {invoice.items.map((item) => (
                    <tr key={item.id ?? `${item.description}-${item.quantity}`} className="border-b last:border-b-0">
                      <td className="px-4 py-3 text-foreground">{item.description}</td>
                      <td className="px-4 py-3 text-muted-foreground">{statusLabel(item.item_type)}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{item.quantity}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{formatCurrency(item.unit_price)}</td>
                      <td className="px-4 py-3 text-right font-medium text-foreground">{formatCurrency(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-5 flex justify-end">
              <dl className="w-full max-w-xs space-y-2 text-sm">
                <div className="flex items-center justify-between gap-6">
                  <dt className="text-muted-foreground">Subtotal</dt>
                  <dd className="font-medium text-foreground">{formatCurrency(invoice.sub_total)}</dd>
                </div>
                <div className="flex items-center justify-between gap-6">
                  <dt className="text-muted-foreground">Discount</dt>
                  <dd className="font-medium text-foreground">− {formatCurrency(invoice.discount)}</dd>
                </div>
                <div className="flex items-center justify-between gap-6">
                  <dt className="text-muted-foreground">Tax</dt>
                  <dd className="font-medium text-foreground">+ {formatCurrency(invoice.tax)}</dd>
                </div>
                <div className="flex items-center justify-between gap-6 border-t pt-2">
                  <dt className="font-semibold text-foreground">Total</dt>
                  <dd className="font-semibold text-foreground">{formatCurrency(invoice.total)}</dd>
                </div>
                <div className="flex items-center justify-between gap-6">
                  <dt className="text-muted-foreground">Paid</dt>
                  <dd className="font-medium text-emerald-600 dark:text-emerald-400">{formatCurrency(invoice.paid_amount)}</dd>
                </div>
                <div className="flex items-center justify-between gap-6 border-t pt-2">
                  <dt className="font-semibold text-foreground">Balance due</dt>
                  <dd className={invoice.balance > 0 ? 'text-base font-semibold text-destructive' : 'font-semibold text-emerald-600'}>
                    {formatCurrency(invoice.balance)}
                  </dd>
                </div>
              </dl>
            </div>

            {invoice.notes && (
              <p className="mt-5 rounded-lg bg-muted/60 px-4 py-3 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">Note: </span>
                {invoice.notes}
              </p>
            )}
          </div>

          <div className="border-t px-6 py-5 sm:px-8">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Payments</p>
            <Table
              columns={paymentColumns}
              data={invoice.payments}
              compact
              empty={<EmptyState compact title="No payments yet" description="Payments you record will appear here." />}
            />
          </div>
        </div>

        <aside className="space-y-4 print:hidden">
          <div className="rounded-xl border bg-card p-5 shadow-xs">
            <p className="text-xs font-medium text-muted-foreground">Balance due</p>
            <p
              className={
                invoice.balance > 0
                  ? 'mt-1.5 text-3xl font-semibold tracking-tight text-destructive'
                  : 'mt-1.5 text-3xl font-semibold tracking-tight text-emerald-600'
              }
            >
              {formatCurrency(invoice.balance)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {invoice.balance > 0 ? `${formatCurrency(invoice.total - invoice.paid_amount)} outstanding` : 'Settled in full'}
            </p>
          </div>

          <div className="rounded-xl border bg-card p-5 shadow-xs">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Summary</p>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">Invoice total</dt>
                <dd className="font-medium text-foreground">{formatCurrency(invoice.total)}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">Paid</dt>
                <dd className="font-medium text-emerald-600 dark:text-emerald-400">{formatCurrency(invoice.paid_amount)}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">Payments</dt>
                <dd className="font-medium text-foreground">{invoice.payments.length}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">Insurance</dt>
                <dd className="font-medium text-foreground">{formatCurrency(invoice.insurance_covered)}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">Approval</dt>
                <dd className="font-medium text-foreground">
                  {invoice.is_approved ? 'Approved' : awaitingApproval ? 'Awaiting approval' : 'Not yet'}
                </dd>
              </div>
            </dl>
            {invoice.is_approved && (
              <p className="mt-3 border-t pt-3 text-xs text-muted-foreground">
                Approved by <span className="font-medium text-foreground">{invoice.approved_by_name ?? 'the accountant'}</span>
                {invoice.approved_at ? ` on ${formatDateTime(invoice.approved_at)}` : ''}.
              </p>
            )}
          </div>

          <Link
            to="/billing/invoices"
            className="block rounded-xl border bg-card px-5 py-3 text-center text-xs font-medium text-primary shadow-xs transition-colors hover:bg-muted/60"
          >
            View all invoices
          </Link>
        </aside>
      </div>

      {paying && canPay && <PaymentModal invoice={invoice} onClose={() => setPaying(false)} />}
      {approving && canApprove && (
        <Modal
          open
          onClose={() => setApproving(false)}
          title="Approve payment"
          description={`${invoice.invoice_number} · ${formatCurrency(invoice.total)} received in full`}
          footer={
            <>
              <Button variant="outline" onClick={() => setApproving(false)} disabled={approveMutation.isPending}>
                Cancel
              </Button>
              <Button
                icon={<BadgeCheck size={15} />}
                loading={approveMutation.isPending}
                onClick={() => approveMutation.mutate()}
              >
                Approve &amp; release medicines
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <Alert tone="info" title="This releases the medication">
              Approving tells the pharmacy the cash is verified and the patient may collect the medicines. This action
              is recorded against your name.
            </Alert>
            <FormField
              label="Notes"
              htmlFor="approval-notes"
              hint="Optional — receipt number, drawer reference, anything the pharmacist should know."
            >
              <Textarea
                id="approval-notes"
                rows={3}
                value={approvalNotes}
                onChange={(event) => setApprovalNotes(event.target.value)}
                placeholder="e.g. Cash counted and banked — receipt 0042"
              />
            </FormField>
          </div>
        </Modal>
      )}
      {canEdit && (
        <InvoiceFormModal open={editing} invoice={invoice} onClose={() => setEditing(false)} onSaved={() => setEditing(false)} />
      )}
    </div>
  )
}
