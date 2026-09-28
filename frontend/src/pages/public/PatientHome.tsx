import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import type { LucideIcon } from 'lucide-react'
import {
  Baby,
  BellRing,
  ClipboardList,
  HeartPulse,
  LogIn,
  Mail,
  MapPin,
  Microscope,
  PhoneCall,
  Pill,
  Quote,
  Receipt,
  Scissors,
  ShieldCheck,
  Stethoscope,
  UserPlus,
} from 'lucide-react'
import { publicApi } from '@/api/public.api'
import { Reveal } from '@/components/ui/Reveal'
import { PatientJourneyPreview } from '@/pages/public/PortalHeroVisuals'
import PortalLanding, { LandingActions, LandingSectionHeading } from '@/pages/public/PortalLanding'
import { PORTAL_LOGIN, PORTAL_REGISTER } from '@/lib/portals'

const DEPARTMENT_ICONS: Record<string, LucideIcon> = {
  CARD: HeartPulse,
  PEDI: Baby,
  SURG: Scissors,
  RADI: Microscope,
  IMED: Stethoscope,
  OBGY: ShieldCheck,
}

const DEPARTMENT_FALLBACK = [
  { name: 'Cardiology', description: 'Heart and cardiovascular care', icon: HeartPulse },
  { name: 'Pediatrics', description: 'Child health services', icon: Baby },
  { name: 'Surgery', description: 'Surgical services and theatres', icon: Scissors },
  { name: 'Internal Medicine', description: 'General medical services', icon: Stethoscope },
  { name: 'Radiology', description: 'Imaging and diagnostics', icon: Microscope },
  { name: 'Obstetrics & Gynecology', description: "Women's health and maternity", icon: ShieldCheck },
]

const PATIENT_STEPS = [
  {
    icon: UserPlus,
    step: 'Step 1',
    title: 'Create your account',
    text: 'Register in a minute with your name, contact and emergency details. Tell us your main complaint, symptoms and how long you have had them.',
  },
  {
    icon: ClipboardList,
    step: 'Step 2',
    title: 'Reception routes you',
    text: 'Your complaint is matched against departments so the qualified doctor and nurse pick your case up — no wandering between counters.',
  },
  {
    icon: BellRing,
    step: 'Step 3',
    title: 'Follow every handoff',
    text: 'Watch your visit move through triage, consultation and lab work. You are notified when results are ready, when the bill is prepared and when medicines can be collected.',
  },
  {
    icon: Receipt,
    step: 'Step 4',
    title: 'Pay and collect',
    text: 'See the full bill, pay at the accountant, then collect your medicines and receipts from the pharmacy — all recorded on your visit.',
  },
]

/** The patient front door: its own home page, separate from every staff page. */
export default function PatientHome() {
  const { data } = useQuery({
    queryKey: ['public-overview'],
    queryFn: publicApi.overview,
    staleTime: 5 * 60 * 1000,
  })

  const hospital = data?.hospital
  const stats = data?.stats
  const departments = data?.departments ?? []
  const doctors = data?.doctors ?? []

  return (
    <PortalLanding
      copy={{
        portal: 'patient',
        eyebrow: 'Patient portal',
        heading: (
          <>
            Your care, from the front desk <span className="text-[#167568] dark:text-[#5bc5ad]">to your prescriptions.</span>
          </>
        ),
        blurb:
          'Book your next step with confidence. Follow appointments, test results, prescriptions and bills in one private place, with your care team close at hand.',
        stats: [
          { label: 'Patients served', value: stats ? `${stats.patients}+` : '—' },
          { label: 'Specialist doctors', value: stats ? `${stats.doctors}+` : '—' },
          { label: 'Departments', value: stats ? `${stats.departments}+` : '—' },
        ],
        heroVisual: <PatientJourneyPreview />,
        navLinks: [
          { href: '#how-it-works', label: 'How it works' },
          { href: '#departments', label: 'Departments' },
          { href: '#doctors', label: 'Doctors' },
          { href: '#contact', label: 'Contact' },
        ],
      }}
    >
      {/* ---------- Emergency strip ---------- */}
      <section className="border-b border-[#e8c7be] bg-[#fff1eb] text-[#6f2b1d] dark:border-[#57352e] dark:bg-[#2a1b19] dark:text-[#ffc3ae]">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-5 py-3 sm:flex-row lg:px-8">
          <p className="flex items-center gap-2.5 text-sm font-medium">
            <span className="flex h-9 w-9 items-center justify-center bg-[#f6d8ca] dark:bg-[#57352e]">
              <PhoneCall size={16} />
            </span>
            <span><strong>Medical emergency?</strong> We are here 24/7. Call reception or come straight in.</span>
          </p>
        </div>
      </section>

      {/* ---------- How it works ---------- */}
      <section id="how-it-works" className="mx-auto max-w-7xl scroll-mt-20 px-5 py-14 sm:py-16 lg:px-8 lg:py-20">
        <LandingSectionHeading
          eyebrow="How it works"
          title="From complaint to cure in four steps"
          text="You only touch the first and last step. Everything in between is handled by the care team — and visible to you."
        />
        <ol className="relative mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          <span
            aria-hidden
            className="absolute top-7 right-[14%] left-[14%] hidden h-0.5 bg-gradient-to-r from-primary/15 via-primary/50 to-primary/15 lg:block"
          />
          {PATIENT_STEPS.map((item, index) => (
            <Reveal as="li" key={item.title} delay={index * 90} className="relative flex flex-col items-center text-center lg:items-start lg:text-left">
              <span className="relative z-10 flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/25 bg-card text-primary shadow-sm transition-all duration-300 group-hover:scale-105">
                <item.icon size={22} />
                <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground shadow-sm">
                  {index + 1}
                </span>
              </span>
              <p className="mt-4 text-[11px] font-semibold tracking-[0.18em] text-primary uppercase">{item.step}</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{item.title}</p>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{item.text}</p>
            </Reveal>
          ))}
        </ol>
      </section>

      {/* ---------- Departments ---------- */}
      <section id="departments" className="scroll-mt-20 border-y border-[#dce6e2] bg-[#eef4f0] dark:border-[#20343b] dark:bg-[#101e23]">
        <div className="mx-auto max-w-7xl px-5 py-14 sm:py-16 lg:px-8 lg:py-20">
          <LandingSectionHeading
            eyebrow="Departments"
            title="The teams you can be routed to"
            text="Reception matches your complaint against these departments and sends you to the qualified doctor and nurse."
          />
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(departments.length > 0
              ? departments.map((department) => ({
                  name: department.name,
                  description: department.description ?? `${department.code} · Department`,
                  icon: DEPARTMENT_ICONS[department.code] ?? Stethoscope,
                }))
              : DEPARTMENT_FALLBACK
            ).map((department, index) => (
              <Reveal
                key={department.name}
                delay={index * 60}
                className="group flex items-start gap-3 rounded-2xl border border-border bg-card p-4 shadow-xs transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-md"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <department.icon size={18} />
                </span>
                <span className="flex flex-col">
                  <span className="text-sm font-semibold text-foreground">{department.name}</span>
                  <span className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{department.description}</span>
                </span>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Doctors ---------- */}
      {doctors.length > 0 && (
        <section id="doctors" className="mx-auto max-w-7xl scroll-mt-20 px-5 py-14 sm:py-16 lg:px-8 lg:py-20">
          <LandingSectionHeading
            eyebrow="Our doctors"
            title="Meet the care team"
            text="The doctors who can receive your case after triage."
          />
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {doctors.slice(0, 6).map((doctor, index) => (
              <Reveal
                key={`${doctor.name}-${index}`}
                delay={index * 70}
                className="rounded-2xl border border-border bg-card p-5 shadow-xs transition-all hover:-translate-y-1 hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-base font-semibold text-primary">
                    {(doctor.name ?? 'Dr')
                      .split(' ')
                      .filter(Boolean)
                      .slice(-2)
                      .map((part) => part[0])
                      .join('')
                      .toUpperCase()}
                  </span>
                  <span className="flex flex-col">
                    <span className="text-sm font-semibold text-foreground">{doctor.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {doctor.specialization ?? 'General practice'}
                    </span>
                  </span>
                </div>
                <div className="mt-4 flex items-center gap-1.5 border-t border-border pt-3 text-xs">
                  <Stethoscope size={12} className="shrink-0 text-muted-foreground" />
                  <span className="text-muted-foreground">{doctor.department ?? 'General'}</span>
                </div>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* ---------- Testimonial ---------- */}
      <section className="border-y border-[#dce6e2] bg-[#f4f7f5] dark:border-[#20343b] dark:bg-[#101c21]">
        <div className="mx-auto max-w-4xl px-5 py-14 sm:py-16">
          <span className="flex h-10 w-10 items-center justify-center bg-[#d9ebe4] text-[#167568] dark:bg-[#173a34] dark:text-[#76d6c1]">
            <Quote size={20} />
          </span>
          <blockquote className="mt-5 max-w-3xl font-serif text-2xl leading-snug text-[#243b38] dark:text-[#d7e2df] sm:text-3xl">
            “I registered from home, described my cough, and was routed to the right doctor before I arrived.
            My lab result was waiting in my portal the same evening.”
          </blockquote>
          <p className="mt-4 text-[11px] font-bold uppercase text-[#637572] dark:text-[#9aadb2]">
            A patient of {hospital?.name ?? 'MediCare General Hospital'}
          </p>
        </div>
      </section>

      {/* ---------- CTA ---------- */}
      <section className="relative overflow-hidden bg-[#17483f] text-white dark:bg-[#102a26]">
        <div className="page-noise absolute inset-0 opacity-25" aria-hidden="true" />
        <div className="relative z-10 mx-auto flex max-w-7xl flex-col items-start gap-5 px-5 py-12 sm:py-14 lg:px-8">
          <span className="flex h-11 w-11 items-center justify-center bg-white/10">
            <Pill size={22} />
          </span>
          <h2 className="max-w-2xl font-serif text-3xl sm:text-4xl">
            Care that keeps you in the loop.
          </h2>
          <p className="max-w-2xl text-sm leading-relaxed text-white/75">
            Create your account now, or sign in if you already have one. Your complaint, your visit and your
            medicines wait for you inside.
          </p>
          <div className="flex flex-col gap-2.5 sm:flex-row">
            <LandingActions portal="patient" onDark />
          </div>
        </div>
      </section>

      {/* ---------- Contact ---------- */}
      <section id="contact" className="mx-auto max-w-7xl scroll-mt-20 px-5 py-14 sm:py-16 lg:px-8">
        <LandingSectionHeading eyebrow="Visit us" title="Find the hospital" />
        <div className="mt-8 grid max-w-2xl gap-0 border-y border-[#dce6e2] dark:border-[#20343b] sm:grid-cols-2 sm:divide-x sm:divide-[#dce6e2] dark:sm:divide-[#20343b]">
          {[
            { icon: MapPin, label: 'Address', value: hospital?.address ?? 'See reception for directions' },
            { icon: Mail, label: 'Email', value: hospital?.email ?? '—' },
          ].map((item) => (
            <div
              key={item.label}
              className="flex flex-col items-start gap-1.5 border-b border-[#dce6e2] bg-transparent py-5 text-left last:border-b-0 dark:border-[#20343b] sm:border-b-0 sm:px-5"
            >
              <span className="flex h-9 w-9 items-center justify-center bg-[#d9ebe4] text-[#167568] dark:bg-[#173a34] dark:text-[#76d6c1]">
                <item.icon size={16} />
              </span>
              <p className="text-[10px] font-bold uppercase text-[#637572]">{item.label}</p>
              <p className="text-sm font-medium break-all text-foreground">{item.value}</p>
            </div>
          ))}
        </div>
        <div className="mt-8 flex justify-center">
          <Link
            to={PORTAL_LOGIN.patient}
            className="inline-flex h-11 items-center justify-center gap-2 bg-[#167568] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#105f55] dark:bg-[#2c927e] dark:hover:bg-[#237765]"
          >
            <LogIn size={16} /> Patient sign in
          </Link>
        </div>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          New here?{' '}
          <Link to={PORTAL_REGISTER.patient} className="font-medium text-primary hover:underline">
            Create your account
          </Link>{' '}
          — it takes about a minute.
        </p>
      </section>
    </PortalLanding>
  )
}
