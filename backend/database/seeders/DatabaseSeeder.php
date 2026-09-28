<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
<<<<<<< HEAD
=======
<<<<<<< HEAD
=======
use App\Models\User;
use App\Models\Role;
use App\Models\Permission;
use App\Models\Department;
use App\Models\Doctor;
use App\Models\Patient;
use App\Models\Medicine;
use App\Models\MedicineCategory;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
<<<<<<< HEAD
=======
<<<<<<< HEAD
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a
        $this->call([
            RolePermissionSeeder::class,
            DemoDataSeeder::class,
            DemoAccountsSeeder::class,
<<<<<<< HEAD
=======
=======
        // 1. Create Roles
        $adminRole = Role::create(['name' => 'super_admin', 'label' => 'Super Admin']);
        $doctorRole = Role::create(['name' => 'doctor', 'label' => 'Doctor']);
        $nurseRole = Role::create(['name' => 'nurse', 'label' => 'Nurse']);
        $pharmacyRole = Role::create(['name' => 'pharmacist', 'label' => 'Pharmacist']);
        $receptionRole = Role::create(['name' => 'receptionist', 'label' => 'Receptionist']);

        // 2. Create Permissions
        $permissions = [
            'patients.view', 'patients.create', 'patients.edit',
            'appointments.manage', 'prescriptions.create', 'prescriptions.dispense',
            'lab.request', 'lab.results', 'billing.manage', 'audit.view'
        ];
        foreach ($permissions as $p) {
            Permission::create(['name' => $p, 'label' => str_replace('.', ' ', $p), 'group' => 'general']);
        }

        // 3. Assign Permissions to Admin
        $adminRole->permissions()->attach(Permission::all()->pluck('id'));

        // 4. Create Departments
        $cardiology = Department::create(['name' => 'Cardiology', 'code' => 'CARD']);
        $pediatrics = Department::create(['name' => 'Pediatrics', 'code' => 'PED']);

        // 5. Create Users
        $admin = User::create([
            'name' => 'System Admin',
            'email' => 'admin@medicare.com',
            'password' => Hash::make('password'),
            'role_id' => $adminRole->id,
            'is_active' => true,
        ]);

        $docUser = User::create([
            'name' => 'Dr. Samuel',
            'email' => 'samuel@medicare.com',
            'password' => Hash::make('password'),
            'role_id' => $doctorRole->id,
            'is_active' => true,
        ]);

        // 6. Create Doctor
        Doctor::create([
            'user_id' => $docUser->id,
            'department_id' => $cardiology->id,
            'license_number' => 'LIC-12345',
            'specialization' => 'Cardiology',
            'consultation_fee' => 500,
            'is_active' => true,
        ]);

        // 7. Create Patients
        for ($i = 1; $i <= 10; $i++) {
            Patient::create([
                'patient_number' => "P-2026-000$i",
                'first_name' => "Patient $i",
                'last_name' => "Test",
                'gender' => 'male',
                'date_of_birth' => '1990-01-01',
                'phone' => "091100000$i",
                'blood_group' => 'O+',
            ]);
        }

        // 8. Create Medicine Categories & Medicines
        $cat = MedicineCategory::create(['name' => 'Antibiotics']);
        Medicine::create([
            'name' => 'Amoxicillin',
            'category_id' => $cat->id,
            'stock_quantity' => 100,
            'reorder_level' => 20,
            'selling_price' => 15.00,
            'is_active' => true,
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a
        ]);
    }
}
