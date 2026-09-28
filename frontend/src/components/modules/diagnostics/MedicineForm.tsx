import { useEffect, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getFieldErrors, getErrorMessage } from '@/api/client'
import { pharmacyApi, type BatchInput } from '@/api/pharmacy.api'
import { Button } from '@/components/ui/Button'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/components/ui/Toast'
import type { Medicine, MedicineInput } from '@/types'

export interface MedicineFormProps {
  open: boolean
  medicine?: Medicine | null
  onClose: () => void
}

interface FormState {
  name: string
  generic_name: string
  category_id: string
  supplier_id: string
  form: string
  strength: string
  unit: string
  reorder_level: string
  selling_price: string
  batch_number: string
  expiry_date: string
  quantity: string
  purchase_price: string
}

const EMPTY_FORM: FormState = {
  name: '',
  generic_name: '',
  category_id: '',
  supplier_id: '',
  form: '',
  strength: '',
  unit: '',
  reorder_level: '10',
  selling_price: '',
  batch_number: '',
  expiry_date: '',
  quantity: '',
  purchase_price: '',
}

function toFormState(medicine: Medicine | null | undefined): FormState {
  if (!medicine) return EMPTY_FORM
  return {
    name: medicine.name,
    generic_name: medicine.generic_name ?? '',
    category_id: medicine.category ? String(medicine.category.id) : '',
    supplier_id: medicine.supplier ? String(medicine.supplier.id) : '',
    form: medicine.form,
    strength: medicine.strength ?? '',
    unit: medicine.unit,
    reorder_level: String(medicine.reorder_level),
    selling_price: String(medicine.selling_price),
    batch_number: '',
    expiry_date: '',
    quantity: '',
    purchase_price: '',
  }
}

export function MedicineForm({ open, medicine, onClose }: MedicineFormProps) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [errors, setErrors] = useState<Record<string, string[]>>({})

  const categories = useQuery({ queryKey: ['medicine-categories'], queryFn: pharmacyApi.categories })
  const suppliers = useQuery({ queryKey: ['suppliers'], queryFn: pharmacyApi.suppliers })

  useEffect(() => {
    if (open) {
      setForm(toFormState(medicine))
      setErrors({})
    }
  }, [open, medicine])

  const save = useMutation({
    mutationFn: async (input: { payload: MedicineInput; batch?: BatchInput }) => {
      if (medicine) return pharmacyApi.updateMedicine(medicine.id, input.payload)
      const created = await pharmacyApi.createMedicine(input.payload)
      if (input.batch) await pharmacyApi.addBatch(created.id, input.batch)
      return created
    },
  })

  const set = (key: keyof FormState) => (event: { target: { value: string } }) =>
    setForm((current) => ({ ...current, [key]: event.target.value }))

  const error = (key: string) => errors[key]?.[0]

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setErrors({})

    const payload: MedicineInput = {
      name: form.name.trim(),
      generic_name: form.generic_name.trim() || null,
      category_id: form.category_id ? Number(form.category_id) : null,
      supplier_id: form.supplier_id ? Number(form.supplier_id) : null,
      form: form.form.trim(),
      strength: form.strength.trim() || null,
      unit: form.unit.trim(),
      reorder_level: Number(form.reorder_level) || 0,
      selling_price: Number(form.selling_price),
    }

    const batch: BatchInput | undefined = form.batch_number.trim()
      ? {
          batch_number: form.batch_number.trim(),
          expiry_date: form.expiry_date,
          quantity: Number(form.quantity) || 0,
          purchase_price: Number(form.purchase_price) || 0,
        }
      : undefined

    if (batch && !batch.expiry_date) {
      setErrors({ expiry_date: ['Expiry date is required for a new batch.'] })
      return
    }

    try {
      await save.mutateAsync({ payload, batch })
      queryClient.invalidateQueries({ queryKey: ['medicines'] })
      queryClient.invalidateQueries({ queryKey: ['pharmacy-alerts'] })
      queryClient.invalidateQueries({ queryKey: ['pharmacy-transactions'] })
      if (medicine) queryClient.invalidateQueries({ queryKey: ['medicine', medicine.id] })
      toast.success(medicine ? 'Medicine updated' : 'Medicine added', payload.name)
      onClose()
    } catch (caught) {
      const fields = getFieldErrors(caught)
      if (Object.keys(fields).length > 0) setErrors(fields)
      else toast.error('Unable to save medicine', getErrorMessage(caught))
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={medicine ? 'Edit medicine' : 'Add medicine'}
      description={
        medicine ? 'Update catalogue details, pricing and stock levels' : 'Register a medicine, optionally with its first batch'
      }
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={save.isPending}>
            Cancel
          </Button>
          <Button type="submit" form="medicine-form" loading={save.isPending}>
            {medicine ? 'Save changes' : 'Add medicine'}
          </Button>
        </>
      }
    >
      <form id="medicine-form" onSubmit={onSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Name" htmlFor="medicine-name" required error={error('name')}>
            <Input id="medicine-name" required value={form.name} onChange={set('name')} placeholder="Amoxicillin" />
          </FormField>
          <FormField label="Generic name" htmlFor="medicine-generic" error={error('generic_name')}>
            <Input id="medicine-generic" value={form.generic_name} onChange={set('generic_name')} placeholder="Amoxicillin trihydrate" />
          </FormField>
          <FormField label="Category" htmlFor="medicine-category" error={error('category_id')}>
            <Select
              id="medicine-category"
              value={form.category_id}
              onChange={set('category_id')}
              options={[
                { value: '', label: 'No category' },
                ...(categories.data ?? []).map((category) => ({ value: String(category.id), label: category.name })),
              ]}
            />
          </FormField>
          <FormField label="Supplier" htmlFor="medicine-supplier" error={error('supplier_id')}>
            <Select
              id="medicine-supplier"
              value={form.supplier_id}
              onChange={set('supplier_id')}
              options={[
                { value: '', label: 'No supplier' },
                ...(suppliers.data ?? []).map((supplier) => ({ value: String(supplier.id), label: supplier.name })),
              ]}
            />
          </FormField>
          <FormField label="Form" htmlFor="medicine-form-field" required error={error('form')}>
            <Input id="medicine-form-field" required value={form.form} onChange={set('form')} placeholder="Tablet, syrup, cream…" />
          </FormField>
          <FormField label="Strength" htmlFor="medicine-strength" error={error('strength')}>
            <Input id="medicine-strength" value={form.strength} onChange={set('strength')} placeholder="500 mg" />
          </FormField>
          <FormField label="Unit" htmlFor="medicine-unit" required error={error('unit')} hint="Dispensing unit, e.g. tablet or vial">
            <Input id="medicine-unit" required value={form.unit} onChange={set('unit')} placeholder="tablet" />
          </FormField>
          <FormField label="Reorder level" htmlFor="medicine-reorder" error={error('reorder_level')}>
            <Input id="medicine-reorder" type="number" min={0} value={form.reorder_level} onChange={set('reorder_level')} />
          </FormField>
          <FormField label="Selling price" htmlFor="medicine-price" required error={error('selling_price')}>
            <Input id="medicine-price" type="number" min={0} step="0.01" required value={form.selling_price} onChange={set('selling_price')} />
          </FormField>
        </div>

        {!medicine && (
          <div className="space-y-4 rounded-lg border bg-muted/40 p-4">
            <div>
              <p className="text-sm font-medium text-foreground">Initial batch</p>
              <p className="text-xs text-muted-foreground">Optional — add stock now or later from the medicine detail.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Batch number" htmlFor="batch-number" error={error('batch_number')}>
                <Input id="batch-number" value={form.batch_number} onChange={set('batch_number')} placeholder="B-2026-001" />
              </FormField>
              <FormField label="Expiry date" htmlFor="batch-expiry" error={error('expiry_date')}>
                <Input id="batch-expiry" type="date" value={form.expiry_date} onChange={set('expiry_date')} />
              </FormField>
              <FormField label="Quantity" htmlFor="batch-quantity" error={error('quantity')}>
                <Input id="batch-quantity" type="number" min={0} value={form.quantity} onChange={set('quantity')} />
              </FormField>
              <FormField label="Purchase price" htmlFor="batch-purchase" error={error('purchase_price')}>
                <Input id="batch-purchase" type="number" min={0} step="0.01" value={form.purchase_price} onChange={set('purchase_price')} />
              </FormField>
            </div>
          </div>
        )}
      </form>
    </Modal>
  )
}

export default MedicineForm
