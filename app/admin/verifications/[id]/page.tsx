import type { Metadata } from "next"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { isAdminEmail } from "@/lib/admin"
import { certLabel } from "@/lib/emt"
import { VerificationActions } from "../review-actions"

export const dynamic = "force-dynamic"
export const metadata: Metadata = {
  title: "Applicant detail — Standby",
  robots: { index: false, follow: false },
}

const STATUSES = ["pending", "accepted", "rejected"] as const
type Status = (typeof STATUSES)[number]

const IMAGE_EXTS = ["jpg", "jpeg", "png", "webp"]
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const STATUS_LABEL: Record<Status, string> = {
  pending: "Awaiting review",
  accepted: "Verified",
  rejected: "Rejected",
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

// A labelled cell in the mono/tabular fact grids.
function Fact({ label, value, alert }: { label: string; value: string; alert?: boolean }) {
  return (
    <div className="bg-card px-3 py-2 flex flex-col gap-0.5">
      <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{label}</span>
      <span className={`font-mono text-xs tabular-nums break-words ${alert ? "text-primary" : "text-foreground"}`}>
        {value || "—"}
      </span>
    </div>
  )
}

export default async function AdminApplicantDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ status?: string }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { id } = await params
  if (!user) redirect(`/auth?next=/admin/verifications/${id}`)
  if (!isAdminEmail(user.email)) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <span className="text-xs font-mono text-primary uppercase tracking-widest">404</span>
          <p className="text-muted-foreground text-sm">Not found.</p>
        </div>
      </div>
    )
  }

  if (!UUID_RE.test(id)) notFound()

  const sp = await searchParams
  // Where the "back" link returns — the tab the admin came from.
  const backStatus: Status = STATUSES.includes(sp.status as Status) ? (sp.status as Status) : "pending"

  const admin = createAdminClient()
  if (!admin) {
    return (
      <main className="min-h-screen bg-background">
        <div className="max-w-3xl mx-auto px-4 py-10">
          <div className="border border-risk-medium/30 bg-risk-medium/5 px-4 py-3">
            <p className="font-mono text-xs text-risk-medium">
              SUPABASE_SERVICE_ROLE_KEY is not set — verification is unavailable.
            </p>
          </div>
        </div>
      </main>
    )
  }

  // Service role: reads the full row including credential PII, which is never
  // client-readable. NEVER expose these fields to the browser beyond this gated
  // admin surface.
  const { data: p } = await admin
    .from("emt_profiles")
    .select(
      "id, user_id, cert_level, license_number, license_state, license_expiry, cert_document_path, hourly_rate, service_radius_miles, city, state, specializations, bio, available, verified, verification_status, rejection_reason, reviewed_at, created_at"
    )
    .eq("id", id)
    .maybeSingle()

  if (!p) notFound()

  // Name (profiles) + email (auth.users) resolved server-side with the service
  // role — auth.users emails are never copied onto profiles or returned to a client.
  const [{ data: prof }, { data: authUser }] = await Promise.all([
    admin.from("profiles").select("full_name").eq("id", p.user_id as string).maybeSingle(),
    admin.auth.admin.getUserById(p.user_id as string),
  ])
  const name = (prof?.full_name as string | null) ?? null
  const email = authUser?.user?.email ?? null

  const path = p.cert_document_path as string | null
  let docUrl: string | null = null
  if (path) {
    const { data: signed } = await admin.storage.from("certifications").createSignedUrl(path, 3600)
    docUrl = signed?.signedUrl ?? null
  }
  const ext = (path?.split(".").pop() ?? "").toLowerCase()
  const docIsImage = IMAGE_EXTS.includes(ext)

  const status = p.verification_status as Status
  const licenseExpiry = p.license_expiry as string
  const expired = licenseExpiry ? new Date(`${licenseExpiry}T00:00:00`).getTime() < Date.now() : false
  const specializations = (p.specializations as string[] | null) ?? []

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-10 flex flex-col gap-8">
        <div className="flex flex-col gap-3">
          <Link
            href={`/admin/verifications?status=${backStatus}`}
            className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground w-fit"
          >
            <ArrowLeft className="w-3 h-3" /> {STATUS_LABEL[backStatus]}
          </Link>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-foreground text-2xl md:text-3xl font-semibold leading-tight">
              {name ?? "Unnamed applicant"}
            </h1>
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider border border-border bg-surface text-muted-foreground px-2 py-1">
              {STATUS_LABEL[status]}
            </span>
          </div>
          <p className="text-muted-foreground text-sm max-w-2xl">
            Everything this applicant submitted during EMT onboarding, including contact and credential
            details. Visible here only, under the admin service role.
          </p>
        </div>

        {/* Contact */}
        <section className="flex flex-col gap-3">
          <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Contact</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-border border border-border">
            <Fact label="Full name" value={name ?? ""} />
            <Fact label="Email" value={email ?? "—"} />
            <Fact label="City" value={p.city as string} />
            <Fact label="State" value={p.state as string} />
          </div>
        </section>

        {/* Credentials */}
        <section className="flex flex-col gap-3">
          <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Credentials</span>
          <div className="grid grid-cols-2 gap-px bg-border border border-border">
            <Fact label="Certification level" value={certLabel(p.cert_level as string) ?? (p.cert_level as string)} />
            <Fact label="Credential ID" value={p.license_number as string} />
            <Fact label="License state" value={p.license_state as string} />
            <Fact
              label="Expires"
              value={`${fmtDate(licenseExpiry)}${expired ? "  ⚠ EXPIRED" : ""}`}
              alert={expired}
            />
          </div>

          <div className="border border-border bg-card p-4 flex flex-col gap-2">
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Credential document
            </span>
            {docUrl ? (
              docIsImage ? (
                <a href={docUrl} target="_blank" rel="noopener noreferrer" className="block border border-border bg-white w-fit">
                  {/* eslint-disable-next-line @next/next/no-img-element -- private signed URL, next/image adds nothing */}
                  <img src={docUrl} alt={`Credential for ${name ?? "applicant"}`} className="w-full h-auto max-h-96 object-contain" />
                </a>
              ) : (
                <a
                  href={docUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border border-border bg-background px-3 py-6 text-center font-mono text-xs text-primary hover:underline w-fit"
                >
                  Open document (PDF)
                </a>
              )
            ) : (
              <div className="border border-dashed border-border px-3 py-6 text-center font-mono text-xs text-muted-foreground">
                No document uploaded
              </div>
            )}
          </div>
        </section>

        {/* Marketplace listing */}
        <section className="flex flex-col gap-3">
          <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Marketplace listing</span>
          <div className="grid grid-cols-2 gap-px bg-border border border-border">
            <Fact label="Posted rate" value={`$${Number(p.hourly_rate)}/hr`} />
            <Fact label="Service radius" value={`${Number(p.service_radius_miles)} mi`} />
            <Fact label="Available now" value={p.available ? "Yes" : "No"} />
            <Fact label="Verified" value={p.verified ? "Yes" : "No"} />
          </div>

          <div className="border border-border bg-card px-3 py-2 flex flex-col gap-1">
            <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Specializations</span>
            {specializations.length ? (
              <div className="flex flex-wrap gap-1.5 mt-0.5">
                {specializations.map((s) => (
                  <span
                    key={s}
                    className="font-mono text-[10px] uppercase tracking-wider border border-border bg-surface text-foreground px-2 py-0.5"
                  >
                    {s}
                  </span>
                ))}
              </div>
            ) : (
              <span className="font-mono text-xs text-muted-foreground">None selected</span>
            )}
          </div>

          <div className="border border-border bg-card px-3 py-2 flex flex-col gap-1">
            <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Bio</span>
            <p className="text-sm text-foreground whitespace-pre-wrap break-words">
              {(p.bio as string | null)?.trim() || <span className="text-muted-foreground">No bio provided.</span>}
            </p>
          </div>
        </section>

        {/* Review status */}
        <section className="flex flex-col gap-3">
          <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Review</span>
          <div className="grid grid-cols-2 gap-px bg-border border border-border">
            <Fact label="Applied" value={fmtDate(p.created_at as string)} />
            <Fact label="Last reviewed" value={fmtDate(p.reviewed_at as string | null)} />
          </div>
          {status === "rejected" && (p.rejection_reason as string | null) && (
            <div className="border border-border bg-background/40 px-3 py-2">
              <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                Rejection reason on file
              </span>
              <p className="text-xs text-foreground mt-0.5 whitespace-pre-wrap break-words">
                {p.rejection_reason as string}
              </p>
            </div>
          )}

          <VerificationActions emtProfileId={p.id as string} status={status} name={name} />
        </section>
      </div>
    </main>
  )
}
