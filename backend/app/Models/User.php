<?php

namespace App\Models;

<<<<<<< HEAD
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\SoftDeletes;
=======
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
<<<<<<< HEAD
    use HasApiTokens, Notifiable, SoftDeletes;

    public const STATUS_ACTIVE = 'active';
    public const STATUS_SUSPENDED = 'suspended';
    public const STATUS_INACTIVE = 'inactive';
    public const STATUS_PENDING = 'pending';

    /** Role names the rest of the app branches on. */
    public const ROLE_SUPER_ADMIN = 'super_admin';
    public const ROLE_ADMIN = 'admin';
    public const ROLE_DOCTOR = 'doctor';
    public const ROLE_PATIENT = 'patient';

    /**
     * The two front doors. Every account belongs to exactly one, and the
     * login endpoint refuses a mismatch.
     */
    public const PORTAL_PATIENT = 'patient';
    public const PORTAL_STAFF = 'staff';

    public const PORTALS = [self::PORTAL_PATIENT, self::PORTAL_STAFF];

    /**
     * Ordered so the UI can render a stable status legend.
     *
     * @var array<int, string>
     */
    public const STATUSES = [
        self::STATUS_ACTIVE,
        self::STATUS_SUSPENDED,
        self::STATUS_INACTIVE,
        self::STATUS_PENDING,
    ];

    protected $fillable = [
        'name', 'email', 'password', 'phone', 'avatar_path', 'role_id', 'is_active', 'last_login_at',
        'status', 'suspended_by', 'suspended_at', 'suspension_reason',
        'deleted_by', 'deletion_reason', 'invited_at', 'invite_token',
=======
    use HasApiTokens, Notifiable;

    protected $fillable = [
        'name', 'email', 'password', 'phone', 'avatar_path', 'role_id', 'is_active', 'last_login_at'
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
        'is_active' => 'boolean',
        'last_login_at' => 'datetime',
<<<<<<< HEAD
        'suspended_at' => 'datetime',
        'invited_at' => 'datetime',
=======
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
    ];

    public function role()
    {
        return $this->belongsTo(Role::class);
    }

    public function patient()
    {
        return $this->hasOne(Patient::class);
    }

    public function doctor()
    {
        return $this->hasOne(Doctor::class);
    }
<<<<<<< HEAD

    public function suspendedBy()
    {
        return $this->belongsTo(User::class, 'suspended_by');
    }

    public function deletedBy()
    {
        return $this->belongsTo(User::class, 'deleted_by');
    }

    /**
     * The role that owns the whole platform. Only this role may create or
     * manage other Super Admins and only this role bypasses permission gates.
     */
    public function isSuperAdmin(): bool
    {
        return $this->role?->name === self::ROLE_SUPER_ADMIN;
    }

    /**
     * Patients and staff live behind separate login pages and separate
     * front doors, so the portal split is a first-class concept rather than a
     * detail inferred from permissions.
     */
    public function isPatientPortal(): bool
    {
        return $this->role?->name === self::ROLE_PATIENT;
    }

    /**
     * The portal this account belongs to: 'patient' or 'staff'.
     */
    public function portal(): string
    {
        return $this->isPatientPortal() ? 'patient' : 'staff';
    }

    public function isSuspended(): bool
    {
        return $this->status === self::STATUS_SUSPENDED;
    }

    /**
     * `status` is the source of truth for authentication; `is_active` is the
     * legacy mirror kept in sync so older queries keep working.
     */
    public function canLogIn(): bool
    {
        return $this->status === self::STATUS_ACTIVE && (bool) $this->is_active;
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_ACTIVE)->where('is_active', true);
    }

    public function scopeStatus(Builder $query, string $status): Builder
    {
        return $query->where('status', $status);
    }

    /**
     * Suspend the account: blocks sign-in, records who/why/when, and kills
     * every active session token.
     *
     * @return array{old: string, new: string}
     */
    public function suspendBy(?User $actor, string $reason): array
    {
        $old = $this->status;

        $this->forceFill([
            'status' => self::STATUS_SUSPENDED,
            'is_active' => false,
            'suspended_by' => $actor?->id,
            'suspended_at' => now(),
            'suspension_reason' => $reason,
        ])->save();

        $this->tokens()->delete();

        return ['old' => $old, 'new' => self::STATUS_SUSPENDED];
    }

    /**
     * Clear any suspension and restore access.
     *
     * @return array{old: string, new: string}
     */
    public function activate(): array
    {
        $old = $this->status;

        $this->forceFill([
            'status' => self::STATUS_ACTIVE,
            'is_active' => true,
            'suspended_by' => null,
            'suspended_at' => null,
            'suspension_reason' => null,
        ])->save();

        return ['old' => $old, 'new' => self::STATUS_ACTIVE];
    }

    /**
     * Set an explicit status while keeping the legacy `is_active` mirror true.
     *
     * @return array{old: string, new: string}
     */
    public function setStatus(string $status): array
    {
        if (! in_array($status, self::STATUSES, true)) {
            throw new \InvalidArgumentException("Unknown user status [{$status}].");
        }

        $old = $this->status;

        $this->forceFill([
            'status' => $status,
            'is_active' => $status === self::STATUS_ACTIVE,
            'suspended_by' => null,
            'suspended_at' => null,
            'suspension_reason' => null,
        ])->save();

        if ($status !== self::STATUS_ACTIVE) {
            $this->tokens()->delete();
        }

        return ['old' => $old, 'new' => $status];
    }

    /**
     * Soft-delete the login account while every clinical and financial record
     * attached to the user (or to their patient profile) stays intact.
     */
    public function softDeleteBy(?User $actor, string $reason): void
    {
        $this->forceFill([
            'deleted_by' => $actor?->id,
            'deletion_reason' => $reason,
        ])->save();

        $this->tokens()->delete();
        $this->delete();
    }
=======
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf
}
