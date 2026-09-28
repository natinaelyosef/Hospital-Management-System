import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { CalendarDays, Eye, EyeOff, Lock, Mail, MapPin, Phone, ShieldCheck, Stethoscope, User, UserPlus } from 'lucide-react'
import { getFieldErrors, getErrorMessage } from '@/api/client'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { useAuth } from '@/contexts/AuthContext'
import { PORTAL_AFTER_LOGIN, PORTAL_LOGIN } from '@/lib/portals'

const STEPS = [
  { step: '1', title: 'Create your account', text: 'Name, contact details and a secure password.' },
  { step: '2', title: 'Describe your sickness', text: 'Tell us your complaint so reception routes you to the right doctor and nurse.' },
  { step: '3', title: 'Track your care', text: 'Follow every handoff — triage, lab, prescription, payment — in one place.' },
]

interface FormErrors {
  first_name?: string
  last_name?: string
  date_of_birth?: string
  gender?: string
  phone?: string
  email?: string
  address?: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
  password?: string
  password_confirmation?: string
  chief_complaint?: string
  symptoms?: string
}

export default function Register() {
  const { register, token, portal: sessionPortal } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    date_of_birth: '',
    gender: '',
    phone: '',
    email: '',
    address: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    chief_complaint: '',
    symptoms: '',
    symptom_duration: '',
    severity: '',
    previous_conditions: '',
    current_medications: '',
    password: '',
    password_confirmation: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (token) return <Navigate to={PORTAL_AFTER_LOGIN[sessionPortal ?? 'patient']} replace />

  const update = (key: keyof typeof form, value: string) => setForm((prev) => ({ ...prev, [key]: value }))

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setFormError(null)

    const next: FormErrors = {}
    if (!form.first_name.trim()) next.first_name = 'First name is required.'
    if (!form.last_name.trim()) next.last_name = 'Last name is required.'
    if (!form.date_of_birth) next.date_of_birth = 'Date of birth is required.'
    if (!form.gender) next.gender = 'Please select a gender.'
    if (!form.phone.trim()) next.phone = 'Phone number is required.'
    if (!form.email.trim()) next.email = 'Email is required.'
    if (!form.emergency_contact_name.trim()) next.emergency_contact_name = 'Emergency contact name is required.'
    if (!form.emergency_contact_phone.trim()) next.emergency_contact_phone = 'Emergency contact phone is required.'
    if (!form.chief_complaint.trim()) next.chief_complaint = 'Describe your main complaint so we can route you.'
    if (form.password.length < 8) next.password = 'Password must be at least 8 characters.'
    if (form.password !== form.password_confirmation) next.password_confirmation = 'Passwords do not match.'
    setErrors(next)
    if (Object.keys(next).length > 0) return

    setLoading(true)
    try {
      const result = await register({
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        date_of_birth: form.date_of_birth,
        gender: form.gender as 'male' | 'female' | 'other',
        phone: form.phone.trim(),
        email: form.email.trim(),
        address: form.address.trim() || undefined,
        emergency_contact_name: form.emergency_contact_name.trim(),
        emergency_contact_phone: form.emergency_contact_phone.trim(),
        password: form.password,
        password_confirmation: form.password_confirmation,
        chief_complaint: form.chief_complaint.trim(),
        symptoms: form.symptoms.trim() || undefined,
        symptom_duration: form.symptom_duration.trim() || undefined,
        severity: (form.severity || undefined) as 'mild' | 'moderate' | 'severe' | undefined,
        previous_conditions: form.previous_conditions.trim() || undefined,
        current_medications: form.current_medications.trim() || undefined,
      })
      // The case already exists and is queued for reception to route, so the
      // patient lands straight on it instead of filling in a second form.
      void navigate(`/consultation/${result.visit.id}`, { replace: true })
    } catch (caught) {
      const fieldErrors = getFieldErrors(caught)
      setErrors(fieldErrors as FormErrors)
      if (Object.keys(fieldErrors).length === 0) setFormError(getErrorMessage(caught, 'Unable to create your account'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid min-h-screen grid-cols-1 bg-background lg:grid-cols-[1.05fr_1fr]">
      <section className="auth-shell relative hidden overflow-hidden p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="relative z-10 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 text-lg font-bold backdrop-blur">M</span>
          <span className="flex flex-col leading-tight">
            <span className="text-base font-semibold">MediCare HMS</span>
            <span className="text-xs text-white/70">Hospital Management System</span>
          </span>
        </div>

        <div className="relative z-10 max-w-lg">
          <p className="mb-3 text-xs font-semibold tracking-[0.2em] text-teal-200 uppercase">Patient portal</p>
          <h1 className="text-4xl leading-tight font-semibold tracking-tight xl:text-5xl">
            Registered, routed, and on your way to the right doctor.
          </h1>

          <ul className="mt-8 space-y-4">
            {STEPS.map((item) => (
              <li key={item.step} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15 text-sm font-bold backdrop-blur">
                  {item.step}
                </span>
                <span className="flex flex-col">
                  <span className="text-sm font-semibold text-white">{item.title}</span>
                  <span className="text-xs text-white/70">{item.text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 flex items-center gap-2 text-xs text-white/55">
          <ShieldCheck size={14} /> Your medical data is encrypted and only visible to your care team.
        </p>
      </section>

      <section className="flex items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-lg">
          <div className="mb-6 flex flex-col gap-1.5">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">Register as a patient</h2>
            <p className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link to={PORTAL_LOGIN.patient} className="font-medium text-primary hover:underline">Sign in</Link>
            </p>
          </div>

          {formError && (
            <div className="mb-4">
              <Alert tone="danger" title="Registration failed">{formError}</Alert>
            </div>
          )}

          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="First name" htmlFor="reg-first" required error={errors.first_name}>
                <span className="relative block">
                  <User size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" />
                  <Input id="reg-first" value={form.first_name} onChange={(e) => update('first_name', e.target.value)} autoComplete="given-name" className="pl-9" />
                </span>
              </FormField>

              <FormField label="Last name" htmlFor="reg-last" required error={errors.last_name}>
                <span className="relative block">
                  <User size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" />
                  <Input id="reg-last" value={form.last_name} onChange={(e) => update('last_name', e.target.value)} autoComplete="family-name" className="pl-9" />
                </span>
              </FormField>

              <FormField label="Date of birth" htmlFor="reg-dob" required error={errors.date_of_birth}>
                <span className="relative block">
                  <CalendarDays size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" />
                  <Input id="reg-dob" type="date" value={form.date_of_birth} onChange={(e) => update('date_of_birth', e.target.value)} className="pl-9" />
                </span>
              </FormField>

              <FormField label="Gender" htmlFor="reg-gender" required error={errors.gender}>
                <Select id="reg-gender" value={form.gender} onChange={(e) => update('gender', e.target.value)} placeholder="Select">
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="other">Other</option>
                </Select>
              </FormField>

              <FormField label="Phone" htmlFor="reg-phone" required error={errors.phone}>
                <span className="relative block">
                  <Phone size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" />
                  <Input id="reg-phone" type="tel" value={form.phone} onChange={(e) => update('phone', e.target.value)} autoComplete="tel" className="pl-9" />
                </span>
              </FormField>

              <FormField label="Email" htmlFor="reg-email" required error={errors.email}>
                <span className="relative block">
                  <Mail size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" />
                  <Input id="reg-email" type="email" value={form.email} onChange={(e) => update('email', e.target.value)} autoComplete="email" className="pl-9" />
                </span>
              </FormField>
            </div>

            <FormField label="Address" htmlFor="reg-address" error={errors.address}>
              <span className="relative block">
                <MapPin size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" />
                <Input id="reg-address" value={form.address} onChange={(e) => update('address', e.target.value)} autoComplete="street-address" className="pl-9" />
              </span>
            </FormField>

            <fieldset className="rounded-xl border border-border bg-muted/25 p-4">
              <legend className="px-1 text-xs font-semibold text-foreground">Describe your sickness</legend>
              <p className="mb-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Stethoscope size={13} /> Reception uses this to send you to the right doctor and nurse.
              </p>
              <div className="flex flex-col gap-4">
                <FormField label="Main complaint" htmlFor="reg-complaint" required error={errors.chief_complaint}>
                  <Textarea
                    id="reg-complaint"
                    rows={2}
                    value={form.chief_complaint}
                    onChange={(e) => update('chief_complaint', e.target.value)}
                    placeholder="e.g. Persistent cough and fever since Monday"
                  />
                </FormField>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField label="Other symptoms" htmlFor="reg-symptoms" error={errors.symptoms}>
                    <Textarea
                      id="reg-symptoms"
                      rows={2}
                      value={form.symptoms}
                      onChange={(e) => update('symptoms', e.target.value)}
                      placeholder="Cough, fever, chest discomfort…"
                    />
                  </FormField>

                  <div className="flex flex-col gap-4">
                    <FormField label="How long" htmlFor="reg-duration" hint="e.g. 5 days">
                      <Input id="reg-duration" value={form.symptom_duration} onChange={(e) => update('symptom_duration', e.target.value)} />
                    </FormField>

                    <FormField label="Severity" htmlFor="reg-severity" hint="Optional — reception triages on this.">
                      <Select id="reg-severity" value={form.severity} onChange={(e) => update('severity', e.target.value)} placeholder="Not sure">
                        <option value="mild">Mild</option>
                        <option value="moderate">Moderate</option>
                        <option value="severe">Severe</option>
                      </Select>
                    </FormField>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField label="Previous conditions" htmlFor="reg-conditions">
                    <Textarea id="reg-conditions" rows={2} value={form.previous_conditions} onChange={(e) => update('previous_conditions', e.target.value)} />
                  </FormField>
                  <FormField label="Current medications" htmlFor="reg-meds">
                    <Textarea id="reg-meds" rows={2} value={form.current_medications} onChange={(e) => update('current_medications', e.target.value)} />
                  </FormField>
                </div>
              </div>
            </fieldset>

            <fieldset className="rounded-xl border border-border bg-muted/25 p-4">
              <legend className="px-1 text-xs font-semibold text-foreground">Emergency contact</legend>
              <p className="mb-3 text-xs text-muted-foreground">Someone we can contact if urgent care is needed.</p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField label="Full name" htmlFor="reg-emergency-name" required error={errors.emergency_contact_name}>
                  <span className="relative block">
                    <User size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" />
                    <Input id="reg-emergency-name" value={form.emergency_contact_name} onChange={(e) => update('emergency_contact_name', e.target.value)} autoComplete="name" className="pl-9" />
                  </span>
                </FormField>

                <FormField label="Phone number" htmlFor="reg-emergency-phone" required error={errors.emergency_contact_phone}>
                  <span className="relative block">
                    <Phone size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" />
                    <Input id="reg-emergency-phone" type="tel" value={form.emergency_contact_phone} onChange={(e) => update('emergency_contact_phone', e.target.value)} autoComplete="tel" className="pl-9" />
                  </span>
                </FormField>
              </div>
            </fieldset>

            <FormField label="Password" htmlFor="reg-password" required error={errors.password} hint="At least 8 characters.">
              <span className="relative block">
                <Lock size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => update('password', e.target.value)}
                  autoComplete="new-password"
                  className="pr-10 pl-9"
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute top-1/2 right-2 inline-flex h-7 w-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </span>
            </FormField>

            <FormField label="Confirm password" htmlFor="reg-confirm" required error={errors.password_confirmation}>
              <span className="relative block">
                <Lock size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="reg-confirm"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password_confirmation}
                  onChange={(e) => update('password_confirmation', e.target.value)}
                  autoComplete="new-password"
                  className="pr-10 pl-9"
                />
              </span>
            </FormField>

            <Button type="submit" size="lg" loading={loading} icon={<UserPlus size={16} />} className="w-full">
              Create account &amp; queue my visit
            </Button>
          </form>

          <p className="mt-5 text-center text-xs text-muted-foreground">
            By registering you agree to the hospital&rsquo;s privacy policy. Your record is visible only to you and
            the clinicians caring for you.
          </p>
        </div>
      </section>
    </div>
  )
}
