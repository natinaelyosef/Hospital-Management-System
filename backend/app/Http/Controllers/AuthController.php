<?php

namespace App\Http\Controllers;

use App\Http\Transformers\Transform;
<<<<<<< HEAD
use App\Models\Patient;
use App\Models\Role;
use App\Models\User;
use App\Models\Visit;
use App\Support\AuditLogger;
use App\Support\GeneratesSequentialNumber;
use App\Support\VisitWorkflow;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
=======
use App\Models\User;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
use Illuminate\Validation\Rule;

class AuthController extends Controller
{
<<<<<<< HEAD
    use GeneratesSequentialNumber;

    /**
     * Public patient self-registration: creates the login account, the linked
     * patient profile and the first visit case in one transaction, then signs
     * the patient straight in.
     *
     * The complaint is collected here rather than in a follow-up step so a
     * patient never ends up registered with no clinical data — reception can
     * route the case the moment the account exists.
     */
    public function register(Request $request, VisitWorkflow $flow): JsonResponse
    {
        $data = $request->validate([
            'first_name' => ['required', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'date_of_birth' => ['required', 'date', 'before_or_equal:today'],
            'gender' => ['required', Rule::in(['male', 'female', 'other'])],
            'phone' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'address' => ['nullable', 'string', 'max:255'],
            'emergency_contact_name' => ['required', 'string', 'max:255'],
            'emergency_contact_phone' => ['required', 'string', 'max:255'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
            'chief_complaint' => ['required', 'string', 'max:500'],
            'symptoms' => ['nullable', 'string', 'max:1000'],
            'symptom_duration' => ['nullable', 'string', 'max:100'],
            'severity' => ['nullable', Rule::in(Visit::SEVERITIES)],
            'previous_conditions' => ['nullable', 'string', 'max:1000'],
            'current_medications' => ['nullable', 'string', 'max:1000'],
        ]);

        $patientRoleId = Role::query()->where('name', 'patient')->value('id');

        if (! $patientRoleId) {
            return response()->json(['message' => 'Registration is not available right now.'], 503);
        }

        $duplicate = Patient::query()->where('phone', $data['phone'])->first();

        if ($duplicate) {
            return response()->json([
                'message' => "An account with this phone number already exists ({$duplicate->patient_number}). Please sign in instead.",
                'patient_number' => $duplicate->patient_number,
            ], 422);
        }

        [$user, $patient, $visit] = DB::transaction(function () use ($data, $patientRoleId, $flow) {
            $user = User::create([
                'name' => trim($data['first_name'].' '.$data['last_name']),
                'email' => $data['email'],
                'password' => Hash::make($data['password']),
                'phone' => $data['phone'],
                'role_id' => $patientRoleId,
                'status' => User::STATUS_ACTIVE,
                'is_active' => true,
            ]);

            $patient = Patient::create([
                'patient_number' => $this->next('P', 'patients', 'patient_number'),
                'first_name' => $data['first_name'],
                'last_name' => $data['last_name'],
                'gender' => $data['gender'],
                'date_of_birth' => $data['date_of_birth'],
                'phone' => $data['phone'],
                'email' => $data['email'],
                'address' => $data['address'] ?? null,
                'emergency_contact_name' => $data['emergency_contact_name'],
                'emergency_contact_phone' => $data['emergency_contact_phone'],
                'user_id' => $user->id,
                'registered_by' => $user->id,
            ]);

            // Open the case in the same transaction: an account without a
            // routed complaint is a dead end for reception.
            $visit = Visit::create([
                'visit_number' => $this->next('VST', 'visits', 'visit_number'),
                'patient_id' => $patient->id,
                'doctor_id' => null,
                'department_id' => null,
                'visit_date' => today()->toDateString(),
                'type' => 'opd',
                'priority' => 'normal',
                'chief_complaint' => $data['chief_complaint'],
                'symptoms' => $data['symptoms'] ?? null,
                'symptom_duration' => $data['symptom_duration'] ?? null,
                'severity' => $data['severity'] ?? null,
                'previous_conditions' => $data['previous_conditions'] ?? null,
                'current_medications' => $data['current_medications'] ?? null,
                'intake_notes' => 'Self-registered at sign-up.',
                'status' => 'registered',
                'created_by' => $user->id,
            ]);

            $flow->logCreation($visit, $user, 'Case opened during self-registration.');
            $flow->transition($visit->fresh(), 'intake_completed', $user, 'Complaint described at sign-up — ready for reception to route.');

            return [$user, $patient, $visit->fresh()];
        });

        $token = $user->createToken('api')->plainTextToken;

        AuditLogger::log('created', "Patient self-registered #{$patient->patient_number}", $patient);
        AuditLogger::log('workflow', "Visit {$visit->visit_number} opened at {$visit->status}", $visit, null, ['status' => $visit->status], $user->id);

        $complaint = trim(($data['chief_complaint'] ?? '').' '.($data['symptoms'] ?? ''));

        return $this->ok([
            'token' => $token,
            'user' => Transform::user($user->load(['role.permissions', 'patient', 'doctor'])),
            'patient_number' => $patient->patient_number,
            'visit' => Transform::visit($visit->load(['patient', 'doctor.user', 'doctor.department', 'department'])),
            'suggested_departments' => $flow->suggestDepartments($complaint),
        ], 201);
    }

    /**
     * Accept a staff invitation: the invitee sets their own password with the
     * single-use token from their invite link, the account activates, and they
     * are signed straight in.
     */
    public function acceptInvite(Request $request): JsonResponse
    {
        $data = $request->validate([
            'token' => ['required', 'string', 'size:64'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $user = User::query()->where('invite_token', $data['token'])->first();

        if (! $user || $user->status !== User::STATUS_PENDING) {
            return response()->json([
                'message' => 'This invitation link is invalid or has already been used.',
            ], 422);
        }

        // Staff invitations only: patients sign themselves up instead, so an
        // invite must never be a way into the staff workspace.
        if ($user->isPatientPortal()) {
            return response()->json([
                'message' => 'Patient accounts are created from the patient portal, not by invitation. Please register or sign in there.',
                'portal' => User::PORTAL_PATIENT,
            ], 403);
        }

        $user->forceFill([
            'password' => Hash::make($data['password']),
            'status' => User::STATUS_ACTIVE,
            'is_active' => true,
            'invite_token' => null,
        ])->save();

        $user->forceFill(['last_login_at' => now()])->save();

        $token = $user->createToken('api')->plainTextToken;

        AuditLogger::log('login', "User {$user->email} accepted invitation and signed in", $user);

        return $this->ok([
            'token' => $token,
            'user' => Transform::user($user->load(['role.permissions', 'patient', 'doctor'])),
            'portal' => $user->portal(),
        ]);
    }

    /**
     * Self-service password reset, step 1: mint a single-use token for the
     * account matching the email. The response is identical for unknown
     * addresses so accounts cannot be enumerated. Until mail delivery exists
     * the token is returned in debug mode so it can be handed to the user.
     */
    public function forgotPassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
        ]);

        $email = strtolower(trim($data['email']));
        $user = User::query()->where('email', $email)->first();

        if ($user) {
            $token = Str::random(64);

            DB::table('password_reset_tokens')->updateOrInsert(
                ['email' => $user->email],
                ['token' => hash('sha256', $token), 'created_at' => now()],
            );

            AuditLogger::log('updated', "Password reset requested for {$user->email}", $user);

            if (config('app.debug')) {
                return $this->message('If an account exists for this email, a reset link has been generated.', [
                    'reset_token' => $token,
                    'reset_url' => $this->resetUrl($user->email, $token),
                ]);
            }
        }

        return $this->message('If an account exists for this email, a reset link has been generated.');
    }

    /**
     * Self-service password reset, step 2: exchange the token for a new
     * password. Tokens expire after 60 minutes and every session is revoked.
     */
    public function resetPassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'token' => ['required', 'string', 'size:64'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $record = DB::table('password_reset_tokens')
            ->where('email', $data['email'])
            ->first();

        // Tokens live for 60 minutes (Carbon 3 diffs are signed, so expiry is
        // checked against the absolute age instead).
        $expired = ! $record
            || (int) abs(now()->diffInMinutes(Carbon::parse($record->created_at))) > 60;

        $valid = ! $expired && hash_equals((string) $record->token, hash('sha256', $data['token']));

        if (! $valid) {
            return response()->json([
                'message' => 'This password reset link is invalid or has expired.',
            ], 422);
        }

        $user = User::query()->where('email', $data['email'])->first();

        if (! $user) {
            return response()->json([
                'message' => 'This password reset link is invalid or has expired.',
            ], 422);
        }

        $user->forceFill(['password' => Hash::make($data['password'])])->save();
        $user->tokens()->delete();

        DB::table('password_reset_tokens')->where('email', $data['email'])->delete();

        AuditLogger::log('updated', "Password reset for {$user->email}", $user);

        return $this->message('Your password has been reset. You can now sign in.');
    }

    private function resetUrl(string $email, string $token): string
    {
        $base = rtrim((string) (env('FRONTEND_URL', 'http://localhost:5173')), '/');

        return $base.'/reset-password?'.http_build_query(['email' => $email, 'token' => $token]);
    }

=======
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
    public function login(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
<<<<<<< HEAD
            // Which front door the caller is signing in through. Patients and
            // staff have separate login pages and separate home pages, so this
            // is required rather than inferred.
            'portal' => ['required', Rule::in(User::PORTALS)],
=======
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
        ]);

        $user = User::query()
            ->with('role.permissions')
            ->where('email', $data['email'])
            ->first();

<<<<<<< HEAD
        $invalid = ! $user || ! Hash::check($data['password'], $user->password);

        if ($invalid) {
            return response()->json([
                'message' => 'Invalid email or password.',
            ], 422);
        }

        // Credentials are valid; now confirm the account may use THIS front
        // door. A patient cannot enter the staff workspace, and staff cannot
        // enter the patient portal — whichever login page was used.
        $expected = $data['portal'];
        $actual = $user->portal();

        if ($expected !== $actual) {
            $isPatient = $actual === User::PORTAL_PATIENT;

            return response()->json([
                'message' => $isPatient
                    ? 'This is a patient account. Please sign in from the patient portal — patient accounts cannot access the staff workspace.'
                    : 'This is a staff account. Please sign in from the staff login — staff accounts cannot access the patient portal.',
                'portal' => $actual,
                'expected_portal' => $expected,
            ], 403);
        }

        // Credentials are correct: now explain why the account cannot sign in.
        if ($user->status === User::STATUS_SUSPENDED) {
            $reason = $user->suspension_reason
                ? " Reason: {$user->suspension_reason}"
                : '';

            return response()->json([
                'message' => "Your account has been suspended. Please contact hospital administration.{$reason}",
                'status' => $user->status,
                'suspended_at' => $user->suspended_at?->toIso8601String(),
                'suspension_reason' => $user->suspension_reason,
            ], 403);
        }

        if ($user->status === User::STATUS_PENDING) {
            return response()->json([
                'message' => 'Your account is pending activation. Please contact hospital administration.',
                'status' => $user->status,
            ], 403);
        }

        if (! $user->canLogIn()) {
            return response()->json([
                'message' => 'Your account is deactivated. Please contact hospital administration.',
                'status' => $user->status,
            ], 403);
        }

=======
        $invalid = ! $user
            || ! $user->is_active
            || ! Hash::check($data['password'], $user->password);

        if ($invalid) {
            return response()->json([
                'message' => 'Invalid email or matching user not found or account is inactive.',
            ], 422);
        }

>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
        $token = $user->createToken('api')->plainTextToken;

        $user->forceFill(['last_login_at' => now()])->save();

        AuditLogger::log('login', "User {$user->email} logged in", $user);

        return $this->ok([
            'token' => $token,
            'user' => Transform::user($user->load(['role.permissions', 'patient', 'doctor'])),
<<<<<<< HEAD
            'portal' => $user->portal(),
=======
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        return $this->ok(Transform::user($request->user()->load(['role.permissions', 'patient', 'doctor'])));
    }

<<<<<<< HEAD
    /**
     * Public: which front door does this email belong to? Lets the two login
     * pages point an account at the right one instead of a bare rejection.
     * Reveals nothing about the password and is rate-limited.
     */
    public function portalForEmail(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
        ]);

        $user = User::query()->with('role')->where('email', $data['email'])->first();

        // Unknown emails are answered identically to known ones — the response
        // is only ever a routing hint, never an account-existence oracle.
        return $this->ok([
            'portal' => $user?->portal() ?? null,
            'exists' => $user !== null,
        ]);
    }

=======
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
    public function logout(Request $request): JsonResponse
    {
        $request->user()?->currentAccessToken()?->delete();

        return $this->message('Logged out successfully.');
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $user = $request->user();

        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'email' => ['sometimes', 'required', 'string', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'phone' => ['nullable', 'string', 'max:255'],
        ]);

        $user->fill($data)->save();

        return $this->ok(Transform::user($user->load(['role.permissions', 'patient', 'doctor'])));
    }

    public function changePassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'current_password' => ['required', 'string'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $user = $request->user();

        if (! Hash::check($data['current_password'], $user->password)) {
            return response()->json(['message' => 'Current password is incorrect.'], 422);
        }

        $user->forceFill(['password' => Hash::make($data['password'])])->save();

        AuditLogger::log('updated', "User {$user->email} changed password", $user);

        return $this->message('Password changed successfully.');
    }
}
