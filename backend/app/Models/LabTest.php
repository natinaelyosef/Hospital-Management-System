<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LabTest extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'code',
        'category',
        'price',
        'description',
        'is_active',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'price' => 'decimal:2',
            'is_active' => 'boolean',
        ];
    }

    public function results(): HasMany
    {
        return $this->hasMany(LabResult::class, 'lab_test_id');
    }
}
