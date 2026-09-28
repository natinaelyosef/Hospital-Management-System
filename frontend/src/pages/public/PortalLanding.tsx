import { Link } from 'react-router-dom'
import { useState, type ReactNode } from 'react'
import { ArrowRight, HeartPulse, LockKeyhole, LogIn, Menu, Moon, ShieldCheck, Stethoscope, Sun, UserPlus, X } from 'lucide-react'
import { Reveal } from '@/components/ui/Reveal'
import { useTheme } from '@/contexts/ThemeContext'
import { PORTAL_HOME, PORTAL_LOGIN, PORTAL_REGISTER } from '@/lib/portals'
import type { Portal } from '@/types'

export interface PortalLandingCopy {
  portal: Portal
  eyebrow: string
  heading: ReactNode
  blurb: string
  /** Compact stats rendered as a row inside the hero. */
  stats?: { value: string; label: string }[]
  /** Product-preview visual rendered in the hero's glass panel. */
  heroVisual?: ReactNode
  /** In-page anchor links shown in the header, e.g. departments and doctors. */
  navLinks?: { href: string; label: string }[]
}

/** Centered eyebrow + title + blurb block used by every section. */
export function LandingSectionHeading({
  eyebrow,
  title,
  text,
}: {
  eyebrow: string
  title: string
  text?: string
}) {
  return (
    <Reveal className="max-w-2xl">
      <p className="text-[11px] font-bold uppercase text-primary">{eyebrow}</p>
      <h2 className="mt-2 font-serif text-3xl leading-tight text-foreground sm:text-4xl">{title}</h2>
      {text && <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">{text}</p>}
    </Reveal>
  )
}

/**
 * Shared shell for the two public front doors. Each portal gets its own
 * landing page so a patient never has to read staff copy (or vice versa).
 * Extra page sections render between the hero and the footer via `children`.
 */
export default function PortalLanding({ copy, children }: { copy: PortalLandingCopy; children?: ReactNode }) {
  const isPatient = copy.portal === 'patient'
  const otherHome = isPatient ? PORTAL_HOME.staff : PORTAL_HOME.patient
  const { theme, toggle } = useTheme()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-[#f8faf8] text-[#142b2b] dark:bg-[#0b1519] dark:text-[#e6eef1]">
      <header className="relative z-40 border-b border-[#dce6e2] bg-[#f8faf8]/95 backdrop-blur dark:border-[#20343b] dark:bg-[#0b1519]/95">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-5 py-3 lg:px-8">
          <Link to={PORTAL_HOME[copy.portal]} className="flex min-w-0 items-center gap-3">
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center text-white ${isPatient ? 'bg-[#167568]' : 'bg-[#243e50]'}`}>
              {isPatient ? <HeartPulse size={19} /> : <Stethoscope size={19} />}
            </span>
            <span className="flex flex-col leading-tight">
              <span className="text-sm font-bold text-[#142b2b] dark:text-[#e6eef1]">MediCare</span>
              <span className="text-[10px] font-medium text-[#637572] dark:text-[#9aadb2]">{isPatient ? 'PATIENT PORTAL' : 'STAFF WORKSPACE'}</span>
            </span>
          </Link>

          <div className="flex items-center gap-2">
            {(copy.navLinks ?? []).length > 0 && (
              <nav className="mr-5 hidden items-center gap-6 lg:flex">
                {(copy.navLinks ?? []).map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    className="text-xs font-semibold text-[#526764] transition-colors hover:text-[#142b2b] dark:text-[#a7b9bd] dark:hover:text-white"
                  >
                    {link.label}
                  </a>
                ))}
              </nav>
            )}
            <Link
              to={PORTAL_LOGIN[copy.portal]}
              className={`inline-flex h-10 items-center gap-2 px-4 text-xs font-bold text-white transition-colors ${isPatient ? 'bg-[#167568] hover:bg-[#105f55]' : 'bg-[#243e50] hover:bg-[#172e3e]'}`}
            >
              <LogIn size={15} />
              <span>{isPatient ? 'Patient sign in' : 'Staff sign in'}</span>
            </Link>
            <button
              type="button"
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              onClick={toggle}
              className="inline-flex h-10 w-10 items-center justify-center border border-[#dce6e2] bg-white text-[#263c39] transition-colors hover:bg-[#edf3f0] dark:border-[#30464d] dark:bg-[#142329] dark:text-[#f2c66d] dark:hover:bg-[#20333a]"
            >
              {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            {(copy.navLinks ?? []).length > 0 && (
              <button
                type="button"
                aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((open) => !open)}
                className="inline-flex h-10 w-10 items-center justify-center border border-[#dce6e2] bg-white text-[#142b2b] transition-colors hover:bg-[#edf3f0] dark:border-[#30464d] dark:bg-[#142329] dark:text-[#e6eef1] dark:hover:bg-[#20333a] lg:hidden"
              >
                {menuOpen ? <X size={16} /> : <Menu size={16} />}
              </button>
            )}
          </div>
        </div>

        {menuOpen && (
          <nav className="border-t border-[#dce6e2] bg-white dark:border-[#20343b] dark:bg-[#101e23] lg:hidden">
            <div className="mx-auto flex max-w-7xl flex-col px-5 py-2">
              {(copy.navLinks ?? []).map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="border-b border-[#e8eeeb] py-3 text-sm font-medium text-[#263c39] last:border-b-0 dark:border-[#20343b] dark:text-[#d7e2e4]"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </nav>
        )}
      </header>

      {/* ---------- Hero ---------- */}
      <section className={`relative overflow-hidden border-b border-[#dce6e2] dark:border-[#20343b] ${isPatient ? 'bg-[#e9f2ee] dark:bg-[#102a26]' : 'bg-[#edf0ed] dark:bg-[#17252c]'}`}>
        <div className="page-noise absolute inset-0 opacity-40" aria-hidden="true" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-5 py-12 sm:py-16 lg:grid-cols-[1fr_0.92fr] lg:gap-16 lg:px-8 lg:py-20">
          <div className="relative z-10">
            <span className={`inline-flex items-center gap-2 border-l-[3px] px-3 py-1.5 text-[11px] font-bold uppercase ${isPatient ? 'border-[#167568] bg-white/70 text-[#12675d] dark:border-[#5bc5ad] dark:bg-[#183b35] dark:text-[#8be0cc]' : 'border-[#cf7a3b] bg-white/70 text-[#74451f] dark:border-[#e3a269] dark:bg-[#342a23] dark:text-[#f0bd8d]'}`}>
              {isPatient ? <HeartPulse size={14} /> : <LockKeyhole size={14} />}
              {copy.eyebrow}
            </span>
            <h1 className="mt-5 max-w-2xl font-serif text-4xl leading-[1.04] text-[#142b2b] dark:text-[#edf4f2] sm:text-5xl lg:text-6xl">
              {copy.heading}
            </h1>
            <p className="mt-5 max-w-xl text-sm leading-relaxed text-[#526764] dark:text-[#a7b9bd] sm:text-base">{copy.blurb}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <LandingActions portal={copy.portal} />
            </div>
            {(copy.stats ?? []).length > 0 && (
              <dl className="mt-9 grid max-w-lg grid-cols-3 gap-4 border-t border-[#cbd9d4] pt-5 dark:border-[#30464d]">
                {copy.stats?.map((stat) => (
                  <div key={stat.label}>
                    <dt className="text-[10px] leading-snug text-[#637572] dark:text-[#9aadb2] sm:text-xs">{stat.label}</dt>
                    <dd className="mt-1 font-serif text-2xl text-[#142b2b] dark:text-[#edf4f2] sm:text-3xl">{stat.value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>

          {copy.heroVisual && (
            <div className="relative mx-2 min-w-0 sm:mx-4 lg:mx-0">
              <div className={`relative border p-4 shadow-xl sm:p-6 ${isPatient ? 'border-[#315e58] bg-[#17483f] dark:border-[#285b51] dark:bg-[#102a26]' : 'border-[#405665] bg-[#243e50] dark:border-[#384e59] dark:bg-[#17252c]'}`}>
                <div className="mb-4 flex items-center justify-between gap-3 text-white">
                  <span className="text-[10px] font-bold uppercase">{isPatient ? 'Your care, connected' : 'Hospital operations'}</span>
                  <span className="flex items-center gap-2 text-[10px] text-white/70"><span className="h-2 w-2 bg-[#85c7a4]" />{isPatient ? 'Private portal' : 'Live workflow'}</span>
                </div>
                {copy.heroVisual}
              </div>
            </div>
          )}
        </div>
      </section>

      {children}

      <footer className="border-t border-[#dce6e2] bg-[#f0f4f1] dark:border-[#20343b] dark:bg-[#101c21]">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-10 sm:grid-cols-3 lg:px-8">
          <div>
            <span className="flex items-center gap-2.5">
              <span className={`flex h-9 w-9 items-center justify-center text-white ${isPatient ? 'bg-[#167568]' : 'bg-[#243e50]'}`}>
                {isPatient ? <HeartPulse size={17} /> : <Stethoscope size={17} />}
              </span>
              <span className="flex flex-col leading-tight">
                <span className="text-sm font-bold text-[#142b2b] dark:text-[#e6eef1]">MediCare</span>
                <span className="text-[10px] text-[#637572] dark:text-[#9aadb2]">{isPatient ? 'Patient portal' : 'Staff workspace'}</span>
              </span>
            </span>
            <p className="mt-3 max-w-xs text-xs leading-relaxed text-[#637572] dark:text-[#9aadb2]">
              {isPatient
                ? 'Your medical data is encrypted and only visible to you and your care team.'
                : 'One workspace for every department — with the right access for every role.'}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase text-[#263c39] dark:text-[#d7e2e4]">This portal</p>
            <ul className="mt-3 space-y-2 text-sm text-[#637572] dark:text-[#9aadb2]">
              <li>
                <Link to={PORTAL_LOGIN[copy.portal]} className="hover:text-foreground">
                  Sign in
                </Link>
              </li>
              {isPatient && (
                <li>
                  <Link to={PORTAL_REGISTER.patient} className="hover:text-foreground">
                    Create an account
                  </Link>
                </li>
              )}
              {(copy.navLinks ?? []).map((link) => (
                <li key={link.href}>
                  <a href={link.href} className="hover:text-foreground">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase text-[#263c39] dark:text-[#d7e2e4]">The other portal</p>
            <p className="mt-3 text-sm text-[#637572] dark:text-[#9aadb2]">
              {isPatient ? 'Work at the hospital?' : 'Here as a patient?'}
            </p>
            <Link
              to={otherHome}
              className="mt-2 inline-flex items-center gap-2 text-sm font-bold text-[#167568] hover:underline dark:text-[#5bc5ad]"
            >
              <ArrowRight size={14} /> Go to the {isPatient ? 'staff' : 'patient'} page
            </Link>
            <p className="mt-2 text-[11px] text-[#637572] dark:text-[#9aadb2]">{isPatient ? 'Staff accounts use a separate, secure sign-in.' : 'Patient accounts use a separate portal.'}</p>
          </div>
        </div>
        <div className="border-t border-[#dce6e2] dark:border-[#20343b]">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-4 text-[11px] text-[#637572] dark:text-[#9aadb2] sm:flex-row sm:items-center sm:justify-between lg:px-8">
            <p>MediCare HMS — separate patient and staff access.</p>
            <p className="inline-flex items-center gap-1.5">
              <ShieldCheck size={13} /> Role-based access on every page
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

/** Reusable CTA pair so both pages keep the same shape. */
export function LandingActions({ portal, onDark = false }: { portal: Portal; onDark?: boolean }) {
  const isPatient = portal === 'patient'

  const primary = onDark
    ? 'bg-white text-[#12675d] hover:bg-[#edf6f2] dark:bg-[#d9f4ec] dark:text-[#105f55]'
    : isPatient ? 'bg-[#167568] text-white hover:bg-[#105f55] dark:bg-[#2c927e] dark:hover:bg-[#237765]' : 'bg-[#243e50] text-white hover:bg-[#172e3e] dark:bg-[#31566b] dark:hover:bg-[#274757]'
  const secondary = onDark
    ? 'border-white/50 bg-white/10 text-white hover:bg-white/20'
    : 'border border-[#cbd9d4] bg-white/70 text-[#263c39] hover:bg-white dark:border-[#30464d] dark:bg-[#142329] dark:text-[#d7e2e4] dark:hover:bg-[#20333a]'

  return (
    <>
      <Link
        to={PORTAL_LOGIN[portal]}
        className={`inline-flex min-h-11 items-center justify-center gap-2 px-4 py-2 text-xs font-bold transition-colors sm:px-5 sm:text-sm ${primary}`}
      >
        <LogIn size={16} /> {isPatient ? 'Sign in to my portal' : 'Staff sign in'}
      </Link>
      {isPatient ? (
        <Link
          to={PORTAL_REGISTER.patient}
          className={`inline-flex min-h-11 items-center justify-center gap-2 border px-4 py-2 text-xs font-bold transition-colors sm:px-5 sm:text-sm ${secondary}`}
        >
          <UserPlus size={16} /> Create a patient account
        </Link>
      ) : (
        <a
          href="#access"
          className={`inline-flex min-h-11 items-center justify-center gap-2 border px-4 py-2 text-xs font-bold transition-colors sm:px-5 sm:text-sm ${secondary}`}
        >
          <ArrowRight size={16} /> How staff get access
        </a>
      )}
    </>
  )
}
