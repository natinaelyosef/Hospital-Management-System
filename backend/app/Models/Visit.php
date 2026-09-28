<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Visit extends Model
{
    protected $fillable = [
        'visit_number', 'patient_id', 'doctor_id', 'appointment_id', 
        'department_id', 'visit_date', 'type', 'chief_complaint', 
        'symptoms', 'diagnosis', 'treatment', 'medical_notes', 
        'follow_up_date', 'status', 'created_by'
    ];

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    public function doctor(): BelongsTo
    {
        return $this->belongsTo(Doctor::class);
    }

    public function appointment(): BelongsTo
    {
        return $this->belongsTo(Appointment::class);
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function vitalSigns(): HasMany
    {
        return $this->hasMany(VitalSign::class);
    }

    public function medicalNotes(): HasMany
    {
        return $this->hasMany(MedicalNote::class);
    }

    public function prescriptions(): HasMany
    {
        return $this->hasMany(Prescription::class);
    }

    public function labRequests(): HasMany
    {
        return $this->hasMany(LabRequest::class);
    }
}
