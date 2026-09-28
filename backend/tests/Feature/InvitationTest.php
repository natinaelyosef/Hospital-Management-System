<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InvitationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);
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

    public function test_super_admin_can_invite_a_new_staff_account(): void
    {
        $actor = $this->makeUser('super_admin');
        $roleId = Role::query()->where('name', 'doctor')->value('id');

        $response = $this->actingAs($actor, 'sanctum')->postJson('/api/users/invite', [
            'name' => 'Invited Doctor',
            'email' => 'invited@example.test',
            'role_id' => $roleId,
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.user.email', 'invited@example.test')
            ->assertJsonPath('data.user.status', User::STATUS_PENDING)
            ->assertJsonStructure(['data' => ['user', 'invite_token', 'invite_url']]);

        $token = $response->json('data.invite_token');
        $this->assertSame(64, strlen($token));
        $this->assertStringContainsString("/invite/{$token}", $response->json('data.invite_url'));

        $invited = User::query()->where('email', 'invited@example.test')->firstOrFail();
        $this->assertSame(User::STATUS_PENDING, $invited->status);
        $this->assertFalse($invited->is_active);
        $this->assertNotNull($invited->invited_at);
        $this->assertSame($token, $invited->invite_token);

        // The invite token is never exposed through the user shape itself.
        $this->assertArrayNotHasKey('invite_token', $response->json('data.user'));

        // A pending invitee cannot sign in yet, even with a correct password.
        $invited->forceFill(['password' => \Illuminate\Support\Facades\Hash::make('secret123')])->save();

        $this->postJson('/api/auth/login', [
            'email' => 'invited@example.test',
            'password' => 'secret123',
            'portal' => 'staff',
        ])->assertStatus(403)->assertJsonPath('status', User::STATUS_PENDING);
    }

    public function test_admin_cannot_invite_a_super_admin(): void
    {
        $actor = $this->makeUser('admin');
        $roleId = Role::query()->where('name', 'super_admin')->value('id');

        $this->actingAs($actor, 'sanctum')->postJson('/api/users/invite', [
            'name' => 'Sneaky Super',
            'email' => 'sneaky@example.test',
            'role_id' => $roleId,
        ])->assertStatus(403);

        $this->assertNull(User::query()->where('email', 'sneaky@example.test')->first());
    }

    public function test_invite_requires_users_create(): void
    {
        $doctor = $this->makeUser('doctor');
        $roleId = Role::query()->where('name', 'nurse')->value('id');

        $this->actingAs($doctor, 'sanctum')->postJson('/api/users/invite', [
            'name' => 'Nope',
            'email' => 'nope@example.test',
            'role_id' => $roleId,
        ])->assertStatus(403);
    }

    public function test_invitee_accepts_invitation_and_signs_in(): void
    {
        $actor = $this->makeUser('super_admin');
        $roleId = Role::query()->where('name', 'nurse')->value('id');

        $invite = $this->actingAs($actor, 'sanctum')->postJson('/api/users/invite', [
            'name' => 'Accepting Nurse',
            'email' => 'accepting@example.test',
            'role_id' => $roleId,
        ])->assertStatus(201);

        $token = $invite->json('data.invite_token');

        $response = $this->postJson('/api/auth/invites/accept', [
            'token' => $token,
            'password' => 'brand-new-password',
            'password_confirmation' => 'brand-new-password',
        ]);

        $response->assertOk()
            ->assertJsonStructure(['data' => ['token', 'user']])
            ->assertJsonPath('data.user.status', User::STATUS_ACTIVE);

        $user = User::query()->where('email', 'accepting@example.test')->firstOrFail();
        $this->assertTrue($user->is_active);
        $this->assertNull($user->invite_token);

        // The token is single-use.
        $this->postJson('/api/auth/invites/accept', [
            'token' => $token,
            'password' => 'another-password',
            'password_confirmation' => 'another-password',
        ])->assertStatus(422);

        // And the new password signs in normally.
        $this->postJson('/api/auth/login', [
            'email' => 'accepting@example.test',
            'password' => 'brand-new-password',
            'portal' => 'staff',
        ])->assertOk();
    }

    public function test_accept_rejects_unknown_tokens(): void
    {
        $this->postJson('/api/auth/invites/accept', [
            'token' => str_repeat('a', 64),
            'password' => 'brand-new-password',
            'password_confirmation' => 'brand-new-password',
        ])->assertStatus(422);
    }

    public function test_resend_rotates_the_invite_token(): void
    {
        $actor = $this->makeUser('super_admin');
        $roleId = Role::query()->where('name', 'receptionist')->value('id');

        $invite = $this->actingAs($actor, 'sanctum')->postJson('/api/users/invite', [
            'name' => 'Resent Receptionist',
            'email' => 'resent@example.test',
            'role_id' => $roleId,
        ])->assertStatus(201);

        $oldToken = $invite->json('data.invite_token');
        $userId = $invite->json('data.user.id');

        $resend = $this->actingAs($actor, 'sanctum')
            ->postJson("/api/users/{$userId}/invite")
            ->assertOk();

        $newToken = $resend->json('data.invite_token');
        $this->assertNotSame($oldToken, $newToken);

        // The old link is dead, the new one works.
        $this->postJson('/api/auth/invites/accept', [
            'token' => $oldToken,
            'password' => 'brand-new-password',
            'password_confirmation' => 'brand-new-password',
        ])->assertStatus(422);

        $this->postJson('/api/auth/invites/accept', [
            'token' => $newToken,
            'password' => 'brand-new-password',
            'password_confirmation' => 'brand-new-password',
        ])->assertOk();
    }

    public function test_resend_only_applies_to_pending_accounts(): void
    {
        $actor = $this->makeUser('super_admin');
        $active = $this->makeUser('doctor');

        $this->actingAs($actor, 'sanctum')
            ->postJson("/api/users/{$active->id}/invite")
            ->assertStatus(422);
    }
}
