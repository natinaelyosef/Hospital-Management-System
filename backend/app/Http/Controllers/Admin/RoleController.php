<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Transformers\Transform;
use App\Models\Permission;
use App\Models\Role;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class RoleController extends Controller
{
    public function index(): JsonResponse
    {
        return $this->collection(
            Role::with('permissions')->withCount('users')->orderBy('name')->get(),
            fn (Role $role) => Transform::role($role)
        );
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validateRole($request);

        $role = DB::transaction(function () use ($data) {
            $role = Role::create([
                'name' => $data['name'],
                'label' => $data['label'],
                'description' => $data['description'] ?? null,
            ]);

            $role->permissions()->sync($this->permissionIds($data['permissions']));

            return $role;
        });

        $role->load('permissions');
        $role->loadCount('users');

        AuditLogger::log('created', "Role {$role->name} created", $role);

        return $this->ok(Transform::role($role));
    }

    public function update(Request $request, Role $role): JsonResponse
    {
        $data = $this->validateRole($request, $role);

        DB::transaction(function () use ($role, $data) {
            $role->fill([
                'name' => $data['name'],
                'label' => $data['label'],
                'description' => $data['description'] ?? null,
            ])->save();

            $role->permissions()->sync($this->permissionIds($data['permissions']));
        });

        $role->load('permissions');
        $role->loadCount('users');

        AuditLogger::log('updated', "Role {$role->name} updated", $role);

        return $this->ok(Transform::role($role));
    }

    public function destroy(Role $role): JsonResponse
    {
        if ($role->name === 'admin') {
            return response()->json([
                'message' => 'The admin role cannot be deleted.',
            ], 400);
        }

        if ($role->users()->exists()) {
            return response()->json([
                'message' => 'Role still has users assigned and cannot be deleted.',
            ], 400);
        }

        $name = $role->name;

        $role->delete();

        AuditLogger::log('deleted', "Role {$name} deleted");

        return $this->message("Role {$name} deleted.");
    }

    public function permissions(): JsonResponse
    {
        return $this->collection(
            Permission::orderBy('group')->orderBy('name')->get()
                ->map(fn (Permission $permission) => [
                    'name' => $permission->name,
                    'label' => $permission->label,
                    'group' => $permission->group,
                ])
        );
    }

    /**
     * @return array<string, mixed>
     */
    private function validateRole(Request $request, ?Role $role = null): array
    {
        return $request->validate([
            'name' => [
                'required',
                'string',
                'max:100',
                'regex:/^[a-z_]+$/',
                Rule::unique('roles', 'name')->ignore($role?->id),
            ],
            'label' => ['required', 'string', 'max:100'],
            'description' => ['nullable', 'string'],
            'permissions' => ['required', 'array'],
<<<<<<< HEAD
            // Frontend sends permission IDs; API contract documents names.
            // Accept both so RolesPage and API clients work.
            'permissions.*' => ['required'],
=======
            'permissions.*' => ['string', Rule::in(Permission::pluck('name')->all())],
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
        ]);
    }

    /**
<<<<<<< HEAD
     * @param  array<int, string|int>  $permissions
=======
     * @param  array<int, string>  $permissions
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
     * @return array<int, int>
     */
    private function permissionIds(array $permissions): array
    {
<<<<<<< HEAD
        $ids = [];
        $names = [];

        foreach ($permissions as $permission) {
            if (is_numeric($permission)) {
                $ids[] = (int) $permission;
            } else {
                $names[] = (string) $permission;
            }
        }

        if ($names !== []) {
            $ids = array_merge($ids, Permission::whereIn('name', $names)->pluck('id')->all());
        }

        return array_values(array_unique($ids));
=======
        return Permission::whereIn('name', $permissions)->pluck('id')->all();
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
    }
}
