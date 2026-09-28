<?php

namespace App\Http\Controllers\Lab;

use App\Http\Controllers\Controller;
use App\Http\Transformers\Transform;
use App\Models\LabTest;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class LabTestController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = LabTest::query()->orderBy('name');

        if ($request->filled('search')) {
            $search = trim((string) $request->query('search'));
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%");
            });
        }

        if ($request->filled('category')) {
            $query->where('category', $request->query('category'));
        }

        return $this->paginated($request, $query, fn (LabTest $test) => Transform::labTest($test));
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate($this->rules());

        $test = LabTest::create($this->attributes($validated));

        AuditLogger::log('create', "Lab test created: {$test->name}", $test);

        return $this->ok(Transform::labTest($test));
    }

    public function update(Request $request, LabTest $test): JsonResponse
    {
        $validated = $request->validate($this->rules($test));

        $old = $test->only($this->columns());

        $test->fill($this->attributes($validated))->save();

        AuditLogger::log('update', "Lab test updated: {$test->name}", $test, $old, $test->only($this->columns()));

        return $this->ok(Transform::labTest($test));
    }

    public function destroy(LabTest $test): JsonResponse
    {
        $test->delete();

        AuditLogger::log('delete', "Lab test deleted: {$test->name}", $test);

        return $this->message('Lab test deleted successfully.');
    }

    /**
     * @return array<string, mixed>
     */
    private function rules(?LabTest $test = null): array
    {
        return [
            'name' => 'required|string|max:255',
            'code' => [
                'required',
                'string',
                'max:100',
                $test
                    ? Rule::unique('lab_tests', 'code')->ignore($test->id)
                    : Rule::unique('lab_tests', 'code'),
            ],
            'category' => 'nullable|string|max:100',
            'price' => 'sometimes|numeric|min:0',
            'description' => 'nullable|string',
            'is_active' => 'sometimes|boolean',
        ];
    }

    /**
     * Drops nulls for columns that fall back to their own defaults (store)
     * or to their current value (update).
     *
     * @param  array<string, mixed>  $validated
     * @return array<string, mixed>
     */
    private function attributes(array $validated): array
    {
        foreach (['category', 'price', 'is_active'] as $column) {
            if (array_key_exists($column, $validated) && $validated[$column] === null) {
                unset($validated[$column]);
            }
        }

        return $validated;
    }

    /**
     * @return list<string>
     */
    private function columns(): array
    {
        return ['name', 'code', 'category', 'price', 'description', 'is_active'];
    }
}
