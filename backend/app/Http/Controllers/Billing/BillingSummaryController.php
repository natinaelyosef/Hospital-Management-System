<?php

namespace App\Http\Controllers\Billing;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\Payment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BillingSummaryController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $patientId = $request->user()?->patient_id;

        $startOfDay = now()->startOfDay();
        $startOfMonth = now()->startOfMonth();

        $payments = Payment::query()->where('status', 'completed');
        $invoices = Invoice::query()->where('status', '!=', 'cancelled');

        if ($patientId) {
            $payments->where('patient_id', $patientId);
            $invoices->where('patient_id', $patientId);
        }

        $todayCollected = (clone $payments)
            ->where('paid_at', '>=', $startOfDay)
            ->sum('amount');

        $monthCollected = (clone $payments)
            ->where('paid_at', '>=', $startOfMonth)
            ->sum('amount');

        $paymentsToday = (clone $payments)
            ->where('paid_at', '>=', $startOfDay)
            ->count();

        $invoicesToday = (clone $invoices)
            ->where('created_at', '>=', $startOfDay)
            ->count();

        $outstanding = (clone $invoices)
            ->selectRaw('COALESCE(SUM(total - paid_amount), 0) as balance')
            ->value('balance');

        return $this->ok([
            'today_collected' => round((float) $todayCollected, 2),
            'month_collected' => round((float) $monthCollected, 2),
            'outstanding' => round((float) $outstanding, 2),
            'invoices_today' => (int) $invoicesToday,
            'payments_today' => (int) $paymentsToday,
        ]);
    }
}
