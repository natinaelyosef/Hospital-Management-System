import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2, Search, UserRound, X } from 'lucide-react'
import { patientApi } from '@/api/patient.api'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { useDebounce } from '@/hooks/useDebounce'
import type { Patient } from '@/types'
import { cn } from '@/utils/cn'

export interface PatientPickerProps {
  value: Patient | null
  onChange: (patient: Patient | null) => void
  label?: string
  error?: string
  disabled?: boolean
  placeholder?: string
  className?: string
}

export function PatientPicker({
  value,
  onChange,
  label = 'Patient',
  error,
  disabled = false,
  placeholder = 'Search by name, number or phone…',
  className,
}: PatientPickerProps) {
  const [term, setTerm] = useState('')
  const [open, setOpen] = useState(false)
  const container = useRef<HTMLDivElement>(null)
  const debounced = useDebounce(term.trim(), 350)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      if (container.current && !container.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open])

  const { data, isFetching } = useQuery({
    queryKey: ['patients', 'search', debounced],
    queryFn: () => patientApi.search(debounced),
    enabled: open && debounced.length >= 2,
    staleTime: 15_000,
  })

  const results = data ?? []

  if (value) {
    return (
      <FormField label={label} error={error} className={className}>
        <div className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2 shadow-xs">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <UserRound size={15} />
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-medium text-foreground">{value.full_name}</span>
            <span className="truncate text-[11px] text-muted-foreground">
              {value.patient_number}
              {value.phone ? ` · ${value.phone}` : ''}
            </span>
          </span>
          {!disabled && (
            <button
              type="button"
              aria-label="Clear patient"
              onClick={() => {
                onChange(null)
                setTerm('')
                setOpen(false)
              }}
              className="inline-flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </FormField>
    )
  }

  return (
    <FormField label={label} error={error} className={className}>
      <div ref={container} className="relative">
        <span className="relative block">
          <Search size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={term}
            disabled={disabled}
            placeholder={placeholder}
            onChange={(event) => {
              setTerm(event.target.value)
              setOpen(true)
            }}
            onFocus={() => setOpen(true)}
            className="pl-9"
          />
          {isFetching && (
            <Loader2
              size={14}
              className="absolute top-1/2 right-3 -translate-y-1/2 animate-spin text-muted-foreground"
            />
          )}
        </span>

        {open && debounced.length >= 2 && (
          <div className="absolute z-30 mt-1.5 max-h-64 w-full overflow-y-auto rounded-lg border bg-card py-1 shadow-lg">
            {!isFetching && results.length === 0 && (
              <p className="px-3 py-3 text-xs text-muted-foreground">No patients matched “{debounced}”.</p>
            )}
            {results.map((patient) => (
              <button
                key={patient.id}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onChange(patient)
                  setTerm('')
                  setOpen(false)
                }}
                className={cn(
                  'flex w-full cursor-pointer flex-col gap-0.5 px-3 py-2 text-left transition-colors hover:bg-muted/70',
                )}
              >
                <span className="truncate text-sm font-medium text-foreground">{patient.full_name}</span>
                <span className="truncate text-[11px] text-muted-foreground">
                  {patient.patient_number}
                  {patient.phone ? ` · ${patient.phone}` : ''}
                  {patient.age ? ` · ${patient.age} y` : ''}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </FormField>
  )
}

export default PatientPicker
