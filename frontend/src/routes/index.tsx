import type { ReactNode } from 'react'
import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { PageLoader } from '@/components/ui/Spinner'
import { useAuth } from '@/contexts/AuthContext'
import DashboardLayout from '@/layouts/DashboardLayout'
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
  children?: ReactNode
}

/** Requires a valid session; renders 403 when `permissions` are not held by the current role. */
export function ProtectedRoute({ permissions, children }: ProtectedRouteProps) {
  const { token, user, loading, hasAnyPermission } = useAuth()

  if (!token) return <Navigate to="/login" replace />
  if (loading) return <PageLoader label="Restoring your session…" />
  if (permissions && permissions.length > 0 && !user) return <PageLoader label="Restoring your session…" />
  if (permissions && permissions.length > 0 && !hasAnyPermission(...permissions)) return <ForbiddenPage />

  return <>{children ?? <Outlet />}</>
}

function guarded(permissions: string[], element: ReactNode) {
  return <ProtectedRoute permissions={permissions}>{element}</ProtectedRoute>
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route index element={guarded([], <DashboardPage />)} />

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

          <Route path="wards" element={guarded([], <WardBoardPage />)} />
          <Route path="wards/admissions" element={guarded([], <AdmissionsPage />)} />
          <Route path="wards/admissions/:id" element={guarded([], <AdmissionDetailPage />)} />

          <Route path="billing/invoices" element={guarded(['billing.view'], <InvoicesPage />)} />
          <Route path="billing/invoices/:id" element={guarded(['billing.view'], <InvoiceDetailPage />)} />
          <Route path="billing/services" element={guarded(['billing.view'], <ServicesPage />)} />

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

          <Route path="notifications" element={guarded([], <NotificationsPage />)} />
          <Route path="profile" element={guarded([], <ProfilePage />)} />
          <Route path="403" element={guarded([], <ForbiddenPage />)} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
