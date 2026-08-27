import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowLeft, ShieldAlert, ShieldCheck, ShieldX } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { isAdminEmail } from "@/lib/admin"
import { certLabel } from "@/lib/emt"
import { VerificationActions } from "./review-actions"

export const dynamic = "force-dynamic"
export const metadata: Metadata = { title: "EMT verification — Standby", robots: { index: false, follow: false } }

const STATUSES = ["pending", "accepted", "rejected"] as const
type Status = (typeof STATUSES)[number]

const TABS: { key: Status; label: string; icon: typeof ShieldAlert }[] = [
  { key: "pending", label: "Awaiting review", icon: ShieldAlert },
  { key: "accepted", label: "Verified", icon: ShieldCheck },
  { key: "rejected", label: "Rejected", icon: ShieldX },
]

const IMAGE_EXTS = ["jpg", "jpeg", "png", "webp"]

export interface ReviewRow {
  id: string
  name: string | null
  cert: string | null
  licenseNumber: string
  licenseState: string
  licenseExpiry: string
  city: string
  state: string
  hourlyRate: number
  createdAt: string
  status: Status
  rejectionReason: string | null
  reviewedAt: string | null
  docUrl: string | null
  docIsImage: boolean
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

export default async function AdminVerificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth?next=/admin/verifications")
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

  const sp = await searchParams
  const status: Status = STATUSES.includes(sp.status as Status) ? (sp.status as Status) : "pending"

  const admin = createAdminClient()
  let rows: ReviewRow[] = []
  let configured = !!admin

  if (admin) {
    // Service role: pending/rejected rows are owner-only under RLS, and credential
    // columns are never client-readable — the admin reads them here with the
    // service role, which bypasses both. NEVER expose these fields to the browser
    // beyond this gated page.
    const { data: profiles } = await admin
      .from("emt_profiles")
      .select(
        "id, user_id, cert_level, license_number, license_state, license_expiry, cert_document_path, city, state, hourly_rate, created_at, verification_status, rejection_reason, reviewed_at"
      )
      .eq("verification_status", status)
      .order("created_at", { ascending: true })

    const list = profiles ?? []

    // Names live on profiles; emt_profiles.user_id → auth.users (no PostgREST FK
    // to profiles), so resolve names in one batched lookup.
    const userIds = [...new Set(list.map((p) => p.user_id as string).filter(Boolean))]
    const nameById = new Map<string, string | null>()
    if (userIds.length) {
      const { data: profs } = await admin.from("profiles").select("id, full_name").in("id", userIds)
      for (const p of profs ?? []) nameById.set(p.id as string, (p.full_name as string | null) ?? null)
    }

    rows = await Promise.all(
      list.map(async (p): Promise<ReviewRow> => {
        const path = p.cert_document_path as string | null
        let docUrl: string | null = null
        if (path) {
          const { data: signed } = await admin.storage.from("certifications").createSignedUrl(path, 3600)
          docUrl = signed?.signedUrl ?? null
        }
        const ext = (path?.split(".").pop() ?? "").toLowerCase()
        return {
          id: p.id as string,
          name: nameById.get(p.user_id as string) ?? null,
          cert: certLabel(p.cert_level as string),
          licenseNumber: p.license_number as string,
          licenseState: p.license_state as string,
          licenseExpiry: p.license_expiry as string,
          city: p.city as string,
          state: p.state as string,
          hourlyRate: Number(p.hourly_rate),
          createdAt: p.created_at as string,
          status: p.verification_status as Status,
          rejectionReason: (p.rejection_reason as string | null) ?? null,
          reviewedAt: (p.reviewed_at as string | null) ?? null,
          docUrl,
          docIsImage: IMAGE_EXTS.includes(ext),
        }
      })
    )
  }

  const now = Date.now()

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-10 flex flex-col gap-8">
        <div className="flex flex-col gap-3">
          <Link href="/admin" className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground w-fit">
            <ArrowLeft className="w-3 h-3" /> Admin
          </Link>
          <h1 className="text-foreground text-2xl md:text-3xl font-semibold leading-tight">EMT verification</h1>
          <p className="text-muted-foreground text-sm max-w-2xl">
            Review submitted credentials and approve or reject each applicant. Approving sets the profile
            <span className="text-foreground"> verified</span> so it can accept event work; rejecting revokes it.
            Credential documents are private — visible here only, under the admin service role.
          </p>
        </div>

        {!configured && (
          <div className="border border-risk-medium/30 bg-risk-medium/5 px-4 py-3">
            <p className="font-mono text-xs text-risk-medium">
              SUPABASE_SERVICE_ROLE_KEY is not set — verification is unavailable.
            </p>
          </div>
        )}

        {/* Status tabs */}
        <div className="flex flex-wrap gap-px bg-border border border-border w-fit">
          {TABS.map(({ key, label, icon: Icon }) => {
            const active = key === status
            return (
              <Link
                key={key}
                href={`/admin/verifications?status=${key}`}
                className={`inline-flex items-center gap-1.5 px-4 py-2 font-mono text-[10px] uppercase tracking-widest ${
                  active ? "bg-primary/10 text-primary" : "bg-card text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="w-3 h-3" />
                {label}
              </Link>
            )
          })}
        </div>

        {configured && rows.length === 0 && (
          <div className="border border-border bg-card px-6 py-12 text-center">
            <p className="text-muted-foreground text-sm">
              {status === "pending" ? "No applicants awaiting review." : status === "accepted" ? "No verified EMTs yet." : "No rejected applicants."}
            </p>
          </div>
        )}

        <div className="flex flex-col gap-5">
          {rows.map((row) => {
            const expired = row.licenseExpiry ? new Date(`${row.licenseExpiry}T00:00:00`).getTime() < now : false
            return (
              <div key={row.id} className="border border-border bg-card flex flex-col md:flex-row">
                {/* Credential document */}
                <div className="md:w-64 shrink-0 border-b md:border-b-0 md:border-r border-border bg-background/40 p-4 flex flex-col gap-2">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Credential document</span>
                  {row.docUrl ? (
                    row.docIsImage ? (
                      <a href={row.docUrl} target="_blank" rel="noopener noreferrer" className="block border border-border bg-white">
                        {/* eslint-disable-next-line @next/next/no-img-element -- private signed URL, next/image adds nothing */}
                        <img src={row.docUrl} alt={`Credential for ${row.name ?? "applicant"}`} className="w-full h-auto max-h-72 object-contain" />
                      </a>
                    ) : (
                      <a
                        href={row.docUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="border border-border bg-background px-3 py-6 text-center font-mono text-xs text-primary hover:underline"
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

                {/* Details + actions */}
                <div className="flex-1 p-5 flex flex-col gap-4 min-w-0">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex flex-col gap-1 min-w-0">
                      <span className="text-foreground font-medium leading-tight truncate">{row.name ?? "Unnamed applicant"}</span>
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {row.city}, {row.state} · applied {fmtDate(row.createdAt)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {row.cert && (
                        <span className="font-mono text-[10px] font-bold uppercase tracking-wider border border-primary/25 bg-primary/10 text-primary px-2 py-1">
                          {row.cert}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Credential facts (mono / tabular) */}
                  <div className="grid grid-cols-2 gap-px bg-border border border-border">
                    {[
                      ["Credential ID", row.licenseNumber],
                      ["License state", row.licenseState],
                      ["Expires", `${fmtDate(row.licenseExpiry)}${expired ? "  ⚠ EXPIRED" : ""}`],
                      ["Posted rate", `$${row.hourlyRate}/hr`],
                    ].map(([k, v]) => (
                      <div key={k} className="bg-card px-3 py-2 flex flex-col gap-0.5">
                        <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{k}</span>
                        <span className={`font-mono text-xs tabular-nums ${String(v).includes("EXPIRED") ? "text-primary" : "text-foreground"}`}>{v}</span>
                      </div>
                    ))}
                  </div>

                  {row.status === "rejected" && row.rejectionReason && (
                    <div className="border border-border bg-background/40 px-3 py-2">
                      <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Rejection reason on file</span>
                      <p className="text-xs text-foreground mt-0.5 whitespace-pre-wrap break-words">{row.rejectionReason}</p>
                    </div>
                  )}
                  {row.reviewedAt && (
                    <span className="font-mono text-[10px] text-muted-foreground">
                      Last reviewed {fmtDate(row.reviewedAt)}
                    </span>
                  )}

                  <VerificationActions emtProfileId={row.id} status={row.status} name={row.name} />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </main>
  )
}
