import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { searchApi, type SearchResults, type SearchScope } from '@/api/search.api'
import { useDebounce } from '@/hooks/useDebounce'
import { cn } from '@/utils/cn'

const SCOPE_LABELS: Record<SearchScope, string> = {
  patients: 'Patients',
  doctors: 'Doctors',
  appointments: 'Appointments',
  prescriptions: 'Prescriptions',
  lab_requests: 'Lab requests',
  admissions: 'Admissions',
  invoices: 'Invoices',
}

const SCOPE_ORDER: SearchScope[] = [
  'patients',
  'doctors',
  'appointments',
  'prescriptions',
  'lab_requests',
  'admissions',
  'invoices',
]

/**
 * Global advanced search — ID / name / phone / doctor / date / diagnosis
 * across every module, replacing the old patients-only header search.
 */
export function GlobalSearch() {
  const navigate = useNavigate()
  const [term, setTerm] = useState('')
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const debounced = useDebounce(term, 300)
  const boxRef = useRef<HTMLDivElement>(null)
  const query = debounced.trim()

  const { data, isFetching } = useQuery({
    queryKey: ['global-search', query],
    queryFn: () => searchApi.global(query),
    enabled: query.length >= 2,
    staleTime: 30_000,
  })

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  useEffect(() => {
    setHighlight(0)
    if (query.length >= 2) setOpen(true)
  }, [query])

  const groups = SCOPE_ORDER.flatMap((scope) => {
    const hits = (data as SearchResults | undefined)?.[scope] ?? []
    return hits.length > 0 ? [{ scope, hits }] : []
  })
  const flat = groups.flatMap((group) => group.hits.map((hit) => ({ ...hit, scope: group.scope })))
  const total = flat.length

  const go = (url: string) => {
    setOpen(false)
    setTerm('')
    void navigate(url)
  }

  const submitFallback = () => {
    const value = term.trim()
    if (!value) return
    setOpen(false)
    void navigate(`/patients?search=${encodeURIComponent(value)}`)
  }

  return (
    <div ref={boxRef} className="relative ml-auto hidden w-full max-w-xs md:block">
      <Search size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" />
      <input
        type="search"
        value={term}
        onChange={(event) => setTerm(event.target.value)}
        onFocus={() => query.length >= 2 && setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            if (open && flat[highlight]) go(flat[highlight].url)
            else submitFallback()
          } else if (event.key === 'ArrowDown') {
            event.preventDefault()
            setHighlight((value) => Math.min(value + 1, Math.max(total - 1, 0)))
          } else if (event.key === 'ArrowUp') {
            event.preventDefault()
            setHighlight((value) => Math.max(value - 1, 0))
          } else if (event.key === 'Escape') {
            setOpen(false)
          }
        }}
        placeholder="Search ID, name, phone, diagnosis…"
        aria-label="Global search"
        className="h-9 w-full rounded-lg border border-input bg-background pr-3 pl-9 text-sm text-foreground transition-colors placeholder:text-muted-foreground/70 focus-visible:border-primary/60 focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none"
      />
      {open && query.length >= 2 && (
        <div className="absolute top-10 right-0 left-0 z-50 max-h-96 overflow-y-auto rounded-xl border bg-card shadow-xl">
          {isFetching && total === 0 && (
            <p className="px-4 py-3 text-xs text-muted-foreground">Searching…</p>
          )}
          {!isFetching && total === 0 && (
            <div className="px-4 py-3">
              <p className="text-xs text-muted-foreground">No matches. Press Enter to search patients.</p>
            </div>
          )}
          {groups.map((group) => (
            <div key={group.scope} className="border-b py-1 last:border-0">
              <p className="px-4 pt-2 pb-1 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                {SCOPE_LABELS[group.scope]}
              </p>
              {group.hits.map((hit) => {
                const index = flat.findIndex((row) => row.url === hit.url && row.title === hit.title)
                return (
                  <Link
                    key={`${group.scope}-${hit.id}`}
                    to={hit.url}
                    onClick={(event) => {
                      event.preventDefault()
                      go(hit.url)
                    }}
                    onMouseEnter={() => setHighlight(index)}
                    className={cn(
                      'block px-4 py-1.5',
                      index === highlight && 'bg-muted',
                    )}
                  >
                    <span className="block truncate text-xs font-semibold text-foreground">{hit.title}</span>
                    <span className="block truncate text-[11px] text-muted-foreground">{hit.subtitle}</span>
                  </Link>
                )
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
