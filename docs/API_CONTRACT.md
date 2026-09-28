# MediCare HMS — API Contract (single source of truth)

Base URL: `http://127.0.0.1:8000/api` (frontend dev server proxies `/api` here).

## Conventions

- All authenticated endpoints require header `Authorization: Bearer <token>` (Laravel Sanctum).
- JSON only. Every success payload wraps the primary payload in `data`.
  - Single resource: `{ "data": { ... } }`
  - List (paginated): `{ "data": [ ... ], "meta": { "current_page": 1, "last_page": 3, "per_page": 15, "total": 42 } }`
  - List (lookup, unpaged): `{ "data": [ ... ] }`
- Errors: `422` `{ "message": "...", "errors": { "field": ["..."] } }`; `401` `{ "message": "Unauthenticated." }`; `403` `{ "message": "This action is unauthorized." }`; `404` `{ "message": "Not found." }`.
- Pagination query params: `?page=1&per_page=15`, search `?search=`, plus module-specific filters (documented per module).
- Timestamps are ISO-8601 strings (`YYYY-MM-DDTHH:mm:ss.000000Z`); dates are `YYYY-MM-DD`.

## Auth (`/api/auth`)

| Method | Path | Body | Response `data` |
|---|---|---|---|
| POST | `/auth/login` | `{ email, password }` | `{ token, user }` |
| POST | `/auth/logout` | – | `{ message }` |
| GET | `/auth/me` | – | `{ user }` |
| PUT | `/auth/profile` | `{ name?, phone?, email? }` | `{ user }` |
| POST | `/auth/password` | `{ current_password, password, password_confirmation }` | `{ message }` |

### User object

```ts
{
  id: number; name: string; email: string; phone: string | null;
  role: { id: number; name: string; label: string; permissions: string[] };
  patient_id: number | null;   // set when the user is a Patient-portal user
  doctor_id: number | null;    // set when the user is a Doctor
  is_active: boolean; last_login_at: string | null; created_at: string;
}
```

Permission strings are dot-notated, e.g. `patients.view`, `appointments.create`, `prescriptions.dispense`.

## Dashboard (`/api/dashboard`)

`GET /dashboard` → role-aware object. Common keys always present when the role has access:

```ts
{
  stats: { label: string; value: number|string; icon: string; trend?: string }[];
  revenue: { today: number; month: number; outstanding: number; currency: "ETB" };
  recent_appointments: Appointment[];
  recent_patients: Patient[];
  low_stock_medicines: Medicine[];
  pending_lab_results: LabRequest[];
  admissions: { date: string; count: number }[];   // last 7 days
  appointments_by_status: { status: string; count: number }[];
  upcoming: Appointment[];                          // doctor role
  waiting: Appointment[];                           // doctor/nurse role
}
```

## Notifications & audit

- `GET /notifications` → paginated `{ id, type, data: {title, body, url?}, read_at, created_at }`
- `POST /notifications/{id}/read`, `POST /notifications/read-all`, `GET /notifications/unread-count` → `{ count }`
- `GET /audit-logs` (perm `audit.view`) → paginated `{ id, user, action, description, auditable_type, auditable_id, ip_address, created_at }`, filters `?search=&action=`
- `GET /reports/...`, `GET /settings`, `PUT /settings` — see Reports/Settings below.

## Patients (`/api/patients`, perm `patients.*`)

Query: `?search=` (name / patient number / phone), `?gender=`, `?blood_group=`.

```ts
interface Patient {
  id: number; patient_number: string; first_name: string; last_name: string;
  full_name: string; gender: "male"|"female"|"other"; date_of_birth: string;
  age: number; phone: string; email: string|null; address: string;
  emergency_contact_name: string|null; emergency_contact_phone: string|null;
  blood_group: string|null; allergies: string|null; medical_history: string|null;
  photo_url: string|null; user_id: number|null; registered_by: number|null;
  created_at: string;
}
```

- `GET /patients`, `POST /patients`, `GET /patients/{id}`, `PUT /patients/{id}`, `DELETE /patients/{id}`
- `GET /patients/{id}/documents`, `POST /patients/{id}/documents` (multipart `file`), `DELETE /documents/{id}`
- `GET /patients/{id}/visits`, `GET /patients/{id}/appointments`, `GET /patients/{id}/prescriptions`, `GET /patients/{id}/invoices` → paginated
- `POST /patients/search` body `{ search }` → `{ data: Patient[] }` (limit 10, for pickers)
- `GET /patients/summary` → `{ total, male, female, today }`

Create/Edit body: all Patient fields except computed (`age`, `full_name`, `patient_number` generated server-side as `P-2026-0001`).

## Departments & Doctors

- `GET/POST/PUT/DELETE /departments` (perm `departments.view` / `departments.manage`) — `{ id, name, code, description, doctors_count }`
- `GET/POST/PUT/DELETE /doctors` (perm `doctors.*`) — query `?search=&department_id=`

```ts
interface Doctor {
  id: number; user_id: number|null; department_id: number|null;
  department: {id:number;name:string}|null; name: string; email: string|null;
  phone: string|null; license_number: string; specialization: string;
  consultation_fee: number; bio: string|null; is_active: boolean;
  schedules: DoctorSchedule[]; appointments_today: number; patients_count: number;
}
interface DoctorSchedule { id?: number; day_of_week: number; start_time: string; end_time: string; slot_minutes: number; is_active: boolean }
```

- `GET /doctors/available?date=YYYY-MM-DD&department_id=` → `{ data: Doctor[] }` (doctors working that weekday)
- `GET /doctors/{id}/schedule` / `PUT /doctors/{id}/schedule` (body: array of schedules)

## Appointments (`/api/appointments`, perm `appointments.*`)

Query: `?date=YYYY-MM-DD|today|week|month`, `?status=`, `?doctor_id=`, `?patient_id=`, `?search=`.

```ts
interface Appointment {
  id: number; appointment_number: string; patient: Patient; doctor: Doctor;
  department: Department|null; appointment_date: string; start_time: string; end_time: string;
  type: "opd"|"follow_up"|"emergency"|"consultation";
  status: "pending"|"confirmed"|"waiting"|"in_progress"|"completed"|"cancelled"|"no_show";
  queue_number: number|null; reason: string|null; notes: string|null;
  cancelled_reason: string|null; visit_id: number|null; created_at: string;
}
```

- `GET /appointments`, `POST /appointments`, `GET /appointments/{id}`, `PUT /appointments/{id}`, `DELETE /appointments/{id}`
- `PUT /appointments/{id}/status` body `{ status, cancelled_reason? }`
- `GET /appointments/today` → `{ data: Appointment[] }`
- `GET /appointments/slots?doctor_id=&date=` → `{ data: { start_time: string; available: boolean }[] }`
- `GET /appointments/queue?date=today` → `{ data: Appointment[] }` (waiting/in_progress, ordered by queue_number)
- `POST /appointments/{id}/call` (nurse/doctor) → sets `in_progress`, assigns `queue_number` if null

## Consultation / Visits (`/api/visits`, perm `consultation.*`)

```ts
interface Visit {
  id: number; visit_number: string; patient: Patient; doctor: Doctor;
  appointment_id: number|null; department_id: number|null; visit_date: string;
  type: "opd"|"emergency"|"follow_up";
  chief_complaint: string|null; symptoms: string|null; diagnosis: string|null;
  treatment: string|null; medical_notes: string|null; follow_up_date: string|null;
  status: "in_progress"|"completed"; created_at: string;
  vital_signs: VitalSign[]; prescriptions: Prescription[]; lab_requests: LabRequest[];
  medical_notes: MedicalNote[];
}
interface VitalSign {
  id: number; visit_id: number|null; patient_id: number;
  recorded_at: string; bp_systolic: number|null; bp_diastolic: number|null;
  temperature: number|null; pulse: number|null; oxygen_saturation: number|null;
  weight: number|null; height: number|null; respiratory_rate: number|null;
  notes: string|null; recorded_by_name: string;
}
interface MedicalNote { id: number; note_type: "progress"|"nursing"|"general"; content: string; author_name: string; created_at: string }
```

- `GET /visits` (`?patient_id=&doctor_id=&date=&status=&search=`), `POST /visits`, `GET /visits/{id}`, `PUT /visits/{id}`
- `POST /visits/{id}/complete`
- `GET /visits/{id}/vitals`, `POST /visits/{id}/vitals` — also `POST /patients/{id}/vitals` for nurses (no visit yet)
- `GET /patients/{id}/vitals` → paginated history
- `POST /visits/{id}/notes`, `GET /visits/{id}/notes`

## Prescriptions (`/api/prescriptions`, perm `prescriptions.*`)

```ts
interface Prescription {
  id: number; prescription_number: string; patient: Patient; doctor: Doctor;
  visit_id: number|null; diagnosis: string|null;
  status: "pending"|"processing"|"dispensed"|"cancelled";
  notes: string|null; dispensed_by_name: string|null; dispensed_at: string|null;
  created_at: string;
  items: { id?: number; medicine_id: number; medicine_name: string; dosage: string; frequency: string; duration: string; quantity: number; instructions: string|null }[];
}
```

- `GET /prescriptions` (`?status=&search=&patient_id=&doctor_id=`), `POST /prescriptions`, `GET /prescriptions/{id}`
- `PUT /prescriptions/{id}/status` body `{ status }` (`pending|processing|dispensed|cancelled` — `dispensed` decrements pharmacy stock)
- `GET /prescriptions/pending` → pharmacy queue

Create body: `{ patient_id, visit_id?, diagnosis?, notes?, items: [{ medicine_id, dosage, frequency, duration, quantity, instructions? }] }`

## Pharmacy (`/api/pharmacy`)

- `GET /medicines` (perm `pharmacy.view`; `?search=&category_id=&low_stock=1&expiring_days=90`)

```ts
interface Medicine {
  id: number; name: string; generic_name: string|null;
  category: {id:number;name:string}|null; supplier: {id:number;name:string}|null;
  form: string; strength: string|null; unit: string;
  stock_quantity: number; reorder_level: number; selling_price: number;
  is_active: boolean; expired_batches: number; expiring_soon: number;
  batches: MedicineBatch[];
}
interface MedicineBatch { id: number; batch_number: string; expiry_date: string; quantity_available: number; purchase_price: number }
```

- `GET/POST/PUT/DELETE /medicines`, `GET /medicines/{id}`
- `POST /medicines/{id}/batches` body `{ batch_number, expiry_date, quantity, purchase_price }` (stock in)
- `GET/POST/PUT/DELETE /medicine-categories`, `GET/POST/PUT/DELETE /suppliers`
- `GET /pharmacy/transactions` (`?type=&search=`) → paginated `{ id, medicine_name, type, quantity, unit_price, total_price, reference, performed_by_name, created_at }`
- `GET /pharmacy/alerts` → `{ low_stock: Medicine[], expired: Medicine[], expiring_soon: Medicine[] }`

Types: `purchase | dispense | sale | adjustment | expired | return`.

## Laboratory (`/api/laboratory`)

- `GET/POST/PUT/DELETE /lab-tests` (perm `lab.*`) → `{ id, name, code, category, price, description, is_active }`
- `GET /lab-requests` (`?status=&search=&date=&patient_id=`), `POST /lab-requests` body `{ patient_id, visit_id?, doctor_id?, priority, notes?, test_ids: number[] }`

```ts
interface LabRequest {
  id: number; request_number: string; patient: Patient; doctor: Doctor|null;
  priority: "routine"|"urgent"; status: "requested"|"processing"|"completed"|"cancelled";
  notes: string|null; requested_at: string; created_at: string;
  results: { id?: number; lab_test_id: number; test_name: string; test_code: string;
    status: "pending"|"processing"|"completed";
    result_value: string|null; reference_range: string|null; unit: string|null;
    notes: string|null; performed_at: string|null }[];
}
```

- `GET /lab-requests/{id}`, `POST /lab-requests/{id}/start`, `POST /lab-requests/{id}/results` body `{ results: [{ lab_test_id, result_value, reference_range?, unit?, notes? }] }` (marks completed), `POST /lab-requests/{id}/cancel`

## Wards / Inpatient (`/api/wards`)

- `GET/POST/PUT/DELETE /wards`, `GET/POST/PUT/DELETE /wards/{wardId}/rooms`, `GET/POST/PUT/DELETE /rooms/{roomId}/beds`
- Ward object: `{ id, name, code, floor, type, rooms_count, beds_count, occupied_beds }`
- Room: `{ id, ward_id, room_number, type, tariff, capacity, beds: Bed[] }`
- Bed: `{ id, room_id, bed_number, status: "available"|"occupied"|"maintenance"|"reserved", admission?: Admission }`

- `GET /admissions` (`?status=&search=&ward_id=`)

```ts
interface Admission {
  id: number; admission_number: string; patient: Patient;
  ward: {id:number;name:string}; room: {id:number;room_number:string}; bed: {id:number;bed_number:string};
  consultant: Doctor|null; diagnosis: string|null; admitted_at: string;
  discharged_at: string|null; outcome: string|null; discharge_summary: string|null;
  status: "admitted"|"transferred"|"discharged"; admitted_by_name: string;
  total_days: number;
}
```

- `POST /admissions` body `{ patient_id, ward_id, room_id, bed_id, consultant_id?, diagnosis? }`
- `GET /admissions/{id}`, `PUT /admissions/{id}/transfer` body `{ ward_id, room_id, bed_id }`
- `PUT /admissions/{id}/discharge` body `{ outcome, discharge_summary? }`
- `GET /wards/beds/availability` → `{ total, occupied, available }`

## Billing (`/api/billing`)

- `GET/POST/PUT/DELETE /services` (perm `billing.*`) → `{ id, name, code, category, price, is_active }`
- `GET /invoices` (`?status=&search=&date=&patient_id=`)

```ts
interface Invoice {
  id: number; invoice_number: string; patient: Patient; sub_total: number; discount: number;
  tax: number; total: number; paid_amount: number; balance: number;
  status: "unpaid"|"partial"|"paid"|"cancelled";
  insurance_covered: number; notes: string|null; issued_by_name: string;
  created_at: string; items: InvoiceItem[];
  payments: Payment[];
}
interface InvoiceItem { id?: number; service_id: number|null; description: string; item_type: "consultation"|"lab"|"medicine"|"room"|"procedure"|"other"; quantity: number; unit_price: number; total: number }
interface Payment { id: number; payment_number: string; amount: number; method: "cash"|"card"|"bank_transfer"|"insurance"|"mobile_money"; reference: string|null; status: "completed"|"pending"|"failed"|" refunded"; paid_at: string; received_by_name: string }
```

- `POST /invoices` body `{ patient_id, visit_id?, admission_id?, discount?, tax?, notes?, items: [{ service_id?, description, item_type, quantity, unit_price }] }`
- `GET /invoices/{id}`, `PUT /invoices/{id}`, `POST /invoices/{id}/payments` body `{ amount, method, reference? }`
- `GET /invoices/{id}/pdf` → PDF stream (browser download)
- `GET /billing/summary` → `{ today_collected, month_collected, outstanding, invoices_today, payments_today }`

## Insurance (`/api/insurance`)

- `GET/POST/PUT/DELETE /insurance-companies` → `{ id, name, code, phone, email, address, is_active, patients_count }`
- `GET/POST/PUT/DELETE /patient-insurances` (`?patient_id=&company_id=`) → `{ id, patient, company, policy_number, holder_name, coverage_percent, coverage_limit, start_date, end_date, is_active }`
- `GET/POST/PUT /insurance-claims` (`?status=`) → `{ id, claim_number, invoice, company, amount, approved_amount, status: "draft"|"submitted"|"approved"|"rejected"|"paid", submitted_at, decided_at, notes }`
- `PUT /insurance-claims/{id}/status` body `{ status, approved_amount?, notes? }`

## Reports (`/api/reports`, perm `reports.view`)

All accept `?from=YYYY-MM-DD&to=YYYY-MM-DD`:

- `GET /reports/daily-patients` → `{ labels: string[], series: number[] }`
- `GET /reports/appointments` → `{ labels, series, by_status: {status,count}[] }`
- `GET /reports/revenue` → `{ labels, series, total }`
- `GET /reports/pharmacy-sales` → `{ labels, series, total }`
- `GET /reports/lab-tests` → `{ labels, series, total }`
- `GET /reports/admissions` → `{ labels, admitted[], discharged[] }`
- `GET /reports/outstanding` → `{ data: { invoice_number, patient, total, paid_amount, balance, created_at }[] }`
- `GET /reports/doctor-performance` → `{ data: { doctor, appointments, visits, prescriptions }[] }`
- `GET /reports/inventory` → `{ data: { medicine, stock, reorder_level, expired, expiring }[] }`
- Each report also supports `?export=csv` → CSV download.

## Settings

- `GET /settings` → `{ data: { hospital_name, address, phone, email, currency, logo, ... } }`
- `PUT /settings` (perm `settings.manage`) body `{ key: value, ... }`

## Users & roles (`/api/users`, perm `users.*` / `roles.manage`)

- `GET /users` (`?search=&role_id=`) → `{ id, name, email, phone, role, is_active, last_login_at, created_at }`
- `POST /users` `{ name, email, password, phone?, role_id, is_active? }`, `PUT /users/{id}`, `DELETE /users/{id}`
- `GET /roles` → `{ id, name, label, description, permissions: string[], users_count }`
- `POST /roles`, `PUT /roles/{id}`, `DELETE /roles/{id}` body `{ name, label, description?, permissions: string[] }`
- `GET /permissions` → `{ data: { name, label, group }[] }`
