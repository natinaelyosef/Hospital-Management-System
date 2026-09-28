import { type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { formatDistanceToNow, parseISO } from 'date-fns'
import {
  Bell,
  Boxes,
  CalendarDays,
  ClipboardCheck,
  FileText,
  FlaskConical,
  Hospital,
  Inbox,
  Pill,
  Receipt,
  ScrollText,
  Settings,
  ShieldCheck,
  UserCog,
  Users,
} from 'lucide-react'
import { getErrorMessage } from '@/api/client'
import { notificationApi } from '@/api/notification.api'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { Pagination } from '@/components/ui/Pagination'
import { Spinner } from '@/components/ui/Spinner'
import { useToast } from '@/components/ui/Toast'
import { usePagination } from '@/hooks/usePagination'
import { cn } from '@/utils/cn'

function notificationIcon(type: string): ReactNode {
  const key = type.toLowerCase().replace(/[^a-z]/g, '')
  if (key.includes('appointment') || key.includes('calendar')) return <CalendarDays size={16} />
  if (key.includes('lab') || key.includes('result') || key.includes('test')) return <FlaskConical size={16} />
  if (key.includes('prescription') || key.includes('pharmacy') || key.includes('medicine')) return <Pill size={16} />
  if (key.includes('admission') || key.includes('discharge') || key.includes('ward') || key.includes('bed'))
    return <Hospital size={16} />
  if (key.includes('invoice') || key.includes('billing') || key.includes('payment')) return <Receipt size={16} />
  if (key.includes('insurance') || key.includes('claim')) return <ShieldCheck size={16} />
  if (key.includes('stock') || key.includes('inventory') || key.includes('expir')) return <Boxes size={16} />
  if (key.includes('patient')) return <Users size={16} />
  if (key.includes('user') || key.includes('role') || key.includes('account')) return <UserCog size={16} />
  if (key.includes('audit') || key.includes('system')) return <ScrollText size={16} />
  if (key.includes('visit') || key.includes('consultation')) return <ClipboardCheck size={16} />
  if (key.includes('setting')) return <Settings size={16} />
  if (key.includes('document') || key.includes('file')) return <FileText size={16} />
  return <Bell size={16} />
}

export default function NotificationsPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const queryClient = useQueryClient()
  const { setPage, query } = usePagination()

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['notifications', 'page', query],
    queryFn: () => notificationApi.list(query),
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: true,
  })

  const items = data?.data ?? []
  const unread = items.filter((item) => !item.read_at).length

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['notifications'] })
  }

  const readAll = useMutation({
    mutationFn: () => notificationApi.markAllRead(),
    onSuccess: async () => {
      await invalidate()
      toast.success('All caught up', 'Notifications marked as read')
    },
    onError: (caught) => toast.error('Unable to mark all as read', getErrorMessage(caught)),
  })

  const readOne = useMutation({
    mutationFn: (id: number) => notificationApi.markRead(id),
    onSuccess: () => void invalidate(),
    onError: (caught) => toast.error('Unable to mark as read', getErrorMessage(caught)),
  })

  const open = (id: number, url?: string) => {
    readOne.mutate(id)
    if (url) void navigate(url)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        subtitle={unread > 0 ? `${unread} unread update${unread === 1 ? '' : 's'}` : 'You are all caught up'}
        actions={
          <Button
            variant="outline"
            icon={<Inbox size={15} />}
            disabled={unread === 0 || readAll.isPending}
            loading={readAll.isPending}
            onClick={() => readAll.mutate()}
          >
            Mark all as read
          </Button>
        }
      />

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Bell size={22} />}
          title="No notifications"
          description="Alerts about appointments, labs, stock and billing will show up here."
        />
      ) : (
        <div className="divide-y divide-border overflow-hidden rounded-xl border bg-card shadow-xs">
          {items.map((notification) => {
            const isRead = Boolean(notification.read_at)
            return (
              <div
                key={notification.id}
                className={cn(
                  'relative flex items-start gap-3 px-4 py-3.5 transition-colors',
                  !isRead && 'bg-primary/[0.06]',
                )}
              >
                <span
                  aria-hidden
                  className={cn('absolute inset-y-0 left-0 w-0.5 transition-colors', isRead ? 'bg-transparent' : 'bg-primary')}
                />
                <span
                  className={cn(
                    'mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                    isRead ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary',
                  )}
                >
                  {notificationIcon(notification.type)}
                </span>

                <button
                  type="button"
                  onClick={() => open(notification.id, notification.data.url)}
                  className="min-w-0 flex-1 cursor-pointer text-left"
                >
                  <span className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-foreground">{notification.data.title}</span>
                    {!isRead && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
                  </span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                    {notification.data.body}
                  </span>
                  <span className="mt-1 block text-[11px] text-muted-foreground/70">
                    {formatDistanceToNow(parseISO(notification.created_at), { addSuffix: true })}
                  </span>
                </button>

                <div className="flex shrink-0 items-center gap-2">
                  {!isRead && (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={readOne.isPending}
                      onClick={() => readOne.mutate(notification.id)}
                    >
                      Mark read
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {data && <Pagination meta={data.meta} onPageChange={setPage} disabled={isFetching} />}
    </div>
  )
}
