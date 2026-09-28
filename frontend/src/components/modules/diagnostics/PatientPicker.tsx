import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, X } from 'lucide-react'
import { patientApi } from '@/api/patient.api'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { useDebounce } from '@/hooks/useDebounce'
import type { Patient } from '@/types'
import { initials } from '@/utils/format'

export interface PatientPickerProps {
  value: Patient | null
  onChange: (patient: Patient | null) => void
  label?: string
  error?: string
  hint?: string
  disabled?: boolean
}

export function PatientPicker({ value, onChange, label = 'Patient', error, hint, disabled }: PatientPickerProps) {
  const [term, setTerm] = useState('')
  const [open, setOpen] = useState(false)
  const debounced = useDebounce(term, 350)
  const search = debounced.trim()

  const { data, isFetching } = useQuery({
    queryKey: ['patients-search', search],
    queryFn: () => patientApi.search(search),
    enabled: !value && search.length >= 2,
  })

  useEffect(() => {
    if (value) {
      setTerm('')
      setOpen(false)
    }
  }, [value])

  if (value) {
    return (
      <FormField label={label} error={error}>
        <div className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5 shadow-xs">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
            {initials(value.full_name)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{value.full_name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {value.patient_number} · {value.age} y · {value.gender} · {value.phone}
            </p>
          </div>
          <button
            type="button"
            aria-label="Clear selected patient"
            onClick={() => onChange(null)}
            className="inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X size={14} />
          </button>
        </div>
      </FormField>
    )
  }

  const results = data ?? []
  const showResults = open && search.length >= 2

  return (
    <FormField label={label} error={error} hint={hint ?? 'Type at least 2 characters to search.'}>
      <div className="relative">
        <Search size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" />
        <Input
          disabled={disabled}
          value={term}
          placeholder="Search by name, patient number or phone…"
          onChange={(event) => {
            setTerm(event.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          className="pl-9"
        />
        {showResults && (
          <div className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border bg-card shadow-lg">
            {isFetching ? (
              <p className="px-3 py-2.5 text-xs text-muted-foreground">Searching…</p>
            ) : results.length === 0 ? (
              <p className="px-3 py-2.5 text-xs text-muted-foreground">No patients found.</p>
            ) : (
              results.map((patient) => (
                <button
                  key={patient.id}
                  type="button"
                  onMouseDown={(event) => {
                    event.preventDefault()
                    onChange(patient)
                  }}
                  className="flex w-full cursor-pointer items-center gap-3 border-b px-3 py-2.5 text-left transition-colors last:border-b-0 hover:bg-muted/60"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-[11px] font-semibold text-accent-foreground">
                    {initials(patient.full_name)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-foreground">{patient.full_name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {patient.patient_number} · {patient.age} y · {patient.gender}
                    </span>
                  </span>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </FormField>
  )
}

export default PatientPicker
