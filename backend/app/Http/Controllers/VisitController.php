<?php

namespace App\Http\Controllers;

use App\Http\Transformers\Transform;
use App\Models\Appointment;
use App\Models\Department;
use App\Models\Doctor;
use App\Models\MedicalNote;
use App\Models\Patient;
use App\Models\Visit;
use App\Models\VitalSign;
use App\Support\AuditLogger;
use App\Support\GeneratesSequentialNumber;
use App\Support\VisitWorkflow;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use InvalidArgumentException;

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

        if ($request->filled('department_id')) {
            $query->where('department_id', (int) $request->input('department_id'));
        }

        if ($request->filled('priority')) {
            $query->where('priority', $request->input('priority'));
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

    /**
     * Direct clinical creation (doctor/admin): opens straight at the
     * consultation stage with a creation history entry.
     */
    public function store(Request $request, VisitWorkflow $flow): JsonResponse
    {
        $data = $request->validate([
            'patient_id' => ['required', 'exists:patients,id'],
            'doctor_id' => ['nullable', 'exists:doctors,id'],
            'appointment_id' => ['nullable', 'exists:appointments,id'],
            'department_id' => ['nullable', 'exists:departments,id'],
            'visit_date' => ['nullable', 'date'],
            'type' => ['required', Rule::in(self::TYPES)],
            'priority' => ['sometimes', Rule::in(Visit::PRIORITIES)],
            'chief_complaint' => ['nullable', 'string'],
            'symptoms' => ['nullable', 'string'],
            'symptom_duration' => ['nullable', 'string', 'max:100'],
            'severity' => ['nullable', Rule::in(Visit::SEVERITIES)],
            'previous_conditions' => ['nullable', 'string'],
            'current_medications' => ['nullable', 'string'],
            'intake_notes' => ['nullable', 'string'],
            'diagnosis' => ['nullable', 'string'],
            'treatment' => ['nullable', 'string'],
            'medical_notes' => ['nullable', 'string'],
            'follow_up_date' => ['nullable', 'date'],
        ]);

        $doctorId = $data['doctor_id'] ?? $request->user()?->doctor?->id;

        if (! $doctorId) {
            return response()->json(['message' => 'Doctor is required to create a visit.'], 422);
        }

        $visit = DB::transaction(function () use ($data, $request, $doctorId, $flow) {
            $visit = Visit::create([
                'visit_number' => $this->next('VST', 'visits', 'visit_number'),
                'patient_id' => $data['patient_id'],
                'doctor_id' => $doctorId,
                'appointment_id' => $data['appointment_id'] ?? null,
                'department_id' => $data['department_id'] ?? Doctor::whereKey($doctorId)->value('department_id'),
                'visit_date' => $data['visit_date'] ?? today()->toDateString(),
                'type' => $data['type'],
                'priority' => $data['priority'] ?? 'normal',
                'chief_complaint' => $data['chief_complaint'] ?? null,
                'symptoms' => $data['symptoms'] ?? null,
                'symptom_duration' => $data['symptom_duration'] ?? null,
                'severity' => $data['severity'] ?? null,
                'previous_conditions' => $data['previous_conditions'] ?? null,
                'current_medications' => $data['current_medications'] ?? null,
                'intake_notes' => $data['intake_notes'] ?? null,
                'diagnosis' => $data['diagnosis'] ?? null,
                'treatment' => $data['treatment'] ?? null,
                'medical_notes' => $data['medical_notes'] ?? null,
                'follow_up_date' => $data['follow_up_date'] ?? null,
                'status' => 'in_consultation',
                'created_by' => $request->user()?->id,
            ]);

            $flow->logCreation($visit, $request->user(), 'Direct consultation opened.');

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

        return $this->ok(Transform::visit($visit->load(['patient', 'doctor.user', 'doctor.department', 'department'])));
    }

    /**
     * Patient Complaint / Initial Assessment (spec §2). Reception records
     * symptoms and triage info and optionally vitals — never a diagnosis
     * (those fields are not accepted here by design). Patients may record
     * their own intake; staff need patients.create.
     */
    public function intake(Request $request, VisitWorkflow $flow): JsonResponse
    {
        $data = $request->validate([
            'patient_id' => ['required', 'exists:patients,id'],
            'type' => ['required', Rule::in(self::TYPES)],
            'priority' => ['sometimes', Rule::in(Visit::PRIORITIES)],
            'chief_complaint' => ['required', 'string'],
            'symptoms' => ['nullable', 'string'],
            'symptom_duration' => ['nullable', 'string', 'max:100'],
            'severity' => ['nullable', Rule::in(Visit::SEVERITIES)],
            'previous_conditions' => ['nullable', 'string'],
            'current_medications' => ['nullable', 'string'],
            'allergies' => ['nullable', 'string'],
            'intake_notes' => ['nullable', 'string'],
            'department_id' => ['nullable', 'exists:departments,id'],
            'visit_date' => ['nullable', 'date'],
            'vitals' => ['nullable', 'array'],
            'vitals.bp_systolic' => ['nullable', 'numeric'],
            'vitals.bp_diastolic' => ['nullable', 'numeric'],
            'vitals.temperature' => ['nullable', 'numeric'],
            'vitals.pulse' => ['nullable', 'numeric'],
            'vitals.oxygen_saturation' => ['nullable', 'numeric'],
            'vitals.weight' => ['nullable', 'numeric'],
            'vitals.height' => ['nullable', 'numeric'],
            'vitals.respiratory_rate' => ['nullable', 'numeric'],
            'vitals.notes' => ['nullable', 'string'],
        ]);

        if ($denied = $this->denyForeignIntake($request, (int) $data['patient_id'])) {
            return $denied;
        }

        $active = Visit::query()
            ->where('patient_id', $data['patient_id'])
            ->whereNotIn('status', Visit::TERMINAL)
            ->latest('id')
            ->first();

        if ($active) {
            return response()->json([
                'message' => "This patient already has an active case ({$active->visit_number}). Complete or cancel it before opening a new intake.",
                'visit_id' => $active->id,
                'visit_number' => $active->visit_number,
                'status' => $active->status,
            ], 422);
        }

        $visit = DB::transaction(function () use ($data, $request, $flow) {
            $visit = Visit::create([
                'visit_number' => $this->next('VST', 'visits', 'visit_number'),
                'patient_id' => $data['patient_id'],
                'doctor_id' => null,
                'department_id' => $data['department_id'] ?? null,
                'visit_date' => $data['visit_date'] ?? today()->toDateString(),
                'type' => $data['type'],
                'priority' => $data['priority'] ?? 'normal',
                'chief_complaint' => $data['chief_complaint'],
                'symptoms' => $data['symptoms'] ?? null,
                'symptom_duration' => $data['symptom_duration'] ?? null,
                'severity' => $data['severity'] ?? null,
                'previous_conditions' => $data['previous_conditions'] ?? null,
                'current_medications' => $data['current_medications'] ?? null,
                'intake_notes' => $data['intake_notes'] ?? null,
                'status' => 'registered',
                'created_by' => $request->user()?->id,
            ]);

            $flow->logCreation($visit, $request->user(), 'Case registered.');

            if (! empty($data['vitals']) && is_array($data['vitals'])) {
                VitalSign::create(array_filter($data['vitals'], fn ($v) => $v !== null) + [
                    'patient_id' => $visit->patient_id,
                    'visit_id' => $visit->id,
                    'recorded_by' => $request->user()?->id,
                ]);
            }

            if (array_key_exists('allergies', $data) && $data['allergies'] !== null) {
                $patient = Patient::find($visit->patient_id);

                if ($patient && ! trim((string) $patient->allergies)) {
                    $patient->allergies = $data['allergies'];
                    $patient->save();
                }
            }

            $flow->transition($visit->fresh(), 'intake_completed', $request->user(), 'Initial assessment recorded.');

            return $visit->fresh();
        });

        $visit->load(['patient', 'doctor.user', 'doctor.department', 'department']);

        return $this->ok([
            'visit' => Transform::visit($visit),
            'suggested_departments' => $flow->suggestDepartments(
                trim(($data['chief_complaint'] ?? '').' '.($data['symptoms'] ?? ''))
            ),
        ], 201);
    }

    /**
     * Correct the intake record. Diagnosis/treatment stay doctor-only: they
     * are deliberately not accepted here.
     */
    public function updateIntake(Request $request, Visit $visit, VisitWorkflow $flow): JsonResponse
    {
        if ($denied = $this->denyForeignPatient($request, $visit)) {
            return $denied;
        }

        if ($denied = $this->denyForeignIntake($request, $visit->patient_id)) {
            return $denied;
        }

        if (! in_array($visit->status, ['registered', 'intake_completed'], true)) {
            return response()->json(['message' => 'Intake can only be edited before the case is referred.'], 422);
        }

        $data = $request->validate([
            'chief_complaint' => ['sometimes', 'required', 'string'],
            'symptoms' => ['nullable', 'string'],
            'symptom_duration' => ['nullable', 'string', 'max:100'],
            'severity' => ['nullable', Rule::in(Visit::SEVERITIES)],
            'previous_conditions' => ['nullable', 'string'],
            'current_medications' => ['nullable', 'string'],
            'intake_notes' => ['nullable', 'string'],
            'priority' => ['sometimes', Rule::in(Visit::PRIORITIES)],
            'type' => ['sometimes', 'required', Rule::in(self::TYPES)],
        ]);

        $old = $visit->only(array_keys($data));
        $visit->fill($data)->save();

        AuditLogger::log('updated', "Intake for visit {$visit->visit_number} corrected", $visit, $old, $visit->only(array_keys($data)));

        return $this->ok(Transform::visit($visit->load(['patient', 'doctor.user', 'doctor.department', 'department'])));
    }

    /**
     * Reception routes the case to a department (spec §3), optionally naming
     * a doctor. Re-referring moves the case (department correction).
     */
    public function refer(Request $request, Visit $visit, VisitWorkflow $flow): JsonResponse
    {
        if ($denied = $this->denyForeignPatient($request, $visit)) {
            return $denied;
        }

        $data = $request->validate([
            'department_id' => ['required', 'exists:departments,id'],
            'doctor_id' => ['nullable', 'exists:doctors,id'],
            'priority' => ['sometimes', Rule::in(Visit::PRIORITIES)],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        // Smooth handoff guard: a named doctor must actually belong to the
        // receiving department, otherwise reception would mis-route the case.
        if (! empty($data['doctor_id'])) {
            $doctorDepartmentId = Doctor::whereKey($data['doctor_id'])->value('department_id');

            if ($doctorDepartmentId && (int) $doctorDepartmentId !== (int) $data['department_id']) {
                return response()->json([
                    'message' => 'The selected doctor does not belong to the selected department. Choose a doctor from that department or leave the doctor empty to route to the department pool (nurse triage first).',
                    'errors' => ['doctor_id' => ['The selected doctor does not belong to the selected department.']],
                ], 422);
            }
        }

        try {
            $visit = $flow->transition($visit, 'referred', $request->user(), trim(sprintf(
                'Referred to %s%s',
                Department::whereKey($data['department_id'])->value('name') ?? 'department',
                $data['notes'] ?? '' ? " — {$data['notes']}" : ''
            )), [
                'department_id' => $data['department_id'],
                'doctor_id' => $data['doctor_id'] ?? $visit->doctor_id,
                'priority' => $data['priority'] ?? $visit->priority,
                'referred_by' => $request->user()?->id,
                'referred_at' => now(),
            ]);
        } catch (InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return $this->ok(Transform::visit($visit->load(['patient', 'doctor.user', 'doctor.department', 'department'])));
    }

    /**
     * Nurse picks the referred case up for triage.
     */
    public function startTriage(Request $request, Visit $visit, VisitWorkflow $flow): JsonResponse
    {
        try {
            $visit = $flow->transition($visit, 'waiting_for_nurse', $request->user(), 'Triage started.');
        } catch (InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return $this->ok(Transform::visit($visit->load(['patient', 'doctor.user', 'doctor.department', 'department'])));
    }

    /**
     * Nurse finishes assessment: requires recorded vitals, then queues the
     * case for the doctor automatically.
     */
    public function completeTriage(Request $request, Visit $visit, VisitWorkflow $flow): JsonResponse
    {
        $data = $request->validate([
            'priority' => ['sometimes', Rule::in(Visit::PRIORITIES)],
            'note' => ['nullable', 'string', 'max:500'],
        ]);

        if (! $visit->vitalSigns()->exists()) {
            return response()->json(['message' => 'Record vital signs before completing triage.'], 422);
        }

        try {
            $visit = $flow->transition(
                $visit,
                'nurse_assessment_completed',
                $request->user(),
                $data['note'] ?? 'Nurse assessment completed.',
                ['priority' => $data['priority'] ?? $visit->priority]
            );
            $visit = $flow->transition($visit, 'waiting_for_doctor', $request->user(), 'Queued for doctor.');
        } catch (InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return $this->ok(Transform::visit($visit->load(['patient', 'doctor.user', 'doctor.department', 'department'])));
    }

    /**
     * The assigned doctor (or an admin override) opens the consultation. A
     * doctor acting on an unassigned case becomes its doctor.
     */
    public function startConsultation(Request $request, Visit $visit, VisitWorkflow $flow): JsonResponse
    {
        if ($denied = $this->denyDoctorAction($request, $visit)) {
            return $denied;
        }

        $attributes = [];

        if (! $visit->doctor_id && $request->user()?->doctor) {
            $attributes['doctor_id'] = $request->user()->doctor->id;
        }

        try {
            $visit = $flow->transition($visit, 'in_consultation', $request->user(), 'Consultation started.', $attributes);
        } catch (InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return $this->ok(Transform::visit($visit->load(['patient', 'doctor.user', 'doctor.department', 'department'])));
    }

    /**
     * Doctor confirms lab review. The case returns straight to the consultation
     * so the doctor can prescribe (or order a second round of tests) without
     * reopening the consultation. Patients with no assigned doctor go back to
     * the doctor queue instead.
     */
    public function labReviewed(Request $request, Visit $visit, VisitWorkflow $flow): JsonResponse
    {
        if ($denied = $this->denyDoctorAction($request, $visit)) {
            return $denied;
        }

        $data = $request->validate(['note' => ['nullable', 'string', 'max:500']]);

        $attributes = [];
        if (! $visit->doctor_id && $request->user()?->doctor) {
            $attributes['doctor_id'] = $request->user()->doctor->id;
        }

        $to = $visit->doctor_id || $request->user()?->doctor ? 'in_consultation' : 'waiting_for_doctor';

        try {
            $visit = $flow->transition(
                $visit,
                $to,
                $request->user(),
                $data['note'] ?? 'Lab results reviewed — back with the doctor.',
                $attributes,
            );
        } catch (InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return $this->ok(Transform::visit($visit->load(['patient', 'doctor.user', 'doctor.department', 'department'])));
    }

    /**
     * Cancel a case that never reached a terminal stage.
     */
    public function cancel(Request $request, Visit $visit, VisitWorkflow $flow): JsonResponse
    {
        $data = $request->validate(['note' => ['nullable', 'string', 'max:500']]);

        try {
            $visit = $flow->transition($visit, 'cancelled', $request->user(), $data['note'] ?? 'Case cancelled.');
        } catch (InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        if ($visit->appointment_id) {
            Appointment::whereKey($visit->appointment_id)->update(['status' => 'cancelled']);
        }

        return $this->ok(Transform::visit($visit->load(['patient', 'doctor.user', 'doctor.department', 'department'])));
    }

    /**
     * Patient Journey timeline: the immutable handoff history, oldest first.
     */
    public function timeline(Request $request, Visit $visit, VisitWorkflow $flow): JsonResponse
    {
        if ($denied = $this->denyForeignPatient($request, $visit)) {
            return $denied;
        }

        return $this->ok($flow->timeline($visit));
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
            'symptom_duration' => ['nullable', 'string', 'max:100'],
            'severity' => ['nullable', Rule::in(Visit::SEVERITIES)],
            'previous_conditions' => ['nullable', 'string'],
            'current_medications' => ['nullable', 'string'],
            'intake_notes' => ['nullable', 'string'],
            'priority' => ['sometimes', Rule::in(Visit::PRIORITIES)],
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

    public function complete(Request $request, Visit $visit, VisitWorkflow $flow): JsonResponse
    {
        if ($denied = $this->denyForeignPatient($request, $visit)) {
            return $denied;
        }

        $data = $request->validate([
            'diagnosis' => ['nullable', 'string'],
            'note' => ['nullable', 'string', 'max:500'],
        ]);

        $diagnosis = $data['diagnosis'] ?? $visit->diagnosis;

        if (! trim((string) ($diagnosis ?? ''))) {
            return response()->json(['message' => 'Diagnosis is required to complete a visit'], 422);
        }

        try {
            $visit = $flow->transition(
                $visit,
                'visit_completed',
                $request->user(),
                $data['note'] ?? 'Visit completed.',
                ['diagnosis' => $diagnosis]
            );
        } catch (InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        if ($visit->appointment_id) {
            $appointment = Appointment::find($visit->appointment_id);

            if ($appointment) {
                $appointment->status = 'completed';
                $appointment->save();
            }
        }

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
     * Intake is staff work (patients.create) except that a patient-portal
     * user may record their own complaint.
     */
    private function denyForeignIntake(Request $request, int $patientId): ?JsonResponse
    {
        if ($this->allows($request, 'patients.create')) {
            return null;
        }

        if ($this->portalPatientId($request) === $patientId) {
            return null;
        }

        return response()->json(['message' => 'This action is unauthorized.'], 403);
    }

    /**
     * Consultation handoffs belong to the assigned doctor; admins may
     * override (cover, reassignment). Nurses triage, they do not consult.
     */
    private function denyDoctorAction(Request $request, Visit $visit): ?JsonResponse
    {
        $user = $request->user();

        if ($user?->isSuperAdmin() || $user?->role?->name === 'admin') {
            return null;
        }

        if ($user?->role?->name !== 'doctor' || ! $user->doctor) {
            return response()->json(['message' => 'Only the assigned doctor can perform this action.'], 403);
        }

        if ($visit->doctor_id && (int) $visit->doctor_id !== (int) $user->doctor->id) {
            return response()->json(['message' => 'Only the assigned doctor can perform this action.'], 403);
        }

        return null;
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
