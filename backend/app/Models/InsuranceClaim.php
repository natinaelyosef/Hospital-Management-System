<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InsuranceClaim extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'claim_number',
        'invoice_id',
        'patient_insurance_id',
        'amount',
        'approved_amount',
        'status',
        'submitted_at',
        'decided_at',
        'notes',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'approved_amount' => 'decimal:2',
            'status' => 'string',
            'submitted_at' => 'datetime',
            'decided_at' => 'datetime',
        ];
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }

    public function insurance(): BelongsTo
    {
        return $this->belongsTo(PatientInsurance::class, 'patient_insurance_id');
    }
}
