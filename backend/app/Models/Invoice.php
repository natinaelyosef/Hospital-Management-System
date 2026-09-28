<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Invoice extends Model
{
    protected $fillable = [
<<<<<<< HEAD
=======
<<<<<<< HEAD
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a
        'invoice_number', 'patient_id', 'visit_id', 'admission_id', 'prescription_id',
        'sub_total', 'discount', 'tax', 'total', 'paid_amount', 
        'insurance_covered', 'status', 'notes', 'issued_by', 'paid_at',
        'approved_by', 'approved_at', 'approval_notes',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'status' => 'string',
            'paid_at' => 'datetime',
            'approved_at' => 'datetime',
        ];
    }

    /**
     * A settled bill is not yet approved: the accountant has to confirm the
     * cash before the pharmacy may dispense.
     */
    public function isApproved(): bool
    {
        return $this->approved_at !== null;
    }

    /**
     * The balance still owed, in currency units.
     */
    public function balance(): float
    {
        return round((float) $this->total - (float) $this->paid_amount, 2);
    }

<<<<<<< HEAD
=======
=======
        'invoice_number', 'patient_id', 'visit_id', 'admission_id', 
        'sub_total', 'discount', 'tax', 'total', 'paid_amount', 
        'insurance_covered', 'status', 'notes', 'issued_by', 'paid_at'
    ];

>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a
    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(InvoiceItem::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }
<<<<<<< HEAD
=======
<<<<<<< HEAD
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a

    public function issuer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'issued_by');
    }

    /** The accountant who approved the cash payment. */
    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function visit(): BelongsTo
    {
        return $this->belongsTo(Visit::class);
    }

    /** The prescription this bill was prepared for, when there is one. */
    public function prescription(): BelongsTo
    {
        return $this->belongsTo(Prescription::class);
    }

    public function admission(): BelongsTo
    {
        return $this->belongsTo(Admission::class);
    }
<<<<<<< HEAD
=======
=======
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
>>>>>>> a7f297beb91ac4e4e56de9342ae6be561e36276a
}
