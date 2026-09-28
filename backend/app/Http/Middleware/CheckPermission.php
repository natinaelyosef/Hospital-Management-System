<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class CheckPermission
{
    public function handle(Request $request, Closure $next, string $permission)
    {
        $user = Auth::user();

        if (!$user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $hasPermission = $user->role->permissions->contains('name', $permission);

        if (!$hasPermission) {
            return response()->json([
                'message' => 'This action is unauthorized.',
                'required_permission' => $permission
            ], 403);
        }

        return $next($request);
    }
}
