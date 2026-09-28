<<<<<<< HEAD
import { lazy, Suspense, type ReactNode } from 'react'
=======
import type { ReactNode } from 'react'
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { PageLoader } from '@/components/ui/Spinner'
import { useAuth } from '@/contexts/AuthContext'
import DashboardLayout from '@/layouts/DashboardLayout'
<<<<<<< HEAD
import { PORTAL_AFTER_LOGIN, PORTAL_FORGOT, PORTAL_LOGIN, PORTAL_REGISTER, PORTAL_RESET } from '@/lib/portals'
import type { Portal } from '@/types'

const LoginPage = lazy(() => import('@/pages/auth/Login'))
const RegisterPage = lazy(() => import('@/pages/auth/Register'))
const AcceptInvitePage = lazy(() => import('@/pages/auth/AcceptInvite'))
const ForgotPasswordPage = lazy(() => import('@/pages/auth/ForgotPassword'))
const ResetPasswordPage = lazy(() => import('@/pages/auth/ResetPassword'))
const ForbiddenPage = lazy(() => import('@/pages/Forbidden'))
const NotFoundPage = lazy(() => import('@/pages/NotFound'))
const PortalChooser = lazy(() => import('@/pages/public/PortalChooser'))
const PatientHome = lazy(() => import('@/pages/public/PatientHome'))
const StaffHome = lazy(() => import('@/pages/public/StaffHome'))
const PatientPortalHome = lazy(() => import('@/pages/portal/PatientPortalHome'))
const DashboardPage = lazy(() => import('@/pages/dashboard/DashboardPage'))
const PatientsPage = lazy(() => import('@/pages/patients/PatientsPage'))
const PatientDetailPage = lazy(() => import('@/pages/patients/PatientDetailPage'))
const AppointmentsPage = lazy(() => import('@/pages/appointments/AppointmentsPage'))
const VisitsPage = lazy(() => import('@/pages/consultation/VisitsPage'))
const VisitDetailPage = lazy(() => import('@/pages/consultation/VisitDetailPage'))
const PrescriptionsPage = lazy(() => import('@/pages/prescriptions/PrescriptionsPage'))
const PrescriptionDetailPage = lazy(() => import('@/pages/prescriptions/PrescriptionDetailPage'))
const MedicinesPage = lazy(() => import('@/pages/pharmacy/MedicinesPage'))
const StockPage = lazy(() => import('@/pages/pharmacy/StockPage'))
const PharmacyTransactionsPage = lazy(() => import('@/pages/pharmacy/PharmacyTransactionsPage'))
const LabRequestsPage = lazy(() => import('@/pages/laboratory/LabRequestsPage'))
const LabRequestDetailPage = lazy(() => import('@/pages/laboratory/LabRequestDetailPage'))
const LabTestsPage = lazy(() => import('@/pages/laboratory/LabTestsPage'))
const WardBoardPage = lazy(() => import('@/pages/wards/WardBoardPage'))
const AdmissionsPage = lazy(() => import('@/pages/wards/AdmissionsPage'))
const AdmissionDetailPage = lazy(() => import('@/pages/wards/AdmissionDetailPage'))
const InvoicesPage = lazy(() => import('@/pages/billing/InvoicesPage'))
const InvoiceDetailPage = lazy(() => import('@/pages/billing/InvoiceDetailPage'))
const ServicesPage = lazy(() => import('@/pages/billing/ServicesPage'))
const InsuranceCompaniesPage = lazy(() => import('@/pages/insurance/InsuranceCompaniesPage'))
const PatientInsurancePage = lazy(() => import('@/pages/insurance/PatientInsurancePage'))
const ClaimsPage = lazy(() => import('@/pages/insurance/ClaimsPage'))
const ReportsPage = lazy(() => import('@/pages/reports/ReportsPage'))
const UsersPage = lazy(() => import('@/pages/admin/UsersPage'))
const RolesPage = lazy(() => import('@/pages/admin/RolesPage'))
const DepartmentsPage = lazy(() => import('@/pages/admin/DepartmentsPage'))
const DoctorsPage = lazy(() => import('@/pages/admin/DoctorsPage'))
const AuditLogPage = lazy(() => import('@/pages/admin/AuditLogPage'))
const SettingsPage = lazy(() => import('@/pages/admin/SettingsPage'))
const NotificationsPage = lazy(() => import('@/pages/notifications/NotificationsPage'))
const ProfilePage = lazy(() => import('@/pages/profile/ProfilePage'))
const HomePage = lazy(() => import('@/pages/public/HomePage'))

export interface ProtectedRouteProps {
  permissions?: string[]
  /**
   * Restrict the route to one front door. A session on the other portal is
   * sent to its own home page rather than shown a blank or wrong screen.
   */
  portal?: Portal
=======
import LoginPage from '@/pages/auth/Login'
import ForbiddenPage from '@/pages/Forbidden'
import NotFoundPage from '@/pages/NotFound'
import DashboardPage from '@/pages/dashboard/DashboardPage'
import PatientsPage from '@/pages/patients/PatientsPage'
import PatientDetailPage from '@/pages/patients/PatientDetailPage'
import AppointmentsPage from '@/pages/appointments/AppointmentsPage'
import VisitsPage from '@/pages/consultation/VisitsPage'
import VisitDetailPage from '@/pages/consultation/VisitDetailPage'
import PrescriptionsPage from '@/pages/prescriptions/PrescriptionsPage'
import PrescriptionDetailPage from '@/pages/prescriptions/PrescriptionDetailPage'
import MedicinesPage from '@/pages/pharmacy/MedicinesPage'
import StockPage from '@/pages/pharmacy/StockPage'
import PharmacyTransactionsPage from '@/pages/pharmacy/PharmacyTransactionsPage'
import LabRequestsPage from '@/pages/laboratory/LabRequestsPage'
import LabRequestDetailPage from '@/pages/laboratory/LabRequestDetailPage'
import LabTestsPage from '@/pages/laboratory/LabTestsPage'
import WardBoardPage from '@/pages/wards/WardBoardPage'
import AdmissionsPage from '@/pages/wards/AdmissionsPage'
import AdmissionDetailPage from '@/pages/wards/AdmissionDetailPage'
import InvoicesPage from '@/pages/billing/InvoicesPage'
import InvoiceDetailPage from '@/pages/billing/InvoiceDetailPage'
import ServicesPage from '@/pages/billing/ServicesPage'
import InsuranceCompaniesPage from '@/pages/insurance/InsuranceCompaniesPage'
import PatientInsurancePage from '@/pages/insurance/PatientInsurancePage'
import ClaimsPage from '@/pages/insurance/ClaimsPage'
import ReportsPage from '@/pages/reports/ReportsPage'
import UsersPage from '@/pages/admin/UsersPage'
import RolesPage from '@/pages/admin/RolesPage'
import DepartmentsPage from '@/pages/admin/DepartmentsPage'
import DoctorsPage from '@/pages/admin/DoctorsPage'
import AuditLogPage from '@/pages/admin/AuditLogPage'
import SettingsPage from '@/pages/admin/SettingsPage'
import NotificationsPage from '@/pages/notifications/NotificationsPage'
import ProfilePage from '@/pages/profile/ProfilePage'

export interface ProtectedRouteProps {
  permissions?: string[]
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
  children?: ReactNode
}

/** Requires a valid session; renders 403 when `permissions` are not held by the current role. */
<<<<<<< HEAD
export function ProtectedRoute({ permissions, portal, children }: ProtectedRouteProps) {
  const { token, user, portal: sessionPortal, loading, hasAnyPermission } = useAuth()

  if (!token) return <Navigate to={portal ? PORTAL_LOGIN[portal] : '/login'} replace />
  if (loading) return <PageLoader label="Restoring your session…" />
  if (portal && sessionPortal && sessionPortal !== portal) {
    return <Navigate to={PORTAL_AFTER_LOGIN[sessionPortal]} replace />
  }
  if (permissions && permissions.length > 0 && !user) return <Navigate to={PORTAL_LOGIN.staff} replace />
=======
export function ProtectedRoute({ permissions, children }: ProtectedRouteProps) {
  const { token, user, loading, hasAnyPermission } = useAuth()

  if (!token) return <Navigate to="/login" replace />
  if (loading) return <PageLoader label="Restoring your session…" />
  if (permissions && permissions.length > 0 && !user) return <PageLoader label="Restoring your session…" />
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
  if (permissions && permissions.length > 0 && !hasAnyPermission(...permissions)) return <ForbiddenPage />

  return <>{children ?? <Outlet />}</>
}

<<<<<<< HEAD
function guarded(permissions: string[], element: ReactNode, portal?: Portal) {
  return (
    <ProtectedRoute permissions={permissions} portal={portal}>
      {element}
    </ProtectedRoute>
  )
=======
function guarded(permissions: string[], element: ReactNode) {
  return <ProtectedRoute permissions={permissions}>{element}</ProtectedRoute>
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
}

export default function AppRoutes() {
  return (
<<<<<<< HEAD
    <Suspense fallback={<PageLoader />}>
      <Routes>
      <Route path="/" element={<PatientHome />} />
      {/* Old patient-home links land on the new address. */}
      <Route path="/patient" element={<Navigate to="/" replace />} />
      {/* The front-door chooser lives here now that / is the patient home. */}
      <Route path="/start" element={<PortalChooser />} />
      <Route path="/about" element={<HomePage />} />
      <Route path="/patient/login" element={<LoginPage portal="patient" />} />
      <Route path="/patient/register" element={<RegisterPage />} />
      <Route path="/patient/forgot-password" element={<ForgotPasswordPage portal="patient" />} />
      <Route path="/patient/reset-password" element={<ResetPasswordPage portal="patient" />} />

      {/* ---- Staff front door: its own home, login and password pages ---- */}
      <Route path="/staff" element={<StaffHome />} />
      <Route path="/staff/login" element={<LoginPage portal="staff" />} />
      <Route path="/staff/forgot-password" element={<ForgotPasswordPage portal="staff" />} />
      <Route path="/staff/reset-password" element={<ResetPasswordPage portal="staff" />} />

      <Route path="/invite/:token" element={<AcceptInvitePage />} />

      {/* Old links keep working and land on the right front door. */}
      <Route path="/login" element={<Navigate to="/staff/login" replace />} />
      <Route path="/register" element={<Navigate to={PORTAL_REGISTER.patient} replace />} />
      <Route path="/forgot-password" element={<Navigate to={PORTAL_FORGOT.staff} replace />} />
      <Route path="/reset-password" element={<Navigate to={PORTAL_RESET.staff} replace />} />

      {/* The patient's own home page. */}
      <Route element={<ProtectedRoute portal="patient" />}>
        <Route element={<DashboardLayout />}>
          <Route path="portal" element={<PatientPortalHome />} />
        </Route>
      </Route>

      {/*
        Shared record pages. Both portals read them: staff see the whole
        hospital, patients see only their own records (the API scopes every
        query by the signed-in patient). The staff-only pages below are
        additionally pinned to the staff front door.
      */}
      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route path="dashboard" element={guarded(['dashboard.view'], <DashboardPage />, 'staff')} />
=======
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route index element={guarded([], <DashboardPage />)} />
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf

          <Route path="patients" element={guarded(['patients.view'], <PatientsPage />)} />
          <Route path="patients/:id" element={guarded(['patients.view'], <PatientDetailPage />)} />

          <Route path="appointments" element={guarded(['appointments.view'], <AppointmentsPage />)} />

          <Route path="consultation" element={guarded(['consultation.view'], <VisitsPage />)} />
          <Route path="consultation/:id" element={guarded(['consultation.view'], <VisitDetailPage />)} />

          <Route path="prescriptions" element={guarded(['prescriptions.view'], <PrescriptionsPage />)} />
          <Route path="prescriptions/:id" element={guarded(['prescriptions.view'], <PrescriptionDetailPage />)} />

          <Route path="laboratory/requests" element={guarded(['lab.view'], <LabRequestsPage />)} />
          <Route path="laboratory/requests/:id" element={guarded(['lab.view'], <LabRequestDetailPage />)} />
          <Route path="laboratory/tests" element={guarded(['lab.view'], <LabTestsPage />)} />

          <Route path="pharmacy/medicines" element={guarded(['pharmacy.view'], <MedicinesPage />)} />
          <Route path="pharmacy/stock" element={guarded(['pharmacy.view'], <StockPage />)} />
          <Route path="pharmacy/transactions" element={guarded(['pharmacy.view'], <PharmacyTransactionsPage />)} />

<<<<<<< HEAD
          <Route path="wards" element={guarded(['wards.view'], <WardBoardPage />)} />
          <Route path="wards/admissions" element={guarded(['wards.view'], <AdmissionsPage />)} />
          <Route path="wards/admissions/:id" element={guarded(['wards.view'], <AdmissionDetailPage />)} />
=======
          <Route path="wards" element={guarded([], <WardBoardPage />)} />
          <Route path="wards/admissions" element={guarded([], <AdmissionsPage />)} />
          <Route path="wards/admissions/:id" element={guarded([], <AdmissionDetailPage />)} />
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf

          <Route path="billing/invoices" element={guarded(['billing.view'], <InvoicesPage />)} />
          <Route path="billing/invoices/:id" element={guarded(['billing.view'], <InvoiceDetailPage />)} />
          <Route path="billing/services" element={guarded(['billing.view'], <ServicesPage />)} />

<<<<<<< HEAD
          <Route path="insurance/companies" element={guarded(['insurance.view'], <InsuranceCompaniesPage />)} />
          <Route path="insurance/policies" element={guarded(['insurance.view'], <PatientInsurancePage />)} />
          <Route path="insurance/claims" element={guarded(['insurance.view'], <ClaimsPage />)} />

          <Route path="reports" element={guarded(['reports.view'], <ReportsPage />, 'staff')} />

          <Route path="admin/users" element={guarded(['users.view'], <UsersPage />, 'staff')} />
          <Route path="admin/roles" element={guarded(['roles.manage'], <RolesPage />, 'staff')} />
          <Route path="admin/departments" element={guarded(['departments.view'], <DepartmentsPage />, 'staff')} />
          <Route path="admin/doctors" element={guarded(['doctors.view'], <DoctorsPage />, 'staff')} />
          <Route path="admin/audit-logs" element={guarded(['audit.view'], <AuditLogPage />, 'staff')} />
          <Route path="admin/settings" element={guarded(['settings.manage'], <SettingsPage />, 'staff')} />
=======
          <Route path="insurance/companies" element={guarded([], <InsuranceCompaniesPage />)} />
          <Route path="insurance/policies" element={guarded([], <PatientInsurancePage />)} />
          <Route path="insurance/claims" element={guarded([], <ClaimsPage />)} />

          <Route path="reports" element={guarded(['reports.view'], <ReportsPage />)} />

          <Route path="admin/users" element={guarded(['users.view'], <UsersPage />)} />
          <Route path="admin/roles" element={guarded(['roles.manage'], <RolesPage />)} />
          <Route path="admin/departments" element={guarded(['departments.view'], <DepartmentsPage />)} />
          <Route path="admin/doctors" element={guarded(['doctors.view'], <DoctorsPage />)} />
          <Route path="admin/audit-logs" element={guarded(['audit.view'], <AuditLogPage />)} />
          <Route path="admin/settings" element={guarded(['settings.manage'], <SettingsPage />)} />
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf

          <Route path="notifications" element={guarded([], <NotificationsPage />)} />
          <Route path="profile" element={guarded([], <ProfilePage />)} />
          <Route path="403" element={guarded([], <ForbiddenPage />)} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
<<<<<<< HEAD
      </Routes>
    </Suspense>
=======
    </Routes>
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
  )
}
