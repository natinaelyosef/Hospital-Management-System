<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SettingsController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(['data' => (object) Setting::pluck('value', 'key')]);
    }

    public function update(Request $request): JsonResponse
    {
        $payload = $request->all();

        if (! is_array($payload)) {
            return response()->json(['message' => 'Invalid settings payload.'], 422);
        }

        $request->validate(['*' => ['nullable', 'string']]);

        foreach ($payload as $key => $value) {
            Setting::updateOrCreate(['key' => (string) $key], ['value' => $value]);
        }

        AuditLogger::log('updated', 'Settings updated');

        return response()->json(['data' => (object) Setting::pluck('value', 'key')]);
    }
}
