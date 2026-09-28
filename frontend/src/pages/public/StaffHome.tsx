import { Link } from 'react-router-dom'
import {
  Activity,
  ArrowRight,
  BellRing,
  ClipboardList,
  FlaskConical,
  HeartPulse,
  History,
  KeyRound,
  Lock,
  LogIn,
  Pill,
  Receipt,
  ShieldCheck,
  Stethoscope,
  Wallet,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { publicApi } from '@/api/public.api'
import { Reveal } from '@/components/ui/Reveal'
import { StaffQueuePreview } from '@/pages/public/PortalHeroVisuals'
import PortalLanding, { LandingSectionHeading } from '@/pages/public/PortalLanding'
import { PORTAL_LOGIN } from '@/lib/portals'

const HANDOFF_STEPS = [
  {
    icon: ClipboardList,
    owner: 'Receptionist',
    title: 'Intake & routing',
    text: 'Record the complaint, see ranked department suggestions, and route the case to the qualified doctor and nurse in one sitting.',
  },
  {
    icon: Activity,
    owner: 'Nurse',
    title: 'Triage & vitals',
    text: 'Pick the case up from the queue, record vital signs, complete the assessment — the doctor is notified automatically.',
  },
  {
    icon: Stethoscope,
    owner: 'Doctor',
    title: 'Consultation',
    text: 'See the full intake and vitals, record the diagnosis, order lab tests or write the prescription straight from the case.',
  },
  {
    icon: FlaskConical,
    owner: 'Lab technician',
    title: 'Tests & results',
    text: 'Work the request queue, enter results, and the case returns to the doctor with a notification — no chasing needed.',
  },
  {
    icon: Pill,
    owner: 'Pharmacist',
    title: 'Medicines & bill',
    text: 'Prepare the prescription, print the medicines-and-cost document, and issue the bill that goes to the accountant.',
  },
  {
    icon: Wallet,
    owner: 'Accountant',
    title: 'Cash & approval',
    text: 'Record the cash payment, then approve it explicitly. Approval is the gate that releases medicines to the patient.',
  },
]

const ROLE_CARDS = [
  {
    icon: ClipboardList,
    role: 'Receptionist',
    text: 'Register patients, record complaints, route cases to departments, manage appointments.',
  },
  {
    icon: HeartPulse,
    role: 'Nurse',
    text: 'Triage queue, vital signs, nursing notes, ward admissions and discharges.',
  },
  {
    icon: Stethoscope,
    role: 'Doctor',
    text: 'Consultations, lab orders and reviews, prescriptions, visit completion.',
  },
  {
    icon: FlaskConical,
    role: 'Lab technician',
    text: 'Test catalogue, request queue, result entry, printable lab reports.',
  },
  {
    icon: Pill,
    role: 'Pharmacist',
    text: 'Stock and batches, prescriptions, bill preparation, dispensing after approval.',
  },
  {
    icon: Receipt,
    role: 'Accountant',
    text: 'Invoices, cash collection, explicit payment approval, revenue reports.',
  },
]

const SECURITY_POINTS = [
  {
    icon: Lock,
    title: 'Permissions per role',
    text: '44 granular permissions across every module — each role sees exactly what it is entitled to.',
  },
  {
    icon: History,
    title: 'Full audit trail',
    text: 'Every handoff, payment and approval is recorded with who did it and when.',
  },
  {
    icon: BellRing,
    title: 'Instant handoff alerts',
    text: 'The next owner is notified the moment a case lands in their queue.',
  },
  {
    icon: ShieldCheck,
    title: 'Session control',
    text: 'Suspending an account revokes every session immediately. No lingering access.',
  },
]

/** The staff front door: its own home page, separate from every patient page. */
export default function StaffHome() {
  const { data } = useQuery({
    queryKey: ['public-overview'],
    queryFn: publicApi.overview,
    staleTime: 5 * 60 * 1000,
  })

  const stats = data?.stats

  return (
    <PortalLanding
      copy={{
        portal: 'staff',
        eyebrow: 'Staff workspace',
        heading: (
          <>
            One workspace <span className="text-[#31566b] dark:text-[#91bdd0]">for every department.</span>
          </>
        ),
        blurb:
          'Keep the whole hospital moving. Teams share one clear patient timeline, while each person sees the queue and tools for their role.',
        stats: [
          { label: 'Patients on record', value: stats ? `${stats.patients}+` : '—' },
          { label: 'Doctors', value: stats ? `${stats.doctors}+` : '—' },
          { label: 'Departments', value: stats ? `${stats.departments}+` : '—' },
        ],
        heroVisual: <StaffQueuePreview />,
        navLinks: [
          { href: '#handoff', label: 'How a case moves' },
          { href: '#roles', label: 'Roles' },
          { href: '#security', label: 'Security' },
          { href: '#access', label: 'Get access' },
        ],
      }}
    >
      {/* ---------- Handoff chain ---------- */}
      <section id="handoff" className="mx-auto max-w-7xl scroll-mt-20 px-5 py-14 sm:py-16 lg:px-8 lg:py-20">
        <LandingSectionHeading
          eyebrow="How a case moves"
          title="Six handoffs, zero lost paper"
          text="A case travels this chain. Each owner sees only their next legal move, and the patient journey records every step."
        />
        <ol className="relative mt-12 grid gap-x-8 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
          {HANDOFF_STEPS.map((step, index) => (
            <Reveal
              as="li"
              key={step.title}
              delay={index * 70}
              className="group relative flex gap-4 border-t-2 border-[#cf7a3b] bg-[#f5f7f5] p-5 transition-colors hover:bg-[#edf2ef] dark:border-[#bb794e] dark:bg-[#142329] dark:hover:bg-[#1a2c32]"
            >
              {/*
                A short connector on the right edge ties each card to the next
                one in the reading order. On every breakpoint the next card sits
                to the right, so the connector is always meaningful.
              */}
              {index < HANDOFF_STEPS.length - 1 && (
                <span
                  aria-hidden
                  className="absolute top-1/2 -right-8 hidden h-0.5 w-8 -translate-y-1/2 items-center lg:flex"
                >
                  <span className="h-px w-full bg-gradient-to-r from-primary/60 to-primary/10" />
                  <span className="ml-1 h-1.5 w-1.5 rounded-full bg-primary/60" />
                </span>
              )}
              <span className="flex h-11 w-11 shrink-0 items-center justify-center bg-[#dfe8e7] text-[#31566b] transition-colors group-hover:bg-[#31566b] group-hover:text-white dark:bg-[#233b43] dark:text-[#91bdd0] dark:group-hover:bg-[#31566b] dark:group-hover:text-white">
                <step.icon size={20} />
              </span>
              <div className="flex min-w-0 flex-col">
                <p className="flex items-center gap-2 text-[10px] font-bold uppercase text-[#31566b] dark:text-[#91bdd0]">
                  <span className="text-muted-foreground">{String(index + 1).padStart(2, '0')}</span> {step.owner}
                </p>
                <p className="mt-1 text-sm font-semibold text-foreground">{step.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{step.text}</p>
              </div>
            </Reveal>
          ))}
        </ol>
      </section>

      {/* ---------- Roles ---------- */}
      <section id="roles" className="scroll-mt-20 border-y border-[#dce6e2] bg-[#edf1ef] dark:border-[#20343b] dark:bg-[#101e23]">
        <div className="mx-auto max-w-7xl px-5 py-14 sm:py-16 lg:px-8 lg:py-20">
          <LandingSectionHeading
            eyebrow="Roles"
            title="Everyone gets their own desk"
            text="Sign in with the account your administrator issued. Patient credentials are rejected here by the server — not just hidden."
          />
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ROLE_CARDS.map((card, index) => (
              <Reveal
                key={card.role}
                delay={index * 55}
                className="group flex items-start gap-3 border border-[#d9e1de] bg-white p-4 transition-colors hover:border-[#31566b] dark:border-[#30464d] dark:bg-[#142329] dark:hover:border-[#6ca1b5]"
              >
                <a href={PORTAL_LOGIN.staff} className="flex min-w-0 flex-1 items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center bg-[#dfe8e7] text-[#31566b] transition-colors group-hover:bg-[#31566b] group-hover:text-white dark:bg-[#233b43] dark:text-[#91bdd0] dark:group-hover:bg-[#31566b] dark:group-hover:text-white">
                    <card.icon size={18} />
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                      {card.role}
                      <ArrowRight
                        size={13}
                        className="text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
                      />
                    </span>
                    <span className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{card.text}</span>
                  </span>
                </a>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Security ---------- */}
      <section id="security" className="mx-auto max-w-7xl scroll-mt-20 px-5 py-14 sm:py-16 lg:px-8 lg:py-20">
        <LandingSectionHeading
          eyebrow="Security"
          title="Locked down by design"
          text="Clinical data is sensitive. Access control is enforced by the API on every request — the interface only reflects it."
        />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SECURITY_POINTS.map((point, index) => (
            <Reveal
              key={point.title}
              delay={index * 60}
              className="flex flex-col gap-2.5 border-t border-[#cf7a3b] bg-[#f5f7f5] p-5 dark:border-[#bb794e] dark:bg-[#142329]"
            >
              <span className="flex h-10 w-10 items-center justify-center bg-[#dfe8e7] text-[#31566b] dark:bg-[#233b43] dark:text-[#91bdd0]">
                <point.icon size={18} />
              </span>
              <p className="text-sm font-semibold text-foreground">{point.title}</p>
              <p className="text-xs leading-relaxed text-muted-foreground">{point.text}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------- Access ---------- */}
      <section id="access" className="scroll-mt-20 border-t border-[#dce6e2] bg-[#edf1ef] dark:border-[#20343b] dark:bg-[#101e23]">
        <div className="mx-auto max-w-7xl px-5 py-14 sm:py-16 lg:px-8 lg:py-20">
          <LandingSectionHeading
            eyebrow="Get access"
            title="Staff accounts are issued, not self-made"
            text="Unlike patients, staff cannot register themselves. Access flows through your administrator."
          />
          <ol className="relative mx-auto mt-12 grid max-w-4xl gap-8 sm:grid-cols-3 sm:gap-6">
            <span
              aria-hidden
              className="absolute top-5 right-[16%] left-[16%] hidden h-0.5 bg-gradient-to-r from-primary/10 via-primary/40 to-primary/10 sm:block"
            />
            {[
              {
                icon: KeyRound,
                title: '1 · Invitation',
                text: 'An administrator creates your account and sends you a one-time invitation link.',
              },
              {
                icon: ShieldCheck,
                title: '2 · Your role',
                text: 'Your account carries exactly one role — receptionist, nurse, doctor, lab, pharmacy or finance.',
              },
              {
                icon: LogIn,
                title: '3 · Staff sign-in',
                text: 'Set your password from the invite, then sign in here. Patient logins are refused on this page.',
              },
            ].map((item) => (
              <li key={item.title} className="relative flex flex-col items-center text-center">
                <span className="relative z-10 flex h-10 w-10 items-center justify-center border-2 border-[#31566b] bg-white text-[#31566b] dark:border-[#6ca1b5] dark:bg-[#142329] dark:text-[#91bdd0]">
                  <item.icon size={17} />
                </span>
                <p className="mt-3 text-sm font-semibold text-foreground">{item.title}</p>
                <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">{item.text}</p>
              </li>
            ))}
          </ol>
          <div className="mt-10 flex justify-center">
            <div className="relative w-full max-w-4xl overflow-hidden bg-[#243e50] text-white dark:bg-[#17252c]">
              <div className="page-noise absolute inset-0 opacity-20" aria-hidden="true" />
              <div className="relative z-10 flex flex-col items-start gap-4 px-6 py-7 sm:flex-row sm:items-center sm:gap-6 sm:px-8">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center bg-white/10">
                  <Stethoscope size={22} />
                </span>
                <span className="flex flex-col">
                  <span className="text-base font-semibold">Have your invitation? Your desk is ready.</span>
                  <span className="mt-0.5 text-xs text-white/70">
                    Set your password from the invite link, then sign in to the workspace.
                  </span>
                </span>
                <Link
                  to={PORTAL_LOGIN.staff}
                  className="inline-flex h-11 shrink-0 items-center justify-center gap-2 bg-white px-5 text-sm font-semibold text-[#243e50] transition-colors hover:bg-[#edf1ef] dark:bg-[#dce9eb] dark:text-[#17252c] dark:hover:bg-white"
                >
                  <LogIn size={16} /> Staff sign in
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </PortalLanding>
  )
}
