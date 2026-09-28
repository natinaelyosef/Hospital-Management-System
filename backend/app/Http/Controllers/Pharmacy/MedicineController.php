<?php

namespace App\Http\Controllers\Pharmacy;

use App\Http\Controllers\Controller;
use App\Http\Transformers\Transform;
use App\Models\Medicine;
use App\Models\MedicineBatch;
use App\Models\PharmacyTransaction;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class MedicineController extends Controller
{
    private const FORMS = ['tablet', 'capsule', 'syrup', 'injection', 'cream', 'drops', 'solution', 'inhaler', 'patch'];

    private const COLUMNS = [
        'name',
        'generic_name',
        'category_id',
        'supplier_id',
        'form',
        'strength',
        'unit',
        'reorder_level',
        'selling_price',
        'is_active',
        'stock_quantity',
    ];

    public function index(Request $request): JsonResponse
    {
        $query = Medicine::query()->with([
            'category',
            'supplier',
            'batches' => fn ($q) => $q->orderBy('expiry_date'),
        ]);

        if ($request->filled('search')) {
            $search = trim((string) $request->query('search'));
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('generic_name', 'like', "%{$search}%");
            });
        }

        if ($request->filled('category_id')) {
            $query->where('category_id', (int) $request->query('category_id'));
        }

        if ($request->boolean('low_stock')) {
            $query->whereColumn('stock_quantity', '<=', 'reorder_level');
        }

        if ($request->filled('expiring_days')) {
            $days = max(0, (int) $request->query('expiring_days'));
            $today = now()->toDateString();
            $until = now()->addDays($days)->toDateString();

            $query->whereHas('batches', function ($q) use ($today, $until) {
                $q->where('quantity_available', '>', 0)
                    ->where('expiry_date', '>=', $today)
                    ->where('expiry_date', '<=', $until);
            });
        }

        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        return $this->paginated($request, $query, fn (Medicine $medicine) => Transform::medicine($medicine));
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate($this->rules() + [
            'initial_batch' => 'sometimes|array',
            'initial_batch.batch_number' => 'required_with:initial_batch|string|max:255',
            'initial_batch.expiry_date' => 'required_with:initial_batch|date',
            'initial_batch.quantity' => 'required_with:initial_batch|integer|min:1',
            'initial_batch.purchase_price' => 'sometimes|numeric|min:0',
        ]);

        $batch = $validated['initial_batch'] ?? null;
        unset($validated['initial_batch']);

        $medicine = DB::transaction(function () use ($validated, $batch) {
            $medicine = Medicine::create($this->storeAttributes($validated));

            if ($batch) {
                $this->createBatch($medicine, $batch);
            }

            return $medicine;
        });

        AuditLogger::log('create', "Medicine created: {$medicine->name}", $medicine, null, $medicine->only(self::COLUMNS));

        return $this->ok($this->transform($medicine));
    }

    public function show(Medicine $medicine): JsonResponse
    {
        return $this->ok($this->transform($medicine));
    }

    public function update(Request $request, Medicine $medicine): JsonResponse
    {
        $validated = $request->validate($this->rules());

        $old = $medicine->only(self::COLUMNS);

        $medicine->fill($this->updateAttributes($validated));
        $medicine->save();

        AuditLogger::log('update', "Medicine updated: {$medicine->name}", $medicine, $old, $medicine->only(self::COLUMNS));

        return $this->ok($this->transform($medicine));
    }

    public function destroy(Medicine $medicine): JsonResponse
    {
        if ($medicine->prescriptionItems()->exists()) {
            return response()->json([
                'message' => 'Cannot delete a medicine that is referenced by prescriptions.',
            ], 400);
        }

        $medicine->delete();

        AuditLogger::log('delete', "Medicine deleted: {$medicine->name}", $medicine);

        return $this->message('Medicine deleted successfully.');
    }

    public function storeBatch(Request $request, Medicine $medicine): JsonResponse
    {
        $validated = $request->validate([
            'batch_number' => 'required|string|max:255',
            'expiry_date' => 'required|date',
            'quantity' => 'required|integer|min:1',
            'purchase_price' => 'sometimes|numeric|min:0',
        ]);

        DB::transaction(function () use ($medicine, $validated) {
            $this->createBatch($medicine, $validated);
        });

        AuditLogger::log('create', "Medicine batch {$validated['batch_number']} added: {$medicine->name}", $medicine);

        return $this->ok($this->transform($medicine));
    }

    /**
     * @return array<string, mixed>
     */
    private function rules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'generic_name' => 'nullable|string|max:255',
            'category_id' => 'nullable|integer|exists:medicine_categories,id',
            'supplier_id' => 'nullable|integer|exists:suppliers,id',
            'form' => 'sometimes|nullable|in:'.implode(',', self::FORMS),
            'strength' => 'nullable|string|max:255',
            'unit' => 'nullable|string|max:255',
            'reorder_level' => 'sometimes|integer|min:0',
            'selling_price' => 'sometimes|numeric|min:0',
            'is_active' => 'sometimes|boolean',
        ];
    }

    /**
     * Attributes for creating a medicine: validated input plus the column
     * defaults, with a stock of 0 (batches own every stock movement).
     *
     * @param  array<string, mixed>  $validated
     * @return array<string, mixed>
     */
    private function storeAttributes(array $validated): array
    {
        $attributes = $validated;

        if (($attributes['form'] ?? null) === null) {
            $attributes['form'] = 'tablet';
        }

        if (($attributes['unit'] ?? null) === null) {
            $attributes['unit'] = 'unit';
        }

        $defaults = [
            'reorder_level' => 10,
            'selling_price' => 0,
            'is_active' => true,
        ];

        foreach ($defaults as $column => $default) {
            if (! isset($attributes[$column])) {
                $attributes[$column] = $default;
            }
        }

        $attributes['stock_quantity'] = 0;

        return $attributes;
    }

    /**
     * Attributes for updating: only the keys the client actually sent, so an
     * omitted field keeps its current value. Stock is never mutated here.
     *
     * @param  array<string, mixed>  $validated
     * @return array<string, mixed>
     */
    private function updateAttributes(array $validated): array
    {
        foreach (['form', 'unit'] as $column) {
            if (array_key_exists($column, $validated) && $validated[$column] === null) {
                unset($validated[$column]);
            }
        }

        return $validated;
    }

    /**
     * Stock in: create the batch, increment medicine stock and record the
     * purchase transaction. Must run inside the caller's transaction.
     *
     * @param  array<string, mixed>  $batch
     */
    private function createBatch(Medicine $medicine, array $batch): MedicineBatch
    {
        $quantity = (int) $batch['quantity'];
        $price = (float) ($batch['purchase_price'] ?? 0);

        $medicineBatch = $medicine->batches()->create([
            'batch_number' => $batch['batch_number'],
            'expiry_date' => $batch['expiry_date'],
            'quantity_received' => $quantity,
            'quantity_available' => $quantity,
            'purchase_price' => $price,
            'received_at' => now(),
        ]);

        $medicine->increment('stock_quantity', $quantity);

        PharmacyTransaction::create([
            'medicine_id' => $medicine->id,
            'batch_id' => $medicineBatch->id,
            'type' => 'purchase',
            'quantity' => $quantity,
            'unit_price' => $price,
            'total_price' => round($quantity * $price, 2),
            'reference' => $batch['batch_number'],
            'performed_by' => auth()->id(),
        ]);

        return $medicineBatch;
    }

    private function transform(Medicine $medicine): ?array
    {
        $medicine->loadMissing([
            'category',
            'supplier',
            'batches' => fn ($q) => $q->orderBy('expiry_date'),
        ]);

        return Transform::medicine($medicine);
    }
}
