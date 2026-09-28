<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    private function makeUser(): User
    {
        $this->seed(RolePermissionSeeder::class);

        return User::query()->create([
            'name' => 'Test Admin',
            'email' => 'admin@example.test',
            'password' => 'secret123',
            'role_id' => Role::query()->where('name', 'admin')->value('id'),
            'is_active' => true,
        ]);
    }

    public function test_unauthenticated_api_request_returns_401_json_without_accept_header(): void
    {
        $this->getJson('/api/auth/me')
            ->assertStatus(401)
            ->assertHeader('content-type', 'application/json')
            ->assertJson(['message' => 'Unauthenticated.']);

        $response = $this->get('/api/dashboard');

        $response->assertStatus(401);
        $this->assertSame('application/json', $response->headers->get('content-type'));
        $this->assertStringNotContainsString('Route [login] not defined', $response->getContent());
    }

    public function test_login_returns_token_and_user(): void
    {
        $this->makeUser();

        $response = $this->postJson('/api/auth/login', [
            'email' => User::first()->email,
            'password' => 'secret123',
            'portal' => 'staff',
        ]);

        $response->assertOk()
            ->assertJsonStructure(['data' => ['token', 'user' => ['id', 'email', 'role' => ['name', 'permissions']]]]);
    }

    public function test_login_rejects_invalid_credentials(): void
    {
        $this->makeUser();

        $this->postJson('/api/auth/login', [
            'email' => User::first()->email,
            'password' => 'wrong-password',
            'portal' => 'staff',
        ])->assertStatus(422);
    }

    public function test_me_endpoint_returns_authenticated_user(): void
    {
        $user = $this->makeUser();

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/auth/me')
            ->assertOk()
            ->assertJsonPath('data.email', $user->email);
    }
}
