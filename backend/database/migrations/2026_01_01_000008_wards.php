<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('wards', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('code')->unique();
            $table->string('floor')->nullable();
            $table->string('type')->default('general');
            $table->timestamps();
        });

        Schema::create('rooms', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ward_id')->constrained()->cascadeOnDelete();
            $table->string('room_number');
            $table->string('type')->default('general');
            $table->decimal('tariff', 10, 2)->default(0);
            $table->integer('capacity')->default(1);
            $table->timestamps();

            $table->unique(['ward_id', 'room_number']);
        });

        Schema::create('beds', function (Blueprint $table) {
            $table->id();
            $table->foreignId('room_id')->constrained()->cascadeOnDelete();
            $table->string('bed_number');
            $table->enum('status', ['available', 'occupied', 'maintenance', 'reserved'])->default('available');
            $table->timestamps();

            $table->unique(['room_id', 'bed_number']);
        });

        Schema::create('admissions', function (Blueprint $table) {
            $table->id();
            $table->string('admission_number')->unique();
            $table->foreignId('patient_id')->constrained()->cascadeOnDelete();
            $table->foreignId('ward_id')->constrained()->cascadeOnDelete();
            $table->foreignId('room_id')->constrained()->cascadeOnDelete();
            $table->foreignId('bed_id')->constrained()->cascadeOnDelete();
            $table->foreignId('consultant_id')->nullable()->constrained('doctors')->nullOnDelete();
            $table->text('diagnosis')->nullable();
            $table->timestamp('admitted_at')->useCurrent();
            $table->foreignId('admitted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->enum('status', ['admitted', 'transferred', 'discharged'])->default('admitted');
            $table->timestamp('discharged_at')->nullable();
            $table->foreignId('discharged_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('discharge_summary')->nullable();
            $table->enum('outcome', ['recovered', 'improved', 'referred', 'deceased', 'left_against_advice'])->nullable();
            $table->timestamps();

            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('admissions');
        Schema::dropIfExists('beds');
        Schema::dropIfExists('rooms');
        Schema::dropIfExists('wards');
    }
};
