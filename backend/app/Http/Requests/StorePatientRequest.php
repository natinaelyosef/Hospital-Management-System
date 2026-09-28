<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StorePatientRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; 
    }

    public function rules(): array
    {
        return [
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
            'photo' => 'nullable|image|max:2048',
        ];
    }
}
