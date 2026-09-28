<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PatientInsurance extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'patient_id',
        'insurance_company_id',
        'policy_number',
        'holder_name',
        'coverage_percent',
        'coverage_limit',
        'start_date',
        'end_date',
        'is_active',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'coverage_percent' => 'decimal:2',
            'coverage_limit' => 'decimal:2',
            'start_date' => 'date',
            'end_date' => 'date',
            'is_active' => 'boolean',
        ];
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(InsuranceCompany::class, 'insurance_company_id');
    }

    public function claims(): HasMany
    {
        return $this->hasMany(InsuranceClaim::class, 'patient_insurance_id');
    }
}
