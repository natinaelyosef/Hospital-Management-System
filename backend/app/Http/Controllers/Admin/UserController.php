<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Transformers\Transform;
use App\Models\Role;
use App\Models\User;
<<<<<<< HEAD
use App\Notifications\GenericNotification;
=======
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
<<<<<<< HEAD
use Illuminate\Support\Str;
=======
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
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

<<<<<<< HEAD
        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        match ($request->input('sort')) {
            'email' => $query->orderBy('email', $this->direction($request)),
            'created_at' => $query->orderBy('created_at', $this->direction($request)),
            'status' => $query->orderBy('status', $this->direction($request)),
            default => $query->orderBy('name', $this->direction($request)),
        };

        return $this->paginated($request, $query, fn (User $user) => Transform::user($user));
=======
        return $this->paginated(
            $request,
            $query->orderBy('name'),
            fn (User $user) => Transform::user($user)
        );
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
<<<<<<< HEAD
            'password' => ['nullable', 'string', 'min:8'],
            'phone' => ['nullable', 'string', 'max:255'],
            'role_id' => ['required', 'exists:roles,id'],
            'status' => ['nullable', Rule::in(User::STATUSES)],
            'is_active' => ['nullable', 'boolean'],
        ]);

        if ($denied = $this->denyPrivilegeEscalation($request, (int) $data['role_id'])) {
            return $denied;
        }

        $status = $data['status']
            ?? (($data['is_active'] ?? true) ? User::STATUS_ACTIVE : User::STATUS_INACTIVE);

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => Hash::make($data['password'] ?? Str::password(14)),
            'phone' => $data['phone'] ?? null,
            'role_id' => $data['role_id'],
            'status' => $status,
            'is_active' => $status === User::STATUS_ACTIVE,
=======
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
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
        ]);

        $user->load(['role.permissions', 'patient', 'doctor']);

<<<<<<< HEAD
        AuditLogger::log('created', "User {$user->email} created", $user, null, ['status' => $status]);
=======
        AuditLogger::log('created', "User {$user->email} created", $user);
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf

        return $this->ok(Transform::user($user));
    }

    public function update(Request $request, User $user): JsonResponse
    {
        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'email' => ['sometimes', 'required', 'string', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
<<<<<<< HEAD
            'password' => ['nullable', 'string', 'min:8'],
            'phone' => ['nullable', 'string', 'max:255'],
            'role_id' => ['sometimes', 'required', 'exists:roles,id'],
            'status' => ['sometimes', Rule::in(User::STATUSES)],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        if (isset($data['role_id']) && ($denied = $this->denyPrivilegeEscalation($request, (int) $data['role_id']))) {
            return $denied;
        }

        $targetStatus = null;
        if (array_key_exists('status', $data)) {
            $targetStatus = $data['status'];
        } elseif (array_key_exists('is_active', $data)) {
            $targetStatus = $data['is_active'] ? User::STATUS_ACTIVE : User::STATUS_INACTIVE;
        }

        unset($data['status'], $data['is_active']);

        if ($denied = $this->denyRemovingLastSuperAdmin($user, isset($data['role_id']) ? (int) $data['role_id'] : null, $targetStatus)) {
            return $denied;
        }

        $old = $user->only(array_keys($data));
        $old['status'] = $user->status;
=======
            'password' => ['nullable', 'string', 'min:6'],
            'phone' => ['nullable', 'string', 'max:255'],
            'role_id' => ['sometimes', 'required', 'exists:roles,id'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $old = $user->only(array_keys($data));
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
        unset($old['password']);

        if (array_key_exists('password', $data)) {
            if ($data['password'] !== null) {
                $user->password = Hash::make($data['password']);
<<<<<<< HEAD
                $user->tokens()->delete();
=======
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
            }

            unset($data['password'], $old['password']);
        }

        $user->fill($data)->save();
<<<<<<< HEAD

        if ($targetStatus !== null && $targetStatus !== $user->status) {
            $user->setStatus($targetStatus);
        }

        $user->load(['role.permissions', 'patient', 'doctor']);

        $new = $user->only(array_keys($data));
        $new['status'] = $user->status;
=======
        $user->load(['role.permissions', 'patient', 'doctor']);

        $new = $user->only(array_keys($data));
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
        unset($new['password']);

        AuditLogger::log('updated', "User {$user->email} updated", $user, $old, $new);

        return $this->ok(Transform::user($user));
    }

<<<<<<< HEAD
    /**
     * Suspend an account: it can no longer sign in, every session token is
     * revoked, and the reason is stored for the audit trail.
     */
    public function suspend(Request $request, User $user): JsonResponse
    {
        if ($denied = $this->denySelfAction($request, $user, 'suspend')) {
            return $denied;
        }

        if ($denied = $this->denySuperAdminTarget($request, $user, 'suspend')) {
            return $denied;
        }

        $data = $request->validate([
            'reason' => ['required', 'string', 'min:5', 'max:500'],
        ]);

        $changes = $user->suspendBy($request->user(), trim($data['reason']));

        AuditLogger::log(
            'suspended',
            "User {$user->email} suspended",
            $user,
            ['status' => $changes['old']],
            ['status' => $changes['new'], 'suspension_reason' => $user->suspension_reason],
        );

        $user->notify(new GenericNotification(
            'Your account has been suspended',
            'Reason: '.$user->suspension_reason.' Please contact hospital administration.',
            '/profile',
        ));

        return $this->ok(Transform::user($user->fresh(['role.permissions', 'patient', 'doctor'])));
    }

    public function activate(Request $request, User $user): JsonResponse
    {
        if ($denied = $this->denySelfAction($request, $user, 'activate')) {
            return $denied;
        }

        $changes = $user->activate();

        AuditLogger::log(
            'activated',
            "User {$user->email} activated",
            $user,
            ['status' => $changes['old']],
            ['status' => $changes['new']],
        );

        $user->notify(new GenericNotification(
            'Your account has been reactivated',
            'You can now sign in to the hospital system again.',
            '/login',
        ));

        return $this->ok(Transform::user($user->fresh(['role.permissions', 'patient', 'doctor'])));
    }

    /**
     * Rotate a user's password. The caller may supply one, otherwise a strong
     * password is generated and returned exactly once.
     */
    public function resetPassword(Request $request, User $user): JsonResponse
    {
        $data = $request->validate([
            'password' => ['nullable', 'string', 'min:8'],
        ]);

        $password = ($data['password'] ?? null) ?: Str::password(14);

        $user->forceFill(['password' => Hash::make($password)])->save();
        $user->tokens()->delete();

        AuditLogger::log('updated', "Password reset for {$user->email}", $user);

        return $this->message("Password reset for {$user->email}.", ['password' => $password]);
    }

    /**
     * Soft-delete the login account. Clinical and financial records linked to
     * this user (and to their patient profile) are intentionally preserved.
     */
    public function destroy(Request $request, User $user): JsonResponse
    {
        if ($denied = $this->denySelfAction($request, $user, 'delete')) {
            return $denied;
        }

        if ($denied = $this->denySuperAdminTarget($request, $user, 'delete')) {
            return $denied;
        }

        if ($user->isSuperAdmin() && ! $this->hasAnotherSuperAdmin($user)) {
            return response()->json([
                'message' => 'The last Super Administrator cannot be deleted. Promote another account first.',
            ], 400);
        }

        $data = $request->validate([
            'reason' => ['nullable', 'string', 'min:5', 'max:500'],
        ]);

        $email = $user->email;

        $user->softDeleteBy(
            $request->user(),
            trim($data['reason'] ?? '') ?: 'Account deleted by administrator.',
        );

        AuditLogger::log('deleted', "User {$email} deleted", null, [
            'email' => $email,
            'deletion_reason' => $user->deletion_reason,
        ]);

        return $this->message("User {$email} deleted.");
    }

    /**
     * Invite a future staff member: creates a `pending` account with a
     * single-use invite token instead of an immediately usable password.
     * The token (and the link built from it) is returned exactly once —
     * share it with the invitee out of band until mail delivery exists.
     */
    public function invite(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'phone' => ['nullable', 'string', 'max:255'],
            'role_id' => ['required', 'exists:roles,id'],
        ]);

        if ($denied = $this->denyPrivilegeEscalation($request, (int) $data['role_id'])) {
            return $denied;
        }

        // Invitations are for staff. A patient account is created by the
        // patient themselves (or by reception with a portal login), so a
        // patient-role invite would be a link that can never be accepted.
        if (Role::whereKey($data['role_id'])->value('name') === User::ROLE_PATIENT) {
            return response()->json([
                'message' => 'Patients cannot be invited. Create the patient record from Patients, or let them register from the patient portal.',
                'errors' => ['role_id' => ['This role cannot be invited.']],
            ], 422);
        }

        $token = Str::random(64);

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            // Unusable placeholder until the invitee sets their own password.
            'password' => Hash::make(Str::password(20)),
            'phone' => $data['phone'] ?? null,
            'role_id' => $data['role_id'],
            'status' => User::STATUS_PENDING,
            'is_active' => false,
            'invited_at' => now(),
            'invite_token' => $token,
        ]);

        $user->load(['role.permissions', 'patient', 'doctor']);

        AuditLogger::log('invited', "User {$user->email} invited", $user);

        return $this->ok([
            'user' => Transform::user($user),
            'invite_token' => $token,
            'invite_url' => $this->inviteUrl($token),
        ], 201);
    }

    /**
     * Rotate the invite token for a still-pending account and return the new
     * single-use link. The previous link stops working immediately.
     */
    public function resendInvite(Request $request, User $user): JsonResponse
    {
        if ($user->status !== User::STATUS_PENDING) {
            return response()->json([
                'message' => 'Only pending invitations can be re-sent.',
            ], 422);
        }

        if ($denied = $this->denySuperAdminTarget($request, $user, 're-invite')) {
            return $denied;
        }

        $token = Str::random(64);

        $user->forceFill([
            'invite_token' => $token,
            'invited_at' => now(),
        ])->save();

        AuditLogger::log('invited', "Invitation re-sent to {$user->email}", $user);

        return $this->ok([
            'user' => Transform::user($user->fresh(['role.permissions', 'patient', 'doctor'])),
            'invite_token' => $token,
            'invite_url' => $this->inviteUrl($token),
        ]);
    }

    private function inviteUrl(string $token): string
    {
        $base = rtrim((string) (env('FRONTEND_URL', 'http://localhost:5173')), '/');

        return "{$base}/invite/{$token}";
    }

    private function direction(Request $request): string
    {
        return $request->input('direction') === 'desc' ? 'desc' : 'asc';
    }

    /**
     * Only a Super Administrator may mint another Super Administrator, which
     * keeps the highest-level privilege out of reach of normal admins.
     */
    private function denyPrivilegeEscalation(Request $request, int $roleId): ?JsonResponse
    {
        if ($request->user()?->isSuperAdmin()) {
            return null;
        }

        $roleName = Role::query()->whereKey($roleId)->value('name');

        if ($roleName === 'super_admin') {
            return response()->json([
                'message' => 'Only a Super Administrator can create or assign Super Administrator accounts.',
            ], 403);
        }

        return null;
    }

    private function denySelfAction(Request $request, User $target, string $action): ?JsonResponse
    {
        if ($request->user()?->id === $target->id) {
            return response()->json([
                'message' => "You cannot {$action} your own account.",
            ], 400);
        }

        return null;
    }

    private function denySuperAdminTarget(Request $request, User $target, string $action): ?JsonResponse
    {
        if ($target->isSuperAdmin() && ! $request->user()?->isSuperAdmin()) {
            return response()->json([
                'message' => "Only a Super Administrator can {$action} a Super Administrator account.",
            ], 403);
        }

        return null;
    }

    private function hasAnotherSuperAdmin(User $except): bool
    {
        return User::query()
            ->whereKeyNot($except->id)
            ->where('status', User::STATUS_ACTIVE)
            ->whereHas('role', fn ($q) => $q->where('name', 'super_admin'))
            ->exists();
    }

    /**
     * Guard against locking the platform out of its highest privilege:
     * the only active Super Administrator may not be demoted or deactivated.
     */
    private function denyRemovingLastSuperAdmin(User $target, ?int $newRoleId, ?string $newStatus): ?JsonResponse
    {
        if (! $target->isSuperAdmin()) {
            return null;
        }

        $losesSuperAdmin = $newRoleId !== null
            && Role::query()->whereKey($newRoleId)->value('name') !== 'super_admin';

        if (! $losesSuperAdmin) {
            $losesSuperAdmin = $newStatus !== null && $newStatus !== User::STATUS_ACTIVE;
        }

        if (! $losesSuperAdmin || $this->hasAnotherSuperAdmin($target)) {
            return null;
        }

        return response()->json([
            'message' => 'The last active Super Administrator cannot be demoted or deactivated. Promote another account first.',
        ], 400);
    }
=======
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
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
}
