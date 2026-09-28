<?php

namespace App\Http\Controllers\Ward;

use App\Http\Controllers\Controller;
use App\Http\Transformers\Transform;
use App\Models\Admission;
use App\Models\Bed;
use App\Models\Room;
use App\Support\AuditLogger;
use App\Support\GeneratesSequentialNumber;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class AdmissionController extends Controller
{
    use GeneratesSequentialNumber;

    private const RELATIONS = ['patient', 'ward', 'room', 'bed', 'consultant.user', 'admittedBy', 'dischargedBy'];

    public function index(Request $request): JsonResponse
    {
        $query = Admission::query()->with(self::RELATIONS);

        if ($request->filled('status')) {
            $query->where('status', $request->query('status'));
        }

        if ($request->filled('ward_id')) {
            $query->where('ward_id', (int) $request->query('ward_id'));
        }

        if ($request->filled('date')) {
            $query->whereDate('admitted_at', $request->query('date'));
        }

        $search = trim((string) $request->query('search'));
        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('admission_number', 'like', "%{$search}%")
                    ->orWhereHas('patient', function ($p) use ($search) {
                        $p->where(function ($w) use ($search) {
                            $w->where('first_name', 'like', "%{$search}%")
                                ->orWhere('last_name', 'like', "%{$search}%")
                                ->orWhere('phone', 'like', "%{$search}%")
                                ->orWhereRaw("concat(first_name, ' ', last_name) like ?", ["%{$search}%"]);
                        });
                    });
            });
        }

        $this->scopeToSelf($request, $query);

        return $this->paginated(
            $request,
            $query->orderByDesc('admitted_at')->orderByDesc('id'),
            fn (Admission $admission) => Transform::admission($admission)
        );
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'patient_id' => ['required', 'integer', 'exists:patients,id'],
            'ward_id' => ['required', 'integer', 'exists:wards,id'],
            'room_id' => ['required', 'integer', 'exists:rooms,id'],
            'bed_id' => ['required', 'integer', 'exists:beds,id'],
            'consultant_id' => ['nullable', 'integer', 'exists:doctors,id'],
            'diagnosis' => ['nullable', 'string'],
        ]);

        $room = Room::find($data['room_id']);
        $bed = Bed::find($data['bed_id']);

        if ((int) $room->ward_id !== (int) $data['ward_id']) {
            return response()->json(['message' => 'Selected room does not belong to the selected ward.'], 422);
        }

        if ((int) $bed->room_id !== (int) $room->id) {
            return response()->json(['message' => 'Selected bed does not belong to the selected room or ward.'], 422);
        }

        if (Admission::where('patient_id', $data['patient_id'])->where('status', 'admitted')->exists()) {
            return response()->json(['message' => 'Patient already has an active admission.'], 422);
        }

        if ($bed->status !== 'available') {
            return response()->json(['message' => 'Selected bed is not available.'], 422);
        }

        $admission = DB::transaction(function () use ($data, $request) {
            $admission = Admission::create([
                'admission_number' => $this->next('ADM', 'admissions', 'admission_number'),
                'patient_id' => $data['patient_id'],
                'ward_id' => $data['ward_id'],
                'room_id' => $data['room_id'],
                'bed_id' => $data['bed_id'],
                'consultant_id' => $data['consultant_id'] ?? null,
                'diagnosis' => $data['diagnosis'] ?? null,
                'admitted_at' => now(),
                'admitted_by' => $request->user()?->id,
                'status' => 'admitted',
            ]);

            Bed::whereKey($data['bed_id'])->update(['status' => 'occupied']);

            return $admission;
        });

        AuditLogger::log('create', "Admission {$admission->admission_number} created", $admission, null, [
            'patient_id' => $admission->patient_id,
            'ward_id' => $admission->ward_id,
            'room_id' => $admission->room_id,
            'bed_id' => $admission->bed_id,
        ]);

        return $this->ok(Transform::admission($admission->load(self::RELATIONS)));
    }

    public function show(Admission $admission): JsonResponse
    {
        $admission->load(self::RELATIONS);

        return $this->ok(Transform::admission($admission));
    }

<<<<<<< HEAD
=======
<<<<<<< HEAD
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a
    public function pdf(Admission $admission)
    {
        $admission->load(self::RELATIONS);

        $settings = \App\Models\Setting::query()->pluck('value', 'key');

        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('admissions.discharge', [
            'admission' => $admission,
            'settings' => $settings,
            'hospital' => [
                'name' => $settings['hospital_name'] ?? config('app.name', 'Hospital'),
                'address' => $settings['address'] ?? null,
                'phone' => $settings['phone'] ?? null,
                'email' => $settings['email'] ?? null,
                'logo' => $settings['logo'] ?? null,
            ],
            'currency' => $settings['currency'] ?? 'ETB',
        ]);

        return $pdf->download($admission->admission_number.'.pdf');
    }

<<<<<<< HEAD
=======
=======
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a
    public function transfer(Request $request, Admission $admission): JsonResponse
    {
        $data = $request->validate([
            'ward_id' => ['required', 'integer', 'exists:wards,id'],
            'room_id' => ['required', 'integer', 'exists:rooms,id'],
            'bed_id' => ['required', 'integer', 'exists:beds,id'],
        ]);

        $room = Room::find($data['room_id']);
        $bed = Bed::find($data['bed_id']);

        if ((int) $room->ward_id !== (int) $data['ward_id']) {
            return response()->json(['message' => 'Selected room does not belong to the selected ward.'], 422);
        }

        if ((int) $bed->room_id !== (int) $room->id) {
            return response()->json(['message' => 'Selected bed does not belong to the selected room or ward.'], 422);
        }

        if ((int) $data['bed_id'] === (int) $admission->bed_id) {
            return response()->json(['message' => 'Target bed must be different from the current bed.'], 422);
        }

        if ($bed->status !== 'available') {
            return response()->json(['message' => 'Target bed is not available.'], 422);
        }

        $old = [
            'ward_id' => $admission->ward_id,
            'room_id' => $admission->room_id,
            'bed_id' => $admission->bed_id,
            'status' => $admission->status,
        ];

        DB::transaction(function () use ($admission, $data, $old) {
            Bed::whereKey($old['bed_id'])->update(['status' => 'available']);
            Bed::whereKey($data['bed_id'])->update(['status' => 'occupied']);

            $admission->update([
                'ward_id' => $data['ward_id'],
                'room_id' => $data['room_id'],
                'bed_id' => $data['bed_id'],
                'status' => 'admitted',
            ]);
        });

        AuditLogger::log('transfer', "Admission {$admission->admission_number} transferred", $admission, $old, [
            'ward_id' => $data['ward_id'],
            'room_id' => $data['room_id'],
            'bed_id' => $data['bed_id'],
        ]);

        return $this->ok(Transform::admission($admission->load(self::RELATIONS)));
    }

    public function discharge(Request $request, Admission $admission): JsonResponse
    {
        $data = $request->validate([
            'outcome' => ['required', Rule::in(['recovered', 'improved', 'referred', 'deceased', 'left_against_advice'])],
            'discharge_summary' => ['nullable', 'string'],
        ]);

        if ($admission->status !== 'admitted') {
            return response()->json(['message' => 'Only admissions with status "admitted" can be discharged.'], 422);
        }

        $old = [
            'status' => $admission->status,
            'outcome' => $admission->outcome,
            'discharged_at' => $admission->discharged_at,
        ];

        DB::transaction(function () use ($admission, $data, $request) {
            $admission->update([
                'discharged_at' => now(),
                'discharged_by' => $request->user()?->id,
                'status' => 'discharged',
                'outcome' => $data['outcome'],
                'discharge_summary' => $data['discharge_summary'] ?? null,
            ]);

            Bed::whereKey($admission->bed_id)->update(['status' => 'available']);
        });

        AuditLogger::log('discharge', "Admission {$admission->admission_number} discharged", $admission, $old, [
            'status' => 'discharged',
            'outcome' => $data['outcome'],
        ]);

        return $this->ok(Transform::admission($admission->load(self::RELATIONS)));
    }
}
