<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Service;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Payment;
use App\Support\GeneratesSequentialNumber;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class BillingController extends Controller
{
    use GeneratesSequentialNumber;

    public function index(Request $request)
    {
        $query = Invoice::with(['patient', 'items']);

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('patient_id')) {
            $query->where('patient_id', $request->patient_id);
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('invoice_number', 'like', "%{$search}%")
                  ->orWhereHas('patient', function($pq) use ($search) {
                      $pq->where('first_name', 'like', "%{$search}%")
                        ->orWhere('last_name', 'like', "%{$search}%");
                  });
            });
        }

        $invoices = $query->paginate($request->per_page ?? 15);

        return response()->json([
            'data' => $invoices->items(),
            'meta' => [
                'current_page' => $invoices->currentPage(),
                'last_page' => $invoices->lastPage(),
                'per_page' => $invoices->perPage(),
                'total' => $invoices->total(),
            ]
        ]);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'patient_id' => 'required|exists:patients,id',
            'visit_id' => 'nullable|exists:visits,id',
            'admission_id' => 'nullable|exists:admissions,id',
            'discount' => 'nullable|numeric|min:0',
            'tax' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.service_id' => 'nullable|exists:services,id',
            'items.*.description' => 'required|string',
            'items.*.item_type' => 'required|in:consultation,lab,medicine,room,procedure,other',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.unit_price' => 'required|numeric|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        $data = $validator->validated();
        
        return DB::transaction(function() use ($data) {
            $subTotal = 0;
            foreach ($data['items'] as $item) {
                $subTotal += ($item['quantity'] * $item['unit_price']);
            }

            $tax = $data['tax'] ?? 0;
            $discount = $data['discount'] ?? 0;
            $total = ($subTotal + $tax) - $discount;

            $invoiceNumber = $this->next('INV', 'invoices', 'invoice_number');

            $invoice = Invoice::create([
                'invoice_number' => $invoiceNumber,
                'patient_id' => $data['patient_id'],
                'visit_id' => $data['visit_id'] ?? null,
                'admission_id' => $data['admission_id'] ?? null,
                'sub_total' => $subTotal,
                'discount' => $discount,
                'tax' => $tax,
                'total' => $total,
                'paid_amount' => 0,
                'status' => 'unpaid',
                'notes' => $data['notes'] ?? null,
                'issued_by' => auth()->id(),
            ]);

            foreach ($data['items'] as $item) {
                InvoiceItem::create([
                    'invoice_id' => $invoice->id,
                    'service_id' => $item['service_id'] ?? null,
                    'description' => $item['description'],
                    'item_type' => $item['item_type'],
                    'quantity' => $item['quantity'],
                    'unit_price' => $item['unit_price'],
                    'total' => $item['quantity'] * $item['unit_price'],
                ]);
            }

            return response()->json(['data' => $invoice->load('items')], 201);
        });
    }

    public function addPayment(Request $request, $id)
    {
        $invoice = Invoice::findOrFail($id);
        
        $validator = Validator::make($request->all(), [
            'amount' => 'required|numeric|min:0.01',
            'method' => 'required|in:cash,card,bank_transfer,insurance,mobile_money',
            'reference' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        return DB::transaction(function() use ($request, $invoice) {
            $paymentNumber = $this->next('PAY', 'payments', 'payment_number');

            Payment::create([
                'payment_number' => $paymentNumber,
                'invoice_id' => $invoice->id,
                'patient_id' => $invoice->patient_id,
                'amount' => $request->amount,
                'method' => $request->method,
                'reference' => $request->reference ?? null,
                'status' => 'completed',
                'received_by' => auth()->id(),
                'paid_at' => now(),
            ]);

            $newPaidAmount = $invoice->paid_amount + $request->amount;
            $status = 'partial';
            if ($newPaidAmount >= $invoice->total) {
                $status = 'paid';
            }

            $invoice->update([
                'paid_amount' => $newPaidAmount,
                'status' => $status,
            ]);

            return response()->json(['data' => $invoice]);
        });
    }
}
