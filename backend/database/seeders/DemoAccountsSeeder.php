<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * Guarantees a known set of sign-in accounts (one per role, plus a second
 * Super Administrator to demonstrate that any number of users may share a
 * role). Safe to re-run: it never wipes demo data, only repairs the accounts.
 */
class DemoAccountsSeeder extends Seeder
{
    /**
     * key → [name, role, phone]
     *
     * @var array<string, array{0: string, 1: string, 2: string}>
     */
    private const ACCOUNTS = [
        'admin' => ['System Administrator', 'super_admin', '+251911100001'],
        'admin2' => ['Assistant Administrator', 'super_admin', '+251911100009'],
        'doctor' => ['Dr. Samuel Bekele', 'doctor', '+251911100002'],
        'nurse' => ['Nurse Hana Ali', 'nurse', '+251911100003'],
        'receptionist' => ['Mike Smith', 'receptionist', '+251911100004'],
        'pharmacist' => ['Sara Tesfaye', 'pharmacist', '+251911100005'],
        'lab' => ['Daniel Girma', 'lab_technician', '+251911100006'],
        'accountant' => ['Ruth Alemu', 'accountant', '+251911100007'],
        'patient' => ['John Doe', 'patient', '+251911100008'],
    ];

    public function run(): void
    {
        $roleIds = Role::query()->pluck('id', 'name');

        foreach (self::ACCOUNTS as $key => [$name, $role, $phone]) {
            if (! isset($roleIds[$role])) {
                continue;
            }

            $email = "{$key}@medicare.test";

            $user = User::withTrashed()->firstOrNew(['email' => $email]);

            if (! $user->exists) {
                $user->password = Hash::make('password');
            }

            $user->forceFill([
                'name' => $name,
                'phone' => $phone,
                'role_id' => $roleIds[$role],
                'status' => User::STATUS_ACTIVE,
                'is_active' => true,
                'deleted_at' => null,
                'deleted_by' => null,
                'deletion_reason' => null,
                'suspended_at' => null,
                'suspended_by' => null,
                'suspension_reason' => null,
            ])->save();
        }
    }
}
