<?php

namespace App\Http\Controllers;

use App\Models\Admission;
use App\Models\Appointment;
use App\Models\Doctor;
use App\Models\Invoice;
use App\Models\LabResult;
use App\Models\Medicine;
use App\Models\MedicineBatch;
use App\Models\Patient;
use App\Models\Payment;
use App\Models\PharmacyTransaction;
use App\Models\Prescription;
use App\Models\Visit;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReportController extends Controller
{
    public function dailyPatients(Request $request)
    {
        [$from, $to] = $this->range($request);

        $counts = Patient::query()
            ->whereBetween('created_at', [$from, $to])
            ->selectRaw('DATE(created_at) as day, COUNT(*) as total')
            ->groupBy('day')
            ->pluck('total', 'day');

        return $this->series($request, $this->days($from, $to), $counts, ['date', 'count']);
    }

    public function appointments(Request $request)
    {
        [$from, $to] = $this->range($request);

        $counts = Appointment::query()
            ->whereBetween('appointment_date', [$from->toDateString(), $to->toDateString()])
            ->selectRaw('appointment_date as day, COUNT(*) as total')
            ->groupBy('appointment_date')
            ->pluck('total', 'day');

        $byStatus = Appointment::query()
            ->whereBetween('appointment_date', [$from->toDateString(), $to->toDateString()])
            ->selectRaw('status, COUNT(*) as total')
            ->groupBy('status')
            ->orderBy('status')
            ->get()
            ->map(fn ($row) => ['status' => $row->status, 'count' => (int) $row->total])
            ->values()
            ->all();

        $labels = $this->days($from, $to);
        $series = $this->mapCounts($labels, $counts);

        if ($csv = $this->csv($request, ['date', 'count'], $this->zip($labels, $series))) {
            return $csv;
        }

        return $this->ok([
            'labels' => $labels,
            'series' => $series,
            'by_status' => $byStatus,
        ]);
    }

    public function revenue(Request $request)
    {
        [$from, $to] = $this->range($request);

        $counts = Payment::query()
            ->where('status', 'completed')
            ->whereBetween('paid_at', [$from, $to])
            ->selectRaw('DATE(paid_at) as day, COALESCE(SUM(amount), 0) as total')
            ->groupBy('day')
            ->pluck('total', 'day');

        return $this->series($request, $this->days($from, $to), $counts, ['date', 'amount'], true);
    }

    public function pharmacySales(Request $request)
    {
        [$from, $to] = $this->range($request);

        $counts = PharmacyTransaction::query()
            ->whereIn('type', ['dispense', 'sale'])
            ->whereBetween('created_at', [$from, $to])
            ->selectRaw('DATE(created_at) as day, COALESCE(SUM(total_price), 0) as total')
            ->groupBy('day')
            ->pluck('total', 'day');

        return $this->series($request, $this->days($from, $to), $counts, ['date', 'amount'], true);
    }

    public function labTests(Request $request)
    {
        [$from, $to] = $this->range($request);

        $rows = LabResult::query()
            ->join('lab_tests', 'lab_tests.id', '=', 'lab_results.lab_test_id')
            ->where('lab_results.status', 'completed')
            ->whereBetween('lab_results.performed_at', [$from, $to])
            ->selectRaw('lab_tests.name as name, COUNT(*) as total')
            ->groupBy('lab_tests.name')
            ->orderByDesc('total')
            ->get();

        $labels = $rows->pluck('name')->values()->all();
        $series = $rows->pluck('total')->map(fn ($v) => (int) $v)->values()->all();
        $total = array_sum($series);

        if ($csv = $this->csv($request, ['test', 'count'], array_map(
            fn ($name, $count) => [$name, $count],
            $labels,
            $series
        ))) {
            return $csv;
        }

        return $this->ok([
            'labels' => $labels,
            'series' => $series,
            'total' => $total,
        ]);
    }

    public function admissions(Request $request)
    {
        [$from, $to] = $this->range($request);

        $admitted = Admission::query()
            ->whereBetween('admitted_at', [$from, $to])
            ->selectRaw('DATE(admitted_at) as day, COUNT(*) as total')
            ->groupBy('day')
            ->pluck('total', 'day');

        $discharged = Admission::query()
            ->whereNotNull('discharged_at')
            ->whereBetween('discharged_at', [$from, $to])
            ->selectRaw('DATE(discharged_at) as day, COUNT(*) as total')
            ->groupBy('day')
            ->pluck('total', 'day');

        $labels = $this->days($from, $to);
        $admittedSeries = $this->mapCounts($labels, $admitted);
        $dischargedSeries = $this->mapCounts($labels, $discharged);

        $rows = [];
        foreach ($labels as $i => $label) {
            $rows[] = [$label, $admittedSeries[$i], $dischargedSeries[$i]];
        }

        if ($csv = $this->csv($request, ['date', 'admitted', 'discharged'], $rows)) {
            return $csv;
        }

        return $this->ok([
            'labels' => $labels,
            'admitted' => $admittedSeries,
            'discharged' => $dischargedSeries,
        ]);
    }

    public function outstanding(Request $request)
    {
        [, $to] = $this->range($request);

        $invoices = Invoice::query()
            ->with('patient')
            ->whereIn('status', ['unpaid', 'partial'])
            ->where('created_at', '<=', $to)
            ->orderByDesc('created_at')
            ->get()
            ->filter(fn (Invoice $invoice) => round((float) $invoice->total - (float) $invoice->paid_amount, 2) > 0)
            ->values();

        $rows = $invoices->map(fn (Invoice $invoice) => [
            'invoice_number' => $invoice->invoice_number,
            'patient' => trim(($invoice->patient?->first_name ?? '').' '.($invoice->patient?->last_name ?? '')),
            'total' => (float) $invoice->total,
            'paid_amount' => (float) $invoice->paid_amount,
            'balance' => round((float) $invoice->total - (float) $invoice->paid_amount, 2),
            'created_at' => $invoice->created_at?->toIso8601String(),
        ])->all();

        if ($csv = $this->csv(
            $request,
            ['invoice_number', 'patient', 'total', 'paid_amount', 'balance', 'created_at'],
            array_map(fn ($row) => [
                $row['invoice_number'],
                $row['patient'],
                $row['total'],
                $row['paid_amount'],
                $row['balance'],
                $row['created_at'],
            ], $rows)
        )) {
            return $csv;
        }

        return $this->ok($rows);
    }

    public function doctorPerformance(Request $request)
    {
        [$from, $to] = $this->range($request);

        $appointments = Appointment::query()
            ->whereBetween('appointment_date', [$from->toDateString(), $to->toDateString()])
            ->selectRaw('doctor_id, COUNT(*) as total')
            ->groupBy('doctor_id')
            ->pluck('total', 'doctor_id');

        $visits = Visit::query()
            ->whereBetween('visit_date', [$from->toDateString(), $to->toDateString()])
            ->selectRaw('doctor_id, COUNT(*) as total')
            ->groupBy('doctor_id')
            ->pluck('total', 'doctor_id');

        $prescriptions = Prescription::query()
            ->whereBetween('created_at', [$from, $to])
            ->selectRaw('doctor_id, COUNT(*) as total')
            ->groupBy('doctor_id')
            ->pluck('total', 'doctor_id');

        $ids = $appointments->keys()
            ->merge($visits->keys())
            ->merge($prescriptions->keys())
            ->filter()
            ->unique()
            ->values();

        $doctors = Doctor::query()
            ->with('user')
            ->whereIn('id', $ids)
            ->get()
            ->keyBy('id');

        $rows = $ids->map(function ($id) use ($appointments, $visits, $prescriptions, $doctors) {
            $doctor = $doctors->get($id);

            return [
                'doctor' => $doctor ? ($doctor->user?->name ?? $doctor->license_number) : 'Unknown doctor',
                'appointments' => (int) $appointments->get($id, 0),
                'visits' => (int) $visits->get($id, 0),
                'prescriptions' => (int) $prescriptions->get($id, 0),
            ];
        })->sortBy([
            fn ($a, $b) => $b['appointments'] <=> $a['appointments'],
            fn ($a, $b) => $b['visits'] <=> $a['visits'],
        ])->values()->all();

        if ($csv = $this->csv(
            $request,
            ['doctor', 'appointments', 'visits', 'prescriptions'],
            array_map(fn ($row) => [$row['doctor'], $row['appointments'], $row['visits'], $row['prescriptions']], $rows)
        )) {
            return $csv;
        }

        return $this->ok($rows);
    }

    public function inventory(Request $request)
    {
        $today = now()->toDateString();
        $in90 = now()->addDays(90)->toDateString();

        $expired = MedicineBatch::query()
            ->where('quantity_available', '>', 0)
            ->where('expiry_date', '<', $today)
            ->selectRaw('medicine_id, COUNT(*) as total')
            ->groupBy('medicine_id')
            ->pluck('total', 'medicine_id');

        $expiring = MedicineBatch::query()
            ->where('quantity_available', '>', 0)
            ->whereBetween('expiry_date', [$today, $in90])
            ->selectRaw('medicine_id, COUNT(*) as total')
            ->groupBy('medicine_id')
            ->pluck('total', 'medicine_id');

        $rows = Medicine::query()
            ->orderBy('name')
            ->get()
            ->map(fn (Medicine $medicine) => [
                'medicine' => $medicine->name,
                'stock' => (int) $medicine->stock_quantity,
                'reorder_level' => (int) $medicine->reorder_level,
                'expired' => (int) $expired->get($medicine->id, 0),
                'expiring' => (int) $expiring->get($medicine->id, 0),
            ])->values()->all();

        if ($csv = $this->csv(
            $request,
            ['medicine', 'stock', 'reorder_level', 'expired', 'expiring'],
            array_map(fn ($row) => [
                $row['medicine'],
                $row['stock'],
                $row['reorder_level'],
                $row['expired'],
                $row['expiring'],
            ], $rows)
        )) {
            return $csv;
        }

        return $this->ok($rows);
    }

    /**
     * @return array{0: Carbon, 1: Carbon}
     */
    private function range(Request $request): array
    {
        $from = $request->filled('from')
            ? Carbon::parse($request->query('from'))->startOfDay()
            : Carbon::today()->subDays(29);

        $to = $request->filled('to')
            ? Carbon::parse($request->query('to'))->startOfDay()
            : Carbon::today();

        if ($to->lt($from)) {
            [$from, $to] = [$to, $from];
        }

        return [$from->copy()->startOfDay(), $to->copy()->endOfDay()];
    }

    /**
     * @return array<int, string>
     */
    private function days(Carbon $from, Carbon $to): array
    {
        $days = [];
        $cursor = $from->copy()->startOfDay();

        while ($cursor->lte($to)) {
            $days[] = $cursor->toDateString();
            $cursor->addDay();
        }

        return $days;
    }

    /**
     * @param  array<int, string>  $labels
     * @param  array<string|int, mixed>  $counts
     * @return array<int, int>
     */
    private function mapCounts(array $labels, $counts): array
    {
        $out = [];

        foreach ($labels as $label) {
            $out[] = (int) ($counts[$label] ?? 0);
        }

        return $out;
    }

    /**
     * @param  array<int, string>  $labels
     * @param  array<int, int>  $series
     * @return array<int, array{0: string, 1: int}>
     */
    private function zip(array $labels, array $series): array
    {
        $rows = [];

        foreach ($labels as $i => $label) {
            $rows[] = [$label, $series[$i]];
        }

        return $rows;
    }

    /**
     * Shared { labels, series, total? } response with CSV export support.
     *
     * @param  array<int, string>  $labels
     * @param  array<string|int, mixed>  $counts
     * @param  array{0: string, 1: string}  $headers
     */
    private function series(Request $request, array $labels, $counts, array $headers, bool $withTotal = false)
    {
        $series = $this->mapCounts($labels, $counts);

        if ($csv = $this->csv($request, $headers, $this->zip($labels, $series))) {
            return $csv;
        }

        $payload = ['labels' => $labels, 'series' => $series];

        if ($withTotal) {
            $payload['total'] = round((float) array_sum($series), 2);
        }

        return $this->ok($payload);
    }

    /**
     * @param  array<int, string>  $headers
     * @param  iterable<int, array<int, mixed>>  $rows
     */
    private function csv(Request $request, array $headers, iterable $rows): ?StreamedResponse
    {
        if ($request->query('export') !== 'csv') {
            return null;
        }

        return response()->streamDownload(function () use ($headers, $rows) {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, $headers);

            foreach ($rows as $row) {
                fputcsv($handle, $row);
            }

            fclose($handle);
        }, 'report.csv', ['Content-Type' => 'text/csv']);
    }
}
