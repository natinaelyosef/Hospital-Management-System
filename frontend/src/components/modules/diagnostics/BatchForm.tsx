import { useEffect, useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { getFieldErrors, getErrorMessage } from '@/api/client'
import { pharmacyApi, type BatchInput } from '@/api/pharmacy.api'
import { Button } from '@/components/ui/Button'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import type { Medicine } from '@/types'

export interface BatchFormProps {
  open: boolean
  medicine: Medicine | null
  onClose: () => void
}

interface FormState {
  batch_number: string
  expiry_date: string
  quantity: string
  purchase_price: string
}

const EMPTY_FORM: FormState = { batch_number: '', expiry_date: '', quantity: '', purchase_price: '' }

export function BatchForm({ open, medicine, onClose }: BatchFormProps) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [errors, setErrors] = useState<Record<string, string[]>>({})

  useEffect(() => {
    if (open) {
      setForm(EMPTY_FORM)
      setErrors({})
    }
  }, [open])

  const addBatch = useMutation({
    mutationFn: (payload: BatchInput) => {
      if (!medicine) throw new Error('No medicine selected')
      return pharmacyApi.addBatch(medicine.id, payload)
    },
  })

  const set = (key: keyof FormState) => (event: { target: { value: string } }) =>
    setForm((current) => ({ ...current, [key]: event.target.value }))

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!medicine) return
    setErrors({})

    try {
      await addBatch.mutateAsync({
        batch_number: form.batch_number.trim(),
        expiry_date: form.expiry_date,
        quantity: Number(form.quantity) || 0,
        purchase_price: Number(form.purchase_price) || 0,
      })
      queryClient.invalidateQueries({ queryKey: ['medicines'] })
      queryClient.invalidateQueries({ queryKey: ['medicine', medicine.id] })
      queryClient.invalidateQueries({ queryKey: ['pharmacy-alerts'] })
      queryClient.invalidateQueries({ queryKey: ['pharmacy-transactions'] })
      toast.success('Stock added', `${medicine.name} · batch ${form.batch_number.trim()}`)
      onClose()
    } catch (caught) {
      const fields = getFieldErrors(caught)
      if (Object.keys(fields).length > 0) setErrors(fields)
      else toast.error('Unable to add batch', getErrorMessage(caught))
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add batch / stock in"
      description={medicine ? `${medicine.name} · ${medicine.form}${medicine.strength ? ` ${medicine.strength}` : ''}` : undefined}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={addBatch.isPending}>
            Cancel
          </Button>
          <Button type="submit" form="batch-form" loading={addBatch.isPending}>
            Add stock
          </Button>
        </>
      }
    >
      <form id="batch-form" onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
        <FormField label="Batch number" htmlFor="batch-number" required error={errors.batch_number?.[0]}>
          <Input id="batch-number" required value={form.batch_number} onChange={set('batch_number')} placeholder="B-2026-001" />
        </FormField>
        <FormField label="Expiry date" htmlFor="batch-expiry" required error={errors.expiry_date?.[0]}>
          <Input id="batch-expiry" type="date" required value={form.expiry_date} onChange={set('expiry_date')} />
        </FormField>
        <FormField label="Quantity received" htmlFor="batch-quantity" required error={errors.quantity?.[0]}>
          <Input id="batch-quantity" type="number" min={1} required value={form.quantity} onChange={set('quantity')} />
        </FormField>
        <FormField label="Purchase price" htmlFor="batch-purchase" required error={errors.purchase_price?.[0]}>
          <Input id="batch-purchase" type="number" min={0} step="0.01" required value={form.purchase_price} onChange={set('purchase_price')} />
        </FormField>
      </form>
    </Modal>
  )
}

export default BatchForm
