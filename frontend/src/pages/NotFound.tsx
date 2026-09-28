import { Link } from 'react-router-dom'
import { ArrowLeft, SearchX } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-6 text-center">
      <div className="page-noise pointer-events-none absolute inset-0 opacity-60" />
      <div className="relative z-10 flex flex-col items-center gap-5">
        <span className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <SearchX size={28} />
        </span>
        <p className="text-6xl font-bold tracking-tight text-foreground">404</p>
        <div className="flex flex-col gap-1.5">
          <h1 className="text-lg font-semibold text-foreground">Page not found</h1>
          <p className="max-w-sm text-sm text-muted-foreground">
            The page you are looking for does not exist, was moved, or you do not have access to it.
          </p>
        </div>
        <Link to="/">
          <Button variant="primary" size="md" icon={<ArrowLeft size={16} />}>
            Back to dashboard
          </Button>
        </Link>
      </div>
    </div>
  )
}
