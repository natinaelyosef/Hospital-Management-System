<?php

namespace App\Http\Controllers;

use App\Http\Transformers\Transform;
use App\Models\Department;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class DepartmentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Department::query()->withCount('doctors');

        if ($request->filled('search')) {
            $search = trim((string) $request->input('search'));

            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        return $this->paginated(
            $request,
            $query->orderBy('name'),
            fn (Department $department) => Transform::department($department)
        );
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'code' => ['required', 'string', 'max:255', 'unique:departments,code'],
            'description' => ['nullable', 'string'],
        ]);

        $department = Department::create($data);
        $department->loadCount('doctors');

        AuditLogger::log('created', "Department {$department->name} created", $department);

        return $this->ok(Transform::department($department));
    }

    public function update(Request $request, Department $department): JsonResponse
    {
        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'code' => ['sometimes', 'required', 'string', 'max:255', Rule::unique('departments', 'code')->ignore($department->id)],
            'description' => ['nullable', 'string'],
        ]);

        $old = $department->only(array_keys($data));

        $department->fill($data)->save();
        $department->loadCount('doctors');

        AuditLogger::log('updated', "Department {$department->name} updated", $department, $old, $department->only(array_keys($data)));

        return $this->ok(Transform::department($department));
    }

    public function destroy(Request $request, Department $department): JsonResponse
    {
        if ($department->doctors()->exists()) {
            return response()->json([
                'message' => 'Department still has doctors assigned and cannot be deleted.',
            ], 400);
        }

        $name = $department->name;

        $department->delete();

        AuditLogger::log('deleted', "Department {$name} deleted");

        return $this->message("Department {$name} deleted.");
    }
}
