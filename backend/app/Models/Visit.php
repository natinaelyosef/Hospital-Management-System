<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Visit extends Model
{
<<<<<<< HEAD
    /**
     * The connected-workflow case machine (§19 of the product spec). Order
     * matters: App\Support\VisitWorkflow only ever moves a case forward
     * (plus explicit cancel/re-refer edges), never backwards silently.
     *
     * @var list<string>
     */
    public const STATUSES = [
        'registered',
        'intake_completed',
        'referred',
        'waiting_for_nurse',
        'nurse_assessment_completed',
        'waiting_for_doctor',
        'in_consultation',
        'lab_requested',
        'lab_in_progress',
        'lab_completed',
        'prescription_created',
        'pharmacy_processing',
        'payment_required',
        'payment_approved',
        'medication_dispensed',
        'visit_completed',
        'cancelled',
    ];

    public const TERMINAL = ['visit_completed', 'cancelled'];

    /**
     * @var list<string>
     */
    public const PRIORITIES = ['normal', 'urgent', 'emergency'];

    /**
     * @var list<string>
     */
    public const SEVERITIES = ['mild', 'moderate', 'severe'];

    protected $fillable = [
        'visit_number', 'patient_id', 'doctor_id', 'appointment_id',
        'department_id', 'visit_date', 'type', 'priority', 'chief_complaint',
        'symptoms', 'symptom_duration', 'severity', 'previous_conditions',
        'current_medications', 'intake_notes', 'diagnosis', 'treatment',
        'medical_notes', 'follow_up_date', 'status', 'created_by',
        'referred_by', 'referred_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'visit_date' => 'date',
            'follow_up_date' => 'date',
            'referred_at' => 'datetime',
            'status' => 'string',
        ];
    }

=======
    protected $fillable = [
        'visit_number', 'patient_id', 'doctor_id', 'appointment_id', 
        'department_id', 'visit_date', 'type', 'chief_complaint', 
        'symptoms', 'diagnosis', 'treatment', 'medical_notes', 
        'follow_up_date', 'status', 'created_by'
    ];

>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    public function doctor(): BelongsTo
    {
        return $this->belongsTo(Doctor::class);
    }

    public function appointment(): BelongsTo
    {
        return $this->belongsTo(Appointment::class);
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function vitalSigns(): HasMany
    {
        return $this->hasMany(VitalSign::class);
    }

    public function medicalNotes(): HasMany
    {
        return $this->hasMany(MedicalNote::class);
    }

    public function prescriptions(): HasMany
    {
        return $this->hasMany(Prescription::class);
    }

    public function labRequests(): HasMany
    {
        return $this->hasMany(LabRequest::class);
    }
<<<<<<< HEAD

    public function transitions(): HasMany
    {
        return $this->hasMany(VisitTransition::class)->orderBy('created_at')->orderBy('id');
    }

    public function referredBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'referred_by');
    }

    public function isTerminal(): bool
    {
        return in_array($this->status, self::TERMINAL, true);
    }
=======
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
}
