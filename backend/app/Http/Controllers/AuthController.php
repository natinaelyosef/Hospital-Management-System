<?php

namespace App\Http\Controllers;

use App\Http\Transformers\Transform;
use App\Models\User;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class AuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::query()
            ->with('role.permissions')
            ->where('email', $data['email'])
            ->first();

        $invalid = ! $user
            || ! $user->is_active
            || ! Hash::check($data['password'], $user->password);

        if ($invalid) {
            return response()->json([
                'message' => 'Invalid email or matching user not found or account is inactive.',
            ], 422);
        }

        $token = $user->createToken('api')->plainTextToken;

        $user->forceFill(['last_login_at' => now()])->save();

        AuditLogger::log('login', "User {$user->email} logged in", $user);

        return $this->ok([
            'token' => $token,
            'user' => Transform::user($user->load(['role.permissions', 'patient', 'doctor'])),
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        return $this->ok(Transform::user($request->user()->load(['role.permissions', 'patient', 'doctor'])));
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()?->currentAccessToken()?->delete();

        return $this->message('Logged out successfully.');
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $user = $request->user();

        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'email' => ['sometimes', 'required', 'string', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'phone' => ['nullable', 'string', 'max:255'],
        ]);

        $user->fill($data)->save();

        return $this->ok(Transform::user($user->load(['role.permissions', 'patient', 'doctor'])));
    }

    public function changePassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'current_password' => ['required', 'string'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $user = $request->user();

        if (! Hash::check($data['current_password'], $user->password)) {
            return response()->json(['message' => 'Current password is incorrect.'], 422);
        }

        $user->forceFill(['password' => Hash::make($data['password'])])->save();

        AuditLogger::log('updated', "User {$user->email} changed password", $user);

        return $this->message('Password changed successfully.');
    }
}
