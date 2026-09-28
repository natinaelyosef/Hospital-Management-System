<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class PasswordResetTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolePermissionSeeder::class);
    }

    private function makeUser(string $email = 'resettable@example.test'): User
    {
        return User::query()->create([
            'name' => 'Resettable User',
            'email' => $email,
            'password' => 'old-password',
            'role_id' => Role::query()->where('name', 'receptionist')->firstOrFail()->id,
            'status' => User::STATUS_ACTIVE,
            'is_active' => true,
        ]);
    }

    private function requestReset(string $email): string
    {
        config(['app.debug' => true]);

        $response = $this->postJson('/api/auth/forgot-password', ['email' => $email]);

        $response->assertOk()->assertJsonPath(
            'data.message',
            'If an account exists for this email, a reset link has been generated.'
        );

        return $response->json('data.reset_token');
    }

    public function test_forgot_password_mints_a_token_for_a_known_email(): void
    {
        $this->makeUser();

        $token = $this->requestReset('resettable@example.test');

        $this->assertSame(64, strlen($token));
        $this->assertTrue(
            DB::table('password_reset_tokens')->where('email', 'resettable@example.test')->exists()
        );
    }

    public function test_forgot_password_hides_the_token_outside_debug(): void
    {
        config(['app.debug' => false]);
        $this->makeUser();

        $this->postJson('/api/auth/forgot-password', ['email' => 'resettable@example.test'])
            ->assertOk()
            ->assertJsonMissingPath('data.reset_token');

        $this->assertTrue(
            DB::table('password_reset_tokens')->where('email', 'resettable@example.test')->exists()
        );
    }

    public function test_forgot_password_is_generic_for_unknown_emails(): void
    {
        $this->postJson('/api/auth/forgot-password', ['email' => 'nobody@example.test'])
            ->assertOk()
            ->assertJsonPath(
                'data.message',
                'If an account exists for this email, a reset link has been generated.'
            );

        $this->assertSame(0, DB::table('password_reset_tokens')->count());
    }

    public function test_reset_password_with_a_valid_token_signs_in_with_the_new_password(): void
    {
        $this->makeUser();
        $token = $this->requestReset('resettable@example.test');

        $this->postJson('/api/auth/reset-password', [
            'email' => 'resettable@example.test',
            'token' => $token,
            'password' => 'shiny-new-password',
            'password_confirmation' => 'shiny-new-password',
        ])->assertOk()->assertJsonPath(
            'data.message',
            'Your password has been reset. You can now sign in.'
        );

        $this->postJson('/api/auth/login', [
            'email' => 'resettable@example.test',
            'password' => 'shiny-new-password',
            'portal' => 'staff',
        ])->assertOk();

        $this->postJson('/api/auth/login', [
            'email' => 'resettable@example.test',
            'password' => 'old-password',
            'portal' => 'staff',
        ])->assertStatus(422);

        // Single-use: the token row is gone.
        $this->assertSame(0, DB::table('password_reset_tokens')->count());

        $this->postJson('/api/auth/reset-password', [
            'email' => 'resettable@example.test',
            'token' => $token,
            'password' => 'another-password',
            'password_confirmation' => 'another-password',
        ])->assertStatus(422);
    }

    public function test_reset_password_rejects_a_wrong_token(): void
    {
        $this->makeUser();

        DB::table('password_reset_tokens')->insert([
            'email' => 'resettable@example.test',
            'token' => hash('sha256', str_repeat('b', 64)),
            'created_at' => now(),
        ]);

        $this->postJson('/api/auth/reset-password', [
            'email' => 'resettable@example.test',
            'token' => str_repeat('a', 64),
            'password' => 'shiny-new-password',
            'password_confirmation' => 'shiny-new-password',
        ])->assertStatus(422);
    }

    public function test_reset_password_rejects_an_expired_token(): void
    {
        $this->makeUser();
        $token = str_repeat('c', 64);

        DB::table('password_reset_tokens')->insert([
            'email' => 'resettable@example.test',
            'token' => hash('sha256', $token),
            'created_at' => now()->subHours(2),
        ]);

        $this->postJson('/api/auth/reset-password', [
            'email' => 'resettable@example.test',
            'token' => $token,
            'password' => 'shiny-new-password',
            'password_confirmation' => 'shiny-new-password',
        ])->assertStatus(422);
    }
}
