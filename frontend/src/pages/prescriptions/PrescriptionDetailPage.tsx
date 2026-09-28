import { useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Download, Printer, Receipt, Stethoscope } from 'lucide-react'
import { getErrorMessage } from '@/api/client'
import { billingApi } from '@/api/billing.api'
import { prescriptionApi } from '@/api/prescription.api'
import { downloadBlob } from '@/utils/download'
import { Alert } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { PageLoader } from '@/components/ui/Spinner'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/contexts/AuthContext'
import { useConfirm } from '@/hooks'
import type { PrescriptionStatus } from '@/types'
import { cn } from '@/utils/cn'
import { formatCurrency, formatDate, formatDateTime, statusLabel } from '@/utils/format'

const STEPS: PrescriptionStatus[] = ['pending', 'processing', 'dispensed']

const TRANSITIONS: Record<PrescriptionStatus, PrescriptionStatus[]> = {
  pending: ['processing', 'cancelled'],
  processing: ['pending', 'dispensed', 'cancelled'],
  dispensed: [],
  cancelled: ['pending'],
}

function canTransition(target: PrescriptionStatus, hasPermission: (permission: string) => boolean): boolean {
  if (target === 'dispensed') return hasPermission('prescriptions.dispense')
  return hasPermission('prescriptions.create') || hasPermission('prescriptions.dispense')
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">{title}</span>
      <div className="flex flex-col gap-0.5 text-sm text-foreground">{children}</div>
    </div>
  )
}

export default function PrescriptionDetailPage() {
  const { id } = useParams()
  const prescriptionId = Number(id)
  const queryClient = useQueryClient()
  const toast = useToast()
  const confirm = useConfirm()
  const { hasPermission } = useAuth()
  const [pendingTarget, setPendingTarget] = useState<PrescriptionStatus | null>(null)
  const [downloading, setDownloading] = useState(false)

  const downloadPdf = async () => {
    setDownloading(true)
    try {
      const blob = await prescriptionApi.pdf(prescriptionId)
      downloadBlob(blob, `${prescription?.prescription_number ?? 'prescription'}.pdf`)
    } catch (caught) {
      toast.error('Unable to download PDF', getErrorMessage(caught))
    } finally {
      setDownloading(false)
    }
  }

  const { data: prescription, isLoading, isError, refetch } = useQuery({
    queryKey: ['prescription', prescriptionId],
    queryFn: () => prescriptionApi.get(prescriptionId),
    enabled: Number.isFinite(prescriptionId) && prescriptionId > 0,
  })

  const canViewBilling = hasPermission('billing.view')
  const { data: visitInvoicesData } = useQuery({
    queryKey: ['prescription', prescriptionId, 'invoices'],
    queryFn: () =>
      prescription?.visit_id
        ? billingApi.invoices({ visit_id: prescription.visit_id, per_page: 20 })
        : Promise.resolve({ data: [], meta: { current_page: 1, last_page: 1, per_page: 20, total: 0 } }),
    enabled: Boolean(prescription?.visit_id) && canViewBilling,
    staleTime: 15_000,
    retry: 0,
  })
  const visitInvoices = visitInvoicesData?.data ?? []
  const openInvoice = visitInvoices.find((invoice) => invoice.status === 'unpaid' || invoice.status === 'partial') ?? null
  // The server decides the gate; these fields just let us explain it up front
  // instead of letting the pharmacist click Dispense into a 422.
  const approvedInvoice = visitInvoices.find((invoice) => invoice.is_approved) ?? null
  const paymentApproved = prescription?.payment_approved ?? false
  const canBill = hasPermission('billing.invoice.create') || hasPermission('prescriptions.create') || hasPermission('prescriptions.dispense')

  const statusMutation = useMutation({
    mutationFn: (status: PrescriptionStatus) => prescriptionApi.updateStatus(prescriptionId, status),
    onSuccess: (updated) => {
      toast.success('Status updated', `${updated.prescription_number} is now ${statusLabel(updated.status)}`)
      queryClient.invalidateQueries({ queryKey: ['prescription', prescriptionId] })
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] })
      if (updated.visit_id) {
        queryClient.invalidateQueries({ queryKey: ['visit', updated.visit_id] })
        queryClient.invalidateQueries({ queryKey: ['visit', updated.visit_id, 'invoices'] })
      }
      setPendingTarget(null)
    },
    onError: (caught) => {
      toast.error('Unable to update status', getErrorMessage(caught))
      setPendingTarget(null)
    },
  })

  const billMutation = useMutation({
    mutationFn: () => prescriptionApi.prepareInvoice(prescriptionId),
    onSuccess: (invoice) => {
      toast.success('Bill prepared', `${invoice.invoice_number} · ${formatCurrency(invoice.total)} — send the patient to the accountant`)
      queryClient.invalidateQueries({ queryKey: ['prescription', prescriptionId] })
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] })
      queryClient.invalidateQueries({ queryKey: ['prescription', prescriptionId, 'invoices'] })
      if (prescription?.visit_id) {
        queryClient.invalidateQueries({ queryKey: ['visit', prescription.visit_id] })
        queryClient.invalidateQueries({ queryKey: ['visit', prescription.visit_id, 'invoices'] })
      }
    },
    onError: (caught) => toast.error('Unable to prepare bill', getErrorMessage(caught)),
  })

  const requestTransition = async (target: PrescriptionStatus) => {
    const approved = await confirm({
      title: `Mark prescription as ${statusLabel(target).toLowerCase()}?`,
      message:
        target === 'dispensed'
          ? 'Dispensing will decrement pharmacy stock for every line item. Hand the medicines to the patient.'
          : `${prescription?.prescription_number} will move to “${statusLabel(target)}”.`,
      confirmLabel: target === 'dispensed' ? 'Dispense' : 'Confirm',
      tone: target === 'cancelled' ? 'destructive' : 'default',
    })
    if (!approved) return
    setPendingTarget(target)
    statusMutation.mutate(target)
  }

  if (isLoading) return <PageLoader label="Loading prescription…" />
  if (isError || !prescription) {
    return (
      <EmptyState
        icon={<Stethoscope size={22} />}
        title="Prescription not found"
        description="This prescription may have been removed."
        action={<Button variant="outline" onClick={() => void refetch()}>Retry</Button>}
      />
    )
  }

  const currentIndex = STEPS.indexOf(prescription.status)
  const transitions = TRANSITIONS[prescription.status].filter((target) => canTransition(target, hasPermission))
  // Dispense is genuinely blocked by the server until the accountant approves
  // the payment, so the button is disabled with the reason rather than left to
  // fail on click.
  const blockedReason = openInvoice
    ? `Payment is not approved yet — invoice ${openInvoice.invoice_number} still has ${formatCurrency(openInvoice.balance)} outstanding.`
    : !approvedInvoice
      ? 'No approved payment yet. Prepare the bill, then the accountant records the cash and approves it.'
      : null

  return (
    <div className="space-y-6">
      {prescription.visit_id != null && (
        <Alert tone="info" title="Part of a connected case">
          <span className="flex flex-wrap items-center gap-2">
            <span>Doctor → pharmacy → accountant → dispense. Keep the handoff moving from the case.</span>
            <Link
              to={`/consultation/${prescription.visit_id}`}
              className="inline-flex items-center gap-1.5 rounded-lg border bg-card px-2.5 py-1 text-xs font-semibold text-primary hover:bg-muted"
            >
              <Stethoscope size={13} /> Open case
            </Link>
          </span>
        </Alert>
      )}
      {prescription.status !== 'dispensed' && prescription.status !== 'cancelled' && !paymentApproved && (
        <Alert tone="warning" title="Dispensing is blocked until the accountant approves payment">
          Steps: 1) prepare the bill below, 2) the accountant records the cash and approves it, 3) dispense to the
          patient.
          {blockedReason && <span className="mt-1 block font-medium text-foreground">{blockedReason}</span>}
        </Alert>
      )}
      {paymentApproved && prescription.status !== 'dispensed' && prescription.status !== 'cancelled' && (
        <Alert tone="success" title={`Payment approved${approvedInvoice ? ` (${approvedInvoice.invoice_number})` : ''} — ready to dispense`}>
          Approved by {approvedInvoice?.approved_by_name ?? 'the accountant'}. You can now hand the medicines to the
          patient.
        </Alert>
      )}
      <div className="print:hidden">
        <PageHeader
          title={`Prescription ${prescription.prescription_number}`}
          subtitle={`${prescription.patient.full_name} · ${formatDate(prescription.created_at)}${prescription.estimated_total != null ? ` · est. ${formatCurrency(prescription.estimated_total)}` : ''}`}
          actions={
            <>
              <Button variant="outline" icon={<Printer size={15} />} onClick={() => window.print()}>
                Print
              </Button>
              <Button variant="outline" icon={<Download size={15} />} loading={downloading} onClick={() => void downloadPdf()}>
                PDF
              </Button>
              {canBill && prescription.status !== 'dispensed' && prescription.status !== 'cancelled' && (
                <Button
                  variant="outline"
                  icon={<Receipt size={15} />}
                  loading={billMutation.isPending}
                  onClick={() => billMutation.mutate()}
                >
                  {openInvoice ? `Open bill ${openInvoice.invoice_number}` : 'Prepare bill for accountant'}
                </Button>
              )}
              {transitions.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  {transitions.map((target) => {
                    const blocked = target === 'dispensed' && !paymentApproved
                    return (
                      <Button
                        key={target}
                        variant={target === 'cancelled' ? 'destructive' : 'primary'}
                        size="md"
                        disabled={statusMutation.isPending || blocked}
                        title={blocked ? (blockedReason ?? 'Payment must be approved first.') : undefined}
                        loading={statusMutation.isPending && pendingTarget === target}
                        onClick={() => void requestTransition(target)}
                      >
                        {target === 'dispensed' ? 'Dispense' : target === 'cancelled' ? 'Cancel' : target === 'pending' ? 'Move to pending' : 'Mark processing'}
                      </Button>
                    )
                  })}
                </div>
              )}
            </>
          }
        />
      </div>

      <Card className="print:border-0 print:shadow-none">
        <CardContent className="flex flex-col gap-6 pt-6">
          <div className="flex flex-col gap-3 border-b pb-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">MediCare HMS</p>
              <h2 className="text-lg font-semibold text-foreground">Prescription</h2>
              <p className="font-mono text-sm text-muted-foreground">{prescription.prescription_number}</p>
            </div>
            <div className="flex flex-col items-start gap-1.5 sm:items-end">
              <StatusBadge status={prescription.status} />
              <p className="text-xs text-muted-foreground">Issued {formatDateTime(prescription.created_at)}</p>
              {prescription.status === 'dispensed' && prescription.dispensed_at && (
                <p className="text-xs text-muted-foreground">
                  Dispensed by {prescription.dispensed_by_name ?? '—'} on {formatDateTime(prescription.dispensed_at)}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <Block title="Patient">
              <span className="font-medium">{prescription.patient.full_name}</span>
              <span className="text-muted-foreground">
                {prescription.patient.patient_number} · {prescription.patient.age} yrs ·{' '}
                <span className="capitalize">{prescription.patient.gender}</span>
              </span>
              <span className="text-muted-foreground">
                {prescription.patient.phone}
                {prescription.patient.blood_group ? ` · ${prescription.patient.blood_group}` : ''}
              </span>
            </Block>
            <Block title="Prescribed by">
              <span className="font-medium">{prescription.doctor.name}</span>
              <span className="text-muted-foreground">{prescription.doctor.specialization || 'Doctor'}</span>
              <span className="text-muted-foreground">{prescription.doctor.license_number}</span>
            </Block>
            <Block title="Diagnosis">
              <span>{prescription.diagnosis || '—'}</span>
            </Block>
            <Block title="Notes">
              <span>{prescription.notes || '—'}</span>
            </Block>
          </div>

          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead className="bg-muted/60">
                <tr>
                  {['Medicine', 'Dosage', 'Frequency', 'Duration', 'Qty', 'Unit price', 'Line total', 'Instructions'].map((header) => (
                    <th
                      key={header}
                      className="border-b px-3 py-2.5 text-left text-[11px] font-semibold tracking-wide text-muted-foreground uppercase"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {prescription.items.map((item, index) => (
                  <tr key={item.id ?? `${item.medicine_id}-${index}`} className="border-b last:border-b-0">
                    <td className="px-3 py-2.5 font-medium text-foreground">{item.medicine_name}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{item.dosage}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{item.frequency}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{item.duration}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{item.quantity}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{item.unit_price != null ? formatCurrency(item.unit_price) : '—'}</td>
                    <td className="px-3 py-2.5 font-medium text-foreground">{item.line_total != null ? formatCurrency(item.line_total) : '—'}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{item.instructions || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {prescription.estimated_total != null && (
            <p className="text-right text-sm text-muted-foreground">
              Estimated medicines cost: <span className="font-semibold text-foreground">{formatCurrency(prescription.estimated_total)}</span>
              {' '}— the pharmacist bill may add lab costs from the same case.
            </p>
          )}

          {visitInvoices.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Bill for the accountant</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {visitInvoices.map((invoice) => (
                  <Link
                    key={invoice.id}
                    to={`/billing/invoices/${invoice.id}`}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-sm transition-colors hover:bg-muted/60"
                  >
                    <span className="font-mono text-xs font-semibold text-primary">{invoice.invoice_number}</span>
                    <span className="text-muted-foreground">
                      {formatCurrency(invoice.total)} · paid {formatCurrency(invoice.paid_amount)}
                    </span>
                    {invoice.is_approved ? (
                      <Badge tone="success">Approved</Badge>
                    ) : (
                      <StatusBadge status={invoice.status} />
                    )}
                  </Link>
                ))}
                <p className="text-xs text-muted-foreground">
                  The prescription PDF lists every medicine with its price, plus the full bill. The accountant records
                  the cash and approves the payment there.
                </p>
              </CardContent>
            </Card>
          )}

          <div className="flex flex-col gap-4 border-t pt-5">
            <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Status</span>
            {prescription.status === 'cancelled' ? (
              <Badge tone="danger">Cancelled</Badge>
            ) : (
              <ol className="flex flex-wrap items-center gap-2">
                {STEPS.map((step, index) => (
                  <li key={step} className="flex items-center gap-2">
                    <span
                      className={cn(
                        'inline-flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold',
                        index < currentIndex
                          ? 'border-primary bg-primary text-primary-foreground'
                          : index === currentIndex
                            ? 'border-primary text-primary'
                            : 'border-border text-muted-foreground',
                      )}
                    >
                      {index < currentIndex ? <Check size={13} /> : index + 1}
                    </span>
                    <span
                      className={cn(
                        'text-xs font-medium',
                        index <= currentIndex ? 'text-foreground' : 'text-muted-foreground',
                      )}
                    >
                      {statusLabel(step)}
                    </span>
                    {index < STEPS.length - 1 && <span className="h-px w-8 bg-border" />}
                  </li>
                ))}
              </ol>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
