import { useEffect, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import {
  Activity,
  CalendarDays,
  ClipboardList,
  Clock,
  FileText,
  FlaskConical,
  Pill,
  Receipt,
  RefreshCw,
  Users,
  Wallet,
} from 'lucide-react'
import { dashboardApi } from '@/api/dashboard.api'
<<<<<<< HEAD
import { workflowApi } from '@/api/workflow.api'
=======
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
import { AreaChartCard, PieChartCard } from '@/components/charts'
import { Panel, PanelRow } from '@/components/modules/overview/Panel'
import { statIcon } from '@/components/modules/overview/statIcons'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { Skeleton } from '@/components/ui/Spinner'
import { StatCard } from '@/components/ui/StatCard'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useAuth } from '@/contexts/AuthContext'
import type {
  Appointment,
  DashboardStat,
  Invoice,
  LabRequest,
  Medicine,
  Patient,
  Prescription,
<<<<<<< HEAD
  WorkflowTask,
=======
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
} from '@/types'
import { cn } from '@/utils/cn'
import { formatCurrency, formatDate, formatTime, setCurrency, statusLabel } from '@/utils/format'

/** Sections arrive per role - treat every one of them as optional and skip what is missing. */
interface DashboardPayload {
  stats?: DashboardStat[]
  revenue?: { today: number; month: number; outstanding: number; currency: string }
  recent_appointments?: Appointment[]
  recent_patients?: Patient[]
  low_stock_medicines?: Medicine[]
  pending_lab_results?: LabRequest[]
  admissions?: { date: string; count: number }[]
  appointments_by_status?: { status: string; count: number }[]
  upcoming?: Appointment[]
  waiting?: Appointment[]
  pending_prescriptions?: Prescription[]
  outstanding_invoices?: Invoice[]
}

const ROWS_PER_PANEL = 6

<<<<<<< HEAD
/** §18 queue widgets: every role sees its pending handoffs, not a search box. */
function TasksPanel({ tasks, loading }: { tasks: WorkflowTask[] | undefined; loading: boolean }) {
  if (loading || !tasks || tasks.length === 0) return null

  return (
    <Panel title="My tasks" icon={<ClipboardList size={16} />} count={tasks.reduce((sum, task) => sum + task.count, 0)}>
      <div className="flex flex-col gap-0.5">
        {tasks.map((task) => (
          <PanelRow
            key={task.key}
            title={task.label}
            to={task.url}
            trailing={
              <Badge tone={task.count > 0 ? 'info' : 'neutral'}>
                {task.count}
              </Badge>
            }
          />
        ))}
      </div>
    </Panel>
  )
}

=======
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
function formatStatValue(value: number | string): string {
  return typeof value === 'number' ? value.toLocaleString('en-US') : value
}

function RevenueCard({ revenue }: { revenue: NonNullable<DashboardPayload['revenue']> }) {
  const cells = [
    { label: 'Today', value: revenue.today, tone: 'text-foreground' },
    { label: 'This month', value: revenue.month, tone: 'text-foreground' },
    {
      label: 'Outstanding',
      value: revenue.outstanding,
      tone: revenue.outstanding > 0 ? 'text-destructive' : 'text-foreground',
    },
  ]

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <CardTitle>Revenue</CardTitle>
          <CardDescription>Collected today and this month, plus unpaid balances</CardDescription>
        </div>
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/12 text-emerald-600 dark:text-emerald-400">
          <Wallet size={18} />
        </span>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-3">
          {cells.map((cell) => (
            <div key={cell.label} className="flex flex-col gap-1 rounded-lg border bg-muted/30 px-4 py-3">
              <span className="text-xs font-medium text-muted-foreground">{cell.label}</span>
              <span className={cn('text-lg font-semibold tracking-tight', cell.tone)}>
                {formatCurrency(cell.value)}
              </span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">Amounts shown in {revenue.currency}</p>
      </CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  const { user, hasPermission } = useAuth()

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => dashboardApi.get(),
    staleTime: 30_000,
  })

<<<<<<< HEAD
  const { data: tasks, isLoading: loadingTasks } = useQuery({
    queryKey: ['workflow', 'summary'],
    queryFn: () => workflowApi.summary(),
    staleTime: 30_000,
    retry: 0,
  })

=======
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
  const payload: DashboardPayload | undefined = data

  useEffect(() => {
    if (payload?.revenue?.currency) setCurrency(payload.revenue.currency)
  }, [payload])

  const now = new Date()
  const hour = Number(format(now, 'HH'))
  const partOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'
  const firstName = user?.name?.trim().split(/\s+/)[0] ?? 'there'
  const roleLabel = user?.role?.label ?? user?.role?.name

  const visibleLink = (permission: string, path: string) => (hasPermission(permission) ? path : undefined)

  const buildPanels = (sections: DashboardPayload): ReactNode[] => {
    const panels: ReactNode[] = []

    const recentAppointments = sections.recent_appointments
    if (recentAppointments) {
      panels.push(
        <Panel
          key="recent-appointments"
          title="Recent appointments"
          icon={<CalendarDays size={16} />}
          count={recentAppointments.length}
          to={visibleLink('appointments.view', '/appointments')}
        >
          {recentAppointments.length === 0 ? (
            <EmptyState compact icon={<CalendarDays size={20} />} title="No appointments yet" />
          ) : (
            <div className="flex flex-col gap-0.5">
              {recentAppointments.slice(0, ROWS_PER_PANEL).map((appointment) => (
                <PanelRow
                  key={appointment.id}
                  title={appointment.patient.full_name}
                  meta={`${formatTime(appointment.start_time)} · ${appointment.doctor.name}`}
                  trailing={<StatusBadge status={appointment.status} />}
                />
              ))}
            </div>
          )}
        </Panel>,
      )
    }

    const recentPatients = sections.recent_patients
    if (recentPatients) {
      panels.push(
        <Panel
          key="recent-patients"
          title="Recent patients"
          icon={<Users size={16} />}
          count={recentPatients.length}
          to={visibleLink('patients.view', '/patients')}
        >
          {recentPatients.length === 0 ? (
            <EmptyState compact icon={<Users size={20} />} title="No patients registered yet" />
          ) : (
            <div className="flex flex-col gap-0.5">
              {recentPatients.slice(0, ROWS_PER_PANEL).map((patient) => (
                <PanelRow
                  key={patient.id}
                  to={visibleLink('patients.view', `/patients/${patient.id}`)}
                  title={patient.full_name}
                  meta={`${patient.patient_number} · ${patient.phone || 'no phone'}`}
                  trailing={
                    <span className="text-[11px] text-muted-foreground">{formatDate(patient.created_at)}</span>
                  }
                />
              ))}
            </div>
          )}
        </Panel>,
      )
    }

    const lowStock = sections.low_stock_medicines
    if (lowStock) {
      panels.push(
        <Panel
          key="low-stock"
          title="Low stock medicines"
          icon={<Pill size={16} />}
          count={lowStock.length}
          to={visibleLink('pharmacy.view', '/pharmacy/medicines')}
        >
          {lowStock.length === 0 ? (
            <EmptyState compact icon={<Pill size={20} />} title="Stock levels look healthy" />
          ) : (
            <div className="flex flex-col gap-0.5">
              {lowStock.slice(0, ROWS_PER_PANEL).map((medicine) => (
                <PanelRow
                  key={medicine.id}
                  title={medicine.name}
                  meta={`Reorder at ${medicine.reorder_level} ${medicine.unit}`}
                  trailing={
                    <Badge tone={medicine.stock_quantity <= 0 ? 'danger' : 'warning'}>
                      {medicine.stock_quantity} left
                    </Badge>
                  }
                />
              ))}
            </div>
          )}
        </Panel>,
      )
    }

    const pendingLabs = sections.pending_lab_results
    if (pendingLabs) {
      panels.push(
        <Panel
          key="pending-labs"
          title="Pending lab results"
          icon={<FlaskConical size={16} />}
          count={pendingLabs.length}
          to={visibleLink('lab.view', '/laboratory/requests')}
        >
          {pendingLabs.length === 0 ? (
            <EmptyState compact icon={<FlaskConical size={20} />} title="No lab results pending" />
          ) : (
            <div className="flex flex-col gap-0.5">
              {pendingLabs.slice(0, ROWS_PER_PANEL).map((request) => (
                <PanelRow
                  key={request.id}
                  title={request.request_number}
                  meta={`${request.patient.full_name} · ${statusLabel(request.priority)}`}
                  trailing={<StatusBadge status={request.status} />}
                />
              ))}
            </div>
          )}
        </Panel>,
      )
    }

    const waiting = sections.waiting
    if (waiting) {
      panels.push(
        <Panel
          key="waiting-queue"
          title="Waiting queue"
          icon={<Clock size={16} />}
          count={waiting.length}
          to={visibleLink('appointments.view', '/appointments')}
        >
          {waiting.length === 0 ? (
            <EmptyState compact icon={<Clock size={20} />} title="Nobody is waiting" />
          ) : (
            <div className="flex flex-col gap-0.5">
              {waiting.slice(0, ROWS_PER_PANEL).map((appointment) => (
                <PanelRow
                  key={appointment.id}
                  title={appointment.patient.full_name}
                  meta={`${appointment.queue_number != null ? `#${appointment.queue_number} · ` : ''}${appointment.doctor.name}`}
                  trailing={<StatusBadge status={appointment.status} />}
                />
              ))}
            </div>
          )}
        </Panel>,
      )
    }

    const upcoming = sections.upcoming
    if (upcoming) {
      panels.push(
        <Panel
          key="upcoming"
          title="Upcoming appointments"
          icon={<CalendarDays size={16} />}
          count={upcoming.length}
          to={visibleLink('appointments.view', '/appointments')}
        >
          {upcoming.length === 0 ? (
            <EmptyState compact icon={<CalendarDays size={20} />} title="Nothing scheduled next" />
          ) : (
            <div className="flex flex-col gap-0.5">
              {upcoming.slice(0, ROWS_PER_PANEL).map((appointment) => (
                <PanelRow
                  key={appointment.id}
                  title={appointment.patient.full_name}
                  meta={`${formatDate(appointment.appointment_date)} · ${formatTime(appointment.start_time)} · ${appointment.doctor.name}`}
                  trailing={<StatusBadge status={appointment.status} />}
                />
              ))}
            </div>
          )}
        </Panel>,
      )
    }

    const pendingPrescriptions = sections.pending_prescriptions
    if (pendingPrescriptions) {
      panels.push(
        <Panel
          key="pending-prescriptions"
          title="Pending prescriptions"
          icon={<FileText size={16} />}
          count={pendingPrescriptions.length}
          to={visibleLink('prescriptions.view', '/prescriptions?status=pending')}
        >
          {pendingPrescriptions.length === 0 ? (
            <EmptyState compact icon={<FileText size={20} />} title="Dispensary queue is clear" />
          ) : (
            <div className="flex flex-col gap-0.5">
              {pendingPrescriptions.slice(0, ROWS_PER_PANEL).map((prescription) => (
                <PanelRow
                  key={prescription.id}
                  title={prescription.prescription_number}
                  meta={`${prescription.patient.full_name} · ${prescription.items.length} item${prescription.items.length === 1 ? '' : 's'}`}
                  trailing={<StatusBadge status={prescription.status} />}
                />
              ))}
            </div>
          )}
        </Panel>,
      )
    }

    const outstanding = sections.outstanding_invoices
    if (outstanding) {
      panels.push(
        <Panel
          key="outstanding-invoices"
          title="Outstanding invoices"
          icon={<Receipt size={16} />}
          count={outstanding.length}
          to={visibleLink('billing.view', '/billing/invoices')}
        >
          {outstanding.length === 0 ? (
            <EmptyState compact icon={<Receipt size={20} />} title="Every invoice is settled" />
          ) : (
            <div className="flex flex-col gap-0.5">
              {outstanding.slice(0, ROWS_PER_PANEL).map((invoice) => (
                <PanelRow
                  key={invoice.id}
                  title={invoice.invoice_number}
                  meta={`${invoice.patient.full_name} · issued ${formatDate(invoice.created_at)}`}
                  trailing={
                    <span className="text-xs font-semibold text-destructive">
                      {formatCurrency(invoice.balance)}
                    </span>
                  }
                />
              ))}
            </div>
          )}
        </Panel>,
      )
    }

    return panels
  }

  const stats = payload?.stats ?? []
  const appointmentsByStatus = payload?.appointments_by_status ?? []
  const admissions = payload?.admissions ?? []
  const panels = isLoading || isError || !payload ? [] : buildPanels(payload)
  const statusTotal = appointmentsByStatus.reduce((sum, row) => sum + row.count, 0)
  const hasContent =
    stats.length > 0 ||
    Boolean(payload?.revenue) ||
    appointmentsByStatus.length > 0 ||
    admissions.length > 0 ||
    panels.length > 0

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Good ${partOfDay}, ${firstName}`}
        subtitle={
          roleLabel
            ? `${format(now, 'EEEE, d MMMM yyyy')} · ${roleLabel} overview`
            : format(now, 'EEEE, d MMMM yyyy')
        }
        actions={
          <Button
            variant="outline"
            icon={<RefreshCw size={15} />}
            loading={isFetching}
            onClick={() => void refetch()}
          >
            Refresh
          </Button>
        }
      />

      {isLoading ? (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[0, 1, 2, 3].map((row) => (
              <Skeleton key={row} className="h-28 w-full rounded-xl" />
            ))}
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            {[0, 1].map((row) => (
              <Skeleton key={row} className="h-72 w-full rounded-xl" />
            ))}
          </div>
        </div>
      ) : isError || !payload ? (
        <EmptyState
          icon={<Activity size={22} />}
          title="Unable to load your dashboard"
          description="The overview service did not respond. Try again in a moment."
          action={
            <Button size="sm" onClick={() => void refetch()}>
              Try again
            </Button>
          }
        />
      ) : (
        <div className="space-y-5">
<<<<<<< HEAD
          <TasksPanel tasks={tasks} loading={loadingTasks} />

=======
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
          {stats.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {stats.map((stat, index) => (
                <StatCard
                  key={`${stat.label}-${index}`}
                  label={stat.label}
                  value={formatStatValue(stat.value)}
                  icon={statIcon(stat.icon)}
                  trend={stat.trend}
                />
              ))}
            </div>
          )}

          {payload.revenue && <RevenueCard revenue={payload.revenue} />}

          {(appointmentsByStatus.length > 0 || admissions.length > 0) && (
            <div className="grid gap-5 lg:grid-cols-2">
              {appointmentsByStatus.length > 0 && (
                <PieChartCard
                  title="Appointments by status"
                  subtitle="Booked appointments in the current view"
                  data={appointmentsByStatus.map((row) => ({ status: statusLabel(row.status), count: row.count }))}
                  xKey="status"
                  yKeys={[{ key: 'count', label: 'Appointments' }]}
                  centerLabel={`${statusTotal} total`}
                />
              )}
              {admissions.length > 0 && (
                <AreaChartCard
                  title="Admissions"
                  subtitle="Last 7 days"
                  data={admissions}
                  xKey="date"
                  yKeys={[{ key: 'count', label: 'Admissions' }]}
                />
              )}
            </div>
          )}

          {panels.length > 0 && <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">{panels}</div>}

          {!hasContent && (
            <EmptyState
              icon={<ClipboardList size={22} />}
              title="Nothing to show yet"
              description="Your role receives sections as data becomes available."
            />
          )}
        </div>
      )}
    </div>
  )
}
