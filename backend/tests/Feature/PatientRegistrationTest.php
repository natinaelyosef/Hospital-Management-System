<?php

namespace Tests\Feature;

use App\Models\Department;
use App\Models\Patient;
use App\Models\User;
use App\Models\Visit;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PatientRegistrationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);

        Department::create([
            'name' => 'Internal Medicine',
            'code' => 'IMED',
            'description' => 'General medical services',
        ]);
    }

    private function payload(array $overrides = []): array
    {
        return array_merge([
            'first_name' => 'Sara',
            'last_name' => 'Abraham',
            'date_of_birth' => '1995-04-12',
            'gender' => 'female',
            'phone' => '+251900111222',
            'email' => 'sara.abraham@example.test',
            'address' => 'Bole Road, Addis Ababa',
            'emergency_contact_name' => 'Abraham Mulugeta',
            'emergency_contact_phone' => '+251911222333',
            'password' => 'correct-horse-1',
            'password_confirmation' => 'correct-horse-1',
            'chief_complaint' => 'Persistent cough and fever since Monday',
            'symptoms' => 'Dry cough, body aches',
            'symptom_duration' => '4 days',
            'severity' => 'moderate',
        ], $overrides);
    }

    public function test_patient_can_self_register_and_is_signed_in_immediately(): void
    {
        $response = $this->postJson('/api/auth/register', $this->payload());

        $response->assertStatus(201)
            ->assertJsonStructure(['data' => ['token', 'user' => ['id', 'role' => ['name']], 'patient_number']]);

        $this->assertSame('patient', $response->json('data.user.role.name'));

        $user = User::query()->where('email', 'sara.abraham@example.test')->firstOrFail();
        $this->assertSame('active', $user->status);

        $patient = Patient::query()->where('user_id', $user->id)->firstOrFail();
        $this->assertSame($response->json('data.patient_number'), $patient->patient_number);
        $this->assertMatchesRegularExpression('/^P-\d{4}-\d{6}$/', $patient->patient_number);
        $this->assertSame($user->id, $patient->registered_by);
        $this->assertSame('Abraham Mulugeta', $patient->emergency_contact_name);
        $this->assertSame('+251911222333', $patient->emergency_contact_phone);

        // The returned token is usable straight away.
        $this->withToken($response->json('data.token'))
            ->getJson('/api/auth/me')
            ->assertOk()
            ->assertJsonPath('data.email', 'sara.abraham@example.test');
    }

    public function test_registration_opens_a_routable_case_with_the_complaint(): void
    {
        $response = $this->postJson('/api/auth/register', $this->payload())->assertStatus(201);

        $visitId = $response->json('data.visit.id');
        $this->assertNotNull($visitId);

        $visit = Visit::findOrFail($visitId);
        $this->assertSame('intake_completed', $visit->status);
        $this->assertSame('Persistent cough and fever since Monday', $visit->chief_complaint);
        $this->assertSame('4 days', $visit->symptom_duration);
        $this->assertMatchesRegularExpression('/^VST-\d{4}-\d{6}$/', $visit->visit_number);

        // The complaint is captured up front, so reception can route at once.
        $this->assertNotEmpty($response->json('data.suggested_departments'));
    }

    public function test_registration_requires_a_complaint(): void
    {
        $this->postJson('/api/auth/register', $this->payload(['chief_complaint' => '']))
            ->assertStatus(422)
            ->assertJsonValidationErrors('chief_complaint');

        $this->assertSame(0, User::query()->count());
        $this->assertSame(0, Visit::query()->count());
    }

    public function test_patient_numbers_are_unique_across_registrations(): void
    {
        $numbers = [];

        foreach (range(1, 3) as $i) {
            $response = $this->postJson('/api/auth/register', $this->payload([
                'email' => "cohort-{$i}@example.test",
                'phone' => "+2519001113{$i}",
            ]));

            $response->assertStatus(201);
            $numbers[] = $response->json('data.patient_number');
        }

        $this->assertCount(3, array_unique($numbers));
    }

    public function test_registration_rejects_duplicate_email_and_mismatched_password(): void
    {
        $this->postJson('/api/auth/register', $this->payload())->assertStatus(201);

        $this->postJson('/api/auth/register', $this->payload())
            ->assertStatus(422)
            ->assertJsonValidationErrors('email');

        $this->postJson('/api/auth/register', $this->payload([
            'email' => 'someone-else@example.test',
            'password_confirmation' => 'different-pass-1',
        ]))->assertStatus(422)->assertJsonValidationErrors('password');

        $this->assertSame(1, User::query()->count());
    }

    public function test_registration_requires_core_demographics(): void
    {
        $this->postJson('/api/auth/register', $this->payload([
            'first_name' => '',
            'gender' => 'unknown',
            'date_of_birth' => 'tomorrow',
            'emergency_contact_name' => '',
            'emergency_contact_phone' => '',
        ]))
            ->assertStatus(422)
            ->assertJsonValidationErrors(['first_name', 'gender', 'date_of_birth', 'emergency_contact_name', 'emergency_contact_phone']);
    }
    public function test_a_registered_patient_only_sees_their_own_record(): void
    {
        $other = Patient::query()->create([
            'patient_number' => 'P-2026-000900',
            'first_name' => 'Someone',
            'last_name' => 'Else',
            'gender' => 'male',
            'date_of_birth' => '1980-01-01',
            'phone' => '+251900000001',
        ]);

        $token = $this->postJson('/api/auth/register', $this->payload())->json('data.token');

        $this->withToken($token)
            ->getJson('/api/patients')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonMissing(['id' => $other->id]);
    }
}
