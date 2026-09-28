<?php

namespace App\Http\Controllers;

use App\Http\Transformers\Transform;
use App\Models\Admission;
use App\Models\Appointment;
use App\Models\Doctor;
use App\Models\Invoice;
use App\Models\LabRequest;
use App\Models\Medicine;
use App\Models\Patient;
use App\Models\Payment;
use App\Models\Prescription;
use App\Models\User;
use App\Models\Visit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class DashboardController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user()->load(['role.permissions', 'patient', 'doctor']);
        $role = $user->role?->name;

        $data = match ($role) {
            'admin' => $this->adminPayload(),
            'doctor' => $this->doctorPayload($user),
            'nurse' => $this->staffPayload(true),
            'receptionist' => $this->staffPayload(false),
            'pharmacist' => $this->pharmacistPayload(),
            'lab_technician' => $this->labPayload(),
            'accountant' => $this->accountantPayload(),
            'patient' => $this->patientPayload($user),
            default => ['stats' => []],
        };

<<<<<<< HEAD
        // Which front door this payload belongs to, so the two home pages know
        // they are looking at their own data.
        $data['portal'] = $user->portal();
        $data['role'] = $role;

=======
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
        return $this->ok($data);
    }

    /**
     * @return array<string, mixed>
     */
    private function adminPayload(): array
    {
        return [
            'stats' => [
                $this->stat('Total Patients', Patient::count(), 'users'),
                $this->stat('Doctors', Doctor::count(), 'stethoscope'),
                $this->stat("Today's Appointments", $this->countToday(), 'calendar'),
                $this->stat('Currently Admitted', Admission::where('status', 'admitted')->count(), 'bed'),
            ],
            'revenue' => $this->revenue(),
            'appointments_by_status' => $this->appointmentsByStatus(today()),
            'recent_appointments' => $this->recentAppointments(),
            'recent_patients' => $this->recentPatients(),
            'low_stock_medicines' => $this->lowStock(),
            'pending_lab_results' => $this->pendingLabResults(),
            'admissions' => $this->admissionsWeek(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function doctorPayload(User $user): array
    {
        $doctorId = $user->doctor?->id;

        if (! $doctorId) {
            return ['stats' => []];
        }

        $todayAppointments = Appointment::where('doctor_id', $doctorId)
            ->whereDate('appointment_date', today());

        $todayStatuses = (clone $todayAppointments)
            ->selectRaw('status, COUNT(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        return [
            'stats' => [
                $this->stat("Today's Appointments", (int) $todayAppointments->count(), 'calendar'),
                $this->stat('Waiting', (int) ($todayStatuses['waiting'] ?? 0), 'users'),
                $this->stat('Completed Today', (int) ($todayStatuses['completed'] ?? 0), 'stethoscope'),
                $this->stat('Pending Lab Results', $this->pendingLabCount($doctorId), 'bed'),
            ],
            'upcoming' => $this->doctorUpcoming($doctorId),
            'waiting' => $this->doctorWaiting($doctorId),
            'recent_patients' => $this->doctorPatients($doctorId),
            'pending_lab_results' => $this->pendingLabResults(['doctor_id' => $doctorId]),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function staffPayload(bool $isNurse): array
    {
        $todayStatuses = Appointment::whereDate('appointment_date', today())
            ->selectRaw('status, COUNT(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        $payload = [
            'stats' => [
                $this->stat("Today's Appointments", (int) $todayStatuses->values()->sum(), 'calendar'),
                $this->stat('Waiting', (int) ($todayStatuses['waiting'] ?? 0), 'users'),
                $this->stat('Completed', (int) ($todayStatuses['completed'] ?? 0), 'stethoscope'),
                $this->stat('Registered Today', Patient::whereDate('created_at', today())->count(), 'bed'),
            ],
            'recent_appointments' => $this->recentAppointments(),
            'recent_patients' => $this->recentPatients(),
        ];

        if ($isNurse) {
            $payload['waiting'] = $this->waitingQueue();
        }

        return $payload;
    }

    /**
     * @return array<string, mixed>
     */
    private function pharmacistPayload(): array
    {
        $pending = Prescription::whereIn('status', ['pending', 'processing']);

        return [
            'stats' => [
                $this->stat('Pending Prescriptions', (clone $pending)->count(), 'stethoscope'),
                $this->stat('Low Stock Medicines', $this->lowStockQuery()->count(), 'bed'),
                $this->stat('Expiring Soon', $this->expiringSoonCount(), 'calendar'),
                $this->stat('Dispensed Today', Prescription::where('status', 'dispensed')->whereDate('dispensed_at', today())->count(), 'users'),
            ],
            'low_stock_medicines' => $this->lowStock(),
            'pending_prescriptions' => (clone $pending)
                ->with('patient', 'items')
                ->latest()->limit(5)->get()
                ->map(fn ($prescription) => Transform::prescription($prescription))
                ->values()
                ->all(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function labPayload(): array
    {
        return [
            'stats' => [
                $this->stat('Requested', LabRequest::where('status', 'requested')->count(), 'stethoscope'),
                $this->stat('Processing', LabRequest::where('status', 'processing')->count(), 'calendar'),
                $this->stat('Completed Today', LabRequest::where('status', 'completed')->whereDate('requested_at', today())->count(), 'users'),
                $this->stat('Urgent', LabRequest::where('priority', 'urgent')->whereIn('status', ['requested', 'processing'])->count(), 'bed'),
            ],
            'pending_lab_results' => $this->pendingLabResults(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function accountantPayload(): array
    {
        $revenue = $this->revenue();

        return [
            'stats' => [
                $this->stat('Invoices Today', Invoice::whereDate('created_at', today())->count(), 'stethoscope'),
                $this->stat('Collected Today', $revenue['today'], 'users', '+'.number_format($revenue['today']).' ETB'),
                $this->stat('Outstanding', $revenue['outstanding'], 'calendar'),
                $this->stat('Payments Today', Payment::where('status', 'completed')->whereDate('paid_at', today())->count(), 'bed'),
            ],
            'revenue' => $revenue,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function patientPayload(User $user): array
    {
        $patientId = $user->patient?->id;

        if (! $patientId) {
            return [
                'stats' => [
                    $this->stat('Appointments', 0, 'calendar'),
                    $this->stat('Prescriptions', 0, 'stethoscope'),
                    $this->stat('Outstanding', 0, 'users'),
                    $this->stat('Lab Results', 0, 'bed'),
                ],
                'recent_appointments' => [],
                'prescriptions' => [],
                'invoices' => [],
                'lab_requests' => [],
            ];
        }

        $invoices = Invoice::query()
            ->where('patient_id', $patientId)
            ->with(['patient', 'issuer', 'items', 'payments'])
            ->latest()->limit(5)->get()
            ->map(fn ($invoice) => Transform::invoice($invoice));

        $outstanding = (float) Invoice::query()
            ->where('patient_id', $patientId)
            ->where('status', '!=', 'cancelled')
            ->selectRaw('COALESCE(SUM(total - paid_amount), 0) as total')
            ->value('total');

        return [
            'stats' => [
                $this->stat('Appointments', Appointment::where('patient_id', $patientId)->count(), 'calendar'),
                $this->stat('Prescriptions', Prescription::where('patient_id', $patientId)->count(), 'stethoscope'),
                $this->stat('Outstanding', round($outstanding, 2), 'users'),
                $this->stat('Lab Results', LabRequest::where('patient_id', $patientId)->where('status', 'completed')->count(), 'bed'),
            ],
            'recent_appointments' => Appointment::query()
                ->where('patient_id', $patientId)
                ->with(['patient', 'doctor.user', 'department'])
                ->orderByDesc('appointment_date')->orderByDesc('start_time')->limit(8)->get()
                ->map(fn ($appointment) => Transform::appointment($appointment)),
            'prescriptions' => Prescription::query()
                ->where('patient_id', $patientId)
                ->with(['patient', 'doctor.user', 'items', 'dispenser'])
                ->latest()->limit(5)->get()
                ->map(fn ($prescription) => Transform::prescription($prescription)),
            'invoices' => $invoices,
            'lab_requests' => LabRequest::query()
                ->where('patient_id', $patientId)
                ->where('status', 'completed')
                ->with(['patient', 'doctor.user', 'results'])
                ->latest()->limit(5)->get()
                ->map(fn ($lab) => Transform::labRequest($lab)),
        ];
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return array<int, array<string, mixed>>
     */
    private function pendingLabResults(array $filters = []): array
    {
        return LabRequest::query()
            ->whereIn('status', ['requested', 'processing'])
            ->when($filters, fn ($query) => $query->where($filters))
            ->with(['patient', 'doctor.user', 'results'])
            ->latest()->limit(5)->get()
            ->map(fn ($lab) => Transform::labRequest($lab))
            ->values()
            ->all();
    }

    private function pendingLabCount(int $doctorId): int
    {
        return LabRequest::where('doctor_id', $doctorId)
            ->whereIn('status', ['requested', 'processing'])
            ->count();
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function recentAppointments(): array
    {
        return Appointment::query()
            ->with(['patient', 'doctor.user', 'department'])
            ->latest()->limit(8)->get()
            ->map(fn ($appointment) => Transform::appointment($appointment))
            ->values()
            ->all();
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function recentPatients(): array
    {
        return Patient::query()
            ->latest()->limit(8)->get()
            ->map(fn ($patient) => Transform::patient($patient))
            ->values()
            ->all();
    }

    private function lowStockQuery()
    {
        return Medicine::query()->whereColumn('stock_quantity', '<=', 'reorder_level');
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function lowStock(): array
    {
        return $this->lowStockQuery()
            ->with('category')
            ->limit(5)->get()
            ->map(fn ($medicine) => Transform::medicine($medicine))
            ->values()
            ->all();
    }

    private function expiringSoonCount(): int
    {
        return Medicine::query()
            ->whereHas('batches', fn ($query) => $query
                ->where('quantity_available', '>', 0)
                ->whereBetween('expiry_date', [today()->toDateString(), now()->addDays(90)->toDateString()]))
            ->count();
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function waitingQueue(): array
    {
        return Appointment::query()
            ->whereDate('appointment_date', today())
            ->whereIn('status', ['waiting', 'in_progress'])
            ->with(['patient', 'doctor.user', 'department'])
            ->orderBy('queue_number')->orderBy('start_time')
            ->limit(15)->get()
            ->map(fn ($appointment) => Transform::appointment($appointment))
            ->values()
            ->all();
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function doctorUpcoming(int $doctorId): array
    {
        return Appointment::query()
            ->where('doctor_id', $doctorId)
            ->whereDate('appointment_date', '>=', today())
            ->whereIn('status', ['pending', 'confirmed', 'waiting'])
            ->with(['patient', 'doctor.user', 'department'])
            ->orderBy('appointment_date')->orderBy('start_time')
            ->limit(10)->get()
            ->map(fn ($appointment) => Transform::appointment($appointment))
            ->values()
            ->all();
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function doctorWaiting(int $doctorId): array
    {
        return Appointment::query()
            ->where('doctor_id', $doctorId)
            ->whereDate('appointment_date', today())
            ->whereIn('status', ['waiting', 'in_progress'])
            ->with(['patient', 'doctor.user', 'department'])
            ->orderBy('queue_number')->orderBy('start_time')
            ->limit(15)->get()
            ->map(fn ($appointment) => Transform::appointment($appointment))
            ->values()
            ->all();
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function doctorPatients(int $doctorId): array
    {
        $patientIds = Visit::query()
            ->where('doctor_id', $doctorId)
            ->where('visit_date', '>=', now()->subDays(30)->toDateString())
            ->distinct()->pluck('patient_id')
            ->take(8);

        if ($patientIds->isEmpty()) {
            return [];
        }

        return Patient::query()
            ->whereIn('id', $patientIds)
            ->get()
            ->map(fn ($patient) => Transform::patient($patient))
            ->values()
            ->all();
    }

    /**
     * @return array<string, float|int>
     */
    private function revenue(): array
    {
        $today = (float) Payment::query()
            ->where('status', 'completed')
            ->whereDate('paid_at', today())
            ->sum('amount');

        $month = (float) Payment::query()
            ->where('status', 'completed')
            ->whereBetween('paid_at', [now()->startOfMonth(), now()->endOfMonth()])
            ->sum('amount');

        $outstanding = (float) Invoice::query()
            ->where('status', '!=', 'cancelled')
            ->selectRaw('COALESCE(SUM(total - paid_amount), 0) as total')
            ->value('total');

        return [
            'today' => round($today, 2),
            'month' => round($month, 2),
            'outstanding' => round($outstanding, 2),
            'currency' => 'ETB',
        ];
    }

    /**
     * @return array<int, array<string, int|string>>
     */
    private function appointmentsByStatus(Carbon $day): array
    {
        return Appointment::query()
            ->whereDate('appointment_date', $day)
            ->selectRaw('status, COUNT(*) as total')
            ->groupBy('status')
            ->get()
            ->map(fn ($row) => ['status' => $row->status, 'count' => (int) $row->total])
            ->values()
            ->all();
    }

    /**
     * @return array<int, array<string, int|string>>
     */
    private function admissionsWeek(): array
    {
        $counts = Admission::query()
            ->whereBetween('admitted_at', [now()->subDays(6)->startOfDay(), now()->endOfDay()])
            ->selectRaw('DATE(admitted_at) as day, COUNT(*) as total')
            ->groupBy('day')
            ->pluck('total', 'day');

        $days = [];

        for ($i = 6; $i >= 0; $i--) {
            $date = now()->subDays($i)->toDateString();
            $days[] = ['date' => $date, 'count' => (int) ($counts[$date] ?? 0)];
        }

        return $days;
    }

    private function countToday(): int
    {
        return Appointment::whereDate('appointment_date', today())->count();
    }

    /**
     * @return array<string, mixed>
     */
    private function stat(string $label, int|float $value, string $icon, ?string $trend = null): array
    {
        return array_filter([
            'label' => $label,
            'value' => is_float($value) ? round($value, 2) : $value,
            'icon' => $icon,
            'trend' => $trend,
        ], fn ($item) => $item !== null);
    }
}
