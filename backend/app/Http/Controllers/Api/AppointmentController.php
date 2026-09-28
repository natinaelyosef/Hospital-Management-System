<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Support\GeneratesSequentialNumber;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class AppointmentController extends Controller
{
    use GeneratesSequentialNumber;

    public function index(Request $request)
    {
        $query = Appointment::with(['patient', 'doctor', 'department']);

        if ($request->has('date')) {
            $date = $request->date;
            if ($date === 'today') {
                $query->whereDate('appointment_date', now()->toDateString());
            } elseif ($date === 'week') {
                $query->whereBetween('appointment_date', [now()->startOfWeek(), now()->endOfWeek()]);
            } elseif ($date === 'month') {
                $query->whereMonth('appointment_date', now()->month);
            } else {
                $query->whereDate('appointment_date', $date);
            }
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('doctor_id')) {
            $query->where('doctor_id', $request->doctor_id);
        }

        if ($request->has('patient_id')) {
            $query->where('patient_id', $request->patient_id);
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('appointment_number', 'like', "%{$search}%")
                  ->orWhereHas('patient', function($pq) use ($search) {
                      $pq->where('first_name', 'like', "%{$search}%")
                        ->orWhere('last_name', 'like', "%{$search}%");
                  });
            });
        }

        $appointments = $query->paginate($request->per_page ?? 15);

        return response()->json([
            'data' => $appointments->items(),
            'meta' => [
                'current_page' => $appointments->currentPage(),
                'last_page' => $appointments->lastPage(),
                'per_page' => $appointments->perPage(),
                'total' => $appointments->total(),
            ]
        ]);
    }

    public function store(StoreAppointmentRequest $request)
    {
        // Conflict Check: Check if the doctor already has an appointment at this time
        $conflict = Appointment::where('doctor_id', $request->doctor_id)
            ->where('appointment_date', $request->appointment_date)
            ->where(function($q) use ($request) {
                $q->whereBetween('start_time', [$request->start_time, $request->end_time])
                  ->orWhereBetween('end_time', [$request->start_time, $request->end_time])
                  ->orWhere(function($sq) use ($request) {
                      $sq->where('start_time', '<=', $request->start_time)
                        ->where('end_time', '>=', $request->end_time);
                  });
            })
            ->where('status', '!=', 'cancelled')
            ->exists();

        if ($conflict) {
            return response()->json(['message' => 'Doctor is already booked for this time slot.'], 409);
        }

        $data = $request->validated();
        $data['appointment_number'] = $this->next('APT', 'appointments', 'appointment_number');
        $data['status'] = $data['status'] ?? 'pending';

        $appointment = Appointment::create($data);

        return response()->json(['data' => $appointment->load(['patient', 'doctor'])], 201);
    }

    public function show($id)
    {
        $appointment = Appointment::with(['patient', 'doctor', 'department'])->findOrFail($id);
        return response()->json(['data' => $appointment]);
    }

    public function update(Request $request, $id)
    {
        $appointment = Appointment::findOrFail($id);
        
        $validator = Validator::make($request->all(), [
            'appointment_date' => 'sometimes|date',
            'start_time' => 'sometimes',
            'end_time' => 'sometimes|after:start_time',
            'status' => 'sometimes|in:pending,confirmed,waiting,in_progress,completed,cancelled,no_show',
            'reason' => 'sometimes|string',
            'notes' => 'sometimes|string',
            'cancelled_reason' => 'sometimes|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        $appointment->update($validator->validated());

        return response()->json(['data' => $appointment]);
    }

    public function updateStatus(Request $request, $id)
    {
        $appointment = Appointment::findOrFail($id);
        
        $validator = Validator::make($request->all(), [
            'status' => 'required|in:pending,confirmed,waiting,in_progress,completed,cancelled,no_show',
            'cancelled_reason' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        $appointment->update($validator->validated());

        return response()->json(['data' => $appointment]);
    }

    public function destroy($id)
    {
        $appointment = Appointment::findOrFail($id);
        $appointment->delete();

        return response()->json(['message' => 'Appointment deleted successfully']);
    }
}
