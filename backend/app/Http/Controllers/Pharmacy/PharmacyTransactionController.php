<?php

namespace App\Http\Controllers\Pharmacy;

use App\Http\Controllers\Controller;
use App\Http\Transformers\Transform;
use App\Models\PharmacyTransaction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PharmacyTransactionController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = PharmacyTransaction::query()
            ->with(['medicine', 'performer'])
            ->orderByDesc('id');

        if ($request->filled('type')) {
            $query->where('type', $request->query('type'));
        }

        if ($request->filled('search')) {
            $search = trim((string) $request->query('search'));
            $query->where(function ($q) use ($search) {
                $q->whereHas('medicine', function ($medicine) use ($search) {
                    $medicine->where('name', 'like', "%{$search}%");
                })->orWhere('reference', 'like', "%{$search}%");
            });
        }

        return $this->paginated(
            $request,
            $query,
            fn (PharmacyTransaction $transaction) => Transform::pharmacyTransaction($transaction)
        );
    }
}
