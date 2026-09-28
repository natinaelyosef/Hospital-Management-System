import { useState } from 'react'
<<<<<<< HEAD
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Ban, CircleCheck, Download, Play, Printer, Stethoscope } from 'lucide-react'
import { getErrorMessage } from '@/api/client'
import { labApi } from '@/api/lab.api'
import { downloadBlob } from '@/utils/download'
import { formatCurrency } from '@/utils/format'
=======
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Ban, CircleCheck, Play, Printer } from 'lucide-react'
import { getErrorMessage } from '@/api/client'
import { labApi } from '@/api/lab.api'
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
import { Alert } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { PageLoader } from '@/components/ui/Spinner'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Table, type Column } from '@/components/ui/Table'
import { useToast } from '@/components/ui/Toast'
import { ResultEntry } from '@/components/modules/diagnostics/ResultEntry'
import { useAuth } from '@/contexts/AuthContext'
import { useConfirm } from '@/hooks'
import type { LabResult } from '@/types'
import { formatDateTime, initials, statusLabel } from '@/utils/format'

export default function LabRequestDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const queryClient = useQueryClient()
  const toast = useToast()
  const confirm = useConfirm()

  const canProcess = hasPermission('lab.process')
  const requestId = Number(id)
  const [resultsOpen, setResultsOpen] = useState(false)
<<<<<<< HEAD
  const [downloading, setDownloading] = useState(false)

  const downloadPdf = async () => {
    setDownloading(true)
    try {
      const blob = await labApi.reportPdf(requestId)
      downloadBlob(blob, `${request.data?.request_number ?? 'lab-report'}.pdf`)
    } catch (caught) {
      toast.error('Unable to download PDF', getErrorMessage(caught))
    } finally {
      setDownloading(false)
    }
  }
=======
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf

  const request = useQuery({
    queryKey: ['lab-request', requestId],
    queryFn: () => labApi.request(requestId),
    enabled: Number.isInteger(requestId) && requestId > 0,
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['lab-request', requestId] })
    queryClient.invalidateQueries({ queryKey: ['lab-requests'] })
  }

  const start = useMutation({
    mutationFn: () => labApi.start(requestId),
    onSuccess: () => {
      invalidate()
      toast.success('Processing started')
    },
    onError: (error) => toast.error('Unable to start request', getErrorMessage(error)),
  })

  const cancel = useMutation({
    mutationFn: () => labApi.cancel(requestId),
    onSuccess: () => {
      invalidate()
      toast.success('Request cancelled')
    },
    onError: (error) => toast.error('Unable to cancel request', getErrorMessage(error)),
  })

  const handleCancel = async () => {
    const confirmed = await confirm({
      title: 'Cancel this lab request?',
      message: 'Recorded results are kept, but the request will no longer be processed.',
      confirmLabel: 'Cancel request',
      tone: 'destructive',
    })
    if (confirmed) cancel.mutate()
  }

  if (request.isLoading) return <PageLoader label="Loading lab request…" />

  const data = request.data
  if (!data) {
    return (
      <div className="space-y-6">
        <PageHeader title="Lab request" />
        <EmptyState
          title="Request not available"
          description="It may have been removed, or you do not have access to it."
          action={<Button variant="outline" icon={<ArrowLeft size={15} />} onClick={() => navigate('/laboratory/requests')}>Back to queue</Button>}
        />
      </div>
    )
  }

  const isActive = data.status === 'requested' || data.status === 'processing'
  const completedCount = data.results.filter((result) => result.status === 'completed').length

  const resultColumns: Column<LabResult>[] = [
    {
      key: 'test_name',
      header: 'Test',
      render: (result) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{result.test_name}</p>
          <p className="truncate text-xs text-muted-foreground">{result.test_code}</p>
        </div>
      ),
    },
    { key: 'status', header: 'Status', render: (result) => <StatusBadge status={result.status} /> },
    {
      key: 'result_value',
      header: 'Result',
      render: (result) =>
        result.result_value ? (
          <span className="font-medium tabular-nums">{result.result_value}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: 'reference_range',
      header: 'Reference range',
      render: (result) => result.reference_range || '—',
      hideBelow: 'md',
    },
    { key: 'unit', header: 'Unit', render: (result) => result.unit || '—', hideBelow: 'md' },
    {
      key: 'notes',
      header: 'Notes',
      render: (result) => <span className="line-clamp-2">{result.notes || '—'}</span>,
      hideBelow: 'lg',
    },
    {
      key: 'performed_at',
      header: 'Performed at',
      render: (result) => (
        <span className="whitespace-nowrap">{result.performed_at ? formatDateTime(result.performed_at) : '—'}</span>
      ),
      hideBelow: 'sm',
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title={data.request_number}
        subtitle={`${data.patient.full_name} · ${statusLabel(data.status)}`}
        actions={
          <div className="flex flex-wrap items-center gap-2.5 print:hidden">
            <Button variant="outline" icon={<ArrowLeft size={15} />} onClick={() => navigate('/laboratory/requests')}>
              Back
            </Button>
            {canProcess && data.status === 'requested' && (
              <Button icon={<Play size={15} />} loading={start.isPending} onClick={() => start.mutate()}>
                Start processing
              </Button>
            )}
            {canProcess && isActive && (
              <Button icon={<CircleCheck size={15} />} onClick={() => setResultsOpen(true)}>
                Enter results
              </Button>
            )}
            {canProcess && isActive && (
              <Button variant="outline" icon={<Ban size={15} />} loading={cancel.isPending} onClick={handleCancel}>
                Cancel request
              </Button>
            )}
            <Button variant="outline" icon={<Printer size={15} />} onClick={() => window.print()}>
              Print
            </Button>
<<<<<<< HEAD
            <Button variant="outline" icon={<Download size={15} />} loading={downloading} onClick={() => void downloadPdf()}>
              PDF
            </Button>
=======
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
          </div>
        }
      />

<<<<<<< HEAD
      {data.visit_id != null && (
        <Alert tone="info" title={`Linked case — results flow back to the doctor`}>
          <span className="flex flex-wrap items-center gap-2">
            <span>This lab order belongs to a consultation case. Completing it redirects the results to the doctor automatically.</span>
            <Link
              to={`/consultation/${data.visit_id}`}
              className="inline-flex items-center gap-1.5 rounded-lg border bg-card px-2.5 py-1 text-xs font-semibold text-primary hover:bg-muted"
            >
              <Stethoscope size={13} /> Open case
            </Link>
          </span>
        </Alert>
      )}
      {data.status === 'completed' && (
        <Alert tone="success" title="All results are in — sent back to the doctor">
          This request is complete — {completedCount} of {data.results.length} tests verified
          {data.estimated_cost != null && data.estimated_cost > 0 ? ` · billing value ${formatCurrency(data.estimated_cost)}` : ''}.
          The doctor was notified and the case is ready for review. Use Print for a hard copy.
=======
      {data.status === 'completed' && (
        <Alert tone="success" title="All results are in">
          This request is complete — {completedCount} of {data.results.length} tests verified. Use Print for a hard copy.
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
        </Alert>
      )}
      {data.status === 'cancelled' && (
        <Alert tone="danger" title="Request cancelled">
          This request was cancelled and will not be processed further.
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

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Request details</CardTitle>
            <CardDescription>Ordered by {data.doctor?.name ?? '—'}</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <dt className="text-xs text-muted-foreground">Status</dt>
                <dd className="mt-1">
                  <StatusBadge status={data.status} />
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Priority</dt>
                <dd className="mt-1">
                  <Badge tone={data.priority === 'urgent' ? 'danger' : 'neutral'}>{data.priority}</Badge>
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Requested at</dt>
                <dd className="text-sm font-medium text-foreground">{formatDateTime(data.requested_at)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Tests ordered</dt>
                <dd className="text-sm font-medium text-foreground">
                  {completedCount}/{data.results.length} completed
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs text-muted-foreground">Notes</dt>
                <dd className="text-sm text-foreground">{data.notes || '—'}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-foreground">Test results</h2>
          {canProcess && isActive && (
            <Button size="sm" variant="outline" onClick={() => setResultsOpen(true)} className="print:hidden">
              Enter results
            </Button>
          )}
        </div>
        <Table
          columns={resultColumns}
          data={data.results}
          rowKey={(row) => row.id ?? row.lab_test_id}
          empty={<EmptyState compact title="No tests on this request" />}
        />
      </div>

      <ResultEntry open={resultsOpen} request={data} onClose={() => setResultsOpen(false)} />
    </div>
  )
}
