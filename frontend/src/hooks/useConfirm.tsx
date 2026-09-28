import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

export interface ConfirmOptions {
  title: string
  message?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'default' | 'destructive'
}

export type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>

const ConfirmContext = createContext<ConfirmFn | null>(null)

interface PendingConfirm {
  options: ConfirmOptions
  resolve: (value: boolean) => void
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null)
  const pendingRef = useRef<PendingConfirm | null>(null)

  useEffect(() => {
    pendingRef.current = pending
  }, [pending])

  const confirm = useCallback<ConfirmFn>(
    (options) =>
      new Promise<boolean>((resolve) => {
        const next = { options, resolve }
        pendingRef.current?.resolve(false)
        pendingRef.current = next
        setPending(next)
      }),
    [],
  )

  const settle = useCallback((value: boolean) => {
    pendingRef.current?.resolve(value)
    pendingRef.current = null
    setPending(null)
  }, [])

  const value = useMemo(() => confirm, [confirm])

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <ConfirmDialog
        open={pending !== null}
        title={pending?.options.title ?? ''}
        message={pending?.options.message}
        confirmLabel={pending?.options.confirmLabel}
        cancelLabel={pending?.options.cancelLabel}
        tone={pending?.options.tone}
        onConfirm={() => settle(true)}
        onCancel={() => settle(false)}
      />
    </ConfirmContext.Provider>
  )
}

/** `const confirm = useConfirm(); if (await confirm({ title: 'Delete?' })) …` */
export function useConfirm(): ConfirmFn {
  const context = useContext(ConfirmContext)
  if (!context) throw new Error('useConfirm must be used within ConfirmProvider')
  return context
}
