import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/utils/cn'

/**
 * Fades and lifts its children into view once, when they first scroll into
 * the viewport. Used on the public home pages so long pages feel paced
 * instead of arriving as one flat wall.
 *
 * Content is visible by default if IntersectionObserver is unavailable, and
 * the `prefers-reduced-motion` setting is respected.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  as: Tag = 'div',
}: {
  children: ReactNode
  className?: string
  /** Stagger in milliseconds. */
  delay?: number
  as?: 'div' | 'li' | 'section'
}) {
  const ref = useRef<HTMLElement | null>(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    if (typeof IntersectionObserver === 'undefined') {
      setShown(true)
      return
    }

    // Anything already on screen at mount should not wait for a scroll.
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShown(true)
            observer.disconnect()
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return (
    <Tag
      ref={ref as never}
      style={shown && delay ? { transitionDelay: `${delay}ms` } : undefined}
      className={cn(
        'transition-all duration-500 ease-out motion-reduce:transition-none',
        shown ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0',
        className,
      )}
    >
      {children}
    </Tag>
  )
}
