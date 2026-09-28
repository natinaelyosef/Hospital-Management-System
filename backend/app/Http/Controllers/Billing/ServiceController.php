<?php

namespace App\Http\Controllers\Billing;

use App\Http\Controllers\Controller;
use App\Models\Service;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ServiceController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Service::query();

        $search = trim((string) $request->query('search'));
        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%");
            });
        }

        if ($request->filled('category')) {
            $query->where('category', $request->query('category'));
        }

        return $this->paginated(
            $request,
            $query->orderBy('name'),
            fn (Service $service) => $this->shape($service)
        );
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'code' => ['required', 'string', 'max:255', Rule::unique('services', 'code')],
            'category' => ['required', Rule::in(['consultation', 'lab', 'medicine', 'room', 'procedure', 'other'])],
            'price' => ['required', 'numeric', 'min:0'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $service = Service::create($data);

        AuditLogger::log('create', "Service {$service->name} created", $service, null, $data);

        return $this->ok($this->shape($service));
    }

    public function update(Request $request, Service $service): JsonResponse
    {
        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'code' => ['sometimes', 'required', 'string', 'max:255', Rule::unique('services', 'code')->ignore($service->id)],
            'category' => ['sometimes', Rule::in(['consultation', 'lab', 'medicine', 'room', 'procedure', 'other'])],
            'price' => ['sometimes', 'required', 'numeric', 'min:0'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $old = $service->only(array_keys($data));
        $service->update($data);

        AuditLogger::log('update', "Service {$service->name} updated", $service, $old, $data);

        return $this->ok($this->shape($service));
    }

    public function destroy(Service $service): JsonResponse
    {
        $old = ['id' => $service->id, 'name' => $service->name, 'code' => $service->code];
        $service->delete();

        AuditLogger::log('delete', "Service {$old['name']} deleted", $service, $old);

        return $this->message('Service deleted successfully.');
    }

    private function shape(Service $service): array
    {
        return [
            'id' => $service->id,
            'name' => $service->name,
            'code' => $service->code,
            'category' => $service->category,
            'price' => (float) $service->price,
            'is_active' => (bool) $service->is_active,
            'created_at' => $service->created_at?->toIso8601String(),
        ];
    }
}
