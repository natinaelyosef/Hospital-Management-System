<?php

namespace App\Http\Controllers\Ward;

use App\Http\Controllers\Controller;
use App\Http\Transformers\Transform;
use App\Models\Admission;
use App\Models\Bed;
use App\Models\Room;
use App\Models\Ward;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class RoomController extends Controller
{
    public function index(Ward $ward): JsonResponse
    {
        $rooms = Room::with('beds')
            ->where('ward_id', $ward->id)
            ->orderBy('room_number')
            ->get()
            ->map(fn (Room $room) => Transform::room($room));

        return $this->collection($rooms);
    }

    public function store(Request $request, Ward $ward): JsonResponse
    {
        $data = $request->validate([
            'room_number' => [
                'required', 'string', 'max:255',
                Rule::unique('rooms', 'room_number')->where('ward_id', $ward->id),
            ],
            'type' => ['required', 'string', 'max:255'],
            'tariff' => ['required', 'numeric', 'min:0'],
            'capacity' => ['required', 'integer', 'min:1'],
        ]);

        $data['ward_id'] = $ward->id;
        $room = Room::create($data);

        AuditLogger::log('create', "Room {$room->room_number} created in ward {$ward->name}", $room, null, $data);

        return $this->ok(Transform::room($room->load('beds')));
    }

    public function update(Request $request, Room $room): JsonResponse
    {
        $data = $request->validate([
            'room_number' => [
                'sometimes', 'required', 'string', 'max:255',
                Rule::unique('rooms', 'room_number')
                    ->where('ward_id', $room->ward_id)
                    ->ignore($room->id),
            ],
            'type' => ['sometimes', 'required', 'string', 'max:255'],
            'tariff' => ['sometimes', 'required', 'numeric', 'min:0'],
            'capacity' => ['sometimes', 'required', 'integer', 'min:1'],
        ]);

        $old = $room->only(array_keys($data));
        $room->update($data);

        AuditLogger::log('update', "Room {$room->room_number} updated", $room, $old, $data);

        return $this->ok(Transform::room($room->load('beds')));
    }

    public function destroy(Room $room): JsonResponse
    {
        $bedIds = $room->beds()->pluck('id');

        $hasActiveAdmission = $bedIds->isNotEmpty()
            && Admission::whereIn('bed_id', $bedIds)->where('status', 'admitted')->exists();

        $hasAdmissions = Admission::where('room_id', $room->id)->exists();

        if ($hasActiveAdmission || $hasAdmissions) {
            return response()->json([
                'message' => 'Room cannot be deleted because beds are occupied or admissions reference it.',
            ], 400);
        }

        $old = ['id' => $room->id, 'room_number' => $room->room_number, 'ward_id' => $room->ward_id];
        $room->delete();

        AuditLogger::log('delete', "Room {$old['room_number']} deleted", $room, $old);

        return $this->message('Room deleted successfully.');
    }

    public function storeBed(Request $request, Room $room): JsonResponse
    {
        $data = $request->validate([
            'bed_number' => [
                'required', 'string', 'max:255',
                Rule::unique('beds', 'bed_number')->where('room_id', $room->id),
            ],
            'status' => ['nullable', Rule::in(['available', 'occupied', 'maintenance', 'reserved'])],
        ]);

        $data['status'] = $data['status'] ?? 'available';
        $data['room_id'] = $room->id;

        $bed = Bed::create($data);

        AuditLogger::log('create', "Bed {$bed->bed_number} created in room {$room->room_number}", $bed, null, $data);

        return $this->ok(Transform::bed($bed->load('room')));
    }

    public function updateBed(Request $request, Bed $bed): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', Rule::in(['available', 'occupied', 'maintenance', 'reserved'])],
        ]);

        $occupied = Admission::where('bed_id', $bed->id)->where('status', 'admitted')->exists();

        if ($data['status'] === 'available' && ($bed->status === 'occupied' || $occupied)) {
            return response()->json([
                'message' => 'Bed is occupied by an active admission and cannot be set to available.',
            ], 422);
        }

        $old = ['status' => $bed->status];
        $bed->update($data);

        AuditLogger::log('update', "Bed {$bed->bed_number} status changed to {$bed->status}", $bed, $old, $data);

        return $this->ok(Transform::bed($bed->load('room')));
    }

    public function destroyBed(Bed $bed): JsonResponse
    {
        $occupied = $bed->status === 'occupied'
            || Admission::where('bed_id', $bed->id)->where('status', 'admitted')->exists();

        if ($occupied) {
            return response()->json([
                'message' => 'Bed cannot be deleted while it is occupied.',
            ], 400);
        }

        $old = ['id' => $bed->id, 'bed_number' => $bed->bed_number, 'room_id' => $bed->room_id];
        $bed->delete();

        AuditLogger::log('delete', "Bed {$old['bed_number']} deleted", $bed, $old);

        return $this->message('Bed deleted successfully.');
    }
}
