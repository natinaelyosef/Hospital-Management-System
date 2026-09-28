<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class InsuranceCompany extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'code',
        'phone',
        'email',
        'address',
        'is_active',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    public function patientInsurances(): HasMany
    {
        return $this->hasMany(PatientInsurance::class, 'insurance_company_id');
    }
}
