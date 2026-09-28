<?php

namespace Tests\Feature;

use App\Models\Doctor;
use App\Models\Invoice;
use App\Models\LabRequest;
use App\Models\Patient;
use App\Models\Prescription;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PatientPortalScopingTest extends TestCase
{
    use RefreshDatabase;

    private Patient $owner;
    private Patient $stranger;
    private User $portalUser;
    private User $staffUser;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);

        $this->owner = $this->makePatient('Own', 'Portal');
        $this->stranger = $this->makePatient('Other', 'Patient');

        $patientRole = Role::query()->where('name', 'patient')->firstOrFail();

        $this->portalUser = User::query()->create([
            'name' => 'Own Portal',
            'email' => 'portal-'.uniqid().'@example.test',
            'password' => 'secret123',
            'role_id' => $patientRole->id,
            'is_active' => true,
        ]);
        $this->owner->update(['user_id' => $this->portalUser->id]);

        $this->staffUser = User::query()->create([
            'name' => 'Billing Staff',
            'email' => 'staff-'.uniqid().'@example.test',
            'password' => 'secret123',
            'role_id' => Role::query()->where('name', 'accountant')->firstOrFail()->id,
            'is_active' => true,
        ]);
    }

    public function test_portal_user_sees_only_their_own_invoices(): void
    {
        $own = $this->makeInvoice($this->owner, 'INV-OWN-1');
        $this->makeInvoice($this->owner, 'INV-OWN-2');
        $other = $this->makeInvoice($this->stranger, 'INV-OTHER-1');

        $response = $this->actingAs($this->portalUser, 'sanctum')
            ->getJson('/api/invoices?per_page=50')
            ->assertStatus(200);

        $this->assertSame(2, $response->json('meta.total'));

        foreach ($response->json('data') as $row) {
            $this->assertSame($this->owner->id, $row['patient']['id']);
        }

        $this->actingAs($this->portalUser, 'sanctum')
            ->getJson('/api/invoices/'.$own->id)
            ->assertStatus(200);

        // Direct fetch of someone else's invoice is refused.
        $this->actingAs($this->portalUser, 'sanctum')
            ->getJson('/api/invoices/'.$other->id)
            ->assertStatus(403);

        $this->actingAs($this->portalUser, 'sanctum')
            ->getJson('/api/invoices/'.$own->id.'/pdf')
            ->assertStatus(200);
        $this->actingAs($this->portalUser, 'sanctum')
            ->getJson('/api/invoices/'.$other->id.'/pdf')
            ->assertStatus(403);
    }

    public function test_staff_sees_every_invoice(): void
    {
        $this->makeInvoice($this->owner, 'INV-STAFF-1');
        $this->makeInvoice($this->stranger, 'INV-STAFF-2');

        $this->actingAs($this->staffUser, 'sanctum')
            ->getJson('/api/invoices?per_page=50')
            ->assertStatus(200)
            ->assertJsonPath('meta.total', 2);
    }

    public function test_portal_user_sees_only_their_own_lab_requests(): void
    {
        $own = $this->makeLabRequest($this->owner, 'LAB-OWN-1');
        $other = $this->makeLabRequest($this->stranger, 'LAB-OTHER-1');

        $this->actingAs($this->portalUser, 'sanctum')
            ->getJson('/api/lab-requests?per_page=50')
            ->assertStatus(200)
            ->assertJsonPath('meta.total', 1);

        $this->actingAs($this->portalUser, 'sanctum')
            ->getJson('/api/lab-requests/'.$own->id)
            ->assertStatus(200);

        $this->actingAs($this->portalUser, 'sanctum')
            ->getJson('/api/lab-requests/'.$other->id)
            ->assertStatus(403);
    }

    public function test_portal_user_sees_only_their_own_appointments_and_prescriptions(): void
    {
        $doctorUser = User::query()->create([
            'name' => 'Portal Doctor',
            'email' => 'pdoc-'.uniqid().'@example.test',
            'password' => 'secret123',
            'role_id' => Role::query()->where('name', 'doctor')->firstOrFail()->id,
            'is_active' => true,
        ]);

        $doctor = Doctor::query()->create([
            'user_id' => $doctorUser->id,
            'license_number' => 'LIC-PORTAL-1',
            'specialization' => 'Cardiology',
            'consultation_fee' => 500,
            'is_active' => true,
        ]);

        \App\Models\Appointment::query()->create([
            'appointment_number' => 'APT-PORTAL-1',
            'patient_id' => $this->owner->id,
            'doctor_id' => $doctor->id,
            'appointment_date' => now()->toDateString(),
            'start_time' => '09:00',
            'end_time' => '09:30',
            'type' => 'opd',
            'status' => 'pending',
        ]);

        \App\Models\Appointment::query()->create([
            'appointment_number' => 'APT-PORTAL-2',
            'patient_id' => $this->stranger->id,
            'doctor_id' => $doctor->id,
            'appointment_date' => now()->toDateString(),
            'start_time' => '10:00',
            'end_time' => '10:30',
            'type' => 'opd',
            'status' => 'pending',
        ]);

        Prescription::query()->create([
            'prescription_number' => 'RX-PORTAL-1',
            'patient_id' => $this->owner->id,
            'doctor_id' => $doctor->id,
            'status' => 'pending',
        ]);

        Prescription::query()->create([
            'prescription_number' => 'RX-PORTAL-2',
            'patient_id' => $this->stranger->id,
            'doctor_id' => $doctor->id,
            'status' => 'pending',
        ]);

        $this->actingAs($this->portalUser, 'sanctum')
            ->getJson('/api/appointments?per_page=50')
            ->assertStatus(200)
            ->assertJsonPath('meta.total', 1);

        $this->actingAs($this->portalUser, 'sanctum')
            ->getJson('/api/prescriptions?per_page=50')
            ->assertStatus(200)
            ->assertJsonPath('meta.total', 1);
    }

    public function test_portal_user_billing_summary_is_self_scoped(): void
    {
        $this->makeInvoice($this->owner, 'INV-SUM-OWN', total: 1000);
        $this->makeInvoice($this->stranger, 'INV-SUM-OTHER', total: 99999);

        $response = $this->actingAs($this->portalUser, 'sanctum')
            ->getJson('/api/billing/summary')
            ->assertStatus(200);

        // Only the caller's 1000 invoice counts; the stranger's 99999 must not leak.
        $this->assertSame(1000.0, (float) $response->json('data.outstanding'));
    }

    public function test_portal_user_cannot_list_other_patients(): void
    {
        $this->actingAs($this->portalUser, 'sanctum')
            ->getJson('/api/patients?per_page=50')
            ->assertStatus(200)
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.id', $this->owner->id);
    }

    private function makePatient(string $first, string $last): Patient
    {
        static $sequence = 0;
        $sequence++;

        return Patient::query()->create([
            'patient_number' => sprintf('P-2026-%06d', 900000 + $sequence),
            'first_name' => $first,
            'last_name' => $last,
            'gender' => 'female',
            'date_of_birth' => '1992-03-04',
            'phone' => '+251900000'.str_pad((string) $sequence, 3, '0', STR_PAD_LEFT),
        ]);
    }

    private function makeInvoice(Patient $patient, string $number, float $total = 500): Invoice
    {
        return Invoice::query()->create([
            'invoice_number' => $number,
            'patient_id' => $patient->id,
            'sub_total' => $total,
            'discount' => 0,
            'tax' => 0,
            'total' => $total,
            'paid_amount' => 0,
            'status' => 'unpaid',
        ]);
    }

    private function makeLabRequest(Patient $patient, string $number): LabRequest
    {
        return LabRequest::query()->create([
            'request_number' => $number,
            'patient_id' => $patient->id,
            'priority' => 'routine',
            'status' => 'requested',
            'requested_at' => now(),
        ]);
    }
}
