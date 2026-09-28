<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Invoice {{ $invoice->invoice_number }}</title>
    <style>
        * { box-sizing: border-box; }
        body { font-family: DejaVu Sans, sans-serif; font-size: 12px; color: #1f2937; margin: 0; }
        .header { border-bottom: 3px solid #0f766e; padding-bottom: 12px; margin-bottom: 18px; }
        .logo { float: left; max-height: 56px; max-width: 56px; margin-right: 12px; }
        .clinic { font-size: 20px; font-weight: bold; color: #0f766e; margin: 0; }
        .clinic-meta { color: #6b7280; font-size: 11px; margin: 2px 0 0; }
        h2 { font-size: 16px; margin: 0 0 4px; text-transform: uppercase; letter-spacing: 1px; color: #0f766e; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
        th, td { border: 1px solid #d1d5db; padding: 6px 8px; text-align: left; vertical-align: top; }
        th { background: #f0fdfa; color: #115e59; font-size: 11px; text-transform: uppercase; }
        .right { text-align: right; }
        .meta { width: 45%; float: right; }
        .meta td { border: none; padding: 2px 0; }
        .meta .label { color: #6b7280; width: 40%; }
        .block { clear: both; overflow: hidden; margin-bottom: 14px; }
        .block-title { font-weight: bold; color: #0f766e; margin-bottom: 4px; font-size: 11px; text-transform: uppercase; }
        .totals { width: 45%; float: right; }
        .totals td { border: none; padding: 3px 0; }
        .totals .grand { font-size: 14px; font-weight: bold; border-top: 2px solid #0f766e; padding-top: 6px; }
        .badge { display: inline-block; padding: 2px 8px; border-radius: 3px; font-size: 10px; text-transform: uppercase; background: #f0fdfa; color: #0f766e; border: 1px solid #99f6e4; }
        .footer { clear: both; margin-top: 24px; border-top: 1px solid #d1d5db; padding-top: 10px; font-size: 10px; color: #6b7280; text-align: center; }
        .muted { color: #6b7280; }
    </style>
</head>
<body>
@php
    $logoData = null;
    if (!empty($hospital['logo'])) {
        $logoPath = public_path('storage/' . $hospital['logo']);
        if (is_file($logoPath)) {
            $extension = strtolower(pathinfo($logoPath, PATHINFO_EXTENSION));
            $mime = [
                'png' => 'image/png',
                'jpg' => 'image/jpeg',
                'jpeg' => 'image/jpeg',
                'gif' => 'image/gif',
                'svg' => 'image/svg+xml',
                'webp' => 'image/webp',
            ][$extension] ?? 'application/octet-stream';
            $logoData = 'data:' . $mime . ';base64,' . base64_encode((string) file_get_contents($logoPath));
        }
    }

    $money = fn ($value) => number_format((float) $value, 2);
    $patient = $invoice->patient;
@endphp

<div class="header">
    @if ($logoData)
        <img class="logo" src="{{ $logoData }}" alt="logo">
    @endif
    <p class="clinic">{{ $hospital['name'] ?? config('app.name', 'Hospital') }}</p>
    <p class="clinic-meta">
        @if (!empty($hospital['address'])) {{ $hospital['address'] }}<br>@endif
        @if (!empty($hospital['phone'])) Tel: {{ $hospital['phone'] }} &nbsp;@endif
        @if (!empty($hospital['email'])) Email: {{ $hospital['email'] }}@endif
    </p>
</div>

<div class="block">
    <table class="meta">
        <tr>
            <td class="label">Invoice Number</td>
            <td class="right"><strong>{{ $invoice->invoice_number }}</strong></td>
        </tr>
        <tr>
            <td class="label">Date Issued</td>
            <td class="right">{{ $invoice->created_at?->format('Y-m-d') }}</td>
        </tr>
        <tr>
            <td class="label">Status</td>
            <td class="right"><span class="badge">{{ strtoupper($invoice->status) }}</span></td>
        </tr>
        <tr>
            <td class="label">Issued By</td>
            <td class="right">{{ $invoice->issuer?->name ?? '—' }}</td>
        </tr>
    </table>

    <div class="block-title">Bill To</div>
    <p>
        <strong>{{ $patient ? trim($patient->first_name.' '.$patient->last_name) : '—' }}</strong><br>
        @if ($patient)
            <span class="muted">Patient #: {{ $patient->patient_number }}</span><br>
            <span class="muted">Phone: {{ $patient->phone ?? '—' }}</span><br>
            <span class="muted">Address: {{ $patient->address ?? '—' }}</span>
        @endif
    </p>
</div>

<h2>Invoice Items</h2>
<table>
    <thead>
        <tr>
            <th style="width: 5%;">#</th>
            <th style="width: 40%;">Description</th>
            <th style="width: 15%;">Type</th>
            <th style="width: 10%;" class="right">Qty</th>
            <th style="width: 15%;" class="right">Unit Price</th>
            <th style="width: 15%;" class="right">Total</th>
        </tr>
    </thead>
    <tbody>
        @forelse ($invoice->items as $index => $item)
            <tr>
                <td>{{ $index + 1 }}</td>
                <td>{{ $item->description }}</td>
                <td>{{ $item->item_type }}</td>
                <td class="right">{{ (int) $item->quantity }}</td>
                <td class="right">{{ $money($item->unit_price) }}</td>
                <td class="right">{{ $money($item->total) }}</td>
            </tr>
        @empty
            <tr>
                <td colspan="6" class="muted">No items on this invoice.</td>
            </tr>
        @endforelse
    </tbody>
</table>

<div class="block">
    <table class="totals">
        <tr>
            <td>Sub Total</td>
            <td class="right">{{ $money($invoice->sub_total) }}</td>
        </tr>
        <tr>
            <td>Discount</td>
            <td class="right">-{{ $money($invoice->discount) }}</td>
        </tr>
        <tr>
            <td>Tax</td>
            <td class="right">{{ $money($invoice->tax) }}</td>
        </tr>
        <tr class="grand">
            <td>Total ({{ $currency }})</td>
            <td class="right">{{ $money($invoice->total) }}</td>
        </tr>
        <tr>
            <td>Paid</td>
            <td class="right">{{ $money($invoice->paid_amount) }}</td>
        </tr>
        <tr>
            <td>Balance Due</td>
            <td class="right">{{ $money((float) $invoice->total - (float) $invoice->paid_amount) }}</td>
        </tr>
    </table>
</div>

@if ($invoice->relationLoaded('payments') && $invoice->payments->isNotEmpty())
    <div class="block-title">Payment History</div>
    <table>
        <thead>
            <tr>
                <th>Payment #</th>
                <th>Date</th>
                <th>Method</th>
                <th>Reference</th>
                <th class="right">Amount</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($invoice->payments as $payment)
                <tr>
                    <td>{{ $payment->payment_number }}</td>
                    <td>{{ $payment->paid_at?->format('Y-m-d') }}</td>
                    <td>{{ $payment->method }}</td>
                    <td>{{ $payment->reference ?? '—' }}</td>
                    <td class="right">{{ $money($payment->amount) }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>
@endif

@if ($invoice->notes)
    <div class="block-title">Notes</div>
    <p class="muted">{{ $invoice->notes }}</p>
@endif

<div class="footer">
    <p>Thank you for choosing {{ $hospital['name'] ?? config('app.name', 'Hospital') }}.</p>
    <p>This invoice was generated on {{ now()->format('Y-m-d H:i') }} and is computer generated.</p>
</div>
</body>
</html>
