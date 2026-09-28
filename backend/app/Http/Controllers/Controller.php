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
        return $request->user()?->patient_id !== null;
    }

    /**
     * Limits a patient-scoped query to the caller's own record when the
     * caller is a Patient-portal user; otherwise leaves it untouched.
     * Column defaults to `patient_id`.
     */
    protected function scopeToSelf(Request $request, Builder $query, string $column = 'patient_id'): Builder
    {
        $patientId = $request->user()?->patient_id;

        if ($patientId) {
            $query->where($column, $patientId);
        }

        return $query;
    }

    /**
     * Whether the caller holds a permission (admins always do).
     */
    protected function allows(Request $request, string $permission): bool
    {
        $user = $request->user();

        if (! $user) {
            return false;
        }

        if ($user->role?->name === 'admin') {
            return true;
        }

        return (bool) $user->role?->permissions?->pluck('name')->contains($permission);
    }
}
