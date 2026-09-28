<?php

namespace App\Http\Controllers;

use App\Http\Transformers\Transform;
<<<<<<< HEAD
use App\Models\Invoice;
=======
<<<<<<< HEAD
use App\Models\Invoice;
=======
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a
use App\Models\Medicine;
use App\Models\MedicineBatch;
use App\Models\PharmacyTransaction;
use App\Models\Prescription;
use App\Models\Visit;
use App\Support\AuditLogger;
use App\Support\GeneratesSequentialNumber;
<<<<<<< HEAD
use App\Support\VisitWorkflow;
=======
<<<<<<< HEAD
use App\Support\VisitWorkflow;
=======
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a
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

<<<<<<< HEAD
=======
<<<<<<< HEAD
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a
        if ($request->filled('visit_id')) {
            $query->where('visit_id', (int) $request->input('visit_id'));
        }

<<<<<<< HEAD
=======
=======
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a
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

<<<<<<< HEAD
        $visit = ($data['visit_id'] ?? null) ? Visit::find($data['visit_id']) : null;
=======
<<<<<<< HEAD
        $visit = ($data['visit_id'] ?? null) ? Visit::find($data['visit_id']) : null;
=======
        $visit = $data['visit_id'] ? Visit::find($data['visit_id']) : null;
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a
        $doctorId = $data['doctor_id'] ?? $visit?->doctor_id ?? $request->user()?->doctor?->id;

        if (! $doctorId) {
            return response()->json(['message' => 'Doctor is required to create a prescription.'], 422);
        }

<<<<<<< HEAD
=======
<<<<<<< HEAD
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a
        // Smooth handoff guards: prescription must belong to the case patient,
        // the case must be with the doctor, and stock must cover every line so
        // the pharmacy handoff never dead-ends.
        if ($visit) {
            if ((int) $visit->patient_id !== (int) $data['patient_id']) {
                return response()->json([
                    'message' => 'The patient does not match the selected visit. Prescribe for the same patient as the case.',
                    'errors' => ['patient_id' => ['The patient does not match the selected visit.']],
                ], 422);
            }

            if ($visit->isTerminal()) {
                return response()->json(['message' => 'Prescriptions cannot be added to a completed or cancelled case.'], 422);
            }

            if (! in_array($visit->status, ['in_consultation', 'lab_completed', 'waiting_for_doctor'], true)) {
                return response()->json([
                    'message' => "Prescriptions can only be written while the case is with the doctor (current stage: {$visit->status}). Complete triage and start the consultation first.",
                ], 422);
            }
        }

        $stockCheck = Medicine::query()
            ->whereIn('id', collect($data['items'])->pluck('medicine_id'))
            ->get()
            ->keyBy('id');

        foreach ($data['items'] as $index => $item) {
            $medicine = $stockCheck->get((int) $item['medicine_id']);

            if (! $medicine) {
                return response()->json([
                    'message' => "Medicine on row ".($index + 1)." no longer exists.",
                    'errors' => ["items.{$index}.medicine_id" => ['The selected medicine no longer exists.']],
                ], 422);
            }

            if ((int) $medicine->stock_quantity < (int) $item['quantity']) {
                return response()->json([
                    'message' => "Insufficient stock for {$medicine->name}: only {$medicine->stock_quantity} available, {$item['quantity']} requested.",
                    'errors' => ["items.{$index}.quantity" => ["Only {$medicine->stock_quantity} in stock."]],
                ], 422);
            }
        }

<<<<<<< HEAD
=======
=======
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a
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

<<<<<<< HEAD
=======
<<<<<<< HEAD
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a
        VisitWorkflow::advanceVisit(
            $prescription->visit_id,
            'prescription_created',
            $request->user(),
            "Prescription {$prescription->prescription_number} created."
        );

<<<<<<< HEAD
=======
=======
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a
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

<<<<<<< HEAD
=======
<<<<<<< HEAD
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a
        if ($prescription->status === 'processing') {
            VisitWorkflow::advanceVisit(
                $prescription->visit_id,
                'pharmacy_processing',
                $request->user(),
                "Prescription {$prescription->prescription_number} being prepared."
            );
        }

<<<<<<< HEAD
=======
=======
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a
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
<<<<<<< HEAD
=======
<<<<<<< HEAD
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a
     * Pharmacist handoff: prepare the bill document for a prescription.
     * Builds invoice lines from current medicine prices plus any unbilled lab
     * tests on the same visit, so the accountant sees one complete cost sheet
     * to approve before medication is dispensed.
     */
    public function invoice(Request $request, Prescription $prescription): JsonResponse
    {
        if ($denied = $this->denyForeignPatient($request, $prescription)) {
            return $denied;
        }

        if (in_array($prescription->status, ['dispensed', 'cancelled'], true)) {
            return response()->json(['message' => 'An invoice cannot be prepared for a dispensed or cancelled prescription.'], 422);
        }

        $data = $request->validate([
            'discount' => ['nullable', 'numeric', 'min:0'],
            'tax' => ['nullable', 'numeric', 'min:0'],
            'notes' => ['nullable', 'string'],
        ]);

        $prescription->loadMissing(['items.medicine', 'visit.labRequests.results.test', 'patient']);

        // Idempotency: one open bill per prescription. If this prescription (or
        // its case) already has an outstanding invoice, return it instead of
        // creating a duplicate.
        $open = Invoice::query()
            ->whereIn('status', ['unpaid', 'partial'])
            ->where(function ($query) use ($prescription) {
                $query->where('prescription_id', $prescription->id);

                if ($prescription->visit_id) {
                    $query->orWhere('visit_id', $prescription->visit_id);
                }
            })
            ->latest('id')
            ->first();

        if ($open) {
            return $this->ok(Transform::invoice($open->load(['patient', 'items', 'payments.receiver', 'issuer', 'approver'])));
        }

        $rows = [];
        $subTotal = 0.0;

        foreach ($prescription->items as $item) {
            $unitPrice = (float) ($item->medicine?->selling_price ?? 0);
            $total = round($unitPrice * (int) $item->quantity, 2);
            $subTotal += $total;

            $rows[] = [
                'service_id' => null,
                'description' => "{$item->medicine_name} ({$item->dosage}, {$item->frequency} x {$item->duration}) x {$item->quantity} — {$prescription->prescription_number}",
                'item_type' => 'medicine',
                'quantity' => (int) $item->quantity,
                'unit_price' => $unitPrice,
                'total' => $total,
            ];
        }

        // Include lab costs on the same visit so the patient pays once at the
        // accountant instead of queuing twice.
        if ($prescription->visit) {
            foreach ($prescription->visit->labRequests as $labRequest) {
                foreach ($labRequest->results as $result) {
                    $price = (float) ($result->test?->price ?? 0);

                    if ($price <= 0) {
                        continue;
                    }

                    $label = $result->test?->name ?? 'Lab test';
                    $subTotal += $price;

                    $rows[] = [
                        'service_id' => null,
                        'description' => "{$label} — {$labRequest->request_number}",
                        'item_type' => 'lab',
                        'quantity' => 1,
                        'unit_price' => $price,
                        'total' => round($price, 2),
                    ];
                }
            }

            // Deduplicate lab lines already billed on a paid invoice for this visit.
            $billedDescriptions = Invoice::query()
                ->where('visit_id', $prescription->visit_id)
                ->where('status', 'paid')
                ->with('items')
                ->get()
                ->flatMap(fn ($invoice) => $invoice->items->pluck('description'))
                ->all();

            if (! empty($billedDescriptions)) {
                $rows = array_values(array_filter(
                    $rows,
                    fn ($row) => $row['item_type'] !== 'lab' || ! in_array($row['description'], $billedDescriptions, true)
                ));
                $subTotal = round(array_sum(array_column($rows, 'total')), 2);
            }
        }

        if (empty($rows)) {
            return response()->json(['message' => 'Nothing billable found for this prescription.'], 422);
        }

        $discount = (float) ($data['discount'] ?? 0);
        $tax = (float) ($data['tax'] ?? 0);
        $total = round($subTotal - $discount + $tax, 2);

        $invoice = DB::transaction(function () use ($prescription, $rows, $subTotal, $discount, $tax, $total, $data, $request) {
            $invoice = Invoice::create([
                'invoice_number' => $this->next('INV', 'invoices', 'invoice_number'),
                'patient_id' => $prescription->patient_id,
                'visit_id' => $prescription->visit_id,
                'prescription_id' => $prescription->id,
                'admission_id' => null,
                'sub_total' => round($subTotal, 2),
                'discount' => $discount,
                'tax' => $tax,
                'total' => max(0, $total),
                'paid_amount' => 0,
                'insurance_covered' => 0,
                'status' => 'unpaid',
                'notes' => $data['notes'] ?? "Bill for {$prescription->prescription_number}",
                'issued_by' => $request->user()?->id,
            ]);

            foreach ($rows as $row) {
                $invoice->items()->create($row);
            }

            // Zero-cost bills (e.g. fully discounted) are settled and approved
            // on the spot: there is no cash for an accountant to verify, and
            // the pharmacy handoff must not stall on an already-free invoice.
            if ((float) $invoice->total <= 0) {
                $invoice->status = 'paid';
                $invoice->paid_at = now();
                $invoice->approved_by = $request->user()?->id;
                $invoice->approved_at = now();
                $invoice->approval_notes = 'Nothing to collect — approved automatically with the bill.';
                $invoice->save();
            }

            return $invoice;
        });

        AuditLogger::log('create', "Invoice {$invoice->invoice_number} prepared from prescription {$prescription->prescription_number}", $invoice);

        // Walk the case forward in stage order. `advanceTo` is monotonic, so
        // the pharmacy stage has to be recorded before the billing stage or it
        // would be silently dropped.
        if ($prescription->status === 'pending') {
            $prescription->status = 'processing';
            $prescription->save();

            VisitWorkflow::advanceVisit(
                $prescription->visit_id,
                'pharmacy_processing',
                $request->user(),
                "Prescription {$prescription->prescription_number} being prepared by pharmacy."
            );
        }

        VisitWorkflow::advanceVisit(
            $prescription->visit_id,
            'payment_required',
            $request->user(),
            "Invoice {$invoice->invoice_number} issued — the accountant must approve the cash payment."
        );

        // Zero-cost bills (e.g. fully discounted) need no accountant, so the
        // pharmacy handoff must not stall on an already-settled invoice.
        if ((float) $invoice->total <= 0) {
            VisitWorkflow::advanceVisit(
                $prescription->visit_id,
                'payment_approved',
                $request->user(),
                "Invoice {$invoice->invoice_number} settled — ready to dispense."
            );
        }

        return $this->ok(Transform::invoice($invoice->load(['patient', 'items', 'payments.receiver', 'issuer', 'approver'])));
    }

    /**
<<<<<<< HEAD
=======
=======
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a
     * Move a prescription to `dispensed`, decrementing medicine stock and
     * consuming batches FEFO (first-expiry, first-out).
     */
    private function dispense(Request $request, Prescription $prescription): JsonResponse
    {
<<<<<<< HEAD
=======
<<<<<<< HEAD
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a
        if (! $this->allows($request, 'prescriptions.dispense')) {
            return response()->json(['message' => 'This action is unauthorized.'], 403);
        }

        // Accounting → Pharmacy gate: the pharmacist first prepares the bill
        // (document + cost), the accountant records the cash and approves the
        // payment, and only then may medication leave the pharmacy.
        //
        // This applies to every prescription, not just visit-linked ones: a
        // walk-in prescription with no bill at all must not be a way around
        // the payment gate.
        $invoices = Invoice::query()
            ->where(function ($query) use ($prescription) {
                $query->where('prescription_id', $prescription->id);

                // Bills created before the link existed are still matched by case.
                if ($prescription->visit_id) {
                    $query->orWhere(function ($q) use ($prescription) {
                        $q->whereNull('prescription_id')->where('visit_id', $prescription->visit_id);
                    });
                }
            })
            ->get();

        $outstanding = $invoices->first(fn (Invoice $invoice) => in_array($invoice->status, ['unpaid', 'partial'], true));

        if ($outstanding) {
            return response()->json([
                'message' => "Payment must be approved before dispensing. Invoice {$outstanding->invoice_number} still has a balance of ".number_format($outstanding->balance(), 2).' — send the patient to the accountant for cash payment first.',
                'invoice_id' => $outstanding->id,
                'invoice_number' => $outstanding->invoice_number,
            ], 422);
        }

        $approved = $invoices->first(fn (Invoice $invoice) => $invoice->isApproved());

        if (! $approved) {
            return response()->json([
                'message' => 'No approved payment found for this prescription. The pharmacist must first prepare the bill, the accountant must record the cash and approve the payment, and only then can medication be dispensed.',
            ], 422);
        }


        $approved = $invoices->first(fn (Invoice $invoice) => $invoice->isApproved());

        if (! $approved) {
            return response()->json([
                'message' => 'No approved payment found for this prescription. The pharmacist must first prepare the bill, the accountant must record the cash and approve the payment, and only then can medication be dispensed.',
            ], 422);
        }

<<<<<<< HEAD
=======
=======
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a
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

<<<<<<< HEAD
=======
<<<<<<< HEAD
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a
        VisitWorkflow::advanceVisit(
            $prescription->visit_id,
            'medication_dispensed',
            $request->user(),
            "Prescription {$prescription->prescription_number} dispensed."
        );

<<<<<<< HEAD
=======
=======
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a
        return $this->ok($this->prescription($prescription));
    }

    private function prescription(Prescription $prescription): array
    {
        $prescription->loadMissing(['patient', 'doctor.user', 'doctor.department', 'items', 'dispenser']);

        return Transform::prescription($prescription);
    }

<<<<<<< HEAD
=======
<<<<<<< HEAD
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a
    public function pdf(Prescription $prescription)
    {
        $prescription->loadMissing(['patient', 'doctor.user', 'doctor.department', 'items.medicine', 'dispenser']);

        // The bill the pharmacist hands to the accountant, so the document
        // carries both the medicine list and the money owed.
        $invoice = Invoice::query()
            ->where(function ($query) use ($prescription) {
                $query->where('prescription_id', $prescription->id);

                if ($prescription->visit_id) {
                    $query->orWhere('visit_id', $prescription->visit_id);
                }
            })
            ->latest('id')
            ->with('items')
            ->first();

        $settings = \App\Models\Setting::query()->pluck('value', 'key');

        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('prescriptions.pdf', [
            'prescription' => $prescription,
            'invoice' => $invoice,
            'settings' => $settings,
            'hospital' => [
                'name' => $settings['hospital_name'] ?? config('app.name', 'Hospital'),
                'address' => $settings['address'] ?? null,
                'phone' => $settings['phone'] ?? null,
                'email' => $settings['email'] ?? null,
                'logo' => $settings['logo'] ?? null,
            ],
            'currency' => $settings['currency'] ?? 'ETB',
        ]);

        return $pdf->download($prescription->prescription_number.'.pdf');
    }

<<<<<<< HEAD
=======
=======
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a
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
