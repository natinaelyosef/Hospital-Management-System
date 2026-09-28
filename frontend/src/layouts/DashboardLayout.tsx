import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Bell,
  ChevronLeft,
  LogOut,
  Menu,
  Moon,
  Sun,
  User,
  X,
} from 'lucide-react'
import { notificationApi } from '@/api/notification.api'
import { miscApi } from '@/api/misc.api'
import { GlobalSearch } from '@/components/modules/clinical/GlobalSearch'

import { Dropdown } from '@/components/ui/Dropdown'
import { Spinner } from '@/components/ui/Spinner'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { PORTAL_CHOOSER } from '@/lib/portals'
import { formatDateTime, initials, setCurrency } from '@/utils/format'
import { cn } from '@/utils/cn'
import { pageTitle, visibleGroups, type NavItem } from './nav'

function NavItemLink({
  item,
  collapsed,
  onNavigate,
}: {
  item: NavItem
  collapsed: boolean
  onNavigate?: () => void
}) {
  return (
    <NavLink
      to={item.path}
      end={item.path === '/'}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          isActive
            ? 'bg-sidebar-accent text-primary'
            : 'text-sidebar-foreground hover:bg-sidebar-accent/70 hover:text-foreground',
          collapsed && 'justify-center px-0',
        )
      }
    >
      <item.icon size={17} className="shrink-0" />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </NavLink>
  )
}

function SidebarContent({
  user,
  collapsed,
  onNavigate,
  onToggleCollapse,
  showCollapseControl,
}: {
  user: ReturnType<typeof useAuth>['user']
  collapsed: boolean
  onNavigate?: () => void
  onToggleCollapse?: () => void
  showCollapseControl: boolean
}) {
  const groups = visibleGroups(user)

  return (
    <div className="flex h-full flex-col">
      <div className={cn('flex items-center gap-3 px-4 py-4', collapsed && 'justify-center px-0')}>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
          M
        </span>
        {!collapsed && (
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-semibold text-foreground">MediCare HMS</span>
            <span className="truncate text-[11px] text-muted-foreground">Hospital Management</span>
          </span>
        )}
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 pt-2 pb-4">
        {groups.map((group) => (
          <div key={group.id} className="space-y-1">
            {!collapsed && (
              <p className="px-3 pb-1 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                {group.label}
              </p>
            )}
            {collapsed && <div className="mx-3 border-t pb-2" />}
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavItemLink key={item.path} item={item} collapsed={collapsed} onNavigate={onNavigate} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {showCollapseControl && (
        <div className="border-t p-3">
          <button
            type="button"
            onClick={onToggleCollapse}
            className={cn(
              'flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground',
              collapsed && 'justify-center px-0',
            )}
          >
            <ChevronLeft size={16} className={cn('shrink-0 transition-transform', collapsed && 'rotate-180')} />
            {!collapsed && <span>Collapse sidebar</span>}
          </button>
        </div>
      )}
    </div>
  )
}

function NotificationBell() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const { data: unread = 0 } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => notificationApi.unreadCount(),
    refetchInterval: 60_000,
    retry: 0,
  })

  const { data: recent, isFetching } = useQuery({
    queryKey: ['notifications', 'recent'],
    queryFn: () => notificationApi.list({ per_page: 8 }),
    enabled: open,
    retry: 0,
  })

  const items = recent?.data ?? []

  return (
    <Dropdown
      align="right"
      menuClassName="w-80 p-0"
      onOpenChange={setOpen}
      trigger={
        <button
          type="button"
          aria-label={`Notifications${unread ? ` (${unread} unread)` : ''}`}
          className="relative inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Bell size={17} />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </button>
      }
    >
      <div className="flex items-center justify-between border-b px-3 py-2.5">
        <span className="text-xs font-semibold text-foreground">Notifications</span>
        <button
          type="button"
          onClick={async () => {
            await notificationApi.markAllRead()
            void navigate(0)
          }}
          className="cursor-pointer text-[11px] font-medium text-primary hover:underline"
        >
          Mark all read
        </button>
      </div>
      <div className="max-h-80 overflow-y-auto">
        {isFetching && items.length === 0 && (
          <div className="flex justify-center py-8">
            <Spinner size="sm" />
          </div>
        )}
        {!isFetching && items.length === 0 && (
          <p className="px-3 py-6 text-center text-xs text-muted-foreground">You are all caught up.</p>
        )}
        {items.map((notification) => (
          <button
            key={notification.id}
            type="button"
            onClick={async () => {
              if (!notification.read_at) await notificationApi.markRead(notification.id)
              if (notification.data.url) void navigate(notification.data.url)
              setOpen(false)
            }}
            className={cn(
              'flex w-full cursor-pointer flex-col gap-0.5 border-b px-3 py-2.5 text-left transition-colors last:border-b-0 hover:bg-muted/60',
              !notification.read_at && 'bg-primary/5',
            )}
          >
            <span className="text-xs font-medium text-foreground">{notification.data.title}</span>
            <span className="line-clamp-2 text-[11px] text-muted-foreground">{notification.data.body}</span>
            <span className="text-[10px] text-muted-foreground/70">{formatDateTime(notification.created_at)}</span>
          </button>
        ))}
      </div>
      <Link
        to="/notifications"
        onClick={() => setOpen(false)}
        className="block border-t px-3 py-2.5 text-center text-xs font-medium text-primary hover:underline"
      >
        View all notifications
      </Link>
    </Dropdown>
  )
}

export default function DashboardLayout() {
  const { user, logout } = useAuth()
  const { theme, toggle } = useTheme()
  const location = useLocation()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => setMobileOpen(false), [location.pathname])

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => miscApi.settings.get(),
    staleTime: Infinity,
    retry: 0,
  })

  useEffect(() => {
    if (settings?.currency) setCurrency(settings.currency)
  }, [settings])

  return (
    <div className="flex min-h-screen bg-background">
      <aside
        className={cn(
          'sticky top-0 hidden h-screen shrink-0 border-r bg-sidebar transition-[width] duration-200 lg:block',
          collapsed ? 'w-16' : 'w-64',
        )}
      >
        <SidebarContent
          user={user}
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((value) => !value)}
          showCollapseControl
        />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-950/50 animate-in-fade" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 border-r bg-sidebar shadow-2xl animate-in-fade">
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-3 inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
            >
              <X size={16} />
            </button>
            <SidebarContent user={user} collapsed={false} onNavigate={() => setMobileOpen(false)} showCollapseControl={false} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-card/85 px-4 backdrop-blur sm:px-6">
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setMobileOpen(true)}
            className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden"
          >
            <Menu size={18} />
          </button>

          <h1 className="shrink-0 text-sm font-semibold text-foreground sm:text-base">
            {pageTitle(location.pathname, user)}
          </h1>

          <GlobalSearch />

          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-pressed={theme === 'dark'}
              onClick={toggle}
              className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
            </button>

            <NotificationBell />

            <Dropdown
              align="right"
              menuClassName="w-56"
              trigger={
                <button
                  type="button"
                  className="ml-1 flex cursor-pointer items-center gap-2 rounded-lg py-1 pr-2 pl-1 transition-colors hover:bg-muted"
                >
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/12 text-xs font-semibold text-primary">
                    {initials(user?.name)}
                  </span>
                  <span className="hidden max-w-28 flex-col items-start leading-tight sm:flex">
                    <span className="truncate text-xs font-semibold text-foreground">{user?.name}</span>
                    <span className="truncate text-[10px] text-muted-foreground">{user?.role?.label}</span>
                  </span>
                </button>
              }
            >
              {(close) => (
                <div className="flex flex-col">
                  <div className="border-b px-3 py-2.5">
                    <p className="truncate text-xs font-semibold text-foreground">{user?.name}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{user?.email}</p>
                  </div>
                  <Link
                    to="/profile"
                    onClick={close}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-xs text-foreground hover:bg-muted"
                  >
                    <User size={14} /> Profile
                  </Link>
                  <button
                    type="button"
                    onClick={async () => {
                      close()
                      await logout()
                      // Back to the front-door chooser, so signing out of either
                      // portal never drops you on the wrong login page.
                      void navigate(PORTAL_CHOOSER)
                    }}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-xs text-destructive hover:bg-destructive/10"
                  >
                    <LogOut size={14} /> Sign out
                  </button>
                </div>
              )}
            </Dropdown>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>

        <footer className="border-t px-4 py-4 text-center text-[11px] text-muted-foreground sm:px-6">
          MediCare HMS - {new Date().getFullYear()} - care coordination, simplified.
        </footer>
      </div>
    </div>
  )
}

