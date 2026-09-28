<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Seeder;

class RolePermissionSeeder extends Seeder
{
    /**
     * All permissions: [name, label, group].
     *
     * @var array<int, array{0: string, 1: string, 2: string}>
     */
    private const PERMISSIONS = [
        ['dashboard.view', 'View Dashboard', 'dashboard'],
        ['patients.view', 'View Patients', 'patients'],
        ['patients.create', 'Create Patients', 'patients'],
        ['patients.edit', 'Edit Patients', 'patients'],
        ['patients.delete', 'Delete Patients', 'patients'],
        ['patients.documents', 'Manage Patient Documents', 'patients'],
        ['appointments.view', 'View Appointments', 'appointments'],
        ['appointments.create', 'Create Appointments', 'appointments'],
        ['appointments.edit', 'Edit Appointments', 'appointments'],
        ['appointments.cancel', 'Cancel Appointments', 'appointments'],
        ['doctors.view', 'View Doctors', 'doctors'],
        ['doctors.manage', 'Manage Doctors', 'doctors'],
        ['departments.view', 'View Departments', 'departments'],
        ['departments.manage', 'Manage Departments', 'departments'],
        ['consultation.view', 'View Consultations', 'consultation'],
        ['consultation.create', 'Create Consultations', 'consultation'],
        ['consultation.edit', 'Edit Consultations', 'consultation'],
        ['prescriptions.view', 'View Prescriptions', 'prescriptions'],
        ['prescriptions.create', 'Create Prescriptions', 'prescriptions'],
        ['prescriptions.dispense', 'Dispense Prescriptions', 'prescriptions'],
        ['pharmacy.view', 'View Pharmacy', 'pharmacy'],
        ['pharmacy.manage', 'Manage Pharmacy', 'pharmacy'],
        ['lab.view', 'View Laboratory', 'lab'],
        ['lab.request', 'Request Lab Tests', 'lab'],
        ['lab.process', 'Process Lab Results', 'lab'],
        ['wards.view', 'View Wards', 'wards'],
        ['wards.admit', 'Admit Patients', 'wards'],
        ['wards.discharge', 'Discharge Patients', 'wards'],
        ['wards.manage', 'Manage Wards', 'wards'],
        ['billing.view', 'View Billing', 'billing'],
        ['billing.invoice.create', 'Create Invoices', 'billing'],
        ['billing.invoice.edit', 'Edit Invoices', 'billing'],
        ['billing.payment.manage', 'Manage Payments', 'billing'],
<<<<<<< HEAD
        ['billing.payment.approve', 'Approve Payments', 'billing'],
=======
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
        ['insurance.view', 'View Insurance', 'insurance'],
        ['insurance.manage', 'Manage Insurance', 'insurance'],
        ['reports.view', 'View Reports', 'reports'],
        ['users.view', 'View Users', 'users'],
        ['users.create', 'Create Users', 'users'],
        ['users.edit', 'Edit Users', 'users'],
        ['users.delete', 'Delete Users', 'users'],
        ['roles.manage', 'Manage Roles', 'roles'],
        ['settings.manage', 'Manage Settings', 'settings'],
        ['audit.view', 'View Audit Logs', 'audit'],
    ];

    /**
<<<<<<< HEAD
     * Ordered from highest to lowest privilege. Any number of users may hold
     * each role — roles are templates, not single accounts.
     *
     * @var array<string, string>
     */
    private const ROLE_LABELS = [
        'super_admin' => 'Super Administrator',
=======
     * @var array<string, string>
     */
    private const ROLE_LABELS = [
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
        'admin' => 'Administrator',
        'doctor' => 'Doctor',
        'nurse' => 'Nurse',
        'receptionist' => 'Receptionist',
        'pharmacist' => 'Pharmacist',
        'lab_technician' => 'Lab Technician',
        'accountant' => 'Accountant',
        'patient' => 'Patient',
    ];

    /**
<<<<<<< HEAD
     * The operational Administrator runs the hospital but must not be able to
     * rewrite the role/permission architecture itself — that is reserved for
     * the Super Administrator.
     *
     * @var array<int, string>
     */
    private const ADMIN_EXCLUDED = ['roles.manage'];

    /**
=======
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
     * @var array<string, array<int, string>>
     */
    private const ROLE_PERMISSIONS = [
        'doctor' => [
            'dashboard.view', 'patients.view',
            'appointments.view', 'appointments.create', 'appointments.edit', 'appointments.cancel',
            'consultation.view', 'consultation.create', 'consultation.edit',
            'prescriptions.view', 'prescriptions.create',
            'lab.view', 'lab.request',
            'pharmacy.view', 'wards.view', 'reports.view',
        ],
        'nurse' => [
            'dashboard.view',
            'patients.view', 'patients.create', 'patients.edit', 'patients.delete', 'patients.documents',
            'appointments.view',
            'consultation.view', 'consultation.create', 'consultation.edit',
            'prescriptions.view',
            'wards.view', 'wards.admit', 'wards.discharge',
            'lab.view',
        ],
        'receptionist' => [
            'dashboard.view',
            'patients.view', 'patients.create', 'patients.edit', 'patients.delete', 'patients.documents',
            'appointments.view', 'appointments.create', 'appointments.edit', 'appointments.cancel',
<<<<<<< HEAD
            'consultation.view',
=======
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
            'billing.view', 'billing.invoice.create',
            'insurance.view', 'doctors.view', 'departments.view',
        ],
        'pharmacist' => [
            'dashboard.view', 'pharmacy.view', 'pharmacy.manage',
            'prescriptions.view', 'prescriptions.create', 'prescriptions.dispense',
<<<<<<< HEAD
            'patients.view', 'consultation.view',
            'billing.view', 'billing.invoice.create',
            'lab.view',
=======
            'patients.view',
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
        ],
        'lab_technician' => [
            'dashboard.view', 'lab.view', 'lab.request', 'lab.process',
            'patients.view', 'appointments.view', 'consultation.view',
        ],
        'accountant' => [
            'dashboard.view',
<<<<<<< HEAD
            'billing.view', 'billing.invoice.create', 'billing.invoice.edit', 'billing.payment.manage', 'billing.payment.approve',
            'insurance.view', 'insurance.manage',
            'reports.view', 'patients.view',
            'consultation.view', 'prescriptions.view', 'lab.view',
        ],
        'patient' => [
            'dashboard.view', 'patients.view',
            'appointments.view', 'prescriptions.view',
            'lab.view', 'billing.view',
            'consultation.view',
        ],
    ];

    /**
     * Idempotent: re-running adds any missing permission/role and re-applies
     * the documented role → permission matrix without touching users.
     */
    public function run(): void
    {
        $permissions = collect(self::PERMISSIONS)
            ->mapWithKeys(function (array $permission) {
                $model = Permission::updateOrCreate(
                    ['name' => $permission[0]],
                    ['label' => $permission[1], 'group' => $permission[2]],
                );

                return [$model->name => $model->id];
            });

        $names = $permissions->keys()->all();

        foreach (self::ROLE_LABELS as $name => $label) {
            $role = Role::updateOrCreate(
                ['name' => $name],
                ['label' => $label, 'description' => "{$label} role"],
            );

            $granted = match ($name) {
                'super_admin' => $names,
                'admin' => array_values(array_diff($names, self::ADMIN_EXCLUDED)),
                default => self::ROLE_PERMISSIONS[$name] ?? [],
            };

            $role->permissions()->sync($permissions->only($granted)->values()->all());
=======
            'billing.view', 'billing.invoice.create', 'billing.invoice.edit', 'billing.payment.manage',
            'insurance.view', 'insurance.manage',
            'reports.view', 'patients.view',
        ],
        'patient' => [
            'dashboard.view', 'patients.view',
        ],
    ];

    public function run(): void
    {
        if (Role::query()->exists()) {
            return;
        }

        $permissions = collect(self::PERMISSIONS)
            ->mapWithKeys(function (array $permission) {
                $permission = Permission::create([
                    'name' => $permission[0],
                    'label' => $permission[1],
                    'group' => $permission[2],
                ]);

                return [$permission->name => $permission->id];
            });

        $all = $permissions->values();

        foreach (self::ROLE_LABELS as $name => $label) {
            $role = Role::create([
                'name' => $name,
                'label' => $label,
                'description' => "{$label} role",
            ]);

            $ids = $name === 'admin'
                ? $all
                : $permissions->only(self::ROLE_PERMISSIONS[$name])->values();

            $role->permissions()->sync($ids->all());
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
        }
    }
}
