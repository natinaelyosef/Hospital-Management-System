<?php

namespace Tests\Feature;

use App\Models\Department;
use App\Models\Doctor;
use App\Models\Invoice;
use App\Models\LabTest;
use App\Models\Medicine;
use App\Models\MedicineBatch;
use App\Models\Patient;
use App\Models\Prescription;
use App\Models\Role;
use App\Models\User;
use App\Models\Visit;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Guards the smooth handoffs: intake routing in one sitting, a single lab
 * review click, the pharmacy stage never being dropped, and payment approval
 * being an explicit accountant decision before anything is dispensed.
 */
class SmoothHandoffTest extends TestCase
{
    use RefreshDatabase;

    private const CASHIER_PERMISSION = 'billing.payment.manage';

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);

        Department::create(['name' => 'Cardiology', 'code' => 'CARD', 'description' => 'Heart and cardiovascular care']);
    }

    private function makeUser(string $role): User
    {
        return User::query()->create([
            'name' => ucfirst(str_replace('_', ' ', $role)).' Tester',
            'email' => $role.'-'.uniqid().'@example.test',
            'password' => 'secret123',
            'role_id' => Role::query()->where('name', $role)->firstOrFail()->id,
            'status' => User::STATUS_ACTIVE,
            'is_active' => true,
        ]);
    }

    private function makeDoctor(): array
    {
        $user = $this->makeUser('doctor');
        $doctor = Doctor::query()->create([
            'user_id' => $user->id,
            'department_id' => Department::where('code', 'CARD')->value('id'),
            'license_number' => 'LIC-'.uniqid(),
            'specialization' => 'Cardiology',
            'consultation_fee' => 500,
            'is_active' => true,
        ]);

        return [$user, $doctor];
    }

    private function makePatient(string $phone): Patient
    {
        static $sequence = 0;
        $sequence++;

        return Patient::query()->create([
            'patient_number' => sprintf('P-2026-%06d', 800000 + $sequence),
            'first_name' => 'Handoff',
            'last_name' => 'Patient '.$sequence,
            'gender' => 'male',
            'date_of_birth' => '1985-03-03',
            'phone' => $phone,
        ]);
    }

    /**
     * Drive a case all the way to `in_consultation` with a doctor attached.
     *
     * @return array{0: int, 1: User} [visitId, doctorUser]
     */
    private function openConsultation(string $phone): array
    {
        $receptionist = $this->makeUser('receptionist');
        $nurse = $this->makeUser('nurse');
        [$doctorUser, $doctor] = $this->makeDoctor();
        $patient = $this->makePatient($phone);

        $visitId = $this->actingAs($receptionist, 'sanctum')->postJson('/api/visits/intake', [
            'patient_id' => $patient->id,
            'type' => 'opd',
            'chief_complaint' => 'Chest pain and shortness of breath',
        ])->assertStatus(201)->json('data.visit.id');

        $this->actingAs($receptionist, 'sanctum')->postJson("/api/visits/{$visitId}/refer", [
            'department_id' => Department::where('code', 'CARD')->value('id'),
            'doctor_id' => $doctor->id,
        ])->assertOk();

        $this->actingAs($nurse, 'sanctum')->postJson("/api/visits/{$visitId}/start-triage")->assertOk();
        $this->actingAs($nurse, 'sanctum')->postJson("/api/visits/{$visitId}/vitals", ['pulse' => 80])->assertOk();
        $this->actingAs($nurse, 'sanctum')->postJson("/api/visits/{$visitId}/complete-triage")->assertOk();
        $this->actingAs($doctorUser, 'sanctum')->postJson("/api/visits/{$visitId}/start-consultation")->assertOk();

        return [$visitId, $doctorUser];
    }

    public function test_lab_review_returns_the_case_straight_to_the_consultation(): void
    {
        [$visitId, $doctorUser] = $this->openConsultation('+251900000101');
        $patientId = Visit::findOrFail($visitId)->patient_id;

        $test = LabTest::create([
            'name' => 'Troponin', 'code' => 'TROP', 'category' => 'Cardiac', 'price' => 250, 'is_active' => true,
        ]);

        $labId = $this->actingAs($doctorUser, 'sanctum')->postJson('/api/lab-requests', [
            'patient_id' => $patientId,
            'visit_id' => $visitId,
            'test_ids' => [$test->id],
        ])->assertOk()->json('data.id');

        $this->assertSame('lab_requested', Visit::findOrFail($visitId)->status);

        $this->actingAs($this->makeUser('lab_technician'), 'sanctum')
            ->postJson("/api/lab-requests/{$labId}/start")->assertOk();
        $this->assertSame('lab_in_progress', Visit::findOrFail($visitId)->status);

        $this->actingAs($this->makeUser('lab_technician'), 'sanctum')
            ->postJson("/api/lab-requests/{$labId}/results", [
                'results' => [['lab_test_id' => $test->id, 'result_value' => 'Elevated', 'unit' => 'ng/L']],
            ])->assertOk();
        $this->assertSame('lab_completed', Visit::findOrFail($visitId)->status);

        // One click, not two: no forced "start consultation" in between.
        $this->actingAs($doctorUser, 'sanctum')
            ->postJson("/api/visits/{$visitId}/lab-reviewed", ['note' => 'Troponin elevated.'])
            ->assertOk()
            ->assertJsonPath('data.status', 'in_consultation');
    }

    public function test_a_second_lab_round_can_be_ordered_without_reopening_the_consultation(): void
    {
        [$visitId, $doctorUser] = $this->openConsultation('+251900000102');
        $patientId = Visit::findOrFail($visitId)->patient_id;

        $first = LabTest::create(['name' => 'CBC', 'code' => 'CBC', 'category' => 'Hematology', 'price' => 150, 'is_active' => true]);
        $second = LabTest::create(['name' => 'ECG', 'code' => 'ECG', 'category' => 'Cardiac', 'price' => 180, 'is_active' => true]);

        $labId = $this->actingAs($doctorUser, 'sanctum')->postJson('/api/lab-requests', [
            'patient_id' => $patientId,
            'visit_id' => $visitId,
            'test_ids' => [$first->id],
        ])->assertOk()->json('data.id');

        $labTech = $this->makeUser('lab_technician');
        $this->actingAs($labTech, 'sanctum')->postJson("/api/lab-requests/{$labId}/start")->assertOk();
        $this->actingAs($labTech, 'sanctum')->postJson("/api/lab-requests/{$labId}/results", [
            'results' => [['lab_test_id' => $first->id, 'result_value' => 'Normal']],
        ])->assertOk();

        $this->actingAs($doctorUser, 'sanctum')->postJson("/api/visits/{$visitId}/lab-reviewed")->assertOk();

        // A further round is accepted immediately — the case re-enters the lab
        // stage instead of silently staying at lab_completed.
        $this->actingAs($doctorUser, 'sanctum')->postJson('/api/lab-requests', [
            'patient_id' => $patientId,
            'visit_id' => $visitId,
            'test_ids' => [$second->id],
        ])->assertOk();

        $this->assertSame('lab_requested', Visit::findOrFail($visitId)->status);
    }

    public function test_preparing_the_bill_records_the_pharmacy_stage_before_the_billing_stage(): void
    {
        [$visitId, $doctorUser] = $this->openConsultation('+251900000103');
        $patientId = Visit::findOrFail($visitId)->patient_id;

        $medicine = Medicine::create([
            'name' => 'Aspirin', 'form' => 'tablet', 'strength' => '81mg', 'unit' => 'tablet',
            'stock_quantity' => 50, 'reorder_level' => 10, 'selling_price' => 4.5, 'is_active' => true,
        ]);
        MedicineBatch::create([
            'medicine_id' => $medicine->id, 'batch_number' => 'B-1',
            'expiry_date' => now()->addYear()->toDateString(),
            'quantity_received' => 50, 'quantity_available' => 50, 'purchase_price' => 2,
        ]);

        $rxId = $this->actingAs($doctorUser, 'sanctum')->postJson('/api/prescriptions', [
            'patient_id' => $patientId,
            'visit_id' => $visitId,
            'diagnosis' => 'Angina',
            'items' => [[
                'medicine_id' => $medicine->id, 'dosage' => '81mg',
                'frequency' => '1x/day', 'duration' => '30 days', 'quantity' => 30,
            ]],
        ])->assertOk()->json('data.id');

        $this->assertSame('prescription_created', Visit::findOrFail($visitId)->status);

        $pharmacist = $this->makeUser('pharmacist');
        $this->actingAs($pharmacist, 'sanctum')->postJson("/api/prescriptions/{$rxId}/invoice")->assertOk();

        // The pharmacy stage must not be swallowed by the monotonic advance.
        $this->assertSame('payment_required', Visit::findOrFail($visitId)->status);
        $this->assertSame('processing', Prescription::findOrFail($rxId)->status);

        $stages = array_column(
            $this->actingAs($pharmacist, 'sanctum')
                ->getJson("/api/visits/{$visitId}/timeline")
                ->assertOk()->json('data'),
            'to',
        );

        $this->assertContains('prescription_created', $stages);
        $this->assertContains('pharmacy_processing', $stages, 'The pharmacy stage must appear in the journey history.');
        $this->assertContains('payment_required', $stages);
        $this->assertLessThan(
            array_search('payment_required', $stages, true),
            array_search('pharmacy_processing', $stages, true),
            'Pharmacy must be recorded before billing.'
        );
    }

    public function test_dispensing_requires_an_explicit_accountant_approval(): void
    {
        [$visitId, $doctorUser] = $this->openConsultation('+251900000104');
        $patientId = Visit::findOrFail($visitId)->patient_id;

        $medicine = Medicine::create([
            'name' => 'Metformin', 'form' => 'tablet', 'strength' => '500mg', 'unit' => 'tablet',
            'stock_quantity' => 200, 'reorder_level' => 10, 'selling_price' => 3, 'is_active' => true,
        ]);
        MedicineBatch::create([
            'medicine_id' => $medicine->id, 'batch_number' => 'B-2',
            'expiry_date' => now()->addYear()->toDateString(),
            'quantity_received' => 200, 'quantity_available' => 200, 'purchase_price' => 1,
        ]);

        $rxId = $this->actingAs($doctorUser, 'sanctum')->postJson('/api/prescriptions', [
            'patient_id' => $patientId,
            'visit_id' => $visitId,
            'diagnosis' => 'Diabetes',
            'items' => [[
                'medicine_id' => $medicine->id, 'dosage' => '500mg',
                'frequency' => '2x/day', 'duration' => '30 days', 'quantity' => 60,
            ]],
        ])->assertOk()->json('data.id');

        $pharmacist = $this->makeUser('pharmacist');
        $accountant = $this->makeUser('accountant');

        $invoiceId = $this->actingAs($pharmacist, 'sanctum')
            ->postJson("/api/prescriptions/{$rxId}/invoice")
            ->assertOk()->json('data.id');

        $invoice = Invoice::findOrFail($invoiceId);
        $this->assertGreaterThan(0, $invoice->total);

        // Before any cash: the UI is told which invoice and balance block it.
        $this->actingAs($pharmacist, 'sanctum')
            ->getJson("/api/prescriptions/{$rxId}")
            ->assertOk()
            ->assertJsonPath('data.payment_approved', false)
            ->assertJsonPath('data.outstanding_invoice.id', $invoiceId)
            ->assertJsonPath('data.outstanding_invoice.balance', fn ($v) => abs((float) $v - (float) $invoice->total) < 0.01);

        // No bill settled: dispensing is blocked.
        $this->actingAs($pharmacist, 'sanctum')
            ->putJson("/api/prescriptions/{$rxId}/status", ['status' => 'dispensed'])
            ->assertStatus(422);
        $this->assertSame(200, (int) $medicine->fresh()->stock_quantity);

        // Cash received, but nobody has approved it yet.
        $this->actingAs($accountant, 'sanctum')->postJson("/api/invoices/{$invoiceId}/payments", [
            'amount' => (float) $invoice->total,
            'method' => 'cash',
        ])->assertOk();

        $this->assertSame('paid', $invoice->fresh()->status);
        $this->assertFalse($invoice->fresh()->isApproved());
        $this->assertSame('payment_required', Visit::findOrFail($visitId)->status);
        $this->actingAs($pharmacist, 'sanctum')
            ->putJson("/api/prescriptions/{$rxId}/status", ['status' => 'dispensed'])
            ->assertStatus(422);

        // The API advertises the gate so the UI can explain it.
        $this->actingAs($pharmacist, 'sanctum')
            ->getJson("/api/prescriptions/{$rxId}")
            ->assertOk()
            ->assertJsonPath('data.payment_approved', false)
            ->assertJsonPath('data.approved_invoice', null);

        // Only the accountant may approve.
        $this->actingAs($pharmacist, 'sanctum')
            ->postJson("/api/invoices/{$invoiceId}/approve")
            ->assertStatus(403);

        $this->actingAs($accountant, 'sanctum')
            ->postJson("/api/invoices/{$invoiceId}/approve", ['notes' => 'Cash counted.'])
            ->assertOk()
            ->assertJsonPath('data.is_approved', true)
            ->assertJsonPath('data.approved_by_name', $accountant->name);

        $this->assertSame('payment_approved', Visit::findOrFail($visitId)->status);

        $this->actingAs($pharmacist, 'sanctum')
            ->getJson("/api/prescriptions/{$rxId}")
            ->assertOk()
            ->assertJsonPath('data.payment_approved', true);

        $this->actingAs($pharmacist, 'sanctum')
            ->putJson("/api/prescriptions/{$rxId}/status", ['status' => 'dispensed'])
            ->assertOk();

        $this->assertSame('medication_dispensed', Visit::findOrFail($visitId)->status);
        $this->assertSame(140, (int) $medicine->fresh()->stock_quantity);

        // Approval is a single decision, not repeatable.
        $this->actingAs($accountant, 'sanctum')
            ->postJson("/api/invoices/{$invoiceId}/approve")
            ->assertStatus(422);
    }

    public function test_approval_is_refused_while_a_balance_is_outstanding(): void
    {
        [$visitId, $doctorUser] = $this->openConsultation('+251900000105');
        $patientId = Visit::findOrFail($visitId)->patient_id;

        $medicine = Medicine::create([
            'name' => 'Atorvastatin', 'form' => 'tablet', 'strength' => '20mg', 'unit' => 'tablet',
            'stock_quantity' => 100, 'reorder_level' => 10, 'selling_price' => 12, 'is_active' => true,
        ]);

        $rxId = $this->actingAs($doctorUser, 'sanctum')->postJson('/api/prescriptions', [
            'patient_id' => $patientId,
            'visit_id' => $visitId,
            'diagnosis' => 'Hyperlipidaemia',
            'items' => [[
                'medicine_id' => $medicine->id, 'dosage' => '20mg',
                'frequency' => '1x/day', 'duration' => '30 days', 'quantity' => 30,
            ]],
        ])->assertOk()->json('data.id');

        $pharmacist = $this->makeUser('pharmacist');
        $accountant = $this->makeUser('accountant');

        $invoiceId = $this->actingAs($pharmacist, 'sanctum')
            ->postJson("/api/prescriptions/{$rxId}/invoice")
            ->assertOk()->json('data.id');

        $invoice = Invoice::findOrFail($invoiceId);

        // Part payment is recorded but cannot be approved.
        $this->actingAs($accountant, 'sanctum')->postJson("/api/invoices/{$invoiceId}/payments", [
            'amount' => 10,
            'method' => 'cash',
        ])->assertOk();

        $this->assertSame('partial', $invoice->fresh()->status);
        $this->actingAs($accountant, 'sanctum')
            ->postJson("/api/invoices/{$invoiceId}/approve")
            ->assertStatus(422)
            ->assertJsonPath('message', fn (string $m) => str_contains($m, 'outstanding balance'));

        $this->assertFalse($invoice->fresh()->isApproved());
        $this->assertSame('payment_required', Visit::findOrFail($visitId)->status);
    }

    public function test_a_walk_in_prescription_cannot_bypass_the_payment_gate(): void
    {
        [$doctorUser] = $this->makeDoctor();
        $patient = $this->makePatient('+251900000106');

        $medicine = Medicine::create([
            'name' => 'Paracetamol', 'form' => 'tablet', 'strength' => '500mg', 'unit' => 'tablet',
            'stock_quantity' => 300, 'reorder_level' => 10, 'selling_price' => 2, 'is_active' => true,
        ]);
        MedicineBatch::create([
            'medicine_id' => $medicine->id, 'batch_number' => 'B-3',
            'expiry_date' => now()->addYear()->toDateString(),
            'quantity_received' => 300, 'quantity_available' => 300, 'purchase_price' => 0.5,
        ]);

        // No visit_id: there is no case, and therefore no bill to gate on.
        $rxId = $this->actingAs($doctorUser, 'sanctum')->postJson('/api/prescriptions', [
            'patient_id' => $patient->id,
            'diagnosis' => 'Headache',
            'items' => [[
                'medicine_id' => $medicine->id, 'dosage' => '500mg',
                'frequency' => '3x/day', 'duration' => '5 days', 'quantity' => 15,
            ]],
        ])->assertOk()->json('data.id');

        $pharmacist = $this->makeUser('pharmacist');

        $this->actingAs($pharmacist, 'sanctum')
            ->putJson("/api/prescriptions/{$rxId}/status", ['status' => 'dispensed'])
            ->assertStatus(422)
            ->assertJsonPath('message', fn (string $m) => str_contains($m, 'No approved payment found'));

        $this->assertSame(300, (int) $medicine->fresh()->stock_quantity);

        // Preparing a bill for it and approving the cash unblocks dispensing.
        $invoiceId = $this->actingAs($pharmacist, 'sanctum')
            ->postJson("/api/prescriptions/{$rxId}/invoice")
            ->assertOk()->json('data.id');

        $accountant = $this->makeUser('accountant');
        $invoice = Invoice::findOrFail($invoiceId);

        $this->actingAs($accountant, 'sanctum')->postJson("/api/invoices/{$invoiceId}/payments", [
            'amount' => (float) $invoice->total,
            'method' => 'cash',
        ])->assertOk();
        $this->actingAs($accountant, 'sanctum')->postJson("/api/invoices/{$invoiceId}/approve")->assertOk();

        $this->actingAs($pharmacist, 'sanctum')
            ->putJson("/api/prescriptions/{$rxId}/status", ['status' => 'dispensed'])
            ->assertOk();

        $this->assertSame(285, (int) $medicine->fresh()->stock_quantity);
    }

    public function test_a_zero_cost_bill_is_approved_automatically(): void
    {
        [$visitId, $doctorUser] = $this->openConsultation('+251900000107');
        $patientId = Visit::findOrFail($visitId)->patient_id;

        $medicine = Medicine::create([
            'name' => 'Vitamin C', 'form' => 'tablet', 'strength' => '100mg', 'unit' => 'tablet',
            'stock_quantity' => 100, 'reorder_level' => 10, 'selling_price' => 0, 'is_active' => true,
        ]);
        MedicineBatch::create([
            'medicine_id' => $medicine->id, 'batch_number' => 'B-4',
            'expiry_date' => now()->addYear()->toDateString(),
            'quantity_received' => 100, 'quantity_available' => 100, 'purchase_price' => 0,
        ]);

        $rxId = $this->actingAs($doctorUser, 'sanctum')->postJson('/api/prescriptions', [
            'patient_id' => $patientId,
            'visit_id' => $visitId,
            'diagnosis' => 'Dietary supplement',
            'items' => [[
                'medicine_id' => $medicine->id, 'dosage' => '100mg',
                'frequency' => '1x/day', 'duration' => '10 days', 'quantity' => 10,
            ]],
        ])->assertOk()->json('data.id');

        $pharmacist = $this->makeUser('pharmacist');
        $invoiceId = $this->actingAs($pharmacist, 'sanctum')
            ->postJson("/api/prescriptions/{$rxId}/invoice")
            ->assertOk()->json('data.id');

        $invoice = Invoice::findOrFail($invoiceId);
        $this->assertSame(0.0, (float) $invoice->total);
        $this->assertTrue($invoice->isApproved(), 'A free prescription must not stall waiting for an accountant.');
        $this->assertSame('payment_approved', Visit::findOrFail($visitId)->status);

        $this->actingAs($pharmacist, 'sanctum')
            ->putJson("/api/prescriptions/{$rxId}/status", ['status' => 'dispensed'])
            ->assertOk();
    }

    public function test_accountant_queue_surfaces_the_approval_step(): void
    {
        $accountant = $this->makeUser('accountant');

        $visitId = Visit::query()->create([
            'visit_number' => 'VST-2026-999001',
            'patient_id' => $this->makePatient('+251900000108')->id,
            'visit_date' => today()->toDateString(),
            'type' => 'opd',
            'chief_complaint' => 'Headache',
            'status' => 'in_consultation',
        ])->id;

        Invoice::query()->create([
            'invoice_number' => 'INV-2026-999001',
            'patient_id' => Visit::findOrFail($visitId)->patient_id,
            'visit_id' => $visitId,
            'sub_total' => 100, 'total' => 100, 'paid_amount' => 100,
            'status' => 'paid', 'paid_at' => now(),
        ]);

        $tasks = collect($this->actingAs($accountant, 'sanctum')
            ->getJson('/api/workflow/summary')
            ->assertOk()->json('data'))
            ->keyBy('key');

        $this->assertTrue($tasks->has('pay_approve'), 'The accountant must see invoices awaiting their approval.');
        $this->assertSame(1, $tasks->get('pay_approve')['count']);
    }

    public function test_only_the_accountant_role_holds_the_approval_permission(): void
    {
        $this->assertTrue(
            Role::query()->where('name', 'accountant')->firstOrFail()
                ->permissions()->where('name', 'billing.payment.approve')->exists()
        );

        foreach (['pharmacist', 'receptionist', 'nurse', 'lab_technician', 'doctor', 'patient'] as $role) {
            $this->assertFalse(
                Role::query()->where('name', $role)->firstOrFail()
                    ->permissions()->where('name', 'billing.payment.approve')->exists(),
                "{$role} must not be able to approve payments."
            );
        }
    }
}
