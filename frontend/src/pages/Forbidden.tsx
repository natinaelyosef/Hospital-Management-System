import { Link } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { useAuth } from '@/contexts/AuthContext'
import { PORTAL_AFTER_LOGIN, PORTAL_CHOOSER } from '@/lib/portals'

export default function Forbidden() {
  const { token, portal } = useAuth()

  return (
    <div className="space-y-6">
      <PageHeader title="Access denied" subtitle="Your role does not include the required permission" />
      <EmptyState
        icon={<ShieldAlert size={22} />}
        title="403 — Forbidden"
        description="Ask an administrator to grant your role access to this module."
        action={
          <Link to={token && portal ? PORTAL_AFTER_LOGIN[portal] : PORTAL_CHOOSER}>
            <Button variant="outline" size="md">
              {token && portal ? 'Back to my home' : 'Back to the front doors'}
            </Button>
          </Link>
        }
      />
    </div>
  )
}
