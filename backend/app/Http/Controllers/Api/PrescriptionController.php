<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Prescription;
use App\Models\PrescriptionItem;
use App\Support\GeneratesSequentialNumber;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class PrescriptionController extends Controller
{
    use GeneratesSequentialNumber;

    public function index(Request $request)
    {
        $query = Prescription::with(['patient', 'doctor', 'items.medicine']);

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('patient_id')) {
            $query->where('patient_id', $request->patient_id);
        }

        if ($request->has('doctor_id')) {
            $query->where('doctor_id', $request->doctor_id);
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('prescription_number', 'like', "%{$search}%")
                  ->orWhereHas('patient', function($pq) use ($search) {
                      $pq->where('first_name', 'like', "%{$search}%")
                        ->orWhere('last_name', 'like', "%{$search}%");
                  });
            });
        }

        $prescriptions = $query->paginate($request->per_page ?? 15);

        return response()->json([
            'data' => $prescriptions->items(),
            'meta' => [
                'current_page' => $prescriptions->currentPage(),
                'last_page' => $prescriptions->lastPage(),
                'per_page' => $prescriptions->perPage(),
                'total' => $prescriptions->total(),
            ]
        ]);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'patient_id' => 'required|exists:patients,id',
            'doctor_id' => 'required|exists:doctors,id',
            'visit_id' => 'nullable|exists:visits,id',
            'diagnosis' => 'nullable|string',
            'notes' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.medicine_id' => 'required|exists:medicines,id',
            'items.*.dosage' => 'required|string',
            'items.*.frequency' => 'required|string',
            'items.*.duration' => 'required|string',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.instructions' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        $data = $validator->validated();
        
        return DB::transaction(function() use ($data) {
            $prescriptionNumber = $this->next('RX', 'prescriptions', 'prescription_number');
            
            $prescription = Prescription::create([
                'prescription_number' => $prescriptionNumber,
                'patient_id' => $data['patient_id'],
                'doctor_id' => $data['doctor_id'],
                'visit_id' => $data['visit_id'] ?? null,
                'diagnosis' => $data['diagnosis'] ?? null,
                'notes' => $data['notes'] ?? null,
                'status' => 'pending',
            ]);

            foreach ($data['items'] as $item) {
                // Snapshot medicine name at time of prescription
                $medicine = \App\Models\Medicine::find($item['medicine_id']);
                
                PrescriptionItem::create([
                    'prescription_id' => $prescription->id,
                    'medicine_id' => $item['medicine_id'],
                    'medicine_name' => $medicine->name,
                    'dosage' => $item['dosage'],
                    'frequency' => $item['frequency'],
                    'duration' => $item['duration'],
                    'quantity' => $item['quantity'],
                    'instructions' => $item['instructions'] ?? null,
                ]);
            }

            return response()->json(['data' => $prescription->load('items')], 201);
        });
    }

    public function show($id)
    {
        $prescription = Prescription::with(['patient', 'doctor', 'items.medicine'])->findOrFail($id);
        return response()->json(['data' => $prescription]);
    }

    public function updateStatus(Request $request, $id)
    {
        $prescription = Prescription::findOrFail($id);
        
        $validator = Validator::make($request->all(), [
            'status' => 'required|in:pending,processing,dispensed,cancelled',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        $oldStatus = $prescription->status;
        $newStatus = $request->status;

        return DB::transaction(function() use ($prescription, $oldStatus, $newStatus) {
            // Expiry Blocking: Prevent dispensing if medicine is expired
            if ($newStatus === 'dispensed') {
                foreach ($prescription->items as $item) {
                    $expired = \App\Models\MedicineBatch::where('medicine_id', $item->medicine_id)
                        ->where('expiry_date', '<', now()->toDateString())
                        ->where('quantity_available', '>', 0)
                        ->exists();

                    if ($expired) {
                        return response()->json(['message' => "Cannot dispense: Medicine ID {$item->medicine_id} has expired batches."], 400);
                    }
                }
            }

            $prescription->update(['status' => $newStatus]);

            if ($newStatus === 'dispensed' && $oldStatus !== 'dispensed') {
                foreach ($prescription->items as $item) {
                    $medicine = \App\Models\Medicine::find($item->medicine_id);
                    if ($medicine) {
                        $medicine->decrement('stock_quantity', $item->quantity);
                        
                        \App\Models\PharmacyTransaction::create([
                            'medicine_id' => $medicine->id,
                            'type' => 'dispense',
                            'quantity' => -$item->quantity,
                            'unit_price' => $medicine->selling_price,
                            'total_price' => $medicine->selling_price * $item->quantity,
                            'reference' => "Prescription {$prescription->prescription_number}",
                            'performed_by' => auth()->id(),
                        ]);
                    }
                }
            }

            return response()->json(['data' => $prescription]);
        });
    }
}
