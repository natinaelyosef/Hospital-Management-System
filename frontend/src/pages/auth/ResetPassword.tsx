import { useState, type FormEvent } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { CheckCircle2, Eye, EyeOff, Lock, Mail } from 'lucide-react'
import { getFieldErrors, getErrorMessage } from '@/api/client'
import { authApi } from '@/api/auth.api'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/contexts/AuthContext'
import { PORTAL_AFTER_LOGIN, PORTAL_LOGIN } from '@/lib/portals'
import type { Portal } from '@/types'

/**
 * Public second step of self-service password reset. Each front door has its
 * own copy so the user returns to the sign-in page they started from.
 */
export default function ResetPassword({ portal = 'staff' }: { portal?: Portal }) {
  const { token, portal: sessionPortal } = useAuth()
  const [params] = useSearchParams()
  const [email, setEmail] = useState(params.get('email') ?? '')
  const [resetToken, setResetToken] = useState(params.get('token') ?? '')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (token) return <Navigate to={PORTAL_AFTER_LOGIN[sessionPortal ?? portal]} replace />

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    try {
      await authApi.resetPassword({
        email: email.trim(),
        token: resetToken.trim(),
        password,
        password_confirmation: confirm,
      })
      setDone(true)
    } catch (caught) {
      const errors = getFieldErrors(caught)
      setError(errors.token?.[0] ?? errors.email?.[0] ?? errors.password?.[0] ?? getErrorMessage(caught, 'Unable to reset your password'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-5 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-base font-bold text-primary-foreground">M</span>
          <span className="flex flex-col leading-tight">
            <span className="text-sm font-semibold text-foreground">MediCare HMS</span>
            <span className="text-[11px] text-muted-foreground">Hospital Management System</span>
          </span>
        </div>

        <div className="rounded-2xl border bg-card p-6 shadow-xs">
          <div className="mb-5 flex flex-col gap-1.5">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">Choose a new password</h1>
            <p className="text-sm text-muted-foreground">Your reset link expires after 60 minutes and works only once.</p>
          </div>

          {error && (
            <div className="mb-4">
              <Alert tone="danger" title="Reset failed">{error}</Alert>
            </div>
          )}

          {done ? (
            <div className="flex flex-col gap-4">
              <Alert tone="success" title="Password updated">
                <span className="flex items-center gap-1.5"><CheckCircle2 size={14} /> You can now sign in with your new password.</span>
              </Alert>
              <Link to={PORTAL_LOGIN[portal]}>
                <Button size="lg" className="w-full">Back to sign in</Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="flex flex-col gap-4">
              <FormField label="Email address" htmlFor="reset-email" required>
                <span className="relative block">
                  <Mail size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="reset-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="pl-9"
                  />
                </span>
              </FormField>

              <FormField label="Reset token" htmlFor="reset-token" required hint="Pasted automatically when you open the link from your inbox.">
                <Input
                  id="reset-token"
                  value={resetToken}
                  onChange={(event) => setResetToken(event.target.value)}
                  autoComplete="off"
                  className="font-mono text-xs"
                  required
                />
              </FormField>

              <FormField label="New password" htmlFor="reset-password" required hint="At least 8 characters.">
                <span className="relative block">
                  <Lock size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="reset-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
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

              <FormField label="Confirm password" htmlFor="reset-confirm" required>
                <span className="relative block">
                  <Lock size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="reset-confirm"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={confirm}
                    onChange={(event) => setConfirm(event.target.value)}
                    className="pl-9"
                  />
                </span>
              </FormField>

              <Button type="submit" size="lg" loading={loading} className="mt-1 w-full">
                Reset password
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
