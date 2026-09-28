<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\Doctor;
use App\Models\Patient;
use App\Models\Prescription;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RbacTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);
    }

    private function userFor(string $role): User
    {
        $roleName = Role::query()->where('name', $role)->firstOrFail();

        return User::query()->create([
            'name' => ucfirst($role).' Tester',
            'email' => $role.'-'.uniqid().'@example.test',
            'password' => 'secret123',
            'role_id' => $roleName->id,
            'is_active' => true,
        ]);
    }

    public function test_unauthenticated_request_is_rejected(): void
    {
        $this->getJson('/api/patients')->assertStatus(401);
        $this->postJson('/api/patients')->assertStatus(401);
    }

    public function test_admin_passes_every_permission_gate(): void
    {
        $admin = $this->userFor('admin');

        foreach (['/api/patients', '/api/medicines', '/api/invoices', '/api/wards', '/api/lab-requests', '/api/users', '/api/reports/revenue', '/api/audit-logs'] as $uri) {
            $this->actingAs($admin, 'sanctum')
                ->getJson($uri)
                ->assertStatus(200);
        }
    }

    public function test_receptionist_can_read_patients_but_not_pharmacy(): void
    {
        $receptionist = $this->userFor('receptionist');

        $this->actingAs($receptionist, 'sanctum')->getJson('/api/patients')->assertStatus(200);
        $this->actingAs($receptionist, 'sanctum')->getJson('/api/invoices')->assertStatus(200);
        $this->actingAs($receptionist, 'sanctum')->getJson('/api/medicines')->assertStatus(403);
        $this->actingAs($receptionist, 'sanctum')->getJson('/api/wards')->assertStatus(403);
        $this->actingAs($receptionist, 'sanctum')->getJson('/api/users')->assertStatus(403);
    }

    public function test_nurse_can_open_wards_but_not_billing_or_reports(): void
    {
        $nurse = $this->userFor('nurse');

        $this->actingAs($nurse, 'sanctum')->getJson('/api/wards')->assertStatus(200);
        $this->actingAs($nurse, 'sanctum')->getJson('/api/patients')->assertStatus(200);
        $this->actingAs($nurse, 'sanctum')->getJson('/api/invoices')->assertStatus(403);
        $this->actingAs($nurse, 'sanctum')->getJson('/api/reports/revenue')->assertStatus(403);
    }

    public function test_pharmacist_can_read_stock_but_not_reports(): void
    {
        $pharmacist = $this->userFor('pharmacist');

        $this->actingAs($pharmacist, 'sanctum')->getJson('/api/medicines')->assertStatus(200);
        $this->actingAs($pharmacist, 'sanctum')->getJson('/api/prescriptions/pending')->assertStatus(200);
        $this->actingAs($pharmacist, 'sanctum')->getJson('/api/reports/revenue')->assertStatus(403);
    }

    public function test_writes_respect_their_own_permission(): void
    {
        $receptionist = $this->userFor('receptionist');

        // receptionist holds patients.create and patients.delete
        $this->actingAs($receptionist, 'sanctum')
            ->postJson('/api/patients', [
                'first_name' => 'RBAC',
                'last_name' => 'Case',
                'gender' => 'male',
                'date_of_birth' => '1990-01-01',
                'phone' => '+251900000002',
            ])
            ->assertStatus(200);

        $patient = Patient::query()->where('first_name', 'RBAC')->firstOrFail();

        // a doctor holds patients.view only, so deleting is refused
        $this->actingAs($this->userFor('doctor'), 'sanctum')
            ->deleteJson("/api/patients/{$patient->id}")
            ->assertStatus(403);

        $this->actingAs($receptionist, 'sanctum')
            ->deleteJson("/api/patients/{$patient->id}")
            ->assertStatus(200);
    }

    public function test_appointment_status_requires_appointments_edit(): void
    {
        [$patient, $doctor] = $this->makePatientAndDoctor();

        $appointment = Appointment::query()->create([
            'appointment_number' => 'APT-2026-000001',
            'patient_id' => $patient->id,
            'doctor_id' => $doctor->id,
            'appointment_date' => now()->toDateString(),
            'start_time' => '09:00',
            'end_time' => '09:30',
            'type' => 'opd',
            'status' => 'pending',
        ]);

        // nurse holds appointments.view only — no status writes
        $this->actingAs($this->userFor('nurse'), 'sanctum')
            ->putJson("/api/appointments/{$appointment->id}/status", ['status' => 'confirmed'])
            ->assertStatus(403);

        $this->actingAs($this->userFor('receptionist'), 'sanctum')
            ->putJson("/api/appointments/{$appointment->id}/status", ['status' => 'confirmed'])
            ->assertStatus(200);

        $this->assertSame('confirmed', $appointment->fresh()->status);
    }

    public function test_only_dispensers_can_mark_a_prescription_dispensed(): void
    {
        [$patient, $doctor] = $this->makePatientAndDoctor();

        $prescription = Prescription::query()->create([
            'prescription_number' => 'RX-2026-000001',
            'patient_id' => $patient->id,
            'doctor_id' => $doctor->id,
            'status' => 'pending',
        ]);

        // A doctor may hold prescriptions.create but never prescriptions.dispense.
        $this->actingAs($doctor->user, 'sanctum')
            ->putJson("/api/prescriptions/{$prescription->id}/status", ['status' => 'dispensed'])
            ->assertStatus(403);

        $this->assertSame('pending', $prescription->fresh()->status);
    }

    /**
     * @return array{0: Patient, 1: Doctor}
     */
    private function makePatientAndDoctor(): array
    {
        $patient = Patient::query()->create([
            'patient_number' => 'P-2026-000001',
            'first_name' => 'Dispense',
            'last_name' => 'Target',
            'gender' => 'female',
            'date_of_birth' => '1991-02-02',
            'phone' => '+251900000003',
        ]);

        $doctor = Doctor::query()->create([
            'user_id' => $this->userFor('doctor')->id,
            'license_number' => 'LIC-RBAC-1',
            'specialization' => 'Cardiology',
            'consultation_fee' => 500,
            'is_active' => true,
        ]);

        return [$patient, $doctor];
    }
}
