import { useEffect, useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { getFieldErrors, getErrorMessage } from '@/api/client'
import { wardApi } from '@/api/ward.api'
import { Button } from '@/components/ui/Button'
import { FormField } from '@/components/ui/FormField'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { useToast } from '@/components/ui/Toast'
import { useConfirm } from '@/hooks/useConfirm'
import type { Admission } from '@/types'

export interface DischargeFormProps {
  open: boolean
  admission: Admission | null
  onClose: () => void
}

const OUTCOMES = [
  { value: 'recovered', label: 'Recovered' },
  { value: 'improved', label: 'Improved' },
  { value: 'referred', label: 'Referred' },
  { value: 'deceased', label: 'Deceased' },
  { value: 'left_against_advice', label: 'Left against advice' },
]

export function DischargeForm({ open, admission, onClose }: DischargeFormProps) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const confirm = useConfirm()
  const [outcome, setOutcome] = useState('recovered')
  const [summary, setSummary] = useState('')
  const [errors, setErrors] = useState<Record<string, string[]>>({})

  useEffect(() => {
    if (open) {
      setOutcome('recovered')
      setSummary('')
      setErrors({})
    }
  }, [open])

  const discharge = useMutation({
    mutationFn: (payload: { outcome: string; discharge_summary?: string }) => {
      if (!admission) throw new Error('No admission selected')
      return wardApi.discharge(admission.id, payload)
    },
  })

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!admission) return
    setErrors({})

    const confirmed = await confirm({
      title: `Discharge ${admission.patient.full_name}?`,
      message: 'The bed will be released and the outcome recorded on the admission.',
      confirmLabel: 'Discharge patient',
      tone: 'destructive',
    })
    if (!confirmed) return

    try {
      await discharge.mutateAsync({ outcome, discharge_summary: summary.trim() || undefined })
      queryClient.invalidateQueries({ queryKey: ['admission', admission.id] })
      queryClient.invalidateQueries({ queryKey: ['admissions'] })
      queryClient.invalidateQueries({ queryKey: ['wards'] })
      queryClient.invalidateQueries({ queryKey: ['ward-rooms'] })
      queryClient.invalidateQueries({ queryKey: ['bed-availability'] })
      toast.success('Patient discharged', `${admission.patient.full_name} · ${outcome.replace(/_/g, ' ')}`)
      onClose()
    } catch (caught) {
      const fields = getFieldErrors(caught)
      if (Object.keys(fields).length > 0) setErrors(fields)
      else toast.error('Unable to discharge patient', getErrorMessage(caught))
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Discharge patient"
      description={
        admission
          ? `${admission.admission_number} · ${admission.patient.full_name} · day ${admission.total_days}`
          : undefined
      }
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={discharge.isPending}>
            Cancel
          </Button>
          <Button type="submit" form="discharge-form" loading={discharge.isPending}>
            Discharge
          </Button>
        </>
      }
    >
      <form id="discharge-form" onSubmit={onSubmit} className="space-y-4">
        <FormField label="Outcome" htmlFor="discharge-outcome" required error={errors.outcome?.[0]}>
          <Select
            id="discharge-outcome"
            value={outcome}
            onChange={(event) => setOutcome(event.target.value)}
            options={OUTCOMES}
          />
        </FormField>
        <FormField
          label="Discharge summary"
          htmlFor="discharge-summary"
          error={errors.discharge_summary?.[0]}
          hint="Course of stay, treatment given and follow-up instructions"
        >
          <Textarea
            id="discharge-summary"
            rows={5}
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
            placeholder="Patient improved on antibiotics…"
          />
        </FormField>
      </form>
    </Modal>
  )
}

export default DischargeForm
