<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Medicine;
use App\Models\MedicineBatch;
use App\Models\MedicineCategory;
use App\Models\Supplier;
use App\Models\PharmacyTransaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class PharmacyController extends Controller
{
    public function index(Request $request)
    {
        $query = Medicine::with(['category', 'supplier']);

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('generic_name', 'like', "%{$search}%");
            });
        }

        if ($request->has('category_id')) {
            $query->where('category_id', $request->category_id);
        }

        if ($request->get('low_stock') === '1') {
            $query->whereRaw('stock_quantity <= reorder_level');
        }

        $medicines = $query->paginate($request->per_page ?? 15);

        return response()->json([
            'data' => $medicines->items(),
            'meta' => [
                'current_page' => $medicines->currentPage(),
                'last_page' => $medicines->lastPage(),
                'per_page' => $medicines->perPage(),
                'total' => $medicines->total(),
            ]
        ]);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'generic_name' => 'nullable|string',
            'category_id' => 'nullable|exists:medicine_categories,id',
            'supplier_id' => 'nullable|exists:suppliers,id',
            'form' => 'nullable|string',
            'strength' => 'nullable|string',
            'unit' => 'nullable|string',
            'stock_quantity' => 'required|integer|min:0',
            'reorder_level' => 'required|integer|min:0',
            'selling_price' => 'required|numeric|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        $medicine = Medicine::create($validator->validated());
        return response()->json(['data' => $medicine], 201);
    }

    public function addBatch(Request $request, $id)
    {
        $medicine = Medicine::findOrFail($id);
        
        $validator = Validator::make($request->all(), [
            'batch_number' => 'required|string',
            'expiry_date' => 'required|date',
            'quantity' => 'required|integer|min:1',
            'purchase_price' => 'required|numeric|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        return DB::transaction(function() use ($request, $medicine) {
            $batch = MedicineBatch::create([
                'medicine_id' => $medicine->id,
                'batch_number' => $request->batch_number,
                'expiry_date' => $request->expiry_date,
                'quantity_received' => $request->quantity,
                'quantity_available' => $request->quantity,
                'purchase_price' => $request->purchase_price,
                'received_at' => now(),
            ]);

            // Update main stock
            $medicine->increment('stock_quantity', $request->quantity);

            // Create transaction record
            PharmacyTransaction::create([
                'medicine_id' => $medicine->id,
                'batch_id' => $batch->id,
                'type' => 'purchase',
                'quantity' => $request->quantity,
                'unit_price' => $request->purchase_price,
                'total_price' => $request->purchase_price * $request->quantity,
                'performed_by' => auth()->id(),
                'notes' => 'Stock added via batch ' . $request->batch_number,
            ]);

            return response()->json(['data' => $batch], 201);
        });
    }

    public function getAlerts()
    {
        $lowStock = Medicine::whereRaw('stock_quantity <= reorder_level')->get();
        
        // Find medicines with any batch expiring within 90 days
        $expiringSoon = Medicine::whereHas('batches', function($q) {
            $q->whereBetween('expiry_date', [now()->toDateString(), now()->addDays(90)->toDateString()]);
        })->get();

        $expired = Medicine::whereHas('batches', function($q) {
            $q->where('expiry_date', '<', now()->toDateString());
        })->get();

        return response()->json([
            'low_stock' => $lowStock,
            'expiring_soon' => $expiringSoon,
            'expired' => $expired,
        ]);
    }

    public function transactions(Request $request)
    {
        $query = PharmacyTransaction::with(['medicine']);

        if ($request->has('type')) {
            $query->where('type', $request->type);
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('reference', 'like', "%{$search}%")
                  ->orWhereHas('medicine', function($mq) use ($search) {
                      $mq->where('name', 'like', "%{$search}%");
                  });
            });
        }

        $transactions = $query->orderBy('created_at', 'desc')->paginate($request->per_page ?? 15);

        return response()->json([
            'data' => $transactions->items(),
            'meta' => [
                'current_page' => $transactions->currentPage(),
                'last_page' => $transactions->lastPage(),
                'per_page' => $transactions->perPage(),
                'total' => $transactions->total(),
            ]
        ]);
    }
}
