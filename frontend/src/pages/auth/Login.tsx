import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Activity, AlertTriangle, ArrowRight, Eye, EyeOff, Lock, Mail, ShieldCheck, Stethoscope } from 'lucide-react'
import { getErrorMessage, getFieldErrors } from '@/api/client'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/contexts/AuthContext'
import { PORTAL_AFTER_LOGIN, PORTAL_FORGOT, PORTAL_HOME, PORTAL_LOGIN, PORTAL_REGISTER } from '@/lib/portals'
import type { Portal } from '@/types'
import { cn } from '@/utils/cn'

const STAFF_DEMO_ACCOUNTS = [
  { label: 'Administrator', email: 'admin@medicare.test' },
  { label: 'Doctor', email: 'doctor@medicare.test' },
  { label: 'Nurse', email: 'nurse@medicare.test' },
  { label: 'Receptionist', email: 'receptionist@medicare.test' },
  { label: 'Pharmacist', email: 'pharmacist@medicare.test' },
  { label: 'Lab Technician', email: 'lab@medicare.test' },
  { label: 'Accountant', email: 'accountant@medicare.test' },
]

const PATIENT_DEMO_ACCOUNTS = [{ label: 'Patient', email: 'patient@medicare.test' }]

const FEATURES: Record<Portal, { icon: typeof Stethoscope; text: string }[]> = {
  staff: [
    { icon: Stethoscope, text: 'Appointments, consultations and prescriptions' },
    { icon: Activity, text: 'Laboratory, pharmacy and inpatient wards' },
    { icon: ShieldCheck, text: 'Billing, insurance claims and role-based access' },
  ],
  patient: [
    { icon: Stethoscope, text: 'Follow your visit from intake to completion' },
    { icon: Activity, text: 'Read lab results and prescriptions as they are ready' },
    { icon: ShieldCheck, text: 'See every bill and pay securely' },
  ],
}

const COPY: Record<Portal, { title: string; subtitle: string; cta: string; heading: string; blurb: string; footer: string }> = {
  staff: {
    title: 'Staff sign in',
    subtitle: 'MediCare HMS workspace for hospital staff',
    cta: 'Sign in to the workspace',
    heading: 'Every department, one calm workspace.',
    blurb:
      'Front desk, clinicians, pharmacy, laboratory and finance teams collaborate on a single patient timeline — with the right access for every role.',
    footer: 'Staff access only. Patient accounts cannot sign in here.',
  },
  patient: {
    title: 'Patient sign in',
    subtitle: 'Your private patient portal',
    cta: 'Sign in to my portal',
    heading: 'Your health record, in one calm place.',
    blurb:
      'Follow your visit from the front desk through triage, consultation and lab work, then pick up your prescriptions and receipts.',
    footer: 'Patient access only. Staff accounts cannot sign in here.',
  },
}

/**
 * One implementation, two front doors. The `portal` prop decides which page
 * this is, and the API rejects an account that belongs to the other one — the
 * UI only adds guidance on top of that.
 */
export default function Login({ portal }: { portal: Portal }) {
  const { login, token, portal: sessionPortal } = useAuth()
  const navigate = useNavigate()
  const copy = COPY[portal]
  const isPatient = portal === 'patient'

  const [email, setEmail] = useState(isPatient ? 'patient@medicare.test' : 'admin@medicare.test')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [wrongPortal, setWrongPortal] = useState<Portal | null>(null)
  const [loading, setLoading] = useState(false)

  // A session already on the other door goes to its own home, not this form.
  if (token && sessionPortal && sessionPortal !== portal) {
    return <Navigate to={PORTAL_AFTER_LOGIN[sessionPortal]} replace />
  }
  if (token && sessionPortal === portal) {
    return <Navigate to={PORTAL_AFTER_LOGIN[portal]} replace />
  }

  const demoAccounts = isPatient ? PATIENT_DEMO_ACCOUNTS : STAFF_DEMO_ACCOUNTS

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setWrongPortal(null)
    setLoading(true)
    try {
      await login(email.trim(), password, portal)
      void navigate(PORTAL_AFTER_LOGIN[portal], { replace: true })
    } catch (caught) {
      // The API refuses a cross-portal sign-in and names the correct door.
      const status = (caught as { response?: { status?: number; data?: { portal?: Portal } } })?.response
      if (status?.status === 403 && status.data?.portal) {
        setWrongPortal(status.data.portal)
      } else {
        const errors = getFieldErrors(caught)
        setError(errors.email?.[0] ?? errors.password?.[0] ?? getErrorMessage(caught, 'Unable to sign in'))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid min-h-screen grid-cols-1 bg-background lg:grid-cols-[1.05fr_1fr]">
      <section className="auth-shell relative hidden overflow-hidden p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="relative z-10 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 text-lg font-bold backdrop-blur">
            M
          </span>
          <span className="flex flex-col leading-tight">
            <span className="text-base font-semibold">MediCare HMS</span>
            <span className="text-xs text-white/70">{copy.subtitle}</span>
          </span>
        </div>

        <div className="relative z-10 max-w-lg">
          <p className="mb-3 text-xs font-semibold tracking-[0.2em] text-teal-200 uppercase">
            {isPatient ? 'Patient portal' : 'Care coordination platform'}
          </p>
          <h1 className="text-4xl leading-tight font-semibold tracking-tight xl:text-5xl">{copy.heading}</h1>
          <p className="mt-4 text-sm leading-relaxed text-white/75">{copy.blurb}</p>

          <ul className="mt-8 space-y-3">
            {FEATURES[portal].map((feature) => (
              <li key={feature.text} className="flex items-center gap-3 text-sm text-white/85">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/12">
                  <feature.icon size={16} />
                </span>
                {feature.text}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-xs text-white/55">{copy.footer}</p>
      </section>

      <section className="flex items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-md">
          <div className="mb-7 flex items-center gap-3 lg:hidden">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-base font-bold text-primary-foreground">
              M
            </span>
            <span className="flex flex-col leading-tight">
              <span className="text-sm font-semibold text-foreground">MediCare HMS</span>
              <span className="text-[11px] text-muted-foreground">{copy.subtitle}</span>
            </span>
          </div>

          <div className="mb-6 flex flex-col gap-1.5">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">{copy.title}</h2>
            <p className="text-sm text-muted-foreground">{copy.subtitle}</p>
          </div>

          {wrongPortal ? (
            <div className="space-y-3">
              <Alert tone="warning" title={`That is a ${wrongPortal} account`}>
                {wrongPortal === 'patient'
                  ? 'This email belongs to a patient. Patient accounts cannot access the staff workspace.'
                  : 'This email belongs to a staff member. Staff accounts cannot access the patient portal.'}
              </Alert>
              <Button
                className="w-full"
                icon={<ArrowRight size={15} />}
                onClick={() => {
                  setWrongPortal(null)
                  setPassword('')
                  void navigate(PORTAL_LOGIN[wrongPortal])
                }}
              >
                Go to the {wrongPortal} sign-in page
              </Button>
              <button
                type="button"
                onClick={() => setWrongPortal(null)}
                className="w-full cursor-pointer text-xs text-muted-foreground hover:text-foreground"
              >
                Stay here and try a different email
              </button>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-4">
                  <Alert tone="danger" title="Sign in failed">
                    {error}
                  </Alert>
                </div>
              )}

              <form onSubmit={onSubmit} className="flex flex-col gap-4">
                <FormField label="Email address" htmlFor={`${portal}-login-email`} required>
                  <span className="relative block">
                    <Mail size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id={`${portal}-login-email`}
                      type="email"
                      autoComplete="username"
                      required
                      value={email}
                      onChange={(event) => {
                        setEmail(event.target.value)
                        setError(null)
                      }}
                      placeholder={isPatient ? 'you@example.com' : 'you@hospital.test'}
                      className="pl-9"
                    />
                  </span>
                </FormField>

                <FormField label="Password" htmlFor={`${portal}-login-password`} required>
                  <span className="relative block">
                    <Lock size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id={`${portal}-login-password`}
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Enter your password"
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

                <Button type="submit" size="lg" loading={loading} className="mt-1 w-full">
                  {copy.cta}
                </Button>
              </form>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm">
                <Link to={PORTAL_FORGOT[portal]} className="font-medium text-primary hover:underline">
                  Forgot password?
                </Link>
                {isPatient && (
                  <span className="text-muted-foreground">
                    New patient?{' '}
                    <Link to={PORTAL_REGISTER.patient} className="font-medium text-primary hover:underline">
                      Create your account
                    </Link>
                  </span>
                )}
              </div>

              <div className="mt-6 rounded-xl border bg-card p-4 shadow-xs">
                <div className="mb-2.5 flex items-center justify-between">
                  <p className="text-xs font-semibold text-foreground">Demo credentials</p>
                  <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-accent-foreground">
                    password
                  </span>
                </div>
                <div className={cn('grid grid-cols-1 gap-1', demoAccounts.length > 1 && 'sm:grid-cols-2')}>
                  {demoAccounts.map((account) => (
                    <button
                      key={account.email}
                      type="button"
                      onClick={() => {
                        setEmail(account.email)
                        setPassword('password')
                        setError(null)
                        setWrongPortal(null)
                      }}
                      className={cn(
                        'flex cursor-pointer flex-col rounded-lg border border-transparent px-2.5 py-1.5 text-left transition-colors',
                        'hover:border-border hover:bg-muted/60',
                        email === account.email && 'border-border bg-muted/70',
                      )}
                    >
                      <span className="text-[11px] font-medium text-foreground">{account.label}</span>
                      <span className="truncate text-[10px] text-muted-foreground">{account.email}</span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          <OtherPortalPrompt portal={portal} />
        </div>
      </section>
    </div>
  )
}

/**
 * A quiet pointer to the other front door. Following it is allowed, but the
 * API still refuses the credentials — this only saves a wrong guess.
 */
function OtherPortalPrompt({ portal }: { portal: Portal }): ReactNode {
  return (
    <p className="mt-5 flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
      <AlertTriangle size={13} className="mt-px shrink-0" />
      <span>
        {portal === 'patient' ? (
          <>
            Hospital staff?{' '}
            <Link to={PORTAL_HOME.staff} className="font-medium text-primary hover:underline">
              Go to the staff home page
            </Link>{' '}
            and sign in there.
          </>
        ) : (
          <>
            Patient?{' '}
            <Link to={PORTAL_HOME.patient} className="font-medium text-primary hover:underline">
              Go to the patient home page
            </Link>{' '}
            and sign in there.
          </>
        )}{' '}
        The two are separate — each only accepts its own accounts.
      </span>
    </p>
  )
}
