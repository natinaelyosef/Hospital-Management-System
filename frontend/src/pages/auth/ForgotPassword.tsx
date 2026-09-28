import { useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Check, Copy, KeyRound, Mail } from 'lucide-react'
import { getErrorMessage } from '@/api/client'
import { authApi } from '@/api/auth.api'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/contexts/AuthContext'
import { PORTAL_AFTER_LOGIN, PORTAL_LOGIN } from '@/lib/portals'
import type { Portal } from '@/types'

/**
 * Public first step of self-service password reset. Never reveals whether the
 * email exists. Each front door has its own copy so the "back to sign in"
 * link returns to the page the user actually came from.
 */
export default function ForgotPassword({ portal = 'staff' }: { portal?: Portal }) {
  const { token, portal: sessionPortal } = useAuth()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [devUrl, setDevUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (token) return <Navigate to={PORTAL_AFTER_LOGIN[sessionPortal ?? portal]} replace />

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const result = await authApi.forgotPassword(email.trim())
      setSent(true)
      setDevUrl(result.reset_url ?? null)
      setCopied(false)
    } catch (caught) {
      setError(getErrorMessage(caught, 'Unable to process your request'))
    } finally {
      setLoading(false)
    }
  }

  const copy = async () => {
    if (!devUrl) return
    try {
      await navigator.clipboard.writeText(devUrl)
      setCopied(true)
    } catch {
      setCopied(false)
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
            <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-foreground">
              <KeyRound size={19} className="text-primary" /> Reset your password
            </h1>
            <p className="text-sm text-muted-foreground">
              {sent
                ? 'If an account exists for this email, a reset link has been generated.'
                : 'Enter your account email and we will generate a reset link.'}
            </p>
          </div>

          {error && (
            <div className="mb-4">
              <Alert tone="danger" title="Request failed">{error}</Alert>
            </div>
          )}

          {sent ? (
            <div className="flex flex-col gap-4">
              <Alert tone="success" title="Check your inbox">
                The link expires after 60 minutes and can only be used once.
              </Alert>
              {devUrl && (
                <div className="rounded-xl border bg-muted/50 p-3.5">
                  <p className="text-xs font-semibold text-foreground">Development mode — no mail server configured</p>
                  <p className="mt-1 text-xs text-muted-foreground">Use this reset link directly:</p>
                  <div className="mt-2 flex items-center gap-2">
                    <Input value={devUrl} readOnly aria-label="Reset link" className="font-mono text-[11px]" />
                    <Button variant="outline" size="sm" icon={copied ? <Check size={14} /> : <Copy size={14} />} onClick={() => void copy()}>
                      {copied ? 'Copied' : 'Copy'}
                    </Button>
                  </div>
                </div>
              )}
              <p className="text-center text-sm text-muted-foreground">
                <Link to={PORTAL_LOGIN[portal]} className="font-medium text-primary hover:underline">Back to sign in</Link>
              </p>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="flex flex-col gap-4">
              <FormField label="Email address" htmlFor="forgot-email" required>
                <span className="relative block">
                  <Mail size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="forgot-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@hospital.test"
                    className="pl-9"
                  />
                </span>
              </FormField>
              <Button type="submit" size="lg" loading={loading} className="mt-1 w-full">
                Send reset link
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                Remembered it?{' '}
                <Link to={PORTAL_LOGIN[portal]} className="font-medium text-primary hover:underline">Sign in</Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
