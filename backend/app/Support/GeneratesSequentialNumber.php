<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

trait GeneratesSequentialNumber
{
    /**
     * Generate a sequential number: {prefix}-{YYYY}-{000001}
     */
    public function next(string $prefix, string $table, string $column): string
    {
        $year = Carbon::now()->year;
        
        // Count records for the current year
        $count = DB::table($table)
            ->whereYear('created_at', $year)
            ->count();

        $sequence = str_pad($count + 1, 6, '0', STR_PAD_LEFT);

        return "{$prefix}-{$year}-{$sequence}";
    }
}
