<?php

namespace App\Http\Controllers\Insurance;

use App\Http\Controllers\Controller;
use App\Http\Transformers\Transform;
use App\Models\InsuranceCompany;
use App\Models\PatientInsurance;
use App\Support\AuditLogger;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class PatientInsuranceController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = PatientInsurance::query()->with(['patient', 'company']);

        if ($request->filled('patient_id')) {
            $query->where('patient_id', (int) $request->query('patient_id'));
        }

        if ($request->filled('company_id')) {
            $query->where('insurance_company_id', (int) $request->query('company_id'));
        }

        $this->scopeToSelf($request, $query);

        return $this->paginated(
            $request,
            $query->orderByDesc('id'),
            fn (PatientInsurance $insurance) => $this->shape($insurance)
        );
    }

    public function store(Request $request): JsonResponse
    {
        $patientId = $request->input('patient_id');

        $data = $request->validate([
            'patient_id' => ['required', 'integer', 'exists:patients,id'],
            'company_id' => ['required', 'integer', 'exists:insurance_companies,id'],
            'policy_number' => [
                'required', 'string', 'max:255',
                Rule::unique('patient_insurances', 'policy_number')->where('patient_id', $patientId),
            ],
            'holder_name' => ['nullable', 'string', 'max:255'],
            'coverage_percent' => ['required', 'numeric', 'between:0,100'],
            'coverage_limit' => ['nullable', 'numeric', 'min:0'],
            'start_date' => ['required', 'date'],
            'end_date' => ['nullable', 'date', 'after:start_date'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $insurance = PatientInsurance::create($this->map($data));

        AuditLogger::log('create', "Insurance policy {$insurance->policy_number} created", $insurance, null, $data);

        return $this->ok($this->shape($insurance->load(['patient', 'company'])));
    }

    public function update(Request $request, PatientInsurance $insurance): JsonResponse
    {
        $patientId = $request->input('patient_id', $insurance->patient_id);

        $data = $request->validate([
            'patient_id' => ['sometimes', 'required', 'integer', 'exists:patients,id'],
            'company_id' => ['sometimes', 'required', 'integer', 'exists:insurance_companies,id'],
            'policy_number' => [
                'sometimes', 'required', 'string', 'max:255',
                Rule::unique('patient_insurances', 'policy_number')
                    ->where('patient_id', $patientId)
                    ->ignore($insurance->id),
            ],
            'holder_name' => ['nullable', 'string', 'max:255'],
            'coverage_percent' => ['sometimes', 'required', 'numeric', 'between:0,100'],
            'coverage_limit' => ['nullable', 'numeric', 'min:0'],
            'start_date' => ['sometimes', 'required', 'date'],
            'end_date' => ['nullable', 'date', 'after:start_date'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $old = $insurance->only(array_keys($data));
        $insurance->update($this->map($data));

        AuditLogger::log('update', "Insurance policy {$insurance->policy_number} updated", $insurance, $old, $data);

        return $this->ok($this->shape($insurance->load(['patient', 'company'])));
    }

    private function map(array $data): array
    {
        if (array_key_exists('company_id', $data)) {
            $data['insurance_company_id'] = $data['company_id'];
        }

        unset($data['company_id']);

        return $data;
    }

    private function shape(PatientInsurance $insurance): array
    {
        return [
            'id' => $insurance->id,
            'patient' => Transform::patient($insurance->patient),
            'company' => $insurance->company ? [
                'id' => $insurance->company->id,
                'name' => $insurance->company->name,
                'code' => $insurance->company->code,
                'phone' => $insurance->company->phone,
                'email' => $insurance->company->email,
                'address' => $insurance->company->address,
                'is_active' => (bool) $insurance->company->is_active,
            ] : null,
            'policy_number' => $insurance->policy_number,
            'holder_name' => $insurance->holder_name,
            'coverage_percent' => (float) $insurance->coverage_percent,
            'coverage_limit' => $insurance->coverage_limit !== null ? (float) $insurance->coverage_limit : null,
            'start_date' => $this->date($insurance->start_date),
            'end_date' => $this->date($insurance->end_date),
            'is_active' => (bool) $insurance->is_active,
            'created_at' => $insurance->created_at?->toIso8601String(),
        ];
    }

    private function date(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }

        return $value instanceof Carbon ? $value->toDateString() : (string) $value;
    }
}
