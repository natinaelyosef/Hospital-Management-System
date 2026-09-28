<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LabRequest extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'request_number',
        'visit_id',
        'patient_id',
        'doctor_id',
        'priority',
        'status',
        'notes',
        'requested_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'priority' => 'string',
            'status' => 'string',
            'requested_at' => 'datetime',
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

    public function visit(): BelongsTo
    {
        return $this->belongsTo(Visit::class);
    }

    public function results(): HasMany
    {
        return $this->hasMany(LabResult::class, 'lab_request_id');
    }
}
