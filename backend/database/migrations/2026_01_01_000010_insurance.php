<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('insurance_companies', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('code')->unique();
            $table->string('phone')->nullable();
            $table->string('email')->nullable();
            $table->text('address')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('patient_insurances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('patient_id')->constrained()->cascadeOnDelete();
            $table->foreignId('insurance_company_id')->constrained()->cascadeOnDelete();
            $table->string('policy_number');
            $table->string('holder_name')->nullable();
            $table->decimal('coverage_percent', 5, 2)->default(0);
            $table->decimal('coverage_limit', 12, 2)->nullable();
            $table->date('start_date');
            $table->date('end_date')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('insurance_claims', function (Blueprint $table) {
            $table->id();
            $table->string('claim_number')->unique();
            $table->foreignId('invoice_id')->constrained()->cascadeOnDelete();
            $table->foreignId('patient_insurance_id')->constrained()->cascadeOnDelete();
            $table->decimal('amount', 12, 2);
            $table->decimal('approved_amount', 12, 2)->nullable();
            $table->enum('status', ['draft', 'submitted', 'approved', 'rejected', 'paid'])->default('draft');
            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('decided_at')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('insurance_claims');
        Schema::dropIfExists('patient_insurances');
        Schema::dropIfExists('insurance_companies');
    }
};
