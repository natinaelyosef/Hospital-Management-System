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
=======
<<<<<<< HEAD
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a
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

<<<<<<< HEAD
=======
=======
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a
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
=======
<<<<<<< HEAD
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a

    public function admittedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'admitted_by');
    }

    public function dischargedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'discharged_by');
    }
<<<<<<< HEAD
=======
=======
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a
}
