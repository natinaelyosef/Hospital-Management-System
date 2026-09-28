<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VitalSign extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'visit_id',
        'patient_id',
        'recorded_by',
        'recorded_at',
        'bp_systolic',
        'bp_diastolic',
        'temperature',
        'pulse',
        'oxygen_saturation',
        'weight',
        'height',
        'respiratory_rate',
        'notes',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'recorded_at' => 'datetime',
            'bp_systolic' => 'integer',
            'bp_diastolic' => 'integer',
            'temperature' => 'decimal:1',
            'pulse' => 'integer',
            'oxygen_saturation' => 'integer',
            'weight' => 'decimal:2',
            'height' => 'decimal:2',
            'respiratory_rate' => 'integer',
        ];
    }

    public function visit(): BelongsTo
    {
        return $this->belongsTo(Visit::class);
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    public function recorder(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }
}
