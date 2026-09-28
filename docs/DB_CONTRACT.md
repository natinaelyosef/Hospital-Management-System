# MediCare HMS — Database Contract (Laravel 12 / MariaDB)

Migrations live in `backend/database/migrations/`. They MUST run in this order (prefix files `2026_01_01_000001_...` … `000012_...`). All FKs use `->constrained()->cascadeOnDelete()` unless noted. All tables use `$table->timestamps()` unless noted. Engine InnoDB, utf8mb4 (Laravel defaults).

**Zero-data-loss rule:** never modify the pre-existing `users`/`sessions`/`cache`/`jobs` migrations — add a new migration `alter_users_table` instead.

## 1. `000001_alter_users_and_rbac`
- `alter users table`: add `role_id` (FK `roles`), `phone` (nullable string), `avatar_path` nullable, `is_active` boolean default true, `last_login_at` timestamp nullable.
- `roles`: id, `name` unique (slug e.g. `super_admin`), `label`, `description` nullable, timestamps.
- `permissions`: id, `name` unique (e.g. `patients.view`), `label`, `group` (module slug), timestamps.
- `role_permission`: `role_id` FK, `permission_id` FK, primary key [`role_id`,`permission_id`].
- `departments`: id, `name`, `code` unique, `description` nullable, `head_id` nullable FK `users`, timestamps.
- `settings`: id, `key` unique, `value` text nullable, `group` string default `general`, timestamps.
- `audit_logs`: id, `user_id` nullable FK, `action` string, `description` text, `auditable_type` nullable, `auditable_id` nullable (index), `old_values` json nullable, `new_values` json nullable, `ip_address` nullable, `user_agent` nullable, `created_at` only (no `updated_at`).
- index note: use `$table->index([...])` where listed.

## 2. `000002_staff`
- `doctors`: id, `user_id` nullable FK `users`, `department_id` nullable FK, `license_number` unique, `specialization`, `consultation_fee` decimal(10,2) default 0, `phone` nullable, `bio` nullable text, `is_active` boolean default true, timestamps.
- `doctor_schedules`: id, `doctor_id` FK, `day_of_week` tinyint (0=Sun…6=Sat), `start_time` time, `end_time` time, `slot_minutes` int default 30, `is_active` boolean default true, timestamps.

## 3. `000003_patients`
- `patients`: id, `patient_number` unique (string, e.g. `P-2026-0001`), `first_name`, `last_name`, `gender` enum(`male`,`female`,`other`), `date_of_birth` date, `phone`, `email` nullable unique, `address` nullable, `emergency_contact_name` nullable, `emergency_contact_phone` nullable, `blood_group` nullable, `allergies` text nullable, `medical_history` text nullable, `photo_path` nullable, `user_id` nullable unique FK `users`, `registered_by` nullable FK `users`, timestamps. Indexes: `phone`, `last_name`.
- `patient_documents`: id, `patient_id` FK, `name`, `file_path`, `mime_type`, `size` bigint, `uploaded_by` nullable FK, timestamps.
- `medical_histories`: id, `patient_id` FK, `condition`, `diagnosed_on` date nullable, `notes` text nullable, `recorded_by` nullable FK, timestamps.

## 4. `000004_appointments_visits`
- `appointments`: id, `appointment_number` unique (`APT-2026-0001`), `patient_id` FK, `doctor_id` FK, `department_id` nullable FK, `appointment_date` date, `start_time` time, `end_time` time, `type` enum(`opd`,`follow_up`,`emergency`,`consultation`), `status` enum(`pending`,`confirmed`,`waiting`,`in_progress`,`completed`,`cancelled`,`no_show`) default `pending`, `queue_number` int nullable, `reason` text nullable, `notes` text nullable, `cancelled_reason` text nullable, `visit_id` nullable unsignedBigInteger (no FK constraint), `created_by` nullable FK, timestamps. Indexes: (`appointment_date`,`doctor_id`), `status`.
- `visits`: id, `visit_number` unique (`VST-2026-0001`), `patient_id` FK, `doctor_id` FK, `appointment_id` nullable FK `appointments` (nullOnDelete), `department_id` nullable FK, `visit_date` date, `type` enum(`opd`,`emergency`,`follow_up`) default `opd`, `chief_complaint` text nullable, `symptoms` text nullable, `diagnosis` text nullable, `treatment` text nullable, `medical_notes` text nullable, `follow_up_date` date nullable, `status` enum(`in_progress`,`completed`) default `in_progress`, `created_by` nullable FK, timestamps.
- `vital_signs`: id, `visit_id` nullable FK `visits` (nullOnDelete), `patient_id` FK, `recorded_by` nullable FK, `recorded_at` timestamp default current, `bp_systolic` smallint nullable, `bp_diastolic` smallint nullable, `temperature` decimal(4,1) nullable, `pulse` smallint nullable, `oxygen_saturation` smallint nullable, `weight` decimal(5,2) nullable, `height` decimal(5,2) nullable, `respiratory_rate` smallint nullable, `notes` text nullable, timestamps.
- `medical_notes`: id, `visit_id` nullable FK (nullOnDelete), `patient_id` FK, `author_id` FK, `note_type` enum(`progress`,`nursing`,`general`) default `general`, `content` text, `created_at` only.

## 5. `000005_prescriptions`
- `prescriptions`: id, `prescription_number` unique (`RX-2026-0001`), `visit_id` nullable FK (nullOnDelete), `patient_id` FK, `doctor_id` FK, `diagnosis` nullable, `status` enum(`pending`,`processing`,`dispensed`,`cancelled`) default `pending`, `notes` text nullable, `dispensed_by` nullable FK, `dispensed_at` timestamp nullable, timestamps.
- `prescription_items`: id, `prescription_id` FK, `medicine_id` FK, `medicine_name` string (snapshot), `dosage`, `frequency`, `duration`, `quantity` int default 1, `instructions` text nullable, timestamps.

## 6. `000006_pharmacy`
- `medicine_categories`: id, `name` unique, `description` nullable, timestamps.
- `suppliers`: id, `name`, `contact_person` nullable, `phone` nullable, `email` nullable, `address` nullable, timestamps.
- `medicines`: id, `name`, `generic_name` nullable, `category_id` nullable FK, `supplier_id` nullable FK, `form` string default `tablet`, `strength` nullable, `unit` string default `unit`, `stock_quantity` int default 0, `reorder_level` int default 10, `selling_price` decimal(10,2) default 0, `is_active` boolean default true, timestamps. Indexes: `name`, `stock_quantity`.
- `medicine_batches`: id, `medicine_id` FK, `batch_number`, `expiry_date` date, `quantity_received` int, `quantity_available` int, `purchase_price` decimal(10,2) default 0, `received_at` timestamp nullable, timestamps. Index: `expiry_date`.
- `pharmacy_transactions`: id, `medicine_id` FK, `batch_id` nullable FK (nullOnDelete), `type` enum(`purchase`,`dispense`,`sale`,`adjustment`,`expired`,`return`), `quantity` int, `unit_price` decimal(10,2) default 0, `total_price` decimal(10,2) default 0, `reference` string nullable, `performed_by` nullable FK, `notes` text nullable, `created_at` only. Index: `type`.

## 7. `000007_laboratory`
- `lab_tests`: id, `name`, `code` unique, `category` string default `general`, `price` decimal(10,2) default 0, `description` text nullable, `is_active` boolean default true, timestamps.
- `lab_requests`: id, `request_number` unique (`LAB-2026-0001`), `visit_id` nullable FK (nullOnDelete), `patient_id` FK, `doctor_id` nullable FK, `priority` enum(`routine`,`urgent`) default `routine`, `status` enum(`requested`,`processing`,`completed`,`cancelled`) default `requested`, `notes` text nullable, `requested_at` timestamp default current, timestamps. Index: `status`.
- `lab_results`: id, `lab_request_id` FK, `lab_test_id` FK, `status` enum(`pending`,`processing`,`completed`) default `pending`, `result_value` text nullable, `reference_range` string nullable, `unit` string nullable, `notes` text nullable, `file_path` nullable, `performed_by` nullable FK, `performed_at` timestamp nullable, timestamps. Unique (`lab_request_id`,`lab_test_id`).

## 8. `000008_wards`
- `wards`: id, `name`, `code` unique, `floor` string nullable, `type` string default `general`, timestamps.
- `rooms`: id, `ward_id` FK, `room_number`, `type` string default `general`, `tariff` decimal(10,2) default 0, `capacity` int default 1, timestamps. Unique (`ward_id`,`room_number`).
- `beds`: id, `room_id` FK, `bed_number`, `status` enum(`available`,`occupied`,`maintenance`,`reserved`) default `available`, timestamps. Unique (`room_id`,`bed_number`).
- `admissions`: id, `admission_number` unique (`ADM-2026-0001`), `patient_id` FK, `ward_id` FK, `room_id` FK, `bed_id` FK, `consultant_id` nullable FK `doctors`, `diagnosis` text nullable, `admitted_at` timestamp default current, `admitted_by` nullable FK, `status` enum(`admitted`,`transferred`,`discharged`) default `admitted`, `discharged_at` timestamp nullable, `discharged_by` nullable FK, `discharge_summary` text nullable, `outcome` enum(`recovered`,`improved`,`referred`,`deceased`,`left_against_advice`) nullable, timestamps. Index: `status`.

## 9. `000009_billing`
- `services`: id, `name`, `code` unique, `category` string default `other`, `price` decimal(10,2) default 0, `is_active` boolean default true, timestamps.
- `invoices`: id, `invoice_number` unique (`INV-2026-0001`), `patient_id` FK, `visit_id` nullable FK (nullOnDelete), `prescription_id` nullable FK (nullOnDelete) — the bill this was prepared for, so the pharmacy payment gate is exact for walk-in prescriptions, `admission_id` nullable FK (nullOnDelete), `sub_total` decimal(12,2) default 0, `discount` decimal(12,2) default 0, `tax` decimal(12,2) default 0, `total` decimal(12,2) default 0, `paid_amount` decimal(12,2) default 0, `insurance_covered` decimal(12,2) default 0, `status` enum(`unpaid`,`partial`,`paid`,`cancelled`) default `unpaid`, `notes` text nullable, `issued_by` nullable FK, `approved_by` nullable FK (nullOnDelete), `approved_at` timestamp nullable, `approval_notes` text nullable, `paid_at` timestamp nullable, timestamps. Index: `status`, `[prescription_id, status]`. A settled bill (`status=paid`) is still held by pharmacy until `approved_at` is set.
- `invoice_items`: id, `invoice_id` FK, `service_id` nullable FK (nullOnDelete), `description`, `item_type` enum(`consultation`,`lab`,`medicine`,`room`,`procedure`,`other`) default `other`, `quantity` int default 1, `unit_price` decimal(12,2) default 0, `total` decimal(12,2) default 0, timestamps.
- `payments`: id, `payment_number` unique (`PAY-2026-0001`), `invoice_id` FK, `patient_id` FK, `amount` decimal(12,2), `method` enum(`cash`,`card`,`bank_transfer`,`insurance`,`mobile_money`) default `cash`, `reference` string nullable, `status` enum(`completed`,`pending`,`failed`,`refunded`) default `completed`, `received_by` nullable FK, `paid_at` timestamp default current, `notes` text nullable, `created_at` only.

## 10. `000010_insurance`
- `insurance_companies`: id, `name`, `code` unique, `phone` nullable, `email` nullable, `address` nullable, `is_active` boolean default true, timestamps.
- `patient_insurances`: id, `patient_id` FK, `insurance_company_id` FK, `policy_number`, `holder_name` nullable, `coverage_percent` decimal(5,2) default 0, `coverage_limit` decimal(12,2) nullable, `start_date` date, `end_date` date nullable, `is_active` boolean default true, timestamps.
- `insurance_claims`: id, `claim_number` unique (`CLM-2026-0001`), `invoice_id` FK, `patient_insurance_id` FK, `amount` decimal(12,2), `approved_amount` decimal(12,2) nullable, `status` enum(`draft`,`submitted`,`approved`,`rejected`,`paid`) default `draft`, `submitted_at` timestamp nullable, `decided_at` timestamp nullable, `notes` text nullable, timestamps.

## 11. `000011_notifications` — Laravel database notifications table exactly: uuid `id`, `type`, `notifiable_type`, `notifiable_id` (index [`notifiable_type`,`notifiable_id`]), `data` text, `read_at` nullable, `created_at`, `updated_at`.

## Numbering helper (shared)
Server-side sequence numbers use a shared trait `App\Support\GeneratesSequentialNumber` with method `next(string $prefix, string $table, string $column): string` that counts rows for the current year and formats `{prefix}-{YYYY}-{000001}` (e.g. `P-2026-0001`, `APT-2026-0001`, `RX-2026-0001`, `INV-2026-0001`, `VST-`, `LAB-`, `ADM-`, `PAY-`, `CLM-`). Race safety is acceptable at portfolio scale (wrap in transaction in controllers).

## Models
Namespace `App\Models`. Every model declares `$fillable` (guarded `[]` NOT used), correct `casts()` array, and relationships for all FKs listed above. Enums in casts as `'field' => 'string'`. Required relationships (minimum):

- `User`: role(), patient(), doctor()
- `Role`: permissions() belongsToMany with `role_permission`; users()
- `Permission`: roles()
- `Patient`: user(), documents(), medicalHistories(), appointments(), visits(), prescriptions(), invoices(), admissions(), insurances(), vitalSigns()
- `Doctor`: user(), department(), schedules(), appointments(), visits(), admissions()
- `Appointment`: patient(), doctor(), department(), visit()
- `Visit`: patient(), doctor(), appointment(), department(), vitalSigns(), medicalNotes(), prescriptions(), labRequests()
- `VitalSign`: visit(), patient(), recorder()
- `Prescription`: patient(), doctor(), visit(), items(), dispenser()
- `PrescriptionItem`: prescription(), medicine()
- `Medicine`: category(), supplier(), batches(), prescriptionItems()
- `MedicineBatch`: medicine()
- `PharmacyTransaction`: medicine(), batch(), performer()
- `LabTest` / `LabRequest`: patient(), doctor(), visit(), results(); `LabResult`: request(), test(), technician()
- `Ward`: rooms(); `Room`: ward(), beds(); `Bed`: room(), admission(); `Admission`: patient(), ward(), room(), bed(), consultant()
- `Service`, `Invoice`: patient(), items(), payments(); `InvoiceItem`: invoice(), service(); `Payment`: invoice(), receiver()
- `InsuranceCompany`: patientInsurances(); `PatientInsurance`: patient(), company(), claims(); `InsuranceClaim`: invoice(), insurance()
- `AuditLog`: user()
- `Department`: doctors(), head()

Relationships that must aggregate/compute (append as methods on models):
- `Appointment`/`Visit` etc. stay plain — computed fields are done in API Resources/Controller `transform()`.
