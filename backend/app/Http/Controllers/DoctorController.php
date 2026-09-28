<?php

namespace App\Http\Controllers;

use App\Http\Transformers\Transform;
use App\Models\Doctor;
use App\Models\DoctorSchedule;
use App\Models\Role;
use App\Models\User;
use App\Support\AuditLogger;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class DoctorController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Doctor::query()
            ->selectRaw('doctors.*, (select count(distinct visits.patient_id) from visits where visits.doctor_id = doctors.id) as patients_count')
            ->with(['user', 'department', 'schedules'])
            ->withCount([
                'appointments as appointments_today' => fn ($q) => $q
                    ->whereDate('appointment_date', today()->toDateString())
                    ->whereNotIn('status', ['cancelled']),
            ]);

        if ($request->filled('search')) {
            $search = trim((string) $request->input('search'));

            $query->where(function ($q) use ($search) {
                $q->where('license_number', 'like', "%{$search}%")
                    ->orWhere('specialization', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%")
                    ->orWhereHas('user', function ($user) use ($search) {
                        $user->where(function ($q) use ($search) {
                            $q->where('name', 'like', "%{$search}%")
                                ->orWhere('email', 'like', "%{$search}%");
                        });
                    });
            });
        }

        if ($request->filled('department_id')) {
            $query->where('department_id', $request->input('department_id'));
        }

        return $this->paginated(
            $request,
            $query->orderBy('id'),
            fn (Doctor $doctor) => Transform::doctor($doctor)
        );
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255', 'unique:users,email'],
            'password' => ['nullable', 'string', 'min:6'],
            'department_id' => ['nullable', 'exists:departments,id'],
            'license_number' => ['required', 'string', 'max:255', 'unique:doctors,license_number'],
            'specialization' => ['required', 'string', 'max:255'],
            'consultation_fee' => ['required', 'numeric', 'min:0'],
            'phone' => ['nullable', 'string', 'max:255'],
            'bio' => ['nullable', 'string'],
            'is_active' => ['nullable', 'boolean'],
            'schedules' => ['nullable', 'array'],
            'schedules.*.day_of_week' => ['required', 'integer', 'between:0,6'],
            'schedules.*.start_time' => ['required', 'regex:/^(?:[01]?\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/'],
            'schedules.*.end_time' => ['required', 'regex:/^(?:[01]?\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/'],
            'schedules.*.slot_minutes' => ['required', 'integer', 'min:5', 'max:720'],
            'schedules.*.is_active' => ['nullable', 'boolean'],
        ]);

        $name = $data['name'];
        $email = $data['email'] ?? null;
        $password = $data['password'] ?? null;
        $schedules = $data['schedules'] ?? [];
        unset($data['name'], $data['email'], $data['password'], $data['schedules']);

        $doctor = DB::transaction(function () use ($data, $name, $email, $password, $schedules) {
            $user = null;

            if (filled($email)) {
                $user = User::create([
                    'name' => $name,
                    'email' => $email,
                    'password' => Hash::make($password ?? Str::random(12)),
                    'phone' => $data['phone'] ?? null,
                    'role_id' => Role::where('name', 'doctor')->value('id'),
                ]);
            }

            $doctor = Doctor::create($data + ['user_id' => $user?->id]);

            foreach ($schedules as $schedule) {
                $doctor->schedules()->create([
                    'day_of_week' => $schedule['day_of_week'],
                    'start_time' => $schedule['start_time'],
                    'end_time' => $schedule['end_time'],
                    'slot_minutes' => $schedule['slot_minutes'],
                    'is_active' => $schedule['is_active'] ?? true,
                ]);
            }

            return $doctor;
        });

        AuditLogger::log('created', "Doctor {$name} created", $doctor);

        $this->attachPatientsCount($doctor);

        return $this->ok($this->transform($this->withTodayCount($doctor)));
    }

    public function show(Request $request, Doctor $doctor): JsonResponse
    {
        $doctor->load(['user', 'department', 'schedules']);
        $this->attachPatientsCount($doctor);

        return $this->ok($this->transform($this->withTodayCount($doctor)));
    }

    public function update(Request $request, Doctor $doctor): JsonResponse
    {
        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255', Rule::unique('users', 'email')->ignore($doctor->user_id)],
            'password' => ['nullable', 'string', 'min:6'],
            'department_id' => ['nullable', 'exists:departments,id'],
            'license_number' => ['sometimes', 'required', 'string', 'max:255', Rule::unique('doctors', 'license_number')->ignore($doctor->id)],
            'specialization' => ['sometimes', 'required', 'string', 'max:255'],
            'consultation_fee' => ['sometimes', 'required', 'numeric', 'min:0'],
            'phone' => ['nullable', 'string', 'max:255'],
            'bio' => ['nullable', 'string'],
            'is_active' => ['nullable', 'boolean'],
            'schedules' => ['nullable', 'array'],
            'schedules.*.id' => ['nullable', 'integer'],
            'schedules.*.day_of_week' => ['required', 'integer', 'between:0,6'],
            'schedules.*.start_time' => ['required', 'regex:/^(?:[01]?\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/'],
            'schedules.*.end_time' => ['required', 'regex:/^(?:[01]?\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/'],
            'schedules.*.slot_minutes' => ['required', 'integer', 'min:5', 'max:720'],
            'schedules.*.is_active' => ['nullable', 'boolean'],
        ]);

        $name = $data['name'] ?? null;
        $email = $data['email'] ?? null;
        $password = $data['password'] ?? null;
        $schedules = $data['schedules'] ?? [];
        $replaceSchedules = $request->has('schedules');
        unset($data['name'], $data['email'], $data['password'], $data['schedules']);

        $old = $doctor->only([
            'department_id', 'license_number', 'specialization', 'consultation_fee',
            'phone', 'bio', 'is_active',
        ]);

        DB::transaction(function () use ($doctor, $data, $name, $email, $password, $schedules, $replaceSchedules) {
            $user = $doctor->user;

            if ($user) {
                $attributes = [];

                if (filled($email)) {
                    $attributes['email'] = $email;
                }

                if (filled($name)) {
                    $attributes['name'] = $name;
                }

                if (filled($password)) {
                    $attributes['password'] = Hash::make($password);
                }

                if ($attributes) {
                    $user->fill($attributes)->save();
                }
            } elseif (filled($email)) {
                $user = User::create([
                    'name' => $name ?? $doctor->license_number,
                    'email' => $email,
                    'password' => Hash::make($password ?? Str::random(12)),
                    'phone' => $data['phone'] ?? null,
                    'role_id' => Role::where('name', 'doctor')->value('id'),
                ]);

                $doctor->user_id = $user->id;
            }

            $doctor->fill($data)->save();

            if ($replaceSchedules) {
                $doctor->schedules()->delete();

                foreach ($schedules as $schedule) {
                    $doctor->schedules()->create([
                        'day_of_week' => $schedule['day_of_week'],
                        'start_time' => $schedule['start_time'],
                        'end_time' => $schedule['end_time'],
                        'slot_minutes' => $schedule['slot_minutes'],
                        'is_active' => $schedule['is_active'] ?? true,
                    ]);
                }
            }
        });

        $doctor->refresh()->load(['user', 'department', 'schedules']);

        $name = $doctor->user?->name ?? $doctor->license_number;

        AuditLogger::log(
            'updated',
            "Doctor {$name} updated",
            $doctor,
            $old,
            $doctor->only(array_keys($old))
        );

        $this->attachPatientsCount($doctor);

        return $this->ok($this->transform($this->withTodayCount($doctor)));
    }

    public function destroy(Request $request, Doctor $doctor): JsonResponse
    {
        $hasUpcoming = $doctor->appointments()
            ->whereDate('appointment_date', '>=', today())
            ->exists();

        if ($hasUpcoming) {
            return response()->json([
                'message' => 'Doctor has upcoming appointments and cannot be deleted.',
            ], 400);
        }

        $name = $doctor->user?->name ?? $doctor->license_number;

        $doctor->delete();

        AuditLogger::log('deleted', "Doctor {$name} deleted");

        return $this->message("Doctor {$name} deleted.");
    }

    public function available(Request $request): JsonResponse
    {
        $data = $request->validate([
            'date' => ['required', 'date'],
            'department_id' => ['nullable', 'exists:departments,id'],
        ]);

        $day = (int) Carbon::parse($data['date'])->format('w');

        $query = Doctor::query()
            ->selectRaw('doctors.*, (select count(distinct visits.patient_id) from visits where visits.doctor_id = doctors.id) as patients_count')
            ->where('is_active', true)
            ->whereHas('schedules', function ($schedule) use ($day) {
                $schedule->where('day_of_week', $day)->where('is_active', true);
            })
            ->with(['user', 'department', 'schedules']);

        if ($request->filled('department_id')) {
            $query->where('department_id', $request->input('department_id'));
        }

        return $this->collection(
            $query->orderBy('id')->get(),
            fn (Doctor $doctor) => Transform::doctor($doctor)
        );
    }

    public function schedule(Request $request, Doctor $doctor): JsonResponse
    {
        $schedules = $doctor->schedules()
            ->orderBy('day_of_week')
            ->orderBy('start_time')
            ->get();

        return $this->collection($schedules, fn (DoctorSchedule $schedule) => Transform::doctorSchedule($schedule));
    }

    public function updateSchedule(Request $request, Doctor $doctor): JsonResponse
    {
        $data = $request->validate([
            'schedules' => ['required', 'array'],
            'schedules.*.id' => ['nullable', 'integer'],
            'schedules.*.day_of_week' => ['required', 'integer', 'between:0,6'],
            'schedules.*.start_time' => ['required', 'regex:/^(?:[01]?\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/'],
            'schedules.*.end_time' => ['required', 'regex:/^(?:[01]?\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/'],
            'schedules.*.slot_minutes' => ['required', 'integer', 'min:5', 'max:720'],
            'schedules.*.is_active' => ['nullable', 'boolean'],
        ]);

        $name = $doctor->user?->name ?? $doctor->license_number;
        $old = $this->scheduleRows($doctor);

        DB::transaction(function () use ($doctor, $data) {
            $doctor->schedules()->delete();

            foreach ($data['schedules'] as $schedule) {
                $doctor->schedules()->create([
                    'day_of_week' => $schedule['day_of_week'],
                    'start_time' => $schedule['start_time'],
                    'end_time' => $schedule['end_time'],
                    'slot_minutes' => $schedule['slot_minutes'],
                    'is_active' => $schedule['is_active'] ?? true,
                ]);
            }
        });

        $new = $this->scheduleRows($doctor);

        AuditLogger::log('updated', "Schedule updated for doctor {$name}", $doctor, ['schedules' => $old], ['schedules' => $new]);

        return $this->collection($doctor->schedules()->orderBy('day_of_week')->orderBy('start_time')->get(), fn (DoctorSchedule $schedule) => Transform::doctorSchedule($schedule));
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function scheduleRows(Doctor $doctor): array
    {
        return $doctor->schedules()
            ->orderBy('day_of_week')
            ->orderBy('start_time')
            ->get()
            ->map(fn (DoctorSchedule $schedule) => Transform::doctorSchedule($schedule))
            ->values()
            ->all();
    }

    private function withTodayCount(Doctor $doctor): Doctor
    {
        return $doctor->loadCount([
            'appointments as appointments_today' => fn ($q) => $q
                ->whereDate('appointment_date', today()->toDateString())
                ->whereNotIn('status', ['cancelled']),
        ]);
    }

    /**
     * Distinct patients this doctor has seen (contract field `patients_count`).
     */
    private function attachPatientsCount(Doctor $doctor): Doctor
    {
        $doctor->setAttribute('patients_count', (int) DB::table('visits')
            ->where('doctor_id', $doctor->id)
            ->distinct()
            ->count('patient_id'));

        return $doctor;
    }

    /**
     * @return array<string, mixed>
     */
    private function transform(Doctor $doctor): array
    {
        $doctor->loadMissing(['user', 'department', 'schedules']);

        return Transform::doctor($doctor);
    }
}
