<?php

namespace App\Http\Controllers\Ward;

use App\Http\Controllers\Controller;
use App\Http\Transformers\Transform;
use App\Models\Admission;
use App\Models\Bed;
use App\Models\Ward;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class WardController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Ward::query()->with(['rooms.beds']);

        $search = trim((string) $request->query('search'));
        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%");
            });
        }

        return $this->paginated(
            $request,
            $query->orderBy('name'),
            fn (Ward $ward) => Transform::ward($ward)
        );
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'code' => ['required', 'string', 'max:255', Rule::unique('wards', 'code')],
            'floor' => ['nullable', 'string', 'max:255'],
            'type' => ['required', 'string', 'max:255'],
        ]);

        $ward = Ward::create($data);

        AuditLogger::log('create', "Ward {$ward->name} created", $ward, null, $data);

        return $this->ok(Transform::ward($ward->load('rooms.beds')));
    }

    public function update(Request $request, Ward $ward): JsonResponse
    {
        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'code' => ['sometimes', 'required', 'string', 'max:255', Rule::unique('wards', 'code')->ignore($ward->id)],
            'floor' => ['nullable', 'string', 'max:255'],
            'type' => ['sometimes', 'required', 'string', 'max:255'],
        ]);

        $old = $ward->only(array_keys($data));
        $ward->update($data);

        AuditLogger::log('update', "Ward {$ward->name} updated", $ward, $old, $data);

        return $this->ok(Transform::ward($ward->load('rooms.beds')));
    }

    public function destroy(Ward $ward): JsonResponse
    {
        $hasRooms = $ward->rooms()->exists();
        $hasAdmissions = Admission::where('ward_id', $ward->id)->exists();

        if ($hasRooms || $hasAdmissions) {
            return response()->json([
                'message' => 'Ward cannot be deleted because rooms or admissions reference it.',
            ], 400);
        }

        $old = ['id' => $ward->id, 'name' => $ward->name, 'code' => $ward->code];
        $ward->delete();

        AuditLogger::log('delete', "Ward {$ward->name} deleted", $ward, $old);

        return $this->message('Ward deleted successfully.');
    }

    public function availability(): JsonResponse
    {
        $counts = Bed::query()
            ->selectRaw('status, count(*) as c')
            ->groupBy('status')
            ->pluck('c', 'status');

        return $this->ok([
            'total' => (int) $counts->sum(),
            'occupied' => (int) $counts->get('occupied', 0),
            'available' => (int) $counts->get('available', 0),
            'maintenance' => (int) $counts->get('maintenance', 0),
        ]);
    }
}
