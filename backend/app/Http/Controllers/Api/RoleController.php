<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Models\Permission;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class RoleController extends Controller
{
    public function index()
    {
        return response()->json(['data' => Role::with('permissions')->withCount('users')->get()]);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|unique:roles',
            'label' => 'required|string',
            'description' => 'nullable|string',
            'permissions' => 'required|array',
            'permissions.*' => 'required|exists:permissions,id',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        return \DB::transaction(function() use ($request) {
            $role = Role::create([
                'name' => $request->name,
                'label' => $request->label,
                'description' => $request->description ?? null,
            ]);

            $role->permissions()->attach($request->permissions);

            return response()->json(['data' => $role->load('permissions')->loadCount('users')], 201);
        });
    }

    public function update(Request $request, $id)
    {
        $role = Role::findOrFail($id);
        
        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|string|unique:roles,name,' . $id,
            'label' => 'sometimes|string',
            'description' => 'sometimes|string',
            'permissions' => 'sometimes|array',
            'permissions.*' => 'required|exists:permissions,id',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        return \DB::transaction(function() use ($request, $role) {
            $role->update($request->only(['name', 'label', 'description']));

            if ($request->has('permissions')) {
                $role->permissions()->sync($request->permissions);
            }

            return response()->json(['data' => $role->load('permissions')->loadCount('users')]);
        });
    }

    public function destroy($id)
    {
        $role = Role::findOrFail($id);

        if ($role->name === 'admin' || $role->users()->exists()) {
            return response()->json([
                'message' => 'The administrator role and roles assigned to users cannot be deleted.',
            ], 422);
        }

        $role->delete();
        return response()->json(['message' => 'Role deleted successfully']);
    }
}
