<?php

namespace App\Http\Controllers;

use App\Models\Department;
use App\Models\Doctor;
use App\Models\Patient;
use App\Models\Setting;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;

/**
 * Unauthenticated content for the public hospital website.
 * Everything here is safe to expose: no patient-identifying data is returned.
 */
class PublicController extends Controller
{
    public function overview(): JsonResponse
    {
        $payload = Cache::remember('public.overview', now()->addMinutes(5), function (): array {
            $settings = Setting::query()->pluck('value', 'key');

            $departments = Department::query()
                ->orderBy('name')
                ->get(['id', 'name', 'code', 'description'])
                ->values();

            $doctors = Doctor::query()
                ->with(['user', 'department'])
                ->where('is_active', true)
                ->orderBy('id')
                ->limit(6)
                ->get()
                ->map(fn (Doctor $doctor) => [
                    'name' => $doctor->user?->name,
                    'specialization' => $doctor->specialization,
                    'department' => $doctor->department?->name,
                    'consultation_fee' => (float) $doctor->consultation_fee,
                ])
                ->values();

            return [
                'hospital' => [
                    'name' => $settings['hospital_name'] ?? 'MediCare General Hospital',
                    'address' => $settings['address'] ?? null,
                    'phone' => $settings['phone'] ?? null,
                    'email' => $settings['email'] ?? null,
                    'currency' => $settings['currency'] ?? 'ETB',
                ],
                'departments' => $departments,
                'doctors' => $doctors,
                'stats' => [
                    'patients' => Patient::query()->count(),
                    'doctors' => Doctor::query()->count(),
                    'departments' => Department::query()->count(),
                ],
            ];
        });

        return $this->ok($payload);
    }
}
