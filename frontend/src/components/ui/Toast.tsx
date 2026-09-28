import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { CircleAlert, CircleCheck, Info, X } from 'lucide-react'
import { cn } from '@/utils/cn'

export type ToastVariant = 'success' | 'error' | 'info'

export interface ToastOptions {
  title: string
  description?: string
  variant?: ToastVariant
  duration?: number
}

export interface ToastItem extends ToastOptions {
  id: string
  variant: ToastVariant
  duration: number
}

export interface ToastApi {
  (options: ToastOptions): string
  show: (options: ToastOptions) => string
  success: (title: string, description?: string) => string
  error: (title: string, description?: string) => string
  info: (title: string, description?: string) => string
  dismiss: (id: string) => void
}

const ToastContext = createContext<ToastApi | null>(null)
const ToastStoreContext = createContext<{ items: ToastItem[]; dismiss: (id: string) => void } | null>(null)

const variantStyles: Record<ToastVariant, { wrapper: string; icon: ReactNode }> = {
  success: {
    wrapper: 'border-emerald-500/35 bg-emerald-500/10',
    icon: <CircleCheck size={17} className="text-emerald-600 dark:text-emerald-400" />,
  },
  error: {
    wrapper: 'border-red-500/35 bg-red-500/10',
    icon: <CircleAlert size={17} className="text-red-600 dark:text-red-400" />,
  },
  info: {
    wrapper: 'border-sky-500/35 bg-sky-500/10',
    icon: <Info size={17} className="text-sky-600 dark:text-sky-400" />,
  },
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const dismiss = useCallback((id: string) => {
    setItems((current) => current.filter((item) => item.id !== id))
    const timer = timers.current[id]
    if (timer) {
      clearTimeout(timer)
      delete timers.current[id]
    }
  }, [])

  const show = useCallback(
    (options: ToastOptions) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const variant = options.variant ?? 'info'
      const duration = options.duration ?? (variant === 'error' ? 6000 : 4000)
      setItems((current) => [...current, { ...options, id, variant, duration }].slice(-4))
      timers.current[id] = setTimeout(() => dismiss(id), duration)
      return id
    },
    [dismiss],
  )

  const api = useMemo<ToastApi>(() => {
    const toast = (options: ToastOptions) => show(options)
    return Object.assign(toast, {
      show,
      success: (title: string, description?: string) => show({ title, description, variant: 'success' }),
      error: (title: string, description?: string) => show({ title, description, variant: 'error' }),
      info: (title: string, description?: string) => show({ title, description, variant: 'info' }),
      dismiss,
    })
  }, [show, dismiss])

  const store = useMemo(() => ({ items, dismiss }), [items, dismiss])

  return (
    <ToastContext.Provider value={api}>
      <ToastStoreContext.Provider value={store}>{children}</ToastStoreContext.Provider>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastApi {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used within ToastProvider')
  return context
}

export function Toaster() {
  const store = useContext(ToastStoreContext)
  if (!store || store.items.length === 0) return null

  return createPortal(
    <div
      aria-live="polite"
      aria-atomic="true"
      className="pointer-events-none fixed right-4 bottom-4 z-[60] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2.5"
    >
      {store.items.map((item) => (
        <div
          key={item.id}
          className={cn(
            'pointer-events-auto flex items-start gap-3 rounded-xl border bg-card p-3.5 shadow-lg animate-slide-up',
            variantStyles[item.variant].wrapper,
          )}
        >
          <span className="mt-0.5 shrink-0">{variantStyles[item.variant].icon}</span>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <p className="text-sm font-semibold text-foreground">{item.title}</p>
            {item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}
          </div>
          <button
            type="button"
            aria-label="Dismiss notification"
            onClick={() => store.dismiss(item.id)}
            className="inline-flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X size={13} />
          </button>
        </div>
      ))}
    </div>,
    document.body,
  )
}
