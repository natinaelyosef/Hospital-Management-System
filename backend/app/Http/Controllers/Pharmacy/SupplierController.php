<?php

namespace App\Http\Controllers\Pharmacy;

use App\Http\Controllers\Controller;
use App\Models\Supplier;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SupplierController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Supplier::query()->orderBy('name');

        if ($request->filled('search')) {
            $search = trim((string) $request->query('search'));
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('contact_person', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        return $this->paginated($request, $query);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate($this->rules());

        $supplier = Supplier::create($validated);

        AuditLogger::log('create', "Supplier created: {$supplier->name}", $supplier);

        return $this->ok($supplier);
    }

    public function update(Request $request, Supplier $supplier): JsonResponse
    {
        $validated = $request->validate($this->rules());

        $old = $supplier->only($this->columns());

        $supplier->fill($validated)->save();

        AuditLogger::log('update', "Supplier updated: {$supplier->name}", $supplier, $old, $supplier->only($this->columns()));

        return $this->ok($supplier);
    }

    public function destroy(Supplier $supplier): JsonResponse
    {
        $supplier->delete();

        AuditLogger::log('delete', "Supplier deleted: {$supplier->name}", $supplier);

        return $this->message('Supplier deleted successfully.');
    }

    /**
     * @return array<string, string>
     */
    private function rules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'contact_person' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:255',
            'address' => 'nullable|string|max:1000',
        ];
    }

    /**
     * @return list<string>
     */
    private function columns(): array
    {
        return ['name', 'contact_person', 'phone', 'email', 'address'];
    }
}
