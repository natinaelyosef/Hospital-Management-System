<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\InsuranceCompany;
use App\Models\PatientInsurance;
use App\Models\InsuranceClaim;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class InsuranceController extends Controller
{
    public function indexCompanies()
    {
        return response()->json(['data' => InsuranceCompany::all()]);
    }

    public function storeCompany(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string',
            'code' => 'required|string|unique:insurance_companies',
            'phone' => 'nullable|string',
            'email' => 'nullable|email',
            'address' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        $company = InsuranceCompany::create($validator->validated());
        return response()->json(['data' => $company], 201);
    }

    public function attachInsurance(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'patient_id' => 'required|exists:patients,id',
            'insurance_company_id' => 'required|exists:insurance_companies,id',
            'policy_number' => 'required|string',
            'coverage_percent' => 'required|numeric|min:0|max:100',
            'start_date' => 'required|date',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        $insurance = PatientInsurance::create($validator->validated());
        return response()->json(['data' => $insurance], 201);
    }

    public function createClaim(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'invoice_id' => 'required|exists:invoices,id',
            'patient_insurance_id' => 'required|exists:patient_insurances,id',
            'amount' => 'required|numeric|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        $claimNumber = "CLM-" . date('Y') . "-" . str_pad(InsuranceClaim::count() + 1, 6, '0', STR_PAD_LEFT);

        $claim = InsuranceClaim::create([
            'claim_number' => $claimNumber,
            'invoice_id' => $request->invoice_id,
            'patient_insurance_id' => $request->patient_insurance_id,
            'amount' => $request->amount,
            'status' => 'draft',
        ]);

        return response()->json(['data' => $claim], 201);
    }

    public function updateClaimStatus(Request $request, $id)
    {
        $claim = InsuranceClaim::findOrFail($id);
        
        $validator = Validator::make($request->all(), [
            'status' => 'required|in:draft,submitted,approved,rejected,paid',
            'approved_amount' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Validation failed', 'errors' => $validator->errors()], 422);
        }

        $claim->update($validator->validated());
        return response()->json(['data' => $claim]);
    }
}
