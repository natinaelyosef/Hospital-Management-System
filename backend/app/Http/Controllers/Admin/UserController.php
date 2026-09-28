<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Transformers\Transform;
use App\Models\Role;
use App\Models\User;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = User::query()->with(['role.permissions', 'patient', 'doctor']);

        if ($request->filled('search')) {
            $search = trim((string) $request->input('search'));

            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        if ($request->filled('role_id')) {
            $query->where('role_id', (int) $request->input('role_id'));
        }

        return $this->paginated(
            $request,
            $query->orderBy('name'),
            fn (User $user) => Transform::user($user)
        );
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:6'],
            'phone' => ['nullable', 'string', 'max:255'],
            'role_id' => ['required', 'exists:roles,id'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
            'phone' => $data['phone'] ?? null,
            'role_id' => $data['role_id'],
            'is_active' => $data['is_active'] ?? true,
        ]);

        $user->load(['role.permissions', 'patient', 'doctor']);

        AuditLogger::log('created', "User {$user->email} created", $user);

        return $this->ok(Transform::user($user));
    }

    public function update(Request $request, User $user): JsonResponse
    {
        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'email' => ['sometimes', 'required', 'string', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'password' => ['nullable', 'string', 'min:6'],
            'phone' => ['nullable', 'string', 'max:255'],
            'role_id' => ['sometimes', 'required', 'exists:roles,id'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $old = $user->only(array_keys($data));
        unset($old['password']);

        if (array_key_exists('password', $data)) {
            if ($data['password'] !== null) {
                $user->password = Hash::make($data['password']);
            }

            unset($data['password'], $old['password']);
        }

        $user->fill($data)->save();
        $user->load(['role.permissions', 'patient', 'doctor']);

        $new = $user->only(array_keys($data));
        unset($new['password']);

        AuditLogger::log('updated', "User {$user->email} updated", $user, $old, $new);

        return $this->ok(Transform::user($user));
    }

    public function destroy(Request $request, User $user): JsonResponse
    {
        if ($user->id === $request->user()?->id) {
            return response()->json([
                'message' => 'You cannot delete your own account.',
            ], 400);
        }

        if ($user->role?->name === 'admin') {
            return response()->json([
                'message' => 'Admin accounts cannot be deleted.',
            ], 400);
        }

        $email = $user->email;

        $user->delete();

        AuditLogger::log('deleted', "User {$email} deleted");

        return $this->message("User {$email} deleted.");
    }
}
