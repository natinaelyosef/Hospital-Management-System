<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Ward;
use App\Models\Room;
use App\Models\Bed;
use App\Models\Admission;
use App\Support\GeneratesSequentialNumber;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class WardController extends Controller
{
    use GeneratesSequentialNumber;

    public function index()
    {
        $wards = Ward::withCount(['rooms', 'beds'])->get();
        return response()->json(['data' => $wards]);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string',
            'code' => 'required|string|unique:wards',
            'floor' => 'nullable|string',
            'type' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        $ward = Ward::create($validator->validated());
        return response()->json(['data' => $ward], 201);
    }

    public function getBedsAvailability()
    {
        $total = Bed::count();
        $occupied = Bed::where('status', 'occupied')->count();
        $available = Bed::where('status', 'available')->count();

        return response()->json([
            'total' => $total,
            'occupied' => $occupied,
            'available' => $available,
        ]);
    }

    public function admit(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'patient_id' => 'required|exists:patients,id',
            'ward_id' => 'required|exists:wards,id',
            'room_id' => 'required|exists:rooms,id',
            'bed_id' => 'required|exists:beds,id',
            'consultant_id' => 'nullable|exists:doctors,id',
            'diagnosis' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        return DB::transaction(function() use ($request) {
            $bed = Bed::findOrFail($request->bed_id);
            if ($bed->status !== 'available') {
                return response()->json(['message' => 'Selected bed is not available'], 400);
            }

            $admissionNumber = $this->next('ADM', 'admissions', 'admission_number');
            
            $admission = Admission::create([
                'admission_number' => $admissionNumber,
                'patient_id' => $request->patient_id,
                'ward_id' => $request->ward_id,
                'room_id' => $request->room_id,
                'bed_id' => $request->bed_id,
                'consultant_id' => $request->consultant_id ?? null,
                'diagnosis' => $request->diagnosis ?? null,
                'status' => 'admitted',
                'admitted_by' => auth()->id(),
            ]);

            $bed->update(['status' => 'occupied']);

            return response()->json(['data' => $admission], 201);
        });
    }

    public function transfer(Request $request, $id)
    {
        $admission = Admission::findOrFail($id);
        
        $validator = Validator::make($request->all(), [
            'ward_id' => 'required|exists:wards,id',
            'room_id' => 'required|exists:rooms,id',
            'bed_id' => 'required|exists:beds,id',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        return DB::transaction(function() use ($request, $admission) {
            $oldBed = Bed::find($admission->bed_id);
            $newBed = Bed::findOrFail($request->bed_id);

            if ($newBed->status !== 'available') {
                return response()->json(['message' => 'Target bed is not available'], 400);
            }

            $admission->update([
                'ward_id' => $request->ward_id,
                'room_id' => $request->room_id,
                'bed_id' => $request->bed_id,
            ]);

            if ($oldBed) {
                $oldBed->update(['status' => 'available']);
            }
            $newBed->update(['status' => 'occupied']);

            return response()->json(['data' => $admission]);
        });
    }

    public function discharge(Request $request, $id)
    {
        $admission = Admission::findOrFail($id);
        
        $validator = Validator::make($request->all(), [
            'outcome' => 'required|in:recovered,improved,referred,deceased,left_against_advice',
            'discharge_summary' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        return DB::transaction(function() use ($request, $admission) {
            $admission->update([
                'status' => 'discharged',
                'discharged_at' => now(),
                'discharged_by' => auth()->id(),
                'outcome' => $request->outcome,
                'discharge_summary' => $request->discharge_summary ?? null,
            ]);

            $bed = Bed::find($admission->bed_id);
            if ($bed) {
                $bed->update(['status' => 'available']);
            }

            return response()->json(['data' => $admission]);
        });
    }
}
