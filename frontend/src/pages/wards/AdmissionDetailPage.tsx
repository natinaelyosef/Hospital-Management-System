import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
<<<<<<< HEAD
import { ArrowLeft, Bed, CalendarClock, Download, Stethoscope, UserRound } from 'lucide-react'
import { wardApi } from '@/api/ward.api'
import { downloadBlob } from '@/utils/download'
=======
<<<<<<< HEAD
import { ArrowLeft, Bed, CalendarClock, Download, Stethoscope, UserRound } from 'lucide-react'
import { wardApi } from '@/api/ward.api'
import { downloadBlob } from '@/utils/download'
=======
import { ArrowLeft, Bed, CalendarClock, Stethoscope, UserRound } from 'lucide-react'
import { wardApi } from '@/api/ward.api'
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a
import { Alert } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { PageLoader } from '@/components/ui/Spinner'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { DischargeForm } from '@/components/modules/diagnostics/DischargeForm'
import { TransferForm } from '@/components/modules/diagnostics/TransferForm'
import { useAuth } from '@/contexts/AuthContext'
import { formatDateTime, initials, statusLabel } from '@/utils/format'

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium text-foreground">{value}</dd>
    </div>
  )
}

export default function AdmissionDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const canAdmit = hasPermission('wards.admit')
  const canDischarge = hasPermission('wards.discharge')

  const admissionId = Number(id)
  const [transferOpen, setTransferOpen] = useState(false)
  const [dischargeOpen, setDischargeOpen] = useState(false)
<<<<<<< HEAD
=======
<<<<<<< HEAD
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a
  const [downloading, setDownloading] = useState(false)

  const downloadPdf = async () => {
    setDownloading(true)
    try {
      const blob = await wardApi.dischargePdf(admissionId)
      downloadBlob(blob, `${admission.data?.admission_number ?? 'discharge'}.pdf`)
    } finally {
      setDownloading(false)
    }
  }
<<<<<<< HEAD
=======
=======
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a

  const admission = useQuery({
    queryKey: ['admission', admissionId],
    queryFn: () => wardApi.admission(admissionId),
    enabled: Number.isInteger(admissionId) && admissionId > 0,
  })

  if (admission.isLoading) return <PageLoader label="Loading admission…" />

  const data = admission.data
  if (!data) {
    return (
      <div className="space-y-6">
        <PageHeader title="Admission" />
        <EmptyState
          title="Admission not available"
          description="It may have been removed, or you do not have access to it."
          action={
            <Button variant="outline" icon={<ArrowLeft size={15} />} onClick={() => navigate('/wards/admissions')}>
              Back to admissions
            </Button>
          }
        />
      </div>
    )
  }

  const discharged = data.status === 'discharged'
  const canAct = !discharged

  return (
    <div className="space-y-6">
      <PageHeader
        title={data.admission_number}
        subtitle={`${data.patient.full_name} · ${data.ward?.name ?? '—'} · Room ${data.room?.room_number ?? '—'} · Bed ${data.bed?.bed_number ?? '—'}`}
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <Button variant="outline" icon={<ArrowLeft size={15} />} onClick={() => navigate('/wards/admissions')}>
              Back
            </Button>
            {canAdmit && (
              <Button
                variant="outline"
                disabled={!canAct}
                onClick={() => setTransferOpen(true)}
                title={canAct ? undefined : 'Patient already discharged'}
              >
                Transfer
              </Button>
            )}
            {canDischarge && (
              <Button
                disabled={!canAct}
                onClick={() => setDischargeOpen(true)}
                title={canAct ? undefined : 'Patient already discharged'}
              >
                Discharge
              </Button>
            )}
<<<<<<< HEAD
            <Button variant="outline" icon={<Download size={15} />} loading={downloading} onClick={() => void downloadPdf()}>
              Summary PDF
            </Button>
=======
<<<<<<< HEAD
            <Button variant="outline" icon={<Download size={15} />} loading={downloading} onClick={() => void downloadPdf()}>
              Summary PDF
            </Button>
=======
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2.5">
        <StatusBadge status={data.status} />
        <Badge tone={data.status === 'discharged' ? 'neutral' : 'info'}>
          Day {data.total_days}
        </Badge>
        <span className="text-xs text-muted-foreground">Admitted {formatDateTime(data.admitted_at)}</span>
      </div>

      {discharged && (
        <Alert tone={data.outcome === 'deceased' ? 'danger' : 'success'} title={`Discharged · ${statusLabel(data.outcome)}`}>
          <div className="space-y-1">
            <p>Discharged at {formatDateTime(data.discharged_at)}</p>
            {data.discharge_summary && <p>{data.discharge_summary}</p>}
          </div>
        </Alert>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Patient</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-foreground">
                {initials(data.patient.full_name)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{data.patient.full_name}</p>
                <button
                  type="button"
                  onClick={() => navigate(`/patients/${data.patient.id}`)}
                  className="cursor-pointer text-xs text-primary hover:underline"
                >
                  {data.patient.patient_number} · view profile
                </button>
              </div>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
              <div>
                <dt className="text-muted-foreground">Age / gender</dt>
                <dd className="font-medium text-foreground">
                  {data.patient.age} y · {data.patient.gender}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Blood group</dt>
                <dd className="font-medium text-foreground">{data.patient.blood_group ?? '—'}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-muted-foreground">Phone</dt>
                <dd className="font-medium text-foreground">{data.patient.phone || '—'}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Stay</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-3">
              <InfoRow label="Ward / room / bed" value={`${data.ward?.name ?? '—'} · ${data.room?.room_number ?? '—'} · ${data.bed?.bed_number ?? '—'}`} />
              <InfoRow label="Consultant" value={data.consultant?.name ?? '—'} />
              <InfoRow label="Admitted at" value={formatDateTime(data.admitted_at)} />
              <InfoRow label="Current day" value={`Day ${data.total_days}`} />
              <InfoRow label="Diagnosis" value={data.diagnosis || '—'} />
              <InfoRow label="Admitted by" value={data.admitted_by_name || '—'} />
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="relative space-y-6 border-l pl-5">
              <li className="relative">
                <span className="absolute top-1 -left-[1.6rem] flex h-3 w-3 items-center justify-center rounded-full bg-primary ring-4 ring-primary/15" />
                <p className="text-sm font-semibold text-foreground">Admitted</p>
                <p className="text-xs text-muted-foreground">{formatDateTime(data.admitted_at)}</p>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Bed size={12} /> {data.ward?.name ?? '—'} · Room {data.room?.room_number ?? '—'} · Bed {data.bed?.bed_number ?? '—'}
                </p>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <UserRound size={12} /> {data.admitted_by_name || '—'}
                </p>
                {data.diagnosis && (
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Stethoscope size={12} /> {data.diagnosis}
                  </p>
                )}
              </li>
              {discharged && (
                <li className="relative">
                  <span className="absolute top-1 -left-[1.6rem] flex h-3 w-3 items-center justify-center rounded-full bg-emerald-500 ring-4 ring-emerald-500/15" />
                  <p className="text-sm font-semibold text-foreground">Discharged</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(data.discharged_at)}</p>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CalendarClock size={12} /> Outcome: {statusLabel(data.outcome)}
                  </p>
                </li>
              )}
              {!discharged && (
                <li className="relative">
                  <span className="absolute top-1 -left-[1.6rem] flex h-3 w-3 items-center justify-center rounded-full bg-muted-foreground ring-4 ring-muted" />
                  <p className="text-sm font-semibold text-foreground">In care</p>
                  <p className="text-xs text-muted-foreground">Day {data.total_days} · still admitted</p>
                </li>
              )}
            </ol>
          </CardContent>
        </Card>
      </div>

      <TransferForm open={transferOpen} admission={data} onClose={() => setTransferOpen(false)} />
      <DischargeForm open={dischargeOpen} admission={data} onClose={() => setDischargeOpen(false)} />
    </div>
  )
}
