<?php

namespace App\Http\Controllers;

use App\Support\VisitWorkflow;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Connected-workflow utilities: role-aware task queues (§18) and
 * complaint-based department suggestions (§3).
 */
class WorkflowController extends Controller
{
    /**
     * Task buckets for the current role (counts + deep links into the
     * existing filtered list pages).
     *
     * @return array{key: string, label: string, count: int, url: string}
     */
    public function summary(Request $request, VisitWorkflow $flow): JsonResponse
    {
        return $this->ok($flow->queuesFor($request->user()));
    }

    /**
     * Rank departments against a free-text complaint so reception can route
     * with guidance while keeping the final decision human.
     */
    public function suggestDepartment(Request $request, VisitWorkflow $flow): JsonResponse
    {
        $data = $request->validate([
            'complaint' => ['required', 'string', 'max:1000'],
        ]);

        return $this->ok($flow->suggestDepartments($data['complaint']));
    }
}
