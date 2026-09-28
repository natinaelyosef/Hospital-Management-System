<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreAppointmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'patient_id' => 'required|exists:patients,id',
            'doctor_id' => 'required|exists:doctors,id',
            'department_id' => 'nullable|exists:departments,id',
            'appointment_date' => 'required|date|after_or_equal:today',
            'start_time' => 'required',
            'end_time' => 'required|after:start_time',
            'type' => 'required|in:opd,follow_up,emergency,consultation',
            'status' => 'nullable|in:pending,confirmed,waiting,in_progress,completed,cancelled,no_show',
            'reason' => 'nullable|string',
            'notes' => 'nullable|string',
        ];
    }
}
