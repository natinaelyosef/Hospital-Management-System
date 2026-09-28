<?php

namespace App\Http\Controllers;

use App\Http\Transformers\Transform;
use App\Models\Appointment;
use App\Models\Doctor;
use App\Models\MedicalNote;
use App\Models\Visit;
use App\Models\VitalSign;
use App\Support\AuditLogger;
use App\Support\GeneratesSequentialNumber;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class VisitController extends Controller
{
    use GeneratesSequentialNumber;

    /**
     * @var list<string>
     */
    private const TYPES = ['opd', 'emergency', 'follow_up'];

    public function index(Request $request): JsonResponse
    {
        $query = Visit::query()->with(['patient', 'doctor.user', 'doctor.department', 'department']);

        if ($request->filled('patient_id')) {
            $query->where('patient_id', $request->input('patient_id'));
        }

        if ($request->filled('doctor_id')) {
            $query->where('doctor_id', $request->input('doctor_id'));
        }

        if ($request->filled('date')) {
            $query->whereDate('visit_date', $request->input('date'));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('search')) {
            $search = trim((string) $request->input('search'));

            $query->where(function ($q) use ($search) {
                $q->where('visit_number', 'like', "%{$search}%")
                    ->orWhereHas('patient', function ($patient) use ($search) {
                        $patient->where(function ($q) use ($search) {
                            $q->where('first_name', 'like', "%{$search}%")
                                ->orWhere('last_name', 'like', "%{$search}%")
                                ->orWhere('phone', 'like', "%{$search}%");
                        });
                    });
            });
        }

        if ($portalId = $this->portalPatientId($request)) {
            $query->where('patient_id', $portalId);
        } elseif ($doctorId = $this->callerDoctorId($request)) {
            $query->where('doctor_id', $doctorId);
        }

        return $this->paginated(
            $request,
            $query->orderByDesc('id'),
            fn (Visit $visit) => Transform::visit($visit)
        );
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'patient_id' => ['required', 'exists:patients,id'],
            'doctor_id' => ['nullable', 'exists:doctors,id'],
            'appointment_id' => ['nullable', 'exists:appointments,id'],
            'visit_date' => ['required', 'date'],
            'type' => ['required', Rule::in(self::TYPES)],
            'chief_complaint' => ['nullable', 'string'],
            'symptoms' => ['nullable', 'string'],
        ]);

        $doctorId = $data['doctor_id'] ?? $request->user()?->doctor?->id;

        if (! $doctorId) {
            return response()->json(['message' => 'Doctor is required to create a visit.'], 422);
        }

        $visit = DB::transaction(function () use ($data, $request, $doctorId) {
            $visit = Visit::create([
                'visit_number' => $this->next('VST', 'visits', 'visit_number'),
                'patient_id' => $data['patient_id'],
                'doctor_id' => $doctorId,
                'appointment_id' => $data['appointment_id'] ?? null,
                'department_id' => Doctor::whereKey($doctorId)->value('department_id'),
                'visit_date' => $data['visit_date'],
                'type' => $data['type'],
                'chief_complaint' => $data['chief_complaint'] ?? null,
                'symptoms' => $data['symptoms'] ?? null,
                'status' => 'in_progress',
                'created_by' => $request->user()?->id,
            ]);

            if ($visit->appointment_id) {
                $appointment = Appointment::find($visit->appointment_id);

                if ($appointment) {
                    $appointment->status = 'in_progress';
                    $appointment->visit_id = $visit->id;
                    $appointment->save();
                }
            }

            return $visit;
        });

        AuditLogger::log('created', "Visit {$visit->visit_number} created", $visit);

        return $this->ok(Transform::visit($visit->load(['patient', 'doctor.user', 'doctor.department', 'department'])));
    }

    public function show(Request $request, Visit $visit): JsonResponse
    {
        if ($denied = $this->denyForeignPatient($request, $visit)) {
            return $denied;
        }

        $visit->load([
            'patient',
            'doctor.user',
            'doctor.department',
            'department',
            'vitalSigns' => fn ($query) => $query->with('recorder')->orderByDesc('recorded_at')->orderByDesc('id'),
            'prescriptions' => fn ($query) => $query->with(['patient', 'doctor.user', 'items', 'dispenser']),
            'labRequests.results.test',
            'medicalNotes.author',
        ]);

        return $this->ok(Transform::visit($visit));
    }

    public function update(Request $request, Visit $visit): JsonResponse
    {
        if ($denied = $this->denyForeignPatient($request, $visit)) {
            return $denied;
        }

        $data = $request->validate([
            'chief_complaint' => ['nullable', 'string'],
            'symptoms' => ['nullable', 'string'],
            'diagnosis' => ['nullable', 'string'],
            'treatment' => ['nullable', 'string'],
            'medical_notes' => ['nullable', 'string'],
            'follow_up_date' => ['nullable', 'date'],
            'type' => ['sometimes', 'required', Rule::in(self::TYPES)],
        ]);

        $old = $visit->only(array_keys($data));

        $visit->fill($data)->save();

        AuditLogger::log('updated', "Visit {$visit->visit_number} updated", $visit, $old, $visit->only(array_keys($data)));

        return $this->ok(Transform::visit($visit->load(['patient', 'doctor.user', 'doctor.department', 'department'])));
    }

    public function complete(Request $request, Visit $visit): JsonResponse
    {
        if ($denied = $this->denyForeignPatient($request, $visit)) {
            return $denied;
        }

        $old = $visit->only(['status', 'diagnosis']);

        if ($request->filled('diagnosis')) {
            $visit->diagnosis = $request->input('diagnosis');
        }

        if (! trim((string) ($visit->diagnosis ?? ''))) {
            return response()->json(['message' => 'Diagnosis is required to complete a visit'], 422);
        }

        $visit->status = 'completed';
        $visit->save();

        if ($visit->appointment_id) {
            $appointment = Appointment::find($visit->appointment_id);

            if ($appointment) {
                $appointment->status = 'completed';
                $appointment->save();
            }
        }

        AuditLogger::log('completed', "Visit {$visit->visit_number} completed", $visit, $old, $visit->only(['status', 'diagnosis']));

        return $this->ok(Transform::visit($visit->load(['patient', 'doctor.user', 'doctor.department', 'department'])));
    }

    public function vitals(Request $request, Visit $visit): JsonResponse
    {
        if ($denied = $this->denyForeignPatient($request, $visit)) {
            return $denied;
        }

        $query = VitalSign::query()
            ->where('visit_id', $visit->id)
            ->with('recorder')
            ->orderByDesc('recorded_at')
            ->orderByDesc('id');

        return $this->collection($query->get(), fn (VitalSign $vital) => Transform::vitalSign($vital));
    }

    public function storeVitals(Request $request, Visit $visit): JsonResponse
    {
        if ($denied = $this->denyForeignPatient($request, $visit)) {
            return $denied;
        }

        $data = $request->validate([
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

        $vital = VitalSign::create($data + [
            'patient_id' => $visit->patient_id,
            'visit_id' => $visit->id,
            'recorded_by' => $request->user()?->id,
        ]);

        AuditLogger::log('created', "Vitals recorded for visit {$visit->visit_number}", $vital);

        return $this->ok(Transform::vitalSign($vital->load('recorder')));
    }

    public function notes(Request $request, Visit $visit): JsonResponse
    {
        if ($denied = $this->denyForeignPatient($request, $visit)) {
            return $denied;
        }

        $query = MedicalNote::query()
            ->where('visit_id', $visit->id)
            ->with('author')
            ->orderByDesc('created_at')
            ->orderByDesc('id');

        return $this->collection($query->get(), fn (MedicalNote $note) => Transform::medicalNote($note));
    }

    public function storeNote(Request $request, Visit $visit): JsonResponse
    {
        if ($denied = $this->denyForeignPatient($request, $visit)) {
            return $denied;
        }

        $data = $request->validate([
            'note_type' => ['required', Rule::in(['progress', 'nursing', 'general'])],
            'content' => ['required', 'string'],
        ]);

        $note = MedicalNote::create([
            'visit_id' => $visit->id,
            'patient_id' => $visit->patient_id,
            'author_id' => $request->user()?->id,
            'note_type' => $data['note_type'],
            'content' => $data['content'],
        ]);

        AuditLogger::log('created', "Note added to visit {$visit->visit_number}", $note);

        return $this->ok(Transform::medicalNote($note->load('author')));
    }

    /**
     * Patient-portal callers may only touch their own visits.
     */
    private function denyForeignPatient(Request $request, Visit $visit): ?JsonResponse
    {
        $portalId = $this->portalPatientId($request);

        if ($portalId !== null && $portalId !== $visit->patient_id) {
            return response()->json(['message' => 'This action is unauthorized.'], 403);
        }

        return null;
    }

    /**
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
     * Doctors only see their own visits (admins see everything).
     */
    private function callerDoctorId(Request $request): ?int
    {
        $user = $request->user();

        if (! $user || $user->role?->name === 'admin') {
            return null;
        }

        if ($user->doctor_id) {
            return (int) $user->doctor_id;
        }

        return $user->doctor?->id;
    }
}
