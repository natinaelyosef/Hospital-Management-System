import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Activity, Eye, EyeOff, Lock, Mail, ShieldCheck, Stethoscope } from 'lucide-react'
import { getFieldErrors, getErrorMessage } from '@/api/client'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/utils/cn'

const DEMO_ACCOUNTS = [
  { label: 'Administrator', email: 'admin@medicare.test' },
  { label: 'Doctor', email: 'doctor@medicare.test' },
  { label: 'Nurse', email: 'nurse@medicare.test' },
  { label: 'Receptionist', email: 'receptionist@medicare.test' },
  { label: 'Pharmacist', email: 'pharmacist@medicare.test' },
  { label: 'Lab Technician', email: 'lab@medicare.test' },
  { label: 'Accountant', email: 'accountant@medicare.test' },
  { label: 'Patient', email: 'patient@medicare.test' },
]

const FEATURES = [
  { icon: Stethoscope, text: 'Appointments, consultations and prescriptions' },
  { icon: Activity, text: 'Laboratory, pharmacy and inpatient wards' },
  { icon: ShieldCheck, text: 'Billing, insurance claims and role-based access' },
]

export default function Login() {
  const { login, token } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('admin@medicare.test')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (token) return <Navigate to="/" replace />

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await login(email.trim(), password)
      void navigate('/', { replace: true })
    } catch (caught) {
      const errors = getFieldErrors(caught)
      if (errors.email?.[0] || errors.password?.[0]) setError(errors.email?.[0] ?? errors.password?.[0] ?? null)
      else setError(getErrorMessage(caught, 'Unable to sign in'))
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
            <span className="text-xs text-white/70">Hospital Management System</span>
          </span>
        </div>

        <div className="relative z-10 max-w-lg">
          <p className="mb-3 text-xs font-semibold tracking-[0.2em] text-teal-200 uppercase">
            Care coordination platform
          </p>
          <h1 className="text-4xl leading-tight font-semibold tracking-tight xl:text-5xl">
            Every department, one calm workspace.
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-white/75">
            Front desk, clinicians, pharmacy, laboratory and finance teams collaborate on a single patient
            timeline — with the right access for every role.
          </p>

          <ul className="mt-8 space-y-3">
            {FEATURES.map((feature) => (
              <li key={feature.text} className="flex items-center gap-3 text-sm text-white/85">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/12">
                  <feature.icon size={16} />
                </span>
                {feature.text}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-xs text-white/55">
          MediCare HMS — built for clinics and hospitals of every size.
        </p>
      </section>

      <section className="flex items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-md">
          <div className="mb-7 flex items-center gap-3 lg:hidden">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-base font-bold text-primary-foreground">
              M
            </span>
            <span className="flex flex-col leading-tight">
              <span className="text-sm font-semibold text-foreground">MediCare HMS</span>
              <span className="text-[11px] text-muted-foreground">Hospital Management System</span>
            </span>
          </div>

          <div className="mb-6 flex flex-col gap-1.5">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">Welcome back</h2>
            <p className="text-sm text-muted-foreground">Sign in to your account to continue</p>
          </div>

          {error && (
            <div className="mb-4">
              <Alert tone="danger" title="Sign in failed">
                {error}
              </Alert>
            </div>
          )}

          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <FormField label="Email address" htmlFor="login-email" required>
              <span className="relative block">
                <Mail size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="login-email"
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@hospital.test"

                  className="pl-9"
                />
              </span>
            </FormField>

            <FormField label="Password" htmlFor="login-password" required>
              <span className="relative block">
                <Lock size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="login-password"
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
              Sign in
            </Button>
          </form>

          <div className="mt-6 rounded-xl border bg-card p-4 shadow-xs">
            <div className="mb-2.5 flex items-center justify-between">
              <p className="text-xs font-semibold text-foreground">Demo credentials</p>
              <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-accent-foreground">
                password
              </span>
            </div>
            <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  key={account.email}
                  type="button"
                  onClick={() => {
                    setEmail(account.email)
                    setPassword('password')
                    setError(null)
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
        </div>
      </section>
    </div>
  )
}
