import type { ReactNode } from 'react'
import { useAuth } from '@/contexts/AuthContext'

interface CanProps {
  /** One permission string or a list (visible when the user holds ANY of them). */
  permission?: string | string[]
  /** One role name or a list (visible when the user holds ANY of them). */
  role?: string | string[]
  /** Rendered when the checks fail. Defaults to rendering nothing. */
  fallback?: ReactNode
  children: ReactNode
}

/**
 * Declarative per-button / per-section permission gate.
 *
 * Combines the same `hasAnyPermission` / `hasRole` checks used by route guards
 * and nav visibility, so action buttons stay in sync with the backend
 * `permission:` middleware without repeating inline ternaries:
 *
 *   <Can permission="patients.create">
 *     <Button onClick={...}>Add patient</Button>
 *   </Can>
 *
 * All checks must pass when both `permission` and `role` are given.
 */
export function Can({ permission, role, fallback = null, children }: CanProps) {
  const { hasAnyPermission, hasRole } = useAuth()

  const permissions = permission === undefined ? [] : Array.isArray(permission) ? permission : [permission]
  const roles = role === undefined ? [] : Array.isArray(role) ? role : [role]

  const allowedByPermission = permissions.length === 0 || hasAnyPermission(...permissions)
  const allowedByRole = roles.length === 0 || roles.some((name) => hasRole(name))

  if (!allowedByPermission || !allowedByRole) return <>{fallback}</>
  return <>{children}</>
}
