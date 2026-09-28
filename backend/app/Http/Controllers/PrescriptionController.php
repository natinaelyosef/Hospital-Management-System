<?php

namespace App\Http\Controllers;

use App\Http\Transformers\Transform;
use App\Models\Medicine;
use App\Models\MedicineBatch;
use App\Models\PharmacyTransaction;
use App\Models\Prescription;
use App\Models\Visit;
use App\Support\AuditLogger;
use App\Support\GeneratesSequentialNumber;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class PrescriptionController extends Controller
{
    use GeneratesSequentialNumber;

    /**
     * @var list<string>
     */
    private const STATUSES = ['pending', 'processing', 'dispensed', 'cancelled'];

    public function index(Request $request): JsonResponse
    {
        $query = Prescription::query()->with(['patient', 'doctor.user', 'doctor.department', 'items', 'dispenser']);

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('patient_id')) {
            $query->where('patient_id', $request->input('patient_id'));
        }

        if ($request->filled('doctor_id')) {
            $query->where('doctor_id', $request->input('doctor_id'));
        }

        if ($request->filled('search')) {
            $search = trim((string) $request->input('search'));

            $query->where(function ($q) use ($search) {
                $q->where('prescription_number', 'like', "%{$search}%")
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
            fn (Prescription $prescription) => Transform::prescription($prescription)
        );
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'patient_id' => ['required', 'exists:patients,id'],
            'visit_id' => ['nullable', 'exists:visits,id'],
            'doctor_id' => ['nullable', 'exists:doctors,id'],
            'diagnosis' => ['nullable', 'string'],
            'notes' => ['nullable', 'string'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.medicine_id' => ['required', 'exists:medicines,id'],
            'items.*.dosage' => ['required', 'string'],
            'items.*.frequency' => ['required', 'string'],
            'items.*.duration' => ['required', 'string'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'items.*.instructions' => ['nullable', 'string'],
        ]);

        $visit = $data['visit_id'] ? Visit::find($data['visit_id']) : null;
        $doctorId = $data['doctor_id'] ?? $visit?->doctor_id ?? $request->user()?->doctor?->id;

        if (! $doctorId) {
            return response()->json(['message' => 'Doctor is required to create a prescription.'], 422);
        }

        $prescription = DB::transaction(function () use ($data, $doctorId) {
            $prescription = Prescription::create([
                'prescription_number' => $this->next('RX', 'prescriptions', 'prescription_number'),
                'visit_id' => $data['visit_id'] ?? null,
                'patient_id' => $data['patient_id'],
                'doctor_id' => $doctorId,
                'diagnosis' => $data['diagnosis'] ?? null,
                'notes' => $data['notes'] ?? null,
                'status' => 'pending',
            ]);

            $medicines = Medicine::query()
                ->whereIn('id', collect($data['items'])->pluck('medicine_id'))
                ->get()
                ->keyBy('id');

            foreach ($data['items'] as $item) {
                $medicine = $medicines->get((int) $item['medicine_id']);

                $prescription->items()->create([
                    'medicine_id' => $item['medicine_id'],
                    'medicine_name' => $medicine->name,
                    'dosage' => $item['dosage'],
                    'frequency' => $item['frequency'],
                    'duration' => $item['duration'],
                    'quantity' => (int) $item['quantity'],
                    'instructions' => $item['instructions'] ?? null,
                ]);
            }

            return $prescription;
        });

        AuditLogger::log('created', "Prescription {$prescription->prescription_number} created", $prescription);

        return $this->ok(Transform::prescription($prescription->load(['patient', 'doctor.user', 'doctor.department', 'items', 'dispenser'])));
    }

    public function show(Request $request, Prescription $prescription): JsonResponse
    {
        if ($denied = $this->denyForeignPatient($request, $prescription)) {
            return $denied;
        }

        $prescription->load(['patient', 'doctor.user', 'items.medicine', 'visit', 'dispenser']);

        return $this->ok(Transform::prescription($prescription));
    }

    public function updateStatus(Request $request, Prescription $prescription): JsonResponse
    {
        if ($denied = $this->denyForeignPatient($request, $prescription)) {
            return $denied;
        }

        $data = $request->validate([
            'status' => ['required', Rule::in(self::STATUSES)],
        ]);

        if ($prescription->status === 'dispensed' && $data['status'] !== 'dispensed') {
            return response()->json(['message' => 'Dispensed prescriptions cannot be changed.'], 422);
        }

        if ($data['status'] === 'dispensed') {
            return $this->dispense($request, $prescription);
        }

        $old = $prescription->only(['status']);

        $prescription->status = $data['status'];
        $prescription->save();

        AuditLogger::log(
            'updated',
            "Prescription {$prescription->prescription_number} status changed to {$prescription->status}",
            $prescription,
            $old,
            $prescription->only(['status'])
        );

        return $this->ok($this->prescription($prescription));
    }

    public function pending(Request $request): JsonResponse
    {
        $query = Prescription::query()
            ->with(['patient', 'doctor.user', 'doctor.department', 'items', 'dispenser'])
            ->whereIn('status', ['pending', 'processing']);

        if ($portalId = $this->portalPatientId($request)) {
            $query->where('patient_id', $portalId);
        } elseif ($doctorId = $this->callerDoctorId($request)) {
            $query->where('doctor_id', $doctorId);
        }

        return $this->paginated(
            $request,
            $query->orderBy('created_at')->orderBy('id'),
            fn (Prescription $prescription) => Transform::prescription($prescription)
        );
    }

    /**
     * Move a prescription to `dispensed`, decrementing medicine stock and
     * consuming batches FEFO (first-expiry, first-out).
     */
    private function dispense(Request $request, Prescription $prescription): JsonResponse
    {
        $prescription->load('items');

        $required = [];
        $names = [];

        foreach ($prescription->items as $item) {
            $required[$item->medicine_id] = ($required[$item->medicine_id] ?? 0) + (int) $item->quantity;
            $names[$item->medicine_id] = $item->medicine_name;
        }

        foreach ($required as $medicineId => $quantity) {
            $medicine = Medicine::find($medicineId);

            if (! $medicine || (int) $medicine->stock_quantity < $quantity) {
                return response()->json([
                    'message' => 'Insufficient stock for '.($medicine?->name ?? $names[$medicineId]),
                ], 422);
            }
        }

        $old = $prescription->only(['status', 'dispensed_by', 'dispensed_at']);

        DB::transaction(function () use ($prescription, $required, $request) {
            foreach ($required as $medicineId => $quantity) {
                $medicine = Medicine::find($medicineId);

                $medicine->stock_quantity = (int) $medicine->stock_quantity - $quantity;
                $medicine->save();

                $remaining = $quantity;

                $batches = MedicineBatch::query()
                    ->where('medicine_id', $medicine->id)
                    ->where('quantity_available', '>', 0)
                    ->orderBy('expiry_date')
                    ->orderBy('id')
                    ->get();

                foreach ($batches as $batch) {
                    if ($remaining <= 0) {
                        break;
                    }

                    $taken = min($remaining, (int) $batch->quantity_available);

                    if ($taken <= 0) {
                        continue;
                    }

                    $batch->quantity_available = (int) $batch->quantity_available - $taken;
                    $batch->save();

                    PharmacyTransaction::create([
                        'medicine_id' => $medicine->id,
                        'batch_id' => $batch->id,
                        'type' => 'dispense',
                        'quantity' => $taken,
                        'unit_price' => $medicine->selling_price,
                        'total_price' => round($taken * (float) $medicine->selling_price, 2),
                        'reference' => $prescription->prescription_number,
                        'performed_by' => $request->user()?->id,
                        'notes' => "Dispensed for prescription {$prescription->prescription_number}",
                    ]);

                    $remaining -= $taken;
                }

                if ($remaining > 0) {
                    PharmacyTransaction::create([
                        'medicine_id' => $medicine->id,
                        'batch_id' => null,
                        'type' => 'dispense',
                        'quantity' => $remaining,
                        'unit_price' => $medicine->selling_price,
                        'total_price' => round($remaining * (float) $medicine->selling_price, 2),
                        'reference' => $prescription->prescription_number,
                        'performed_by' => $request->user()?->id,
                        'notes' => "Dispensed for prescription {$prescription->prescription_number}",
                    ]);
                }
            }

            $prescription->status = 'dispensed';
            $prescription->dispensed_by = $request->user()?->id;
            $prescription->dispensed_at = now();
            $prescription->save();
        });

        AuditLogger::log(
            'dispensed',
            "Prescription {$prescription->prescription_number} dispensed",
            $prescription,
            $old,
            $prescription->only(['status', 'dispensed_by', 'dispensed_at'])
        );

        return $this->ok($this->prescription($prescription));
    }

    private function prescription(Prescription $prescription): array
    {
        $prescription->loadMissing(['patient', 'doctor.user', 'doctor.department', 'items', 'dispenser']);

        return Transform::prescription($prescription);
    }

    /**
     * Patient-portal callers may only touch their own prescriptions.
     */
    private function denyForeignPatient(Request $request, Prescription $prescription): ?JsonResponse
    {
        $portalId = $this->portalPatientId($request);

        if ($portalId !== null && $portalId !== $prescription->patient_id) {
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
     * Doctors only see their own prescriptions (admins see everything).
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
