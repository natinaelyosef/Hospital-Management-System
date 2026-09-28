import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { Eye, EyeOff, Lock, MailCheck } from 'lucide-react'
import { getFieldErrors, getErrorMessage } from '@/api/client'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/contexts/AuthContext'
import { PORTAL_AFTER_LOGIN, PORTAL_LOGIN } from '@/lib/portals'

/** Public staff-invitation landing: the invitee sets a password and is signed straight in. */
export default function AcceptInvite() {
  const { acceptInvite, token, portal: sessionPortal } = useAuth()
  const navigate = useNavigate()
  const { token: inviteToken } = useParams()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (token) return <Navigate to={PORTAL_AFTER_LOGIN[sessionPortal ?? 'staff']} replace />

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    if (!inviteToken) {
      setError('This invitation link is invalid or has already been used.')
      return
    }
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
      await acceptInvite({ token: inviteToken, password, password_confirmation: confirm })
      void navigate(PORTAL_AFTER_LOGIN.staff, { replace: true })
    } catch (caught) {
      const errors = getFieldErrors(caught)
      setError(errors.token?.[0] ?? errors.password?.[0] ?? getErrorMessage(caught, 'Unable to accept this invitation'))
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
            <span className="text-[11px] text-muted-foreground">Staff invitation</span>
          </span>
        </div>

        <div className="rounded-2xl border bg-card p-6 shadow-xs">
          <div className="mb-5 flex flex-col gap-1.5">
            <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-foreground">
              <MailCheck size={19} className="text-primary" /> You&rsquo;re invited
            </h1>
            <p className="text-sm text-muted-foreground">Choose a password to activate your staff account.</p>
          </div>

          {error && (
            <div className="mb-4">
              <Alert tone="danger" title="Invitation failed">{error}</Alert>
            </div>
          )}

          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <FormField label="New password" htmlFor="invite-password" required hint="At least 8 characters.">
              <span className="relative block">
                <Lock size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="invite-password"
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

            <FormField label="Confirm password" htmlFor="invite-confirm" required>
              <span className="relative block">
                <Lock size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="invite-confirm"
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
              Activate my account
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link to={PORTAL_LOGIN.staff} className="font-medium text-primary hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
