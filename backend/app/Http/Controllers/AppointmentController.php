<?php

namespace App\Http\Controllers;

use App\Http\Transformers\Transform;
use App\Models\Appointment;
use App\Models\Doctor;
use App\Models\DoctorSchedule;
use App\Support\AuditLogger;
use App\Support\GeneratesSequentialNumber;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class AppointmentController extends Controller
{
    use GeneratesSequentialNumber;

    /**
     * @var list<string>
     */
    private const STATUSES = ['pending', 'confirmed', 'waiting', 'in_progress', 'completed', 'cancelled', 'no_show'];

    /**
     * @var list<string>
     */
    private const TYPES = ['opd', 'follow_up', 'emergency', 'consultation'];

    public function index(Request $request): JsonResponse
    {
        $query = Appointment::query()->with(['patient', 'doctor.user', 'doctor.department', 'department']);

        if ($request->filled('date')) {
            $date = $request->input('date');

            if ($date === 'today') {
                $query->whereDate('appointment_date', today());
            } elseif ($date === 'week') {
                $start = today()->startOfWeek();
                $query->whereBetween('appointment_date', [$start->toDateString(), $start->copy()->endOfWeek()->toDateString()]);
            } elseif ($date === 'month') {
                $start = today()->startOfMonth();
                $query->whereBetween('appointment_date', [$start->toDateString(), $start->copy()->endOfMonth()->toDateString()]);
            } else {
                $query->whereDate('appointment_date', $date);
            }
        }

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('doctor_id')) {
            $query->where('doctor_id', $request->input('doctor_id'));
        }

        if ($request->filled('patient_id')) {
            $query->where('patient_id', $request->input('patient_id'));
        }

        if ($request->filled('search')) {
            $search = trim((string) $request->input('search'));

            $query->where(function ($q) use ($search) {
                $q->where('appointment_number', 'like', "%{$search}%")
                    ->orWhereHas('patient', function ($patient) use ($search) {
                        $patient->where(function ($q) use ($search) {
                            $q->where('first_name', 'like', "%{$search}%")
                                ->orWhere('last_name', 'like', "%{$search}%")
                                ->orWhere('phone', 'like', "%{$search}%");
                        });
                    });
            });
        }

        $this->scopeToSelf($request, $query);

        if ($portalId = $this->portalPatientId($request)) {
            $query->where('patient_id', $portalId);
        } elseif ($doctorId = $this->callerDoctorId($request)) {
            $query->where('doctor_id', $doctorId);
        }

        return $this->paginated(
            $request,
            $query->orderBy('appointment_date')->orderBy('start_time'),
            fn (Appointment $appointment) => Transform::appointment($appointment)
        );
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'patient_id' => ['required', 'exists:patients,id'],
            'doctor_id' => ['required', 'exists:doctors,id'],
            'appointment_date' => ['required', 'date'],
            'start_time' => ['required', 'regex:/^(?:[01]?\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/'],
            'type' => ['required', Rule::in(self::TYPES)],
            'department_id' => ['nullable', 'exists:departments,id'],
            'reason' => ['nullable', 'string'],
            'notes' => ['nullable', 'string'],
        ]);

        $start = Carbon::parse($data['start_time'])->format('H:i:s');
        $end = Carbon::parse($start)->addMinutes($this->slotMinutes($data['doctor_id'], $data['appointment_date']))->format('H:i:s');

        if ($this->hasConflict((int) $data['doctor_id'], $data['appointment_date'], $start, $end)) {
            return response()->json(['message' => 'Doctor already has an appointment in this time slot.'], 422);
        }

        $appointment = DB::transaction(function () use ($data, $request, $start, $end) {
            $payload = [
                'appointment_number' => $this->next('APT', 'appointments', 'appointment_number'),
                'patient_id' => $data['patient_id'],
                'doctor_id' => $data['doctor_id'],
                'department_id' => $data['department_id'] ?? null,
                'appointment_date' => $data['appointment_date'],
                'start_time' => $start,
                'end_time' => $end,
                'type' => $data['type'],
                'status' => 'pending',
                'reason' => $data['reason'] ?? null,
                'notes' => $data['notes'] ?? null,
                'created_by' => $request->user()?->id,
            ];

            if (Carbon::parse($data['appointment_date'])->isToday()) {
                $payload['queue_number'] = $this->nextQueueNumber($data['appointment_date']);
            }

            return Appointment::create($payload);
        });

        AuditLogger::log('created', "Appointment booked #{$appointment->appointment_number}", $appointment);

        return $this->ok(Transform::appointment($appointment->load(['patient', 'doctor.user', 'doctor.department', 'department'])));
    }

    public function show(Request $request, Appointment $appointment): JsonResponse
    {
        if ($denied = $this->denyForeignPatient($request, $appointment)) {
            return $denied;
        }

        $appointment->load(['patient', 'doctor.user', 'doctor.department', 'department']);

        return $this->ok(Transform::appointment($appointment));
    }

    public function update(Request $request, Appointment $appointment): JsonResponse
    {
        if ($denied = $this->denyForeignPatient($request, $appointment)) {
            return $denied;
        }

        $data = $request->validate([
            'patient_id' => ['sometimes', 'required', 'exists:patients,id'],
            'doctor_id' => ['sometimes', 'required', 'exists:doctors,id'],
            'appointment_date' => ['sometimes', 'required', 'date'],
            'start_time' => ['sometimes', 'required', 'regex:/^(?:[01]?\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/'],
            'type' => ['sometimes', 'required', Rule::in(self::TYPES)],
            'status' => ['nullable', Rule::in(self::STATUSES)],
            'department_id' => ['nullable', 'exists:departments,id'],
            'reason' => ['nullable', 'string'],
            'notes' => ['nullable', 'string'],
            'cancelled_reason' => ['nullable', 'string'],
        ]);

        $doctorId = (int) ($data['doctor_id'] ?? $appointment->doctor_id);
<<<<<<< HEAD
        $appointmentDate = $data['appointment_date'] ?? Carbon::parse($appointment->appointment_date)->toDateString();
=======
        $appointmentDate = $data['appointment_date'] ?? $appointment->appointment_date->toDateString();
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
        $start = Carbon::parse($data['start_time'] ?? $appointment->start_time)->format('H:i:s');

        $end = Carbon::parse($start)
            ->addMinutes($this->slotMinutes($doctorId, $appointmentDate))
            ->format('H:i:s');

        if ($this->hasConflict($doctorId, $appointmentDate, $start, $end, $appointment->id)) {
            return response()->json(['message' => 'Doctor already has an appointment in this time slot.'], 422);
        }

        $old = $appointment->only([
            'patient_id', 'doctor_id', 'department_id', 'appointment_date',
            'start_time', 'end_time', 'type', 'status', 'queue_number',
            'reason', 'notes', 'cancelled_reason',
        ]);

        $attributes = [
            'appointment_date' => $appointmentDate,
            'start_time' => $start,
            'end_time' => $end,
        ];

        foreach (['patient_id', 'doctor_id', 'department_id', 'type', 'status', 'reason', 'notes', 'cancelled_reason'] as $key) {
            if (array_key_exists($key, $data)) {
                $attributes[$key] = $data[$key];
            }
        }

        $appointment->fill($attributes);

        if ($appointment->queue_number === null && Carbon::parse($appointmentDate)->isToday()) {
            $appointment->queue_number = $this->nextQueueNumber($appointmentDate);
        }

        $appointment->save();

        AuditLogger::log('updated', "Appointment #{$appointment->appointment_number} updated", $appointment, $old, $appointment->only(array_keys($old)));

        return $this->ok(Transform::appointment($appointment->load(['patient', 'doctor.user', 'doctor.department', 'department'])));
    }

    public function destroy(Request $request, Appointment $appointment): JsonResponse
    {
        if ($denied = $this->denyForeignPatient($request, $appointment)) {
            return $denied;
        }

        $number = $appointment->appointment_number;

        if ($request->has('cancelled_reason')) {
            $old = $appointment->only(['status', 'cancelled_reason']);

            $appointment->status = 'cancelled';
            $appointment->cancelled_reason = $request->input('cancelled_reason');
            $appointment->save();

            AuditLogger::log('cancelled', "Appointment #{$number} cancelled", $appointment, $old, $appointment->only(['status', 'cancelled_reason']));

            return $this->ok(Transform::appointment($appointment->load(['patient', 'doctor.user', 'doctor.department', 'department'])));
        }

        $appointment->delete();

        AuditLogger::log('deleted', "Appointment #{$number} deleted");

        return $this->message("Appointment #{$number} deleted.");
    }

    public function updateStatus(Request $request, Appointment $appointment): JsonResponse
    {
        if ($denied = $this->denyForeignPatient($request, $appointment)) {
            return $denied;
        }

        $data = $request->validate([
            'status' => ['required', Rule::in(self::STATUSES)],
            'cancelled_reason' => ['nullable', 'string'],
        ]);

        if ($appointment->status === 'completed') {
            return response()->json(['message' => 'Completed appointments cannot be modified.'], 422);
        }

        $old = $appointment->only(['status', 'cancelled_reason']);

        $appointment->status = $data['status'];

        if (array_key_exists('cancelled_reason', $data)) {
            $appointment->cancelled_reason = $data['cancelled_reason'];
        }

        $appointment->save();

        AuditLogger::log(
            'updated',
            "Appointment #{$appointment->appointment_number} status changed to {$appointment->status}",
            $appointment,
            $old,
            $appointment->only(['status', 'cancelled_reason'])
        );

        return $this->ok(Transform::appointment($appointment->load(['patient', 'doctor.user', 'doctor.department', 'department'])));
    }

    public function today(Request $request): JsonResponse
    {
        $query = Appointment::query()
            ->whereDate('appointment_date', today())
            ->with(['patient', 'doctor.user', 'doctor.department', 'department'])
            ->orderBy('start_time')
            ->orderBy('id');

        $this->scopeToSelf($request, $query);

        if ($portalId = $this->portalPatientId($request)) {
            $query->where('patient_id', $portalId);
        } elseif ($doctorId = $this->callerDoctorId($request)) {
            $query->where('doctor_id', $doctorId);
        }

        return $this->collection($query->get(), fn (Appointment $appointment) => Transform::appointment($appointment));
    }

    public function queue(Request $request): JsonResponse
    {
        $query = Appointment::query()
            ->whereDate('appointment_date', today())
            ->whereIn('status', ['waiting', 'in_progress'])
            ->with(['patient', 'doctor.user', 'doctor.department', 'department'])
            ->orderBy('queue_number')
            ->orderBy('start_time')
            ->orderBy('id');

        $this->scopeToSelf($request, $query);

        if ($portalId = $this->portalPatientId($request)) {
            $query->where('patient_id', $portalId);
        } elseif ($doctorId = $this->callerDoctorId($request)) {
            $query->where('doctor_id', $doctorId);
        }

        return $this->collection($query->get(), fn (Appointment $appointment) => Transform::appointment($appointment));
    }

    public function slots(Request $request): JsonResponse
    {
        $data = $request->validate([
            'doctor_id' => ['required', 'exists:doctors,id'],
            'date' => ['required', 'date'],
        ]);

        $doctor = Doctor::with('schedules')->findOrFail($data['doctor_id']);
        $day = (int) Carbon::parse($data['date'])->format('w');

        $schedules = $doctor->schedules;

        if ($schedules->isEmpty()) {
            $start = '09:00:00';
            $end = '16:30:00';
            $step = 30;
        } else {
            $schedule = $schedules
                ->filter(fn (DoctorSchedule $item) => (bool) $item->is_active)
                ->first(fn (DoctorSchedule $item) => (int) $item->day_of_week === $day);

            if (! $schedule) {
                return $this->collection([]);
            }

            $start = (string) $schedule->start_time;
            $end = (string) $schedule->end_time;
            $step = max(5, (int) ($schedule->slot_minutes ?: 30));
        }

        $busy = Appointment::query()
            ->where('doctor_id', $doctor->id)
            ->whereDate('appointment_date', $data['date'])
            ->whereNotIn('status', ['cancelled', 'no_show'])
            ->get(['start_time', 'end_time']);

        $cursor = Carbon::parse($start);
        $limit = Carbon::parse($end);
        $slots = [];

        while ($cursor->copy()->addMinutes($step)->lte($limit)) {
            $slots[] = $cursor->format('H:i');
            $cursor->addMinutes($step);
        }

        $result = collect($slots)->map(function (string $slot) use ($busy, $step) {
            $slotStart = Carbon::parse($slot);
            $slotEnd = $slotStart->copy()->addMinutes($step);

            $available = ! $busy->contains(function (Appointment $appointment) use ($slotStart, $slotEnd) {
                $appointmentStart = Carbon::parse((string) $appointment->start_time);
                $appointmentEnd = Carbon::parse((string) $appointment->end_time);

                return $appointmentStart->lt($slotEnd) && $appointmentEnd->gt($slotStart);
            });

            return ['start_time' => $slot, 'available' => $available];
        })->values();

        return $this->collection($result);
    }

    public function call(Request $request, Appointment $appointment): JsonResponse
    {
        if ($denied = $this->denyForeignPatient($request, $appointment)) {
            return $denied;
        }

        if (! in_array($appointment->status, ['pending', 'confirmed', 'waiting'], true)) {
            return response()->json([
                'message' => 'Only pending, confirmed or waiting appointments can be called.',
            ], 422);
        }

        $old = $appointment->only(['status', 'queue_number']);

        $appointment->status = 'in_progress';

        if ($appointment->queue_number === null) {
<<<<<<< HEAD
            $appointment->queue_number = $this->nextQueueNumber(Carbon::parse($appointment->appointment_date)->toDateString());
=======
            $appointment->queue_number = $this->nextQueueNumber($appointment->appointment_date->toDateString());
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
        }

        $appointment->save();

        AuditLogger::log(
            'updated',
            "Appointment #{$appointment->appointment_number} called (queue {$appointment->queue_number})",
            $appointment,
            $old,
            $appointment->only(['status', 'queue_number'])
        );

        return $this->ok(Transform::appointment($appointment->load(['patient', 'doctor.user', 'doctor.department', 'department'])));
    }

    /**
     * Overlapping (non-cancelled) appointment for the same doctor and day.
     */
    private function hasConflict(int $doctorId, string $date, string $start, string $end, ?int $ignoreId = null): bool
    {
        return Appointment::query()
            ->where('doctor_id', $doctorId)
            ->whereDate('appointment_date', $date)
            ->whereNotIn('status', ['cancelled', 'no_show'])
            ->when($ignoreId, fn ($query) => $query->where('id', '!=', $ignoreId))
            ->where('start_time', '<', $end)
            ->where('end_time', '>', $start)
            ->exists();
    }

    /**
     * Slot length (minutes) taken from the doctor's schedule for that weekday.
     */
    private function slotMinutes(int $doctorId, string $date): int
    {
        $schedule = DoctorSchedule::query()
            ->where('doctor_id', $doctorId)
            ->where('day_of_week', (int) Carbon::parse($date)->format('w'))
            ->where('is_active', true)
            ->orderBy('start_time')
            ->first();

        return max(1, (int) ($schedule?->slot_minutes ?? 30));
    }

    private function nextQueueNumber(string $date): int
    {
        return ((int) Appointment::whereDate('appointment_date', $date)->max('queue_number')) + 1;
    }

    /**
     * Patient-portal callers may only touch their own appointments.
     */
    private function denyForeignPatient(Request $request, Appointment $appointment): ?JsonResponse
    {
        $portalId = $this->portalPatientId($request);

        if ($portalId !== null && $portalId !== $appointment->patient_id) {
            return response()->json(['message' => 'This action is unauthorized.'], 403);
        }

        return null;
    }

    /**
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
     * Doctors only see their own appointments (admins see everything).
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
