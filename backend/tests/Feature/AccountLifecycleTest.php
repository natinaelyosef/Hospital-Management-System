<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AccountLifecycleTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);
    }

    private function makeUser(string $role, array $overrides = []): User
    {
        $roleId = Role::query()->where('name', $role)->firstOrFail()->id;

        return User::query()->create(array_merge([
            'name' => ucfirst(str_replace('_', ' ', $role)).' Tester',
            'email' => $role.'-'.uniqid().'@example.test',
            'password' => 'secret123',
            'role_id' => $roleId,
            'status' => User::STATUS_ACTIVE,
            'is_active' => true,
        ], $overrides));
    }

    public function test_seeder_creates_super_admin_with_every_permission(): void
    {
        $superAdmin = Role::query()->where('name', 'super_admin')->firstOrFail();
        $admin = Role::query()->where('name', 'admin')->firstOrFail();

        $total = $superAdmin->permissions()->count();

        $this->assertGreaterThan(40, $total);
        $this->assertSame($total, $admin->permissions()->count() + 1);
        $this->assertFalse(
            $admin->permissions()->pluck('name')->contains('roles.manage'),
            'The operational Admin must not own the role/permission architecture.',
        );
    }

    public function test_super_admin_bypasses_every_gate_while_admin_is_still_powerful(): void
    {
        $superAdmin = $this->makeUser('super_admin');
        $admin = $this->makeUser('admin');

        foreach (['/api/patients', '/api/medicines', '/api/invoices', '/api/users', '/api/roles', '/api/audit-logs'] as $uri) {
            $this->actingAs($superAdmin, 'sanctum')->getJson($uri)->assertStatus(200);
        }

        // Admin keeps operational access but may not rewrite the RBAC model.
        $this->actingAs($admin, 'sanctum')->getJson('/api/patients')->assertStatus(200);
        $this->actingAs($admin, 'sanctum')->getJson('/api/users')->assertStatus(200);
        $this->actingAs($admin, 'sanctum')->postJson('/api/roles', [
            'name' => 'sneaky', 'label' => 'Sneaky', 'permissions' => [],
        ])->assertStatus(403);
    }

    public function test_suspended_account_cannot_log_in_and_receives_the_reason(): void
    {
        $actor = $this->makeUser('super_admin');
        $victim = $this->makeUser('doctor');

        $victim->suspendBy($actor, 'Temporary suspension pending administrative review.');

        $this->postJson('/api/auth/login', [
            'email' => $victim->email,
            'password' => 'secret123',
            'portal' => 'staff',
        ])
            ->assertStatus(403)
            ->assertJsonPath('status', 'suspended')
            ->assertJsonPath('suspension_reason', 'Temporary suspension pending administrative review.');

        $this->assertCount(0, $victim->tokens()->get());
        $this->assertFalse($victim->fresh()->is_active);
    }

    public function test_activation_restores_sign_in(): void
    {
        $actor = $this->makeUser('super_admin');
        $victim = $this->makeUser('nurse');
        $victim->suspendBy($actor, 'Policy review.');

        $victim->activate();

        $this->postJson('/api/auth/login', [
            'email' => $victim->email,
            'password' => 'secret123',
            'portal' => 'staff',
        ])->assertOk();

        $this->assertNull($victim->fresh()->suspended_at);
        $this->assertSame(User::STATUS_ACTIVE, $victim->fresh()->status);
    }

    public function test_pending_account_cannot_log_in(): void
    {
        $user = $this->makeUser('receptionist', ['status' => User::STATUS_PENDING, 'is_active' => false]);

        $this->postJson('/api/auth/login', [
            'email' => $user->email,
            'password' => 'secret123',
            'portal' => 'staff',
        ])->assertStatus(403)->assertJsonPath('status', 'pending');
    }

    public function test_soft_deleted_account_disappears_and_cannot_log_in(): void
    {
        $actor = $this->makeUser('super_admin');
        $victim = $this->makeUser('accountant');
        $email = $victim->email;

        $victim->softDeleteBy($actor, 'Employee left the hospital.');

        $this->assertSoftDeleted('users', ['id' => $victim->id]);

        $this->postJson('/api/auth/login', [
            'email' => $email,
            'password' => 'secret123',
            'portal' => 'staff',
        ])->assertStatus(422);

        Sanctum::actingAs($actor);
        $this->getJson('/api/users')->assertOk()->assertJsonMissing(['email' => $email]);
    }

    public function test_admin_cannot_create_or_assign_a_super_admin_account(): void
    {
        $admin = $this->makeUser('admin');
        $superAdminRoleId = Role::query()->where('name', 'super_admin')->value('id');

        Sanctum::actingAs($admin);

        $this->postJson('/api/users', [
            'name' => 'Escalated Account',
            'email' => 'escalated@example.test',
            'password' => 'super-secret-1',
            'role_id' => $superAdminRoleId,
        ])->assertStatus(403);

        $this->assertDatabaseMissing('users', ['email' => 'escalated@example.test']);
    }

    public function test_super_admin_can_create_additional_super_admins(): void
    {
        $root = $this->makeUser('super_admin');
        $superAdminRoleId = Role::query()->where('name', 'super_admin')->value('id');

        Sanctum::actingAs($root);

        $this->postJson('/api/users', [
            'name' => 'Second Super Admin',
            'email' => 'second-root@example.test',
            'password' => 'super-secret-2',
            'role_id' => $superAdminRoleId,
        ])->assertOk()->assertJsonPath('data.role.name', 'super_admin');

        $this->assertDatabaseHas('users', ['email' => 'second-root@example.test', 'status' => 'active']);
    }

    public function test_admin_cannot_suspend_a_super_admin(): void
    {
        $admin = $this->makeUser('admin');
        $root = $this->makeUser('super_admin');

        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/users/{$root->id}/suspend", ['reason' => 'Trying to take over.'])
            ->assertStatus(403);

        $this->assertSame(User::STATUS_ACTIVE, $root->fresh()->status);
    }

    public function test_account_cannot_suspend_or_delete_itself(): void
    {
        $root = $this->makeUser('super_admin');

        $this->actingAs($root, 'sanctum')
            ->postJson("/api/users/{$root->id}/suspend", ['reason' => 'Accidental self suspend.'])
            ->assertStatus(400);

        $this->actingAs($root, 'sanctum')
            ->deleteJson("/api/users/{$root->id}")
            ->assertStatus(400);
    }

    public function test_the_last_super_admin_cannot_be_demoted_or_deactivated(): void
    {
        $root = $this->makeUser('super_admin');
        $doctorRoleId = Role::query()->where('name', 'doctor')->value('id');

        // Demoting the only Super Administrator would lock the platform out.
        $this->actingAs($root, 'sanctum')
            ->putJson("/api/users/{$root->id}", ['role_id' => $doctorRoleId])
            ->assertStatus(400);

        $this->assertSame('super_admin', $root->fresh()->role->name);

        $this->actingAs($root, 'sanctum')
            ->putJson("/api/users/{$root->id}", ['status' => 'inactive'])
            ->assertStatus(400);

        $this->assertSame(User::STATUS_ACTIVE, $root->fresh()->status);

        // A second Super Administrator removes that lock immediately.
        $second = $this->makeUser('super_admin');

        $this->actingAs($second, 'sanctum')
            ->putJson("/api/users/{$root->id}", ['role_id' => $doctorRoleId])
            ->assertOk();

        $this->assertSame('doctor', $root->fresh()->role->name);
    }

    public function test_a_non_super_admin_cannot_delete_a_super_admin(): void
    {
        $admin = $this->makeUser('admin');
        $root = $this->makeUser('super_admin');

        $this->actingAs($admin, 'sanctum')
            ->deleteJson("/api/users/{$root->id}", ['reason' => 'Attempting to remove the founder.'])
            ->assertStatus(403);

        $this->assertNull($root->fresh()->deleted_at);
    }

    public function test_suspend_requires_a_reason(): void
    {
        $root = $this->makeUser('super_admin');
        $victim = $this->makeUser('doctor');

        $this->actingAs($root, 'sanctum')
            ->postJson("/api/users/{$victim->id}/suspend", [])
            ->assertStatus(422)
            ->assertJsonValidationErrors('reason');
    }

    public function test_password_reset_rotates_the_password_and_kills_sessions(): void
    {
        $root = $this->makeUser('super_admin');
        $victim = $this->makeUser('doctor');
        $token = $victim->createToken('api')->plainTextToken;

        Sanctum::actingAs($root);

        $response = $this->postJson("/api/users/{$victim->id}/password", [])->assertOk();

        $generated = $response->json('data.password');
        $this->assertNotEmpty($generated);

        $this->assertCount(0, $victim->tokens()->get());

        $this->postJson('/api/auth/login', [
            'email' => $victim->email,
            'password' => $generated,
            'portal' => 'staff',
        ])->assertOk();

        // Drop the test's acting-as state so the stale bearer token is judged
        // on its own merits: it was revoked by the reset.
        $this->app['auth']->forgetGuards();

        $this->getJson('/api/auth/me', ['Authorization' => 'Bearer '.$token])->assertStatus(401);
    }

    public function test_user_index_filters_by_status(): void
    {
        $root = $this->makeUser('super_admin');
        $active = $this->makeUser('doctor');
        $suspended = $this->makeUser('nurse');
        $suspended->suspendBy($root, 'Reviewed and paused.');

        Sanctum::actingAs($root);

        $this->getJson('/api/users?status=suspended')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.email', $suspended->email);

        $this->getJson('/api/users?status=active')
            ->assertOk()
            ->assertJsonCount(2, 'data');

        $this->assertNotContains($active->email, array_column($this->getJson('/api/users?status=suspended')->json('data'), 'email'));
    }
}
