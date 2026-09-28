<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Discharge Summary {{ $admission->admission_number }}</title>
    <style>
        * { box-sizing: border-box; }
        body { font-family: DejaVu Sans, sans-serif; font-size: 12px; color: #1f2937; margin: 0; }
        .header { border-bottom: 3px solid #0f766e; padding-bottom: 12px; margin-bottom: 18px; }
        .clinic { font-size: 20px; font-weight: bold; color: #0f766e; margin: 0; }
        .clinic-meta { color: #6b7280; font-size: 11px; margin: 2px 0 0; }
        h2 { font-size: 16px; margin: 0 0 4px; text-transform: uppercase; letter-spacing: 1px; color: #0f766e; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
        th, td { border: 1px solid #d1d5db; padding: 6px 8px; text-align: left; vertical-align: top; }
        th { background: #f0fdfa; color: #115e59; font-size: 11px; text-transform: uppercase; width: 30%; }
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
@php
    $patient = $admission->patient;
    $days = $admission->admitted_at ? (int) \Carbon\Carbon::parse($admission->admitted_at)->diffInDays($admission->discharged_at ?? now()) + 1 : 1;
@endphp

<div class="header">
    <p class="clinic">{{ $hospital['name'] ?? config('app.name', 'Hospital') }}</p>
    <p class="clinic-meta">
        @if (!empty($hospital['address'])) {{ $hospital['address'] }}<br>@endif
        @if (!empty($hospital['phone'])) Tel: {{ $hospital['phone'] }} &nbsp;@endif
        @if (!empty($hospital['email'])) Email: {{ $hospital['email'] }}@endif
    </p>
</div>

<h2>Discharge Summary {{ $admission->admission_number }}</h2>
<p class="muted">Status: <span class="badge">{{ strtoupper($admission->status) }}</span>
@if($admission->outcome)&nbsp;·&nbsp; Outcome: {{ ucfirst(str_replace('_', ' ', $admission->outcome)) }}@endif</p>

<table>
    <tr><th>Patient</th><td><strong>{{ $patient ? trim($patient->first_name.' '.$patient->last_name) : '—' }}</strong>
        @if ($patient)<br><span class="muted">{{ $patient->patient_number }} · DOB: {{ $patient->date_of_birth }} · {{ $patient->phone ?? '—' }}</span>@endif</td></tr>
    <tr><th>Ward / Room / Bed</th><td>{{ $admission->ward?->name ?? '—' }} / {{ $admission->room?->room_number ?? '—' }} / {{ $admission->bed?->bed_number ?? '—' }}</td></tr>
    <tr><th>Consultant</th><td>{{ $admission->consultant?->user?->name ?? '—' }}</td></tr>
    <tr><th>Admitted</th><td>{{ $admission->admitted_at }} (by {{ $admission->admittedBy?->name ?? '—' }})</td></tr>
    <tr><th>Discharged</th><td>{{ $admission->discharged_at ?? '—' }} (by {{ $admission->dischargedBy?->name ?? '—' }})</td></tr>
    <tr><th>Length of stay</th><td>{{ $days }} day(s)</td></tr>
    <tr><th>Diagnosis</th><td>{{ $admission->diagnosis ?? '—' }}</td></tr>
</table>

<div class="block-title">Discharge summary</div>
<p>{{ $admission->discharge_summary ?: '—' }}</p>

<div class="sig">
    <div>Consultant signature &amp; stamp</div>
    <div>Patient / guardian signature</div>
</div>

<div class="footer">
    <p>Generated on {{ now()->format('Y-m-d H:i') }} — computer generated.</p>
</div>
</body>
</html>
