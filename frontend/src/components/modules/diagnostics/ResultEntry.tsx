import { useEffect, useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { getErrorMessage } from '@/api/client'
import { labApi, type LabResultInput } from '@/api/lab.api'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Textarea } from '@/components/ui/Textarea'
import { useToast } from '@/components/ui/Toast'
import { statusLabel } from '@/utils/format'
import type { LabRequest } from '@/types'

export interface ResultEntryProps {
  open: boolean
  request: LabRequest | null
  onClose: () => void
}

interface ResultRow {
  lab_test_id: number
  test_name: string
  test_code: string
  status: string
  result_value: string
  reference_range: string
  unit: string
  notes: string
}

function toRows(request: LabRequest | null): ResultRow[] {
  return (request?.results ?? []).map((result) => ({
    lab_test_id: result.lab_test_id,
    test_name: result.test_name,
    test_code: result.test_code,
    status: result.status,
    result_value: result.result_value ?? '',
    reference_range: result.reference_range ?? '',
    unit: result.unit ?? '',
    notes: result.notes ?? '',
  }))
}

export function ResultEntry({ open, request, onClose }: ResultEntryProps) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [rows, setRows] = useState<ResultRow[]>([])

  useEffect(() => {
    if (open) setRows(toRows(request))
  }, [open, request])

  const submit = useMutation({
    mutationFn: (results: LabResultInput[]) => {
      if (!request) throw new Error('No request selected')
      return labApi.submitResults(request.id, results)
    },
  })

  const update = (labTestId: number, key: keyof ResultRow, value: string) =>
    setRows((current) => current.map((row) => (row.lab_test_id === labTestId ? { ...row, [key]: value } : row)))

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!request) return

    const results: LabResultInput[] = rows
      .filter((row) => row.result_value.trim())
      .map((row) => ({
        lab_test_id: row.lab_test_id,
        result_value: row.result_value.trim(),
        reference_range: row.reference_range.trim() || undefined,
        unit: row.unit.trim() || undefined,
        notes: row.notes.trim() || undefined,
      }))

    if (results.length === 0) {
      toast.error('Nothing to save', 'Enter a result value for at least one test.')
      return
    }

    try {
      await submit.mutateAsync(results)
      queryClient.invalidateQueries({ queryKey: ['lab-request', request.id] })
      queryClient.invalidateQueries({ queryKey: ['lab-requests'] })
      toast.success('Results saved', `${results.length} of ${rows.length} tests recorded`)
      onClose()
    } catch (caught) {
      toast.error('Unable to save results', getErrorMessage(caught))
    }
  }

  const pending = rows.filter((row) => !row.result_value.trim()).length

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title="Enter results"
      description={
        request
          ? `${request.request_number} · ${request.patient.full_name} — ${rows.length - pending} of ${rows.length} recorded`
          : undefined
      }
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={submit.isPending}>
            Cancel
          </Button>
          <Button type="submit" form="result-entry-form" loading={submit.isPending}>
            Save results
          </Button>
        </>
      }
    >
      <form id="result-entry-form" onSubmit={onSubmit} className="space-y-4">
        {rows.map((row) => (
          <div key={row.lab_test_id} className="space-y-3 rounded-lg border p-4 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{row.test_name}</p>
                <p className="text-xs text-muted-foreground">{row.test_code}</p>
              </div>
              <Badge tone={row.status === 'completed' ? 'success' : 'info'}>{statusLabel(row.status)}</Badge>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <FormField label="Result value" required>
                <Input
                  required
                  value={row.result_value}
                  onChange={(event) => update(row.lab_test_id, 'result_value', event.target.value)}
                  placeholder="e.g. 7.2"
                />
              </FormField>
              <FormField label="Reference range">
                <Input
                  value={row.reference_range}
                  onChange={(event) => update(row.lab_test_id, 'reference_range', event.target.value)}
                  placeholder="e.g. 4.0 – 5.6"
                />
              </FormField>
              <FormField label="Unit">
                <Input
                  value={row.unit}
                  onChange={(event) => update(row.lab_test_id, 'unit', event.target.value)}
                  placeholder="e.g. mmol/L"
                />
              </FormField>
            </div>
            <FormField label="Notes">
              <Textarea
                rows={2}
                value={row.notes}
                onChange={(event) => update(row.lab_test_id, 'notes', event.target.value)}
                placeholder="Interpretation or remarks"
              />
            </FormField>
          </div>
        ))}
        {pending > 0 && (
          <p className="text-xs text-muted-foreground">
            Rows without a result value are skipped — the request stays in processing until every test is recorded.
          </p>
        )}
      </form>
    </Modal>
  )
}

export default ResultEntry
