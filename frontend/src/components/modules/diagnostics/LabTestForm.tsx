import { useEffect, useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { getFieldErrors, getErrorMessage } from '@/api/client'
import { labApi, type LabTestInput } from '@/api/lab.api'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import type { LabTest } from '@/types'

export interface LabTestFormProps {
  open: boolean
  test?: LabTest | null
  onClose: () => void
}

interface FormState {
  code: string
  name: string
  category: string
  price: string
  description: string
  is_active: boolean
}

const EMPTY_FORM: FormState = { code: '', name: '', category: '', price: '', description: '', is_active: true }

function toFormState(test: LabTest | null | undefined): FormState {
  if (!test) return EMPTY_FORM
  return {
    code: test.code,
    name: test.name,
    category: test.category,
    price: String(test.price),
    description: test.description ?? '',
    is_active: test.is_active,
  }
}

export function LabTestForm({ open, test, onClose }: LabTestFormProps) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [errors, setErrors] = useState<Record<string, string[]>>({})

  useEffect(() => {
    if (open) {
      setForm(toFormState(test))
      setErrors({})
    }
  }, [open, test])

  const save = useMutation({
    mutationFn: (payload: LabTestInput) =>
      test ? labApi.updateTest(test.id, payload) : labApi.createTest(payload),
  })

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setErrors({})

    try {
      await save.mutateAsync({
        code: form.code.trim(),
        name: form.name.trim(),
        category: form.category.trim(),
        price: Number(form.price),
        description: form.description.trim() || undefined,
        is_active: form.is_active,
      })
      queryClient.invalidateQueries({ queryKey: ['lab-tests'] })
      toast.success(test ? 'Test updated' : 'Test added', form.name.trim())
      onClose()
    } catch (caught) {
      const fields = getFieldErrors(caught)
      if (Object.keys(fields).length > 0) setErrors(fields)
      else toast.error('Unable to save test', getErrorMessage(caught))
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={test ? 'Edit lab test' : 'Add lab test'}
      description="Catalogue entry used when ordering investigations"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={save.isPending}>
            Cancel
          </Button>
          <Button type="submit" form="lab-test-form" loading={save.isPending}>
            {test ? 'Save changes' : 'Add test'}
          </Button>
        </>
      }
    >
      <form id="lab-test-form" onSubmit={onSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Code" htmlFor="test-code" required error={errors.code?.[0]}>
            <Input
              id="test-code"
              required
              value={form.code}
              onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))}
              placeholder="CBC"
            />
          </FormField>
          <FormField label="Category" htmlFor="test-category" required error={errors.category?.[0]}>
            <Input
              id="test-category"
              required
              value={form.category}
              onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
              placeholder="Hematology"
            />
          </FormField>
          <FormField label="Name" htmlFor="test-name" required error={errors.name?.[0]} className="sm:col-span-2">
            <Input
              id="test-name"
              required
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="Complete Blood Count"
            />
          </FormField>
          <FormField label="Price" htmlFor="test-price" required error={errors.price?.[0]}>
            <Input
              id="test-price"
              type="number"
              min={0}
              step="0.01"
              required
              value={form.price}
              onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))}
            />
          </FormField>
          <FormField label="Description" htmlFor="test-description" error={errors.description?.[0]}>
            <Input
              id="test-description"
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            />
          </FormField>
        </div>
        <Checkbox
          checked={form.is_active}
          onChange={(event) => setForm((current) => ({ ...current, is_active: event.target.checked }))}
          label="Active"
          description="Inactive tests cannot be ordered on new requests."
        />
      </form>
    </Modal>
  )
}

export default LabTestForm
