import client, { unwrap } from './client'
import type { LabelSeriesReport } from '@/types'

export type ReportType =
  | 'daily-patients'
  | 'appointments'
  | 'revenue'
  | 'pharmacy-sales'
  | 'lab-tests'
  | 'admissions'

export interface ReportRange {
  from?: string
  to?: string
}

export interface OutstandingRow {
  invoice_number: string
  patient: string
  total: number
  paid_amount: number
  balance: number
  created_at: string
}

export interface DoctorPerformanceRow {
  doctor: string
  appointments: number
  visits: number
  prescriptions: number
}

export interface InventoryRow {
  medicine: string
  stock: number
  reorder_level: number
  expired: number
  expiring: number
}

export interface AdmissionsReport extends LabelSeriesReport {
  admitted: number[]
  discharged: number[]
}

export interface AppointmentsReport extends LabelSeriesReport {
  by_status: { status: string; count: number }[]
}

export const reportApi = {
  async dailyPatients(range: ReportRange = {}): Promise<LabelSeriesReport> {
    const res = await client.get('/reports/daily-patients', { params: range })
    return unwrap<LabelSeriesReport>(res)
  },

  async appointments(range: ReportRange = {}): Promise<AppointmentsReport> {
    const res = await client.get('/reports/appointments', { params: range })
    return unwrap<AppointmentsReport>(res)
  },

  async revenue(range: ReportRange = {}): Promise<LabelSeriesReport> {
    const res = await client.get('/reports/revenue', { params: range })
    return unwrap<LabelSeriesReport>(res)
  },

  async pharmacySales(range: ReportRange = {}): Promise<LabelSeriesReport> {
    const res = await client.get('/reports/pharmacy-sales', { params: range })
    return unwrap<LabelSeriesReport>(res)
  },

  async labTests(range: ReportRange = {}): Promise<LabelSeriesReport> {
    const res = await client.get('/reports/lab-tests', { params: range })
    return unwrap<LabelSeriesReport>(res)
  },

  async admissions(range: ReportRange = {}): Promise<AdmissionsReport> {
    const res = await client.get('/reports/admissions', { params: range })
    return unwrap<AdmissionsReport>(res)
  },

  async outstanding(range: ReportRange = {}): Promise<OutstandingRow[]> {
    const res = await client.get('/reports/outstanding', { params: range })
    return unwrap<OutstandingRow[]>(res)
  },

  async doctorPerformance(range: ReportRange = {}): Promise<DoctorPerformanceRow[]> {
    const res = await client.get('/reports/doctor-performance', { params: range })
    return unwrap<DoctorPerformanceRow[]>(res)
  },

  async inventory(range: ReportRange = {}): Promise<InventoryRow[]> {
    const res = await client.get('/reports/inventory', { params: range })
    return unwrap<InventoryRow[]>(res)
  },

  /** `?export=csv` returns a CSV document body for the given report path. */
  async exportCsv(report: ReportType, range: ReportRange = {}): Promise<string> {
    const res = await client.get(`/reports/${report}`, {
      params: { ...range, export: 'csv' },
      responseType: 'text',
      transformResponse: [(data: unknown) => data],
    })
    return typeof res.data === 'string' ? res.data : String(res.data ?? '')
  },
}
