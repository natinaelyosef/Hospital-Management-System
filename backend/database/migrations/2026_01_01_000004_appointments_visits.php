<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('appointments', function (Blueprint $table) {
            $table->id();
            $table->string('appointment_number')->unique();
            $table->foreignId('patient_id')->constrained()->cascadeOnDelete();
            $table->foreignId('doctor_id')->constrained()->cascadeOnDelete();
            $table->foreignId('department_id')->nullable()->constrained()->nullOnDelete();
            $table->date('appointment_date');
            $table->time('start_time');
            $table->time('end_time');
            $table->enum('type', ['opd', 'follow_up', 'emergency', 'consultation']);
            $table->enum('status', ['pending', 'confirmed', 'waiting', 'in_progress', 'completed', 'cancelled', 'no_show'])->default('pending');
            $table->integer('queue_number')->nullable();
            $table->text('reason')->nullable();
            $table->text('notes')->nullable();
            $table->text('cancelled_reason')->nullable();
            $table->unsignedBigInteger('visit_id')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['appointment_date', 'doctor_id']);
            $table->index('status');
        });

        Schema::create('visits', function (Blueprint $table) {
            $table->id();
            $table->string('visit_number')->unique();
            $table->foreignId('patient_id')->constrained()->cascadeOnDelete();
            $table->foreignId('doctor_id')->constrained()->cascadeOnDelete();
            $table->foreignId('appointment_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('department_id')->nullable()->constrained()->nullOnDelete();
            $table->date('visit_date');
            $table->enum('type', ['opd', 'emergency', 'follow_up'])->default('opd');
            $table->text('chief_complaint')->nullable();
            $table->text('symptoms')->nullable();
            $table->text('diagnosis')->nullable();
            $table->text('treatment')->nullable();
            $table->text('medical_notes')->nullable();
            $table->date('follow_up_date')->nullable();
            $table->enum('status', ['in_progress', 'completed'])->default('in_progress');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('vital_signs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('visit_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('patient_id')->constrained()->cascadeOnDelete();
            $table->foreignId('recorded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('recorded_at')->useCurrent();
            $table->smallInteger('bp_systolic')->nullable();
            $table->smallInteger('bp_diastolic')->nullable();
            $table->decimal('temperature', 4, 1)->nullable();
            $table->smallInteger('pulse')->nullable();
            $table->smallInteger('oxygen_saturation')->nullable();
            $table->decimal('weight', 5, 2)->nullable();
            $table->decimal('height', 5, 2)->nullable();
            $table->smallInteger('respiratory_rate')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('medical_notes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('visit_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('patient_id')->constrained()->cascadeOnDelete();
            $table->foreignId('author_id')->constrained('users')->cascadeOnDelete();
            $table->enum('note_type', ['progress', 'nursing', 'general'])->default('general');
            $table->text('content');
            $table->timestamp('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('medical_notes');
        Schema::dropIfExists('vital_signs');
        Schema::dropIfExists('visits');
        Schema::dropIfExists('appointments');
    }
};
