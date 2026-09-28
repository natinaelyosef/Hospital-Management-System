<?php

namespace App\Http\Controllers\Pharmacy;

use App\Http\Controllers\Controller;
use App\Models\MedicineCategory;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class MedicineCategoryController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = MedicineCategory::query()->orderBy('name');

        if ($request->filled('search')) {
            $search = trim((string) $request->query('search'));
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        return $this->paginated($request, $query);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:medicine_categories,name',
            'description' => 'nullable|string|max:1000',
        ]);

        $category = MedicineCategory::create($validated);

        AuditLogger::log('create', "Medicine category created: {$category->name}", $category);

        return $this->ok($category);
    }

    public function update(Request $request, MedicineCategory $category): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', Rule::unique('medicine_categories', 'name')->ignore($category->id)],
            'description' => 'nullable|string|max:1000',
        ]);

        $old = $category->only(['name', 'description']);

        $category->fill($validated)->save();

        AuditLogger::log('update', "Medicine category updated: {$category->name}", $category, $old, $category->only(['name', 'description']));

        return $this->ok($category);
    }

    public function destroy(MedicineCategory $category): JsonResponse
    {
        if ($category->medicines()->exists()) {
            return response()->json([
                'message' => 'Cannot delete a category that is still assigned to medicines.',
            ], 400);
        }

        $category->delete();

        AuditLogger::log('delete', "Medicine category deleted: {$category->name}", $category);

        return $this->message('Medicine category deleted successfully.');
    }
}
