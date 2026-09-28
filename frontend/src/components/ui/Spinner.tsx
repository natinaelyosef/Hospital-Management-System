import { cn } from '@/utils/cn'

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClasses = { sm: 'h-4 w-4 border-2', md: 'h-6 w-6 border-2', lg: 'h-9 w-9 border-[3px]' } as const

export function Spinner({ size = 'md', className }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn(
        'inline-block animate-spin rounded-full border-primary border-t-transparent',
        sizeClasses[size],
        className,
      )}
    />
  )
}

export interface SkeletonProps {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return <span className={cn('block animate-pulse rounded-md bg-muted', className)} />
}

export interface PageLoaderProps {
  label?: string
  className?: string
}

export function PageLoader({ label = 'Loading…', className }: PageLoaderProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 py-24 text-muted-foreground', className)}>
      <Spinner size="lg" />
      <p className="text-sm">{label}</p>
    </div>
  )
}

export default Spinner
