<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('status', 20)->default('active')->after('is_active');
            $table->foreignId('suspended_by')->nullable()->after('status')->constrained('users')->nullOnDelete();
            $table->timestamp('suspended_at')->nullable()->after('suspended_by');
            $table->string('suspension_reason')->nullable()->after('suspended_at');
            $table->foreignId('deleted_by')->nullable()->after('last_login_at')->constrained('users')->nullOnDelete();
            $table->string('deletion_reason')->nullable()->after('deleted_by');
            $table->timestamp('invited_at')->nullable()->after('deletion_reason');
            $table->string('invite_token', 64)->nullable()->unique()->after('invited_at');
            $table->softDeletes('deleted_at'); // SoftDeletes::deleted_at (mirrors deletion_reason/deleted_by above)

            $table->index(['status', 'is_active']);
        });

        // Back-fill legacy rows: is_active is the only signal that existed before.
        DB::table('users')->where('is_active', true)->update(['status' => 'active']);
        DB::table('users')->where('is_active', false)->update(['status' => 'inactive']);
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['status', 'is_active']);
            $table->dropConstrainedForeignId('deleted_by');
            $table->dropConstrainedForeignId('suspended_by');
            $table->dropColumn([
                'status', 'suspended_at', 'suspension_reason', 'deleted_at',
                'deletion_reason', 'invited_at', 'invite_token',
            ]);
        });
    }
};
