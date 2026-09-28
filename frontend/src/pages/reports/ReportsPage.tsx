import { useMemo, useState, type ReactNode } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { format, parseISO, subDays } from 'date-fns'
import {
  Boxes,
  CalendarDays,
  Download,
  FlaskConical,
  Hospital,
  Pill,
  Receipt,
  Stethoscope,
  Users,
  Wallet,
} from 'lucide-react'
import { getErrorMessage } from '@/api/client'
import {
  reportApi,
  type AdmissionsReport,
  type AppointmentsReport,
  type DoctorPerformanceRow,
  type InventoryRow,
  type OutstandingRow,
  type ReportRange,
  type ReportType,
} from '@/api/report.api'
import { AreaChartCard, BarChartCard, LineChartCard, PieChartCard } from '@/components/charts'
import { Button } from '@/components/ui/Button'
import { DateRangePicker, type DateRange } from '@/components/ui/DateRangePicker'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { Skeleton } from '@/components/ui/Spinner'
import { StatCard } from '@/components/ui/StatCard'
import { Table, type Column } from '@/components/ui/Table'
import { Tabs } from '@/components/ui/Tabs'
import { useToast } from '@/components/ui/Toast'
import type { LabelSeriesReport } from '@/types'
import { csvToDownload, formatCurrency, formatDate } from '@/utils/format'

const TABS = [
  { value: 'daily-patients', label: 'Daily Patients', icon: <Users size={14} /> },
  { value: 'appointments', label: 'Appointments', icon: <CalendarDays size={14} /> },
  { value: 'revenue', label: 'Revenue', icon: <Wallet size={14} /> },
  { value: 'pharmacy-sales', label: 'Pharmacy Sales', icon: <Pill size={14} /> },
  { value: 'lab-tests', label: 'Lab Tests', icon: <FlaskConical size={14} /> },
  { value: 'admissions', label: 'Admissions', icon: <Hospital size={14} /> },
  { value: 'outstanding', label: 'Outstanding', icon: <Receipt size={14} /> },
  { value: 'doctor-performance', label: 'Doctor Performance', icon: <Stethoscope size={14} /> },
  { value: 'inventory', label: 'Inventory', icon: <Boxes size={14} /> },
] as const

type ReportTab = (typeof TABS)[number]['value']
type TableTab = Extract<ReportTab, 'outstanding' | 'doctor-performance' | 'inventory'>
type ReportResult =
  | LabelSeriesReport
  | AppointmentsReport
  | AdmissionsReport
  | OutstandingRow[]
  | DoctorPerformanceRow[]
  | InventoryRow[]

const TABLE_TABS: TableTab[] = ['outstanding', 'doctor-performance', 'inventory']

const PRESETS = [
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
]

function defaultRange(): DateRange {
  const today = new Date()
  return { from: format(subDays(today, 30), 'yyyy-MM-dd'), to: format(today, 'yyyy-MM-dd') }
}

function isTableTab(tab: ReportTab): tab is TableTab {
  return TABLE_TABS.includes(tab as TableTab)
}

function runReport(tab: ReportTab, range: ReportRange): Promise<ReportResult> {
  switch (tab) {
    case 'daily-patients':
      return reportApi.dailyPatients(range)
    case 'appointments':
      return reportApi.appointments(range)
    case 'revenue':
      return reportApi.revenue(range)
    case 'pharmacy-sales':
      return reportApi.pharmacySales(range)
    case 'lab-tests':
      return reportApi.labTests(range)
    case 'admissions':
      return reportApi.admissions(range)
    case 'outstanding':
      return reportApi.outstanding(range)
    case 'doctor-performance':
      return reportApi.doctorPerformance(range)
    default:
      return reportApi.inventory(range)
  }
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0)
}

function seriesRows(report: LabelSeriesReport) {
  return report.labels.map((label, index) => ({ label, value: report.series[index] ?? 0 }))
}

function escapeCell(cell: string | number): string {
  const text = String(cell)
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function buildCsv(headers: string[], rows: (string | number)[][]): string {
  return [headers, ...rows].map((row) => row.map(escapeCell).join(',')).join('\r\n')
}

function tableCsv(tab: TableTab, data: ReportResult): string {
  if (tab === 'outstanding') {
    const rows = (data as OutstandingRow[]) ?? []
    return buildCsv(
      ['invoice_number', 'patient', 'total', 'paid_amount', 'balance', 'created_at'],
      rows.map((row) => [
        row.invoice_number,
        row.patient,
        row.total,
        row.paid_amount,
        row.balance,
        row.created_at,
      ]),
    )
  }
  if (tab === 'doctor-performance') {
    const rows = (data as DoctorPerformanceRow[]) ?? []
    return buildCsv(
      ['doctor', 'appointments', 'visits', 'prescriptions'],
      rows.map((row) => [row.doctor, row.appointments, row.visits, row.prescriptions]),
    )
  }
  const rows = (data as InventoryRow[]) ?? []
  return buildCsv(
    ['medicine', 'stock', 'reorder_level', 'expired', 'expiring'],
    rows.map((row) => [row.medicine, row.stock, row.reorder_level, row.expired, row.expiring]),
  )
}

const OUTSTANDING_COLUMNS: Column<OutstandingRow>[] = [
  { key: 'invoice_number', header: 'Invoice #', render: (row) => <span className="font-semibold">{row.invoice_number}</span> },
  { key: 'patient', header: 'Patient', render: (row) => row.patient },
  { key: 'created_at', header: 'Issued', hideBelow: 'sm', render: (row) => <span className="text-muted-foreground">{formatDate(row.created_at)}</span> },
  { key: 'total', header: 'Total', align: 'right', render: (row) => formatCurrency(row.total) },
  { key: 'paid_amount', header: 'Paid', align: 'right', hideBelow: 'md', render: (row) => <span className="text-muted-foreground">{formatCurrency(row.paid_amount)}</span> },
  {
    key: 'balance',
    header: 'Balance',
    align: 'right',
    render: (row) => <span className="font-semibold text-destructive">{formatCurrency(row.balance)}</span>,
  },
]

const DOCTOR_COLUMNS: Column<DoctorPerformanceRow>[] = [
  { key: 'doctor', header: 'Doctor', render: (row) => <span className="font-medium text-foreground">{row.doctor}</span> },
  { key: 'appointments', header: 'Appointments', align: 'right', render: (row) => row.appointments },
  { key: 'visits', header: 'Visits', align: 'right', render: (row) => row.visits },
  { key: 'prescriptions', header: 'Prescriptions', align: 'right', render: (row) => row.prescriptions },
]

const INVENTORY_COLUMNS: Column<InventoryRow>[] = [
  { key: 'medicine', header: 'Medicine', render: (row) => <span className="font-medium text-foreground">{row.medicine}</span> },
  { key: 'stock', header: 'Stock', align: 'right', render: (row) => row.stock },
  {
    key: 'reorder_level',
    header: 'Reorder at',
    align: 'right',
    hideBelow: 'sm',
    render: (row) => <span className="text-muted-foreground">{row.reorder_level}</span>,
  },
  {
    key: 'expired',
    header: 'Expired batches',
    align: 'right',
    hideBelow: 'md',
    render: (row) => (row.expired > 0 ? <span className="font-semibold text-destructive">{row.expired}</span> : '0'),
  },
  {
    key: 'expiring',
    header: 'Expiring soon',
    align: 'right',
    render: (row) => (row.expiring > 0 ? <span className="font-semibold text-amber-600 dark:text-amber-400">{row.expiring}</span> : '0'),
  },
]

export default function ReportsPage() {
  const toast = useToast()
  const [range, setRange] = useState<DateRange>(defaultRange)
  const [tab, setTab] = useState<ReportTab>('daily-patients')
  const [downloading, setDownloading] = useState(false)

  const requestRange: ReportRange = useMemo(() => ({ from: range.from, to: range.to }), [range])

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ['reports', tab, requestRange],
    queryFn: () => runReport(tab, requestRange),
    placeholderData: keepPreviousData,
  })

  const activeTab = TABS.find((item) => item.value === tab)!
  const table = isTableTab(tab)

  const download = async () => {
    setDownloading(true)
    try {
      const csv = isTableTab(tab)
        ? tableCsv(tab, data ?? [])
        : await reportApi.exportCsv(tab as ReportType, requestRange)
      csvToDownload(csv, `report-${tab}-${range.from}-${range.to}`)
      toast.success('Download started', `${activeTab.label} exported as CSV`)
    } catch (caught) {
      toast.error('Unable to download report', getErrorMessage(caught))
    } finally {
      setDownloading(false)
    }
  }

  const renderCharts = (): { stats: ReactNode[]; charts: ReactNode[] } => {
    const stats: ReactNode[] = []
    const charts: ReactNode[] = []
    const report = data as LabelSeriesReport

    if (tab === 'daily-patients') {
      stats.push(
        <StatCard key="total" label="Patients registered" value={sum(report.series).toLocaleString('en-US')} icon={<Users size={18} />} />,
      )
      charts.push(
        <LineChartCard
          key="chart"
          title="Daily patients"
          subtitle={`${range.from} â†’ ${range.to}`}
          data={seriesRows(report)}
          xKey="label"
          yKeys={[{ key: 'value', label: 'Patients' }]}
        />,
      )
    }

    if (tab === 'appointments') {
      const appointmentReport = data as AppointmentsReport
      stats.push(
        <StatCard key="total" label="Appointments booked" value={sum(appointmentReport.series).toLocaleString('en-US')} icon={<CalendarDays size={18} />} />,
      )
      charts.push(
        <BarChartCard
          key="bar"
          title="Appointments per day"
          data={seriesRows(appointmentReport)}
          xKey="label"
          yKeys={[{ key: 'value', label: 'Appointments' }]}
        />,
      )
      if (appointmentReport.by_status?.length) {
        charts.push(
          <PieChartCard
            key="pie"
            title="By status"
            data={appointmentReport.by_status.map((row) => ({ status: row.status, count: row.count }))}
            xKey="status"
            yKeys={[{ key: 'count', label: 'Appointments' }]}
            centerLabel={`${sum(appointmentReport.by_status.map((row) => row.count))} total`}
          />,
        )
      }
    }

    if (tab === 'revenue' || tab === 'pharmacy-sales') {
      const isRevenue = tab === 'revenue'
      stats.push(
        <StatCard
          key="total"
          label={isRevenue ? 'Revenue collected' : 'Pharmacy sales'}
          value={formatCurrency(report.total ?? sum(report.series))}
          icon={<Wallet size={18} />}
        />,
      )
      charts.push(
        <AreaChartCard
          key="chart"
          title={isRevenue ? 'Revenue per day' : 'Pharmacy sales per day'}
          subtitle={`${range.from} â†’ ${range.to}`}
          data={seriesRows(report)}
          xKey="label"
          yKeys={[{ key: 'value', label: isRevenue ? 'Revenue' : 'Sales' }]}
        />,
      )
    }

    if (tab === 'lab-tests') {
      stats.push(
        <StatCard key="total" label="Tests completed" value={(report.total ?? sum(report.series)).toLocaleString('en-US')} icon={<FlaskConical size={18} />} />,
      )
      charts.push(
        <BarChartCard
          key="chart"
          title="Tests by panel"
          subtitle="Completed results in the period"
          data={seriesRows(report)}
          xKey="label"
          yKeys={[{ key: 'value', label: 'Tests' }]}
        />,
      )
    }

    if (tab === 'admissions') {
      const admissions = data as AdmissionsReport
      const admitted = sum(admissions.admitted ?? [])
      const discharged = sum(admissions.discharged ?? [])
      stats.push(
        <StatCard key="admitted" label="Admitted" value={admitted.toLocaleString('en-US')} icon={<Hospital size={18} />} />,
        <StatCard key="discharged" label="Discharged" value={discharged.toLocaleString('en-US')} icon={<Hospital size={18} />} tone="success" />,
      )
      charts.push(
        <AreaChartCard
          key="chart"
          title="Admissions vs discharges"
          subtitle={`${range.from} â†’ ${range.to}`}
          data={admissions.labels.map((label, index) => ({
            label,
            admitted: admissions.admitted[index] ?? 0,
            discharged: admissions.discharged[index] ?? 0,
          }))}
          xKey="label"
          yKeys={[
            { key: 'admitted', label: 'Admitted' },
            { key: 'discharged', label: 'Discharged' },
          ]}
        />,
      )
    }

    return { stats, charts }
  }

  const renderTable = (): ReactNode => {
    if (tab === 'outstanding') {
      const rows = (data as OutstandingRow[]) ?? []
      const balance = sum(rows.map((row) => row.balance))
      return (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard label="Outstanding balance" value={formatCurrency(balance)} icon={<Receipt size={18} />} tone="danger" />
            <StatCard label="Invoices unpaid" value={rows.length.toLocaleString('en-US')} icon={<Receipt size={18} />} />
          </div>
          <Table
            columns={OUTSTANDING_COLUMNS}
            data={rows}
            empty={<EmptyState icon={<Receipt size={22} />} title="Nothing outstanding" description="Every invoice in this period is settled." />}
          />
        </div>
      )
    }

    if (tab === 'doctor-performance') {
      const rows = (data as DoctorPerformanceRow[]) ?? []
      return (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard label="Doctors active" value={rows.length.toLocaleString('en-US')} icon={<Stethoscope size={18} />} />
            <StatCard label="Appointments" value={sum(rows.map((row) => row.appointments)).toLocaleString('en-US')} icon={<CalendarDays size={18} />} />
            <StatCard label="Prescriptions" value={sum(rows.map((row) => row.prescriptions)).toLocaleString('en-US')} icon={<Pill size={18} />} />
          </div>
          <Table
            columns={DOCTOR_COLUMNS}
            data={rows}
            empty={<EmptyState icon={<Stethoscope size={22} />} title="No activity" description="No doctor activity in this period." />}
          />
        </div>
      )
    }

    const rows = (data as InventoryRow[]) ?? []
    const lowStock = rows.filter((row) => row.stock <= row.reorder_level).length
    const expiring = sum(rows.map((row) => row.expired + row.expiring))
    return (
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard label="Medicines tracked" value={rows.length.toLocaleString('en-US')} icon={<Boxes size={18} />} />
          <StatCard label="Below reorder level" value={lowStock.toLocaleString('en-US')} icon={<Pill size={18} />} tone={lowStock > 0 ? 'warning' : 'default'} />
          <StatCard label="Expired / expiring" value={expiring.toLocaleString('en-US')} icon={<CalendarDays size={18} />} tone={expiring > 0 ? 'danger' : 'default'} />
        </div>
        <Table
          columns={INVENTORY_COLUMNS}
          data={rows}
          empty={<EmptyState icon={<Boxes size={22} />} title="Inventory is empty" description="Add medicines to see stock health here." />}
        />
      </div>
    )
  }

  const { stats, charts } = renderCharts()
  const report = data as LabelSeriesReport | undefined
  const appointments = tab === 'appointments' ? (data as AppointmentsReport | undefined) : undefined
  const hasChartRows = appointments
    ? (appointments.labels?.length ?? 0) > 0 || (appointments.by_status?.length ?? 0) > 0
    : (report?.labels?.length ?? 0) > 0

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        subtitle="Operational and financial insight for a chosen period"
        actions={
          <Button icon={<Download size={16} />} loading={downloading} onClick={() => void download()}>
            Download CSV
          </Button>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <DateRangePicker value={range} onChange={setRange} presets={PRESETS} />
        <span className="text-xs text-muted-foreground">
          {format(parseISO(range.from), 'dd MMM yyyy')} â€“ {format(parseISO(range.to), 'dd MMM yyyy')}
        </span>
      </div>

      <Tabs items={[...TABS]} value={tab} onChange={(value) => setTab(value as ReportTab)} />

      {isLoading ? (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-3">
            {[0, 1, 2].map((row) => (
              <Skeleton key={row} className="h-24 w-full rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-80 w-full rounded-xl" />
        </div>
      ) : isError ? (
        <EmptyState
          title="Unable to load this report"
          description="Check your permissions and try again."
          action={
            <Button size="sm" onClick={() => void refetch()}>
              Try again
            </Button>
          }
        />
      ) : table ? (
        renderTable()
      ) : (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{stats}</div>
          {hasChartRows ? (
            <div className={charts.length > 1 ? 'grid gap-5 lg:grid-cols-2' : 'grid gap-5'}>{charts}</div>
          ) : (
            <EmptyState
              title="No data for this period"
              description="Widen the date range to include more activity."
            />
          )}
        </div>
      )}

      {isFetching && !isLoading && (
        <p className="text-center text-xs text-muted-foreground">Refreshing reportâ€¦</p>
      )}
    </div>
  )
}
