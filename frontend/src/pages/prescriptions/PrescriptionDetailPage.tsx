import { useState, type ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Printer, Stethoscope } from 'lucide-react'
import { getErrorMessage } from '@/api/client'
import { prescriptionApi } from '@/api/prescription.api'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { PageLoader } from '@/components/ui/Spinner'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/contexts/AuthContext'
import { useConfirm } from '@/hooks'
import type { PrescriptionStatus } from '@/types'
import { cn } from '@/utils/cn'
import { formatDate, formatDateTime, statusLabel } from '@/utils/format'

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

  const { data: prescription, isLoading, isError, refetch } = useQuery({
    queryKey: ['prescription', prescriptionId],
    queryFn: () => prescriptionApi.get(prescriptionId),
    enabled: Number.isFinite(prescriptionId) && prescriptionId > 0,
  })

  const statusMutation = useMutation({
    mutationFn: (status: PrescriptionStatus) => prescriptionApi.updateStatus(prescriptionId, status),
    onSuccess: (updated) => {
      toast.success('Status updated', `${updated.prescription_number} is now ${statusLabel(updated.status)}`)
      queryClient.invalidateQueries({ queryKey: ['prescription', prescriptionId] })
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] })
      setPendingTarget(null)
    },
    onError: (caught) => {
      toast.error('Unable to update status', getErrorMessage(caught))
      setPendingTarget(null)
    },
  })

  const requestTransition = async (target: PrescriptionStatus) => {
    const approved = await confirm({
      title: `Mark prescription as ${statusLabel(target).toLowerCase()}?`,
      message:
        target === 'dispensed'
          ? 'Dispensing will decrement pharmacy stock for every line item.'
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

  return (
    <div className="space-y-6">
      <div className="print:hidden">
        <PageHeader
          title={`Prescription ${prescription.prescription_number}`}
          subtitle={`${prescription.patient.full_name} · ${formatDate(prescription.created_at)}`}
          actions={
            <>
              <Button variant="outline" icon={<Printer size={15} />} onClick={() => window.print()}>
                Print
              </Button>
              {transitions.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  {transitions.map((target) => (
                    <Button
                      key={target}
                      variant={target === 'cancelled' ? 'destructive' : 'primary'}
                      size="md"
                      disabled={statusMutation.isPending}
                      loading={statusMutation.isPending && pendingTarget === target}
                      onClick={() => void requestTransition(target)}
                    >
                      {target === 'dispensed' ? 'Dispense' : target === 'cancelled' ? 'Cancel' : target === 'pending' ? 'Move to pending' : 'Mark processing'}
                    </Button>
                  ))}
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
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead className="bg-muted/60">
                <tr>
                  {['Medicine', 'Dosage', 'Frequency', 'Duration', 'Qty', 'Instructions'].map((header) => (
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
                    <td className="px-3 py-2.5 text-muted-foreground">{item.instructions || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

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
