<?php

namespace App\Http\Controllers;

use App\Http\Transformers\Transform;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = $request->user()->notifications()->getQuery()->orderByDesc('created_at');

        return $this->paginated($request, $query, fn ($notification) => Transform::notification($notification));
    }

    public function unreadCount(Request $request): JsonResponse
    {
        $count = $request->user()->notifications()->whereNull('read_at')->count();

        return $this->ok(['count' => $count]);
    }

    public function read(Request $request, $id): JsonResponse
    {
        $notification = $request->user()->notifications()->findOrFail($id);
        $notification->markAsRead();

        return $this->message('Notification marked as read.');
    }

    public function readAll(Request $request): JsonResponse
    {
        $request->user()->unreadNotifications->markAsRead();

        return $this->message('All notifications marked as read.');
    }
}
