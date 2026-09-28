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
}
