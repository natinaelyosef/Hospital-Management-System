<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Connected hospital workflow (visits become the encounter/case record).
 *
 * - visits.doctor_id becomes nullable: reception creates intake before any
 *   doctor is assigned, and referrals target departments first.
 * - visits.status widens from {in_progress, completed} to the full case
 *   machine (see App\Models\Visit::STATUSES); legacy rows are mapped
 *   in_progress -> in_consultation, completed -> visit_completed.
 * - New intake/referral columns (complaint detail, priority, referral audit).
 * - New visit_transitions table: immutable handoff history powering the
 *   Patient Journey timeline.
 *
 * No doctrine/dbal here on purpose: column alterations use driver-aware raw
 * SQL (MySQL MODIFY, SQLite table rebuild) so this runs on both the XAMPP
 * MySQL dev database and the sqlite :memory: test database.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('visits', function (Blueprint $table) {
            $table->string('priority', 20)->default('normal')->after('type');
            $table->string('symptom_duration', 100)->nullable()->after('symptoms');
            $table->string('severity', 20)->nullable()->after('symptom_duration');
            $table->text('previous_conditions')->nullable()->after('severity');
            $table->text('current_medications')->nullable()->after('previous_conditions');
            $table->text('intake_notes')->nullable()->after('current_medications');
            $table->foreignId('referred_by')->nullable()->after('created_by')->constrained('users')->nullOnDelete();
            $table->timestamp('referred_at')->nullable()->after('referred_by');

            $table->index('status');
            $table->index(['patient_id', 'status']);
        });

        if (DB::getDriverName() === 'mysql') {
            DB::statement('ALTER TABLE `visits` MODIFY `doctor_id` BIGINT UNSIGNED NULL');
            DB::statement("ALTER TABLE `visits` MODIFY `status` VARCHAR(40) NOT NULL DEFAULT 'registered'");
            // Preserve history instead of cascading: deleting a doctor must
            // not wipe the encounters they handled.
            DB::statement('ALTER TABLE `visits` DROP FOREIGN KEY `visits_doctor_id_foreign`');
            DB::statement('ALTER TABLE `visits` ADD CONSTRAINT `visits_doctor_id_foreign` FOREIGN KEY (`doctor_id`) REFERENCES `doctors` (`id`) ON DELETE SET NULL');
        } else {
            $this->rebuildVisitsForSqlite();
        }

        // Map the two legacy statuses onto the workflow machine.
        DB::table('visits')->where('status', 'in_progress')->update(['status' => 'in_consultation']);
        DB::table('visits')->where('status', 'completed')->update(['status' => 'visit_completed']);

        Schema::create('visit_transitions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('visit_id')->constrained()->cascadeOnDelete();
            $table->string('from_status', 40)->nullable();
            $table->string('to_status', 40);
            $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('note')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['visit_id', 'created_at']);
        });

        // Continuity: every pre-existing visit gets one history entry so its
        // timeline starts where the workflow machine takes over.
        $now = now()->toDateTimeString();

        foreach (DB::table('visits')->select(['id', 'status'])->cursor() as $visit) {
            DB::table('visit_transitions')->insert([
                'visit_id' => $visit->id,
                'from_status' => null,
                'to_status' => $visit->status,
                'actor_id' => null,
                'note' => 'Migrated to the connected workflow.',
                'created_at' => $now,
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('visit_transitions');

        DB::table('visits')
            ->whereNotIn('status', ['in_consultation', 'visit_completed'])
            ->update(['status' => 'in_consultation']);
        DB::table('visits')->where('status', 'visit_completed')->update(['status' => 'completed']);

        if (DB::getDriverName() === 'mysql') {
            DB::statement('ALTER TABLE `visits` DROP FOREIGN KEY `visits_doctor_id_foreign`');
            DB::statement('ALTER TABLE `visits` ADD CONSTRAINT `visits_doctor_id_foreign` FOREIGN KEY (`doctor_id`) REFERENCES `doctors` (`id`) ON DELETE CASCADE');
            // Rows with a NULL doctor cannot go back to NOT NULL; attach them
            // to the first doctor rather than losing encounters.
            $fallback = DB::table('doctors')->orderBy('id')->value('id');
            DB::table('visits')->whereNull('doctor_id')->update(['doctor_id' => $fallback]);
            DB::statement('ALTER TABLE `visits` MODIFY `doctor_id` BIGINT UNSIGNED NOT NULL');
            DB::statement("ALTER TABLE `visits` MODIFY `status` ENUM('in_progress','completed') NOT NULL DEFAULT 'in_progress'");
            DB::table('visits')->where('status', 'in_consultation')->update(['status' => 'in_progress']);

            Schema::table('visits', function (Blueprint $table) {
                $table->dropIndex(['status']);
                $table->dropIndex(['patient_id', 'status']);
                $table->dropConstrainedForeignId('referred_by');
                $table->dropColumn([
                    'priority', 'symptom_duration', 'severity', 'previous_conditions',
                    'current_medications', 'intake_notes', 'referred_at',
                ]);
            });
        } else {
            // The rebuild already recreates the legacy shape (no new columns,
            // no extra indexes), so only the data mapping below is needed.
            $this->rebuildVisitsForSqlite(true);
            DB::table('visits')->where('status', 'in_consultation')->update(['status' => 'in_progress']);
        }
    }

    /**
     * SQLite cannot MODIFY columns, so rebuild the table around the data.
     * legacy_alter_table keeps RENAME TABLE from rewriting other tables'
     * foreign-key clauses to the temporary name.
     */
    private function rebuildVisitsForSqlite(bool $legacy = false): void
    {
        DB::statement('PRAGMA legacy_alter_table = ON');
        DB::statement('PRAGMA foreign_keys = OFF');
        DB::statement('ALTER TABLE visits RENAME TO visits_legacy');

        // Indexes travel with the renamed table under their old names; drop
        // the stragglers (auto-indexes excluded) so the fresh definition
        // below can own its index names.
        $stragglers = DB::select(
            "SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = 'visits_legacy' AND sql IS NOT NULL"
        );

        foreach ($stragglers as $straggler) {
            DB::statement("DROP INDEX IF EXISTS \"{$straggler->name}\"");
        }

        Schema::create('visits', function (Blueprint $table) use ($legacy) {
            $table->id();
            $table->string('visit_number')->unique();
            $table->foreignId('patient_id')->constrained()->cascadeOnDelete();
            $table->foreignId('doctor_id')->nullable(!$legacy)->constrained()->nullOnDelete();
            $table->foreignId('appointment_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('department_id')->nullable()->constrained()->nullOnDelete();
            $table->date('visit_date');
            $table->enum('type', ['opd', 'emergency', 'follow_up'])->default('opd');

            if ($legacy) {
                $table->enum('status', ['in_progress', 'completed'])->default('in_progress');
            } else {
                $table->string('priority', 20)->default('normal');
                $table->string('status', 40)->default('registered');
            }

            $table->text('chief_complaint')->nullable();
            $table->text('symptoms')->nullable();

            if (! $legacy) {
                $table->string('symptom_duration', 100)->nullable();
                $table->string('severity', 20)->nullable();
                $table->text('previous_conditions')->nullable();
                $table->text('current_medications')->nullable();
                $table->text('intake_notes')->nullable();
            }

            $table->text('diagnosis')->nullable();
            $table->text('treatment')->nullable();
            $table->text('medical_notes')->nullable();
            $table->date('follow_up_date')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();

            if (! $legacy) {
                $table->foreignId('referred_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamp('referred_at')->nullable();
                $table->index('status');
                $table->index(['patient_id', 'status']);
            }

            $table->timestamps();
        });

        $status = $legacy ? 'status' : "CASE status WHEN 'in_progress' THEN 'in_consultation' WHEN 'completed' THEN 'visit_completed' ELSE status END";

        DB::statement(
            'INSERT INTO visits (id, visit_number, patient_id, doctor_id, appointment_id, department_id, visit_date, type, chief_complaint, symptoms, diagnosis, treatment, medical_notes, follow_up_date, status, created_by, created_at, updated_at) '.
            "SELECT id, visit_number, patient_id, doctor_id, appointment_id, department_id, visit_date, type, chief_complaint, symptoms, diagnosis, treatment, medical_notes, follow_up_date, {$status}, created_by, created_at, updated_at FROM visits_legacy"
        );
        DB::statement('DROP TABLE visits_legacy');
        DB::statement('PRAGMA foreign_keys = ON');
        DB::statement('PRAGMA legacy_alter_table = OFF');
    }
};
