import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/utils/cn'

export interface DropdownProps {
  trigger: ReactNode
  children: ReactNode | ((close: () => void) => ReactNode)
  align?: 'left' | 'right'
  className?: string
  menuClassName?: string
  onOpenChange?: (open: boolean) => void
}

export function Dropdown({
  trigger,
  children,
  align = 'left',
  className,
  menuClassName,
  onOpenChange,
}: DropdownProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const onOpenChangeRef = useRef(onOpenChange)

  useEffect(() => {
    onOpenChangeRef.current = onOpenChange
  })

  const change = (next: boolean) => {
    setOpen(next)
    onOpenChangeRef.current?.(next)
  }

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) change(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') change(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const close = () => change(false)

  return (
    <div className={cn('relative inline-block', className)} ref={containerRef}>
      <span
        className="inline-flex"
        onClick={(event) => {
          event.stopPropagation()
          change(!open)
        }}
      >
        {trigger}
      </span>
      {open && (
        <div
          className={cn(
            'absolute z-40 mt-2 min-w-52 overflow-hidden rounded-xl border bg-popover p-1 text-popover-foreground shadow-lg animate-in-zoom',
            align === 'right' ? 'right-0' : 'left-0',
            menuClassName,
          )}
        >
          {typeof children === 'function' ? children(close) : children}
        </div>
      )}
    </div>
  )
}

export default Dropdown
