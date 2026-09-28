import { useEffect, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Trash2, X } from 'lucide-react'
import { pharmacyApi } from '@/api/pharmacy.api'
import { prescriptionApi, type PrescriptionInput } from '@/api/prescription.api'
import { getFieldErrors, getErrorMessage } from '@/api/client'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Spinner } from '@/components/ui/Spinner'
import { useToast } from '@/components/ui/Toast'
import { useDebounce } from '@/hooks/useDebounce'
import type { Patient, Prescription } from '@/types'
import { cn } from '@/utils/cn'
<<<<<<< HEAD
import { formatCurrency } from '@/utils/format'
=======
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
import { PatientPicker } from './PatientPicker'

export interface PrescriptionBuilderProps {
  open: boolean
  onClose: () => void
  initialPatient?: Patient | null
  visitId?: number | null
  diagnosis?: string | null
  onCreated?: (prescription: Prescription) => void
}

interface ItemRow {
  key: string
  medicine_id: number | null
  medicine_name: string
<<<<<<< HEAD
  unit_price: number | null
  stock_quantity: number | null
=======
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
  dosage: string
  frequency: string
  duration: string
  quantity: string
  instructions: string
}

function blankRow(): ItemRow {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    medicine_id: null,
    medicine_name: '',
<<<<<<< HEAD
    unit_price: null,
    stock_quantity: null,
=======
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
    dosage: '',
    frequency: '',
    duration: '',
    quantity: '1',
    instructions: '',
  }
}

function MedicineSelect({
  value,
  label,
  onChange,
  invalid,
}: {
  value: number | null
  label: string
<<<<<<< HEAD
  onChange: (medicineId: number | null, name: string, unitPrice?: number, stockQuantity?: number) => void
=======
  onChange: (medicineId: number | null, name: string) => void
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
  invalid?: boolean
}) {
  const [term, setTerm] = useState('')
  const [open, setOpen] = useState(false)
  const debounced = useDebounce(term, 300)

  const { data, isFetching, isError } = useQuery({
    queryKey: ['medicines', 'search', debounced],
    queryFn: () => pharmacyApi.medicines({ search: debounced, per_page: 10 }),
    enabled: open && debounced.trim().length >= 2,
    staleTime: 30_000,
    retry: 0,
  })

  const results = data?.data ?? []

  return (
    <div className="relative">
      <Search size={14} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" />
      <input
        type="text"
        role="combobox"
        aria-expanded={open}
        value={term}
        placeholder="Search medicine…"
        onChange={(event) => {
          const next = event.target.value
          setTerm(next)
          setOpen(true)
<<<<<<< HEAD
          if (value && next !== label) onChange(null, '', undefined, undefined)
=======
          if (value && next !== label) onChange(null, '')
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
        }}
        onFocus={() => setOpen(term.trim().length >= 2)}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        className={cn(
          'h-9.5 w-full rounded-lg border bg-card pr-8 pl-8 text-sm text-foreground shadow-xs transition-colors',
          'placeholder:text-muted-foreground/70',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:border-primary/60',
          invalid ? 'border-destructive/70' : 'border-input',
        )}
      />
      {value && (
        <button
          type="button"
          aria-label="Clear medicine"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            setTerm('')
<<<<<<< HEAD
            onChange(null, '', undefined, undefined)
=======
            onChange(null, '')
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
          }}
          className="absolute top-1/2 right-2 inline-flex h-5 w-5 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X size={12} />
        </button>
      )}
      {open && (
        <div className="absolute top-full right-0 left-0 z-40 mt-1 max-h-52 overflow-y-auto rounded-lg border bg-popover p-1 shadow-lg">
          {isFetching && (
            <p className="flex items-center gap-2 px-3 py-3 text-xs text-muted-foreground">
              <Spinner size="sm" /> Searching…
            </p>
          )}
          {isError && (
            <p className="px-3 py-3 text-center text-xs text-destructive">
              Unable to search medicines — your role may lack pharmacy access.
            </p>
          )}
          {!isFetching && !isError && results.length === 0 && (
            <p className="px-3 py-3 text-center text-xs text-muted-foreground">No medicines found.</p>
          )}
          {results.map((medicine) => (
            <button
              key={medicine.id}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
<<<<<<< HEAD
                onChange(medicine.id, medicine.name, medicine.selling_price, medicine.stock_quantity)
=======
                onChange(medicine.id, medicine.name)
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
                setTerm(medicine.name)
                setOpen(false)
              }}
              className="flex w-full cursor-pointer flex-col gap-0.5 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-muted"
            >
              <span className="truncate text-xs font-medium text-foreground">
                {medicine.name}
                {medicine.strength ? ` · ${medicine.strength}` : ''}
              </span>
              <span className="truncate text-[11px] text-muted-foreground">
<<<<<<< HEAD
                {medicine.form} · in stock {medicine.stock_quantity} · {medicine.selling_price.toFixed(2)}
=======
                {medicine.form} · in stock {medicine.stock_quantity}
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function PrescriptionBuilder({
  open,
  onClose,
  initialPatient = null,
  visitId = null,
  diagnosis = null,
  onCreated,
}: PrescriptionBuilderProps) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [patient, setPatient] = useState<Patient | null>(initialPatient)
  const [diagnosisValue, setDiagnosisValue] = useState(diagnosis ?? '')
  const [notes, setNotes] = useState('')
  const [rows, setRows] = useState<ItemRow[]>([blankRow()])
  const [error, setError] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string[]>>({})

  useEffect(() => {
    if (!open) return
    setPatient(initialPatient)
    setDiagnosisValue(diagnosis ?? '')
    setNotes('')
    setRows([blankRow()])
    setError(null)
    setErrors({})
  }, [open, initialPatient, diagnosis])

  const updateRow = (key: string, patch: Partial<ItemRow>) =>
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)))

  const mutation = useMutation({
    mutationFn: (payload: PrescriptionInput) => prescriptionApi.create(payload),
    onSuccess: (prescription) => {
      toast.success('Prescription created', `${prescription.prescription_number} · ${prescription.items.length} item(s)`)
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] })
      queryClient.invalidateQueries({ queryKey: ['visits'] })
      if (visitId) queryClient.invalidateQueries({ queryKey: ['visit', visitId] })
      onCreated?.(prescription)
      onClose()
    },
    onError: (caught) => {
      const fieldErrors = getFieldErrors(caught)
      setErrors(fieldErrors)
      setError(Object.keys(fieldErrors).length === 0 ? getErrorMessage(caught, 'Unable to create prescription') : null)
    },
  })

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    const problems: string[] = []
    if (!patient) problems.push('Select a patient.')
    if (rows.length === 0) problems.push('Add at least one medicine.')

    rows.forEach((row, index) => {
      const position = `Row ${index + 1}`
      if (!row.medicine_id) problems.push(`${position}: select a medicine.`)
      if (!row.dosage.trim()) problems.push(`${position}: dosage is required.`)
      if (!row.frequency.trim()) problems.push(`${position}: frequency is required.`)
      if (!row.duration.trim()) problems.push(`${position}: duration is required.`)
      if (!Number.isFinite(Number(row.quantity)) || Number(row.quantity) < 1) problems.push(`${position}: quantity must be at least 1.`)
    })

    setErrors({})
    if (problems.length > 0) {
      setError(problems.join(' '))
      return
    }
    setError(null)

    mutation.mutate({
      patient_id: patient!.id,
      visit_id: visitId ?? undefined,
      diagnosis: diagnosisValue.trim() || undefined,
      notes: notes.trim() || undefined,
      items: rows.map((row) => ({
        medicine_id: row.medicine_id!,
        dosage: row.dosage.trim(),
        frequency: row.frequency.trim(),
        duration: row.duration.trim(),
        quantity: Number(row.quantity),
        instructions: row.instructions.trim() || null,
      })),
    })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title="New prescription"
      description="Search the pharmacy catalogue and add each medicine line"
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {error && <Alert tone="danger">{error}</Alert>}

        <FormField label="Patient" required error={errors.patient_id?.[0]}>
          <PatientPicker value={patient} onChange={setPatient} error={errors.patient_id?.[0]} />
        </FormField>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Diagnosis" htmlFor="rx-diagnosis" error={errors.diagnosis?.[0]}>
            <Input
              id="rx-diagnosis"
              value={diagnosisValue}
              onChange={(event) => setDiagnosisValue(event.target.value)}
              invalid={Boolean(errors.diagnosis?.[0])}
            />
          </FormField>
          <FormField label="Notes to pharmacy" htmlFor="rx-notes" error={errors.notes?.[0]}>
            <Input
              id="rx-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              invalid={Boolean(errors.notes?.[0])}
            />
          </FormField>
        </div>

        <div className="flex flex-col gap-3 rounded-xl border bg-muted/30 p-3">
          <div className="hidden gap-3 md:grid md:grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))_auto]">
            <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Medicine</span>
            <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Dosage</span>
            <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Frequency</span>
            <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Duration</span>
            <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Qty</span>
            <span className="w-8" />
          </div>

          {rows.map((row) => (
            <div
              key={row.key}
              className="flex flex-col gap-3 rounded-lg border bg-card p-3 md:grid md:grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))_auto] md:items-center"
            >
              <div className="flex flex-col gap-1">
                <MedicineSelect
                  value={row.medicine_id}
                  label={row.medicine_name}
<<<<<<< HEAD
                  onChange={(medicineId, name, unitPrice, stockQuantity) =>
                    updateRow(row.key, {
                      medicine_id: medicineId,
                      medicine_name: name,
                      unit_price: unitPrice ?? null,
                      stock_quantity: stockQuantity ?? null,
                    })
                  }
                />
                {row.medicine_id != null && (
                  <p className="text-[11px] text-muted-foreground">
                    {row.unit_price != null ? formatCurrency(row.unit_price) : '—'} each
                    {row.stock_quantity != null ? ` · ${row.stock_quantity} in stock` : ''}
                    {Number(row.quantity) > 0 && row.unit_price != null
                      ? ` · line ${formatCurrency(row.unit_price * Number(row.quantity))}`
                      : ''}
                  </p>
                )}
=======
                  onChange={(medicineId, name) => updateRow(row.key, { medicine_id: medicineId, medicine_name: name })}
                />
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
                <Input
                  value={row.instructions}
                  onChange={(event) => updateRow(row.key, { instructions: event.target.value })}
                  placeholder="Instructions (optional)"
                  className="h-8 text-xs"
                />
              </div>
              <Input
                value={row.dosage}
                onChange={(event) => updateRow(row.key, { dosage: event.target.value })}
                placeholder="1 tab"
              />
              <Input
                value={row.frequency}
                onChange={(event) => updateRow(row.key, { frequency: event.target.value })}
                placeholder="2× daily"
              />
              <Input
                value={row.duration}
                onChange={(event) => updateRow(row.key, { duration: event.target.value })}
                placeholder="5 days"
              />
              <Input
                type="number"
                min={1}
                value={row.quantity}
                onChange={(event) => updateRow(row.key, { quantity: event.target.value })}
              />
              <div className="flex items-center justify-end md:justify-center">
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Remove medicine"
                  disabled={rows.length === 1}
                  onClick={() => setRows((current) => current.filter((item) => item.key !== row.key))}
                  icon={<Trash2 size={14} />}
                />
              </div>
            </div>
          ))}

          <Button
            variant="outline"
            size="sm"
            className="self-start"
            icon={<Plus size={14} />}
            onClick={() => setRows((current) => [...current, blankRow()])}
          >
            Add medicine
          </Button>
<<<<<<< HEAD
          {rows.some((row) => row.unit_price != null) && (
            <p className="text-right text-sm text-muted-foreground">
              Estimated cost:{' '}
              <span className="font-semibold text-foreground">
                {formatCurrency(
                  rows.reduce(
                    (sum, row) =>
                      sum + (row.unit_price != null && Number(row.quantity) > 0 ? row.unit_price * Number(row.quantity) : 0),
                    0,
                  ),
                )}
              </span>{' '}
              — the pharmacist prepares the exact bill for the accountant.
            </p>
          )}
=======
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
        </div>

        <div className="flex justify-end gap-2.5 border-t pt-4">
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" loading={mutation.isPending}>
            Create prescription
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default PrescriptionBuilder
