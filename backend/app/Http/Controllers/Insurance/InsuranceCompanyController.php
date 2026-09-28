<?php

namespace App\Http\Controllers\Insurance;

use App\Http\Controllers\Controller;
use App\Models\InsuranceCompany;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class InsuranceCompanyController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = InsuranceCompany::query()->withCount('patientInsurances as patients_count');

        $search = trim((string) $request->query('search'));
        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%");
            });
        }

        return $this->paginated(
            $request,
            $query->orderBy('name'),
            fn (InsuranceCompany $company) => $this->shape($company)
        );
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'code' => ['required', 'string', 'max:255', Rule::unique('insurance_companies', 'code')],
            'phone' => ['nullable', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'address' => ['nullable', 'string', 'max:255'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $company = InsuranceCompany::create($data);

        AuditLogger::log('create', "Insurance company {$company->name} created", $company, null, $data);

        return $this->ok($this->shape($company));
    }

    public function update(Request $request, InsuranceCompany $company): JsonResponse
    {
        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'code' => ['sometimes', 'required', 'string', 'max:255', Rule::unique('insurance_companies', 'code')->ignore($company->id)],
            'phone' => ['nullable', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'address' => ['nullable', 'string', 'max:255'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $old = $company->only(array_keys($data));
        $company->update($data);

        AuditLogger::log('update', "Insurance company {$company->name} updated", $company, $old, $data);

        return $this->ok($this->shape($company));
    }

    public function destroy(InsuranceCompany $company): JsonResponse
    {
        $old = ['id' => $company->id, 'name' => $company->name, 'code' => $company->code];
        $company->delete();

        AuditLogger::log('delete', "Insurance company {$old['name']} deleted", $company, $old);

        return $this->message('Insurance company deleted successfully.');
    }

    private function shape(InsuranceCompany $company): array
    {
        return [
            'id' => $company->id,
            'name' => $company->name,
            'code' => $company->code,
            'phone' => $company->phone,
            'email' => $company->email,
            'address' => $company->address,
            'is_active' => (bool) $company->is_active,
            'patients_count' => (int) ($company->patients_count ?? 0),
            'created_at' => $company->created_at?->toIso8601String(),
        ];
    }
}
