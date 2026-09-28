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
<<<<<<< HEAD
     * A Super Administrator (role name "super_admin") always passes.
     *
     * The caller must hold at least one of the listed permissions.
=======
<<<<<<< HEAD
     * A Super Administrator (role name "super_admin") always passes.
     *
     * The caller must hold at least one of the listed permissions.
=======
     * A super admin (role name "admin") always passes.
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a
     */
    public function handle(Request $request, Closure $next, string ...$permissions): Response
    {
        $user = $request->user();

        if (! $user) {
            abort(401);
        }

<<<<<<< HEAD
        if ($user->isSuperAdmin()) {
=======
<<<<<<< HEAD
        if ($user->isSuperAdmin()) {
=======
        if ($user->role?->name === 'admin') {
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a
            return $next($request);
        }

        $granted = $user->role?->permissions?->pluck('name') ?? collect();

        $required = collect($permissions)
            ->flatMap(fn ($p) => explode(',', $p))
<<<<<<< HEAD
=======
<<<<<<< HEAD
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a
            ->map(fn ($p) => trim($p))
            ->filter()
            ->values();

        if ($required->isEmpty() || $required->contains(fn ($p) => $granted->contains($p))) {
<<<<<<< HEAD
=======
=======
            ->filter()
            ->values();

        if ($required->isEmpty() || $required->every(fn ($p) => $granted->contains($p))) {
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a
            return $next($request);
        }

        abort(403, 'This action is unauthorized.');
    }
}
