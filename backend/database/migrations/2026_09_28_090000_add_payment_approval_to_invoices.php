<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Payment approval is an explicit accountant decision, separate from
     * recording the cash. Recording settles the invoice; approving it releases
     * the medication to the pharmacy.
     */
    public function up(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            // Links the bill back to the prescription that produced it, so the
            // pharmacy payment gate is exact even for a walk-in (no case).
            $table->foreignId('prescription_id')->nullable()->after('visit_id')->constrained('prescriptions')->nullOnOnDelete();
            $table->foreignId('approved_by')->nullable()->after('issued_by')->constrained('users')->nullOnOnDelete();
            $table->timestamp('approved_at')->nullable()->after('approved_by');
            $table->text('approval_notes')->nullable()->after('approved_at');
            $table->index(['prescription_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->dropForeign(['prescription_id']);
            $table->dropForeign(['approved_by']);
            $table->dropColumn(['prescription_id', 'approved_by', 'approved_at', 'approval_notes']);
        });
    }
};
