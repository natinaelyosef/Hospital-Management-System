import client, { unwrap, unwrapPaginated } from './client'
import type {
  Medicine,
  MedicineCategory,
  MedicineInput,
  MedicineBatch,
  Paginated,
  PharmacyAlerts,
  PharmacyTransaction,
  Supplier,
} from '@/types'

export interface MedicineListQuery {
  page?: number
  per_page?: number
  search?: string
  category_id?: number
  low_stock?: number
  expiring_days?: number
}

export interface BatchInput {
  batch_number: string
  expiry_date: string
  quantity: number
  purchase_price: number
}

export interface TransactionListQuery {
  page?: number
  per_page?: number
  type?: string
  search?: string
}

export const pharmacyApi = {
  async medicines(query: MedicineListQuery = {}): Promise<Paginated<Medicine>> {
    const res = await client.get('/medicines', { params: query })
    return unwrapPaginated<Medicine>(res)
  },

  async medicine(id: number): Promise<Medicine> {
    const res = await client.get(`/medicines/${id}`)
    return unwrap<Medicine>(res)
  },

  async createMedicine(payload: MedicineInput): Promise<Medicine> {
    const res = await client.post('/medicines', payload)
    return unwrap<Medicine>(res)
  },

  async updateMedicine(id: number, payload: Partial<MedicineInput>): Promise<Medicine> {
    const res = await client.put(`/medicines/${id}`, payload)
    return unwrap<Medicine>(res)
  },

  async removeMedicine(id: number): Promise<void> {
    await client.delete(`/medicines/${id}`)
  },

  async addBatch(medicineId: number, payload: BatchInput): Promise<MedicineBatch> {
    const res = await client.post(`/medicines/${medicineId}/batches`, payload)
    return unwrap<MedicineBatch>(res)
  },

  async categories(): Promise<MedicineCategory[]> {
    const res = await client.get('/medicine-categories')
    return unwrap<MedicineCategory[]>(res)
  },

  async createCategory(payload: { name: string; description?: string }): Promise<MedicineCategory> {
    const res = await client.post('/medicine-categories', payload)
    return unwrap<MedicineCategory>(res)
  },

  async updateCategory(id: number, payload: { name?: string; description?: string }): Promise<MedicineCategory> {
    const res = await client.put(`/medicine-categories/${id}`, payload)
    return unwrap<MedicineCategory>(res)
  },

  async removeCategory(id: number): Promise<void> {
    await client.delete(`/medicine-categories/${id}`)
  },

  async suppliers(): Promise<Supplier[]> {
    const res = await client.get('/suppliers')
    return unwrap<Supplier[]>(res)
  },

  async createSupplier(payload: Partial<Supplier>): Promise<Supplier> {
    const res = await client.post('/suppliers', payload)
    return unwrap<Supplier>(res)
  },

  async updateSupplier(id: number, payload: Partial<Supplier>): Promise<Supplier> {
    const res = await client.put(`/suppliers/${id}`, payload)
    return unwrap<Supplier>(res)
  },

  async removeSupplier(id: number): Promise<void> {
    await client.delete(`/suppliers/${id}`)
  },

  async transactions(query: TransactionListQuery = {}): Promise<Paginated<PharmacyTransaction>> {
    const res = await client.get('/pharmacy/transactions', { params: query })
    return unwrapPaginated<PharmacyTransaction>(res)
  },

  async alerts(): Promise<PharmacyAlerts> {
    const res = await client.get('/pharmacy/alerts')
    return unwrap<PharmacyAlerts>(res)
  },
}
