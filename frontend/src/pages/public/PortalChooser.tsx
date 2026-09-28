import { Link } from 'react-router-dom'
import { ArrowRight, HeartPulse, LogIn, Stethoscope, UserPlus } from 'lucide-react'
import { PORTAL_LOGIN, PORTAL_REGISTER } from '@/lib/portals'

/**
 * The front door chooser. Patients and staff are separate audiences with
 * separate accounts, so the site opens by asking which one you are rather
 * than dumping everyone at a single login form.
 */
export default function PortalChooser() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <span className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground">
              M
            </span>
            <span className="flex flex-col leading-tight">
              <span className="text-sm font-semibold text-foreground">MediCare HMS</span>
              <span className="text-[11px] text-muted-foreground">Hospital Management System</span>
            </span>
          </span>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-10 px-5 py-14 lg:py-20">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            How are you signing in?
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Patients and hospital staff use separate accounts and separate pages. Pick your door below — each one
            takes you to its own home page, and the other will not accept your login.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <section className="flex flex-col gap-5 rounded-2xl border bg-card p-7 shadow-xs">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/12 text-primary">
              <HeartPulse size={22} />
            </span>
            <div>
              <h2 className="text-xl font-semibold text-foreground">I&rsquo;m a patient</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Track your visit, prescriptions, lab results and bills. New here? Create an account and describe
                your complaint so reception can route you to the right team.
              </p>
            </div>
            <div className="mt-auto flex flex-col gap-2.5 sm:flex-row">
              <Link
                to={PORTAL_LOGIN.patient}
                className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                <LogIn size={15} /> Patient sign in
              </Link>
              <Link
                to={PORTAL_REGISTER.patient}
                className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg border px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                <UserPlus size={15} /> Create account
              </Link>
            </div>
          </section>

          <section className="flex flex-col gap-5 rounded-2xl border bg-card p-7 shadow-xs">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/12 text-primary">
              <Stethoscope size={22} />
            </span>
            <div>
              <h2 className="text-xl font-semibold text-foreground">I&rsquo;m hospital staff</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Front desk, clinicians, laboratory, pharmacy and finance. Sign in with the work account issued to you
                — patient credentials are not accepted here.
              </p>
            </div>
            <div className="mt-auto flex flex-col gap-2.5 sm:flex-row">
              <Link
                to={PORTAL_LOGIN.staff}
                className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                <LogIn size={15} /> Staff sign in
              </Link>
              <Link
                to="/about"
                className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg border px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                <ArrowRight size={15} /> About the system
              </Link>
            </div>
          </section>
        </div>
      </main>

      <footer className="border-t">
        <div className="mx-auto max-w-6xl px-5 py-6 text-xs text-muted-foreground">
          MediCare HMS — separate patient and staff access. Need help? Contact hospital administration.
        </div>
      </footer>
    </div>
  )
}
