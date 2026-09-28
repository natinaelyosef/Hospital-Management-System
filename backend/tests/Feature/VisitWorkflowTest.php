<?php

namespace Tests\Feature;

use App\Models\Department;
use App\Models\Doctor;
use App\Models\Invoice;
use App\Models\LabRequest;
use App\Models\LabTest;
use App\Models\Medicine;
use App\Models\MedicineBatch;
use App\Models\Patient;
use App\Models\Role;
use App\Models\User;
use App\Models\Visit;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class VisitWorkflowTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);

        Department::create(['name' => 'Cardiology', 'code' => 'CARD', 'description' => 'Heart and cardiovascular care']);
        Department::create(['name' => 'Internal Medicine', 'code' => 'IMED', 'description' => 'General medical services']);
        Department::create(['name' => 'Pediatrics', 'code' => 'PEDI', 'description' => 'Child health services']);
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

    private function makeDoctor(string $prefix = 'doc'): array
    {
        $user = $this->makeUser('doctor');
        $user->email = $prefix.'-'.uniqid().'@example.test';
        $user->save();

        $doctor = Doctor::query()->create([
            'user_id' => $user->id,
            'department_id' => Department::where('code', 'CARD')->value('id'),
            'license_number' => 'LIC-'.$prefix.'-'.uniqid(),
            'specialization' => 'Cardiology',
            'consultation_fee' => 500,
            'is_active' => true,
        ]);

        return [$user, $doctor];
    }

    private function makePatient(string $phone = '+251900000011'): Patient
    {
        static $sequence = 0;
        $sequence++;

        return Patient::query()->create([
            'patient_number' => sprintf('P-2026-%06d', 700000 + $sequence),
            'first_name' => 'Workflow',
            'last_name' => 'Patient '.$sequence,
            'gender' => 'female',
            'date_of_birth' => '1990-05-05',
            'phone' => $phone,
        ]);
    }

    private function recordIntake(User $receptionist, Patient $patient, array $overrides = []): array
    {
        $response = $this->actingAs($receptionist, 'sanctum')->postJson('/api/visits/intake', array_merge([
            'patient_id' => $patient->id,
            'type' => 'opd',
            'chief_complaint' => 'Chest pain and shortness of breath',
            'symptoms' => 'Chest discomfort, palpitations',
            'symptom_duration' => '3 days',
            'severity' => 'moderate',
        ], $overrides));

        $response->assertStatus(201);

        return [$response->json('data.visit.id'), $response];
    }

    public function test_full_handoff_from_intake_to_dispensing(): void
    {
        $receptionist = $this->makeUser('receptionist');
        $nurse = $this->makeUser('nurse');
        [$doctorUser, $doctor] = $this->makeDoctor();
        $labTech = $this->makeUser('lab_technician');
        $pharmacist = $this->makeUser('pharmacist');
        $accountant = $this->makeUser('accountant');
        $patient = $this->makePatient();

        // 1. Reception records the complaint; cardiology is suggested.
        [$visitId, $intake] = $this->recordIntake($receptionist, $patient);
        $intake->assertJsonPath('data.visit.status', 'intake_completed');
        $this->assertSame('CARD', $intake->json('data.suggested_departments.0.code'));

        // One active case per patient.
        $this->actingAs($receptionist, 'sanctum')->postJson('/api/visits/intake', [
            'patient_id' => $patient->id,
            'type' => 'opd',
            'chief_complaint' => 'Headache',
        ])->assertStatus(422);

        // 2. Reception routes to Cardiology with the doctor attached.
        $cardioId = Department::where('code', 'CARD')->value('id');

        $this->actingAs($receptionist, 'sanctum')->postJson("/api/visits/{$visitId}/refer", [
            'department_id' => $cardioId,
            'doctor_id' => $doctor->id,
            'priority' => 'urgent',
        ])->assertOk()->assertJsonPath('data.status', 'referred');

        $this->assertTrue(
            $nurse->notifications()->where('data->title', 'like', '%Cardiology%')->exists(),
            'The nurse inbox should hold the referral.'
        );

        // 3. Nurse triage requires vitals first.
        $this->actingAs($nurse, 'sanctum')
            ->postJson("/api/visits/{$visitId}/start-triage")
            ->assertOk()->assertJsonPath('data.status', 'waiting_for_nurse');

        $this->actingAs($nurse, 'sanctum')
            ->postJson("/api/visits/{$visitId}/complete-triage")
            ->assertStatus(422);

        $this->actingAs($nurse, 'sanctum')->postJson("/api/visits/{$visitId}/vitals", [
            'bp_systolic' => 130,
            'bp_diastolic' => 85,
            'temperature' => 37.2,
            'pulse' => 96,
        ])->assertOk();

        $this->actingAs($nurse, 'sanctum')
            ->postJson("/api/visits/{$visitId}/complete-triage", ['note' => 'Stable, tachycardic.'])
            ->assertOk()->assertJsonPath('data.status', 'waiting_for_doctor');

        $this->assertTrue(
            $doctorUser->notifications()->where('data->title', 'like', '%assessment completed%')->exists(),
            'The assigned doctor should be told the patient is ready.'
        );

        // 4. Only the assigned doctor opens the consultation.
        [$otherDoctorUser] = $this->makeDoctor('other');

        $this->actingAs($otherDoctorUser, 'sanctum')
            ->postJson("/api/visits/{$visitId}/start-consultation")
            ->assertStatus(403);

        $this->actingAs($nurse, 'sanctum')
            ->postJson("/api/visits/{$visitId}/start-consultation")
            ->assertStatus(403);

        $this->actingAs($doctorUser, 'sanctum')
            ->postJson("/api/visits/{$visitId}/start-consultation")
            ->assertOk()->assertJsonPath('data.status', 'in_consultation');

        // 5. Doctor orders labs; the case follows automatically.
        $test = LabTest::create([
            'name' => 'Complete Blood Count',
            'code' => 'CBC',
            'category' => 'Hematology',
            'price' => 150,
            'is_active' => true,
        ]);

        $labId = $this->actingAs($doctorUser, 'sanctum')->postJson('/api/lab-requests', [
            'patient_id' => $patient->id,
            'visit_id' => $visitId,
            'test_ids' => [$test->id],
            'priority' => 'urgent',
        ])->assertOk()->json('data.id');

        $this->assertSame('lab_requested', Visit::find($visitId)->status);
        $this->assertTrue($labTech->notifications()->where('data->title', 'like', '%laboratory request%')->exists());

        $this->actingAs($labTech, 'sanctum')->postJson("/api/lab-requests/{$labId}/start")->assertOk();
        $this->assertSame('lab_in_progress', Visit::find($visitId)->status);

        $this->actingAs($labTech, 'sanctum')->postJson("/api/lab-requests/{$labId}/results", [
            'results' => [[
                'lab_test_id' => $test->id,
                'result_value' => 'Normal',
                'reference_range' => '4.5-11.0',
                'unit' => 'x10^9/L',
            ]],
        ])->assertOk();

        $this->assertSame('lab_completed', Visit::find($visitId)->status);
        $this->assertTrue($doctorUser->notifications()->where('data->title', 'like', '%Laboratory result available%')->exists());

        // Reviewing results hands the case straight back to the consultation —
        // no second "start consultation" click, and a further round of tests
        // can be ordered from here.
        $this->actingAs($doctorUser, 'sanctum')
            ->postJson("/api/visits/{$visitId}/lab-reviewed", ['note' => 'CBC normal.'])
            ->assertOk()->assertJsonPath('data.status', 'in_consultation');

        $roundTwo = LabTest::create([
            'name' => 'Lipid Panel',
            'code' => 'LIPID',
            'category' => 'Biochemistry',
            'price' => 200,
            'is_active' => true,
        ]);

        $this->actingAs($doctorUser, 'sanctum')->postJson('/api/lab-requests', [
            'patient_id' => $patient->id,
            'visit_id' => $visitId,
            'test_ids' => [$roundTwo->id],
        ])->assertOk();

        $this->assertSame('lab_requested', Visit::find($visitId)->status, 'A second lab round must re-enter the lab stage.');

        $this->actingAs($labTech, 'sanctum')
            ->postJson("/api/lab-requests/".LabRequest::where('visit_id', $visitId)->latest('id')->value('id')."/cancel")
            ->assertOk();
        $this->assertSame('waiting_for_doctor', Visit::find($visitId)->status);

        $this->actingAs($doctorUser, 'sanctum')
            ->postJson("/api/visits/{$visitId}/start-consultation")
            ->assertOk()->assertJsonPath('data.status', 'in_consultation');

        // 6. Doctor prescribes; pharmacy is notified.
        $medicine = Medicine::create([
            'name' => 'Amoxicillin',
            'form' => 'capsule',
            'strength' => '500mg',
            'unit' => 'capsule',
            'stock_quantity' => 100,
            'reorder_level' => 10,
            'selling_price' => 10,
            'is_active' => true,
        ]);
        MedicineBatch::create([
            'medicine_id' => $medicine->id,
            'batch_number' => 'B-001',
            'expiry_date' => now()->addYear()->toDateString(),
            'quantity_received' => 100,
            'quantity_available' => 100,
            'purchase_price' => 6,
        ]);

        $rxId = $this->actingAs($doctorUser, 'sanctum')->postJson('/api/prescriptions', [
            'patient_id' => $patient->id,
            'visit_id' => $visitId,
            'diagnosis' => 'Stable angina',
            'items' => [[
                'medicine_id' => $medicine->id,
                'dosage' => '500mg',
                'frequency' => '3 times/day',
                'duration' => '7 days',
                'quantity' => 21,
            ]],
        ])->assertOk()->json('data.id');

        // The review step moved the case back to the doctor queue; prescribing
        // then advances it to the prescription stage.
        $this->assertSame('prescription_created', Visit::find($visitId)->status);
        $this->assertTrue($pharmacist->notifications()->where('data->title', 'like', '%prescription%')->exists());

        $this->actingAs($pharmacist, 'sanctum')->putJson("/api/prescriptions/{$rxId}/status", [
            'status' => 'processing',
        ])->assertOk();
        $this->assertSame('pharmacy_processing', Visit::find($visitId)->status);

        // 7. Invoice → payment gate → dispense.
        $invoiceId = $this->actingAs($accountant, 'sanctum')->postJson('/api/invoices', [
            'patient_id' => $patient->id,
            'visit_id' => $visitId,
            'items' => [[
                'description' => 'Amoxicillin 500mg x21',
                'item_type' => 'medicine',
                'quantity' => 21,
                'unit_price' => 10,
            ]],
        ])->assertOk()->json('data.id');

        $this->assertSame('payment_required', Visit::find($visitId)->status);
        $this->assertTrue($accountant->notifications()->where('data->title', 'like', '%Payment approval required%')->exists());

        // Dispensing is blocked while the bill is outstanding.
        $this->actingAs($pharmacist, 'sanctum')->putJson("/api/prescriptions/{$rxId}/status", [
            'status' => 'dispensed',
        ])->assertStatus(422);

        $invoice = Invoice::findOrFail($invoiceId);

        // Approval is refused while cash is still owed.
        $this->actingAs($accountant, 'sanctum')
            ->postJson("/api/invoices/{$invoiceId}/approve")
            ->assertStatus(422);

        $this->actingAs($accountant, 'sanctum')->postJson("/api/invoices/{$invoiceId}/payments", [
            'amount' => (float) $invoice->total,
            'method' => 'cash',
        ])->assertOk();

        // Recording the cash settles the invoice but does not release the
        // medication: the accountant still approves explicitly.
        $this->assertSame('paid', $invoice->fresh()->status);
        $this->assertFalse($invoice->fresh()->isApproved());
        $this->assertSame('payment_required', Visit::find($visitId)->status);
        $this->actingAs($pharmacist, 'sanctum')->putJson("/api/prescriptions/{$rxId}/status", [
            'status' => 'dispensed',
        ])->assertStatus(422);

        $this->actingAs($pharmacist, 'sanctum')->postJson("/api/invoices/{$invoiceId}/approve")
            ->assertStatus(403);

        $this->actingAs($accountant, 'sanctum')->postJson("/api/invoices/{$invoiceId}/approve", [
            'notes' => 'Cash received and counted.',
        ])->assertOk()->assertJsonPath('data.is_approved', true);

        $this->assertSame('payment_approved', Visit::find($visitId)->status);
        $this->assertTrue($pharmacist->notifications()->where('data->title', 'like', '%Payment approved%')->exists());

        // Approving twice is rejected — the approval is a single decision.
        $this->actingAs($accountant, 'sanctum')
            ->postJson("/api/invoices/{$invoiceId}/approve")
            ->assertStatus(422);

        $this->actingAs($pharmacist, 'sanctum')->putJson("/api/prescriptions/{$rxId}/status", [
            'status' => 'dispensed',
        ])->assertOk();

        $this->assertSame('medication_dispensed', Visit::find($visitId)->status);
        $this->assertSame(79, (int) $medicine->fresh()->stock_quantity);

        // 8. Doctor closes the case; the timeline tells the whole story.
        $this->actingAs($doctorUser, 'sanctum')->postJson("/api/visits/{$visitId}/complete", [
            'diagnosis' => 'Stable angina',
        ])->assertOk()->assertJsonPath('data.status', 'visit_completed');

        $timeline = $this->actingAs($receptionist, 'sanctum')
            ->getJson("/api/visits/{$visitId}/timeline")
            ->assertOk()
            ->json('data');

        $stages = array_column($timeline, 'to');
        $this->assertSame('registered', $stages[0]);
        $this->assertContains('intake_completed', $stages);
        $this->assertContains('referred', $stages);
        $this->assertContains('nurse_assessment_completed', $stages);
        $this->assertContains('in_consultation', $stages);
        $this->assertContains('lab_requested', $stages);
        $this->assertContains('lab_completed', $stages);
        $this->assertContains('pharmacy_processing', $stages);
        $this->assertContains('payment_required', $stages);
        $this->assertContains('payment_approved', $stages);
        $this->assertContains('medication_dispensed', $stages);
        $this->assertSame('visit_completed', end($stages));

        // A closed case rejects further moves.
        $this->actingAs($receptionist, 'sanctum')->postJson("/api/visits/{$visitId}/refer", [
            'department_id' => Department::where('code', 'IMED')->value('id'),
        ])->assertStatus(422);
    }

    public function test_intake_rejects_diagnosis_and_illegal_jumps(): void
    {
        $receptionist = $this->makeUser('receptionist');
        [$doctorUser] = $this->makeDoctor();
        $patient = $this->makePatient('+251900000022');

        // Reception cannot smuggle a diagnosis through intake.
        [$visitId] = $this->recordIntake($receptionist, $patient, ['diagnosis' => 'Migraine']);
        $this->assertNull(Visit::find($visitId)->diagnosis);

        // Skipping straight to consultation is rejected.
        $this->actingAs($doctorUser, 'sanctum')
            ->postJson("/api/visits/{$visitId}/start-consultation")
            ->assertStatus(422);

        $this->assertSame('intake_completed', Visit::find($visitId)->status);
    }

    public function test_patient_self_intake_is_scoped_to_self(): void
    {
        $patient = $this->makePatient('+251900000033');
        $stranger = $this->makePatient('+251900000034');

        $portalUser = User::query()->create([
            'name' => 'Portal Patient',
            'email' => 'portal-'.uniqid().'@example.test',
            'password' => 'secret123',
            'role_id' => Role::query()->where('name', 'patient')->firstOrFail()->id,
            'is_active' => true,
        ]);
        $patient->update(['user_id' => $portalUser->id]);

        $this->actingAs($portalUser, 'sanctum')->postJson('/api/visits/intake', [
            'patient_id' => $patient->id,
            'type' => 'opd',
            'chief_complaint' => 'Fever for two days',
        ])->assertStatus(201);

        $this->actingAs($portalUser, 'sanctum')->postJson('/api/visits/intake', [
            'patient_id' => $stranger->id,
            'type' => 'opd',
            'chief_complaint' => 'Not mine',
        ])->assertStatus(403);

        $this->actingAs($portalUser, 'sanctum')
            ->getJson('/api/workflow/summary')
            ->assertOk()
            ->assertJsonPath('data.0.key', 'my_visit');
    }

    public function test_duplicate_phone_is_rejected_with_the_existing_record(): void
    {
        $receptionist = $this->makeUser('receptionist');
        $this->makePatient('+251900000044');

        $this->actingAs($receptionist, 'sanctum')->postJson('/api/patients', [
            'first_name' => 'Duplicate',
            'last_name' => 'Person',
            'gender' => 'male',
            'date_of_birth' => '1990-01-01',
            'phone' => '+251900000044',
        ])->assertStatus(422)->assertJsonPath('patient_number', $this->patientNumber('+251900000044'));

        $this->postJson('/api/auth/register', [
            'first_name' => 'Duplicate',
            'last_name' => 'Person',
            'date_of_birth' => '1990-01-01',
            'gender' => 'male',
            'phone' => '+251900000044',
            'email' => 'dup-'.uniqid().'@example.test',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ])->assertStatus(422);
    }

    public function test_department_suggest_and_workflow_summary(): void
    {
        $receptionist = $this->makeUser('receptionist');

        $this->actingAs($receptionist, 'sanctum')
            ->getJson('/api/departments/suggest?complaint='.urlencode('chest pain and palpitations'))
            ->assertOk()
            ->assertJsonPath('data.0.code', 'CARD');

        $summary = $this->actingAs($receptionist, 'sanctum')
            ->getJson('/api/workflow/summary')
            ->assertOk()
            ->json('data');

        $keys = array_column($summary, 'key');
        $this->assertContains('routing', $keys);
        $this->assertContains('referred', $keys);

        foreach ($summary as $task) {
            $this->assertArrayHasKey('count', $task);
            $this->assertArrayHasKey('url', $task);
        }
    }

    public function test_cancel_returns_lab_case_to_doctor_queue(): void
    {
        $receptionist = $this->makeUser('receptionist');
        $nurse = $this->makeUser('nurse');
        [$doctorUser, $doctor] = $this->makeDoctor('cancel');
        $labTech = $this->makeUser('lab_technician');
        $patient = $this->makePatient('+251900000055');

        [$visitId] = $this->recordIntake($receptionist, $patient);

        $this->actingAs($receptionist, 'sanctum')->postJson("/api/visits/{$visitId}/refer", [
            'department_id' => Department::where('code', 'CARD')->value('id'),
            'doctor_id' => $doctor->id,
        ])->assertOk();

        $this->actingAs($nurse, 'sanctum')->postJson("/api/visits/{$visitId}/start-triage")->assertOk();
        $this->actingAs($nurse, 'sanctum')->postJson("/api/visits/{$visitId}/vitals", ['pulse' => 80])->assertOk();
        $this->actingAs($nurse, 'sanctum')->postJson("/api/visits/{$visitId}/complete-triage")->assertOk();
        $this->actingAs($doctorUser, 'sanctum')->postJson("/api/visits/{$visitId}/start-consultation")->assertOk();

        $test = LabTest::create([
            'name' => 'X-Ray',
            'code' => 'XR',
            'category' => 'Imaging',
            'price' => 300,
            'is_active' => true,
        ]);

        $labId = $this->actingAs($doctorUser, 'sanctum')->postJson('/api/lab-requests', [
            'patient_id' => $patient->id,
            'visit_id' => $visitId,
            'test_ids' => [$test->id],
        ])->assertOk()->json('data.id');

        $this->actingAs($labTech, 'sanctum')->postJson("/api/lab-requests/{$labId}/cancel")->assertOk();
        $this->assertSame('waiting_for_doctor', Visit::find($visitId)->status);

        $this->actingAs($doctorUser, 'sanctum')->postJson("/api/visits/{$visitId}/cancel", [
            'note' => 'Patient left before consultation.',
        ])->assertOk()->assertJsonPath('data.status', 'cancelled');
    }

    private function patientNumber(string $phone): string
    {
        return Patient::query()->where('phone', $phone)->value('patient_number');
    }
}
