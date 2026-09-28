<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\Request;

class AdminController extends Controller
{
    public function auditLogs(Request $request)
    {
        $query = AuditLog::with('user');

        if ($request->filled('search')) {
            $search = trim((string) $request->input('search'));
            $query->where(function($q) use ($search) {
                $q->where('action', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        if ($request->has('action')) {
            $query->where('action', $request->action);
        }

        $logs = $query->orderByDesc('created_at')->paginate($request->integer('per_page', 20));

        return response()->json([
            'data' => $logs->getCollection()->map(fn (AuditLog $log) => [
                'id' => $log->id,
                'user' => $log->user?->name,
                'action' => $log->action,
                'description' => $log->description,
                'auditable_type' => $log->auditable_type,
                'auditable_id' => $log->auditable_id,
                'ip_address' => $log->ip_address,
                'created_at' => $log->created_at?->toIso8601String(),
            ])->values(),
            'meta' => [
                'current_page' => $logs->currentPage(),
                'last_page' => $logs->lastPage(),
                'per_page' => $logs->perPage(),
                'total' => $logs->total(),
            ]
        ]);
    }

    public function getSettings()
    {
        return response()->json([
            'data' => \App\Models\Setting::all()->pluck('value', 'key')
        ]);
    }

    public function updateSettings(Request $request)
    {
        foreach ($request->all() as $key => $value) {
            \App\Models\Setting::updateOrCreate(['key' => $key], ['value' => $value]);
        }

        return response()->json(['message' => 'Settings updated successfully']);
    }
}
