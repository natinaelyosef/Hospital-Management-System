<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VisitTransition extends Model
{
    /**
     * Immutable handoff history: rows are only ever inserted, powering the
     * Patient Journey timeline. created_at is filled by the database.
     *
     * @var bool
     */
    public $timestamps = false;

    protected $fillable = [
        'visit_id', 'from_status', 'to_status', 'actor_id', 'note', 'created_at',
    ];

    protected function casts(): array
    {
        return ['created_at' => 'datetime'];
    }

    public function visit(): BelongsTo
    {
        return $this->belongsTo(Visit::class);
    }

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id');
    }
}
