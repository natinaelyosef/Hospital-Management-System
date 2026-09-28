import { useState } from 'react'
import { Navigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Activity,
  ArrowRight,
  Baby,
  Bed,
  CalendarCheck,
  CheckCircle2,
  ClipboardList,
  Clock,
  FlaskConical,
  HeartPulse,
  Mail,
  MapPin,
  Menu,
  Microscope,
  Pill,
  Quote,
  Receipt,
  Scissors,
  ShieldCheck,
  Star,
  Stethoscope,
  UserPlus,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { publicApi, type PublicOverview } from '@/api/public.api'
import { useAuth } from '@/contexts/AuthContext'
import { PORTAL_AFTER_LOGIN, PORTAL_LOGIN, PORTAL_REGISTER } from '@/lib/portals'
import { PageLoader } from '@/components/ui/Spinner'
import heroIllustration from '@/assets/hero.png'

const NAV_LINKS = [
  { href: '#about', label: 'About' },
  { href: '#services', label: 'Services' },
  { href: '#departments', label: 'Departments' },
  { href: '#doctors', label: 'Doctors' },
  { href: '#how-it-works', label: 'How it works' },
  { href: '#contact', label: 'Contact' },
]

const SERVICES: Array<{ icon: LucideIcon; title: string; text: string }> = [
  { icon: Activity, title: 'Emergency Care', text: 'Round-the-clock trauma and stabilisation with a dedicated rapid-response team.' },
  { icon: ClipboardList, title: 'Outpatient Care', text: 'Same-day consultations, follow-ups and a digital queue that keeps waiting short.' },
  { icon: FlaskConical, title: 'Laboratory', text: 'On-site haematology, chemistry and imaging with results delivered to your portal.' },
  { icon: Pill, title: 'Pharmacy', text: 'In-house dispensing with batch and expiry tracking on every prescription.' },
  { icon: Stethoscope, title: 'Medical Consultation', text: 'Specialists across cardiology, paediatrics, surgery and internal medicine.' },
  { icon: Bed, title: 'Inpatient Care', text: 'Ward, ICU and maternity beds with live bed availability for the care team.' },
]

const DEPARTMENT_FALLBACK = [
  { name: 'Cardiology', icon: HeartPulse, description: 'Heart and cardiovascular care' },
  { name: 'Pediatrics', icon: Baby, description: 'Child health services' },
  { name: 'Surgery', icon: Scissors, description: 'Surgical services and theatres' },
  { name: 'Internal Medicine', icon: Stethoscope, description: 'General medical services' },
  { name: 'Radiology', icon: Microscope, description: 'Imaging and diagnostics' },
  { name: 'Obstetrics & Gynecology', icon: ShieldCheck, description: "Women's health and maternity" },
]

const CARE_STAGES: Array<{ icon: LucideIcon; team: string; title: string; text: string; status: string }> = [
  { icon: ClipboardList, team: 'Reception', title: 'Intake & routing', text: 'A complaint, symptoms and basic information are recorded — never a diagnosis.', status: 'Waiting for triage' },
  { icon: Activity, team: 'Nurse', title: 'Triage & vital signs', text: 'Priority, observations and nursing notes prepare the case for the clinician.', status: 'Waiting for doctor' },
  { icon: Stethoscope, team: 'Doctor', title: 'Consultation', text: 'The clinician sees the full intake, records the diagnosis and creates the care plan.', status: 'Care plan created' },
  { icon: FlaskConical, team: 'Laboratory', title: 'Diagnostics, when needed', text: 'Test requests move to the lab and completed results return to the doctor automatically.', status: 'Result review required' },
  { icon: Receipt, team: 'Pharmacy & finance', title: 'Prescription & payment', text: 'Medication costs go to finance for verification before dispensing can continue.', status: 'Payment approved' },
  { icon: Pill, team: 'Pharmacy & patient', title: 'Dispense & follow up', text: 'Medication, receipt, instructions and authorised results stay on the patient record.', status: 'Treatment completed' },
]

const TESTIMONIALS = [
  { name: 'Marta Rodriguez', role: 'Patient since 2024', text: 'I booked my appointment from home, walked in at my slot and was seen within ten minutes. Every result was waiting in my portal the same evening.' },
  { name: 'Thomas Anderson', role: 'Patient since 2023', text: 'The pharmacy already knew my prescription before I reached the counter. For a hospital of this size that is remarkable.' },
  { name: 'Naomi Cohen', role: 'Patient since 2025', text: 'Being able to see my invoices, insurance claim and lab values in one place removed all the guesswork from my treatment.' },
]

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center px-4 py-5 text-center">
      <span className="text-3xl font-bold tracking-tight text-white sm:text-4xl">{value}</span>
      <span className="mt-1 text-xs font-medium tracking-wide text-white/70 uppercase">{label}</span>
    </div>
  )
}

function SectionHeading({ eyebrow, title, text, align = 'center' }: { eyebrow: string; title: string; text?: string; align?: 'center' | 'left' }) {
  return (
    <div className={align === 'center' ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'}>
      <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{title}</h2>
      {text && <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">{text}</p>}
    </div>
  )
}

export default function HomePage() {
  const { token, loading, portal: sessionPortal } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { data, isLoading } = useQuery({
    queryKey: ['public-overview'],
    queryFn: publicApi.overview,
    staleTime: 5 * 60 * 1000,
  })

  if (loading) return <PageLoader label="Loading…" />
  if (token) return <Navigate to={PORTAL_AFTER_LOGIN[sessionPortal ?? 'staff']} replace />

  const overview = data as PublicOverview | undefined
  const hospital = overview?.hospital
  const departments = overview?.departments ?? []
  const doctors = overview?.doctors ?? []
  const stats = overview?.stats

  return (
    <div className="bg-background">
      {/* ---------- Navbar ---------- */}
      <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <a href="#top" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">M</span>
            <span className="flex flex-col leading-tight">
              <span className="text-sm font-semibold text-foreground">{hospital?.name ?? 'MediCare HMS'}</span>
              <span className="text-[11px] text-muted-foreground">Hospital Management System</span>
            </span>
          </a>

          <nav className="hidden items-center gap-6 lg:flex">
            {NAV_LINKS.map((link) => (
              <a key={link.href} href={link.href} className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
                {link.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label={mobileMenuOpen ? 'Close navigation' : 'Open navigation'}
              aria-expanded={mobileMenuOpen}
              aria-controls="public-mobile-navigation"
              onClick={() => setMobileMenuOpen((open) => !open)}
              className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-border bg-card text-foreground transition-colors hover:bg-muted lg:hidden"
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            <Link to={PORTAL_LOGIN.patient} className="hidden h-9 items-center rounded-lg border border-border bg-card px-3.5 text-sm font-medium text-foreground transition-colors hover:bg-muted sm:inline-flex">
              Patient login
            </Link>
            <Link to={PORTAL_REGISTER.patient} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90">
              Register <ArrowRight size={15} />
            </Link>
          </div>
        </div>
        {mobileMenuOpen && (
          <nav id="public-mobile-navigation" className="border-t bg-background px-4 py-3 lg:hidden" aria-label="Public site navigation">
            <div className="mx-auto flex max-w-6xl flex-col gap-1">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  {link.label}
                </a>
              ))}
              <Link
                to="/start"
                onClick={() => setMobileMenuOpen(false)}
                className="mt-1 inline-flex h-10 items-center justify-center rounded-lg border border-border bg-card px-3.5 text-sm font-medium text-foreground transition-colors hover:bg-muted sm:hidden"
              >
                Patient or staff login
              </Link>
            </div>
          </nav>
        )}
      </header>

      {/* ---------- Hero ---------- */}
      <section id="top" className="auth-shell relative overflow-hidden text-white">
        <div className="relative z-10 mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.15fr_1fr] lg:items-center lg:py-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-medium text-white/90 backdrop-blur">
              <ShieldCheck size={13} /> Trusted care, digitally coordinated
            </span>

            <h1 className="mt-5 text-4xl leading-[1.08] font-semibold tracking-tight sm:text-5xl xl:text-6xl">
              Quality healthcare
              <br />
              when you need it most
            </h1>

            <p className="mt-5 max-w-xl text-sm leading-relaxed text-white/80 sm:text-base">
              Professional healthcare services, experienced medical staff and modern patient care — from
              registration and appointments to laboratory, pharmacy, billing and follow-up, all on one record.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to={PORTAL_REGISTER.patient}
                className="inline-flex h-11 items-center gap-2 rounded-lg bg-white px-5 text-sm font-semibold text-teal-800 transition-transform hover:-translate-y-0.5"
              >
                <CalendarCheck size={16} /> Book an appointment
              </Link>
              <Link
                to={PORTAL_REGISTER.patient}
                className="inline-flex h-11 items-center gap-2 rounded-lg border border-white/35 bg-white/10 px-5 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/20"
              >
                <UserPlus size={16} /> Register as a patient
              </Link>
            </div>

            <dl className="mt-10 grid max-w-lg grid-cols-3 gap-4 border-t border-white/15 pt-6">
              <div>
                <dt className="text-xs text-white/60">Patients</dt>
                <dd className="text-xl font-semibold sm:text-2xl">{stats ? `${stats.patients}+` : '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-white/60">Doctors</dt>
                <dd className="text-xl font-semibold sm:text-2xl">{stats ? `${stats.doctors}+` : '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-white/60">Departments</dt>
                <dd className="text-xl font-semibold sm:text-2xl">{stats ? `${stats.departments}+` : '—'}</dd>
              </div>
            </dl>
          </div>

          <div className="relative hidden lg:block">
            <div className="rounded-3xl border border-white/20 bg-white/10 p-4 backdrop-blur">
              <img src={heroIllustration} alt="Hospital care illustration" className="h-auto w-full rounded-2xl" />
            </div>
            <div className="absolute -bottom-5 -left-6 flex items-center gap-3 rounded-2xl border border-white/20 bg-white/95 px-4 py-3 text-foreground shadow-xl">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-accent-foreground"><Clock size={17} /></span>
              <span className="flex flex-col">
                <span className="text-xs font-semibold">Open 24/7</span>
                <span className="text-[11px] text-muted-foreground">Emergency &amp; inpatient care</span>
              </span>
            </div>
          </div>
        </div>

        {/* Stats strip */}
        <div className="relative z-10 border-t border-white/15 bg-black/15 backdrop-blur">
          <div className="mx-auto grid max-w-6xl grid-cols-2 divide-x divide-white/10 px-4 sm:px-6 lg:grid-cols-4">
            <Stat value={stats ? `${stats.patients}+` : '—'} label="Patients served" />
            <Stat value={stats ? `${stats.doctors}+` : '—'} label="Specialist doctors" />
            <Stat value={stats ? `${stats.departments}+` : '—'} label="Departments" />
            <Stat value="24/7" label="Emergency support" />
          </div>
        </div>
      </section>

      {/* ---------- About ---------- */}
      <section id="about" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <SectionHeading
            eyebrow="About the hospital"
            title="One record for every stage of care"
            text={`${hospital?.name ?? 'MediCare General Hospital'} coordinates front desk, clinicians, laboratory, pharmacy, inpatient wards and finance on a single patient timeline — so nothing is repeated, forgotten or lost between departments.`}
            align="left"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              'Digital registration & patient numbering',
              'Role-based access for every staff member',
              'Prescriptions dispensed against live stock',
              'Insurance claims and billing in one flow',
              'Audit trail on every critical action',
              'Patient portal for results and invoices',
            ].map((item) => (
              <div key={item} className="flex items-start gap-2.5 rounded-xl border border-border bg-card px-3.5 py-3 shadow-xs">
                <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-primary" />
                <span className="text-sm text-foreground">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Services ---------- */}
      <section id="services" className="border-y bg-muted/50">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
          <SectionHeading
            eyebrow="Services"
            title="Care that covers the whole journey"
            text="From emergency triage to follow-up, every service writes to the same record."
          />
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SERVICES.map((service) => (
              <article key={service.title} className="group rounded-2xl border border-border bg-card p-5 shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-md">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-accent-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <service.icon size={20} />
                </span>
                <h3 className="mt-4 text-base font-semibold text-foreground">{service.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{service.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Departments ---------- */}
      <section id="departments" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
        <SectionHeading eyebrow="Departments" title="Specialists organised by department" />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(departments.length > 0
            ? departments.map((department) => ({
                name: department.name,
                description: department.description ?? `${department.code} · Department`,
                icon: Stethoscope,
              }))
            : DEPARTMENT_FALLBACK
          ).map((department) => (
            <div key={department.name} className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4 shadow-xs">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <department.icon size={18} />
              </span>
              <span className="flex flex-col">
                <span className="text-sm font-semibold text-foreground">{department.name}</span>
                <span className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{department.description}</span>
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- Doctors ---------- */}
      {doctors.length > 0 && (
        <section id="doctors" className="border-y bg-muted/50">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
            <SectionHeading
              eyebrow="Our doctors"
              title="Meet the care team"
              text="Book a consultation with any specialist from your patient portal."
            />
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {doctors.map((doctor, index) => (
                <article key={`${doctor.name}-${index}`} className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                  <div className="flex items-center gap-3">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-base font-semibold text-primary">
                      {(doctor.name ?? 'Dr').split(' ').filter(Boolean).slice(-2).map((part) => part[0]).join('').toUpperCase()}
                    </span>
                    <span className="flex flex-col">
                      <span className="text-sm font-semibold text-foreground">{doctor.name}</span>
                      <span className="text-xs text-muted-foreground">{doctor.specialization ?? 'General practice'}</span>
                    </span>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs">
                    <span className="text-muted-foreground">{doctor.department ?? 'General'}</span>
                    <span className="font-medium text-primary">
                      {doctor.consultation_fee > 0 ? `${hospital?.currency ?? 'ETB'} ${doctor.consultation_fee}` : 'Free'}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ---------- Connected workflow ---------- */}
      <section id="how-it-works" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
        <SectionHeading
          eyebrow="Connected care journey"
          title="Each team finishes its step. The next team sees it."
          text="One shared case follows the patient across the hospital, with a clear owner, live status and a complete handoff history at every stage."
        />
        <ol className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {CARE_STAGES.map((stage, index) => (
            <li key={stage.title} className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-md">
              <span className="absolute top-3 right-4 text-xs font-bold text-muted-foreground/50">0{index + 1}</span>
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <stage.icon size={20} />
              </span>
              <p className="mt-4 text-[11px] font-semibold tracking-[0.14em] text-primary uppercase">{stage.team}</p>
              <h3 className="mt-1 text-base font-semibold text-foreground">{stage.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{stage.text}</p>
              <span className="mt-4 inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                Next: {stage.status}
              </span>
            </li>
          ))}
        </ol>
        <div className="mt-5 grid gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm sm:grid-cols-3 sm:items-center sm:p-5">
          <div className="flex items-center gap-2 text-foreground"><CheckCircle2 size={17} className="shrink-0 text-primary" /> Every move creates a timestamped handoff.</div>
          <div className="flex items-center gap-2 text-foreground"><CheckCircle2 size={17} className="shrink-0 text-primary" /> Lab work is added only when the doctor requests it.</div>
          <div className="flex items-center gap-2 text-foreground"><CheckCircle2 size={17} className="shrink-0 text-primary" /> Payment is verified before medication is dispensed.</div>
        </div>
      </section>

      {/* ---------- Testimonials ---------- */}
      <section className="border-y bg-muted/50">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
          <SectionHeading eyebrow="Patient stories" title="What people say about their care" />
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {TESTIMONIALS.map((item) => (
              <figure key={item.name} className="rounded-2xl border border-border bg-card p-5 shadow-xs">
                <Quote size={20} className="text-primary/60" />
                <blockquote className="mt-3 text-sm leading-relaxed text-foreground">{item.text}</blockquote>
                <figcaption className="mt-4 flex items-center justify-between border-t border-border pt-3">
                  <span className="flex flex-col">
                    <span className="text-sm font-semibold text-foreground">{item.name}</span>
                    <span className="text-xs text-muted-foreground">{item.role}</span>
                  </span>
                  <span className="flex gap-0.5 text-primary">
                    {Array.from({ length: 5 }).map((_, index) => <Star key={index} size={13} fill="currentColor" />)}
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Contact ---------- */}
      <section id="contact" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
        <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr] lg:items-start">
          <SectionHeading
            eyebrow="Contact"
            title="Visit or reach us"
            text="Our front desk is open every day; emergency and inpatient care run 24/7."
            align="left"
          />

          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { icon: Mail, label: 'Email', value: hospital?.email ?? 'info@medicare.test' },
              { icon: MapPin, label: 'Address', value: hospital?.address ?? 'Addis Ababa, Ethiopia' },
              { icon: Clock, label: 'Working hours', value: 'Mon–Sat 08:00–20:00 · Emergency 24/7' },
            ].map((row) => (
              <div key={row.label} className="flex items-start gap-3 rounded-xl border border-border bg-card px-4 py-3.5 shadow-xs">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                  <row.icon size={16} />
                </span>
                <span className="flex flex-col">
                  <span className="text-xs font-medium text-muted-foreground">{row.label}</span>
                  <span className="text-sm font-medium break-words text-foreground">{row.value}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- CTA ---------- */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <div className="auth-shell relative overflow-hidden rounded-3xl px-6 py-10 text-center text-white sm:px-10">
          <div className="relative z-10 mx-auto max-w-2xl">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Ready to book your visit?</h2>
            <p className="mt-2 text-sm text-white/80">
              Create your patient account and reserve a slot with a specialist today.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link to={PORTAL_REGISTER.patient} className="inline-flex h-11 items-center gap-2 rounded-lg bg-white px-5 text-sm font-semibold text-teal-800 transition-transform hover:-translate-y-0.5">
                <UserPlus size={16} /> Register as a patient
              </Link>
              <Link to={PORTAL_LOGIN.staff} className="inline-flex h-11 items-center gap-2 rounded-lg border border-white/35 px-5 text-sm font-semibold text-white transition-colors hover:bg-white/15">
                Staff login <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Footer ---------- */}
      <footer className="border-t bg-card">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-4">
          <div className="md:col-span-1">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">M</span>
              <span className="text-sm font-semibold text-foreground">{hospital?.name ?? 'MediCare HMS'}</span>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              A full-stack hospital platform connecting patients, clinicians, laboratory, pharmacy and finance on
              one secure record.
            </p>
          </div>

          <div>
            <h3 className="text-xs font-semibold tracking-wide text-foreground uppercase">Quick links</h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><Link to={PORTAL_LOGIN.patient} className="hover:text-foreground">Patient login</Link></li>
              <li><Link to={PORTAL_REGISTER.patient} className="hover:text-foreground">Register</Link></li>
              <li><a href="#about" className="hover:text-foreground">About</a></li>
              <li><a href="#how-it-works" className="hover:text-foreground">How it works</a></li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold tracking-wide text-foreground uppercase">Departments</h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {(departments.length > 0 ? departments.slice(0, 5) : DEPARTMENT_FALLBACK.slice(0, 5)).map((department) => (
                <li key={department.name}>{department.name}</li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold tracking-wide text-foreground uppercase">Contact</h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2"><Mail size={14} className="mt-0.5 shrink-0" /> {hospital?.email ?? 'info@medicare.test'}</li>
              <li className="flex items-start gap-2"><MapPin size={14} className="mt-0.5 shrink-0" /> {hospital?.address ?? 'Addis Ababa, Ethiopia'}</li>
            </ul>
          </div>
        </div>

        <div className="border-t">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-muted-foreground sm:flex-row sm:px-6">
            <span>© {new Date().getFullYear()} {hospital?.name ?? 'MediCare General Hospital'}. All rights reserved.</span>
            <span className="flex gap-4">
              <a href="#top" className="hover:text-foreground">Privacy policy</a>
              <a href="#top" className="hover:text-foreground">Terms of service</a>
            </span>
          </div>
        </div>
      </footer>

      {isLoading && <span className="sr-only">Loading hospital information…</span>}
    </div>
  )
}
