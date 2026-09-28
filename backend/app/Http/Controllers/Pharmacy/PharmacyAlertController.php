<?php

namespace App\Http\Controllers\Pharmacy;

use App\Http\Controllers\Controller;
use App\Http\Transformers\Transform;
use App\Models\Medicine;
use Illuminate\Http\JsonResponse;

class PharmacyAlertController extends Controller
{
    public function __invoke(): JsonResponse
    {
        $today = now()->toDateString();
        $inNinetyDays = now()->addDays(90)->toDateString();

        $lowStock = Medicine::query()
            ->with('batches')
            ->whereColumn('stock_quantity', '<=', 'reorder_level')
            ->orderBy('name')
            ->limit(20)
            ->get();

        $expired = Medicine::query()
            ->with('batches')
            ->whereHas('batches', function ($query) use ($today) {
                $query->where('expiry_date', '<', $today)
                    ->where('quantity_available', '>', 0);
            })
            ->orderBy('name')
            ->get();

        $expiringSoon = Medicine::query()
            ->with('batches')
            ->whereHas('batches', function ($query) use ($today, $inNinetyDays) {
                $query->where('quantity_available', '>', 0)
                    ->where('expiry_date', '>=', $today)
                    ->where('expiry_date', '<=', $inNinetyDays);
            })
            ->orderBy('name')
            ->get();

        return $this->ok([
            'low_stock' => $lowStock->map(fn (Medicine $medicine) => Transform::medicine($medicine))->values()->all(),
            'expired' => $expired->map(fn (Medicine $medicine) => Transform::medicine($medicine))->values()->all(),
            'expiring_soon' => $expiringSoon->map(fn (Medicine $medicine) => Transform::medicine($medicine))->values()->all(),
        ]);
    }
}
