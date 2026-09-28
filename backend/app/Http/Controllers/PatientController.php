<?php

namespace App\Http\Controllers;

use App\Http\Transformers\Transform;
use App\Models\Appointment;
use App\Models\Invoice;
use App\Models\Patient;
use App\Models\PatientDocument;
use App\Models\Prescription;
use App\Models\Role;
use App\Models\User;
use App\Models\Visit;
use App\Models\VitalSign;
use App\Support\AuditLogger;
use App\Support\GeneratesSequentialNumber;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class PatientController extends Controller
{
    use GeneratesSequentialNumber;

    public function index(Request $request): JsonResponse
    {
        $query = Patient::query();

        if ($request->filled('search')) {
            $search = trim((string) $request->input('search'));

            $query->where(function ($q) use ($search) {
                $q->where('patient_number', 'like', "%{$search}%")
                    ->orWhere('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        if ($request->filled('gender')) {
            $query->where('gender', $request->input('gender'));
        }

        if ($request->filled('blood_group')) {
            $query->where('blood_group', $request->input('blood_group'));
        }

        if ($portalId = $this->portalPatientId($request)) {
            $query->where('id', $portalId);
        }

        return $this->paginated(
            $request,
            $query->orderByDesc('id'),
            fn (Patient $patient) => Transform::patient($patient)
        );
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'first_name' => ['required', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            'gender' => ['required', Rule::in(['male', 'female', 'other'])],
            'date_of_birth' => ['required', 'date', 'before_or_equal:today'],
            'phone' => ['required', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255', 'unique:patients,email'],
            'blood_group' => ['nullable', Rule::in(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'])],
            'allergies' => ['nullable', 'string'],
            'medical_history' => ['nullable', 'string'],
            'address' => ['nullable', 'string'],
            'emergency_contact_name' => ['nullable', 'string', 'max:255'],
            'emergency_contact_phone' => ['nullable', 'string', 'max:255'],
            'create_user' => ['nullable', 'boolean'],
            'password' => ['nullable', 'string', 'min:6'],
        ]);

        $createUser = $request->boolean('create_user');
        $password = $data['password'] ?? null;
        $email = $data['email'] ?? null;
        unset($data['create_user'], $data['password']);

<<<<<<< HEAD
=======
<<<<<<< HEAD
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a
        $duplicate = Patient::query()->where('phone', $data['phone'])->first();

        if ($duplicate) {
            return response()->json([
                'message' => "A patient with this phone number already exists ({$duplicate->patient_number}). Open that record instead of registering twice.",
                'patient_id' => $duplicate->id,
                'patient_number' => $duplicate->patient_number,
            ], 422);
        }

<<<<<<< HEAD
=======
=======
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a
        $patient = DB::transaction(function () use ($data, $request, $createUser, $password, $email) {
            if ($createUser && filled($email)) {
                $user = User::create([
                    'name' => trim($data['first_name'].' '.$data['last_name']),
                    'email' => $email,
                    'password' => Hash::make($password ?? str()->random(12)),
                    'phone' => $data['phone'],
                    'role_id' => Role::where('name', 'patient')->value('id'),
                ]);

                $data['user_id'] = $user->id;
            }

            $data['patient_number'] = $this->next('P', 'patients', 'patient_number');
            $data['registered_by'] = $request->user()?->id;

            return Patient::create($data);
        });

        AuditLogger::log('created', "Patient created #{$patient->patient_number}", $patient);

        return $this->ok(Transform::patient($patient));
    }

    public function show(Request $request, Patient $patient): JsonResponse
    {
        if ($denied = $this->denyForeignPatient($request, $patient)) {
            return $denied;
        }

        return $this->ok(Transform::patient($patient));
    }

    public function update(Request $request, Patient $patient): JsonResponse
    {
        if ($denied = $this->denyForeignPatient($request, $patient)) {
            return $denied;
        }

        $data = $request->validate([
            'first_name' => ['sometimes', 'required', 'string', 'max:255'],
            'last_name' => ['sometimes', 'required', 'string', 'max:255'],
            'gender' => ['sometimes', 'required', Rule::in(['male', 'female', 'other'])],
            'date_of_birth' => ['sometimes', 'required', 'date', 'before_or_equal:today'],
            'phone' => ['sometimes', 'required', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255', Rule::unique('patients', 'email')->ignore($patient->id)],
            'blood_group' => ['nullable', Rule::in(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'])],
            'allergies' => ['nullable', 'string'],
            'medical_history' => ['nullable', 'string'],
            'address' => ['nullable', 'string'],
            'emergency_contact_name' => ['nullable', 'string', 'max:255'],
            'emergency_contact_phone' => ['nullable', 'string', 'max:255'],
        ]);

        $old = $patient->only(array_keys($data));

        $patient->fill($data)->save();

        AuditLogger::log('updated', "Patient #{$patient->patient_number} updated", $patient, $old, $patient->only(array_keys($data)));

        return $this->ok(Transform::patient($patient));
    }

    public function destroy(Request $request, Patient $patient): JsonResponse
    {
        $hasFutureAppointments = $patient->appointments()
            ->whereDate('appointment_date', '>=', today())
            ->whereNotIn('status', ['cancelled', 'no_show', 'completed'])
            ->exists();

        if ($hasFutureAppointments) {
            return response()->json([
                'message' => 'Patient has upcoming appointments and cannot be deleted.',
            ], 400);
        }

        $hasActiveAdmission = $patient->admissions()
            ->whereIn('status', ['admitted', 'transferred'])
            ->exists();

        if ($hasActiveAdmission) {
            return response()->json([
                'message' => 'Patient has an active admission and cannot be deleted.',
            ], 400);
        }

        $number = $patient->patient_number;

        $patient->delete();

        AuditLogger::log('deleted', "Patient #{$number} deleted");

        return $this->message("Patient #{$number} deleted.");
    }

    public function search(Request $request): JsonResponse
    {
        $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
        ]);

        $query = Patient::query()->orderBy('patient_number');

        if ($request->filled('search')) {
            $search = trim((string) $request->input('search'));

            $query->where(function ($q) use ($search) {
                $q->where('patient_number', 'like', "%{$search}%")
                    ->orWhere('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        if ($portalId = $this->portalPatientId($request)) {
            $query->where('id', $portalId);
        }

        return $this->collection(
            $query->limit(10)->get(),
            fn (Patient $patient) => Transform::patient($patient)
        );
    }

    public function summary(Request $request): JsonResponse
    {
        return $this->ok([
            'total' => Patient::count(),
            'male' => Patient::where('gender', 'male')->count(),
            'female' => Patient::where('gender', 'female')->count(),
            'today' => Patient::whereDate('created_at', today())->count(),
        ]);
    }

    public function documents(Request $request, Patient $patient): JsonResponse
    {
        if ($denied = $this->denyForeignPatient($request, $patient)) {
            return $denied;
        }

        $query = PatientDocument::query()
            ->where('patient_id', $patient->id)
            ->with('uploader')
            ->orderByDesc('id');

        return $this->paginated($request, $query, fn (PatientDocument $document) => $this->documentShape($document));
    }

    public function storeDocument(Request $request, Patient $patient): JsonResponse
    {
        if ($denied = $this->denyForeignPatient($request, $patient)) {
            return $denied;
        }

        $request->validate([
            'file' => ['required', 'file', 'max:5102', 'mimes:pdf,jpg,jpeg,png,docx'],
            'name' => ['nullable', 'string', 'max:255'],
        ]);

        $file = $request->file('file');
        $path = $file->store('patients/documents', 'public');

        $document = PatientDocument::create([
            'patient_id' => $patient->id,
            'name' => $request->input('name') ?: $file->getClientOriginalName(),
            'file_path' => $path,
            'mime_type' => $file->getClientMimeType(),
            'size' => (int) $file->getSize(),
            'uploaded_by' => $request->user()?->id,
        ]);

        AuditLogger::log('created', "Document {$document->name} uploaded for patient #{$patient->patient_number}", $document);

        return $this->ok($this->documentShape($document->load('uploader')));
    }

    public function destroyDocument(Request $request, PatientDocument $document): JsonResponse
    {
        if ($document->file_path && Storage::disk('public')->exists($document->file_path)) {
            Storage::disk('public')->delete($document->file_path);
        }

        $name = $document->name;

        $document->delete();

        AuditLogger::log('deleted', "Document {$name} deleted");

        return $this->message("Document {$name} deleted.");
    }

    public function visits(Request $request, Patient $patient): JsonResponse
    {
        if ($denied = $this->denyForeignPatient($request, $patient)) {
            return $denied;
        }

        $query = Visit::query()
            ->where('patient_id', $patient->id)
            ->with(['patient', 'doctor.user', 'doctor.department', 'department'])
            ->orderByDesc('id');

        return $this->paginated($request, $query, fn (Visit $visit) => Transform::visit($visit));
    }

    public function appointments(Request $request, Patient $patient): JsonResponse
    {
        if ($denied = $this->denyForeignPatient($request, $patient)) {
            return $denied;
        }

        $query = Appointment::query()
            ->where('patient_id', $patient->id)
            ->with(['patient', 'doctor.user', 'doctor.department', 'department'])
            ->orderByDesc('appointment_date')
            ->orderByDesc('start_time');

        return $this->paginated($request, $query, fn (Appointment $appointment) => Transform::appointment($appointment));
    }

    public function prescriptions(Request $request, Patient $patient): JsonResponse
    {
        if ($denied = $this->denyForeignPatient($request, $patient)) {
            return $denied;
        }

        $query = Prescription::query()
            ->where('patient_id', $patient->id)
            ->with(['patient', 'doctor.user', 'doctor.department', 'items', 'dispenser'])
            ->orderByDesc('id');

        return $this->paginated($request, $query, fn (Prescription $prescription) => Transform::prescription($prescription));
    }

    public function invoices(Request $request, Patient $patient): JsonResponse
    {
        if ($denied = $this->denyForeignPatient($request, $patient)) {
            return $denied;
        }

        $query = Invoice::query()
            ->where('patient_id', $patient->id)
            ->with(['patient', 'issuer', 'items', 'payments'])
            ->orderByDesc('id');

        return $this->paginated($request, $query, fn (Invoice $invoice) => Transform::invoice($invoice));
    }

    public function vitals(Request $request, Patient $patient): JsonResponse
    {
        if ($denied = $this->denyForeignPatient($request, $patient)) {
            return $denied;
        }

        $query = VitalSign::query()
            ->where('patient_id', $patient->id)
            ->with('recorder')
            ->orderByDesc('recorded_at')
            ->orderByDesc('id');

        return $this->paginated($request, $query, fn (VitalSign $vital) => Transform::vitalSign($vital));
    }

    public function storeVitals(Request $request, Patient $patient): JsonResponse
    {
        if ($denied = $this->denyForeignPatient($request, $patient)) {
            return $denied;
        }

        $data = $this->validateVitals($request);

        $vital = VitalSign::create($data + [
            'patient_id' => $patient->id,
            'recorded_by' => $request->user()?->id,
        ]);

        AuditLogger::log('created', "Vitals recorded for patient #{$patient->patient_number}", $vital);

        return $this->ok(Transform::vitalSign($vital->load('recorder')));
    }

    /**
     * Shared vital-signs validation (nurse triage / visit vitals).
     *
     * @return array<string, mixed>
     */
    protected function validateVitals(Request $request): array
    {
        return $request->validate([
            'bp_systolic' => ['nullable', 'numeric'],
            'bp_diastolic' => ['nullable', 'numeric'],
            'temperature' => ['nullable', 'numeric'],
            'pulse' => ['nullable', 'numeric'],
            'oxygen_saturation' => ['nullable', 'numeric'],
            'weight' => ['nullable', 'numeric'],
            'height' => ['nullable', 'numeric'],
            'respiratory_rate' => ['nullable', 'numeric'],
            'notes' => ['nullable', 'string'],
            'recorded_at' => ['nullable', 'date'],
        ]);
    }

    /**
     * Patient-portal callers may only touch their own record.
     */
    private function denyForeignPatient(Request $request, Patient $patient): ?JsonResponse
    {
        $portalId = $this->portalPatientId($request);

        if ($portalId !== null && $portalId !== $patient->id) {
            return response()->json(['message' => 'This action is unauthorized.'], 403);
        }

        return null;
    }

    /**
<<<<<<< HEAD
=======
<<<<<<< HEAD
=======
     * Id of the patients row owned by the caller (null for staff accounts).
     */
    private function portalPatientId(Request $request): ?int
    {
        $user = $request->user();

        if (! $user) {
            return null;
        }

        if ($this->isPatientPortal($request)) {
            return (int) $user->patient_id;
        }

        return $user->patient?->id;
    }

    /**
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a
     * @return array<string, mixed>
     */
    private function documentShape(PatientDocument $document): array
    {
        return [
            'id' => $document->id,
            'patient_id' => $document->patient_id,
            'name' => $document->name,
            'file_path' => $document->file_path,
            'file_url' => $document->file_path ? Storage::disk('public')->url($document->file_path) : null,
            'mime_type' => $document->mime_type,
            'size' => (int) $document->size,
            'uploaded_by' => $document->uploaded_by,
            'uploader' => $document->uploader
                ? ['id' => $document->uploader->id, 'name' => $document->uploader->name]
                : null,
            'created_at' => $document->created_at?->toIso8601String(),
        ];
    }
}
