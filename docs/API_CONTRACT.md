# MediCare HMS — API Contract (single source of truth)

Base URL: `http://127.0.0.1:8000/api` (frontend dev server proxies `/api` here).

## Conventions

- All authenticated endpoints require header `Authorization: Bearer <token>` (Laravel Sanctum).
- Endpoints are authorized **server-side** by the `permission` middleware (`App\Http\Middleware\EnsurePermission`): the caller must hold at least one of the permissions listed on the endpoint. A missing permission returns `403`.
- The `super_admin` role bypasses every permission gate. The operational `admin` role holds the same permissions **except** `roles.manage`, so only a Super Administrator can rewrite the role/permission architecture. Only a Super Administrator may create, suspend, delete or demote another Super Administrator.
- Account lifecycle: `status` is one of `active | suspended | inactive | pending`. Only `active` accounts may sign in. Deleting an account **soft-deletes** it (`deleted_at`, `deleted_by`, `deletion_reason`) — clinical and financial records are never removed with it.
- JSON only. Every success payload wraps the primary payload in `data`.
  - Single resource: `{ "data": { ... } }`
  - List (paginated): `{ "data": [ ... ], "meta": { "current_page": 1, "last_page": 3, "per_page": 15, "total": 42 } }`
  - List (lookup, unpaged): `{ "data": [ ... ] }`
- Errors: `422` `{ "message": "...", "errors": { "field": ["..."] } }`; `401` `{ "message": "Unauthenticated." }`; `403` `{ "message": "This action is unauthorized." }`; `404` `{ "message": "Not found." }`.
- Pagination query params: `?page=1&per_page=15`, search `?search=`, plus module-specific filters (documented per module).
- Timestamps are ISO-8601 strings (`YYYY-MM-DDTHH:mm:ss.000000Z`); dates are `YYYY-MM-DD`.
- **Patient-portal scoping.** A signed-in user whose account is linked to a `patients` row (a Patient-portal user) only ever sees their own records, even when a read permission is granted. List endpoints filter to `patients.id`, detail/PDF endpoints return `403` for another patient's record. Resolved in `App\Http\Controllers\Controller::portalPatientId()` (the `User::patient()` hasOne relation — `users` has no `patient_id` column), backed by `scopeToSelf()` and `denyOtherPatient()`.

## Auth (`/api/auth`)

| Method | Path | Body | Response `data` |
|---|---|---|---|
| POST | `/auth/login` | `{ email, password, portal }` | `{ token, user, portal }` |
| POST | `/auth/portal` | `{ email }` | `{ portal: "patient"\|"staff"\|null, exists }` |
| POST | `/auth/register` | `{ first_name, last_name, gender, date_of_birth, phone, email, address?, emergency_contact_name, emergency_contact_phone, password, password_confirmation, chief_complaint, symptoms?, symptom_duration?, severity?, previous_conditions?, current_medications? }` | `{ token, user, patient_number, visit, suggested_departments }` (201) |
| POST | `/auth/invites/accept` | `{ token, password, password_confirmation }` | `{ token, user, portal }` |
| POST | `/auth/forgot-password` | `{ email }` | `{ message }` (+ `reset_token`, `reset_url` in debug) |
| POST | `/auth/reset-password` | `{ email, token, password, password_confirmation }` | `{ message }` |
| POST | `/auth/logout` | – | `{ message }` |
| GET | `/auth/me` | – | the [user object](#user-object) |
| PUT | `/auth/profile` | `{ name?, phone?, email? }` | `{ user }` |
| POST | `/auth/password` | `{ current_password, password, password_confirmation }` | `{ message }` |

### The two front doors

`portal` is **required** on `POST /auth/login` and is the security boundary between patients and staff. Every account belongs to exactly one portal, derived from its role: the `patient` role → `"patient"`, every other role → `"staff"`.

- A patient signing in with `portal: "staff"` → `403 { message, portal: "patient", expected_portal: "staff" }` and **no token is issued**.
- A staff account signing in with `portal: "patient"` → `403 { message, portal: "staff", expected_portal: "patient" }`, no token.

The portal check runs *after* the password is verified, so a wrong password on the wrong portal still returns the generic `422 "Invalid email or password."` and never reveals that the account exists on the other door.

`POST /auth/portal` is a public routing hint (`throttle:15,1`) used by the two login pages to point a mistyped entry at the correct front door. An unknown email returns `{ portal: null, exists: false }`.

`POST /auth/login` is rate-limited (`throttle:10,1`). Wrong credentials → `422`. Non-active account with correct credentials → `403` with `{ message, status, suspension_reason? }`; a suspended account is also signed out of every existing session.

Invitations are **staff-only**: `POST /users/invite` rejects the `patient` role with `422`, and `POST /auth/invites/accept` refuses a patient-role token with `403` even if one was somehow created. Patients register themselves instead.

### Front doors (routes)

| Front door | Public pages | Authenticated home |
|---|---|---|
| Patient | `/` (home) · `/patient/login` · `/patient/register` · `/patient/forgot-password` · `/patient/reset-password` | `/portal` |
| Staff | `/staff` (home) · `/staff/login` · `/staff/forgot-password` · `/staff/reset-password` · `/invite/:token` | `/dashboard` |

`/` is the patient home page; the old `/patient` path redirects there. `/start` is the front-door chooser shown after sign-out and on expired sessions. `/about` is the public marketing page. The legacy `/login`, `/register`, `/forgot-password` and `/reset-password` paths redirect to the correct front door. `GET /api/dashboard` echoes the portal and role that produced the payload (`data.portal`, `data.role`) so a home page can confirm it is looking at its own data.

`POST /auth/register` is public and rate-limited (`throttle:5,1`). It creates an `active` `patient`-role user, the matching `patients` row (`patient_number` = `P-YYYY-NNNNNN`) **and** the first `visits` case (`visit_number` = `VST-YYYY-NNNNNN`, status `intake_completed`) in one transaction, then returns a bearer token plus the ranked `suggested_departments` so reception can route the case immediately. Collecting `chief_complaint` here means a patient is never left registered with zero clinical data.

`POST /auth/invites/accept` is public (`throttle:5,1`). The single-use token from an invite link activates the `pending` account, sets the invitee's password and signs them in. Unknown or already-used tokens → `422`; a patient account → `403`.

`POST /auth/forgot-password` is public (`throttle:5,1`) and always returns the same message so accounts cannot be enumerated. When the email matches an account a `sha256` token (60-minute TTL) is stored in `password_reset_tokens`. Until mail delivery exists, `reset_token` + `reset_url` are included only when `app.debug` is true. `POST /auth/reset-password` (`throttle:5,1`) exchanges `{ email, token, password, password_confirmation }` for a new password, revokes every session and deletes the token (single-use).

## Public website (`/api/public`, no auth)

| Method | Path | Notes | Response `data` |
|---|---|---|---|
| GET | `/public/overview` | `throttle:30,1`, cached 5 min | `{ hospital, departments[], doctors[], stats }` |

```ts
{
  hospital: { name: string; address: string | null; phone: string | null; email: string | null; currency: string };
  departments: { id: number; name: string; code: string; description: string | null }[];
  doctors: { name: string | null; specialization: string | null; department: string | null; consultation_fee: number }[];  // max 6
  stats: { patients: number; doctors: number; departments: number };
}
```

No patient-identifying data is ever exposed here. This powers the public homepage at `/`.

### User object

```ts
{
  id: number; name: string; email: string; phone: string | null;
  role: { id: number; name: string; label: string; permissions: string[] };
  patient_id: number | null;   // set when the user is a Patient-portal user
  doctor_id: number | null;    // set when the user is a Doctor
  status: 'active' | 'suspended' | 'inactive' | 'pending';
  is_active: boolean;          // mirror of status === 'active'
  suspended_at: string | null; suspension_reason: string | null;
  invited_at: string | null;   // set when the account arrived via invitation
  last_login_at: string | null; created_at: string;
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

## Global search (`/api/search`)

- `GET /search?q=min3chars&scope=patients,doctors,appointments,prescriptions,lab_requests,admissions,invoices` (scope optional)
- → `{ data: { patients: [{id,title,subtitle,url}], doctors: [...], ... } }` (max 6 hits per group, patient-portal users scoped to self)

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
- Duplicate guard: `POST /patients` and `POST /auth/register` reject an already-used phone number (`422` with the existing `patient_number`); patient emails are unique.
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

Visits are the workflow encounter: one active case per patient, moved forward by
handoffs. Every move writes an immutable `visit_transitions` row (the Patient
Journey timeline), an audit entry and a notification to the next owner.

```ts
interface Visit {
  id: number; visit_number: string; patient: Patient; doctor: Doctor|null;
  appointment_id: number|null; department_id: number|null; visit_date: string;
  type: "opd"|"emergency"|"follow_up"; priority: "normal"|"urgent"|"emergency";
  chief_complaint: string|null; symptoms: string|null; symptom_duration: string|null;
  severity: "mild"|"moderate"|"severe"|null; previous_conditions: string|null;
  current_medications: string|null; intake_notes: string|null;
  diagnosis: string|null;
  treatment: string|null; medical_notes: string|null; follow_up_date: string|null;
  status: "registered"|"intake_completed"|"referred"|"waiting_for_nurse"
    |"nurse_assessment_completed"|"waiting_for_doctor"|"in_consultation"
    |"lab_requested"|"lab_in_progress"|"lab_completed"|"prescription_created"
    |"pharmacy_processing"|"payment_required"|"payment_approved"
    |"medication_dispensed"|"visit_completed"|"cancelled";
  referred_by: number|null; referred_at: string|null; created_at: string;
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
interface TimelineEntry { id: number; from: string|null; to: string; label: string; actor: string|null; note: string|null; at: string|null }
interface WorkflowTask { key: string; label: string; count: number; url: string }
```

- `GET /visits` (`?patient_id=&doctor_id=&department_id=&priority=&date=&status=&search=`), `GET /visits/{id}`, `PUT /visits/{id}`
- `POST /visits` (doctor direct open → `in_consultation`; body adds `priority?, symptom_duration?, severity?, previous_conditions?, current_medications?, intake_notes?`)
- `POST /visits/intake` (perm `patients.create,patients.view`: staff, or a patient for **self only**) — body `{ patient_id, type, priority?, chief_complaint*, symptoms?, symptom_duration?, severity?, previous_conditions?, current_medications?, allergies?, intake_notes?, department_id?, visit_date?, vitals? }`. Diagnosis/treatment are **not accepted** (reception never diagnoses). Rejects a second active case per patient (`422` with the open `visit_number`). Returns `{ visit, suggested_departments }` (201).
- `PUT /visits/{id}/intake` — correct intake before referral (same field whitelist).
- `POST /visits/{id}/refer` (perm `patients.edit`) — `{ department_id*, doctor_id?, priority?, notes? }`; re-referring moves departments.
- `POST /visits/{id}/start-triage`, `POST /visits/{id}/complete-triage` (perm `consultation.create`) — completing triage requires recorded vitals and auto-queues the doctor.
- `POST /visits/{id}/start-consultation`, `POST /visits/{id}/lab-reviewed` (perm `consultation.edit`, assigned doctor or admin override). `lab-reviewed` returns the case straight to `in_consultation` so the doctor reviews results and prescribes (or orders a second lab round) in one click — no forced re-open.
- `POST /visits/{id}/complete` (diagnosis required) → `visit_completed`; `POST /visits/{id}/cancel`.
- `GET /visits/{id}/timeline` (perm `consultation.view,patients.view,patients.edit`; patients see own) → `TimelineEntry[]` oldest first.
- `GET /visits/{id}/vitals`, `POST /visits/{id}/vitals` — also `POST /patients/{id}/vitals` for nurses (no visit yet)
- `GET /patients/{id}/vitals` → paginated history
- `POST /visits/{id}/notes`, `GET /visits/{id}/notes`

Automatic downstream moves (notification included): lab request created → `lab_requested` (explicit edge, so a second round from `lab_completed` or `waiting_for_doctor` re-enters the lab instead of being dropped); lab started → `lab_in_progress`; results completed → `lab_completed`; lab cancelled → back to `waiting_for_doctor`; prescription created → `prescription_created`; bill prepared → `pharmacy_processing` **then** `payment_required` (in that order — the monotonic advance would otherwise swallow the pharmacy stage); zero-total bills are approved on the spot → `payment_approved`; cash payment recorded settles the invoice but does **not** advance the case; `POST /invoices/{id}/approve` → `payment_approved`; prescription dispensed → `medication_dispensed`.

Workflow utilities (any signed-in user; buckets are role-aware):

- `GET /workflow/summary` → `WorkflowTask[]` (counts + deep links, e.g. receptionist routing/referred, nurse triage, doctor queue/review, lab pending/urgent, pharmacy new/preparing/unpaid, accountant required/paid-today, patient current visit/bills).
- `GET /departments/suggest?complaint=` (perm `departments.view,patients.create`) → top-3 `{ id, name, code, description, score }`; suggestions only, a human confirms.

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

- `GET /prescriptions` (`?status=&search=&patient_id=&visit_id=&doctor_id=`), `POST /prescriptions`, `GET /prescriptions/{id}`
- `PUT /prescriptions/{id}/status` body `{ status }` (`pending|processing|dispensed|cancelled` — `dispensed` decrements pharmacy stock; refused with `422` while the linked visit has an unpaid/partial invoice **or no paid invoice yet** — pharmacist must prepare the bill first, accountant must approve payment)
- `POST /prescriptions/{id}/invoice` (perm `prescriptions.create,prescriptions.dispense,billing.invoice.create`) body `{ discount?, tax?, notes? }` → pharmacist prepares the bill document (medicine lines at current `selling_price` + unbilled lab tests on the same visit) and stamps `prescription_id` on the invoice; idempotent — returns the open (`unpaid`/`partial`) invoice for the prescription or its visit when one exists; zero-total bills are settled and approved immediately. Moves the visit to `pharmacy_processing` → `payment_required` (straight to `payment_approved` when the total is 0).
- `GET /prescriptions/pending` → pharmacy queue
- `GET /prescriptions/{id}/pdf` → prescription PDF: the medicines list **with unit price, line total and subtotal**, plus the full bill for the accountant (sub total, discount, tax, total, paid, balance due) when one exists. This is the document the pharmacist hands over.

Create body: `{ patient_id, visit_id?, diagnosis?, notes?, items: [{ medicine_id, dosage, frequency, duration, quantity, instructions? }] }` — `visit_id` must match `patient_id`, visit must be `in_consultation|lab_completed|waiting_for_doctor`, stock is checked upfront. Prescription items expose `{ unit_price, line_total }` (live catalogue price) plus `estimated_total`. The payload also carries the payment gate so the pharmacy UI can disable **Dispense** with a reason instead of returning a 422: `{ payment_approved, outstanding_invoice: { id, invoice_number, balance, status }|null, approved_invoice: { id, invoice_number, approved_at, approved_by_name }|null }`. Dispensing requires an approved invoice linked by `prescription_id` (or, for bills predating that link, by `visit_id`) — a walk-in prescription with no bill is blocked too.

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
- `GET /lab-requests` (`?status=&search=&date=&patient_id=&visit_id=`), `POST /lab-requests` body `{ patient_id, visit_id?, doctor_id?, priority, notes?, test_ids: number[] }` — when `visit_id` is set, `patient_id` must match the visit and the visit must be `in_consultation|lab_completed`. Results expose `test_price` + request `estimated_cost`.

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
- `GET /lab-requests/{id}/pdf` → lab report PDF download

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
- `GET /admissions/{id}/pdf` → discharge summary PDF download
- `GET /wards/beds/availability` → `{ total, occupied, available }`

## Billing (`/api/billing`)

- `GET/POST/PUT/DELETE /services` (perm `billing.*`) → `{ id, name, code, category, price, is_active }`
- `GET /invoices` (`?status=&search=&date=&patient_id=&visit_id=`) — invoice payload now includes `patient_id`, `visit_id`, `prescription_id`, `admission_id`. Zero-total invoices are created as `paid` **and approved**, so pharmacy never stalls on a free bill.

```ts
interface Invoice {
  id: number; invoice_number: string; patient: Patient; sub_total: number; discount: number;
  tax: number; total: number; paid_amount: number; balance: number;
  status: "unpaid"|"partial"|"paid"|"cancelled";
  insurance_covered: number; notes: string|null; issued_by_name: string;
  /** Approval is a separate, explicit accountant decision from recording cash. */
  is_approved: boolean; approved_by_name: string|null;
  approved_at: string|null; approval_notes: string|null;
  paid_at?: string|null;
  created_at: string; items: InvoiceItem[];
  payments: Payment[];
}
interface InvoiceItem { id?: number; service_id: number|null; description: string; item_type: "consultation"|"lab"|"medicine"|"room"|"procedure"|"other"; quantity: number; unit_price: number; total: number }
interface Payment { id: number; payment_number: string; amount: number; method: "cash"|"card"|"bank_transfer"|"insurance"|"mobile_money"; reference: string|null; status: "completed"|"pending"|"failed"|" refunded"; paid_at: string; received_by_name: string }
```

- `POST /invoices` body `{ patient_id, visit_id?, admission_id?, discount?, tax?, notes?, items: [{ service_id?, description, item_type, quantity, unit_price }] }`
- `GET /invoices/{id}`, `PUT /invoices/{id}`, `POST /invoices/{id}/payments` body `{ amount, method, reference? }` — recording cash settles the invoice but does **not** release the medication.
- `POST /invoices/{id}/approve` (perm `billing.payment.approve`, accountant only) body `{ notes? }` — the explicit approval gate. Requires a zero balance; 422 while anything is outstanding or if already approved. Advances the linked case to `payment_approved`.
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

| Method | Path | Perm | Body |
|---|---|---|---|
| GET | `/users` | `users.view` | `?search=&role_id=&status=&sort=&direction=&page=&per_page=` |
| POST | `/users` | `users.create` | `{ name, email, password?, phone?, role_id, status?, is_active? }` |
| PUT | `/users/{id}` | `users.edit` | `{ name?, email?, password?, phone?, role_id?, status?, is_active? }` |
| POST | `/users/{id}/suspend` | `users.edit` | `{ reason }` (required, ≥ 5 chars) |
| POST | `/users/{id}/activate` | `users.edit` | – |
| POST | `/users/invite` | `users.create` | `{ name, email, phone?, role_id }` → `{ user, invite_token, invite_url }` (201, token shown once) |
| POST | `/users/{id}/invite` | `users.edit` | re-send: rotates the token for a `pending` account → `{ user, invite_token, invite_url }` |
| POST | `/users/{id}/password` | `users.edit` | `{ password? }` → `{ message, password }` (generated when omitted, returned once) |
| DELETE | `/users/{id}` | `users.delete` | `{ reason? }` — soft delete |
| GET | `/roles` | `users.view` or `roles.manage` | – |
| POST | `/roles` | `roles.manage` | `{ name, label, description?, permissions: string[] }` |
| PUT | `/roles/{id}` | `roles.manage` | `{ name?, label?, description?, permissions? }` |
| DELETE | `/roles/{id}` | `roles.manage` | – |
| GET | `/permissions` | `roles.manage` | – |

Guards (all server-side, all covered by `tests/Feature/AccountLifecycleTest.php`):

- Only `super_admin` may create/assign/suspend/delete/demote a `super_admin` account.
- You cannot suspend, activate or delete **your own** account (`400`).
- The last active Super Administrator cannot be demoted or deactivated (`400`).
- `password` is generated when creating without one; `status` defaults to `active`.
- Invitations create `pending` accounts with a single-use token (`invited_at`, `invite_token`); the link is `FRONTEND_URL/invite/{token}` and accepting it signs the invitee in. Re-sending invalidates the previous link. Only `super_admin` may invite another `super_admin`.
- Suspended/activated accounts receive an in-app notification carrying the reason.

`GET /users` returns soft-deleted accounts excluded; the shape is the [User object](#user-object).

## Role & permission matrix (43 permissions, 9 roles)

Seeded by `backend/database/seeders/RolePermissionSeeder.php` and re-applied idempotently on every `db:seed`. `GET /permissions` and `GET /roles` expose the live values.

| Role | Permissions |
|---|---|
| `super_admin` | **all 44** (also bypasses `EnsurePermission` in code) |
| `admin` | all except `roles.manage` |
| `doctor` | `dashboard.view`, `patients.view`, `appointments.*` (4), `consultation.*` (3), `prescriptions.view/create`, `lab.view/request`, `pharmacy.view`, `wards.view`, `reports.view` |
| `nurse` | `dashboard.view`, `patients.*` (5), `appointments.view`, `consultation.*` (3), `prescriptions.view`, `wards.view/admit/discharge`, `lab.view` |
| `receptionist` | `dashboard.view`, `patients.*` (5), `appointments.*` (4), `consultation.view`, `billing.view`, `billing.invoice.create`, `insurance.view`, `doctors.view`, `departments.view` |
| `pharmacist` | `dashboard.view`, `pharmacy.view/manage`, `prescriptions.view/create/dispense`, `patients.view`, `consultation.view`, `billing.view`, `billing.invoice.create`, `lab.view` |
| `lab_technician` | `dashboard.view`, `lab.view/request/process`, `patients.view`, `appointments.view`, `consultation.view` |
| `accountant` | `dashboard.view`, `billing.*` (5 — including `billing.payment.manage` to record cash and `billing.payment.approve` to release it), `insurance.*` (2), `reports.view`, `patients.view`, `consultation.view`, `prescriptions.view`, `lab.view` |
| `patient` | `dashboard.view`, `patients.view`, `appointments.view`, `prescriptions.view`, `lab.view`, `billing.view`, `consultation.view` — **every read is scoped to that patient's own records** |

Demo logins (all password `password`): `admin@medicare.test` and `admin2@medicare.test` (both `super_admin`), `doctor@`, `nurse@`, `receptionist@`, `pharmacist@`, `lab@`, `accountant@`, `patient@medicare.test`.
