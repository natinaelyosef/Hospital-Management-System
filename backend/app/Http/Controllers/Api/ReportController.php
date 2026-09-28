<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Patient;
use App\Models\Appointment;
use App\Models\Invoice;
use App\Models\Medicine;
use App\Models\Admission;
use App\Models\Doctor;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class ReportController extends Controller
{
    public function dailyPatients(Request $request)
    {
        $from = $request->get('from', Carbon::now()->subDays(30)->toDateString());
        $to = $request->get('to', Carbon::now()->toDateString());

        $data = Patient::select(
            DB::raw('DATE(created_at) as date'),
            DB::raw('count(*) as count')
        )
        ->whereBetween('created_at', [$from, $to])
        ->groupBy('date')
        ->orderBy('date')
        ->get();

        return response()->json([
            'labels' => $data->pluck('date'),
            'series' => $data->pluck('count'),
        ]);
    }

    public function revenue(Request $request)
    {
        $from = $request->get('from', Carbon::now()->startOfMonth()->toDateString());
        $to = $request->get('to', Carbon::now()->toDateString());

        $dailyRevenue = Invoice::select(
            DB::raw('DATE(created_at) as date'),
            DB::raw('SUM(paid_amount) as amount')
        )
        ->whereBetween('created_at', [$from, $to])
        ->groupBy('date')
        ->orderBy('date')
        ->get();

        $total = Invoice::whereBetween('created_at', [$from, $to])->sum('paid_amount');

        return response()->json([
            'labels' => $dailyRevenue->pluck('date'),
            'series' => $dailyRevenue->pluck('amount'),
            'total' => $total,
        ]);
    }

    public function appointments(Request $request)
    {
        $from = $request->get('from', Carbon::now()->subDays(30)->toDateString());
        $to = $request->get('to', Carbon::now()->toDateString());

        $dailyCount = Appointment::select(
            DB::raw('DATE(appointment_date) as date'),
            DB::raw('count(*) as count')
        )
        ->whereBetween('appointment_date', [$from, $to])
        ->groupBy('date')
        ->orderBy('date')
        ->get();

        $byStatus = Appointment::select('status', DB::raw('count(*) as count'))
            ->whereBetween('appointment_date', [$from, $to])
            ->groupBy('status')
            ->get();

        return response()->json([
            'labels' => $dailyCount->pluck('date'),
            'series' => $dailyCount->pluck('count'),
            'by_status' => $byStatus,
        ]);
    }

    public function doctorPerformance(Request $request)
    {
        $from = $request->get('from', Carbon::now()->subDays(30)->toDateString());
        $to = $request->get('to', Carbon::now()->toDateString());

        $performance = Doctor::select('id', 'specialization')
            ->addSelect([
                'appointments' => Appointment::selectRaw('count(*)')->whereColumn('doctor_id', 'doctors.id')->whereBetween('appointment_date', [$from, $to]),
                'visits' => DB::table('visits')->selectRaw('count(*)')->whereColumn('doctor_id', 'doctors.id')->whereBetween('visit_date', [$from, $to]),
                'prescriptions' => DB::table('prescriptions')->selectRaw('count(*)')->whereColumn('doctor_id', 'doctors.id')->whereBetween('created_at', [$from, $to]),
            ])
            ->get();

        return response()->json(['data' => $performance]);
    }

    public function inventoryReport(Request $request)
    {
        $inventory = Medicine::select('id', 'name', 'stock_quantity', 'reorder_level')
            ->withCount(['batches as expired_count' => function($q) {
                $q->where('expiry_date', '<', now()->toDateString());
            }])
            ->withCount(['batches as expiring_soon_count' => function($q) {
                $q->whereBetween('expiry_date', [now()->toDateString(), now()->addDays(90)->toDateString()]);
            }])
            ->get()
            ->map(function($m) {
                return [
                    'medicine' => $m->name,
                    'stock' => $m->stock_quantity,
                    'reorder_level' => $m->reorder_level,
                    'expired' => $m->expired_count,
                    'expiring' => $m->expiring_soon_count,
                ];
            });

        return response()->json(['data' => $inventory]);
    }

    public function outstandingPayments(Request $request)
    {
        $outstanding = Invoice::where('status', '!=', 'paid')
            ->with('patient')
            ->select('invoice_number', 'patient_id', 'total', 'paid_amount', 'created_at')
            ->get()
            ->map(function($inv) {
                return [
                    'invoice_number' => $inv->invoice_number,
                    'patient' => $inv->patient->full_name ?? 'Unknown',
                    'total' => $inv->total,
                    'paid_amount' => $inv->paid_amount,
                    'balance' => $inv->total - $inv->paid_amount,
                    'created_at' => $inv->created_at,
                ];
            });

        return response()->json(['data' => $outstanding]);
    }
}
