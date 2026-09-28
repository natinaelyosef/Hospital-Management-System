<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Room extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'ward_id',
        'room_number',
        'type',
        'tariff',
        'capacity',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'tariff' => 'decimal:2',
            'capacity' => 'integer',
        ];
    }

    public function ward(): BelongsTo
    {
        return $this->belongsTo(Ward::class);
    }

    public function beds(): HasMany
    {
        return $this->hasMany(Bed::class);
    }
}
