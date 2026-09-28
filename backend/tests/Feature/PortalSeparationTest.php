<?php

namespace Tests\Feature;

use App\Models\Patient;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * Patients and staff sign in through separate front doors. Neither may use
 * the other's login page, and the refusal is enforced by the API rather than
 * by hiding a field in the UI.
 */
class PortalSeparationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);
    }

    private function makeUser(string $role, string $email): User
    {
        return User::query()->create([
            'name' => ucfirst(str_replace('_', ' ', $role)).' Tester',
            'email' => $email,
            'password' => Hash::make('secret123'),
            'role_id' => Role::query()->where('name', $role)->firstOrFail()->id,
            'status' => User::STATUS_ACTIVE,
            'is_active' => true,
        ]);
    }

    private function makePatientUser(string $email = 'portal.patient@example.test'): User
    {
        $user = $this->makeUser('patient', $email);

        Patient::query()->create([
            'patient_number' => 'P-2026-777001',
            'first_name' => 'Portal',
            'last_name' => 'Patient',
            'gender' => 'female',
            'date_of_birth' => '1992-02-02',
            'phone' => '+251900770001',
            'user_id' => $user->id,
            'registered_by' => $user->id,
        ]);

        return $user;
    }

    public function test_patient_signs_in_through_the_patient_portal(): void
    {
        $this->makePatientUser();

        $this->postJson('/api/auth/login', [
            'email' => 'portal.patient@example.test',
            'password' => 'secret123',
            'portal' => 'patient',
        ])
            ->assertOk()
            ->assertJsonPath('data.portal', 'patient')
            ->assertJsonPath('data.user.role.name', 'patient')
            ->assertJsonStructure(['data' => ['token', 'user', 'portal']]);
    }

    public function test_patient_is_refused_at_the_staff_login(): void
    {
        $this->makePatientUser();

        $this->postJson('/api/auth/login', [
            'email' => 'portal.patient@example.test',
            'password' => 'secret123',
            'portal' => 'staff',
        ])
            ->assertStatus(403)
            ->assertJsonPath('portal', 'patient')
            ->assertJsonPath('expected_portal', 'staff');

        // No token was issued.
        $this->assertSame(0, User::query()->where('email', 'portal.patient@example.test')->firstOrFail()->tokens()->count());
    }

    public function test_staff_is_refused_at_the_patient_login(): void
    {
        $this->makeUser('doctor', 'portal.doctor@example.test');

        $this->postJson('/api/auth/login', [
            'email' => 'portal.doctor@example.test',
            'password' => 'secret123',
            'portal' => 'patient',
        ])
            ->assertStatus(403)
            ->assertJsonPath('portal', 'staff')
            ->assertJsonPath('expected_portal', 'patient');

        $this->assertSame(0, User::query()->where('email', 'portal.doctor@example.test')->firstOrFail()->tokens()->count());
    }

    /**
     * @dataProvider staffRoles
     */
    public function test_every_staff_role_belongs_to_the_staff_portal(string $role): void
    {
        $this->makeUser($role, "portal.{$role}@example.test");

        $this->postJson('/api/auth/login', [
            'email' => "portal.{$role}@example.test",
            'password' => 'secret123',
            'portal' => 'staff',
        ])->assertOk()->assertJsonPath('data.portal', 'staff');

        $this->postJson('/api/auth/login', [
            'email' => "portal.{$role}@example.test",
            'password' => 'secret123',
            'portal' => 'patient',
        ])->assertStatus(403);
    }

    public static function staffRoles(): array
    {
        return [
            ['super_admin'], ['admin'], ['doctor'], ['nurse'],
            ['receptionist'], ['pharmacist'], ['lab_technician'], ['accountant'],
        ];
    }

    public function test_login_requires_a_portal(): void
    {
        $this->makePatientUser();

        // Omitting the front door is a validation error, not a silent default.
        $this->postJson('/api/auth/login', [
            'email' => 'portal.patient@example.test',
            'password' => 'secret123',
        ])->assertStatus(422)->assertJsonValidationErrors('portal');

        $this->postJson('/api/auth/login', [
            'email' => 'portal.patient@example.test',
            'password' => 'secret123',
            'portal' => 'nonsense',
        ])->assertStatus(422)->assertJsonValidationErrors('portal');
    }

    public function test_wrong_password_is_reported_before_the_portal_mismatch(): void
    {
        $this->makePatientUser();

        // A wrong password on the wrong portal must not reveal that the
        // account exists on the other front door.
        $this->postJson('/api/auth/login', [
            'email' => 'portal.patient@example.test',
            'password' => 'not-the-password',
            'portal' => 'staff',
        ])->assertStatus(422)->assertJsonPath('message', 'Invalid email or password.');
    }

    public function test_the_portal_probe_reports_the_right_front_door(): void
    {
        $this->makePatientUser('probe.patient@example.test');
        $this->makeUser('nurse', 'probe.nurse@example.test');

        $this->postJson('/api/auth/portal', ['email' => 'probe.patient@example.test'])
            ->assertOk()
            ->assertJsonPath('data.portal', 'patient')
            ->assertJsonPath('data.exists', true);

        $this->postJson('/api/auth/portal', ['email' => 'probe.nurse@example.test'])
            ->assertOk()
            ->assertJsonPath('data.portal', 'staff')
            ->assertJsonPath('data.exists', true);

        $this->postJson('/api/auth/portal', ['email' => 'nobody@example.test'])
            ->assertOk()
            ->assertJsonPath('data.portal', null);
    }

    public function test_a_patient_account_cannot_be_created_by_invitation(): void
    {
        $superAdmin = $this->makeUser('super_admin', 'inviter@example.test');
        $patientRoleId = Role::query()->where('name', 'patient')->value('id');

        $this->actingAs($superAdmin, 'sanctum')->postJson('/api/users/invite', [
            'name' => 'Sneaky Patient',
            'email' => 'sneaky.patient@example.test',
            'role_id' => $patientRoleId,
        ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('role_id');

        $this->assertNull(User::query()->where('email', 'sneaky.patient@example.test')->first());
    }

    public function test_a_pending_patient_invitation_can_never_be_accepted(): void
    {
        $patient = $this->makePatientUser('orphan.patient@example.test');

        // Force the account into the pending+invited state a buggy admin
        // action could leave behind; accepting it must still be refused.
        $patient->forceFill([
            'status' => User::STATUS_PENDING,
            'is_active' => false,
            'invite_token' => str_repeat('b', 64),
        ])->save();

        $this->postJson('/api/auth/invites/accept', [
            'token' => str_repeat('b', 64),
            'password' => 'brand-new-password',
            'password_confirmation' => 'brand-new-password',
        ])->assertStatus(403)->assertJsonPath('portal', 'patient');

        $this->assertSame(User::STATUS_PENDING, $patient->fresh()->status);
    }

    public function test_a_staff_invitation_still_lands_on_the_staff_portal(): void
    {
        $superAdmin = $this->makeUser('super_admin', 'inviter2@example.test');
        $doctorRoleId = Role::query()->where('name', 'doctor')->value('id');

        $token = $this->actingAs($superAdmin, 'sanctum')->postJson('/api/users/invite', [
            'name' => 'New Doctor',
            'email' => 'new.doctor@example.test',
            'role_id' => $doctorRoleId,
        ])->assertStatus(201)->json('data.invite_token');

        $this->postJson('/api/auth/invites/accept', [
            'token' => $token,
            'password' => 'brand-new-password',
            'password_confirmation' => 'brand-new-password',
        ])->assertOk()->assertJsonPath('data.portal', 'staff');
    }

    public function test_a_patient_session_cannot_reach_the_staff_dashboard_shape(): void
    {
        $patient = $this->makePatientUser();

        // The patient dashboard is self-scoped, and the staff-only report
        // endpoint rejects the portal user outright.
        $this->actingAs($patient, 'sanctum')
            ->getJson('/api/dashboard')
            ->assertOk()
            ->assertJsonPath('data.role', 'patient')
            ->assertJsonPath('data.portal', 'patient');

        $this->actingAs($patient, 'sanctum')
            ->getJson('/api/reports/revenue')
            ->assertStatus(403);
    }
}
