import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, X } from 'lucide-react'
import { patientApi } from '@/api/patient.api'
import { Spinner } from '@/components/ui/Spinner'
import { useDebounce } from '@/hooks/useDebounce'
import type { Patient } from '@/types'
import { cn } from '@/utils/cn'
import { initials } from '@/utils/format'

export interface PatientPickerProps {
  value: Patient | null
  onChange: (patient: Patient | null) => void
  error?: string
  disabled?: boolean
  placeholder?: string
}

export function PatientPicker({ value, onChange, error, disabled, placeholder }: PatientPickerProps) {
  const [term, setTerm] = useState('')
  const [open, setOpen] = useState(false)
  const debounced = useDebounce(term, 300)

  const { data, isFetching, isError } = useQuery({
    queryKey: ['patients', 'search', debounced],
    queryFn: () => patientApi.search(debounced),
    enabled: !disabled && !value && debounced.trim().length >= 2,
    staleTime: 15_000,
    retry: 0,
  })

  const results = data ?? []

  return (
    <div className="flex flex-col gap-1.5">
      <div className="relative">
        {value ? (
          <div
            className={cn(
              'flex items-center gap-3 rounded-lg border bg-muted/40 px-3 py-2',
              error ? 'border-destructive/70' : 'border-input',
            )}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/12 text-xs font-semibold text-primary">
              {initials(value.full_name)}
            </span>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-medium text-foreground">{value.full_name}</span>
              <span className="truncate text-xs text-muted-foreground">
                {value.patient_number} · {value.phone}
              </span>
            </div>
            {!disabled && (
              <button
                type="button"
                aria-label="Clear selected patient"
                onClick={() => {
                  onChange(null)
                  setTerm('')
                }}
                className="inline-flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X size={14} />
              </button>
            )}
          </div>
        ) : (
          <>
            <Search
              size={15}
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="text"
              role="combobox"
              aria-expanded={open}
              aria-autocomplete="list"
              disabled={disabled}
              value={term}
              placeholder={placeholder ?? 'Type at least 2 characters to search patients…'}
              onChange={(event) => {
                setTerm(event.target.value)
                setOpen(event.target.value.trim().length >= 2)
              }}
              onFocus={() => setOpen(term.trim().length >= 2 && !value)}
              onBlur={() => window.setTimeout(() => setOpen(false), 120)}
              className={cn(
                'h-9.5 w-full rounded-lg border bg-card pr-9 pl-9 text-sm text-foreground shadow-xs transition-colors',
                'placeholder:text-muted-foreground/70',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:border-primary/60',
                'disabled:cursor-not-allowed disabled:opacity-60',
                error ? 'border-destructive/70' : 'border-input',
              )}
            />
            <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2">
              {isFetching && <Spinner size="sm" />}
            </span>
            {open && (
              <div className="absolute top-full right-0 left-0 z-40 mt-1 max-h-56 overflow-y-auto rounded-lg border bg-popover p-1 shadow-lg">
                {!isFetching && isError && (
                  <p className="px-3 py-4 text-center text-xs text-destructive">
                    Unable to search patients — you may lack permission.
                  </p>
                )}
                {!isFetching && !isError && results.length === 0 && (
                  <p className="px-3 py-4 text-center text-xs text-muted-foreground">No patients match “{term}”.</p>
                )}
                {results.map((patient) => (
                  <button
                    key={patient.id}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      onChange(patient)
                      setOpen(false)
                      setTerm('')
                    }}
                    className="flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-muted"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/12 text-[10px] font-semibold text-primary">
                      {initials(patient.full_name)}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-xs font-medium text-foreground">{patient.full_name}</span>
                      <span className="truncate text-[11px] text-muted-foreground">
                        {patient.patient_number} · {patient.phone} · {patient.gender}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      {error && <p role="alert" className="text-xs font-medium text-destructive">{error}</p>}
    </div>
  )
}

export default PatientPicker
