<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsurePermission
{
    /**
     * Usage: ->middleware('permission:patients.view')
     *        ->middleware('permission:billing.view,billing.invoice.create')  (any-of)
     * A Super Administrator (role name "super_admin") always passes.
     *
     * The caller must hold at least one of the listed permissions.
     */
    public function handle(Request $request, Closure $next, string ...$permissions): Response
    {
        $user = $request->user();

        if (! $user) {
            abort(401);
        }

        if ($user->isSuperAdmin()) {
            return $next($request);
        }

        $granted = $user->role?->permissions?->pluck('name') ?? collect();

        $required = collect($permissions)
            ->flatMap(fn ($p) => explode(',', $p))
            ->map(fn ($p) => trim($p))
            ->filter()
            ->values();

        if ($required->isEmpty() || $required->contains(fn ($p) => $granted->contains($p))) {
            return $next($request);
        }

        abort(403, 'This action is unauthorized.');
    }
}
