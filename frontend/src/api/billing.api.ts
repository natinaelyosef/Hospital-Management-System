import client, { unwrap, unwrapPaginated } from './client'
import type { BillingSummary, Invoice, Paginated, Payment, PaymentMethod } from '@/types'
import { miscApi } from './misc.api'

export interface InvoiceListQuery {
  page?: number
  per_page?: number
  status?: string
  search?: string
  date?: string
  patient_id?: number
}

export interface InvoiceInput {
  patient_id: number
  visit_id?: number
  admission_id?: number
  discount?: number
  tax?: number
  notes?: string
  items: { service_id?: number; description: string; item_type: string; quantity: number; unit_price: number }[]
}

export interface PaymentInput {
  amount: number
  method: PaymentMethod
  reference?: string
}

/**
 * Service CRUD lives in `miscApi.services` (contract groups it with misc endpoints);
 * it is re-exposed here so the billing module has a single obvious entry point.
 */
export const billingApi = {
  services: miscApi.services,

  async invoices(query: InvoiceListQuery = {}): Promise<Paginated<Invoice>> {
    const res = await client.get('/invoices', { params: query })
    return unwrapPaginated<Invoice>(res)
  },

  async invoice(id: number): Promise<Invoice> {
    const res = await client.get(`/invoices/${id}`)
    return unwrap<Invoice>(res)
  },

  async createInvoice(payload: InvoiceInput): Promise<Invoice> {
    const res = await client.post('/invoices', payload)
    return unwrap<Invoice>(res)
  },

  async updateInvoice(id: number, payload: Partial<InvoiceInput>): Promise<Invoice> {
    const res = await client.put(`/invoices/${id}`, payload)
    return unwrap<Invoice>(res)
  },

  async addPayment(id: number, payload: PaymentInput): Promise<Payment> {
    const res = await client.post(`/invoices/${id}/payments`, payload)
    return unwrap<Payment>(res)
  },

  async invoicePdf(id: number): Promise<Blob> {
    const res = await client.get(`/invoices/${id}/pdf`, { responseType: 'blob' })
    return res.data as Blob
  },

  async summary(): Promise<BillingSummary> {
    const res = await client.get('/billing/summary')
    return unwrap<BillingSummary>(res)
  },
}
