<?php

namespace App\Http\Controllers;

use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

abstract class Controller
{
    protected function ok(mixed $data, int $status = 200): JsonResponse
    {
        return response()->json(['data' => $data], $status);
    }

    protected function message(string $message, array $extra = []): JsonResponse
    {
        return response()->json(['data' => array_merge(['message' => $message], $extra)]);
    }

    /**
     * Paginate an Eloquent query and return the contract shape:
     * { data: [...], meta: { current_page, last_page, per_page, total } }
     *
     * @param  callable|null  $transform  maps each model to its API shape
     */
    protected function paginated(Request $request, Builder $query, ?callable $transform = null, int $defaultPerPage = 15): JsonResponse
    {
        $perPage = (int) $request->input('per_page', $defaultPerPage);
        $perPage = $perPage > 0 ? min($perPage, 100) : $defaultPerPage;

        /** @var LengthAwarePaginator $page */
        $page = $query->paginate($perPage)->withQueryString();
        $items = $page->getCollection();

        if ($transform) {
            $items = $items->map($transform)->values();
        }

        return response()->json([
            'data' => $items,
            'meta' => [
                'current_page' => $page->currentPage(),
                'last_page' => $page->lastPage(),
                'per_page' => $page->perPage(),
                'total' => $page->total(),
            ],
        ]);
    }

    protected function collection(iterable $items, ?callable $transform = null): JsonResponse
    {
        $items = collect($items);
        if ($transform) {
            $items = $items->map($transform)->values();
        }

        return response()->json(['data' => $items]);
    }

    protected function noContent(): JsonResponse
    {
        return response()->json(['data' => ['message' => 'Deleted successfully.']]);
    }

    /**
     * True when the authenticated user is a Patient-portal user
     * (their account is linked to a patients row). Such users must only
     * ever see their own records — controllers apply this filter.
     */
    protected function isPatientPortal(Request $request): bool
    {
        return $this->portalPatientId($request) !== null;
    }

    /**
     * The patients row owned by the caller, or null for staff accounts.
     * Resolved through the hasOne relation (patients.user_id); users has no
     * patient_id column.
     */
    protected function portalPatientId(Request $request): ?int
    {
        return $request->user()?->patient?->id;
    }

    /**
     * Blocks a Patient-portal caller from a record owned by another patient.
     * Returns 403 when denied, null when the caller may continue.
     */
    protected function denyOtherPatient(Request $request, ?int $patientId): ?JsonResponse
    {
        if ($this->isPatientPortal($request) && $this->portalPatientId($request) !== $patientId) {
            return response()->json(['message' => 'This action is unauthorized.'], 403);
        }

        return null;
    }

    /**
     * Limits a patient-scoped query to the caller's own record when the
     * caller is a Patient-portal user; otherwise leaves it untouched.
     * Column defaults to `patient_id`.
     */
    protected function scopeToSelf(Request $request, Builder $query, string $column = 'patient_id'): Builder
    {
        $patientId = $this->portalPatientId($request);

        if ($patientId) {
            $query->where($column, $patientId);
        }

        return $query;
    }

    /**
     * Whether the caller holds a permission (Super Admins always do).
     */
    protected function allows(Request $request, string $permission): bool
    {
        $user = $request->user();

        if (! $user) {
            return false;
        }

        if ($user->isSuperAdmin()) {
            return true;
        }

        return (bool) $user->role?->permissions?->pluck('name')->contains($permission);
    }
}
