<?php

namespace App\Http\Controllers\Insurance;

use App\Http\Controllers\Controller;
use App\Http\Transformers\Transform;
use App\Models\InsuranceClaim;
use App\Models\Invoice;
use App\Support\AuditLogger;
use App\Support\GeneratesSequentialNumber;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ClaimController extends Controller
{
    use GeneratesSequentialNumber;

    private const TRANSITIONS = [
        'draft' => ['submitted', 'rejected'],
        'submitted' => ['approved', 'rejected'],
        'approved' => ['paid'],
        'rejected' => ['submitted'],
        'paid' => [],
    ];

    public function index(Request $request): JsonResponse
    {
        $query = InsuranceClaim::query()->with(['invoice.patient', 'insurance.company']);

        if ($request->filled('status')) {
            $query->where('status', $request->query('status'));
        }

        return $this->paginated(
            $request,
            $query->orderByDesc('id'),
            fn (InsuranceClaim $claim) => $this->shape($claim)
        );
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'invoice_id' => ['required', 'integer', 'exists:invoices,id'],
            'patient_insurance_id' => ['required', 'integer', 'exists:patient_insurances,id'],
            'amount' => ['required', 'numeric', 'min:0'],
            'notes' => ['nullable', 'string'],
        ]);

        $invoice = Invoice::find($data['invoice_id']);

        if ($data['amount'] > (float) $invoice->total + 0.001) {
            return response()->json(['message' => 'Claim amount cannot exceed the invoice total.'], 422);
        }

        $claim = InsuranceClaim::create([
            'claim_number' => $this->next('CLM', 'insurance_claims', 'claim_number'),
            'invoice_id' => $data['invoice_id'],
            'patient_insurance_id' => $data['patient_insurance_id'],
            'amount' => $data['amount'],
            'status' => 'draft',
            'notes' => $data['notes'] ?? null,
        ]);

        AuditLogger::log('create', "Claim {$claim->claim_number} created", $claim, null, [
            'invoice_id' => $claim->invoice_id,
            'amount' => (float) $claim->amount,
        ]);

        return $this->ok($this->shape($claim->load(['invoice.patient', 'insurance.company'])));
    }

    public function update(Request $request, InsuranceClaim $claim): JsonResponse
    {
        if (! in_array($claim->status, ['draft', 'submitted'], true)) {
            return response()->json([
                'message' => 'Only draft or submitted claims can be edited.',
            ], 422);
        }

        $data = $request->validate([
            'amount' => ['sometimes', 'required', 'numeric', 'min:0'],
            'notes' => ['nullable', 'string'],
        ]);

        if (array_key_exists('amount', $data) && $data['amount'] > (float) $claim->invoice->total + 0.001) {
            return response()->json(['message' => 'Claim amount cannot exceed the invoice total.'], 422);
        }

        $old = $claim->only(array_keys($data));
        $claim->update($data);

        AuditLogger::log('update', "Claim {$claim->claim_number} updated", $claim, $old, $data);

        return $this->ok($this->shape($claim->load(['invoice.patient', 'insurance.company'])));
    }

    public function updateStatus(Request $request, InsuranceClaim $claim): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', Rule::in(['draft', 'submitted', 'approved', 'rejected', 'paid'])],
            'approved_amount' => ['nullable', 'numeric', 'min:0'],
            'notes' => ['nullable', 'string'],
        ]);

        $status = $data['status'];
        $current = $claim->status;

        if (! in_array($status, self::TRANSITIONS[$current] ?? [], true)) {
            return response()->json([
                'message' => "Illegal status transition from \"{$current}\" to \"{$status}\".",
            ], 422);
        }

        if ($status === 'approved') {
            if (! array_key_exists('approved_amount', $data) || $data['approved_amount'] === null) {
                return response()->json(['message' => 'approved_amount is required when approving a claim.'], 422);
            }

            if ($data['approved_amount'] > (float) $claim->amount + 0.001) {
                return response()->json(['message' => 'approved_amount cannot exceed the claim amount.'], 422);
            }
        }

        $old = [
            'status' => $current,
            'approved_amount' => $claim->approved_amount,
            'submitted_at' => $claim->submitted_at,
            'decided_at' => $claim->decided_at,
        ];

        $claim->status = $status;

        if (array_key_exists('notes', $data)) {
            $claim->notes = $data['notes'];
        }

        if ($status === 'submitted') {
            $claim->submitted_at = now();
        }

        if ($status === 'approved' || $status === 'rejected') {
            $claim->decided_at = now();
        }

        if ($status === 'approved') {
            $claim->approved_amount = $data['approved_amount'];
        }

        $claim->save();

        AuditLogger::log('status', "Claim {$claim->claim_number} moved to {$status}", $claim, $old, [
            'status' => $status,
            'approved_amount' => $claim->approved_amount,
        ]);

        return $this->ok($this->shape($claim->load(['invoice.patient', 'insurance.company'])));
    }

    private function shape(InsuranceClaim $claim): array
    {
        $company = $claim->insurance?->company;

        return [
            'id' => $claim->id,
            'claim_number' => $claim->claim_number,
            'invoice' => Transform::invoice($claim->invoice),
            'patient_insurance_id' => $claim->patient_insurance_id,
            'insurance' => $claim->insurance ? [
                'id' => $claim->insurance->id,
                'policy_number' => $claim->insurance->policy_number,
                'holder_name' => $claim->insurance->holder_name,
                'coverage_percent' => (float) $claim->insurance->coverage_percent,
                'coverage_limit' => $claim->insurance->coverage_limit !== null
                    ? (float) $claim->insurance->coverage_limit
                    : null,
                'start_date' => $claim->insurance->start_date instanceof Carbon
                    ? $claim->insurance->start_date->toDateString()
                    : $claim->insurance->start_date,
                'end_date' => $claim->insurance->end_date instanceof Carbon
                    ? $claim->insurance->end_date->toDateString()
                    : $claim->insurance->end_date,
                'is_active' => (bool) $claim->insurance->is_active,
                'patient' => Transform::patient($claim->insurance->patient),
                'company' => $company ? [
                    'id' => $company->id,
                    'name' => $company->name,
                    'code' => $company->code,
                ] : null,
            ] : null,
            'company' => $company ? [
                'id' => $company->id,
                'name' => $company->name,
                'code' => $company->code,
                'phone' => $company->phone,
                'email' => $company->email,
                'address' => $company->address,
                'is_active' => (bool) $company->is_active,
            ] : null,
            'amount' => (float) $claim->amount,
            'approved_amount' => $claim->approved_amount !== null ? (float) $claim->approved_amount : null,
            'status' => $claim->status,
            'submitted_at' => $claim->submitted_at?->toIso8601String(),
            'decided_at' => $claim->decided_at?->toIso8601String(),
            'notes' => $claim->notes,
            'created_at' => $claim->created_at?->toIso8601String(),
        ];
    }
}
