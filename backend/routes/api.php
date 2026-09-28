<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
<<<<<<< HEAD
=======
<<<<<<< HEAD
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a
| API Routes — MediCare HMS (matches docs/API_CONTRACT.md + frontend src/api/*)
|--------------------------------------------------------------------------
| `permission:` is App\Http\Middleware\EnsurePermission: the caller must hold
| at least one of the listed permissions (the `super_admin` role always passes).
| Controllers in App\Http\Controllers\* hold the complete logic; the legacy
| Api\* duplicates are no longer wired here.
*/

// Public/Auth Routes
Route::get('public/overview', [App\Http\Controllers\PublicController::class, 'overview'])
    ->middleware('throttle:30,1');

Route::prefix('auth')->group(function () {
    Route::post('login', [App\Http\Controllers\AuthController::class, 'login'])
        ->middleware('throttle:10,1');
    Route::post('register', [App\Http\Controllers\AuthController::class, 'register'])
        ->middleware('throttle:5,1');
    Route::post('invites/accept', [App\Http\Controllers\AuthController::class, 'acceptInvite'])
        ->middleware('throttle:5,1');
    Route::post('forgot-password', [App\Http\Controllers\AuthController::class, 'forgotPassword'])
        ->middleware('throttle:5,1');
    Route::post('reset-password', [App\Http\Controllers\AuthController::class, 'resetPassword'])
        ->middleware('throttle:5,1');
    Route::post('logout', [App\Http\Controllers\AuthController::class, 'logout']);

    // Which front door does this email belong to? Powers the "you signed in on
    // the wrong page" guidance on the two separate login pages.
    Route::post('portal', [App\Http\Controllers\AuthController::class, 'portalForEmail'])
        ->middleware('throttle:15,1');
<<<<<<< HEAD
=======
=======
| API Routes
|--------------------------------------------------------------------------
*/

// Public/Auth Routes
Route::prefix('auth')->group(function () {
    Route::post('login', [App\Http\Controllers\Api\AuthController::class, 'login']);
    Route::post('logout', [App\Http\Controllers\Api\AuthController::class, 'logout']);
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a
});

// Protected Routes
Route::middleware('auth:sanctum')->group(function () {
<<<<<<< HEAD
=======
<<<<<<< HEAD
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a

    // Session, profile & global utilities — any authenticated user
    Route::get('auth/me', [App\Http\Controllers\AuthController::class, 'me']);
    Route::put('auth/profile', [App\Http\Controllers\AuthController::class, 'updateProfile']);
    Route::post('auth/password', [App\Http\Controllers\AuthController::class, 'changePassword']);
    Route::get('search', [App\Http\Controllers\SearchController::class, 'index']);

    // Notifications (must be before any /notifications/{id} wildcard)
    Route::get('notifications', [App\Http\Controllers\NotificationController::class, 'index']);
    Route::get('notifications/unread-count', [App\Http\Controllers\NotificationController::class, 'unreadCount']);
    Route::post('notifications/read-all', [App\Http\Controllers\NotificationController::class, 'readAll']);
    Route::post('notifications/{id}/read', [App\Http\Controllers\NotificationController::class, 'read']);

    // Settings — read is open to every signed-in user, writes are restricted
    Route::get('settings', [App\Http\Controllers\Admin\SettingsController::class, 'index']);
    Route::put('settings', [App\Http\Controllers\Admin\SettingsController::class, 'update'])
        ->middleware('permission:settings.manage');

    // Dashboard
    Route::get('dashboard', App\Http\Controllers\DashboardController::class)
        ->middleware('permission:dashboard.view');

    // Patients — specific routes BEFORE the resource wildcard
    Route::middleware('permission:patients.view')->group(function () {
        Route::get('patients/summary', [App\Http\Controllers\PatientController::class, 'summary']);
        Route::post('patients/search', [App\Http\Controllers\PatientController::class, 'search']);
        Route::apiResource('patients', App\Http\Controllers\PatientController::class)->only(['index', 'show']);
        Route::get('patients/{patient}/documents', [App\Http\Controllers\PatientController::class, 'documents']);
        Route::get('patients/{patient}/visits', [App\Http\Controllers\PatientController::class, 'visits']);
        Route::get('patients/{patient}/appointments', [App\Http\Controllers\PatientController::class, 'appointments']);
        Route::get('patients/{patient}/prescriptions', [App\Http\Controllers\PatientController::class, 'prescriptions']);
        Route::get('patients/{patient}/invoices', [App\Http\Controllers\PatientController::class, 'invoices']);
        Route::get('patients/{patient}/vitals', [App\Http\Controllers\PatientController::class, 'vitals']);
    });

    Route::middleware('permission:patients.create')->group(function () {
        Route::apiResource('patients', App\Http\Controllers\PatientController::class)->only(['store']);
    });

    Route::middleware('permission:patients.edit')->group(function () {
        Route::apiResource('patients', App\Http\Controllers\PatientController::class)->only(['update']);
        Route::post('patients/{patient}/vitals', [App\Http\Controllers\PatientController::class, 'storeVitals']);
    });

    Route::middleware('permission:patients.delete')->group(function () {
        Route::apiResource('patients', App\Http\Controllers\PatientController::class)->only(['destroy']);
    });

    Route::middleware('permission:patients.documents')->group(function () {
        Route::post('patients/{patient}/documents', [App\Http\Controllers\PatientController::class, 'storeDocument']);
        Route::delete('documents/{document}', [App\Http\Controllers\PatientController::class, 'destroyDocument']);
    });

    // Departments & doctors
    Route::middleware('permission:departments.view')->group(function () {
        Route::apiResource('departments', App\Http\Controllers\DepartmentController::class)->only(['index']);
    });

    Route::middleware('permission:departments.manage')->group(function () {
        Route::apiResource('departments', App\Http\Controllers\DepartmentController::class)->only(['store', 'update', 'destroy']);
    });

    Route::middleware('permission:doctors.view')->group(function () {
        Route::get('doctors/available', [App\Http\Controllers\DoctorController::class, 'available']);
        Route::apiResource('doctors', App\Http\Controllers\DoctorController::class)->only(['index', 'show']);
        Route::get('doctors/{doctor}/schedule', [App\Http\Controllers\DoctorController::class, 'schedule']);
    });

    Route::middleware('permission:doctors.manage')->group(function () {
        Route::apiResource('doctors', App\Http\Controllers\DoctorController::class)->only(['store', 'update', 'destroy']);
        Route::put('doctors/{doctor}/schedule', [App\Http\Controllers\DoctorController::class, 'updateSchedule']);
    });

    // Appointments — specific routes BEFORE the resource wildcard
    Route::middleware('permission:appointments.view')->group(function () {
        Route::get('appointments/today', [App\Http\Controllers\AppointmentController::class, 'today']);
        Route::get('appointments/slots', [App\Http\Controllers\AppointmentController::class, 'slots']);
        Route::get('appointments/queue', [App\Http\Controllers\AppointmentController::class, 'queue']);
        Route::apiResource('appointments', App\Http\Controllers\AppointmentController::class)->only(['index', 'show']);
        Route::post('appointments/{appointment}/call', [App\Http\Controllers\AppointmentController::class, 'call']);
    });

    Route::middleware('permission:appointments.create')->group(function () {
        Route::apiResource('appointments', App\Http\Controllers\AppointmentController::class)->only(['store']);
    });

    Route::middleware('permission:appointments.edit')->group(function () {
        Route::apiResource('appointments', App\Http\Controllers\AppointmentController::class)->only(['update']);
        Route::put('appointments/{appointment}/status', [App\Http\Controllers\AppointmentController::class, 'updateStatus']);
    });

    Route::middleware('permission:appointments.cancel')->group(function () {
        Route::apiResource('appointments', App\Http\Controllers\AppointmentController::class)->only(['destroy']);
    });

    // Visits & Consultations — specific routes BEFORE the resource wildcard
    Route::middleware('permission:consultation.view')->group(function () {
        Route::apiResource('visits', App\Http\Controllers\VisitController::class)->only(['index', 'show']);
        Route::get('visits/{visit}/vitals', [App\Http\Controllers\VisitController::class, 'vitals']);
        Route::get('visits/{visit}/notes', [App\Http\Controllers\VisitController::class, 'notes']);
    });

    // Patient Journey timeline: staff via consultation.view/patients.edit,
    // patients via patients.view (controller still scopes to their own case).
    Route::get('visits/{visit}/timeline', [App\Http\Controllers\VisitController::class, 'timeline'])
        ->middleware('permission:consultation.view,patients.view,patients.edit');

    // Intake: staff via patients.create, patients via self-service guard.
    Route::post('visits/intake', [App\Http\Controllers\VisitController::class, 'intake'])
        ->middleware('permission:patients.create,patients.view');
    Route::put('visits/{visit}/intake', [App\Http\Controllers\VisitController::class, 'updateIntake'])
        ->middleware('permission:patients.edit,patients.view');

    Route::middleware('permission:patients.edit')->group(function () {
        Route::post('visits/{visit}/refer', [App\Http\Controllers\VisitController::class, 'refer']);
    });

    Route::middleware('permission:consultation.create')->group(function () {
        Route::post('visits/{visit}/start-triage', [App\Http\Controllers\VisitController::class, 'startTriage']);
        Route::post('visits/{visit}/complete-triage', [App\Http\Controllers\VisitController::class, 'completeTriage']);
    });

    Route::middleware('permission:consultation.create')->group(function () {
        Route::apiResource('visits', App\Http\Controllers\VisitController::class)->only(['store']);
    });

    Route::middleware('permission:consultation.edit')->group(function () {
        Route::apiResource('visits', App\Http\Controllers\VisitController::class)->only(['update']);
        Route::post('visits/{visit}/complete', [App\Http\Controllers\VisitController::class, 'complete']);
        Route::post('visits/{visit}/vitals', [App\Http\Controllers\VisitController::class, 'storeVitals']);
        Route::post('visits/{visit}/notes', [App\Http\Controllers\VisitController::class, 'storeNote']);
        Route::post('visits/{visit}/start-consultation', [App\Http\Controllers\VisitController::class, 'startConsultation']);
        Route::post('visits/{visit}/lab-reviewed', [App\Http\Controllers\VisitController::class, 'labReviewed']);
        Route::post('visits/{visit}/cancel', [App\Http\Controllers\VisitController::class, 'cancel']);
    });

    // Connected-workflow utilities — any signed-in user; buckets are role-aware.
    Route::get('workflow/summary', [App\Http\Controllers\WorkflowController::class, 'summary']);
    Route::get('departments/suggest', [App\Http\Controllers\WorkflowController::class, 'suggestDepartment'])
        ->middleware('permission:departments.view,patients.create');

    // Prescriptions — specific routes BEFORE the resource wildcard
    Route::middleware('permission:prescriptions.view')->group(function () {
        Route::get('prescriptions/pending', [App\Http\Controllers\PrescriptionController::class, 'pending']);
        Route::get('prescriptions/{prescription}/pdf', [App\Http\Controllers\PrescriptionController::class, 'pdf']);
        Route::apiResource('prescriptions', App\Http\Controllers\PrescriptionController::class)->only(['index', 'show']);
    });

    Route::middleware('permission:prescriptions.create')->group(function () {
        Route::apiResource('prescriptions', App\Http\Controllers\PrescriptionController::class)->only(['store']);
    });

    Route::middleware('permission:prescriptions.create,prescriptions.dispense')->group(function () {
        Route::put('prescriptions/{prescription}/status', [App\Http\Controllers\PrescriptionController::class, 'updateStatus']);
    });

    // Pharmacist handoff: prepare the bill document (medicines + lab costs)
    // from a prescription so the accountant can approve payment. Pharmacists
    // hold prescriptions.* + billing.invoice.create; accountants and
    // receptionists reach it via their billing permission.
    Route::post('prescriptions/{prescription}/invoice', [App\Http\Controllers\PrescriptionController::class, 'invoice'])
        ->middleware('permission:prescriptions.create,prescriptions.dispense,billing.invoice.create');

    // Laboratory — frontend contract paths
    Route::middleware('permission:lab.view')->group(function () {
        Route::apiResource('lab-tests', App\Http\Controllers\Lab\LabTestController::class)->parameters(['lab-tests' => 'test'])->only(['index']);
        Route::get('lab-requests', [App\Http\Controllers\Lab\LabRequestController::class, 'index']);
        Route::get('lab-requests/{request}', [App\Http\Controllers\Lab\LabRequestController::class, 'show']);
        Route::get('lab-requests/{request}/pdf', [App\Http\Controllers\Lab\LabRequestController::class, 'pdf']);
        // Backward-compat alias for the old path used previously
        Route::get('laboratory/tests', [App\Http\Controllers\Lab\LabTestController::class, 'index']);
    });

    Route::middleware('permission:lab.process')->group(function () {
        Route::apiResource('lab-tests', App\Http\Controllers\Lab\LabTestController::class)->parameters(['lab-tests' => 'test'])->only(['store', 'update', 'destroy']);
        Route::post('lab-requests/{request}/start', [App\Http\Controllers\Lab\LabRequestController::class, 'start']);
        Route::post('lab-requests/{request}/results', [App\Http\Controllers\Lab\LabRequestController::class, 'results']);
    });

    Route::middleware('permission:lab.request')->group(function () {
        Route::post('lab-requests', [App\Http\Controllers\Lab\LabRequestController::class, 'store']);
        Route::post('lab-requests/{request}/cancel', [App\Http\Controllers\Lab\LabRequestController::class, 'cancel']);
    });

    // Pharmacy — frontend contract paths
    Route::middleware('permission:pharmacy.view')->group(function () {
        Route::apiResource('medicines', App\Http\Controllers\Pharmacy\MedicineController::class)->only(['index', 'show']);
        Route::apiResource('medicine-categories', App\Http\Controllers\Pharmacy\MedicineCategoryController::class)->parameters(['medicine-categories' => 'category'])->only(['index']);
        Route::apiResource('suppliers', App\Http\Controllers\Pharmacy\SupplierController::class)->only(['index']);
        Route::get('pharmacy/transactions', [App\Http\Controllers\Pharmacy\PharmacyTransactionController::class, 'index']);
        Route::get('pharmacy/alerts', App\Http\Controllers\Pharmacy\PharmacyAlertController::class);
        // Backward-compat alias for the old path used previously
        Route::get('pharmacy/medicines', [App\Http\Controllers\Pharmacy\MedicineController::class, 'index']);
    });

    Route::middleware('permission:pharmacy.manage')->group(function () {
        Route::apiResource('medicines', App\Http\Controllers\Pharmacy\MedicineController::class)->only(['store', 'update', 'destroy']);
        Route::post('medicines/{medicine}/batches', [App\Http\Controllers\Pharmacy\MedicineController::class, 'storeBatch']);
        Route::apiResource('medicine-categories', App\Http\Controllers\Pharmacy\MedicineCategoryController::class)->parameters(['medicine-categories' => 'category'])->only(['store', 'update', 'destroy']);
        Route::apiResource('suppliers', App\Http\Controllers\Pharmacy\SupplierController::class)->only(['store', 'update', 'destroy']);
        // Backward-compat aliases for the old /pharmacy/* paths
        Route::post('pharmacy/medicines', [App\Http\Controllers\Pharmacy\MedicineController::class, 'store']);
        Route::post('pharmacy/medicines/{medicine}/batches', [App\Http\Controllers\Pharmacy\MedicineController::class, 'storeBatch']);
    });

    // Wards & Inpatient
    Route::middleware('permission:wards.view')->group(function () {
        Route::get('wards/beds/availability', [App\Http\Controllers\Ward\WardController::class, 'availability']);
        Route::apiResource('wards', App\Http\Controllers\Ward\WardController::class)->only(['index']);
        Route::get('wards/{ward}', function (App\Models\Ward $ward) {
            $ward->load('rooms.beds');
            return response()->json(['data' => App\Http\Transformers\Transform::ward($ward)]);
        });
        Route::get('wards/{ward}/rooms', [App\Http\Controllers\Ward\RoomController::class, 'index']);
        Route::get('rooms/{room}/beds', function (App\Models\Room $room) {
            $room->load('beds');
            return response()->json(['data' => $room->beds->map(fn ($bed) => App\Http\Transformers\Transform::bed($bed))]);
        });

        Route::get('admissions', [App\Http\Controllers\Ward\AdmissionController::class, 'index']);
        Route::get('admissions/{admission}', [App\Http\Controllers\Ward\AdmissionController::class, 'show']);
        Route::get('admissions/{admission}/pdf', [App\Http\Controllers\Ward\AdmissionController::class, 'pdf']);
    });

    Route::middleware('permission:wards.manage')->group(function () {
        Route::apiResource('wards', App\Http\Controllers\Ward\WardController::class)->only(['store', 'update', 'destroy']);
        Route::post('wards/{ward}/rooms', [App\Http\Controllers\Ward\RoomController::class, 'store']);
        Route::put('wards/{ward}/rooms/{room}', [App\Http\Controllers\Ward\RoomController::class, 'update']);
        Route::delete('wards/{ward}/rooms/{room}', [App\Http\Controllers\Ward\RoomController::class, 'destroy']);
        Route::post('rooms/{room}/beds', [App\Http\Controllers\Ward\RoomController::class, 'storeBed']);
        Route::put('rooms/{room}/beds/{bed}', [App\Http\Controllers\Ward\RoomController::class, 'updateBed']);
        Route::delete('rooms/{room}/beds/{bed}', [App\Http\Controllers\Ward\RoomController::class, 'destroyBed']);
    });

    Route::middleware('permission:wards.admit')->group(function () {
        Route::post('admissions', [App\Http\Controllers\Ward\AdmissionController::class, 'store']);
        Route::put('admissions/{admission}/transfer', [App\Http\Controllers\Ward\AdmissionController::class, 'transfer']);
    });

    Route::middleware('permission:wards.discharge')->group(function () {
        Route::put('admissions/{admission}/discharge', [App\Http\Controllers\Ward\AdmissionController::class, 'discharge']);
    });

    // Billing & Payments
    Route::middleware('permission:billing.view')->group(function () {
        Route::apiResource('services', App\Http\Controllers\Billing\ServiceController::class)->only(['index']);
        Route::apiResource('invoices', App\Http\Controllers\Billing\InvoiceController::class)->only(['index', 'show']);
        Route::get('invoices/{invoice}/pdf', [App\Http\Controllers\Billing\InvoiceController::class, 'pdf']);
        Route::get('billing/summary', App\Http\Controllers\Billing\BillingSummaryController::class);
    });

    Route::middleware('permission:billing.invoice.create')->group(function () {
        Route::post('invoices', [App\Http\Controllers\Billing\InvoiceController::class, 'store']);
    });

    Route::middleware('permission:billing.invoice.edit')->group(function () {
        Route::apiResource('services', App\Http\Controllers\Billing\ServiceController::class)->only(['store', 'update', 'destroy']);
        Route::apiResource('invoices', App\Http\Controllers\Billing\InvoiceController::class)->only(['update']);
    });

    Route::middleware('permission:billing.payment.manage')->group(function () {
        Route::post('invoices/{invoice}/payments', [App\Http\Controllers\Billing\InvoiceController::class, 'storePayment']);
    });

    // The accountant's explicit approval — the gate that releases the
    // medication to the patient.
    Route::middleware('permission:billing.payment.approve')->group(function () {
        Route::post('invoices/{invoice}/approve', [App\Http\Controllers\Billing\InvoiceController::class, 'approve']);
    });

    // Insurance — frontend contract paths
    Route::middleware('permission:insurance.view')->group(function () {
        Route::apiResource('insurance-companies', App\Http\Controllers\Insurance\InsuranceCompanyController::class)->parameters(['insurance-companies' => 'company'])->only(['index']);
        Route::apiResource('patient-insurances', App\Http\Controllers\Insurance\PatientInsuranceController::class)->parameters(['patient-insurances' => 'insurance'])->only(['index']);
        Route::apiResource('insurance-claims', App\Http\Controllers\Insurance\ClaimController::class)->parameters(['insurance-claims' => 'claim'])->only(['index']);
        // Backward-compat alias for the old path used previously
        Route::get('insurance/companies', [App\Http\Controllers\Insurance\InsuranceCompanyController::class, 'index']);
    });

    Route::middleware('permission:insurance.manage')->group(function () {
        Route::apiResource('insurance-companies', App\Http\Controllers\Insurance\InsuranceCompanyController::class)->parameters(['insurance-companies' => 'company'])->only(['store', 'update', 'destroy']);
        Route::apiResource('patient-insurances', App\Http\Controllers\Insurance\PatientInsuranceController::class)->parameters(['patient-insurances' => 'insurance'])->only(['store', 'update']);
        Route::apiResource('insurance-claims', App\Http\Controllers\Insurance\ClaimController::class)->parameters(['insurance-claims' => 'claim'])->only(['store', 'update']);
        Route::put('insurance-claims/{claim}/status', [App\Http\Controllers\Insurance\ClaimController::class, 'updateStatus']);
        // Backward-compat aliases for the old /insurance/* paths
        Route::post('insurance/companies', [App\Http\Controllers\Insurance\InsuranceCompanyController::class, 'store']);
        Route::post('insurance/claims', [App\Http\Controllers\Insurance\ClaimController::class, 'store']);
    });

    // Reports
    Route::middleware('permission:reports.view')->group(function () {
        Route::get('reports/daily-patients', [App\Http\Controllers\ReportController::class, 'dailyPatients']);
        Route::get('reports/appointments', [App\Http\Controllers\ReportController::class, 'appointments']);
        Route::get('reports/revenue', [App\Http\Controllers\ReportController::class, 'revenue']);
        Route::get('reports/pharmacy-sales', [App\Http\Controllers\ReportController::class, 'pharmacySales']);
        Route::get('reports/lab-tests', [App\Http\Controllers\ReportController::class, 'labTests']);
        Route::get('reports/admissions', [App\Http\Controllers\ReportController::class, 'admissions']);
        Route::get('reports/outstanding', [App\Http\Controllers\ReportController::class, 'outstanding']);
        Route::get('reports/doctor-performance', [App\Http\Controllers\ReportController::class, 'doctorPerformance']);
        Route::get('reports/inventory', [App\Http\Controllers\ReportController::class, 'inventory']);
    });

    // Admin & System
    Route::middleware('permission:users.view')->group(function () {
        Route::apiResource('users', App\Http\Controllers\Admin\UserController::class)->only(['index']);
    });

    Route::get('roles', [App\Http\Controllers\Admin\RoleController::class, 'index'])
        ->middleware('permission:users.view,roles.manage');

    Route::middleware('permission:users.create')->group(function () {
        Route::apiResource('users', App\Http\Controllers\Admin\UserController::class)->only(['store']);
        Route::post('users/invite', [App\Http\Controllers\Admin\UserController::class, 'invite']);
    });

    Route::middleware('permission:users.edit')->group(function () {
        Route::apiResource('users', App\Http\Controllers\Admin\UserController::class)->only(['update']);
        Route::post('users/{user}/suspend', [App\Http\Controllers\Admin\UserController::class, 'suspend']);
        Route::post('users/{user}/activate', [App\Http\Controllers\Admin\UserController::class, 'activate']);
        Route::post('users/{user}/password', [App\Http\Controllers\Admin\UserController::class, 'resetPassword']);
        Route::post('users/{user}/invite', [App\Http\Controllers\Admin\UserController::class, 'resendInvite']);
    });

    Route::middleware('permission:users.delete')->group(function () {
        Route::apiResource('users', App\Http\Controllers\Admin\UserController::class)->only(['destroy']);
    });

    Route::middleware('permission:roles.manage')->group(function () {
        Route::apiResource('roles', App\Http\Controllers\Admin\RoleController::class)->only(['store', 'update', 'destroy']);
        Route::get('permissions', [App\Http\Controllers\Admin\RoleController::class, 'permissions']);
    });

    Route::get('audit-logs', [App\Http\Controllers\Admin\AuditLogController::class, 'index'])
        ->middleware('permission:audit.view');
<<<<<<< HEAD
=======
=======
    Route::get('dashboard', App\Http\Controllers\DashboardController::class);
        
        // User & Profile
        Route::get('auth/me', [App\Http\Controllers\Api\AuthController::class, 'me']);
        Route::put('auth/profile', [App\Http\Controllers\Api\AuthController::class, 'updateProfile']);

        // Patients
        Route::apiResource('patients', App\Http\Controllers\Api\PatientController::class);
        Route::get('patients/summary', [App\Http\Controllers\Api\PatientController::class, 'summary']);

        // Departments & doctors
        Route::apiResource('departments', App\Http\Controllers\DepartmentController::class)->except(['show']);
        Route::get('doctors/available', [App\Http\Controllers\DoctorController::class, 'available']);
        Route::apiResource('doctors', App\Http\Controllers\DoctorController::class);
        Route::get('doctors/{doctor}/schedule', [App\Http\Controllers\DoctorController::class, 'schedule']);
        Route::put('doctors/{doctor}/schedule', [App\Http\Controllers\DoctorController::class, 'updateSchedule']);

        // Appointments
        Route::apiResource('appointments', App\Http\Controllers\Api\AppointmentController::class);
        Route::put('appointments/{id}/status', [App\Http\Controllers\Api\AppointmentController::class, 'updateStatus']);
        Route::post('appointments/{id}/call', [App\Http\Controllers\Api\AppointmentController::class, 'callPatient']);

        // Visits & Consultations
        Route::apiResource('visits', App\Http\Controllers\Api\VisitController::class);
        Route::post('visits/{id}/complete', [App\Http\Controllers\Api\VisitController::class, 'complete']);
        Route::post('visits/{id}/vitals', [App\Http\Controllers\Api\VisitController::class, 'storeVitals']);

        // Prescriptions
        Route::apiResource('prescriptions', App\Http\Controllers\Api\PrescriptionController::class);
        Route::put('prescriptions/{id}/status', [App\Http\Controllers\Api\PrescriptionController::class, 'updateStatus']);

        // Laboratory
        Route::get('laboratory/tests', [App\Http\Controllers\Api\LabController::class, 'indexTests']);
        Route::apiResource('lab-requests', App\Http\Controllers\Api\LabController::class);
        Route::post('lab-requests/{id}/start', [App\Http\Controllers\Api\LabController::class, 'start']);
        Route::post('lab-requests/{id}/results', [App\Http\Controllers\Api\LabController::class, 'submitResults']);

        // Wards & Inpatient
        Route::apiResource('wards', App\Http\Controllers\Api\WardController::class);
        Route::get('wards/beds/availability', [App\Http\Controllers\Api\WardController::class, 'getBedsAvailability']);
        Route::post('admissions', [App\Http\Controllers\Api\WardController::class, 'admit']);
        Route::put('admissions/{id}/transfer', [App\Http\Controllers\Api\WardController::class, 'transfer']);
        Route::put('admissions/{id}/discharge', [App\Http\Controllers\Api\WardController::class, 'discharge']);

        // Billing & Payments
        Route::apiResource('services', App\Http\Controllers\Api\BillingController::class);
        Route::apiResource('invoices', App\Http\Controllers\Api\BillingController::class);
        Route::post('invoices/{id}/payments', [App\Http\Controllers\Api\BillingController::class, 'addPayment']);

        // Insurance
        Route::get('insurance/companies', [App\Http\Controllers\Api\InsuranceController::class, 'indexCompanies']);
        Route::post('insurance/companies', [App\Http\Controllers\Api\InsuranceController::class, 'storeCompany']);
        Route::post('insurance/attach', [App\Http\Controllers\Api\InsuranceController::class, 'attachInsurance']);
        Route::post('insurance/claims', [App\Http\Controllers\Api\InsuranceController::class, 'createClaim']);
        Route::put('insurance/claims/{id}/status', [App\Http\Controllers\Api\InsuranceController::class, 'updateClaimStatus']);

        // Pharmacy
        Route::apiResource('suppliers', App\Http\Controllers\Pharmacy\SupplierController::class)->except(['show']);
        Route::get('pharmacy/medicines', [App\Http\Controllers\Api\PharmacyController::class, 'index']);
        Route::post('pharmacy/medicines', [App\Http\Controllers\Api\PharmacyController::class, 'store']);
        Route::post('pharmacy/medicines/{id}/batches', [App\Http\Controllers\Api\PharmacyController::class, 'addBatch']);
        Route::get('pharmacy/alerts', [App\Http\Controllers\Api\PharmacyController::class, 'getAlerts']);
        Route::get('pharmacy/transactions', [App\Http\Controllers\Api\PharmacyController::class, 'transactions']);

        // Admin & System
        Route::apiResource('users', App\Http\Controllers\Api\UserController::class);
        Route::apiResource('roles', App\Http\Controllers\Api\RoleController::class);
        Route::get('permissions', fn () => response()->json([
            'data' => App\Models\Permission::query()->orderBy('group')->orderBy('name')->get(),
        ]));
        Route::get('audit-logs', [App\Http\Controllers\Api\AdminController::class, 'auditLogs']);
        Route::get('settings', [App\Http\Controllers\Api\AdminController::class, 'getSettings']);
        Route::put('settings', [App\Http\Controllers\Api\AdminController::class, 'updateSettings']);
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a
});
