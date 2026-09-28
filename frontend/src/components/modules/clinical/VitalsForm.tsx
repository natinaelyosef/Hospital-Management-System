import { useEffect, useState, type FormEvent } from 'react'
import { getFieldErrors, getErrorMessage } from '@/api/client'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Textarea } from '@/components/ui/Textarea'
import type { VitalSignInput } from '@/types'

export interface VitalsFormProps {
  open: boolean
  onClose: () => void
  onSubmit: (payload: VitalSignInput) => Promise<void>
  title?: string
}

type NumericKey =
  | 'bp_systolic'
  | 'bp_diastolic'
  | 'temperature'
  | 'pulse'
  | 'oxygen_saturation'
  | 'weight'
  | 'height'
  | 'respiratory_rate'

const FIELDS: { key: NumericKey; label: string; unit: string }[] = [
  { key: 'bp_systolic', label: 'BP systolic', unit: 'mmHg' },
  { key: 'bp_diastolic', label: 'BP diastolic', unit: 'mmHg' },
  { key: 'temperature', label: 'Temperature', unit: '°C' },
  { key: 'pulse', label: 'Pulse', unit: 'bpm' },
  { key: 'oxygen_saturation', label: 'SpO₂', unit: '%' },
  { key: 'weight', label: 'Weight', unit: 'kg' },
  { key: 'height', label: 'Height', unit: 'cm' },
  { key: 'respiratory_rate', label: 'Respiratory rate', unit: '/min' },
]

type Values = Record<NumericKey, string>

const BLANK: Values = {
  bp_systolic: '',
  bp_diastolic: '',
  temperature: '',
  pulse: '',
  oxygen_saturation: '',
  weight: '',
  height: '',
  respiratory_rate: '',
}

export function VitalsForm({ open, onClose, onSubmit, title = 'Record vitals' }: VitalsFormProps) {
  const [values, setValues] = useState<Values>(BLANK)
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setValues(BLANK)
    setNotes('')
    setError(null)
    setFieldErrors({})
  }, [open])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const invalid = FIELDS.some((field) => {
      const raw = values[field.key].trim()
      return raw !== '' && !Number.isFinite(Number(raw))
    })
    if (invalid) {
      setError('Vitals must be numeric where a value is provided.')
      return
    }

    const payload: VitalSignInput = {
      bp_systolic: values.bp_systolic.trim() === '' ? null : Number(values.bp_systolic),
      bp_diastolic: values.bp_diastolic.trim() === '' ? null : Number(values.bp_diastolic),
      temperature: values.temperature.trim() === '' ? null : Number(values.temperature),
      pulse: values.pulse.trim() === '' ? null : Number(values.pulse),
      oxygen_saturation: values.oxygen_saturation.trim() === '' ? null : Number(values.oxygen_saturation),
      weight: values.weight.trim() === '' ? null : Number(values.weight),
      height: values.height.trim() === '' ? null : Number(values.height),
      respiratory_rate: values.respiratory_rate.trim() === '' ? null : Number(values.respiratory_rate),
      notes: notes.trim() || null,
    }

    setBusy(true)
    setError(null)
    setFieldErrors({})
    try {
      await onSubmit(payload)
      onClose()
    } catch (caught) {
      const errors = getFieldErrors(caught)
      setFieldErrors(errors)
      setError(Object.keys(errors).length === 0 ? getErrorMessage(caught, 'Unable to record vitals') : null)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} size="lg" title={title} description="All fields are optional — leave blank when not measured">
      <form onSubmit={submit} className="flex flex-col gap-4">
        {error && <Alert tone="danger">{error}</Alert>}

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {FIELDS.map((field) => (
            <FormField
              key={field.key}
              label={field.label}
              htmlFor={`vital-${field.key}`}
              error={fieldErrors[field.key]?.[0]}
            >
              <Input
                id={`vital-${field.key}`}
                type="number"
                step="any"
                min={0}
                value={values[field.key]}
                onChange={(event) =>
                  setValues((current) => ({ ...current, [field.key]: event.target.value }))
                }
                invalid={Boolean(fieldErrors[field.key])}
                placeholder={field.unit}
              />
            </FormField>
          ))}
        </div>

        <FormField label="Notes" htmlFor="vitals-notes">
          <Textarea
            id="vitals-notes"
            rows={2}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Context, positioning, device used…"
          />
        </FormField>

        <div className="flex justify-end gap-2.5 border-t pt-4">
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" loading={busy}>
            Record vitals
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default VitalsForm
