import type { Portal } from '@/types'

/**
 * The two front doors. Every path is namespaced so a patient link can never
 * land on a staff page (or the reverse), and so each portal has its own
 * landing page, its own login page and its own authenticated home.
 */
export const PORTAL_HOME: Record<Portal, string> = {
  patient: '/',
  staff: '/staff',
}

/** The page that asks which front door you want. Used after sign-out and on expired sessions. */
export const PORTAL_CHOOSER = '/start'

export const PORTAL_LOGIN: Record<Portal, string> = {
  patient: '/patient/login',
  staff: '/staff/login',
}

export const PORTAL_REGISTER: Record<Portal, string> = {
  patient: '/patient/register',
  staff: '/staff/register',
}

export const PORTAL_FORGOT: Record<Portal, string> = {
  patient: '/patient/forgot-password',
  staff: '/staff/forgot-password',
}

export const PORTAL_RESET: Record<Portal, string> = {
  patient: '/patient/reset-password',
  staff: '/staff/reset-password',
}

/** Where each portal lands after a successful sign-in. */
export const PORTAL_AFTER_LOGIN: Record<Portal, string> = {
  patient: '/portal',
  staff: '/dashboard',
}

/** The other front door, used for "wrong page?" guidance. */
export const OTHER_PORTAL: Record<Portal, Portal> = {
  patient: 'staff',
  staff: 'patient',
}

export const PORTAL_LABEL: Record<Portal, string> = {
  patient: 'Patient portal',
  staff: 'Staff workspace',
}
