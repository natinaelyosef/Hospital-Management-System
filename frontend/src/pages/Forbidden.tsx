import { Link } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'

export default function Forbidden() {
  return (
    <div className="space-y-6">
      <PageHeader title="Access denied" subtitle="Your role does not include the required permission" />
      <EmptyState
        icon={<ShieldAlert size={22} />}
        title="403 — Forbidden"
        description="Ask an administrator to grant your role access to this module."
        action={
          <Link to="/">
            <Button variant="outline" size="md">
              Back to dashboard
            </Button>
          </Link>
        }
      />
    </div>
  )
}
