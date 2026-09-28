<?php

namespace App\Http\Controllers;

use App\Http\Transformers\Transform;
use App\Models\Admission;
use App\Models\Appointment;
use App\Models\Doctor;
use App\Models\Invoice;
use App\Models\LabRequest;
use App\Models\Patient;
use App\Models\Prescription;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SearchController extends Controller
{
    /**
     * Global advanced search across patients, doctors, appointments,
     * visits, prescriptions, lab requests, admissions and invoices.
     *
     * GET /search?q=...&scope=patients,doctors,... (scope optional, max 8 groups x 6 hits)
     */
    public function index(Request $request): JsonResponse
    {
        $data = $request->validate([
            'q' => ['required', 'string', 'min:2', 'max:100'],
            'scope' => ['nullable', 'string', 'max:255'],
        ]);

        $q = trim($data['q']);
        $scopes = $data['scope'] ?? null;
        $wanted = $scopes ? collect(explode(',', $scopes))->map(fn ($s) => trim($s))->filter()->all() : null;

        $like = "%{$q}%";
        $out = [];

        $include = fn (string $scope) => $wanted === null || in_array($scope, $wanted, true);

        if ($include('patients')) {
            $rows = Patient::query()
                ->where(fn ($w) => $w->where('patient_number', 'like', $like)
                    ->orWhere('first_name', 'like', $like)
                    ->orWhere('last_name', 'like', $like)
                    ->orWhere('phone', 'like', $like)
                    ->orWhereRaw("concat(first_name, ' ', last_name) like ?", [$like]))
                ->orderByDesc('id')->limit(6)->get();
            $out['patients'] = $rows->map(fn (Patient $p) => [
                'id' => $p->id,
                'title' => trim($p->first_name.' '.$p->last_name),
                'subtitle' => $p->patient_number.' · '.$p->phone,
                'url' => "/patients/{$p->id}",
            ])->all();
        }

        if ($include('doctors')) {
            $rows = Doctor::query()->with('user')
                ->where(fn ($w) => $w->where('license_number', 'like', $like)
                    ->orWhere('specialization', 'like', $like)
                    ->orWhereHas('user', fn ($u) => $u->where('name', 'like', $like)))
                ->orderByDesc('id')->limit(6)->get();
            $out['doctors'] = $rows->map(fn (Doctor $d) => [
                'id' => $d->id,
                'title' => $d->user?->name ?? $d->license_number,
                'subtitle' => trim(($d->specialization ?? '').' · '.$d->license_number),
                'url' => '/admin/doctors',
            ])->all();
        }

        if ($include('appointments')) {
            $rows = Appointment::query()->with(['patient', 'doctor.user'])
                ->where(fn ($w) => $w->where('appointment_number', 'like', $like)
                    ->orWhere('reason', 'like', $like)
                    ->orWhere('notes', 'like', $like)
                    ->orWhereHas('patient', fn ($p) => $p->where('first_name', 'like', $like)->orWhere('last_name', 'like', $like)))
                ->orderByDesc('id')->limit(6)->get();
            $out['appointments'] = $rows->map(fn (Appointment $a) => [
                'id' => $a->id,
                'title' => $a->appointment_number,
                'subtitle' => trim(($a->patient ? $a->patient->first_name.' '.$a->patient->last_name : '').' · '.$a->appointment_date),
                'url' => '/appointments',
            ])->all();
        }

        if ($include('prescriptions')) {
            $rows = Prescription::query()->with('patient')
                ->where(fn ($w) => $w->where('prescription_number', 'like', $like)
                    ->orWhere('diagnosis', 'like', $like))
                ->orderByDesc('id')->limit(6)->get();
            $out['prescriptions'] = $rows->map(fn (Prescription $r) => [
                'id' => $r->id,
                'title' => $r->prescription_number,
                'subtitle' => $r->patient ? trim($r->patient->first_name.' '.$r->patient->last_name) : '',
                'url' => "/prescriptions/{$r->id}",
            ])->all();
        }

        if ($include('lab_requests')) {
            $rows = LabRequest::query()->with('patient')
                ->where(fn ($w) => $w->where('request_number', 'like', $like))
                ->orderByDesc('id')->limit(6)->get();
            $out['lab_requests'] = $rows->map(fn (LabRequest $r) => [
                'id' => $r->id,
                'title' => $r->request_number,
                'subtitle' => $r->patient ? trim($r->patient->first_name.' '.$r->patient->last_name) : '',
                'url' => "/laboratory/requests/{$r->id}",
            ])->all();
        }

        if ($include('admissions')) {
            $rows = Admission::query()->with('patient')
                ->where(fn ($w) => $w->where('admission_number', 'like', $like)
                    ->orWhere('diagnosis', 'like', $like))
                ->orderByDesc('id')->limit(6)->get();
            $out['admissions'] = $rows->map(fn (Admission $a) => [
                'id' => $a->id,
                'title' => $a->admission_number,
                'subtitle' => $a->patient ? trim($a->patient->first_name.' '.$a->patient->last_name) : '',
                'url' => "/wards/admissions/{$a->id}",
            ])->all();
        }

        if ($include('invoices')) {
            $rows = Invoice::query()->with('patient')
                ->where(fn ($w) => $w->where('invoice_number', 'like', $like))
                ->orderByDesc('id')->limit(6)->get();
            $out['invoices'] = $rows->map(fn (Invoice $i) => [
                'id' => $i->id,
                'title' => $i->invoice_number,
                'subtitle' => $i->patient ? trim($i->patient->first_name.' '.$i->patient->last_name) : '',
                'url' => "/billing/invoices/{$i->id}",
            ])->all();
        }

        // Patient-portal users only see their own patient hit.
        if ($this->isPatientPortal($request) && isset($out['patients'])) {
            $pid = $this->portalPatientId($request);
            $out['patients'] = array_values(array_filter($out['patients'], fn ($r) => $r['id'] === $pid));
        }

        return $this->ok($out);
    }
}
