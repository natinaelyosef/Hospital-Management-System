<?php

namespace App\Support;

use Illuminate\Support\Facades\Auth;
use App\Models\AuditLog;

trait Auditable
{
    public static function logAction(string $action, string $description, $model = null, array $oldValues = [], array $newValues = [])
    {
        AuditLog::create([
            'user_id' => Auth::id(),
            'action' => $action,
            'description' => $description,
            'auditable_type' => $model ? get_class($model) : null,
            'auditable_id' => $model ? $model->id : null,
            'old_values' => !empty($oldValues) ? json_encode($oldValues) : null,
            'new_values' => !empty($newValues) ? json_encode($newValues) : null,
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
        ]);
    }
}
