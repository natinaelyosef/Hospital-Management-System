import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import { getFieldErrors, getErrorMessage } from '@/api/client'
import { billingApi } from '@/api/billing.api'
import { Button } from '@/components/ui/Button'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { PatientPicker } from '@/components/modules/finance/PatientPicker'
import { useToast } from '@/components/ui/Toast'
import type { Invoice, InvoiceItemType, Patient, Service } from '@/types'
import { formatCurrency } from '@/utils/format'

<<<<<<< HEAD
export interface InvoiceLinePreset {
  description: string
  item_type: InvoiceItemType
  quantity: number
  unit_price: number
  service_id?: number | null
}

export interface InvoiceFormModalProps {
  open: boolean
  invoice?: Invoice | null
  initialPatient?: Patient | null
  visitId?: number | null
  presetLines?: InvoiceLinePreset[] | null
=======
export interface InvoiceFormModalProps {
  open: boolean
  invoice?: Invoice | null
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
  onClose: () => void
  onSaved: (invoice: Invoice) => void
}

interface LineDraft {
  key: string
  service_id: number | null
  description: string
  item_type: InvoiceItemType
  quantity: string
  unit_price: string
}

const ITEM_TYPES: { value: InvoiceItemType; label: string }[] = [
  { value: 'consultation', label: 'Consultation' },
  { value: 'lab', label: 'Laboratory' },
  { value: 'medicine', label: 'Medicine' },
  { value: 'room', label: 'Room' },
  { value: 'procedure', label: 'Procedure' },
  { value: 'other', label: 'Other' },
]

const SERVICES_PAGE = { page: 1, per_page: 100 }

function toNumber(value: string): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
}

function emptyLine(): LineDraft {
  return {
    key: Math.random().toString(36).slice(2),
    service_id: null,
    description: '',
    item_type: 'consultation',
    quantity: '1',
    unit_price: '0',
  }
}

<<<<<<< HEAD
export function InvoiceFormModal({ open, invoice, initialPatient, visitId, presetLines, onClose, onSaved }: InvoiceFormModalProps) {
=======
export function InvoiceFormModal({ open, invoice, onClose, onSaved }: InvoiceFormModalProps) {
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
  const queryClient = useQueryClient()
  const toast = useToast()
  const isEdit = Boolean(invoice)

  const [patient, setPatient] = useState<Patient | null>(null)
  const [lines, setLines] = useState<LineDraft[]>([emptyLine()])
  const [discount, setDiscount] = useState('0')
  const [tax, setTax] = useState('0')
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setErrors({})
    setFormError(null)
    if (invoice) {
      setPatient(invoice.patient)
      setDiscount(String(invoice.discount))
      setTax(String(invoice.tax))
      setNotes(invoice.notes ?? '')
      setLines(
        invoice.items.map((item) => ({
          key: String(item.id ?? Math.random().toString(36).slice(2)),
          service_id: item.service_id,
          description: item.description,
          item_type: item.item_type,
          quantity: String(item.quantity),
          unit_price: String(item.unit_price),
        })),
      )
<<<<<<< HEAD
    } else if (presetLines && presetLines.length > 0) {
      setPatient(initialPatient ?? null)
      setDiscount('0')
      setTax('0')
      setNotes(visitId != null ? `Bill for case visit #${visitId}` : '')
      setLines(
        presetLines.map((line) => ({
          key: Math.random().toString(36).slice(2),
          service_id: line.service_id ?? null,
          description: line.description,
          item_type: line.item_type,
          quantity: String(line.quantity),
          unit_price: String(line.unit_price),
        })),
      )
    } else {
      setPatient(initialPatient ?? null)
=======
    } else {
      setPatient(null)
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
      setDiscount('0')
      setTax('0')
      setNotes('')
      setLines([emptyLine()])
    }
<<<<<<< HEAD
  }, [open, invoice, initialPatient, visitId, presetLines])
=======
  }, [open, invoice])
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf

  const { data: services } = useQuery({
    queryKey: ['services', 'picker', SERVICES_PAGE],
    queryFn: () => billingApi.services.list(SERVICES_PAGE),
    enabled: open,
    staleTime: 5 * 60_000,
  })

  const serviceOptions = useMemo(
    () => (services?.data ?? []).filter((service) => service.is_active).map((service) => ({
      value: service.id,
      label: `${service.code} · ${service.name}`,
    })),
    [services],
  )

  const subtotal = lines.reduce(
    (sum, line) => sum + toNumber(line.quantity) * toNumber(line.unit_price),
    0,
  )
  const discountValue = Math.min(toNumber(discount), subtotal)
  const taxValue = toNumber(tax)
  const total = Math.max(0, subtotal - discountValue + taxValue)

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        discount: discountValue,
        tax: taxValue,
        notes: notes.trim() || undefined,
        items: lines.map((line) => ({
          service_id: line.service_id ?? undefined,
          description: line.description.trim(),
          item_type: line.item_type,
          quantity: toNumber(line.quantity),
          unit_price: toNumber(line.unit_price),
        })),
      }
      if (invoice) return billingApi.updateInvoice(invoice.id, payload)
      if (!patient) throw new Error('Select a patient.')
<<<<<<< HEAD
      return billingApi.createInvoice({ ...payload, patient_id: patient.id, visit_id: visitId ?? undefined })
=======
      return billingApi.createInvoice({ ...payload, patient_id: patient.id })
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
    },
    onSuccess: async (saved) => {
      await queryClient.invalidateQueries({ queryKey: ['invoices'] })
      await queryClient.invalidateQueries({ queryKey: ['invoice', saved.id] })
      await queryClient.invalidateQueries({ queryKey: ['billing-summary'] })
      toast.success(isEdit ? 'Invoice updated' : 'Invoice created', saved.invoice_number)
      onSaved(saved)
      onClose()
    },
    onError: (caught) => {
      const fieldErrors = getFieldErrors(caught)
      setErrors(fieldErrors)
      if (Object.keys(fieldErrors).length === 0) setFormError(getErrorMessage(caught, 'Unable to save invoice'))
    },
  })

  const validate = (): boolean => {
    const next: Record<string, string[]> = {}
    if (!isEdit && !patient) next.patient_id = ['Select a patient.']
    if (lines.length === 0) next.items = ['Add at least one line item.']
    lines.forEach((line, index) => {
      if (!line.description.trim()) next[`items.${index}.description`] = ['Description is required.']
      if (toNumber(line.quantity) <= 0) next[`items.${index}.quantity`] = ['Quantity must be at least 1.']
      if (toNumber(line.unit_price) <= 0) next[`items.${index}.unit_price`] = ['Unit price must be greater than 0.']
    })
    setErrors(next)
    setFormError(null)
    return Object.keys(next).length === 0
  }

  const onSubmit = () => {
    if (!validate()) return
    mutation.mutate()
  }

  const updateLine = (key: string, patch: Partial<LineDraft>) => {
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)))
  }

  const applyService = (key: string, serviceId: string) => {
    const service: Service | undefined = (services?.data ?? []).find((item) => item.id === Number(serviceId))
    setLines((current) =>
      current.map((line) =>
        line.key === key
          ? {
              ...line,
              service_id: service ? service.id : null,
              description: service ? service.name : line.description,
              unit_price: service ? String(service.price) : line.unit_price,
            }
          : line,
      ),
    )
  }

  const fieldError = (...keys: string[]): string | undefined => {
    for (const key of keys) {
      const message = errors[key]?.[0]
      if (message) return message
    }
    return undefined
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title={isEdit ? `Edit ${invoice?.invoice_number}` : 'New invoice'}
      description={isEdit ? 'Update line items, discount and tax' : 'Bill a patient for services rendered'}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button onClick={onSubmit} loading={mutation.isPending}>
            {isEdit ? 'Save changes' : 'Create invoice'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {formError && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
            {formError}
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <PatientPicker
            value={patient}
            onChange={setPatient}
            disabled={isEdit}
            error={fieldError('patient_id')}
            label={isEdit ? 'Patient' : 'Patient *'}
            className="sm:col-span-1"
          />
          <FormField label="Notes" htmlFor="invoice-notes" className="sm:col-span-1">
            <Textarea
              id="invoice-notes"
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Internal note shown on the invoice"
            />
          </FormField>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">Line items</p>
            <Button
              size="sm"
              variant="outline"
              icon={<Plus size={14} />}
              onClick={() => setLines((current) => [...current, emptyLine()])}
            >
              Add item
            </Button>
          </div>

          <div className="space-y-3">
            {lines.map((line, index) => (
              <div key={line.key} className="rounded-xl border bg-muted/30 p-3 sm:p-4">
                <div className="grid gap-3 md:grid-cols-[1.6fr_1fr]">
                  <FormField
                    label="Service (optional)"
                    htmlFor={`line-service-${line.key}`}
                    hint="Pick a catalogue item to auto-fill price and description"
                  >
                    <Select
                      id={`line-service-${line.key}`}
                      value={line.service_id ?? ''}
                      onChange={(event) => applyService(line.key, event.target.value)}
                      options={[{ value: '', label: 'Custom item' }, ...serviceOptions]}
                    />
                  </FormField>
                  <FormField
                    label="Description"
                    htmlFor={`line-desc-${line.key}`}
                    required
                    error={fieldError(`items.${index}.description`)}
                  >
                    <Input
                      id={`line-desc-${line.key}`}
                      value={line.description}
                      onChange={(event) => updateLine(line.key, { description: event.target.value })}
                      placeholder="e.g. Outpatient consultation"
                    />
                  </FormField>
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.2fr_0.7fr_1fr_auto]">
                  <FormField label="Item type" htmlFor={`line-type-${line.key}`}>
                    <Select
                      id={`line-type-${line.key}`}
                      value={line.item_type}
                      onChange={(event) => updateLine(line.key, { item_type: event.target.value as InvoiceItemType })}
                      options={ITEM_TYPES}
                    />
                  </FormField>
                  <FormField
                    label="Qty"
                    htmlFor={`line-qty-${line.key}`}
                    required
                    error={fieldError(`items.${index}.quantity`)}
                  >
                    <Input
                      id={`line-qty-${line.key}`}
                      type="number"
                      min={1}
                      value={line.quantity}
                      onChange={(event) => updateLine(line.key, { quantity: event.target.value })}
                    />
                  </FormField>
                  <FormField
                    label="Unit price"
                    htmlFor={`line-price-${line.key}`}
                    required
                    error={fieldError(`items.${index}.unit_price`)}
                  >
                    <Input
                      id={`line-price-${line.key}`}
                      type="number"
                      min={0}
                      step="0.01"
                      value={line.unit_price}
                      onChange={(event) => updateLine(line.key, { unit_price: event.target.value })}
                    />
                  </FormField>
                  <div className="flex items-end justify-between gap-3 lg:flex-col lg:items-end">
                    <span className="text-sm font-semibold text-foreground">
                      {formatCurrency(toNumber(line.quantity) * toNumber(line.unit_price))}
                    </span>
                    <button
                      type="button"
                      aria-label="Remove line"
                      disabled={lines.length === 1}
                      onClick={() => setLines((current) => current.filter((row) => row.key !== line.key))}
                      className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border bg-card text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive disabled:pointer-events-none disabled:opacity-45"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {fieldError('items') && (
            <p role="alert" className="text-xs font-medium text-destructive">
              {errors.items?.[0]}
            </p>
          )}
        </div>

        <div className="grid gap-4 rounded-xl border bg-card p-4 sm:grid-cols-3">
          <div className="sm:col-span-1 space-y-3">
            <FormField label="Discount" htmlFor="invoice-discount" error={fieldError('discount')}>
              <Input
                id="invoice-discount"
                type="number"
                min={0}
                step="0.01"
                value={discount}
                onChange={(event) => setDiscount(event.target.value)}
              />
            </FormField>
            <FormField label="Tax" htmlFor="invoice-tax" error={fieldError('tax')}>
              <Input
                id="invoice-tax"
                type="number"
                min={0}
                step="0.01"
                value={tax}
                onChange={(event) => setTax(event.target.value)}
              />
            </FormField>
          </div>
          <dl className="space-y-2 text-sm sm:col-span-2 sm:justify-self-end">
            <div className="flex items-center justify-between gap-8">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd className="font-medium text-foreground">{formatCurrency(subtotal)}</dd>
            </div>
            <div className="flex items-center justify-between gap-8">
              <dt className="text-muted-foreground">Discount</dt>
              <dd className="font-medium text-foreground">− {formatCurrency(discountValue)}</dd>
            </div>
            <div className="flex items-center justify-between gap-8">
              <dt className="text-muted-foreground">Tax</dt>
              <dd className="font-medium text-foreground">+ {formatCurrency(taxValue)}</dd>
            </div>
            <div className="flex items-center justify-between gap-8 border-t pt-2">
              <dt className="font-semibold text-foreground">Total</dt>
              <dd className="text-lg font-semibold text-foreground">{formatCurrency(total)}</dd>
            </div>
          </dl>
        </div>
      </div>
    </Modal>
  )
}

export default InvoiceFormModal
