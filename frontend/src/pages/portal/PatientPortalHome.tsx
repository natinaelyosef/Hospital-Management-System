import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowRight,
  CalendarDays,
  FlaskConical,
  HeartPulse,
  Pill,
  Receipt,
  Stethoscope,
  Wallet,
} from 'lucide-react'
import { dashboardApi } from '@/api/dashboard.api'
import { visitApi } from '@/api/visit.api'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageLoader } from '@/components/ui/Spinner'
import { Panel, PanelRow } from '@/components/modules/overview/Panel'
import { StatCard } from '@/components/ui/StatCard'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useAuth } from '@/contexts/AuthContext'
import { formatCurrency, formatDate, statusLabel } from '@/utils/format'

/**
 * The patient's own home page. Reached only from the patient login, and
 * scoped to the signed-in patient by the API — the staff workspace has its
 * own home at /dashboard.
 */
export default function PatientPortalHome() {
  const { user, portal } = useAuth()
  const firstName = user?.name?.trim().split(/\s+/)[0] ?? 'there'

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'patient'],
    queryFn: dashboardApi.get,
  })

  const activeVisitQuery = useQuery({
    queryKey: ['visits', { portal: 'mine' }],
    queryFn: () => visitApi.list({ per_page: 20 }),
  })

  if (isLoading) return <PageLoader label="Loading your portal…" />

  const stats = data?.stats ?? []
  // The open case is the one that has not reached a terminal stage.
  const activeVisit = activeVisitQuery.data?.data.find(
    (visit) => visit.status !== 'visit_completed' && visit.status !== 'cancelled',
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Hello, {firstName}</h1>
        <p className="text-sm text-muted-foreground">
          {portal === 'patient'
            ? 'Everything about your care, in one place.'
            : 'You are signed in to the patient portal.'}
        </p>
      </div>

      {activeVisit ? (
        <Link
          to={`/consultation/${activeVisit.id}`}
          className="flex flex-col gap-3 rounded-xl border bg-card p-5 shadow-xs transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/12 text-primary">
              <HeartPulse size={19} />
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground">Your visit is in progress</p>
              <p className="text-xs text-muted-foreground">
                {activeVisit.visit_number} · {statusLabel(activeVisit.status)} · opened{' '}
                {formatDate(activeVisit.created_at)}
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary">
            Follow my visit <ArrowRight size={15} />
          </span>
        </Link>
      ) : (
        <div className="rounded-xl border bg-card p-5 shadow-xs">
          <EmptyState
            compact
            icon={<Stethoscope size={20} />}
            title="No visit in progress"
            description="When you are seen at the hospital, your case appears here with every step of its journey."
          />
        </div>
      )}

      {stats.length > 0 && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {stats.map((stat) => (
            <StatCard
              key={stat.label}
              label={stat.label}
              value={stat.value}
              icon={
                stat.label.toLowerCase().includes('appointment') ? (
                  <CalendarDays size={16} />
                ) : stat.label.toLowerCase().includes('prescription') ? (
                  <Pill size={16} />
                ) : stat.label.toLowerCase().includes('outstanding') ? (
                  <Wallet size={16} />
                ) : (
                  <FlaskConical size={16} />
                )
              }
            />
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {data?.recent_appointments && (
          <Panel title="My appointments" icon={<CalendarDays size={16} />} to="/appointments">
            {data.recent_appointments.length === 0 ? (
              <EmptyState compact icon={<CalendarDays size={20} />} title="No appointments yet" />
            ) : (
              <div className="flex flex-col gap-0.5">
                {data.recent_appointments.map((appointment) => (
                  <PanelRow
                    key={appointment.id}
                    title={appointment.doctor.name}
                    meta={`${formatDate(appointment.appointment_date)} · ${statusLabel(appointment.type)}`}
                    trailing={<StatusBadge status={appointment.status} />}
                  />
                ))}
              </div>
            )}
          </Panel>
        )}

        {data?.prescriptions && (
          <Panel title="My prescriptions" icon={<Pill size={16} />} to="/prescriptions">
            {data.prescriptions.length === 0 ? (
              <EmptyState compact icon={<Pill size={20} />} title="No prescriptions yet" />
            ) : (
              <div className="flex flex-col gap-0.5">
                {data.prescriptions.map((prescription) => (
                  <PanelRow
                    key={prescription.id}
                    to={`/prescriptions/${prescription.id}`}
                    title={prescription.prescription_number}
                    meta={`${prescription.items.length} medicine${prescription.items.length === 1 ? '' : 's'}`}
                    trailing={<StatusBadge status={prescription.status} />}
                  />
                ))}
              </div>
            )}
          </Panel>
        )}

        {data?.lab_requests && (
          <Panel title="My lab results" icon={<FlaskConical size={16} />} to="/laboratory/requests">
            {data.lab_requests.length === 0 ? (
              <EmptyState compact icon={<FlaskConical size={20} />} title="No lab results yet" />
            ) : (
              <div className="flex flex-col gap-0.5">
                {data.lab_requests.map((request) => (
                  <PanelRow
                    key={request.id}
                    to={`/laboratory/requests/${request.id}`}
                    title={request.request_number}
                    meta={`${request.results.length} test${request.results.length === 1 ? '' : 's'}`}
                    trailing={<StatusBadge status={request.status} />}
                  />
                ))}
              </div>
            )}
          </Panel>
        )}

        {data?.invoices && (
          <Panel title="My bills" icon={<Receipt size={16} />} to="/billing/invoices">
            {data.invoices.length === 0 ? (
              <EmptyState compact icon={<Receipt size={20} />} title="No bills yet" />
            ) : (
              <div className="flex flex-col gap-0.5">
                {data.invoices.map((invoice) => (
                  <PanelRow
                    key={invoice.id}
                    to={`/billing/invoices/${invoice.id}`}
                    title={invoice.invoice_number}
                    meta={`${formatCurrency(invoice.total)} · balance ${formatCurrency(invoice.balance)}`}
                    trailing={<StatusBadge status={invoice.status} />}
                  />
                ))}
              </div>
            )}
          </Panel>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Need something else?{' '}
        <Link to="/notifications" className="font-medium text-primary hover:underline">
          Check your notifications
        </Link>{' '}
        for every handoff, or{' '}
        <Link to="/profile" className="font-medium text-primary hover:underline">
          update your profile
        </Link>
        .
      </p>
    </div>
  )
}
