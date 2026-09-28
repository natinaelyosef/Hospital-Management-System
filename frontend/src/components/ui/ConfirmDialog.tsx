import type { ReactNode } from 'react'
import { Modal } from './Modal'
import { Button } from './Button'

export interface ConfirmDialogProps {
  open: boolean
  title: string
  message?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'default' | 'destructive'
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'default',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onCancel} size="sm" title={title}>
      {message && <div className="text-sm leading-relaxed text-muted-foreground">{message}</div>}
      <div className="mt-5 flex justify-end gap-2.5">
        <Button variant="outline" size="md" onClick={onCancel} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button
          variant={tone === 'destructive' ? 'destructive' : 'primary'}
          size="md"
          onClick={onConfirm}
          loading={loading}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  )
}

export default ConfirmDialog
