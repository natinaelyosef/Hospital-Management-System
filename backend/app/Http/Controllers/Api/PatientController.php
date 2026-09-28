<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Patient;
use App\Support\GeneratesSequentialNumber;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Validator;

class PatientController extends Controller
{
    use GeneratesSequentialNumber;

    public function index(Request $request)
    {
        $query = Patient::query();

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                  ->orWhere('last_name', 'like', "%{$search}%")
                  ->orWhere('patient_number', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        if ($request->has('gender')) {
            $query->where('gender', $request->gender);
        }

        if ($request->has('blood_group')) {
            $query->where('blood_group', $request->blood_group);
        }

        $patients = $query->paginate($request->per_page ?? 15);

        return response()->json([
            'data' => $patients->items(),
            'meta' => [
                'current_page' => $patients->currentPage(),
                'last_page' => $patients->lastPage(),
                'per_page' => $patients->perPage(),
                'total' => $patients->total(),
            ]
        ]);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'first_name' => 'required|string|max:255',
            'last_name' => 'required|string|max:255',
            'gender' => 'required|in:male,female,other',
            'date_of_birth' => 'required|date',
            'phone' => 'required|string|max:20|unique:patients',
            'email' => 'nullable|email|unique:patients',
            'address' => 'nullable|string',
            'emergency_contact_name' => 'nullable|string',
            'emergency_contact_phone' => 'nullable|string',
            'blood_group' => 'nullable|string',
            'allergies' => 'nullable|string',
            'medical_history' => 'nullable|string',
            'user_id' => 'nullable|exists:users,id',
            'registered_by' => 'nullable|exists:users,id',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        $data = $validator->validated();
        $data['patient_number'] = $this->next('P', 'patients', 'patient_number');

        $patient = Patient::create($data);

        return response()->json(['data' => $patient], 201);
    }

    public function show($id)
    {
        $patient = Patient::with(['documents', 'medicalHistories'])->findOrFail($id);
        return response()->json(['data' => $patient]);
    }

    public function update(Request $request, $id)
    {
        $patient = Patient::findOrFail($id);
        
        $validator = Validator::make($request->all(), [
            'first_name' => 'sometimes|string|max:255',
            'last_name' => 'sometimes|string|string|max:255',
            'gender' => 'sometimes|in:male,female,other',
            'date_of_birth' => 'sometimes|date',
            'phone' => 'sometimes|string|max:20|unique:patients,phone,' . $id,
            'email' => 'sometimes|email|unique:patients,email,' . $id,
            'address' => 'sometimes|string',
            'emergency_contact_name' => 'sometimes|string',
            'emergency_contact_phone' => 'sometimes|string',
            'blood_group' => 'sometimes|string',
            'allergies' => 'sometimes|string',
            'medical_history' => 'sometimes|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        $patient->update($validator->validated());

        return response()->json(['data' => $patient]);
    }

    public function destroy($id)
    {
        $patient = Patient::findOrFail($id);
        $patient->delete();

        return response()->json(['message' => 'Patient deleted successfully']);
    }
}
