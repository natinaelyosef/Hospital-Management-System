<?php

namespace App\Http\Transformers;

use App\Models\Admission;
use App\Models\Appointment;
use App\Models\AuditLog;
use App\Models\Department;
use App\Models\Doctor;
use App\Models\Invoice;
use App\Models\LabRequest;
use App\Models\LabTest;
use App\Models\Medicine;
use App\Models\MedicineBatch;
use App\Models\Notification;
use App\Models\Patient;
use App\Models\Payment;
use App\Models\Prescription;
use App\Models\Role;
use App\Models\User;
use App\Models\Visit;
use App\Models\VitalSign;
use App\Models\Ward;
use Carbon\Carbon;

/**
 * Single source of truth for API output shapes (see docs/API_CONTRACT.md).
 * Controllers MUST return these instead of raw toArray() so computed fields
 * (age, full_name, balance, counts, ...) stay consistent across endpoints.
 */
class Transform
{
    public static function user(?User $m): ?array
    {
        if (! $m) {
            return null;
        }

        return [
            'id' => $m->id,
            'name' => $m->name,
            'email' => $m->email,
            'phone' => $m->phone,
            'avatar_url' => $m->avatar_path ? asset('storage/'.$m->avatar_path) : null,
            'role' => self::role($m->role),
            'patient_id' => $m->patient?->id,
            'doctor_id' => $m->doctor?->id,
            'status' => $m->status ?? 'active',
            'is_active' => ($m->status ?? 'active') === 'active',
            'suspended_at' => $m->suspended_at?->toIso8601String(),
            'suspension_reason' => $m->suspension_reason,
            'invited_at' => $m->invited_at?->toIso8601String(),
            'last_login_at' => $m->last_login_at?->toIso8601String(),
            'created_at' => $m->created_at?->toIso8601String(),
        ];
    }

    public static function role(?Role $m): ?array
    {
        if (! $m) {
            return null;
        }

        return [
            'id' => $m->id,
            'name' => $m->name,
            'label' => $m->label,
            'description' => $m->description,
            'permissions' => $m->relationLoaded('permissions')
                ? $m->permissions->pluck('name')->values()->all()
                : ($m->whenLoaded('permissions')?->pluck('name')?->values()->all() ?? []),
            'users_count' => $m->relationLoaded('users') ? $m->users->count() : ($m->users_count ?? 0),
        ];
    }

    public static function department(?Department $m): ?array
    {
        if (! $m) {
            return null;
        }

        return [
            'id' => $m->id,
            'name' => $m->name,
            'code' => $m->code,
            'description' => $m->description,
            'doctors_count' => $m->relationLoaded('doctors') ? $m->doctors->count() : (int) ($m->doctors_count ?? 0),
        ];
    }

    public static function doctor(?Doctor $m): ?array
    {
        if (! $m) {
            return null;
        }

        $name = $m->relationLoaded('user') || $m->user
            ? $m->user?->name
            : null;

        return [
            'id' => $m->id,
            'user_id' => $m->user_id,
            'department_id' => $m->department_id,
            'department' => $m->relationLoaded('department') || $m->department
                ? ($m->department ? ['id' => $m->department->id, 'name' => $m->department->name] : null)
                : null,
            'name' => $name ?? $m->license_number,
            'email' => $m->user?->email,
            'phone' => $m->phone ?? $m->user?->phone,
            'license_number' => $m->license_number,
            'specialization' => $m->specialization,
            'consultation_fee' => (float) $m->consultation_fee,
            'bio' => $m->bio,
            'is_active' => (bool) $m->is_active,
            'schedules' => $m->relationLoaded('schedules')
                ? $m->schedules->map(fn ($s) => self::doctorSchedule($s))->values()->all()
                : [],
            'appointments_today' => (int) ($m->appointments_today ?? 0),
            'patients_count' => (int) ($m->patients_count ?? 0),
        ];
    }

    public static function doctorSchedule($m): array
    {
        return [
            'id' => $m->id,
            'day_of_week' => (int) $m->day_of_week,
            'start_time' => $m->start_time,
            'end_time' => $m->end_time,
            'slot_minutes' => (int) $m->slot_minutes,
            'is_active' => (bool) $m->is_active,
        ];
    }

    public static function patient(?Patient $m): ?array
    {
        if (! $m) {
            return null;
        }

        $dob = $m->date_of_birth ? Carbon::parse($m->date_of_birth) : null;

        return [
            'id' => $m->id,
            'patient_number' => $m->patient_number,
            'first_name' => $m->first_name,
            'last_name' => $m->last_name,
            'full_name' => trim($m->first_name.' '.$m->last_name),
            'gender' => $m->gender,
            'date_of_birth' => $m->date_of_birth instanceof Carbon ? $m->date_of_birth->toDateString() : $m->date_of_birth,
            'age' => $dob ? $dob->age : null,
            'phone' => $m->phone,
            'email' => $m->email,
            'address' => $m->address,
            'emergency_contact_name' => $m->emergency_contact_name,
            'emergency_contact_phone' => $m->emergency_contact_phone,
            'blood_group' => $m->blood_group,
            'allergies' => $m->allergies,
            'medical_history' => $m->medical_history,
            'photo_url' => $m->photo_path ? asset('storage/'.$m->photo_path) : null,
            'user_id' => $m->user_id,
            'registered_by' => $m->registered_by,
            'created_at' => $m->created_at?->toIso8601String(),
        ];
    }

    public static function appointment(?Appointment $m): ?array
    {
        if (! $m) {
            return null;
        }

        return [
            'id' => $m->id,
            'appointment_number' => $m->appointment_number,
            'patient' => self::patient($m->patient),
            'doctor' => self::doctor($m->doctor),
            'department' => $m->department ? ['id' => $m->department->id, 'name' => $m->department->name] : null,
            'appointment_date' => $m->appointment_date instanceof Carbon ? $m->appointment_date->toDateString() : $m->appointment_date,
            'start_time' => substr((string) $m->start_time, 0, 5),
            'end_time' => substr((string) $m->end_time, 0, 5),
            'type' => $m->type,
            'status' => $m->status,
            'queue_number' => $m->queue_number !== null ? (int) $m->queue_number : null,
            'reason' => $m->reason,
            'notes' => $m->notes,
            'cancelled_reason' => $m->cancelled_reason,
            'visit_id' => $m->visit_id,
            'created_at' => $m->created_at?->toIso8601String(),
        ];
    }

    public static function visit(?Visit $m): ?array
    {
        if (! $m) {
            return null;
        }

        $data = [
            'id' => $m->id,
            'visit_number' => $m->visit_number,
            'patient' => self::patient($m->patient),
            'doctor' => self::doctor($m->doctor),
            'appointment_id' => $m->appointment_id,
            'department_id' => $m->department_id,
            'visit_date' => $m->visit_date instanceof Carbon ? $m->visit_date->toDateString() : $m->visit_date,
            'type' => $m->type,
            'priority' => $m->priority ?? 'normal',
            'chief_complaint' => $m->chief_complaint,
            'symptoms' => $m->symptoms,
            'symptom_duration' => $m->symptom_duration,
            'severity' => $m->severity,
            'previous_conditions' => $m->previous_conditions,
            'current_medications' => $m->current_medications,
            'intake_notes' => $m->intake_notes,
            'diagnosis' => $m->diagnosis,
            'treatment' => $m->treatment,
            'medical_notes' => $m->medical_notes,
            'follow_up_date' => $m->follow_up_date
                ? ($m->follow_up_date instanceof Carbon ? $m->follow_up_date->toDateString() : $m->follow_up_date)
                : null,
            'status' => $m->status,
            'referred_by' => $m->referred_by,
            'referred_at' => $m->referred_at instanceof Carbon ? $m->referred_at->toIso8601String() : $m->referred_at,
            'created_at' => $m->created_at?->toIso8601String(),
            'vital_signs' => $m->relationLoaded('vitalSigns')
                ? $m->vitalSigns->map(fn ($v) => self::vitalSign($v))->values()->all()
                : [],
            'prescriptions' => $m->relationLoaded('prescriptions')
                ? $m->prescriptions->map(fn ($p) => self::prescription($p))->values()->all()
                : [],
            'lab_requests' => $m->relationLoaded('labRequests')
                ? $m->labRequests->map(fn ($l) => self::labRequest($l))->values()->all()
                : [],
        ];

        if ($m->relationLoaded('medicalNotes')) {
            $data['notes'] = $m->medicalNotes->map(fn ($n) => self::medicalNote($n))->values()->all();
        }

        return $data;
    }

    public static function vitalSign(?VitalSign $m): ?array
    {
        if (! $m) {
            return null;
        }

        return [
            'id' => $m->id,
            'visit_id' => $m->visit_id,
            'patient_id' => $m->patient_id,
            'recorded_at' => $m->recorded_at?->toIso8601String(),
            'bp_systolic' => $m->bp_systolic !== null ? (int) $m->bp_systolic : null,
            'bp_diastolic' => $m->bp_diastolic !== null ? (int) $m->bp_diastolic : null,
            'blood_pressure' => $m->bp_systolic && $m->bp_diastolic ? $m->bp_systolic.'/'.$m->bp_diastolic : null,
            'temperature' => $m->temperature !== null ? (float) $m->temperature : null,
            'pulse' => $m->pulse !== null ? (int) $m->pulse : null,
            'oxygen_saturation' => $m->oxygen_saturation !== null ? (int) $m->oxygen_saturation : null,
            'weight' => $m->weight !== null ? (float) $m->weight : null,
            'height' => $m->height !== null ? (float) $m->height : null,
            'respiratory_rate' => $m->respiratory_rate !== null ? (int) $m->respiratory_rate : null,
            'notes' => $m->notes,
            'recorded_by_name' => $m->recorder?->name,
        ];
    }

    public static function medicalNote($m): array
    {
        return [
            'id' => $m->id,
            'note_type' => $m->note_type,
            'content' => $m->content,
            'author_name' => $m->author?->name,
            'created_at' => $m->created_at?->toIso8601String(),
        ];
    }

    public static function prescription(?Prescription $m): ?array
    {
        if (! $m) {
            return null;
        }

        $items = $m->relationLoaded('items')
            ? $m->items->map(function ($i) {
                $unitPrice = null;
                $lineTotal = null;

                // Live catalogue price so doctor/pharmacist see the cost
                // before the bill is prepared; the invoice snapshots it.
                $medicine = $i->relationLoaded('medicine') ? $i->medicine : $i->medicine;

                if ($medicine) {
                    $unitPrice = (float) $medicine->selling_price;
                    $lineTotal = round($unitPrice * (int) $i->quantity, 2);
                }

                return [
                    'id' => $i->id,
                    'medicine_id' => $i->medicine_id,
                    'medicine_name' => $i->medicine_name,
                    'dosage' => $i->dosage,
                    'frequency' => $i->frequency,
                    'duration' => $i->duration,
                    'quantity' => (int) $i->quantity,
                    'instructions' => $i->instructions,
                    'unit_price' => $unitPrice,
                    'line_total' => $lineTotal,
                ];
            })->values()->all()
            : [];

        $estimatedTotal = count($items) > 0 && collect($items)->every(fn ($i) => $i['line_total'] !== null)
            ? round((float) collect($items)->sum('line_total'), 2)
            : null;

        // Payment gate state, mirroring PrescriptionController::dispense, so
        // the pharmacy UI can say *why* Dispense is unavailable instead of
        // letting the pharmacist click into a 422.
        $invoices = \App\Models\Invoice::query()
            ->where(function ($query) use ($m) {
                $query->where('prescription_id', $m->id);

                if ($m->visit_id) {
                    $query->orWhere(fn ($q) => $q->whereNull('prescription_id')->where('visit_id', $m->visit_id));
                }
            })
            ->latest('id')
            ->get();

        $outstanding = $invoices->first(fn ($invoice) => in_array($invoice->status, ['unpaid', 'partial'], true));
        $approved = $invoices->first(fn ($invoice) => $invoice->isApproved());

        return [
            'id' => $m->id,
            'prescription_number' => $m->prescription_number,
            'patient' => self::patient($m->patient),
            'doctor' => self::doctor($m->doctor),
            'visit_id' => $m->visit_id,
            'diagnosis' => $m->diagnosis,
            'status' => $m->status,
            'notes' => $m->notes,
            'dispensed_by_name' => $m->dispenser?->name,
            'dispensed_at' => $m->dispensed_at?->toIso8601String(),
            'created_at' => $m->created_at?->toIso8601String(),
            'items' => $items,
            'estimated_total' => $estimatedTotal,
            'payment_approved' => (bool) $approved,
            'outstanding_invoice' => $outstanding ? [
                'id' => $outstanding->id,
                'invoice_number' => $outstanding->invoice_number,
                'balance' => $outstanding->balance(),
                'status' => $outstanding->status,
            ] : null,
            'approved_invoice' => $approved ? [
                'id' => $approved->id,
                'invoice_number' => $approved->invoice_number,
                'approved_at' => $approved->approved_at?->toIso8601String(),
                'approved_by_name' => $approved->approver?->name,
            ] : null,
        ];
    }

    public static function medicine(?Medicine $m): ?array
    {
        if (! $m) {
            return null;
        }

        $batches = $m->relationLoaded('batches') ? $m->batches : collect();
        $today = now()->toDateString();

        return [
            'id' => $m->id,
            'name' => $m->name,
            'generic_name' => $m->generic_name,
            'category' => $m->category ? ['id' => $m->category->id, 'name' => $m->category->name] : null,
            'supplier' => $m->supplier ? ['id' => $m->supplier->id, 'name' => $m->supplier->name] : null,
            'form' => $m->form,
            'strength' => $m->strength,
            'unit' => $m->unit,
            'stock_quantity' => (int) $m->stock_quantity,
            'reorder_level' => (int) $m->reorder_level,
            'selling_price' => (float) $m->selling_price,
            'is_active' => (bool) $m->is_active,
            'expired_batches' => $batches->filter(fn ($b) => $b->expiry_date && $b->expiry_date < $today && $b->quantity_available > 0)->count(),
            'expiring_soon' => $batches->filter(fn ($b) => $b->expiry_date && $b->expiry_date >= $today && $b->expiry_date <= now()->addDays(90)->toDateString() && $b->quantity_available > 0)->count(),
            'batches' => $batches->map(fn ($b) => self::medicineBatch($b))->values()->all(),
            'created_at' => $m->created_at?->toIso8601String(),
        ];
    }

    public static function medicineBatch(?MedicineBatch $m): ?array
    {
        if (! $m) {
            return null;
        }

        return [
            'id' => $m->id,
            'batch_number' => $m->batch_number,
            'expiry_date' => $m->expiry_date instanceof Carbon ? $m->expiry_date->toDateString() : $m->expiry_date,
            'quantity_received' => (int) $m->quantity_received,
            'quantity_available' => (int) $m->quantity_available,
            'purchase_price' => (float) $m->purchase_price,
        ];
    }

    public static function pharmacyTransaction($m): array
    {
        return [
            'id' => $m->id,
            'medicine_id' => $m->medicine_id,
            'medicine_name' => $m->medicine?->name,
            'type' => $m->type,
            'quantity' => (int) $m->quantity,
            'unit_price' => (float) $m->unit_price,
            'total_price' => (float) $m->total_price,
            'reference' => $m->reference,
            'notes' => $m->notes,
            'performed_by_name' => $m->performer?->name,
            'created_at' => $m->created_at?->toIso8601String(),
        ];
    }

    public static function labTest(?LabTest $m): ?array
    {
        if (! $m) {
            return null;
        }

        return [
            'id' => $m->id,
            'name' => $m->name,
            'code' => $m->code,
            'category' => $m->category,
            'price' => (float) $m->price,
            'description' => $m->description,
            'is_active' => (bool) $m->is_active,
        ];
    }

    public static function labRequest(?LabRequest $m): ?array
    {
        if (! $m) {
            return null;
        }

        $results = $m->relationLoaded('results')
            ? $m->results->map(fn ($r) => [
                'id' => $r->id,
                'lab_test_id' => $r->lab_test_id,
                'test_name' => $r->test?->name,
                'test_code' => $r->test?->code,
                'test_price' => $r->test ? (float) $r->test->price : null,
                'status' => $r->status,
                'result_value' => $r->result_value,
                'reference_range' => $r->reference_range,
                'unit' => $r->unit,
                'notes' => $r->notes,
                'performed_at' => $r->performed_at?->toIso8601String(),
            ])->values()->all()
            : [];

        return [
            'id' => $m->id,
            'request_number' => $m->request_number,
            'patient' => self::patient($m->patient),
            'doctor' => self::doctor($m->doctor),
            'visit_id' => $m->visit_id,
            'priority' => $m->priority,
            'status' => $m->status,
            'notes' => $m->notes,
            'requested_at' => $m->requested_at?->toIso8601String(),
            'created_at' => $m->created_at?->toIso8601String(),
            'results' => $results,
            'estimated_cost' => count($results) > 0
                ? round((float) collect($results)->sum(fn ($r) => (float) ($r['test_price'] ?? 0)), 2)
                : 0,
        ];
    }

    public static function ward(?Ward $m): ?array
    {
        if (! $m) {
            return null;
        }

        $rooms = $m->relationLoaded('rooms') ? $m->rooms : collect();
        $beds = $rooms->flatMap->beds ?? collect();

        return [
            'id' => $m->id,
            'name' => $m->name,
            'code' => $m->code,
            'floor' => $m->floor,
            'type' => $m->type,
            'rooms_count' => $rooms->count() ?: (int) ($m->rooms_count ?? 0),
            'beds_count' => $beds->count() ?: (int) ($m->beds_count ?? 0),
            'occupied_beds' => $beds->where('status', 'occupied')->count(),
            'rooms' => $m->relationLoaded('rooms')
                ? $m->rooms->map(fn ($r) => self::room($r))->values()->all()
                : [],
        ];
    }

    public static function room($m): array
    {
        return [
            'id' => $m->id,
            'ward_id' => $m->ward_id,
            'room_number' => $m->room_number,
            'type' => $m->type,
            'tariff' => (float) $m->tariff,
            'capacity' => (int) $m->capacity,
            'beds' => $m->relationLoaded('beds')
                ? $m->beds->map(fn ($b) => self::bed($b))->values()->all()
                : [],
        ];
    }

    public static function bed($m): array
    {
        return [
            'id' => $m->id,
            'room_id' => $m->room_id,
            'bed_number' => $m->bed_number,
            'status' => $m->status,
            'admission' => $m->relationLoaded('admission') && $m->admission
                ? ['id' => $m->admission->id, 'admission_number' => $m->admission->admission_number]
                : null,
        ];
    }

    public static function admission(?Admission $m): ?array
    {
        if (! $m) {
            return null;
        }

        $admitted = $m->admitted_at;
        $end = $m->discharged_at ?? now();

        return [
            'id' => $m->id,
            'admission_number' => $m->admission_number,
            'patient' => self::patient($m->patient),
            'ward' => $m->ward ? ['id' => $m->ward->id, 'name' => $m->ward->name] : null,
            'room' => $m->room ? ['id' => $m->room->id, 'room_number' => $m->room->room_number] : null,
            'bed' => $m->bed ? ['id' => $m->bed->id, 'bed_number' => $m->bed->bed_number] : null,
            'consultant' => self::doctor($m->consultant),
            'diagnosis' => $m->diagnosis,
            'admitted_at' => $m->admitted_at?->toIso8601String(),
            'discharged_at' => $m->discharged_at?->toIso8601String(),
            'outcome' => $m->outcome,
            'discharge_summary' => $m->discharge_summary,
            'status' => $m->status,
            'admitted_by_name' => $m->admittedBy?->name,
            'total_days' => $admitted ? (int) $admitted->diffInDays($end) + 1 : 0,
        ];
    }

    public static function invoice(?Invoice $m): ?array
    {
        if (! $m) {
            return null;
        }

        return [
            'id' => $m->id,
            'invoice_number' => $m->invoice_number,
            'patient' => self::patient($m->patient),
            'patient_id' => $m->patient_id,
            'visit_id' => $m->visit_id,
            'admission_id' => $m->admission_id,
            'prescription_id' => $m->prescription_id,
            'sub_total' => (float) $m->sub_total,
            'discount' => (float) $m->discount,
            'tax' => (float) $m->tax,
            'total' => (float) $m->total,
            'paid_amount' => (float) $m->paid_amount,
            'balance' => round((float) $m->total - (float) $m->paid_amount, 2),
            'insurance_covered' => (float) $m->insurance_covered,
            'status' => $m->status,
            'notes' => $m->notes,
            'issued_by_name' => $m->issuer?->name,
            'is_approved' => $m->isApproved(),
            'approved_by_name' => $m->approver?->name,
            'approved_at' => $m->approved_at?->toIso8601String(),
            'approval_notes' => $m->approval_notes,
            'paid_at' => $m->paid_at?->toIso8601String(),
            'created_at' => $m->created_at?->toIso8601String(),
            'items' => $m->relationLoaded('items')
                ? $m->items->map(fn ($i) => self::invoiceItem($i))->values()->all()
                : [],
            'payments' => $m->relationLoaded('payments')
                ? $m->payments->map(fn ($p) => self::payment($p))->values()->all()
                : [],
        ];
    }

    public static function invoiceItem($m): array
    {
        return [
            'id' => $m->id,
            'service_id' => $m->service_id,
            'description' => $m->description,
            'item_type' => $m->item_type,
            'quantity' => (int) $m->quantity,
            'unit_price' => (float) $m->unit_price,
            'total' => (float) $m->total,
        ];
    }

    public static function payment(?Payment $m): ?array
    {
        if (! $m) {
            return null;
        }

        return [
            'id' => $m->id,
            'payment_number' => $m->payment_number,
            'invoice_id' => $m->invoice_id,
            'amount' => (float) $m->amount,
            'method' => $m->method,
            'reference' => $m->reference,
            'status' => $m->status,
            'paid_at' => $m->paid_at?->toIso8601String(),
            'received_by_name' => $m->receiver?->name,
        ];
    }

    public static function notification($m): array
    {
        $payload = is_string($m->data) ? json_decode($m->data, true) : $m->data;

        return [
            'id' => $m->id,
            'type' => $m->type,
            'data' => $payload,
            'read_at' => $m->read_at?->toIso8601String(),
            'created_at' => $m->created_at?->toIso8601String(),
        ];
    }

    public static function auditLog(?AuditLog $m): ?array
    {
        if (! $m) {
            return null;
        }

        return [
            'id' => $m->id,
            'user' => $m->user ? ['id' => $m->user->id, 'name' => $m->user->name] : null,
            'action' => $m->action,
            'description' => $m->description,
            'auditable_type' => $m->auditable_type,
            'auditable_id' => $m->auditable_id,
            'old_values' => $m->old_values,
            'new_values' => $m->new_values,
            'ip_address' => $m->ip_address,
            'created_at' => $m->created_at?->toIso8601String(),
        ];
    }
}
