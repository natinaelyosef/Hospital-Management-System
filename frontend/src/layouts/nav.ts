import { matchPath } from 'react-router-dom'
import {
  Bed,
  Boxes,
  Building,
  CalendarDays,
  ChartColumn,
  ClipboardCheck,
  ClipboardList,
  FileCheck,
  FileSearch,
  FileText,
  FlaskConical,
  Hospital,
  LayoutDashboard,
  Pill,
  Receipt,
  ScrollText,
  Settings,
  ShieldCheck,
  Stethoscope,
  TestTube,
  UserCog,
  Users,
  Wallet,
  KeyRound,
  type LucideIcon,
} from 'lucide-react'
import type { User } from '@/types'

export interface NavItem {
  label: string
  path: string
  icon: LucideIcon
  permission?: string | string[]
  roles?: string[]
}

export interface NavGroup {
  id: string
  label: string
  items: NavItem[]
  permission?: string | string[]
  roles?: string[]
}

function hasPermission(user: User | null, permission?: string | string[]): boolean {
  if (!permission) return true
  const granted = new Set(user?.role?.permissions ?? [])
  const required = Array.isArray(permission) ? permission : [permission]
  return required.some((item) => granted.has(item))
}

function matchesRole(user: User | null, roles?: string[]): boolean {
  if (!roles || roles.length === 0) return true
  const name = user?.role?.name
  return name ? roles.includes(name) : false
}

/** A nav entry is visible when the user holds its role (if any) and one of its permissions (if any). */
export function canSee(user: User | null, item: NavItem | NavGroup): boolean {
  return matchesRole(user, item.roles) && hasPermission(user, item.permission)
}

export function visibleGroups(user: User | null): NavGroup[] {
  return navGroups
    .filter((group) => canSee(user, group))
    .map((group) => ({ ...group, items: group.items.filter((item) => canSee(user, item)) }))
    .filter((group) => group.items.length > 0)
}

export const navGroups: NavGroup[] = [
  {
    id: 'overview',
    label: 'Overview',
    items: [{ label: 'Dashboard', path: '/', icon: LayoutDashboard }],
  },
  {
    id: 'clinical',
    label: 'Clinical',
    items: [
      { label: 'Patients', path: '/patients', icon: Users, permission: 'patients.view' },
      { label: 'Appointments', path: '/appointments', icon: CalendarDays, permission: 'appointments.view' },
      { label: 'Consultation', path: '/consultation', icon: ClipboardList, permission: 'consultation.view' },
      { label: 'Prescriptions', path: '/prescriptions', icon: FileText, permission: 'prescriptions.view' },
    ],
  },
  {
    id: 'diagnostics',
    label: 'Diagnostics',
    items: [
      { label: 'Laboratory', path: '/laboratory/requests', icon: FlaskConical, permission: 'lab.view' },
      { label: 'Lab Tests', path: '/laboratory/tests', icon: TestTube, permission: 'lab.view' },
      { label: 'Pharmacy', path: '/pharmacy/medicines', icon: Pill, permission: 'pharmacy.view' },
      { label: 'Stock', path: '/pharmacy/stock', icon: Boxes, permission: 'pharmacy.view' },
      { label: 'Pharmacy Log', path: '/pharmacy/transactions', icon: ScrollText, permission: 'pharmacy.view' },
    ],
  },
  {
    id: 'inpatient',
    label: 'Inpatient',
    items: [
      { label: 'Ward Board', path: '/wards', icon: Bed },
      { label: 'Admissions', path: '/wards/admissions', icon: Hospital },
    ],
  },
  {
    id: 'finance',
    label: 'Finance',
    items: [
      { label: 'Invoices', path: '/billing/invoices', icon: Receipt, permission: 'billing.view' },
      { label: 'Services', path: '/billing/services', icon: Wallet, permission: 'billing.view' },
      { label: 'Insurance', path: '/insurance/companies', icon: ShieldCheck },
      { label: 'Policies', path: '/insurance/policies', icon: FileCheck },
      { label: 'Claims', path: '/insurance/claims', icon: ClipboardCheck },
    ],
  },
  {
    id: 'insights',
    label: 'Insights',
    items: [{ label: 'Reports', path: '/reports', icon: ChartColumn, permission: 'reports.view' }],
  },
  {
    id: 'administration',
    label: 'Administration',
    roles: ['admin'],
    items: [
      { label: 'Users', path: '/admin/users', icon: UserCog, permission: 'users.view' },
      { label: 'Roles', path: '/admin/roles', icon: KeyRound, permission: 'roles.manage' },
      { label: 'Departments', path: '/admin/departments', icon: Building, permission: 'departments.view' },
      { label: 'Doctors', path: '/admin/doctors', icon: Stethoscope, permission: 'doctors.view' },
      { label: 'Audit Log', path: '/admin/audit-logs', icon: FileSearch, permission: 'audit.view' },
      { label: 'Settings', path: '/admin/settings', icon: Settings, permission: 'settings.manage' },
    ],
  },
]

/** Route patterns outside the nav that still need a topbar title. */
export const routeTitles: { pattern: string; title: string }[] = [
  { pattern: '/patients/:id', title: 'Patient Record' },
  { pattern: '/consultation/:id', title: 'Consultation Notes' },
  { pattern: '/prescriptions/:id', title: 'Prescription' },
  { pattern: '/laboratory/requests/:id', title: 'Lab Request' },
  { pattern: '/wards/admissions/:id', title: 'Admission' },
  { pattern: '/billing/invoices/:id', title: 'Invoice' },
  { pattern: '/notifications', title: 'Notifications' },
  { pattern: '/profile', title: 'My Profile' },
  { pattern: '/403', title: 'Access Denied' },
]

export function pageTitle(pathname: string): string {
  for (const group of navGroups) {
    for (const item of group.items) {
      if (item.path === pathname) return item.label
      if (item.path !== '/' && matchPath({ path: item.path, end: false }, pathname)) return item.label
    }
  }
  for (const entry of routeTitles) {
    if (matchPath({ path: entry.pattern, end: true }, pathname)) return entry.title
  }
  return 'MediCare HMS'
}
