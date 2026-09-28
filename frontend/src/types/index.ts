export interface PaginationMeta {
  current_page: number
  last_page: number
  per_page: number
  total: number
}

export interface Paginated<T> {
  data: T[]
  meta: PaginationMeta
}

export interface ApiResponse<T> {
  data: T
  meta?: PaginationMeta
}

export type Gender = 'male' | 'female' | 'other'

export interface Patient {
  id: number
  patient_number: string
  first_name: string
  last_name: string
  full_name: string
  gender: Gender
  date_of_birth: string
  age: number
  phone: string
  email: string | null
  address: string
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  blood_group: string | null
  allergies: string | null
  medical_history: string | null
  photo_url: string | null
  user_id: number | null
  registered_by: number | null
  created_at: string
}

export type PatientInput = Omit<
  Patient,
  'id' | 'patient_number' | 'full_name' | 'age' | 'photo_url' | 'user_id' | 'registered_by' | 'created_at'
>

export interface PatientSummary {
  total: number
  male: number
  female: number
  today: number
}

export interface PatientDocument {
  id: number
  name: string
  file_name: string
  mime_type: string
  size: number
  url: string
  created_at: string
}

export interface Department {
  id: number
  name: string
  code: string
  description: string | null
  doctors_count: number
}

export interface DoctorSchedule {
  id?: number
  day_of_week: number
  start_time: string
  end_time: string
  slot_minutes: number
  is_active: boolean
}

export interface Doctor {
  id: number
  user_id: number | null
  department_id: number | null
  department: { id: number; name: string } | null
  name: string
  email: string | null
  phone: string | null
  license_number: string
  specialization: string
  consultation_fee: number
  bio: string | null
  is_active: boolean
  schedules: DoctorSchedule[]
  appointments_today: number
  patients_count: number
}

export type AppointmentType = 'opd' | 'follow_up' | 'emergency' | 'consultation'

export type AppointmentStatus =
  | 'pending'
  | 'confirmed'
  | 'waiting'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show'

export interface Appointment {
  id: number
  appointment_number: string
  patient: Patient
  doctor: Doctor
  department: Department | null
  appointment_date: string
  start_time: string
  end_time: string
  type: AppointmentType
  status: AppointmentStatus
  queue_number: number | null
  reason: string | null
  notes: string | null
  cancelled_reason: string | null
  visit_id: number | null
  created_at: string
}

export interface AppointmentSlot {
  start_time: string
  available: boolean
}

export type VisitType = 'opd' | 'emergency' | 'follow_up'

export type VisitStatus = 'in_progress' | 'completed'

export interface Visit {
  id: number
  visit_number: string
  patient: Patient
  doctor: Doctor
  appointment_id: number | null
  department_id: number | null
  visit_date: string
  type: VisitType
  chief_complaint: string | null
  symptoms: string | null
  diagnosis: string | null
  treatment: string | null
  medical_notes: string | null
  follow_up_date: string | null
  status: VisitStatus
  created_at: string
  vital_signs: VitalSign[]
  prescriptions: Prescription[]
  lab_requests: LabRequest[]
  notes: MedicalNote[]
}

export interface VitalSign {
  id: number
  visit_id: number | null
  patient_id: number
  recorded_at: string
  bp_systolic: number | null
  bp_diastolic: number | null
  temperature: number | null
  pulse: number | null
  oxygen_saturation: number | null
  weight: number | null
  height: number | null
  respiratory_rate: number | null
  notes: string | null
  recorded_by_name: string
}

export type VitalSignInput = Omit<VitalSign, 'id' | 'visit_id' | 'patient_id' | 'recorded_at' | 'recorded_by_name'>

export type NoteType = 'progress' | 'nursing' | 'general'

export interface MedicalNote {
  id: number
  note_type: NoteType
  content: string
  author_name: string
  created_at: string
}

export type PrescriptionStatus = 'pending' | 'processing' | 'dispensed' | 'cancelled'

export interface PrescriptionItem {
  id?: number
  medicine_id: number
  medicine_name: string
  dosage: string
  frequency: string
  duration: string
  quantity: number
  instructions: string | null
}

export interface Prescription {
  id: number
  prescription_number: string
  patient: Patient
  doctor: Doctor
  visit_id: number | null
  diagnosis: string | null
  status: PrescriptionStatus
  notes: string | null
  dispensed_by_name: string | null
  dispensed_at: string | null
  created_at: string
  items: PrescriptionItem[]
}

export interface MedicineBatch {
  id: number
  batch_number: string
  expiry_date: string
  quantity_available: number
  purchase_price: number
}

export interface Medicine {
  id: number
  name: string
  generic_name: string | null
  category: { id: number; name: string } | null
  supplier: { id: number; name: string } | null
  form: string
  strength: string | null
  unit: string
  stock_quantity: number
  reorder_level: number
  selling_price: number
  is_active: boolean
  expired_batches: number
  expiring_soon: number
  batches: MedicineBatch[]
}

export interface MedicineInput {
  name: string
  generic_name?: string | null
  category_id?: number | null
  supplier_id?: number | null
  form: string
  strength?: string | null
  unit: string
  stock_quantity?: number
  reorder_level?: number
  selling_price: number
  is_active?: boolean
}

export interface MedicineCategory {
  id: number
  name: string
  description: string | null
}

export interface Supplier {
  id: number
  name: string
  contact_person: string | null
  phone: string | null
  email: string | null
  address: string | null
}

export type PharmacyTransactionType =
  | 'purchase'
  | 'dispense'
  | 'sale'
  | 'adjustment'
  | 'expired'
  | 'return'

export interface PharmacyTransaction {
  id: number
  medicine_name: string
  type: PharmacyTransactionType
  quantity: number
  unit_price: number
  total_price: number
  reference: string | null
  performed_by_name: string
  created_at: string
}

export interface PharmacyAlerts {
  low_stock: Medicine[]
  expired: Medicine[]
  expiring_soon: Medicine[]
}

export interface LabTest {
  id: number
  name: string
  code: string
  category: string
  price: number
  description: string | null
  is_active: boolean
}

export type LabPriority = 'routine' | 'urgent'

export type LabRequestStatus = 'requested' | 'processing' | 'completed' | 'cancelled'

export type LabResultStatus = 'pending' | 'processing' | 'completed'

export interface LabResult {
  id?: number
  lab_test_id: number
  test_name: string
  test_code: string
  status: LabResultStatus
  result_value: string | null
  reference_range: string | null
  unit: string | null
  notes: string | null
  performed_at: string | null
}

export interface LabRequest {
  id: number
  request_number: string
  patient: Patient
  doctor: Doctor | null
  priority: LabPriority
  status: LabRequestStatus
  notes: string | null
  requested_at: string
  created_at: string
  results: LabResult[]
}

export type BedStatus = 'available' | 'occupied' | 'maintenance' | 'reserved'

export interface Ward {
  id: number
  name: string
  code: string
  floor: string | null
  type: string
  rooms_count: number
  beds_count: number
  occupied_beds: number
}

export interface Room {
  id: number
  ward_id: number
  room_number: string
  type: string
  tariff: number
  capacity: number
  beds: Bed[]
}

export interface Bed {
  id: number
  room_id: number
  bed_number: string
  status: BedStatus
  admission?: Admission
}

export type AdmissionStatus = 'admitted' | 'transferred' | 'discharged'

export interface Admission {
  id: number
  admission_number: string
  patient: Patient
  ward: { id: number; name: string }
  room: { id: number; room_number: string }
  bed: { id: number; bed_number: string }
  consultant: Doctor | null
  diagnosis: string | null
  admitted_at: string
  discharged_at: string | null
  outcome: string | null
  discharge_summary: string | null
  status: AdmissionStatus
  admitted_by_name: string
  total_days: number
}

export interface BedAvailability {
  total: number
  occupied: number
  available: number
}

export interface Service {
  id: number
  name: string
  code: string
  category: string
  price: number
  is_active: boolean
}

export type InvoiceStatus = 'unpaid' | 'partial' | 'paid' | 'cancelled'

export type InvoiceItemType = 'consultation' | 'lab' | 'medicine' | 'room' | 'procedure' | 'other'

export interface InvoiceItem {
  id?: number
  service_id: number | null
  description: string
  item_type: InvoiceItemType
  quantity: number
  unit_price: number
  total: number
}

export type PaymentMethod = 'cash' | 'card' | 'bank_transfer' | 'insurance' | 'mobile_money'

export type PaymentStatus = 'completed' | 'pending' | 'failed' | 'refunded'

export interface Payment {
  id: number
  payment_number: string
  amount: number
  method: PaymentMethod
  reference: string | null
  status: PaymentStatus
  paid_at: string
  received_by_name: string
}

export interface Invoice {
  id: number
  invoice_number: string
  patient: Patient
  sub_total: number
  discount: number
  tax: number
  total: number
  paid_amount: number
  balance: number
  status: InvoiceStatus
  insurance_covered: number
  notes: string | null
  issued_by_name: string
  created_at: string
  items: InvoiceItem[]
  payments: Payment[]
}

export interface BillingSummary {
  today_collected: number
  month_collected: number
  outstanding: number
  invoices_today: number
  payments_today: number
}

export interface InsuranceCompany {
  id: number
  name: string
  code: string
  phone: string | null
  email: string | null
  address: string | null
  is_active: boolean
  patients_count: number
}

export interface PatientInsurance {
  id: number
  patient: Patient
  company: InsuranceCompany
  policy_number: string
  holder_name: string
  coverage_percent: number
  coverage_limit: number | null
  start_date: string
  end_date: string | null
  is_active: boolean
}

export type InsuranceClaimStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'paid'

export interface InsuranceClaim {
  id: number
  claim_number: string
  invoice: Invoice
  company: InsuranceCompany
  amount: number
  approved_amount: number | null
  status: InsuranceClaimStatus
  submitted_at: string | null
  decided_at: string | null
  notes: string | null
}

export interface Role {
  id: number
  name: string
  label: string
  description: string | null
  permissions: string[]
  users_count: number
}

export interface Permission {
  id: number
  name: string
  label: string
  group: string
}

export interface User {
  id: number
  name: string
  email: string
  phone: string | null
  role: Role
  patient_id: number | null
  doctor_id: number | null
  is_active: boolean
  last_login_at: string | null
  created_at: string
}

export interface UserInput {
  name: string
  email: string
  password: string
  phone?: string
  role_id: number
  is_active?: boolean
}

export interface LoginResponse {
  token: string
  user: User
}

export interface NotificationPayload {
  title: string
  body: string
  url?: string
}

export interface Notification {
  id: number
  type: string
  data: NotificationPayload
  read_at: string | null
  created_at: string
}

export interface AuditLog {
  id: number
  user: string | null
  action: string
  description: string
  auditable_type: string | null
  auditable_id: number | null
  ip_address: string | null
  created_at: string
}

export interface DashboardStat {
  label: string
  value: number | string
  icon: string
  trend?: string
}

export interface DashboardData {
  stats: DashboardStat[]
  revenue: { today: number; month: number; outstanding: number; currency: string }
  recent_appointments: Appointment[]
  recent_patients: Patient[]
  low_stock_medicines: Medicine[]
  pending_lab_results: LabRequest[]
  admissions: { date: string; count: number }[]
  appointments_by_status: { status: string; count: number }[]
  upcoming?: Appointment[]
  waiting?: Appointment[]
}

export interface ReportPoint {
  label: string
  value: number
}

export interface LabelSeriesReport {
  labels: string[]
  series: number[]
  total?: number
}

export interface Settings {
  hospital_name: string
  address: string
  phone: string
  email: string
  currency: string
  logo: string | null
  [key: string]: unknown
}
