<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LabTest;
use App\Models\LabRequest;
use App\Models\LabResult;
use App\Support\GeneratesSequentialNumber;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class LabController extends Controller
{
    use GeneratesSequentialNumber;

    public function index(Request $request)
    {
        $query = LabRequest::with(['patient', 'doctor', 'results.test']);

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('patient_id')) {
            $query->where('patient_id', $request->patient_id);
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('request_number', 'like', "%{$search}%")
                  ->orWhereHas('patient', function($pq) use ($search) {
                      $pq->where('first_name', 'like', "%{$search}%")
                        ->orWhere('last_name', 'like', "%{$search}%");
                  });
            });
        }

        $requests = $query->paginate($request->per_page ?? 15);

        return response()->json([
            'data' => $requests->items(),
            'meta' => [
                'current_page' => $requests->currentPage(),
                'last_page' => $requests->lastPage(),
                'per_page' => $requests->perPage(),
                'total' => $requests->total(),
            ]
        ]);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'patient_id' => 'required|exists:patients,id',
            'visit_id' => 'nullable|exists:visits,id',
            'doctor_id' => 'nullable|exists:doctors,id',
            'priority' => 'required|in:routine,urgent',
            'notes' => 'nullable|string',
            'test_ids' => 'required|array|min:1',
            'test_ids.*' => 'required|exists:lab_tests,id',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        $data = $validator->validated();
        $requestNumber = $this->next('LAB', 'lab_requests', 'request_number');

        $labRequest = LabRequest::create([
            'request_number' => $requestNumber,
            'patient_id' => $data['patient_id'],
            'visit_id' => $data['visit_id'] ?? null,
            'doctor_id' => $data['doctor_id'] ?? null,
            'priority' => $data['priority'],
            'notes' => $data['notes'] ?? null,
            'status' => 'requested',
        ]);

        // Create pending results for each requested test
        foreach ($data['test_ids'] as $testId) {
            LabResult::create([
                'lab_request_id' => $labRequest->id,
                'lab_test_id' => $testId,
                'status' => 'pending',
            ]);
        }

        return response()->json(['data' => $labRequest], 201);
    }

    public function show($id)
    {
        $request = LabRequest::with(['patient', 'doctor', 'results.test'])->findOrFail($id);
        return response()->json(['data' => $request]);
    }

    public function start($id)
    {
        $labRequest = LabRequest::findOrFail($id);
        $labRequest->update(['status' => 'processing']);

        return response()->json(['data' => $labRequest]);
    }

    public function submitResults(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'results' => 'required|array',
            'results.*.lab_test_id' => 'required|exists:lab_results,lab_test_id', // Note: checking existence in results table for this request
            'results.*.result_value' => 'required|string',
            'results.*.reference_range' => 'nullable|string',
            'results.*.unit' => 'nullable|string',
            'results.*.notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        return DB::transaction(function() use ($request, $id) {
            $labRequest = LabRequest::findOrFail($id);
            
            foreach ($request->results as $resData) {
                $result = LabResult::where('lab_request_id', $id)
                    ->where('lab_test_id', $resData['lab_test_id'])
                    ->firstOrFail();

                $result->update([
                    'result_value' => $resData['result_value'],
                    'reference_range' => $resData['reference_range'] ?? null,
                    'unit' => $resData['unit'] ?? null,
                    'notes' => $resData['notes'] ?? null,
                    'status' => 'completed',
                    'performed_by' => auth()->id(),
                    'performed_at' => now(),
                ]);
            }

            // If all tests for this request are completed, mark request as completed
            $pending = LabResult::where('lab_request_id', $id)->where('status', '!=', 'completed')->count();
            if ($pending === 0) {
                $labRequest->update(['status' => 'completed']);
            }

            return response()->json(['data' => $labRequest->load('results')]);
        });
    }

    public function cancel($id)
    {
        $labRequest = LabRequest::findOrFail($id);
        $labRequest->update(['status' => 'cancelled']);

        return response()->json(['data' => $labRequest]);
    }
}
