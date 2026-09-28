<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Visit;
use App\Support\GeneratesSequentialNumber;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class VisitController extends Controller
{
    use GeneratesSequentialNumber;

    public function index(Request $request)
    {
        $query = Visit::with(['patient', 'doctor']);

        if ($request->has('patient_id')) {
            $query->where('patient_id', $request->patient_id);
        }

        if ($request->has('doctor_id')) {
            $query->where('doctor_id', $request->doctor_id);
        }

        if ($request->has('date')) {
            $query->whereDate('visit_date', $request->date);
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('visit_number', 'like', "%{$search}%")
                  ->orWhereHas('patient', function($pq) use ($search) {
                      $pq->where('first_name', 'like', "%{$search}%")
                        ->orWhere('last_name', 'like', "%{$search}%");
                  });
            });
        }

        $visits = $query->paginate($request->per_page ?? 15);

        return response()->json([
            'data' => $visits->items(),
            'meta' => [
                'current_page' => $visits->currentPage(),
                'last_page' => $visits->lastPage(),
                'per_page' => $visits->perPage(),
                'total' => $visits->total(),
            ]
        ]);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'patient_id' => 'required|exists:patients,id',
            'doctor_id' => 'required|exists:doctors,id',
            'appointment_id' => 'nullable|exists:appointments,id',
            'department_id' => 'nullable|exists:departments,id',
            'visit_date' => 'required|date',
            'type' => 'required|in:opd,emergency,follow_up',
            'chief_complaint' => 'nullable|string',
            'symptoms' => 'nullable|string',
            'diagnosis' => 'nullable|string',
            'treatment' => 'nullable|string',
            'medical_notes' => 'nullable|string',
            'follow_up_date' => 'nullable|date',
            'status' => 'nullable|in:in_progress,completed',
            'created_by' => 'nullable|exists:users,id',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        $data = $validator->validated();
        $data['visit_number'] = $this->next('VST', 'visits', 'visit_number');
        $data['status'] = $data['status'] ?? 'in_progress';

        $visit = Visit::create($data);

        // If this visit was created from an appointment, mark appointment as completed
        if ($visit->appointment_id) {
            $visit->appointment()->update(['status' => 'completed', 'visit_id' => $visit->id]);
        }

        return response()->json(['data' => $visit], 201);
    }

    public function show($id)
    {
        $visit = Visit::with(['patient', 'doctor', 'vitalSigns', 'medicalNotes', 'prescriptions', 'labRequests'])->findOrFail($id);
        return response()->json(['data' => $visit]);
    }

    public function update(Request $request, $id)
    {
        $visit = Visit::findOrFail($id);
        
        $validator = Validator::make($request->all(), [
            'chief_complaint' => 'sometimes|string',
            'symptoms' => 'sometimes|string',
            'diagnosis' => 'sometimes|string',
            'treatment' => 'sometimes|string',
            'medical_notes' => 'sometimes|string',
            'follow_up_date' => 'sometimes|date',
            'status' => 'sometimes|in:in_progress,completed',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        $visit->update($validator->validated());

        return response()->json(['data' => $visit]);
    }

    public function complete($id)
    {
        $visit = Visit::findOrFail($id);
        $visit->update(['status' => 'completed']);

        return response()->json(['data' => $visit]);
    }
}
