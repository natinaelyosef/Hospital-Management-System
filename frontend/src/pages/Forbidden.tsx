<<<<<<< HEAD
﻿import { Link } from 'react-router-dom'
=======
<<<<<<< HEAD
﻿import { Link } from 'react-router-dom'
=======
import { Link } from 'react-router-dom'
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a
import { ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
<<<<<<< HEAD
=======
<<<<<<< HEAD
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a
import { useAuth } from '@/contexts/AuthContext'
import { PORTAL_AFTER_LOGIN, PORTAL_CHOOSER } from '@/lib/portals'

export default function Forbidden() {
  const { token, portal } = useAuth()

<<<<<<< HEAD
=======
=======

export default function Forbidden() {
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a
  return (
    <div className="space-y-6">
      <PageHeader title="Access denied" subtitle="Your role does not include the required permission" />
      <EmptyState
        icon={<ShieldAlert size={22} />}
        title="403 — Forbidden"
        description="Ask an administrator to grant your role access to this module."
        action={
<<<<<<< HEAD
          <Link to={token && portal ? PORTAL_AFTER_LOGIN[portal] : PORTAL_CHOOSER}>
            <Button variant="outline" size="md">
              {token && portal ? 'Back to my home' : 'Back to the front doors'}
=======
<<<<<<< HEAD
          <Link to={token && portal ? PORTAL_AFTER_LOGIN[portal] : PORTAL_CHOOSER}>
            <Button variant="outline" size="md">
              {token && portal ? 'Back to my home' : 'Back to the front doors'}
=======
          <Link to="/">
            <Button variant="outline" size="md">
              Back to dashboard
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a
            </Button>
          </Link>
        }
      />
    </div>
  )
}
