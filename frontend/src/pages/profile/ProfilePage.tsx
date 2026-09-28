import { useEffect, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { KeyRound, Mail, Phone, ShieldCheck } from 'lucide-react'
import { authApi, type PasswordPayload, type ProfilePayload } from '@/api/auth.api'
import { getFieldErrors, getErrorMessage } from '@/api/client'
import { Alert } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { PageHeader } from '@/components/ui/PageHeader'
import { PageLoader } from '@/components/ui/Spinner'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/contexts/AuthContext'
import { formatDateTime, formatDate, initials } from '@/utils/format'

const EMPTY_PASSWORD: PasswordPayload = { current_password: '', password: '', password_confirmation: '' }

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{label}</span>
      <span className="truncate text-sm text-foreground">{value}</span>
    </div>
  )
}

export default function ProfilePage() {
  const { user, updateUser } = useAuth()
  const toast = useToast()

  const [profile, setProfile] = useState<ProfilePayload>({ name: '', email: '', phone: '' })
  const [profileErrors, setProfileErrors] = useState<Record<string, string[]>>({})
  const [profileError, setProfileError] = useState<string | null>(null)

  const [password, setPassword] = useState<PasswordPayload>(EMPTY_PASSWORD)
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string[]>>({})
  const [passwordError, setPasswordError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    setProfile({ name: user.name, email: user.email, phone: user.phone ?? '' })
  }, [user])

  const saveProfile = useMutation({
    mutationFn: () =>
      authApi.updateProfile({
        name: (profile.name ?? '').trim(),
        email: (profile.email ?? '').trim(),
        phone: profile.phone?.trim() ?? '',
      }),
    onSuccess: (saved) => {
      updateUser(saved)
      setProfileErrors({})
      setProfileError(null)
      toast.success('Profile updated', 'Your account details were saved')
    },
    onError: (caught) => {
      const fieldErrors = getFieldErrors(caught)
      setProfileErrors(fieldErrors)
      setProfileError(Object.keys(fieldErrors).length === 0 ? getErrorMessage(caught, 'Unable to save profile') : null)
    },
  })

  const changePassword = useMutation({
    mutationFn: (payload: PasswordPayload) => authApi.changePassword(payload),
    onSuccess: () => {
      setPassword(EMPTY_PASSWORD)
      setPasswordErrors({})
      setPasswordError(null)
      toast.success('Password changed', 'Use your new password the next time you sign in')
    },
    onError: (caught) => {
      const fieldErrors = getFieldErrors(caught)
      setPasswordErrors(fieldErrors)
      setPasswordError(
        Object.keys(fieldErrors).length === 0 ? getErrorMessage(caught, 'Unable to change password') : null,
      )
    },
  })

  const submitProfile = () => {
    const next: Record<string, string[]> = {}
    if (!profile.name?.trim()) next.name = ['Name is required.']
    if (!profile.email?.trim()) next.email = ['Email is required.']
    else if (!/^\S+@\S+\.\S+$/.test(profile.email.trim())) next.email = ['Enter a valid email address.']
    setProfileErrors(next)
    setProfileError(null)
    if (Object.keys(next).length === 0) saveProfile.mutate()
  }

  const submitPassword = () => {
    const next: Record<string, string[]> = {}
    if (!password.current_password) next.current_password = ['Enter your current password.']
    if (password.password.length < 6) next.password = ['Use at least 6 characters.']
    if (password.password_confirmation !== password.password)
      next.password_confirmation = ['Passwords do not match.']
    setPasswordErrors(next)
    setPasswordError(null)
    if (Object.keys(next).length === 0) changePassword.mutate(password)
  }

  if (!user) return <PageLoader label="Loading your profile." />

  return (
    <div className="space-y-6">
      <PageHeader title="My profile" subtitle="Account details, contact information and security" />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader className="items-center text-center">
            <span className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-2xl font-semibold text-primary">
              {initials(user.name)}
            </span>
            <CardTitle className="text-base">{user.name}</CardTitle>
            <CardDescription className="flex items-center justify-center gap-1.5">
              <Mail size={13} />
              {user.email}
            </CardDescription>
            <Badge tone="info" className="mt-1">
              {user.role.label}
            </Badge>
          </CardHeader>
          <CardContent className="grid gap-3.5 sm:grid-cols-2">
            <DetailRow label="Status" value={user.is_active ? 'Active' : 'Disabled'} />
            <DetailRow label="Last login" value={formatDateTime(user.last_login_at)} />
            <DetailRow label="Phone" value={user.phone || 'Not provided'} />
            <DetailRow label="Member since" value={formatDate(user.created_at)} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Edit profile</CardTitle>
            <CardDescription>How your name and contact details appear across the system</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {profileError && <Alert tone="danger">{profileError}</Alert>}
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Full name" htmlFor="profile-name" required error={profileErrors.name?.[0]}>
                <Input
                  id="profile-name"
                  value={profile.name ?? ''}
                  onChange={(event) => setProfile({ ...profile, name: event.target.value })}
                  autoComplete="name"
                />
              </FormField>
              <FormField label="Email" htmlFor="profile-email" required error={profileErrors.email?.[0]}>
                <Input
                  id="profile-email"
                  type="email"
                  value={profile.email ?? ''}
                  onChange={(event) => setProfile({ ...profile, email: event.target.value })}
                  autoComplete="email"
                />
              </FormField>
              <FormField label="Phone" htmlFor="profile-phone" error={profileErrors.phone?.[0]}>
                <Input
                  id="profile-phone"
                  value={profile.phone ?? ''}
                  onChange={(event) => setProfile({ ...profile, phone: event.target.value })}
                  autoComplete="tel"
                />
              </FormField>
            </div>
            <div className="flex justify-end">
              <Button loading={saveProfile.isPending} onClick={submitProfile}>
                Save changes
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound size={15} />
            Change password
          </CardTitle>
          <CardDescription>Minimum 6 characters. Your current password is required.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {passwordError && <Alert tone="danger">{passwordError}</Alert>}
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField
              label="Current password"
              htmlFor="current-password"
              required
              error={passwordErrors.current_password?.[0]}
            >
              <Input
                id="current-password"
                type="password"
                value={password.current_password}
                onChange={(event) => setPassword({ ...password, current_password: event.target.value })}
                autoComplete="current-password"
              />
            </FormField>
            <FormField label="New password" htmlFor="new-password" required error={passwordErrors.password?.[0]}>
              <Input
                id="new-password"
                type="password"
                value={password.password}
                onChange={(event) => setPassword({ ...password, password: event.target.value })}
                autoComplete="new-password"
              />
            </FormField>
            <FormField
              label="Confirm password"
              htmlFor="confirm-password"
              required
              error={passwordErrors.password_confirmation?.[0]}
            >
              <Input
                id="confirm-password"
                type="password"
                value={password.password_confirmation}
                onChange={(event) => setPassword({ ...password, password_confirmation: event.target.value })}
                autoComplete="new-password"
              />
            </FormField>
          </div>
          <div className="flex justify-end">
            <Button
              variant="primary"
              icon={<ShieldCheck size={15} />}
              loading={changePassword.isPending}
              onClick={submitPassword}
            >
              Update password
            </Button>
          </div>
        </CardContent>
      </Card>

      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Phone size={13} />
        Reach out to your administrator if you can no longer access your email address.
      </p>
    </div>
  )
}
