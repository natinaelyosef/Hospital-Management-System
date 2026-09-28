<<<<<<< HEAD
﻿import { matchPath } from 'react-router-dom'
=======
<<<<<<< HEAD
﻿import { matchPath } from 'react-router-dom'
=======
import { matchPath } from 'react-router-dom'
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a
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
<<<<<<< HEAD
=======
<<<<<<< HEAD
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a
  /** Alternative wording when the signed-in user holds the patient role. */
  patientLabel?: string
  path: string
  /** Alternative target when the signed-in user holds the patient role. */
  patientPath?: string
<<<<<<< HEAD
=======
=======
  path: string
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a
  icon: LucideIcon
  permission?: string | string[]
  roles?: string[]
}

export interface NavGroup {
  id: string
  label: string
<<<<<<< HEAD
  /** Alternative wording when the signed-in user holds the patient role. */
  patientLabel?: string
=======
<<<<<<< HEAD
  /** Alternative wording when the signed-in user holds the patient role. */
  patientLabel?: string
=======
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a
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

<<<<<<< HEAD
=======
<<<<<<< HEAD
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a
function isPatientPortal(user: User | null): boolean {
  return user?.role?.name === 'patient'
}

/** Patient-facing wording for a nav entry when the caller is a patient-portal user. */
function labelOf(user: User | null, item: NavItem | NavGroup): string {
  return isPatientPortal(user) && item.patientLabel ? item.patientLabel : item.label
}

/** Each portal has its own home page, so an entry may target a different path per portal. */
function pathOf(user: User | null, item: NavItem): string {
  return isPatientPortal(user) && item.patientPath ? item.patientPath : item.path
}

export function visibleGroups(user: User | null): NavGroup[] {
  return navGroups
    .filter((group) => canSee(user, group))
    .map((group) => ({
      ...group,
      label: labelOf(user, group),
      items: group.items
        .filter((item) => canSee(user, item))
        .map((item) => ({ ...item, label: labelOf(user, item), path: pathOf(user, item) })),
    }))
<<<<<<< HEAD
=======
=======
export function visibleGroups(user: User | null): NavGroup[] {
  return navGroups
    .filter((group) => canSee(user, group))
    .map((group) => ({ ...group, items: group.items.filter((item) => canSee(user, item)) }))
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a
    .filter((group) => group.items.length > 0)
}

export const navGroups: NavGroup[] = [
  {
    id: 'overview',
    label: 'Overview',
<<<<<<< HEAD
=======
<<<<<<< HEAD
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a
      items: [
        {
          label: 'Dashboard',
          patientLabel: 'My home',
          path: '/dashboard',
          patientPath: '/portal',
          icon: LayoutDashboard,
          permission: 'dashboard.view',
        },
      ],
<<<<<<< HEAD
=======
=======
    items: [{ label: 'Dashboard', path: '/', icon: LayoutDashboard }],
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a
  },
  {
    id: 'clinical',
    label: 'Clinical',
<<<<<<< HEAD
=======
<<<<<<< HEAD
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a
    patientLabel: 'My Care',
    items: [
      { label: 'Patients', patientLabel: 'My Record', path: '/patients', icon: Users, permission: 'patients.view' },
      { label: 'Appointments', patientLabel: 'My Appointments', path: '/appointments', icon: CalendarDays, permission: 'appointments.view' },
      { label: 'Consultation', patientLabel: 'My Visits', path: '/consultation', icon: ClipboardList, permission: 'consultation.view' },
      { label: 'Prescriptions', patientLabel: 'My Prescriptions', path: '/prescriptions', icon: FileText, permission: 'prescriptions.view' },
<<<<<<< HEAD
=======
=======
    items: [
      { label: 'Patients', path: '/patients', icon: Users, permission: 'patients.view' },
      { label: 'Appointments', path: '/appointments', icon: CalendarDays, permission: 'appointments.view' },
      { label: 'Consultation', path: '/consultation', icon: ClipboardList, permission: 'consultation.view' },
      { label: 'Prescriptions', path: '/prescriptions', icon: FileText, permission: 'prescriptions.view' },
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a
    ],
  },
  {
    id: 'diagnostics',
    label: 'Diagnostics',
<<<<<<< HEAD
=======
<<<<<<< HEAD
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a
    patientLabel: 'My Results',
    items: [
      { label: 'Laboratory', patientLabel: 'Lab Results', path: '/laboratory/requests', icon: FlaskConical, permission: 'lab.view' },
      { label: 'Lab Tests', patientLabel: 'Test Catalogue', path: '/laboratory/tests', icon: TestTube, permission: 'lab.view' },
<<<<<<< HEAD
=======
=======
    items: [
      { label: 'Laboratory', path: '/laboratory/requests', icon: FlaskConical, permission: 'lab.view' },
      { label: 'Lab Tests', path: '/laboratory/tests', icon: TestTube, permission: 'lab.view' },
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a
      { label: 'Pharmacy', path: '/pharmacy/medicines', icon: Pill, permission: 'pharmacy.view' },
      { label: 'Stock', path: '/pharmacy/stock', icon: Boxes, permission: 'pharmacy.view' },
      { label: 'Pharmacy Log', path: '/pharmacy/transactions', icon: ScrollText, permission: 'pharmacy.view' },
    ],
  },
  {
    id: 'inpatient',
    label: 'Inpatient',
    items: [
<<<<<<< HEAD
      { label: 'Ward Board', path: '/wards', icon: Bed, permission: 'wards.view' },
      { label: 'Admissions', path: '/wards/admissions', icon: Hospital, permission: 'wards.view' },
=======
<<<<<<< HEAD
      { label: 'Ward Board', path: '/wards', icon: Bed, permission: 'wards.view' },
      { label: 'Admissions', path: '/wards/admissions', icon: Hospital, permission: 'wards.view' },
=======
      { label: 'Ward Board', path: '/wards', icon: Bed },
      { label: 'Admissions', path: '/wards/admissions', icon: Hospital },
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a
    ],
  },
  {
    id: 'finance',
    label: 'Finance',
<<<<<<< HEAD
=======
<<<<<<< HEAD
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a
    patientLabel: 'My Billing',
    items: [
      { label: 'Invoices', patientLabel: 'My Bills', path: '/billing/invoices', icon: Receipt, permission: 'billing.view' },
      { label: 'Services', patientLabel: 'Service Prices', path: '/billing/services', icon: Wallet, permission: 'billing.view' },
      { label: 'Insurance', path: '/insurance/companies', icon: ShieldCheck, permission: 'insurance.view' },
      { label: 'Policies', path: '/insurance/policies', icon: FileCheck, permission: 'insurance.view' },
      { label: 'Claims', path: '/insurance/claims', icon: ClipboardCheck, permission: 'insurance.view' },
<<<<<<< HEAD
=======
=======
    items: [
      { label: 'Invoices', path: '/billing/invoices', icon: Receipt, permission: 'billing.view' },
      { label: 'Services', path: '/billing/services', icon: Wallet, permission: 'billing.view' },
      { label: 'Insurance', path: '/insurance/companies', icon: ShieldCheck },
      { label: 'Policies', path: '/insurance/policies', icon: FileCheck },
      { label: 'Claims', path: '/insurance/claims', icon: ClipboardCheck },
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a
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
<<<<<<< HEAD
=======
<<<<<<< HEAD
=======
    roles: ['admin'],
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a
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

<<<<<<< HEAD
=======
<<<<<<< HEAD
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a
export function pageTitle(pathname: string, user: User | null = null): string {
  for (const group of navGroups) {
    for (const item of group.items) {
      if (item.path === pathname) return labelOf(user, item)
      if (matchPath({ path: item.path, end: false }, pathname)) return labelOf(user, item)
<<<<<<< HEAD
=======
=======
export function pageTitle(pathname: string): string {
  for (const group of navGroups) {
    for (const item of group.items) {
      if (item.path === pathname) return item.label
      if (item.path !== '/' && matchPath({ path: item.path, end: false }, pathname)) return item.label
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a
    }
  }
  for (const entry of routeTitles) {
    if (matchPath({ path: entry.pattern, end: true }, pathname)) return entry.title
  }
  return 'MediCare HMS'
}
