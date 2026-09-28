<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// Public/Auth Routes
Route::prefix('auth')->group(function () {
    Route::post('login', [App\Http\Controllers\Api\AuthController::class, 'login']);
    Route::post('logout', [App\Http\Controllers\Api\AuthController::class, 'logout']);
});

// Protected Routes
Route::middleware('auth:sanctum')->group(function () {
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
});
