<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

trait GeneratesSequentialNumber
{
    /**
     * Generate a sequential number: {prefix}-{YYYY}-{000001}
<<<<<<< HEAD
     *
     * Count-based sequencing collides after row deletions, so probe
     * forward until an unused value is found.
=======
<<<<<<< HEAD
     *
     * Count-based sequencing collides after row deletions, so probe
     * forward until an unused value is found.
=======
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a
     */
    public function next(string $prefix, string $table, string $column): string
    {
        $year = Carbon::now()->year;
<<<<<<< HEAD

=======
<<<<<<< HEAD

=======
        
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a
        // Count records for the current year
        $count = DB::table($table)
            ->whereYear('created_at', $year)
            ->count();

<<<<<<< HEAD
=======
<<<<<<< HEAD
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a
        for ($i = $count + 1; ; $i++) {
            $sequence = str_pad($i, 6, '0', STR_PAD_LEFT);
            $candidate = "{$prefix}-{$year}-{$sequence}";

            $exists = DB::table($table)->where($column, $candidate)->exists();

            if (! $exists) {
                return $candidate;
            }
        }
<<<<<<< HEAD
=======
=======
        $sequence = str_pad($count + 1, 6, '0', STR_PAD_LEFT);

        return "{$prefix}-{$year}-{$sequence}";
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a
    }
}
