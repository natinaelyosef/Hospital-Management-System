<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Prescription {{ $prescription->prescription_number }}</title>
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
        .block { clear: both; overflow: hidden; margin-bottom: 14px; }
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
    $patient = $prescription->patient;
    $doctor = $prescription->doctor;
    $doctorName = $doctor?->user?->name ?? $doctor->license_number ?? '—';
@endphp

<div class="header">
    <p class="clinic">{{ $hospital['name'] ?? config('app.name', 'Hospital') }}</p>
    <p class="clinic-meta">
        @if (!empty($hospital['address'])) {{ $hospital['address'] }}<br>@endif
        @if (!empty($hospital['phone'])) Tel: {{ $hospital['phone'] }} &nbsp;@endif
        @if (!empty($hospital['email'])) Email: {{ $hospital['email'] }}@endif
    </p>
</div>

<h2>Prescription {{ $prescription->prescription_number }}</h2>
<p class="muted">Status: <span class="badge">{{ strtoupper($prescription->status) }}</span>
&nbsp;·&nbsp; Date: {{ $prescription->created_at?->format('Y-m-d') }}</p>

<div class="block">
    <div class="block-title">Patient</div>
    <p>
        <strong>{{ $patient ? trim($patient->first_name.' '.$patient->last_name) : '—' }}</strong><br>
        @if ($patient)
            <span class="muted">Patient #: {{ $patient->patient_number }} · DOB: {{ $patient->date_of_birth }} · Phone: {{ $patient->phone ?? '—' }}</span><br>
            <span class="muted">Allergies: {{ $patient->allergies ?: 'No known allergies' }}</span>
        @endif
    </p>
    <div class="block-title">Prescriber</div>
    <p>{{ $doctorName }}@if($doctor?->specialization) ({{ $doctor->specialization }})@endif
        @if($doctor?->license_number)<span class="muted"> · License: {{ $doctor->license_number }}</span>@endif</p>
</div>

@if ($prescription->diagnosis)
    <div class="block-title">Diagnosis</div>
    <p>{{ $prescription->diagnosis }}</p>
@endif

<h2>Medicines &amp; cost</h2>
<table>
    <thead>
        <tr>
            <th style="width: 4%;">#</th>
            <th style="width: 20%;">Medicine</th>
            <th style="width: 10%;">Dosage</th>
            <th style="width: 11%;">Frequency</th>
            <th style="width: 8%;">Duration</th>
            <th style="width: 6%;">Qty</th>
            <th style="width: 11%;">Unit price</th>
            <th style="width: 11%;">Line total</th>
            <th style="width: 19%;">Instructions</th>
        </tr>
    </thead>
    <tbody>
        @php $medicineTotal = 0; @endphp
        @forelse ($prescription->items as $index => $item)
            @php
                $unit = (float) ($item->medicine?->selling_price ?? 0);
                $line = round($unit * (int) $item->quantity, 2);
                $medicineTotal += $line;
            @endphp
            <tr>
                <td>{{ $index + 1 }}</td>
                <td>{{ $item->medicine_name }}</td>
                <td>{{ $item->dosage }}</td>
                <td>{{ $item->frequency }}</td>
                <td>{{ $item->duration }}</td>
                <td>{{ (int) $item->quantity }}</td>
                <td style="text-align: right;">{{ number_format($unit, 2) }}</td>
                <td style="text-align: right;">{{ number_format($line, 2) }}</td>
                <td>{{ $item->instructions ?? '—' }}</td>
            </tr>
        @empty
            <tr><td colspan="9" class="muted">No items on this prescription.</td></tr>
        @endforelse
    </tbody>
    <tfoot>
        <tr>
            <th colspan="7" style="text-align: right;">Medicines subtotal</th>
            <th style="text-align: right;">{{ number_format($medicineTotal, 2) }}</th>
            <th></th>
        </tr>
    </tfoot>
</table>

@if ($invoice)
    <h2>Bill for the accountant</h2>
    <p class="muted">Invoice {{ $invoice->invoice_number }} · Status: <span class="badge">{{ strtoupper($invoice->status) }}</span></p>
    <table>
        <thead>
            <tr>
                <th style="width: 60%;">Description</th>
                <th style="width: 10%;">Type</th>
                <th style="width: 10%;">Qty</th>
                <th style="width: 20%;">Amount ({{ $currency }})</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($invoice->items as $line)
                <tr>
                    <td>{{ $line->description }}</td>
                    <td class="muted">{{ ucfirst($line->item_type) }}</td>
                    <td>{{ (int) $line->quantity }}</td>
                    <td style="text-align: right;">{{ number_format((float) $line->total, 2) }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>
    <table>
        <tr>
            <th style="width: 60%;">Sub total</th>
            <th style="width: 20%; text-align: right;">{{ number_format((float) $invoice->sub_total, 2) }}</th>
            <th style="width: 20%;"></th>
        </tr>
        <tr>
            <th>Discount</th>
            <th style="text-align: right;">{{ number_format((float) $invoice->discount, 2) }}</th>
            <th></th>
        </tr>
        <tr>
            <th>Tax</th>
            <th style="text-align: right;">{{ number_format((float) $invoice->tax, 2) }}</th>
            <th></th>
        </tr>
        <tr>
            <th>Total payable ({{ $currency }})</th>
            <th style="text-align: right;">{{ number_format((float) $invoice->total, 2) }}</th>
            <th></th>
        </tr>
        <tr>
            <th>Paid</th>
            <th style="text-align: right;">{{ number_format((float) $invoice->paid_amount, 2) }}</th>
            <th></th>
        </tr>
        <tr>
            <th>Balance due ({{ $currency }})</th>
            <th style="text-align: right;">{{ number_format((float) $invoice->total - (float) $invoice->paid_amount, 2) }}</th>
            <th></th>
        </tr>
    </table>
@else
    <div class="block-title">Amount payable</div>
    <p class="muted">
        Medicines subtotal {{ $currency }} {{ number_format($medicineTotal, 2) }}.
        Lab and consultation costs are added when the pharmacist prepares the bill for the accountant.
    </p>
@endif

@if ($prescription->notes)
    <div class="block-title">Notes</div>
    <p class="muted">{{ $prescription->notes }}</p>
@endif

<p class="muted">Dispensed by: {{ $prescription->dispenser?->name ?? '—' }}@if($prescription->dispensed_at) on {{ $prescription->dispensed_at }}@endif</p>

<div class="sig">
    <div>Doctor signature &amp; stamp</div>
    <div>Pharmacist signature</div>
</div>

<div class="footer">
    <p>Generated on {{ now()->format('Y-m-d H:i') }} — computer generated.</p>
</div>
</body>
</html>
