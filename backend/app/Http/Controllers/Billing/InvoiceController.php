<?php

namespace App\Http\Controllers\Billing;

use App\Http\Controllers\Controller;
use App\Http\Transformers\Transform;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\Setting;
use App\Support\AuditLogger;
use App\Support\GeneratesSequentialNumber;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class InvoiceController extends Controller
{
    use GeneratesSequentialNumber;

    private const RELATIONS = ['patient', 'items', 'payments.receiver', 'issuer'];

    public function index(Request $request): JsonResponse
    {
        $query = Invoice::query()->with(self::RELATIONS);

        if ($request->filled('status')) {
            $query->where('status', $request->query('status'));
        }

        if ($request->filled('patient_id')) {
            $query->where('patient_id', (int) $request->query('patient_id'));
        }

        if ($request->filled('date')) {
            $query->whereDate('created_at', $request->query('date'));
        }

        $search = trim((string) $request->query('search'));
        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('invoice_number', 'like', "%{$search}%")
                    ->orWhereHas('patient', function ($p) use ($search) {
                        $p->where(function ($w) use ($search) {
                            $w->where('first_name', 'like', "%{$search}%")
                                ->orWhere('last_name', 'like', "%{$search}%")
                                ->orWhereRaw("concat(first_name, ' ', last_name) like ?", ["%{$search}%"]);
                        });
                    });
            });
        }

        $this->scopeToSelf($request, $query);

        return $this->paginated(
            $request,
            $query->orderByDesc('created_at')->orderByDesc('id'),
            fn (Invoice $invoice) => Transform::invoice($invoice)
        );
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'patient_id' => ['required', 'integer', 'exists:patients,id'],
            'visit_id' => ['nullable', 'integer', 'exists:visits,id'],
            'admission_id' => ['nullable', 'integer', 'exists:admissions,id'],
            'discount' => ['nullable', 'numeric', 'min:0'],
            'tax' => ['nullable', 'numeric', 'min:0'],
            'notes' => ['nullable', 'string'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.service_id' => ['nullable', 'integer', 'exists:services,id'],
            'items.*.description' => ['required', 'string', 'max:255'],
            'items.*.item_type' => ['required', Rule::in(['consultation', 'lab', 'medicine', 'room', 'procedure', 'other'])],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'items.*.unit_price' => ['required', 'numeric', 'min:0'],
        ]);

        $discount = (float) ($data['discount'] ?? 0);
        $tax = (float) ($data['tax'] ?? 0);
        [$rows, $subTotal] = $this->buildItems($data['items']);

        $invoice = DB::transaction(function () use ($data, $rows, $subTotal, $discount, $tax, $request) {
            $invoice = Invoice::create([
                'invoice_number' => $this->next('INV', 'invoices', 'invoice_number'),
                'patient_id' => $data['patient_id'],
                'visit_id' => $data['visit_id'] ?? null,
                'admission_id' => $data['admission_id'] ?? null,
                'sub_total' => $subTotal,
                'discount' => $discount,
                'tax' => $tax,
                'total' => round($subTotal - $discount + $tax, 2),
                'paid_amount' => 0,
                'insurance_covered' => 0,
                'status' => 'unpaid',
                'notes' => $data['notes'] ?? null,
                'issued_by' => $request->user()?->id,
            ]);

            foreach ($rows as $row) {
                $invoice->items()->create($row);
            }

            return $invoice;
        });

        AuditLogger::log('create', "Invoice {$invoice->invoice_number} created", $invoice, null, [
            'patient_id' => $invoice->patient_id,
            'total' => (float) $invoice->total,
        ]);

        return $this->ok(Transform::invoice($invoice->load(self::RELATIONS)));
    }

    public function show(Invoice $invoice): JsonResponse
    {
        $invoice->load(self::RELATIONS);

        return $this->ok(Transform::invoice($invoice));
    }

    public function update(Request $request, Invoice $invoice): JsonResponse
    {
        if ($invoice->status !== 'unpaid') {
            return response()->json([
                'message' => 'Only unpaid invoices can be edited.',
            ], 422);
        }

        $data = $request->validate([
            'patient_id' => ['sometimes', 'required', 'integer', 'exists:patients,id'],
            'visit_id' => ['nullable', 'integer', 'exists:visits,id'],
            'admission_id' => ['nullable', 'integer', 'exists:admissions,id'],
            'discount' => ['nullable', 'numeric', 'min:0'],
            'tax' => ['nullable', 'numeric', 'min:0'],
            'notes' => ['nullable', 'string'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.service_id' => ['nullable', 'integer', 'exists:services,id'],
            'items.*.description' => ['required', 'string', 'max:255'],
            'items.*.item_type' => ['required', Rule::in(['consultation', 'lab', 'medicine', 'room', 'procedure', 'other'])],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'items.*.unit_price' => ['required', 'numeric', 'min:0'],
        ]);

        $old = [
            'sub_total' => (float) $invoice->sub_total,
            'discount' => (float) $invoice->discount,
            'tax' => (float) $invoice->tax,
            'total' => (float) $invoice->total,
        ];

        $discount = (float) ($data['discount'] ?? $invoice->discount);
        $tax = (float) ($data['tax'] ?? $invoice->tax);
        [$rows, $subTotal] = $this->buildItems($data['items']);

        DB::transaction(function () use ($invoice, $data, $rows, $subTotal, $discount, $tax) {
            if (array_key_exists('patient_id', $data)) {
                $invoice->patient_id = $data['patient_id'];
            }
            if (array_key_exists('visit_id', $data)) {
                $invoice->visit_id = $data['visit_id'];
            }
            if (array_key_exists('admission_id', $data)) {
                $invoice->admission_id = $data['admission_id'];
            }
            if (array_key_exists('notes', $data)) {
                $invoice->notes = $data['notes'];
            }

            $invoice->discount = $discount;
            $invoice->tax = $tax;
            $invoice->sub_total = $subTotal;
            $invoice->total = round($subTotal - $discount + $tax, 2);

            $invoice->save();

            $invoice->items()->delete();
            foreach ($rows as $row) {
                $invoice->items()->create($row);
            }
        });

        AuditLogger::log('update', "Invoice {$invoice->invoice_number} updated", $invoice, $old, [
            'sub_total' => $subTotal,
            'discount' => $discount,
            'tax' => $tax,
            'total' => round($subTotal - $discount + $tax, 2),
        ]);

        return $this->ok(Transform::invoice($invoice->load(self::RELATIONS)));
    }

    public function storePayment(Request $request, Invoice $invoice): JsonResponse
    {
        $data = $request->validate([
            'amount' => ['required', 'numeric', 'min:0.01'],
            'method' => ['required', Rule::in(['cash', 'card', 'bank_transfer', 'insurance', 'mobile_money'])],
            'reference' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string'],
        ]);

        if ($invoice->status === 'cancelled') {
            return response()->json(['message' => 'Payments cannot be recorded on a cancelled invoice.'], 422);
        }

        $balance = round((float) $invoice->total - (float) $invoice->paid_amount, 2);

        if ($data['amount'] > $balance + 0.001) {
            return response()->json([
                'message' => "Payment amount exceeds the outstanding balance of {$balance}.",
            ], 422);
        }

        [$payment, $invoice] = DB::transaction(function () use ($data, $invoice, $request) {
            $payment = Payment::create([
                'payment_number' => $this->next('PAY', 'payments', 'payment_number'),
                'invoice_id' => $invoice->id,
                'patient_id' => $invoice->patient_id,
                'amount' => $data['amount'],
                'method' => $data['method'],
                'reference' => $data['reference'] ?? null,
                'status' => 'completed',
                'received_by' => $request->user()?->id,
                'paid_at' => now(),
                'notes' => $data['notes'] ?? null,
            ]);

            $paidAmount = round((float) $invoice->paid_amount + (float) $data['amount'], 2);
            $settled = $paidAmount >= (float) $invoice->total - 0.001;

            $invoice->paid_amount = $paidAmount;
            $invoice->status = $settled ? 'paid' : 'partial';
            $invoice->paid_at = $settled ? ($invoice->paid_at ?? now()) : $invoice->paid_at;
            $invoice->save();

            return [$payment, $invoice->fresh()];
        });

        AuditLogger::log('create', "Payment {$payment->payment_number} recorded", $payment, null, [
            'invoice_id' => $invoice->id,
            'amount' => (float) $payment->amount,
            'method' => $payment->method,
        ]);

        return $this->ok([
            'invoice' => Transform::invoice($invoice->load(self::RELATIONS)),
            'payment' => Transform::payment($payment->load('receiver')),
        ]);
    }

    public function pdf(Invoice $invoice)
    {
        $invoice->load(['patient', 'items', 'payments.receiver', 'issuer']);

        $settings = Setting::query()->pluck('value', 'key');

        $pdf = Pdf::loadView('invoices.pdf', [
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

        return $pdf->download($invoice->invoice_number.'.pdf');
    }

    /**
     * @param  array<int, array<string, mixed>>  $items
     * @return array{0: array<int, array<string, mixed>>, 1: float}
     */
    private function buildItems(array $items): array
    {
        $rows = [];
        $subTotal = 0.0;

        foreach ($items as $item) {
            $total = round((int) $item['quantity'] * (float) $item['unit_price'], 2);
            $subTotal += $total;

            $rows[] = [
                'service_id' => $item['service_id'] ?? null,
                'description' => $item['description'],
                'item_type' => $item['item_type'],
                'quantity' => (int) $item['quantity'],
                'unit_price' => (float) $item['unit_price'],
                'total' => $total,
            ];
        }

        return [$rows, round($subTotal, 2)];
    }
}
