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
     * A super admin (role name "admin") always passes.
     */
    public function handle(Request $request, Closure $next, string ...$permissions): Response
    {
        $user = $request->user();

        if (! $user) {
            abort(401);
        }

        if ($user->role?->name === 'admin') {
            return $next($request);
        }

        $granted = $user->role?->permissions?->pluck('name') ?? collect();

        $required = collect($permissions)
            ->flatMap(fn ($p) => explode(',', $p))
            ->filter()
            ->values();

        if ($required->isEmpty() || $required->every(fn ($p) => $granted->contains($p))) {
            return $next($request);
        }

        abort(403, 'This action is unauthorized.');
    }
}
