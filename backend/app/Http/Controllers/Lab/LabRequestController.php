<?php

namespace App\Http\Controllers\Lab;

use App\Http\Controllers\Controller;
use App\Http\Transformers\Transform;
use App\Models\LabRequest;
use App\Support\AuditLogger;
use App\Support\GeneratesSequentialNumber;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class LabRequestController extends Controller
{
    use GeneratesSequentialNumber;

    public function index(Request $request): JsonResponse
    {
        $query = LabRequest::query()
            ->with(['patient', 'doctor.user', 'results.test'])
            ->orderByDesc('requested_at')
            ->orderByDesc('id');

        $query = $this->scopeToSelf($request, $query);

        if ($request->filled('status')) {
            $query->where('status', $request->query('status'));
        }

        if ($request->filled('priority')) {
            $query->where('priority', $request->query('priority'));
        }

        if ($request->filled('patient_id')) {
            $query->where('patient_id', (int) $request->query('patient_id'));
        }

        if ($request->filled('date')) {
            $query->whereDate('requested_at', $request->query('date'));
        }

        if ($request->filled('search')) {
            $search = trim((string) $request->query('search'));
            $query->where(function ($q) use ($search) {
                $q->where('request_number', 'like', "%{$search}%")
                    ->orWhereHas('patient', function ($patient) use ($search) {
                        $patient->where('first_name', 'like', "%{$search}%")
                            ->orWhere('last_name', 'like', "%{$search}%")
                            ->orWhere('phone', 'like', "%{$search}%");
                    });
            });
        }

        return $this->paginated(
            $request,
            $query,
            fn (LabRequest $labRequest) => Transform::labRequest($labRequest)
        );
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'patient_id' => 'required|integer|exists:patients,id',
            'visit_id' => 'nullable|integer|exists:visits,id',
            'doctor_id' => 'nullable|integer|exists:doctors,id',
            'priority' => 'sometimes|in:routine,urgent',
            'notes' => 'nullable|string',
            'test_ids' => 'required|array|min:1',
            'test_ids.*' => 'required|integer|exists:lab_tests,id|distinct',
        ]);

        $doctorId = $validated['doctor_id'] ?? $request->user()?->doctor?->id;

        $labRequest = DB::transaction(function () use ($validated, $doctorId) {
            $labRequest = LabRequest::create([
                'request_number' => $this->next('LAB', 'lab_requests', 'request_number'),
                'patient_id' => $validated['patient_id'],
                'visit_id' => $validated['visit_id'] ?? null,
                'doctor_id' => $doctorId,
                'priority' => $validated['priority'] ?? 'routine',
                'notes' => $validated['notes'] ?? null,
                'status' => 'requested',
                'requested_at' => now(),
            ]);

            foreach ($validated['test_ids'] as $testId) {
                $labRequest->results()->create([
                    'lab_test_id' => $testId,
                    'status' => 'pending',
                ]);
            }

            return $labRequest;
        });

        $patient = $labRequest->patient;
        $patientName = trim("{$patient->first_name} {$patient->last_name}");

        AuditLogger::log('create', "Lab request {$labRequest->request_number} created for {$patientName}", $labRequest);

        return $this->ok($this->transform($labRequest));
    }

    public function show(Request $req, LabRequest $request): JsonResponse
    {
        if ($this->isPatientPortal($req) && $req->user()->patient_id !== $request->patient_id) {
            return response()->json(['message' => 'This action is unauthorized.'], 403);
        }

        return $this->ok($this->transform($request));
    }

    public function start(LabRequest $request): JsonResponse
    {
        if ($request->status !== 'requested') {
            return response()->json([
                'message' => 'Only requested lab requests can be started.',
            ], 422);
        }

        DB::transaction(function () use ($request) {
            $request->update(['status' => 'processing']);
            $request->results()->where('status', 'pending')->update(['status' => 'processing']);
        });

        AuditLogger::log('update', "Lab request {$request->request_number} started", $request);

        return $this->ok($this->transform($request));
    }

    public function results(Request $req, LabRequest $request): JsonResponse
    {
        $validated = $req->validate([
            'results' => 'required|array|min:1',
            'results.*.lab_test_id' => 'required|integer|exists:lab_tests,id',
            'results.*.result_value' => 'required|string',
            'results.*.reference_range' => 'nullable|string|max:255',
            'results.*.unit' => 'nullable|string|max:255',
            'results.*.notes' => 'nullable|string',
            'file' => 'nullable|file|max:20480',
        ]);

        $rows = $request->results()
            ->whereIn('lab_test_id', array_column($validated['results'], 'lab_test_id'))
            ->get()
            ->keyBy('lab_test_id');

        $missing = collect($validated['results'])
            ->pluck('lab_test_id')
            ->unique()
            ->reject(fn ($testId) => $rows->has($testId))
            ->values();

        if ($missing->isNotEmpty()) {
            return response()->json([
                'message' => 'One or more tests do not belong to this lab request.',
            ], 422);
        }

        $filePath = null;

        if ($req->hasFile('file') && count($validated['results']) === 1) {
            $filePath = $req->file('file')->store('lab/results', 'public');
        }

        DB::transaction(function () use ($request, $validated, $rows, $filePath) {
            foreach ($validated['results'] as $item) {
                $row = $rows->get($item['lab_test_id']);

                $row->fill([
                    'status' => 'completed',
                    'result_value' => $item['result_value'],
                    'reference_range' => $item['reference_range'] ?? null,
                    'unit' => $item['unit'] ?? null,
                    'notes' => $item['notes'] ?? null,
                    'performed_by' => auth()->id(),
                    'performed_at' => now(),
                ]);

                if ($filePath) {
                    $row->file_path = $filePath;
                }

                $row->save();
            }

            $complete = ! $request->results()->where('status', '!=', 'completed')->exists();

            if ($complete) {
                $request->update(['status' => 'completed']);
            }

            AuditLogger::log(
                'update',
                $complete
                    ? "Lab request {$request->request_number} completed"
                    : "Lab request {$request->request_number} results recorded",
                $request
            );
        });

        return $this->ok($this->transform($request));
    }

    public function cancel(LabRequest $request): JsonResponse
    {
        if ($request->status === 'completed') {
            return response()->json([
                'message' => 'A completed lab request cannot be cancelled.',
            ], 422);
        }

        if (! in_array($request->status, ['requested', 'processing'], true)) {
            return response()->json([
                'message' => 'Only requested or processing lab requests can be cancelled.',
            ], 422);
        }

        $request->update(['status' => 'cancelled']);

        AuditLogger::log('update', "Lab request {$request->request_number} cancelled", $request);

        return $this->ok($this->transform($request));
    }

    private function transform(LabRequest $labRequest): ?array
    {
        $labRequest->loadMissing(['patient', 'doctor.user', 'results.test']);

        return Transform::labRequest($labRequest);
    }
}
