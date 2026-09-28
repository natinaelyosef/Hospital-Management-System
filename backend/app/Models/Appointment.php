<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Appointment extends Model
{
    protected $fillable = [
        'appointment_number', 'patient_id', 'doctor_id', 'department_id', 
        'appointment_date', 'start_time', 'end_time', 'type', 'status', 
        'queue_number', 'reason', 'notes', 'cancelled_reason', 'visit_id', 'created_by'
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'appointment_date' => 'date',
            'status' => 'string',
        ];
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    public function doctor(): BelongsTo
    {
        return $this->belongsTo(Doctor::class);
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function visit(): HasOne
    {
        return $this->hasOne(Visit::class);
    }
}
