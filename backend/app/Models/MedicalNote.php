<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MedicalNote extends Model
{
    /**
     * The table only has a `created_at` column.
     */
    public const UPDATED_AT = null;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'visit_id',
        'patient_id',
        'author_id',
        'note_type',
        'content',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'note_type' => 'string',
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

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'author_id');
    }
}
