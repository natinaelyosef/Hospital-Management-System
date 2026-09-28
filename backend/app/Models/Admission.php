<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Admission extends Model
{
    protected $fillable = [
        'admission_number', 'patient_id', 'ward_id', 'room_id', 'bed_id', 
        'consultant_id', 'diagnosis', 'admitted_at', 'admitted_by', 
        'status', 'discharged_at', 'discharged_by', 'discharge_summary', 'outcome'
    ];

<<<<<<< HEAD
    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'admitted_at' => 'datetime',
            'discharged_at' => 'datetime',
            'status' => 'string',
        ];
    }

=======
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    public function ward(): BelongsTo
    {
        return $this->belongsTo(Ward::class);
    }

    public function room(): BelongsTo
    {
        return $this->belongsTo(Room::class);
    }

    public function bed(): BelongsTo
    {
        return $this->belongsTo(Bed::class);
    }

    public function consultant(): BelongsTo
    {
        return $this->belongsTo(Doctor::class, 'consultant_id');
    }
<<<<<<< HEAD

    public function admittedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'admitted_by');
    }

    public function dischargedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'discharged_by');
    }
=======
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
}
