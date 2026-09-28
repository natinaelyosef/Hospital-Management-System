# MediCare HMS Owner Guide and Live Test Plan

This guide is for hospital owners, administrators, and staff testing the MediCare Hospital Management System. It explains how to start the website, configure it, use the main workflows, and verify the full system with test accounts.

> **Important:** The demo accounts and sample records are for development/testing only. Do not enter real patient information into a demo or unapproved environment. Never run database reset commands against a production database.

## 1. Start the Website

The website has two parts: the Laravel API (backend) and the React website (frontend). Both must be running.

1. Confirm PHP, Composer, Node.js/npm, and the configured MariaDB/MySQL database are available.
2. Open a terminal in the backend folder and prepare the database if this is a new development installation:

   ```powershell
   Set-Location 'C:\xampp\htdocs\Hospital Management System\backend'
   composer install
   if (-not (Test-Path .env)) { Copy-Item .env.example .env }
   php artisan key:generate     # only for a new local installation without an app key
   php artisan migrate --seed
   ```

   Configure the database connection and `FRONTEND_URL` in `backend/.env` before migrating. Keep the existing `.env` and its secrets private. `migrate --seed` applies migrations and creates demo roles/accounts/data; use it only with the intended development/test database.

3. Start the API in that terminal:

   ```powershell
   php artisan serve
   ```

   The default local API address is `http://127.0.0.1:8000`.

4. Open a second terminal in the frontend folder:

   ```powershell
   Set-Location 'C:\xampp\htdocs\Hospital Management System\frontend'
   npm install
   npm run dev
   ```

5. Open the URL printed by Vite, usually `http://localhost:5173`.
6. Confirm the public home page loads, then sign in. If the page reports a network/API error, confirm both terminals are still running and the frontend proxy/backend address matches the local API.

## 2. Demo Accounts

The seeded demo password for each account below is `password`. These accounts are only suitable for local testing. Change or remove them before any deployment accessible to real users.

| Role | Login email | Main use |
|---|---|---|
| Super Administrator | `admin@medicare.test` | Full configuration, users, roles, audit, and all modules |
| Super Administrator | `admin2@medicare.test` | Second administrator for access/lifecycle tests |
| Doctor | `doctor@medicare.test` | Consultations, diagnosis, lab requests, prescriptions |
| Nurse | `nurse@medicare.test` | Intake, triage, vital signs, and ward tasks |
| Receptionist | `receptionist@medicare.test` | Patient registration, appointments, routing, and intake |
| Pharmacist | `pharmacist@medicare.test` | Medicine stock, prescription billing, and dispensing |
| Lab Technician | `lab@medicare.test` | Lab work and result entry |
| Accountant | `accountant@medicare.test` | Payment recording, invoice approval, insurance, and reports |
| Patient | `patient@medicare.test` | Patient portal; only that patient's own data is visible |

To test two roles at once, use separate browser profiles (for example, a normal window and a private window). Signing in as a second role in the same browser replaces the first account's session.

## 3. First-Time Owner Setup

Sign in as a Super Administrator and complete these checks before staff begin using the system:

1. **Settings:** Open **Administration → Settings**. Review the hospital name, address, phone, email, and currency. Save and verify the displayed values.
2. **Departments:** Open **Administration → Departments**. Create or correct each department and its code. Keep names consistent because departments are used for patient routing and reports.
3. **Doctors:** Open **Administration → Doctors**. Add each doctor, assign a department, set specialization and consultation fee, and configure working schedules. Confirm the doctor is active and appears as available for an appropriate date.
4. **Services:** Open **Finance → Services**. Add the services and prices the hospital actually bills for. Verify active status and prices before creating test invoices.
5. **Lab Tests:** Open **Diagnostics → Lab Tests**. Add the test catalogue, codes, and prices used by the facility.
6. **Pharmacy:** Open **Diagnostics → Pharmacy** and **Stock**. Add medicine catalogue entries and receive stock into dated batches. Check reorder levels, expiry dates, and selling prices.
7. **Wards:** Open **Inpatient → Ward Board**. Configure wards, rooms, and beds. Confirm beds intended for admissions are available.
8. **Users and access:** Open **Administration → Users**. Create or invite staff with the least access needed for their job. Use **Roles** only when the permission design needs to change; this page requires Super Administrator access.
9. **Test account:** Create a clearly labelled non-production test patient, or use seeded records. Avoid using a real person's identifying details in development.

The left navigation only shows pages permitted for the signed-in role. A missing page may be an access-permission issue, not a website failure. Permission checks are also enforced by the backend.

## 4. Everyday Use by Role

### Receptionist

1. Open **Clinical → Patients** and search before creating a patient to avoid duplicate records.
2. Register the patient with accurate contact and emergency-contact information. The system generates a patient number.
3. Open **Clinical → Appointments** to book a suitable doctor, date, and available time slot, or open **Consultation** to work with the patient journey/intake queue.
4. Record the patient's complaint and symptoms as reported. Do not enter a diagnosis as reception staff.
5. Route/refer the case to the suggested department and an available doctor as appropriate. A suggestion is not a clinical decision; staff confirm the destination.
6. Check the visit timeline and notifications for handoff progress. Keep the patient number and appointment details available for follow-up.

### Nurse

1. Open **Clinical → Consultation** and select the visit waiting for triage.
2. Start triage, record the required vital signs and nursing notes, then complete triage.
3. Verify the visit moves into the doctor queue and that the vital signs are visible in the visit record.
4. For an inpatient, use **Inpatient → Ward Board/Admissions** according to the hospital's admission procedure. Verify the chosen bed is available before admission.

### Doctor

1. Open **Clinical → Appointments** or **Consultation** and select the assigned patient/visit.
2. Start the consultation. Review the complaint, history, allergies, current medicines, vitals, and prior notes.
3. Record diagnosis and treatment in the visit. Request laboratory tests when needed.
4. After results are available, review them in the visit and continue the consultation.
5. Create a prescription with the correct medicine, dose, frequency, duration, and quantity. Complete the visit only when the clinical work is finished and the required diagnosis is recorded.

### Lab Technician

1. Open **Diagnostics → Laboratory** and select a requested test.
2. Start processing, enter a result for each requested test, and complete the request.
3. Reopen the visit or lab request and confirm the completed result is visible to the care team. Use the lab report download when a report is needed.

### Pharmacist

1. Open **Diagnostics → Pharmacy** and **Stock**. Review low-stock/expiry alerts and receive stock into a batch with its correct expiry date.
2. Open the pending prescription queue and verify patient, prescription items, stock, and prices.
3. Prepare the prescription invoice from the prescription workflow. Give the invoice details to the patient/accounting team.
4. Dispense only after the invoice is settled and explicitly approved by an accountant. A payment receipt alone does not release the medication.
5. Verify the prescription status becomes dispensed and stock decreases by the dispensed quantity. Check **Pharmacy Log** for the transaction.

### Accountant

1. Open **Finance → Invoices** and select the correct patient's invoice.
2. Record each received payment with the correct amount and method. For partial payments, confirm the remaining balance is still shown.
3. After the balance is zero, use the separate **Approve** action. Verify the invoice is approved and the linked visit can proceed to pharmacy dispensing.
4. Open **Finance → Insurance/Policies/Claims** for insured patients. Confirm the policy dates and coverage before creating or updating claims.
5. Use **Insights → Reports** to review date ranges and export CSV where needed. Reconcile totals against the invoice/payment records before relying on a report operationally.

### Patient

1. Sign in with the patient account or register using the public **Register** page.
2. Use **My Care** to open **My Record**, **My Appointments**, **My Visits**, **My Prescriptions**, **Lab Results**, or **My Bills**.
3. Verify only your own information appears. If any other patient's information is visible, stop testing and report it immediately as a privacy/security defect.

## 5. Live End-to-End Test (about 30–45 minutes)

Run this in a development/test database with separate browser profiles for each role. Use a new test patient and do not use real medical data. Write down the generated patient, appointment, visit, lab, prescription, and invoice numbers as you go.

### A. Public access and sign-in

1. Open the home page while signed out. Confirm it loads hospital overview information without exposing patient data.
2. Open **Sign in** and log in as `admin@medicare.test` / `password`.
3. Confirm the dashboard appears and the Super Administrator navigation is available.
4. Log out. Sign in as `receptionist@medicare.test` / `password`; confirm admin-only **Roles** and **Settings** are not available.

### B. Create and route a patient visit

1. In the receptionist profile, search for the planned test patient first. If absent, register a new test patient with a unique email/phone and an identifiable test name such as `TEST - Alex Sample`.
2. Record the generated patient number. Open the patient record and confirm contact details were saved.
3. Create an appointment for an active doctor/date/time, or create intake from the Consultation workflow. Enter a non-emergency test complaint and symptoms.
4. Route the visit to a department and doctor. Record the visit number/status and verify its timeline records the handoff.
5. Try to create a second active visit for this same patient. Expected: the system rejects a duplicate open case and identifies the existing visit. Cancel/close the extra attempt; do not create duplicate production-like data.

### C. Nurse triage and doctor consultation

1. In the nurse profile, open the routed visit, start triage, and enter realistic **test-only** vitals and a nursing note.
2. Complete triage. Expected: the visit moves into the doctor queue and the vitals are saved.
3. In the doctor profile, open the visit, begin consultation, and enter a test diagnosis and treatment.
4. Request one active lab test. Expected: a lab request is created and the visit shows the lab handoff.

### D. Laboratory and clinical review

1. In the lab technician profile, open the new request and start processing.
2. Enter a clearly marked test result, reference range, and unit, then complete the request.
3. Expected: the completed result is visible from the lab request and the visit timeline/status reflects the lab completion.
4. In the doctor profile, review the result and return to consultation. Create a prescription for an active medicine with available stock.

### E. Pharmacy, payment, approval, and dispensing

1. In the pharmacist profile, open the prescription and prepare its invoice. Record the invoice number and total.
2. Confirm the prescription cannot be dispensed before an invoice is paid and approved. Expected: the interface explains the payment requirement and stock is unchanged.
3. In the accountant profile, open the invoice and record a payment for the full balance using a test payment method/reference.
4. Approve the fully paid invoice as the accountant. Expected: payment status is paid and approval is separately recorded.
5. Return to the pharmacist profile and dispense the prescription.
6. Expected: prescription status becomes dispensed, medicine stock decreases by the prescribed quantity, the pharmacy transaction appears in **Pharmacy Log**, and the visit timeline shows the handoff.

### F. Optional inpatient test

1. As an authorized nurse/admin, open **Ward Board** and confirm an available bed exists.
2. Admit a test patient to an available ward/room/bed, then check the Admissions list and detail.
3. If the test environment supports it, transfer the patient to another available bed and discharge the test admission with a test summary/outcome.
4. Expected: bed availability updates at each step, the admission record retains its history, and the discharge summary can be downloaded.

### G. Reports, audit, and patient privacy

1. As an accountant/admin, open **Reports**, select a date range that includes the test workflow, and check patient, lab, pharmacy, admission, and revenue reporting where applicable.
2. Export one report to CSV and confirm it opens with the expected columns and test record.
3. As admin, open **Audit Log** and confirm major changes are attributable to the user and time.
4. Sign in as the patient linked to the test record if it was registered through the patient portal. Otherwise, use `patient@medicare.test` to verify portal scoping against that account's own records. Confirm a patient cannot find or open another patient's data.
5. As receptionist or another limited role, attempt to open an admin-only page by URL. Expected: access is denied; hiding a menu item alone is not considered sufficient access control.

## 6. Module Acceptance Checklist

Mark each item **Pass**, **Fail**, or **Not tested**. Use seeded/demo data only in a test environment.

| Area | Check | Expected result |
|---|---|---|
| Public home | Load while signed out | Public hospital information appears; no patient records are exposed |
| Authentication | Valid login, logout, invalid password | Valid account signs in; logout clears access; invalid login shows a safe error |
| Access control | Open a page outside the account's role | Backend denies access; no unauthorized data is returned |
| Patients | Search, create, edit, open record | Correct patient appears; duplicate phone is rejected; generated patient number is stable |
| Appointments | Find availability, book, change status | Appointment saves with correct patient, doctor, date, time, and status |
| Consultation | Intake, referral, triage, vitals, notes, completion | Visit follows allowed handoffs; required vitals/diagnosis are enforced |
| Laboratory | Start request, enter results, complete, download report | Results persist and are visible from the correct patient/visit |
| Prescriptions | Create, prepare bill, dispense | Items and prices are correct; dispensing is blocked until payment approval |
| Pharmacy | Receive stock, alerts, dispense, transaction log | Batch/expiry is tracked; stock and transaction history update correctly |
| Billing | Create invoice, partial/full payment, approve, PDF | Totals/balance are correct; payment and accountant approval are separate |
| Insurance | Policy and claim flow | Patient, insurer, coverage, claim amount, and status are linked correctly |
| Wards | Bed availability, admission, transfer, discharge | No occupied bed is double-booked; bed/admission status updates correctly |
| Users and roles | Invite/create, suspend/activate, role permissions | Correct role is assigned; account lifecycle rules are enforced |
| Notifications | Trigger a handoff and inspect notifications | Notification appears; the header unread count may take up to 60 seconds to refresh |
| Reports | Change date range and export CSV | Report reflects the chosen period; export is readable and consistent with source records |
| Audit | Make a permitted change and inspect audit log | Actor, action, record, and time are recorded where supported |
| Responsive layout | Repeat key tasks on desktop and phone-sized browser | Navigation and forms remain usable without overlapping or hidden actions |

## 7. What “Real-Time” Means in This Test

The test is performed live against the running website: each team's saved action is checked by the next team in the workflow. The header's unread-notification count is configured to refresh every 60 seconds; do not expect every notification to appear instantly. The current app documentation does not describe WebSocket/live push delivery. For handoffs, verify the underlying visit status/timeline in the receiving role rather than relying only on the notification badge.

## 8. Record and Report a Problem

For every failed check, record:

- Date/time and environment (local/test/production) and browser/device.
- Role used and the page/URL where it happened. Never include a real patient's sensitive details in a bug report.
- Steps to reproduce, beginning from a clean state where possible.
- Expected result and actual result, including any error text.
- Test record identifiers (patient/visit/invoice numbers only from test data) and a screenshot with sensitive values hidden.
- Whether refreshing or signing out/in changes the result.

Stop the test and notify the system owner immediately for a privacy leak, unauthorized access, incorrect medication/patient association, lost clinical data, or incorrect financial total. Do not continue using that workflow with real patient data until reviewed.

## 9. End-of-Test Cleanup

1. Sign out of every demo account and close private test browser profiles.
2. Keep or remove test records according to the test database retention plan. Do not delete records from a live database just to clean up a test.
3. Before any real deployment, remove/disable demo accounts, replace development configuration, set secure credentials, configure HTTPS and email delivery, and verify database backups and access policies with the deployment administrator.

## Related References

- [Frontend local run instructions](../frontend/README.md)
- [API contract and role permissions](API_CONTRACT.md)
- [Database contract](DB_CONTRACT.md)