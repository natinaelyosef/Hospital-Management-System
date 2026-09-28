import { useEffect, useRef, useState, type InputHTMLAttributes } from 'react'
import { Search, X } from 'lucide-react'
import { useDebounce } from '@/hooks/useDebounce'
import { cn } from '@/utils/cn'

export interface SearchInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  value: string
  onChange: (value: string) => void
  onDebouncedChange?: (value: string) => void
  debounceMs?: number
  className?: string
  containerClassName?: string
}

export function SearchInput({
  value,
  onChange,
  onDebouncedChange,
  debounceMs = 350,
  className,
  containerClassName,
  placeholder = 'Search…',
  ...rest
}: SearchInputProps) {
  const [local, setLocal] = useState(value)
  const debounced = useDebounce(local, debounceMs)

  useEffect(() => setLocal(value), [value])

  const debouncedRef = useRef(onDebouncedChange)
  useEffect(() => {
    debouncedRef.current = onDebouncedChange
  })
  useEffect(() => {
    debouncedRef.current?.(debounced)
  }, [debounced])

  return (
    <div className={cn('relative', containerClassName)}>
      <Search size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" />
      <input
        type="search"
        role="searchbox"
        value={local}
        placeholder={placeholder}
        onChange={(event) => {
          setLocal(event.target.value)
          onChange(event.target.value)
        }}
        className={cn(
          'h-9.5 w-full rounded-lg border border-input bg-card pr-8 pl-9 text-sm text-foreground shadow-xs transition-colors',
          'placeholder:text-muted-foreground/70',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:border-primary/60',
          '[&::-webkit-search-cancel-button]:hidden',
          className,
        )}
        {...rest}
      />
      {local && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => {
            setLocal('')
            onChange('')
          }}
          className="absolute top-1/2 right-2 inline-flex h-5 w-5 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X size={12} />
        </button>
      )}
    </div>
  )
}

export default SearchInput
