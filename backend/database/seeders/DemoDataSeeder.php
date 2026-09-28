<?php

namespace Database\Seeders;

use App\Models\Admission;
use App\Models\Appointment;
use App\Models\AuditLog;
use App\Models\Bed;
use App\Models\Department;
use App\Models\Doctor;
use App\Models\DoctorSchedule;
use App\Models\InsuranceClaim;
use App\Models\InsuranceCompany;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\LabRequest;
use App\Models\LabResult;
use App\Models\LabTest;
use App\Models\MedicalNote;
use App\Models\Medicine;
use App\Models\MedicineBatch;
use App\Models\MedicineCategory;
use App\Models\Patient;
use App\Models\PatientInsurance;
use App\Models\Payment;
use App\Models\PharmacyTransaction;
use App\Models\Prescription;
use App\Models\PrescriptionItem;
use App\Models\Role;
use App\Models\Room;
use App\Models\Service;
use App\Models\Setting;
use App\Models\Supplier;
use App\Models\User;
use App\Models\Visit;
use App\Models\VitalSign;
use App\Models\Ward;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class DemoDataSeeder extends Seeder
{
    /** @var array<string, User> */
    private array $users = [];

    /** @var array<int, Department> */
    private array $departments = [];

    /** @var array<int, Doctor> */
    private array $doctors = [];

    /** @var array<int, Patient> */
    private array $patients = [];

    /** @var array<int, Medicine> */
    private array $medicines = [];

    /** @var array<int, array<string, mixed>> */
    private array $visits = [];

    /** @var array<int, Appointment> */
    private array $completedAppointments = [];

    /** @var array<int, array<string, mixed>> */
    private array $bedSlots = [];

    private string $password;

    public function run(): void
    {
        if (User::where('email', 'admin@medicare.test')->exists()) {
            return;
        }

        $this->password = Hash::make('password');

        DB::transaction(function (): void {
            $this->seedUsers();
            $this->seedDepartments();
            $this->seedDoctors();
            $this->seedPatients();
            $this->seedWards();
            $this->seedAppointments();
            $this->seedVisits();
            $this->seedPharmacy();
            $this->seedPrescriptions();
            $this->seedLab();
            $this->seedAdmissions();
            $this->seedBilling();
            $this->seedInsurance();
            $this->seedNotifications();
            $this->seedAuditLogs();
            $this->seedSettings();
        });
    }

    private function seedUsers(): void
    {
        $roleIds = Role::pluck('id', 'name');

        $defs = [
            'admin' => ['System Administrator', 'admin', '+251911100001'],
            'doctor' => ['Dr. Samuel Bekele', 'doctor', '+251911100002'],
            'nurse' => ['Nurse Hana Ali', 'nurse', '+251911100003'],
            'receptionist' => ['Mike Smith', 'receptionist', '+251911100004'],
            'pharmacist' => ['Sara Tesfaye', 'pharmacist', '+251911100005'],
            'lab' => ['Daniel Girma', 'lab_technician', '+251911100006'],
            'accountant' => ['Ruth Alemu', 'accountant', '+251911100007'],
            'patient' => ['John Doe', 'patient', '+251911100008'],
        ];

        foreach ($defs as $key => [$name, $role, $phone]) {
            $this->users[$key] = User::create([
                'name' => $name,
                'email' => "{$key}@medicare.test",
                'password' => $this->password,
                'role_id' => $roleIds[$role],
                'phone' => $phone,
                'is_active' => true,
            ]);
        }
    }

    private function seedDepartments(): void
    {
        $defs = [
            ['Cardiology', 'CARD', 'Heart and cardiovascular care'],
            ['Internal Medicine', 'IMED', 'General medical services'],
            ['Surgery', 'SURG', 'Surgical services and theatres'],
            ['Pediatrics', 'PEDI', 'Child health services'],
            ['Radiology', 'RADI', 'Imaging and diagnostics'],
            ['Obstetrics & Gynecology', 'OBGY', "Women's health and maternity"],
        ];

        foreach ($defs as [$name, $code, $description]) {
            $this->departments[] = Department::create([
                'name' => $name,
                'code' => $code,
                'description' => $description,
            ]);
        }
    }

    private function seedDoctors(): void
    {
        $defs = [
            ['Dr. Samuel Bekele', 'samuel.bekele@medicare.test', 'Interventional Cardiology', 0, 'LC-2026-001', 800],
            ['Dr. Abel Kebede', 'abel.kebede@medicare.test', 'Internal Medicine', 1, 'LC-2026-002', 600],
            ['Dr. Daniel Tesfaye', 'daniel.tesfaye@medicare.test', 'General Surgery', 2, 'LC-2026-003', 750],
            ['Dr. Miriam Haile', 'miriam.haile@medicare.test', 'Pediatrics', 3, 'LC-2026-004', 500],
            ['Dr. Yonas Girma', 'yonas.girma@medicare.test', 'Diagnostic Radiology', 4, 'LC-2026-005', 650],
            ['Dr. Selamawit Fikru', 'selamawit.fikru@medicare.test', 'Obstetrics & Gynecology', 5, 'LC-2026-006', 700],
        ];

        foreach ($defs as $i => [$name, $email, $specialization, $department, $license, $fee]) {
            $userId = $i === 0
                ? $this->users['doctor']->id
                : User::create([
                    'name' => $name,
                    'email' => $email,
                    'password' => $this->password,
                    'role_id' => Role::where('name', 'doctor')->value('id'),
                    'phone' => '+2519'.str_pad((string) rand(10000000, 99999999), 8, '0', STR_PAD_LEFT),
                    'is_active' => true,
                ])->id;

            $doctor = Doctor::create([
                'user_id' => $userId,
                'department_id' => $this->departments[$department]->id,
                'license_number' => $license,
                'specialization' => $specialization,
                'consultation_fee' => $fee,
                'phone' => '+2519'.str_pad((string) rand(10000000, 99999999), 8, '0', STR_PAD_LEFT),
                'bio' => "{$name} — {$specialization}. Available for outpatient consultations.",
                'is_active' => true,
            ]);

            foreach ([1, 2, 3, 4, 5] as $day) {
                DoctorSchedule::create(['doctor_id' => $doctor->id, 'day_of_week' => $day, 'start_time' => '09:00:00', 'end_time' => '12:00:00', 'slot_minutes' => 30, 'is_active' => true]);
                DoctorSchedule::create(['doctor_id' => $doctor->id, 'day_of_week' => $day, 'start_time' => '14:00:00', 'end_time' => '17:00:00', 'slot_minutes' => 30, 'is_active' => true]);
            }

            if (in_array($i, [0, 5], true)) {
                DoctorSchedule::create(['doctor_id' => $doctor->id, 'day_of_week' => 6, 'start_time' => '09:00:00', 'end_time' => '13:00:00', 'slot_minutes' => 30, 'is_active' => true]);
            }

            $this->doctors[] = $doctor;
        }
    }

    private function seedPatients(): void
    {
        $defs = [
            ['Abebe', 'Kebede', 'male', 34], ['Tigist', 'Alemu', 'female', 28],
            ['Michael', 'Johnson', 'male', 41], ['Sara', 'Williams', 'female', 52],
            ['Dawit', 'Bekele', 'male', 6], ['Helen', 'Girma', 'female', 29],
            ['James', 'Brown', 'male', 47], ['Anna', 'Muller', 'female', 33],
            ['Kebede', 'Tesfaye', 'male', 55], ['John', 'Doe', 'male', 36],
            ['Marta', 'Rodriguez', 'female', 31], ['Yusuf', 'Hassan', 'male', 44],
            ['Selamawit', 'Demissie', 'female', 26], ['David', 'Miller', 'male', 63],
            ['Fatuma', 'Ahmed', 'female', 22], ['Robert', 'Wilson', 'male', 58],
            ['Betelhem', 'Assega', 'female', 19], ['Peter', 'Novak', 'male', 37],
            ['Genet', 'Tadesse', 'female', 49], ['Carlos', 'Mendez', 'male', 42],
            ['Ruth', 'Chikwelu', 'female', 27], ['Samuel', 'Okafor', 'male', 35],
            ['Lydia', 'Mbeki', 'female', 5], ['Thomas', 'Anderson', 'male', 68],
            ['Hiwot', 'Gebre', 'female', 24], ['Ahmed', 'Al-Rashid', 'male', 51],
            ['Naomi', 'Cohen', 'female', 39], ['Daniel', 'Mekonnen', 'male', 46],
            ['Grace', 'Kimani', 'female', 30], ['Lucas', 'Silva', 'male', 12],
        ];

        $blood = ['A+', 'O+', 'B+', 'AB+', 'A-', 'O-', 'B-', 'AB+'];
        $addresses = ['Bole Road, Addis Ababa', 'Kazanchis, Addis Ababa', 'Sarbet, Addis Ababa', 'CMC Road, Addis Ababa', 'Piassa, Addis Ababa', 'Ayat, Addis Ababa'];
        $allergies = ['Penicillin', 'Sulfa drugs', 'Dust mite allergy', 'Peanuts', 'Latex'];
        $history = ['Hypertension', 'Type 2 diabetes', 'Bronchial asthma', 'Prior appendectomy', 'Sickle cell trait'];
        $receptionist = $this->users['receptionist']->id;

        foreach ($defs as $i => [$first, $last, $gender, $age]) {
            $patient = Patient::create([
                'patient_number' => sprintf('P-2026-%06d', $i + 1),
                'first_name' => $first,
                'last_name' => $last,
                'gender' => $gender,
                'date_of_birth' => now()->subYears($age)->subDays(rand(0, 300))->toDateString(),
                'phone' => '+2519'.str_pad((string) rand(10000000, 99999999), 8, '0', STR_PAD_LEFT),
                'email' => $i % 2 === 0 ? strtolower($first.'.'.$last).'@example.com' : null,
                'address' => $addresses[$i % count($addresses)],
                'emergency_contact_name' => $i % 3 === 0 ? 'Next of kin '.$last : null,
                'emergency_contact_phone' => $i % 3 === 0 ? '+2519'.str_pad((string) rand(10000000, 99999999), 8, '0', STR_PAD_LEFT) : null,
                'blood_group' => $blood[$i % count($blood)],
                'allergies' => $i % 2 === 0 ? $allergies[$i % count($allergies)] : null,
                'medical_history' => $i % 3 === 0 ? $history[$i % count($history)] : null,
                'user_id' => $i === 9 ? $this->users['patient']->id : null,
                'registered_by' => $receptionist,
            ]);

            $patient->created_at = match (true) {
                $i >= 28 => now()->subHours(rand(1, 6)),
                $i >= 26 => now()->subDays(rand(1, 4)),
                default => now()->subDays(rand(30, 420)),
            };
            $patient->save();

            $this->patients[] = $patient;
        }
    }

    private function seedWards(): void
    {
        $defs = [
            ['Ward A', 'WA', '1', 'general', 400, 'A', ['101', '102', '103']],
            ['Ward B', 'WB', '2', 'surgical', 800, 'B', ['201', '202']],
            ['ICU', 'ICU', '3', 'icu', 2200, 'I', ['301', '302']],
            ['Maternity', 'MAT', '2', 'maternity', 1200, 'M', ['401', '402']],
        ];

        foreach ($defs as [$name, $code, $floor, $type, $tariff, $prefix, $rooms]) {
            $ward = Ward::create(['name' => $name, 'code' => $code, 'floor' => $floor, 'type' => $type]);
            $bedIndex = 1;

            foreach ($rooms as $roomIndex => $number) {
                $room = Room::create([
                    'ward_id' => $ward->id,
                    'room_number' => $number,
                    'type' => $type,
                    'tariff' => $tariff + $roomIndex * 50,
                    'capacity' => 4,
                ]);

                for ($slot = 1; $slot <= 4; $slot++) {
                    $bed = Bed::create([
                        'room_id' => $room->id,
                        'bed_number' => sprintf('%s-%02d', $prefix, $bedIndex++),
                        'status' => 'available',
                    ]);

                    $this->bedSlots[] = ['bed' => $bed, 'room' => $room, 'ward' => $ward];
                }
            }
        }
    }

    private function seedAppointments(): void
    {
        $slotMinutes = [];
        for ($minutes = 540; $minutes <= 990; $minutes += 30) {
            $slotMinutes[] = $minutes;
        }

        $reasons = ['Routine checkup', 'Follow-up consultation', 'Chest pain', 'Antenatal visit', 'Persistent cough', 'Abdominal pain', 'Headache and dizziness', 'Post-surgery review', 'Diabetes follow-up', 'Hypertension review'];
        $types = ['opd', 'opd', 'opd', 'follow_up', 'consultation', 'emergency'];
        $seq = 1;
        $queue = 1;
        $receptionist = $this->users['receptionist']->id;
        $dayIndex = 0;

        foreach (range(-10, 5) as $offset) {
            $day = now()->addDays($offset);
            $count = $offset < 0 ? 3 : ($offset === 0 ? 6 : 2);
            $slots = collect($slotMinutes)->shuffle()->take($count)->sort()->values();

            foreach ($slots as $index => $start) {
                $doctor = $this->doctors[($seq + $dayIndex) % count($this->doctors)];
                $patient = $this->patients[abs($seq * 7 + $offset) % count($this->patients)];

                if ($offset < 0) {
                    $roll = rand(1, 10);
                    $status = $roll <= 8 ? 'completed' : ($roll === 9 ? 'no_show' : 'cancelled');
                } elseif ($offset === 0) {
                    $status = ['pending', 'confirmed', 'waiting'][$index % 3];
                } else {
                    $status = 'pending';
                }

                $appointment = Appointment::create([
                    'appointment_number' => sprintf('APT-2026-%06d', $seq),
                    'patient_id' => $patient->id,
                    'doctor_id' => $doctor->id,
                    'department_id' => $doctor->department_id,
                    'appointment_date' => $day->toDateString(),
                    'start_time' => sprintf('%02d:%02d:00', intdiv($start, 60), $start % 60),
                    'end_time' => sprintf('%02d:%02d:00', intdiv($start + 30, 60), ($start + 30) % 60),
                    'type' => $types[$seq % count($types)],
                    'status' => $status,
                    'queue_number' => $offset === 0 ? $queue++ : null,
                    'reason' => $reasons[$seq % count($reasons)],
                    'cancelled_reason' => $status === 'cancelled' ? 'Patient rescheduled the appointment.' : null,
                    'created_by' => $receptionist,
                ]);

                if ($status === 'completed') {
                    $this->completedAppointments[] = $appointment;
                }

                $seq++;
            }

            $dayIndex++;
        }
    }

    private function seedVisits(): void
    {
        $records = [
            ['Chest pain and palpitations', 'Intermittent chest pain for 3 days, radiating to the left arm', 'Stable angina', 'Aspirin 75mg daily, rest and follow-up in 2 weeks'],
            ['Persistent cough for 2 weeks', 'Dry cough, night sweats, mild fever', 'Upper respiratory tract infection', 'Fluids, paracetamol and steam inhalation'],
            ['Antenatal follow-up', '28 weeks pregnant, mild ankle swelling', 'Normal pregnancy', 'Iron and folic acid supplementation'],
            ['Abdominal pain', 'Upper abdominal pain after meals, nausea', 'Gastritis', 'Omeprazole 20mg before meals for 14 days'],
            ['Headache and dizziness', 'Recurrent headaches for 1 month', 'Essential hypertension', 'Amlodipine 5mg daily, low salt diet'],
            ['Fever and body aches', 'High fever with chills for 2 days', 'Malaria', 'Artemether-Lumefantrine for 3 days'],
            ['Follow-up after surgery', 'Wound healing well, no discharge', 'Post-operative review', 'Continue antibiotics, wound care advice'],
            ['Diabetes review', 'Polyuria and fatigue, known type 2 diabetes', 'Type 2 diabetes mellitus', 'Metformin 500mg twice daily, diet plan'],
        ];
        $nurse = $this->users['nurse']->id;
        $take = min(20, count($this->completedAppointments));

        foreach (array_slice($this->completedAppointments, 0, $take) as $i => $appointment) {
            $record = $records[$i % count($records)];

            $visit = Visit::create([
                'visit_number' => sprintf('VST-2026-%06d', $i + 1),
                'patient_id' => $appointment->patient_id,
                'doctor_id' => $appointment->doctor_id,
                'appointment_id' => $appointment->id,
                'department_id' => $appointment->department_id,
                'visit_date' => $appointment->appointment_date->toDateString(),
                'type' => $appointment->type === 'emergency' ? 'emergency' : 'opd',
                'chief_complaint' => $record[0],
                'symptoms' => $record[1],
                'diagnosis' => $record[2],
                'treatment' => $record[3],
                'medical_notes' => 'Patient counselled on medication adherence and follow-up.',
                'follow_up_date' => $i % 2 === 0 ? $appointment->appointment_date->copy()->addDays(14)->toDateString() : null,
                'status' => 'completed',
                'created_by' => $appointment->created_by,
            ]);

            $appointment->visit_id = $visit->id;
            $appointment->save();

            foreach (range(1, rand(1, 2)) as $v) {
                VitalSign::create([
                    'visit_id' => $visit->id,
                    'patient_id' => $visit->patient_id,
                    'recorded_by' => $nurse,
                    'recorded_at' => $appointment->appointment_date->copy()->setTimeFromTimeString($appointment->start_time),
                    'bp_systolic' => rand(110, 140),
                    'bp_diastolic' => rand(70, 90),
                    'temperature' => round(rand(362, 380) / 10, 1),
                    'pulse' => rand(60, 100),
                    'oxygen_saturation' => rand(95, 100),
                    'weight' => round(rand(800, 9200) / 100, 2),
                    'height' => rand(75, 185),
                    'respiratory_rate' => rand(12, 20),
                ]);
            }

            if ($i % 2 === 0) {
                MedicalNote::create([
                    'visit_id' => $visit->id,
                    'patient_id' => $visit->patient_id,
                    'author_id' => $nurse,
                    'note_type' => 'progress',
                    'content' => 'Patient responding well to treatment. Vitals stable.',
                ]);
            } elseif ($i % 5 === 0) {
                MedicalNote::create([
                    'visit_id' => $visit->id,
                    'patient_id' => $visit->patient_id,
                    'author_id' => $nurse,
                    'note_type' => 'nursing',
                    'content' => 'Patient advised to rest, maintain hydration and take medications as prescribed.',
                ]);
            }

            $this->visits[] = ['visit' => $visit, 'patient_id' => $visit->patient_id, 'doctor_id' => $visit->doctor_id];
        }
    }

    private function seedPharmacy(): void
    {
        foreach (['Antibiotics', 'Analgesics', 'Antimalarials', 'Cardiovascular', 'Metabolic'] as $name) {
            MedicineCategory::create(['name' => $name, 'description' => "{$name} medicines"]);
        }

        $suppliers = [
            ['Ethio Pharma Distribution', 'Mulugeta Assefa', '+25111667788', 'sales@ethiopharma.et', 'Bole Sub-city, Addis Ababa'],
            ['Addis Medical Supplies', 'Yared Alemu', '+25111445566', 'info@addismeds.et', 'Kazanchis, Addis Ababa'],
            ['Horn Pharmaceuticals', 'Sara Bekele', '+25111223344', 'orders@hornpharma.et', 'Sarbet, Addis Ababa'],
        ];

        $supplierModels = [];
        foreach ($suppliers as $supplier) {
            $supplierModels[] = Supplier::create([
                'name' => $supplier[0], 'contact_person' => $supplier[1], 'phone' => $supplier[2], 'email' => $supplier[3], 'address' => $supplier[4],
            ]);
        }

        $categories = MedicineCategory::orderBy('id')->get();
        $defs = [
            ['Amoxicillin', 'Amoxicillin', 0, 'capsule', '500 mg', 'capsule', 45, 50],
            ['Ceftriaxone', 'Ceftriaxone Sodium', 0, 'injection', '1 g', 'vial', 150, 30],
            ['Ciprofloxacin', 'Ciprofloxacin', 0, 'tablet', '500 mg', 'tablet', 55, 40],
            ['Azithromycin', 'Azithromycin', 0, 'tablet', '250 mg', 'tablet', 95, 30],
            ['Doxycycline', 'Doxycycline', 0, 'capsule', '100 mg', 'capsule', 38, 40],
            ['Metronidazole', 'Metronidazole', 0, 'tablet', '400 mg', 'tablet', 22, 50],
            ['Tinidazole', 'Tinidazole', 0, 'tablet', '500 mg', 'tablet', 48, 30],
            ['Paracetamol', 'Acetaminophen', 1, 'tablet', '500 mg', 'tablet', 8, 100],
            ['Ibuprofen', 'Ibuprofen', 1, 'tablet', '400 mg', 'tablet', 12, 80],
            ['Diclofenac', 'Diclofenac Sodium', 1, 'tablet', '50 mg', 'tablet', 15, 60],
            ['Tramadol', 'Tramadol HCl', 1, 'capsule', '50 mg', 'capsule', 35, 40],
            ['Aspirin', 'Acetylsalicylic Acid', 1, 'tablet', '75 mg', 'tablet', 10, 100],
            ['Artemether-Lumefantrine', 'Artemether-Lumefantrine', 2, 'tablet', '20/120 mg', 'pack', 90, 50],
            ['Chloroquine', 'Chloroquine Phosphate', 2, 'tablet', '250 mg', 'tablet', 20, 40],
            ['Quinine', 'Quinine Sulfate', 2, 'tablet', '300 mg', 'tablet', 30, 30],
            ['Sulfadoxine-Pyrimethamine', 'Sulfadoxine-Pyrimethamine', 2, 'tablet', '500/25 mg', 'tablet', 25, 30],
            ['Amlodipine', 'Amlodipine Besylate', 3, 'tablet', '5 mg', 'tablet', 30, 60],
            ['Losartan', 'Losartan Potassium', 3, 'tablet', '50 mg', 'tablet', 45, 50],
            ['Atorvastatin', 'Atorvastatin Calcium', 3, 'tablet', '20 mg', 'tablet', 75, 40],
            ['Furosemide', 'Furosemide', 3, 'tablet', '40 mg', 'tablet', 18, 50],
            ['Captopril', 'Captopril', 3, 'tablet', '25 mg', 'tablet', 16, 50],
            ['Salbutamol', 'Salbutamol Sulfate', 3, 'inhaler', '100 mcg', 'inhaler', 180, 20],
            ['Metformin', 'Metformin HCl', 4, 'tablet', '500 mg', 'tablet', 35, 80],
            ['Insulin Glargine', 'Insulin Glargine', 4, 'injection', '100 IU/ml', 'vial', 480, 15],
            ['Omeprazole', 'Omeprazole', 4, 'capsule', '20 mg', 'capsule', 40, 50],
            ['Ranitidine', 'Ranitidine', 4, 'tablet', '150 mg', 'tablet', 25, 40],
            ['ORS Sachet', 'Oral Rehydration Salts', 4, 'sachet', '20.5 g', 'sachet', 6, 100],
            ['Prednisolone', 'Prednisolone', 4, 'tablet', '5 mg', 'tablet', 28, 40],
        ];

        $lowStock = [0, 16, 23];
        $expired = [4, 25];
        $expiring = [12, 19];
        $pharmacist = $this->users['pharmacist']->id;
        $purchases = 0;

        foreach ($defs as $i => [$name, $generic, $category, $form, $strength, $unit, $price, $reorder]) {
            $medicine = Medicine::create([
                'name' => $name,
                'generic_name' => $generic,
                'category_id' => $categories[$category]->id,
                'supplier_id' => $supplierModels[$i % count($supplierModels)]->id,
                'form' => $form,
                'strength' => $strength,
                'unit' => $unit,
                'stock_quantity' => 0,
                'reorder_level' => $reorder,
                'selling_price' => $price,
                'is_active' => true,
            ]);

            $plans = [];

            if (in_array($i, $lowStock, true)) {
                $plans[] = [rand(4, 14), now()->addYears(rand(1, 2))->toDateString()];
            } elseif (in_array($i, $expired, true)) {
                $plans[] = [rand(25, 45), now()->subDays(rand(90, 240))->toDateString()];
                $plans[] = [rand(60, 150), now()->addYears(rand(1, 2))->toDateString()];
            } elseif (in_array($i, $expiring, true)) {
                $plans[] = [rand(70, 140), now()->addDays(rand(20, 55))->toDateString()];
            } else {
                $plans[] = [rand(60, 400), now()->addYears(rand(1, 3))->addDays(rand(0, 300))->toDateString()];
                if ($i % 4 === 0) {
                    $plans[] = [rand(40, 200), now()->addYears(rand(3, 4))->toDateString()];
                }
            }

            foreach ($plans as $batchIndex => [$quantity, $expiry]) {
                $batch = MedicineBatch::create([
                    'medicine_id' => $medicine->id,
                    'batch_number' => sprintf('%s-%04d-%02d', strtoupper(substr($name, 0, 3)), 2026, $i + 1).($batchIndex ? 'B' : ''),
                    'expiry_date' => $expiry,
                    'quantity_received' => $quantity,
                    'quantity_available' => $quantity,
                    'purchase_price' => round($price * 0.6, 2),
                    'received_at' => now()->subDays(rand(30, 300)),
                ]);

                if ($purchases < 14) {
                    PharmacyTransaction::create([
                        'medicine_id' => $medicine->id,
                        'batch_id' => $batch->id,
                        'type' => 'purchase',
                        'quantity' => $quantity,
                        'unit_price' => $batch->purchase_price,
                        'total_price' => round($quantity * (float) $batch->purchase_price, 2),
                        'reference' => sprintf('PO-2026-%04d', $purchases + 1),
                        'performed_by' => $pharmacist,
                        'notes' => 'Stock received from supplier',
                    ]);
                    $purchases++;
                }
            }

            $medicine->stock_quantity = $medicine->batches()->sum('quantity_available');
            $medicine->save();

            $this->medicines[] = $medicine;
        }
    }

    private function seedPrescriptions(): void
    {
        $statuses = array_merge(
            array_fill(0, 6, 'pending'),
            array_fill(0, 4, 'processing'),
            array_fill(0, 5, 'dispensed'),
        );

        $dosages = ['1 tablet', '1 capsule', '5 ml', '2 tablets'];
        $frequencies = ['once daily', 'twice daily', 'three times daily', 'every 8 hours'];
        $durations = ['3 days', '5 days', '7 days', '10 days'];
        $diagnoses = ['Upper respiratory tract infection', 'Hypertension', 'Type 2 diabetes mellitus', 'Malaria', 'Gastritis', 'Community acquired pneumonia'];
        $pharmacist = $this->users['pharmacist']->id;
        $safeMedicines = collect($this->medicines)->filter(fn (Medicine $m) => $m->stock_quantity > $m->reorder_level + 60)->values();
        $dispensedCount = 0;

        foreach ($statuses as $i => $status) {
            $patient = $this->patients[($i * 2) % count($this->patients)];
            $doctor = $this->doctors[$i % count($this->doctors)];
            $visit = collect($this->visits)->first(fn ($row) => $row['patient_id'] === $patient->id);
            $dispensedAt = $status === 'dispensed'
                ? ($dispensedCount < 2 ? now()->subMinutes(rand(5, 30)) : now()->subDays(rand(1, 6))->subHours(rand(1, 8)))
                : null;

            $prescription = Prescription::create([
                'prescription_number' => sprintf('RX-2026-%06d', $i + 1),
                'visit_id' => $visit['visit']->id ?? null,
                'patient_id' => $patient->id,
                'doctor_id' => $doctor->id,
                'diagnosis' => $diagnoses[$i % count($diagnoses)],
                'status' => $status,
                'notes' => $i % 3 === 0 ? 'Take after food. Complete the full course.' : null,
                'dispensed_by' => $status === 'dispensed' ? $pharmacist : null,
                'dispensed_at' => $dispensedAt,
            ]);

            if ($status === 'dispensed') {
                $dispensedCount++;
            }

            $pool = $status === 'dispensed' ? $safeMedicines : collect($this->medicines);
            $picked = $pool->shuffle()->take(rand(1, 3));

            foreach ($picked as $medicine) {
                $quantity = rand(10, 30);

                PrescriptionItem::create([
                    'prescription_id' => $prescription->id,
                    'medicine_id' => $medicine->id,
                    'medicine_name' => $medicine->name,
                    'dosage' => $dosages[$i % count($dosages)],
                    'frequency' => $frequencies[$i % count($frequencies)],
                    'duration' => $durations[$i % count($durations)],
                    'quantity' => $quantity,
                    'instructions' => $i % 2 === 0 ? 'Avoid alcohol during treatment.' : null,
                ]);

                if ($status === 'dispensed') {
                    $remaining = $quantity;

                    foreach ($medicine->batches()->orderBy('expiry_date')->get() as $batch) {
                        if ($remaining <= 0) {
                            break;
                        }

                        $taken = min($remaining, (int) $batch->quantity_available);
                        $batch->quantity_available -= $taken;
                        $batch->save();
                        $remaining -= $taken;
                    }

                    $medicine->stock_quantity = $medicine->batches()->sum('quantity_available');
                    $medicine->save();

                    PharmacyTransaction::create([
                        'medicine_id' => $medicine->id,
                        'type' => 'dispense',
                        'quantity' => $quantity,
                        'unit_price' => $medicine->selling_price,
                        'total_price' => round($quantity * (float) $medicine->selling_price, 2),
                        'reference' => $prescription->prescription_number,
                        'performed_by' => $pharmacist,
                        'notes' => 'Dispensed against prescription',
                    ]);
                }
            }
        }
    }

    private function seedLab(): void
    {
        $tests = [
            ['Complete Blood Count', 'CBC001', 'hematology', 250],
            ['Blood Glucose', 'GLU001', 'chemistry', 120],
            ['Urinalysis', 'URN001', 'urinalysis', 150],
            ['Liver Function Tests', 'LFT001', 'chemistry', 650],
            ['Kidney Function Tests', 'KFT001', 'chemistry', 600],
            ['Malaria RDT', 'MAL001', 'serology', 100],
            ['Widal Test', 'WID001', 'serology', 180],
            ['Lipid Profile', 'LIP001', 'chemistry', 550],
            ['HbA1c', 'HBA001', 'chemistry', 700],
            ['Thyroid Profile', 'TFT001', 'hormones', 1200],
            ['Chest X-Ray', 'CXR001', 'imaging', 450],
            ['Abdominal Ultrasound', 'USG001', 'imaging', 1500],
        ];

        $labTests = [];
        foreach ($tests as [$name, $code, $category, $price]) {
            $labTests[] = LabTest::create([
                'name' => $name, 'code' => $code, 'category' => $category, 'price' => $price,
                'description' => "{$name} panel", 'is_active' => true,
            ]);
        }

        $values = [
            'CBC001' => [['13.5', '12.0-16.0', 'g/dL'], ['6.2', '4.0-11.0', 'x10^9/L']],
            'GLU001' => [['92', '70-99', 'mg/dL']],
            'URN001' => [['Normal', 'Negative', null]],
            'LFT001' => [['28', '7-56', 'U/L']],
            'KFT001' => [['0.9', '0.7-1.3', 'mg/dL']],
            'MAL001' => [['Negative', 'Negative', null]],
            'WID001' => [['1:80', '<1:80', null]],
            'LIP001' => [['4.8', '<5.2', 'mmol/L']],
            'HBA001' => [['5.6', '<5.7', '%']],
            'TFT001' => [['1.8', '0.4-4.0', 'mIU/L']],
            'CXR001' => [['No active cardiopulmonary disease', null, null]],
            'USG001' => [['Normal abdominal study', null, null]],
        ];

        $plan = array_merge(
            array_fill(0, 3, 'requested'),
            array_fill(0, 3, 'processing'),
            array_fill(0, 4, 'completed'),
        );
        $labUser = $this->users['lab']->id;

        foreach ($plan as $i => $status) {
            $patient = $this->patients[($i * 3) % count($this->patients)];
            $doctor = $this->doctors[$i % count($this->doctors)];
            $visit = collect($this->visits)->first(fn ($row) => $row['patient_id'] === $patient->id);
            $requestedAt = $i === 9 ? now()->subHours(rand(1, 4)) : now()->subDays(rand(1, 9));

            $request = LabRequest::create([
                'request_number' => sprintf('LAB-2026-%06d', $i + 1),
                'visit_id' => $visit['visit']->id ?? null,
                'patient_id' => $patient->id,
                'doctor_id' => $doctor->id,
                'priority' => in_array($i, [2, 7], true) ? 'urgent' : 'routine',
                'status' => $status,
                'notes' => $i % 2 === 0 ? 'Fasting sample preferred.' : null,
                'requested_at' => $requestedAt,
            ]);

            $picked = collect($labTests)->shuffle()->take(rand(1, 3));

            foreach ($picked as $test) {
                $resultStatus = match ($status) {
                    'completed' => 'completed',
                    'processing' => 'processing',
                    default => 'pending',
                };
                $payload = $values[$test->code][rand(0, count($values[$test->code]) - 1)];

                LabResult::create([
                    'lab_request_id' => $request->id,
                    'lab_test_id' => $test->id,
                    'status' => $resultStatus,
                    'result_value' => $resultStatus === 'completed' ? $payload[0] : null,
                    'reference_range' => $resultStatus === 'completed' ? $payload[1] : null,
                    'unit' => $resultStatus === 'completed' ? $payload[2] : null,
                    'notes' => $resultStatus === 'completed' ? 'Sample within normal limits.' : null,
                    'performed_by' => $resultStatus === 'completed' ? $labUser : null,
                    'performed_at' => $resultStatus === 'completed' ? $requestedAt->copy()->addHours(rand(1, 24)) : null,
                ]);
            }
        }
    }

    private function seedAdmissions(): void
    {
        $diagnoses = ['Community acquired pneumonia', 'Acute appendicitis', 'Severe malaria', 'Heart failure', 'Post-operative care', 'Diabetic ketoacidosis', 'Antepartum haemorrhage'];
        $nurse = $this->users['nurse']->id;

        $bedIndexes = [0, 4, 8, 12, 16, 2, 6];

        foreach ($bedIndexes as $slotIndex => $bedIndex) {
            $slot = $this->bedSlots[$bedIndex];
            $isDischarged = $slotIndex >= 5;
            $patient = $this->patients[$slotIndex];

            $admission = Admission::create([
                'admission_number' => sprintf('ADM-2026-%06d', $slotIndex + 1),
                'patient_id' => $patient->id,
                'ward_id' => $slot['ward']->id,
                'room_id' => $slot['room']->id,
                'bed_id' => $slot['bed']->id,
                'consultant_id' => $this->doctors[$slotIndex % count($this->doctors)]->id,
                'diagnosis' => $diagnoses[$slotIndex % count($diagnoses)],
                'admitted_at' => $isDischarged ? now()->subDays(rand(9, 14)) : now()->subDays(rand(1, 6)),
                'admitted_by' => $nurse,
                'status' => $isDischarged ? 'discharged' : 'admitted',
                'discharged_at' => $isDischarged ? now()->subDays(rand(1, 3)) : null,
                'discharged_by' => $isDischarged ? $nurse : null,
                'discharge_summary' => $isDischarged ? 'Patient recovered and discharged on oral medications with follow-up advice.' : null,
                'outcome' => $isDischarged ? ($slotIndex === 5 ? 'recovered' : 'improved') : null,
            ]);

            if (! $isDischarged) {
                $slot['bed']->update(['status' => 'occupied']);
            }
        }

        $this->bedSlots[3]['bed']->update(['status' => 'maintenance']);
    }

    private function seedBilling(): void
    {
        $serviceDefs = [
            ['Consultation', 'CONS', 'consultation', 500],
            ['Specialist Consultation', 'SPEC', 'consultation', 800],
            ['Registration', 'REG', 'other', 50],
            ['Room Charge/Day', 'ROOM', 'room', 600],
            ['Lab Panel', 'LABP', 'lab', 700],
            ['Procedure Fee', 'PROC', 'procedure', 1200],
            ['Pharmacy Dispensing Fee', 'DISP', 'medicine', 30],
            ['Ambulance Service', 'AMBL', 'other', 900],
        ];

        $services = [];
        foreach ($serviceDefs as [$name, $code, $category, $price]) {
            $services[] = Service::create(['name' => $name, 'code' => $code, 'category' => $category, 'price' => $price, 'is_active' => true]);
        }

        $accountant = $this->users['accountant']->id;
        $methods = ['cash', 'card', 'bank_transfer', 'insurance', 'mobile_money'];
        $statuses = array_merge(array_fill(0, 6, 'paid'), array_fill(0, 5, 'partial'), array_fill(0, 4, 'unpaid'));
        $paymentSeq = 1;

        foreach ($statuses as $i => $status) {
            $patient = $this->patients[$i % count($this->patients)];
            $lineCount = ($i % 3) + 1;
            $items = [];
            $subTotal = 0;

            for ($line = 0; $line < $lineCount; $line++) {
                $service = $services[($i + $line) % count($services)];
                $quantity = $service->category === 'room' ? rand(2, 5) : 1;
                $lineTotal = round($quantity * (float) $service->price, 2);
                $subTotal += $lineTotal;

                $items[] = [
                    'service_id' => $service->id,
                    'description' => $service->name,
                    'item_type' => $service->category,
                    'quantity' => $quantity,
                    'unit_price' => $service->price,
                    'total' => $lineTotal,
                ];
            }

            $discount = in_array($i, [4, 9], true) ? round($subTotal * 0.1, 2) : 0;
            $tax = $i === 7 ? round($subTotal * 0.15, 2) : 0;
            $total = round($subTotal - $discount + $tax, 2);
            $paidAmount = match ($status) {
                'paid' => $total,
                'partial' => round($total * rand(3, 7) / 10, 2),
                default => 0.0,
            };
            $paidAt = $paidAmount > 0
                ? (in_array($i, [0, 1], true) ? now()->subMinutes(rand(30, 300)) : now()->subDays(rand(1, 20)))
                : null;

            $invoice = Invoice::create([
                'invoice_number' => sprintf('INV-2026-%06d', $i + 1),
                'patient_id' => $patient->id,
                'visit_id' => null,
                'admission_id' => $i === 12 ? 1 : null,
                'sub_total' => round($subTotal, 2),
                'discount' => $discount,
                'tax' => $tax,
                'total' => $total,
                'paid_amount' => $paidAmount,
                'insurance_covered' => 0,
                'status' => $status,
                'notes' => $i % 4 === 0 ? 'Covered partly by insurance.' : null,
                'issued_by' => $accountant,
                'paid_at' => $paidAt,
            ]);

            foreach ($items as $item) {
                InvoiceItem::create($item + ['invoice_id' => $invoice->id]);
            }

            $invoice->created_at = in_array($i, [0, 2], true) ? now()->subHours(rand(1, 5)) : now()->subDays(rand(1, 25));
            $invoice->save();

            if ($paidAmount <= 0) {
                continue;
            }

            $amounts = $status === 'paid' && $i === 0
                ? [round($paidAmount / 2, 2), round($paidAmount - round($paidAmount / 2, 2), 2)]
                : [$paidAmount];

            foreach ($amounts as $amount) {
                $method = $methods[$paymentSeq % count($methods)];

                Payment::create([
                    'payment_number' => sprintf('PAY-2026-%06d', $paymentSeq++),
                    'invoice_id' => $invoice->id,
                    'patient_id' => $patient->id,
                    'amount' => $amount,
                    'method' => $method,
                    'reference' => $method === 'cash' ? null : strtoupper('REF'.rand(100000, 999999)),
                    'status' => 'completed',
                    'received_by' => $accountant,
                    'paid_at' => $paidAt,
                    'notes' => null,
                ]);

                if ($method === 'insurance') {
                    $invoice->insurance_covered = round((float) $invoice->insurance_covered + $amount, 2);
                }
            }

            $invoice->save();
        }
    }

    private function seedInsurance(): void
    {
        $companies = [
            ['Nyala Insurance', 'NYL', '+251115522333', 'claims@nyala.et', 'Bole Road, Addis Ababa'],
            ['Awash Insurance', 'AWA', '+251115533444', 'claims@awash.et', 'Ras Abebe Aregay St, Addis Ababa'],
            ['United Insurance', 'UTD', '+251115544555', 'claims@united.et', 'Africa Ave, Addis Ababa'],
        ];

        $companyModels = [];
        foreach ($companies as [$name, $code, $phone, $email, $address]) {
            $companyModels[] = InsuranceCompany::create([
                'name' => $name, 'code' => $code, 'phone' => $phone, 'email' => $email, 'address' => $address, 'is_active' => true,
            ]);
        }

        $coverages = [100, 80, 75, 60, 50, 90, 70, 55];
        $insurances = [];

        foreach (range(0, 7) as $i) {
            $patient = $this->patients[$i];

            $insurances[] = PatientInsurance::create([
                'patient_id' => $patient->id,
                'insurance_company_id' => $companyModels[$i % 3]->id,
                'policy_number' => sprintf('POL-2026-%03d', $i + 1),
                'holder_name' => $patient->first_name.' '.$patient->last_name,
                'coverage_percent' => $coverages[$i],
                'coverage_limit' => rand(10, 50) * 1000,
                'start_date' => now()->subDays(rand(120, 900))->toDateString(),
                'end_date' => in_array($i, [2, 5, 6], true) ? now()->addMonths(rand(2, 12))->toDateString() : null,
                'is_active' => true,
            ]);
        }

        $plan = ['draft', 'submitted', 'approved', 'rejected', 'paid'];

        foreach ($plan as $i => $status) {
            $invoice = Invoice::where('patient_id', $this->patients[$i]->id)->firstOrFail();
            $amount = round(min((float) $invoice->total * 0.8, (float) $invoice->total), 2);
            $approved = in_array($status, ['approved', 'paid'], true) ? round($amount * 0.9, 2) : null;

            InsuranceClaim::create([
                'claim_number' => sprintf('CLM-2026-%06d', $i + 1),
                'invoice_id' => $invoice->id,
                'patient_insurance_id' => $insurances[$i]->id,
                'amount' => $amount,
                'approved_amount' => $approved,
                'status' => $status,
                'submitted_at' => $status === 'draft' ? null : now()->subDays(rand(1, 12)),
                'decided_at' => in_array($status, ['approved', 'rejected', 'paid'], true) ? now()->subDays(rand(1, 5)) : null,
                'notes' => $status === 'rejected' ? 'Policy expired at the date of service.' : 'Claim submitted through the electronic platform.',
            ]);
        }
    }

    private function seedNotifications(): void
    {
        $rows = [
            ['admin', 'Low stock alert', 'Amoxicillin 500mg is below its reorder level.', '/pharmacy', null],
            ['admin', 'Payment received', 'A cash payment was received for invoice INV-2026-000001.', '/billing', null],
            ['admin', 'Insurance claim approved', 'Claim CLM-2026-000003 was approved by the insurer.', '/insurance', now()->subDays(2)],
            ['admin', 'Appointment reminder', 'Six appointments are scheduled for today.', '/appointments', now()->subDay()],
            ['doctor', 'Lab result ready', 'CBC results for a patient are ready for review.', '/lab', null],
            ['doctor', 'Appointment reminder', 'Your first appointment starts at 09:00 today.', '/appointments', now()->subDays(3)],
            ['pharmacist', 'Prescription pending', 'A prescription is waiting to be dispensed.', '/prescriptions', null],
            ['pharmacist', 'Batch expiring soon', 'A medicine batch expires within 60 days.', '/pharmacy', now()->subDays(4)],
        ];

        foreach ($rows as [$user, $title, $body, $url, $readAt]) {
            DB::table('notifications')->insert([
                'id' => (string) Str::uuid(),
                'type' => 'App\Notifications\GenericNotification',
                'notifiable_type' => User::class,
                'notifiable_id' => $this->users[$user]->id,
                'data' => json_encode(['title' => $title, 'body' => $body, 'url' => $url]),
                'read_at' => $readAt,
                'created_at' => now()->subHours(rand(2, 72)),
                'updated_at' => now(),
            ]);
        }
    }

    private function seedAuditLogs(): void
    {
        $appointmentNumber = $this->completedAppointments[0]->appointment_number ?? 'APT-2026-000001';

        $logs = [
            ['login', 'System Administrator logged in', 'admin'],
            ['created', "Admin created patient #{$this->patients[6]->patient_number}", 'admin'],
            ['created', "Receptionist booked appointment #{$appointmentNumber}", 'receptionist'],
            ['created', 'Doctor created prescription #RX-2026-000003', 'doctor'],
            ['dispensed', 'Pharmacist dispensed prescription #RX-2026-000011', 'pharmacist'],
            ['updated', "Admin updated settings: hospital_name", 'admin'],
            ['created', "Receptionist registered patient #{$this->patients[11]->patient_number}", 'receptionist'],
            ['completed', 'Doctor completed consultation #VST-2026-000002', 'doctor'],
            ['processed', 'Lab technician processed lab request #LAB-2026-000008', 'lab'],
            ['created', "Accountant created invoice #INV-2026-000004", 'accountant'],
            ['payment', 'Accountant recorded payment #PAY-2026-000002', 'accountant'],
            ['admitted', 'Nurse admitted a patient to Ward A', 'nurse'],
            ['discharged', 'Nurse discharged a patient from Ward B', 'nurse'],
            ['login', 'System Administrator logged in', 'admin'],
            ['updated', 'Admin updated role permissions: nurse', 'admin'],
        ];

        foreach ($logs as [$action, $description, $user]) {
            $log = new AuditLog();
            $log->forceFill([
                'user_id' => $this->users[$user]->id,
                'action' => $action,
                'description' => $description,
                'ip_address' => '127.0.0.1',
                'user_agent' => 'Seeder',
                'created_at' => now()->subDays(rand(0, 6))->subHours(rand(0, 23)),
            ]);
            $log->save();
        }
    }

    private function seedSettings(): void
    {
        $settings = [
            'hospital_name' => 'MediCare General Hospital',
            'address' => 'Bole Road, Addis Ababa, Ethiopia',
            'phone' => '+251 11 555 1234',
            'email' => 'info@medicare.test',
            'currency' => 'ETB',
            'timezone' => 'Africa/Addis_Ababa',
            'logo' => '',
        ];

        foreach ($settings as $key => $value) {
            Setting::updateOrCreate(['key' => $key], ['value' => $value, 'group' => 'general']);
        }
    }
}
