<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Lab Report {{ $request->request_number }}</title>
    <style>
        * { box-sizing: border-box; }
        body { font-family: DejaVu Sans, sans-serif; font-size: 12px; color: #1f2937; margin: 0; }
        .header { border-bottom: 3px solid #0f766e; padding-bottom: 12px; margin-bottom: 18px; }
        .clinic { font-size: 20px; font-weight: bold; color: #0f766e; margin: 0; }
        .clinic-meta { color: #6b7280; font-size: 11px; margin: 2px 0 0; }
        h2 { font-size: 16px; margin: 0 0 4px; text-transform: uppercase; letter-spacing: 1px; color: #0f766e; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
        th, td { border: 1px solid #d1d5db; padding: 6px 8px; text-align: left; vertical-align: top; }
        th { background: #f0fdfa; color: #115e59; font-size: 11px; text-transform: uppercase; }
        .block-title { font-weight: bold; color: #0f766e; margin-bottom: 4px; font-size: 11px; text-transform: uppercase; }
        .badge { display: inline-block; padding: 2px 8px; border-radius: 3px; font-size: 10px; text-transform: uppercase; background: #f0fdfa; color: #0f766e; border: 1px solid #99f6e4; }
        .footer { clear: both; margin-top: 24px; border-top: 1px solid #d1d5db; padding-top: 10px; font-size: 10px; color: #6b7280; text-align: center; }
        .muted { color: #6b7280; }
        .sig { margin-top: 40px; overflow: hidden; }
        .sig div { width: 45%; float: left; border-top: 1px solid #1f2937; padding-top: 4px; font-size: 11px; }
        .sig div:last-child { float: right; text-align: right; }
    </style>
</head>
<body>
@php $patient = $request->patient; @endphp

<div class="header">
    <p class="clinic">{{ $hospital['name'] ?? config('app.name', 'Hospital') }}</p>
    <p class="clinic-meta">
        @if (!empty($hospital['address'])) {{ $hospital['address'] }}<br>@endif
        @if (!empty($hospital['phone'])) Tel: {{ $hospital['phone'] }} &nbsp;@endif
        @if (!empty($hospital['email'])) Email: {{ $hospital['email'] }}@endif
    </p>
</div>

<h2>Laboratory Report {{ $request->request_number }}</h2>
<p class="muted">Status: <span class="badge">{{ strtoupper($request->status) }}</span>
&nbsp;·&nbsp; Priority: {{ strtoupper($request->priority) }}
&nbsp;·&nbsp; Requested: {{ $request->requested_at }}</p>

<div class="block-title">Patient</div>
<p><strong>{{ $patient ? trim($patient->first_name.' '.$patient->last_name) : '—' }}</strong><br>
@if ($patient)<span class="muted">Patient #: {{ $patient->patient_number }} · DOB: {{ $patient->date_of_birth }} · Phone: {{ $patient->phone ?? '—' }}</span>@endif</p>

<div class="block-title">Requesting doctor</div>
<p>{{ $request->doctor?->user?->name ?? '—' }}</p>

@if ($request->notes)
    <div class="block-title">Clinical notes</div>
    <p class="muted">{{ $request->notes }}</p>
@endif

<h2>Results</h2>
<table>
    <thead>
        <tr>
            <th style="width: 5%;">#</th>
            <th style="width: 25%;">Test</th>
            <th style="width: 20%;">Result</th>
            <th style="width: 18%;">Reference range</th>
            <th style="width: 10%;">Unit</th>
            <th style="width: 22%;">Notes</th>
        </tr>
    </thead>
    <tbody>
        @forelse ($request->results as $index => $result)
            <tr>
                <td>{{ $index + 1 }}</td>
                <td>{{ $result->test?->name ?? 'Test #'.$result->lab_test_id }}<br><span class="muted">{{ $result->test?->code }}</span></td>
                <td><strong>{{ $result->result_value ?? 'Pending' }}</strong></td>
                <td>{{ $result->reference_range ?? '—' }}</td>
                <td>{{ $result->unit ?? '—' }}</td>
                <td>{{ $result->notes ?? '—' }}</td>
            </tr>
        @empty
            <tr><td colspan="6" class="muted">No tests on this request.</td></tr>
        @endforelse
    </tbody>
</table>

<div class="sig">
    <div>Laboratory technician signature</div>
    <div>Doctor signature</div>
</div>

<div class="footer">
    <p>Generated on {{ now()->format('Y-m-d H:i') }} — computer generated.</p>
</div>
</body>
</html>
