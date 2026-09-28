<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MedicineBatch extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'medicine_id',
        'batch_number',
        'expiry_date',
        'quantity_received',
        'quantity_available',
        'purchase_price',
        'received_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'expiry_date' => 'date',
            'quantity_received' => 'integer',
            'quantity_available' => 'integer',
            'purchase_price' => 'decimal:2',
            'received_at' => 'datetime',
        ];
    }

    public function medicine(): BelongsTo
    {
        return $this->belongsTo(Medicine::class);
    }
}
