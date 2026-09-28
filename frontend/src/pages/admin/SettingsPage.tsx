import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Save, Settings } from 'lucide-react'
import { getErrorMessage } from '@/api/client'
import { miscApi } from '@/api/misc.api'
import { Button } from '@/components/ui/Button'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { PageHeader } from '@/components/ui/PageHeader'
import { Textarea } from '@/components/ui/Textarea'
import { useToast } from '@/components/ui/Toast'

export default function SettingsPage() {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [hospitalName, setHospitalName] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [currency, setCurrency] = useState('')
  const [logo, setLogo] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const { data, isLoading, isError, error } = useQuery({ queryKey: ['settings'], queryFn: miscApi.settings.get })

  useEffect(() => {
    if (!data) return
    setHospitalName(data.hospital_name ?? '')
    setAddress(data.address ?? '')
    setPhone(data.phone ?? '')
    setEmail(data.email ?? '')
    setCurrency(data.currency ?? '')
    setLogo(data.logo ?? '')
  }, [data])

  const mutation = useMutation({
    mutationFn: () => miscApi.settings.update({
      hospital_name: hospitalName.trim(),
      address: address.trim(),
      phone: phone.trim(),
      email: email.trim(),
      currency: currency.trim().toUpperCase(),
      logo: logo.trim() || null,
    }),
    onSuccess: async (saved) => {
      queryClient.setQueryData(['settings'], saved)
      await queryClient.invalidateQueries({ queryKey: ['settings'] })
      toast.success('Settings saved', 'Hospital profile updated')
      setFormError(null)
    },
    onError: (caught) => setFormError(getErrorMessage(caught, 'Unable to save settings')),
  })

  const submit = () => {
    if (!hospitalName.trim()) {
      setFormError('Hospital name is required.')
      return
    }
    setFormError(null)
    mutation.mutate()
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" subtitle="Hospital profile and preferences" actions={<Button icon={<Save size={16} />} onClick={submit} loading={mutation.isPending} disabled={isLoading}>Save settings</Button>} />
      {formError && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">{formError}</p>}
      {isError && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">{getErrorMessage(error, 'Unable to load settings')}</p>}
      <section className="max-w-3xl space-y-5 border-y py-6">
        <div>
          <h2 className="text-sm font-semibold">Hospital profile</h2>
          <p className="mt-1 text-xs text-muted-foreground">These details appear on invoices and other hospital documents.</p>
        </div>
        <FormField label="Hospital name" htmlFor="settings-name" required>
          <Input id="settings-name" value={hospitalName} onChange={(event) => setHospitalName(event.target.value)} disabled={isLoading} />
        </FormField>
        <FormField label="Address" htmlFor="settings-address">
          <Textarea id="settings-address" value={address} onChange={(event) => setAddress(event.target.value)} rows={3} disabled={isLoading} />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Phone" htmlFor="settings-phone">
            <Input id="settings-phone" value={phone} onChange={(event) => setPhone(event.target.value)} disabled={isLoading} />
          </FormField>
          <FormField label="Email" htmlFor="settings-email">
            <Input id="settings-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} disabled={isLoading} />
          </FormField>
          <FormField label="Currency code" htmlFor="settings-currency" hint="Used for billing amounts, for example ETB or USD.">
            <Input id="settings-currency" value={currency} onChange={(event) => setCurrency(event.target.value)} maxLength={8} disabled={isLoading} />
          </FormField>
          <FormField label="Logo URL" htmlFor="settings-logo">
            <Input id="settings-logo" type="url" value={logo} onChange={(event) => setLogo(event.target.value)} placeholder="https://..." disabled={isLoading} />
          </FormField>
        </div>
        {logo && <div className="flex items-center gap-3 border-t pt-4"><img src={logo} alt="Hospital logo preview" className="h-12 w-12 rounded-md border object-contain" /><span className="text-xs text-muted-foreground">Current logo</span></div>}
        {!data && !isLoading && !isError && <div className="flex items-center gap-2 text-xs text-muted-foreground"><Settings size={14} /> No settings have been saved yet.</div>}
      </section>
    </div>
  )
}
