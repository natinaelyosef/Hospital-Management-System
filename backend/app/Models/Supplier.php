<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Supplier extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'contact_person',
        'phone',
        'email',
        'address',
    ];

    public function medicines(): HasMany
    {
        return $this->hasMany(Medicine::class, 'supplier_id');
    }
}
