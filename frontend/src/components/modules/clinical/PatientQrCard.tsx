import { QRCodeSVG } from 'qrcode.react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import type { Patient } from '@/types'

/**
 * QR Patient ID card — encodes the hospital patient number so front-desk
 * staff can scan a wristband / card and jump straight to this record.
 */
export function PatientQrCard({ patient }: { patient: Patient }) {
  const payload = JSON.stringify({
    v: 1,
    patient_number: patient.patient_number,
    name: patient.full_name,
    dob: patient.date_of_birth,
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Patient ID QR</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center gap-4">
        <div className="rounded-lg border bg-white p-2">
          <QRCodeSVG value={payload} size={112} level="M" role="img" aria-label={`QR code for ${patient.patient_number}`} />
        </div>
        <div className="flex min-w-0 flex-col gap-1 text-sm">
          <span className="font-mono font-semibold text-foreground">{patient.patient_number}</span>
          <span className="truncate text-muted-foreground">{patient.full_name}</span>
          <span className="text-xs text-muted-foreground">Scan to identify this patient at reception, triage or pharmacy.</span>
        </div>
      </CardContent>
    </Card>
  )
}
