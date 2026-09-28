<?php

namespace App\Support;

use App\Models\Department;
use App\Models\User;
use App\Models\Visit;
use App\Notifications\GenericNotification;
use InvalidArgumentException;

/**
 * The connected-hospital workflow engine.
 *
 * Every handoff — manual (refer, triage, consult) or automatic (lab created,
 * results completed, prescription written, invoice paid, medication dispensed)
 * — flows through here so each step records history, writes an audit entry
 * and notifies the next responsible agent. Controllers validate their own
 * payloads and permissions; this service owns the case machine itself.
 */
class VisitWorkflow
{
    /**
     * Explicit manual edges. Anything not listed here is rejected, so a case
     * can never jump stages or move backwards through the UI.
     *
     * @var array<string, list<string>>
     */
    private const ALLOWED = [
        'registered' => ['intake_completed', 'cancelled'],
        'intake_completed' => ['referred', 'cancelled'],
        'referred' => ['waiting_for_nurse', 'referred', 'cancelled'],
        'waiting_for_nurse' => ['nurse_assessment_completed', 'cancelled'],
        'nurse_assessment_completed' => ['waiting_for_doctor', 'cancelled'],
        'waiting_for_doctor' => ['in_consultation', 'lab_requested', 'cancelled'],
        'in_consultation' => ['lab_requested', 'visit_completed', 'cancelled'],
        'lab_requested' => ['lab_in_progress', 'waiting_for_doctor', 'cancelled'],
        'lab_in_progress' => ['lab_completed', 'waiting_for_doctor', 'cancelled'],
        // Reviewing results hands the case straight back to the doctor who is
        // still in the consultation — no second "start consultation" click.
        // A further round of tests re-enters at lab_requested.
        'lab_completed' => ['in_consultation', 'lab_requested', 'waiting_for_doctor', 'visit_completed', 'cancelled'],
        'prescription_created' => ['pharmacy_processing', 'visit_completed', 'cancelled'],
        'pharmacy_processing' => ['payment_required', 'visit_completed', 'cancelled'],
        'payment_required' => ['payment_approved', 'visit_completed', 'cancelled'],
        'payment_approved' => ['medication_dispensed', 'visit_completed', 'cancelled'],
        'medication_dispensed' => ['visit_completed'],
    ];

    /**
     * Stages a finished consultation may close the case from. Diagnosis is
     * still enforced by VisitController@complete.
     *
     * @var list<string>
     */
    private const COMPLETABLE = [
        'in_consultation',
        'lab_completed',
        'prescription_created',
        'pharmacy_processing',
        'payment_required',
        'payment_approved',
        'medication_dispensed',
    ];

    /**
     * Opening history entry for a case created directly at a stage
     * (intake, or a doctor opening a consultation outright).
     */
    public function logCreation(Visit $visit, ?User $actor, ?string $note = null): void
    {
        $visit->transitions()->create([
            'from_status' => null,
            'to_status' => $visit->status,
            'actor_id' => $actor?->id,
            'note' => $note ?? 'Case opened.',
        ]);

        AuditLogger::log(
            'created',
            "Visit {$visit->visit_number} opened at {$visit->status}",
            $visit,
            null,
            ['status' => $visit->status],
            $actor?->id,
        );
    }

    /**
     * Move a case along one explicit edge, recording history, audit and
     * notifications. Extra model attributes (e.g. department_id on refer)
     * are applied atomically with the move.
     *
     * @param  array<string, mixed>  $attributes
     */
    public function transition(Visit $visit, string $to, ?User $actor, ?string $note = null, array $attributes = []): Visit
    {
        $from = $visit->status;

        if (! in_array($to, Visit::STATUSES, true)) {
            throw new InvalidArgumentException("Unknown visit status [{$to}].");
        }

        $completing = $to === 'visit_completed' && $from !== 'visit_completed';
        $allowed = $completing
            ? in_array($from, self::COMPLETABLE, true)
            : in_array($to, self::ALLOWED[$from] ?? [], true);

        if (! $allowed) {
            throw new InvalidArgumentException("Visit cannot move from [{$from}] to [{$to}].");
        }

        $visit->fill($attributes);
        $visit->status = $to;
        $visit->save();

        $this->record($visit, $from, $to, $actor, $note);
        $this->notifyFor($visit, $from, $to, $note);

        return $visit->fresh() ?? $visit;
    }

    /**
     * Monotonic auto-advance used by downstream modules (lab, pharmacy,
     * billing): moves forward only, silently ignoring stale or duplicate
     * events. Returns null when nothing changed.
     */
    public function advanceTo(Visit $visit, string $to, ?User $actor, ?string $note = null): ?Visit
    {
        if (! in_array($to, Visit::STATUSES, true)) {
            throw new InvalidArgumentException("Unknown visit status [{$to}].");
        }

        $from = $visit->status;

        if ($from === $to || $visit->isTerminal()) {
            return null;
        }

        $order = array_flip(Visit::STATUSES);

        if ($order[$to] <= $order[$from]) {
            return null;
        }

        $visit->status = $to;
        $visit->save();

        $this->record($visit, $from, $to, $actor, $note);
        $this->notifyFor($visit, $from, $to, $note);

        return $visit->fresh() ?? $visit;
    }

    /**
     * One-line hook for downstream modules (lab, pharmacy, billing): advance
     * the linked case forward when it exists. Never throws for state
     * reasons — stale or terminal cases are simply left alone.
     */
    public static function advanceVisit(?int $visitId, string $to, ?User $actor, ?string $note = null): void
    {
        if (! $visitId) {
            return;
        }

        $visit = Visit::find($visitId);

        if ($visit) {
            app(self::class)->advanceTo($visit, $to, $actor, $note);
        }
    }

    /**
     * Explicit-edge hook (e.g. a cancelled lab request sending the case back
     * to the doctor queue). Illegal edges throw — callers only use edges the
     * machine defines.
     *
     * @param  array<string, mixed>  $attributes
     */
    public static function moveVisit(?int $visitId, string $to, ?User $actor, ?string $note = null, array $attributes = []): void
    {
        if (! $visitId) {
            return;
        }

        $visit = Visit::find($visitId);

        if ($visit) {
            app(self::class)->transition($visit, $to, $actor, $note, $attributes);
        }
    }

    /**
     * Send a case to the lab. Uses the explicit edges rather than the monotonic
     * advance so a second round of tests ordered from lab_completed or the
     * doctor queue actually re-enters the lab stage instead of being dropped.
     */
    public static function sendToLab(?int $visitId, ?User $actor, ?string $note = null): void
    {
        if (! $visitId) {
            return;
        }

        $visit = Visit::find($visitId);

        if (! $visit || $visit->status === 'lab_requested') {
            return;
        }

        static::moveVisit($visitId, 'lab_requested', $actor, $note);
    }

    /**
     * Full handoff history for the Patient Journey timeline, oldest first.
     *
     * @return array<int, array<string, mixed>>
     */
    public function timeline(Visit $visit): array
    {
        $visit->loadMissing(['transitions.actor:id,name', 'patient:id,first_name,last_name,patient_number']);

        return $visit->transitions->map(fn ($t) => [
            'id' => $t->id,
            'from' => $t->from_status,
            'to' => $t->to_status,
            'label' => $this->label($t->to_status),
            'actor' => $t->actor?->name,
            'note' => $t->note,
            'at' => $t->created_at?->toIso8601String(),
        ])->values()->all();
    }

    /**
     * Role-aware task buckets for the §18 queue widgets. Counts link out to
     * the existing filtered list pages, so no list logic is duplicated.
     *
     * @return array<int, array<string, mixed>>
     */
    public function queuesFor(User $user): array
    {
        $role = $user->role?->name;
        $tasks = [];

        $visitsIn = fn (array $statuses) => Visit::query()->whereIn('status', $statuses);

        $push = function (string $key, string $label, int $count, string $url) use (&$tasks) {
            $tasks[] = ['key' => $key, 'label' => $label, 'count' => $count, 'url' => $url];
        };

        $myDoctorId = $user->doctor?->id;
        $myDepartmentId = $user->doctor?->department_id;

        switch ($role) {
            case 'super_admin':
            case 'admin':
                $push('routing', 'Ready to route', (clone $visitsIn(['intake_completed']))->count(), '/consultation?status=intake_completed');
                $push('triage', 'Waiting for triage', (clone $visitsIn(['referred', 'waiting_for_nurse']))->count(), '/consultation?status=waiting_for_nurse');
                $push('doctor_queue', 'Waiting for doctor', (clone $visitsIn(['nurse_assessment_completed', 'waiting_for_doctor']))->count(), '/consultation?status=waiting_for_doctor');
                $push('lab_review', 'Lab results to review', (clone $visitsIn(['lab_completed']))->count(), '/consultation?status=lab_completed');
                $push('payment', 'Unpaid invoices', \App\Models\Invoice::whereIn('status', ['unpaid', 'partial'])->count(), '/billing/invoices?status=unpaid');
                $push('payment_approve', 'Awaiting approval', \App\Models\Invoice::where('status', 'paid')->whereNull('approved_at')->count(), '/billing/invoices?status=paid');
                break;

            case 'receptionist':
                $push('routing', 'Ready to route', (clone $visitsIn(['intake_completed']))->count(), '/consultation?status=intake_completed');
                $push('referred', 'Referred, awaiting triage', (clone $visitsIn(['referred', 'waiting_for_nurse']))->count(), '/consultation?status=referred');
                break;

            case 'nurse':
                $push('triage', 'Waiting for triage', (clone $visitsIn(['referred', 'waiting_for_nurse']))->count(), '/consultation?status=waiting_for_nurse');
                $push('assessed', 'Assessed today', Visit::where('status', 'nurse_assessment_completed')->whereDate('updated_at', today())->count(), '/consultation?status=nurse_assessment_completed');
                break;

            case 'doctor':
                $mine = fn () => Visit::query()
                    ->where(function ($q) use ($myDoctorId, $myDepartmentId) {
                        $q->where('doctor_id', $myDoctorId);
                        if ($myDepartmentId) {
                            $q->orWhere(fn ($w) => $w->whereNull('doctor_id')->where('department_id', $myDepartmentId));
                        }
                    });
                $push('doctor_queue', 'Waiting for consultation', (clone $mine())->whereIn('status', ['nurse_assessment_completed', 'waiting_for_doctor'])->count(), '/consultation?status=waiting_for_doctor');
                $push('in_care', 'In consultation', (clone $mine())->where('status', 'in_consultation')->count(), '/consultation?status=in_consultation');
                $push('lab_review', 'Lab results to review', (clone $mine())->where('status', 'lab_completed')->count(), '/consultation?status=lab_completed');
                break;

            case 'lab_technician':
                $push('lab_pending', 'Lab requests pending', \App\Models\LabRequest::whereIn('status', ['requested', 'processing'])->count(), '/laboratory/requests');
                $push('lab_urgent', 'Urgent requests', \App\Models\LabRequest::whereIn('status', ['requested', 'processing'])->where('priority', 'urgent')->count(), '/laboratory/requests?priority=urgent');
                break;

            case 'pharmacist':
                $push('rx_new', 'New prescriptions', \App\Models\Prescription::where('status', 'pending')->count(), '/prescriptions?status=pending');
                $push('rx_preparing', 'Preparing', \App\Models\Prescription::where('status', 'processing')->count(), '/prescriptions?status=processing');
                $push('rx_unpaid', 'Unpaid invoices', \App\Models\Invoice::whereIn('status', ['unpaid', 'partial'])->count(), '/billing/invoices?status=unpaid');
                break;

            case 'accountant':
                $payRequired = \App\Models\Invoice::whereIn('status', ['unpaid', 'partial'])->count();
                // Settled but not yet approved — the explicit release step.
                $awaitingApproval = \App\Models\Invoice::where('status', 'paid')
                    ->whereNull('approved_at')
                    ->count();
                $push('pay_required', 'Payment required', $payRequired, '/billing/invoices?status=unpaid');
                $push('pay_approve', 'Awaiting your approval', $awaitingApproval, '/billing/invoices?status=paid');
                $push('paid_today', 'Approved today', \App\Models\Invoice::whereNotNull('approved_at')->whereDate('approved_at', today())->count(), '/billing/invoices?status=paid');
                break;

            case 'patient':
                $patientId = $user->patient?->id;
                if ($patientId) {
                    $active = Visit::where('patient_id', $patientId)->whereNotIn('status', Visit::TERMINAL)->latest('id')->first();
                    $push('my_visit', $active ? 'Current visit: '.$this->label($active->status) : 'No active visit', $active ? 1 : 0, $active ? "/consultation/{$active->id}" : '/consultation');
                    $push('my_bills', 'Outstanding balance', (int) \App\Models\Invoice::where('patient_id', $patientId)->whereIn('status', ['unpaid', 'partial'])->count(), '/billing/invoices');
                }
                break;
        }

        return $tasks;
    }

    /**
     * Rank departments against a free-text complaint. Scores keyword hits
     * plus name/description matches; returns the top three with score > 0.
     *
     * @return array<int, array<string, mixed>>
     */
    public function suggestDepartments(string $complaint): array
    {
        $text = mb_strtolower(trim($complaint));

        if ($text === '') {
            return [];
        }

        $keywords = [
            'CARD' => ['chest pain', 'chest', 'heart', 'palpitation', 'breath', 'shortness', 'pressure', 'hypertension', 'cardiac', 'angina'],
            'IMED' => ['fever', 'cough', 'headache', 'diabetes', 'sugar', 'flu', 'cold', 'fatigue', 'infection', 'stomach', 'abdominal', 'general'],
            'SURG' => ['appendicitis', 'hernia', 'wound', 'operation', 'surgical', 'lump', 'abscess', 'fracture'],
            'PEDI' => ['child', 'baby', 'infant', 'kid', 'newborn', 'toddler', 'pediatric', 'immunization', 'vaccination'],
            'RADI' => ['x-ray', 'xray', 'scan', 'imaging', 'ultrasound', 'mri', 'radiograph'],
            'OBGY' => ['pregnan', 'prenatal', 'delivery', 'menstrual', 'period', 'obstetric', 'gyneco', 'labor pain', 'antenatal'],
        ];

        return Department::query()->get()
            ->map(function (Department $department) use ($text, $keywords) {
                $score = 0;
                $haystack = mb_strtolower($department->name.' '.$department->description);

                foreach (preg_split('/\s+/', $text, -1, PREG_SPLIT_NO_EMPTY) ?: [] as $word) {
                    if (mb_strlen($word) > 3 && str_contains($haystack, $word)) {
                        $score += 2;
                    }
                }

                foreach ($keywords[$department->code] ?? [] as $keyword) {
                    if (str_contains($text, $keyword)) {
                        $score += 3;
                    }
                }

                return [
                    'id' => $department->id,
                    'name' => $department->name,
                    'code' => $department->code,
                    'description' => $department->description,
                    'score' => $score,
                ];
            })
            ->filter(fn ($row) => $row['score'] > 0)
            ->sortByDesc('score')
            ->values()
            ->take(3)
            ->all();
    }

    public function label(?string $status): string
    {
        return match ($status) {
            'registered' => 'Registered',
            'intake_completed' => 'Intake completed',
            'referred' => 'Referred',
            'waiting_for_nurse' => 'Waiting for triage',
            'nurse_assessment_completed' => 'Nurse assessment completed',
            'waiting_for_doctor' => 'Waiting for doctor',
            'in_consultation' => 'In consultation',
            'lab_requested' => 'Lab requested',
            'lab_in_progress' => 'Lab in progress',
            'lab_completed' => 'Lab completed',
            'prescription_created' => 'Prescription created',
            'pharmacy_processing' => 'Pharmacy processing',
            'payment_required' => 'Payment required',
            'payment_approved' => 'Payment approved',
            'medication_dispensed' => 'Medication dispensed',
            'visit_completed' => 'Visit completed',
            'cancelled' => 'Cancelled',
            default => $status ?? '—',
        };
    }

    private function record(Visit $visit, ?string $from, string $to, ?User $actor, ?string $note): void
    {
        $visit->transitions()->create([
            'from_status' => $from,
            'to_status' => $to,
            'actor_id' => $actor?->id,
            'note' => $note,
        ]);

        AuditLogger::log(
            'workflow',
            "Visit {$visit->visit_number} moved {$from} → {$to}".($note ? ": {$note}" : ''),
            $visit,
            ['status' => $from],
            ['status' => $to],
            $actor?->id,
        );
    }

    /**
     * Notify whoever owns the NEXT step. Role inboxes are scoped to active
     * accounts only; the patient is reached through their linked login.
     */
    private function notifyFor(Visit $visit, ?string $from, string $to, ?string $note): void
    {
        $visit->loadMissing(['patient:id,patient_number,first_name,last_name,user_id', 'department:id,name', 'doctor.user:id,name']);

        $patientRef = trim(($visit->patient->patient_number ?? '').' '.($visit->patient->first_name ?? '').' '.($visit->patient->last_name ?? ''));
        $visitUrl = "/consultation/{$visit->id}";

        $notifyRoles = function (array $roles, string $title, string $body, string $url) {
            $users = User::query()
                ->active()
                ->whereHas('role', fn ($q) => $q->whereIn('name', $roles))
                ->get();

            foreach ($users as $user) {
                $user->notify(new GenericNotification($title, $body, $url));
            }
        };

        $doctorUser = $visit->doctor?->user;

        $notifyDoctor = function (string $title, string $body, string $url) use ($doctorUser) {
            if ($doctorUser) {
                $doctorUser->notify(new GenericNotification($title, $body, $url));
            } else {
                User::query()->active()->whereHas('role', fn ($q) => $q->where('name', 'doctor'))->get()
                    ->each(fn ($u) => $u->notify(new GenericNotification($title, $body, $url)));
            }
        };

        $notifyPatient = function (string $title, string $body, string $url) use ($visit) {
            $visit->patient->user?->notify(new GenericNotification($title, $body, $url));
        };

        $detail = $note ? " {$note}" : '';

        match ($to) {
            'referred' => $notifyRoles(
                ['nurse'],
                'New patient referred'.($visit->department ? " to {$visit->department->name}" : ''),
                "{$patientRef} is waiting for triage.{$detail}",
                $visitUrl,
            ),
            'nurse_assessment_completed' => $notifyDoctor(
                'Patient assessment completed',
                "{$patientRef} is ready for consultation.{$detail}",
                $visitUrl,
            ),
            'waiting_for_doctor' => $from === 'lab_completed' ? $notifyDoctor(
                'Laboratory result reviewed — patient back in queue',
                "{$patientRef} is waiting for consultation.{$detail}",
                $visitUrl,
            ) : null,
            'lab_requested' => $notifyRoles(
                ['lab_technician'],
                'New laboratory request',
                "{$patientRef} needs lab work.{$detail}",
                '/laboratory/requests',
            ),
            'lab_completed' => $notifyDoctor(
                'Laboratory result available',
                "Results are ready for {$patientRef}.{$detail}",
                $visitUrl,
            ),
            'prescription_created' => $notifyRoles(
                ['pharmacist'],
                'New prescription received',
                "{$patientRef} has a new prescription to prepare.{$detail}",
                '/prescriptions?status=pending',
            ),
            'payment_required' => $notifyRoles(
                ['accountant'],
                'Payment approval required',
                "Invoice for {$patientRef} needs verification.{$detail}",
                '/billing/invoices',
            ),
            'payment_approved' => $notifyRoles(
                ['pharmacist'],
                'Payment approved — ready to dispense',
                "Payment for {$patientRef} was approved.{$detail}",
                '/prescriptions?status=processing',
            ),
            'medication_dispensed' => $notifyPatient(
                'Medication dispensed',
                "Your prescribed medication is ready.{$detail}",
                $visitUrl,
            ),
            'visit_completed' => $notifyPatient(
                'Visit completed',
                "Your visit summary, prescriptions and receipts are available.{$detail}",
                $visitUrl,
            ),
            default => null,
        };
    }
}
