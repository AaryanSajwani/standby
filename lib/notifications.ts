// Server-only: booking email notifications via the Resend REST API (plain
// fetch, no SDK dependency). RESEND_API_KEY is a server secret — this module
// must never be imported from a client component.
//
// Every send is best-effort: failures log and return false, and the in-app
// flow (dashboard queue, /events statuses) stays the source of truth. Sends
// fail cleanly when the key is missing, the domain isn't verified yet, or
// migration 0006 hasn't been applied.

const FROM = process.env.RESEND_FROM ?? "Standby <notifications@callstandby.org>"

export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY
  if (!key) {
    console.error("[notifications] RESEND_API_KEY not set — skipping send")
    return false
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to: [to], subject, html }),
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) {
      console.error("[notifications] Resend send failed:", res.status, await res.text())
      return false
    }
    return true
  } catch (e) {
    console.error("[notifications] Resend send errored:", e)
    return false
  }
}

export interface BookingEmailData {
  eventName: string
  eventDate: string // ISO yyyy-mm-dd
  location: string
  durationHours: number
  offeredRate: number
  notes?: string | null
}

// All booking fields are user input headed into HTML — escape them. Email
// clients don't run scripts, but HTML injection could still spoof content.
function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

function fmtDate(iso: string): string {
  if (!iso) return "TBD"
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "short", month: "long", day: "numeric", year: "numeric",
  })
}

// Light theme on purpose — email clients butcher dark backgrounds. Brand shows
// up as the navy text + red accent, mono for data values, sharp corners.
function shell(heading: string, intro: string, rows: [string, string][], cta: { label: string; url: string }): string {
  const rowsHtml = rows
    .map(
      ([k, v]) => `
        <tr>
          <td style="padding:6px 16px 6px 0;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#6b7280;white-space:nowrap;vertical-align:top;">${k}</td>
          <td style="padding:6px 0;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:13px;color:#041228;">${v}</td>
        </tr>`
    )
    .join("")
  return `<!doctype html>
<html><body style="margin:0;padding:24px;background:#f4f5f7;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;background:#ffffff;border:1px solid #e2e4e8;">
      <tr><td style="padding:20px 28px;border-bottom:1px solid #e2e4e8;">
        <span style="font-family:ui-monospace,Menlo,Consolas,monospace;font-size:14px;font-weight:700;letter-spacing:-0.02em;color:#041228;">STAND<span style="color:#F04249;">BY</span></span>
      </td></tr>
      <tr><td style="padding:28px;">
        <h1 style="margin:0 0 12px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:20px;font-weight:600;color:#041228;">${heading}</h1>
        <p style="margin:0 0 20px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#374151;">${intro}</p>
        <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-top:1px solid #e2e4e8;border-bottom:1px solid #e2e4e8;padding:8px 0;margin:0 0 24px;">${rowsHtml}</table>
        <a href="${cta.url}" style="display:inline-block;background:#F04249;color:#ffffff;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;text-decoration:none;padding:12px 24px;">${cta.label}</a>
      </td></tr>
      <tr><td style="padding:16px 28px;border-top:1px solid #e2e4e8;">
        <p style="margin:0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:11px;line-height:1.5;color:#9ca3af;">Standby is a decision-support and staffing platform, not a medical provider. This notification reflects a booking request in the app — the app is the source of truth for its current status.</p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`
}

function bookingRows(b: BookingEmailData, extra: [string, string][] = []): [string, string][] {
  const rows: [string, string][] = [
    ["Event", esc(b.eventName)],
    ["Date", esc(fmtDate(b.eventDate))],
    ["Location", esc(b.location)],
    ["Duration", `${b.durationHours} hrs`],
    ["Rate", `$${b.offeredRate}/hr · est. $${Math.round(b.durationHours * b.offeredRate).toLocaleString()} total`],
    ...extra,
  ]
  if (b.notes) rows.push(["Notes", esc(b.notes)])
  return rows
}

export function bookingRequestedEmail(b: BookingEmailData, organizerName: string, origin: string) {
  return {
    subject: `New coverage request — ${b.eventName}`,
    html: shell(
      "You have a new coverage request",
      `${esc(organizerName)} requested you for an event. Accept or decline from your dashboard — the shift is yours only after you accept.`,
      bookingRows(b, [["From", esc(organizerName)]]),
      { label: "Open your dashboard", url: `${origin}/emt-dashboard` }
    ),
  }
}

export function bookingDecisionEmail(
  b: BookingEmailData,
  emtName: string,
  decision: "accepted" | "declined",
  origin: string
) {
  if (decision === "accepted") {
    return {
      subject: `Confirmed — ${emtName} accepted your request for ${b.eventName}`,
      html: shell(
        "Your coverage is confirmed",
        `${esc(emtName)} accepted your coverage request. The shift now shows as confirmed on your events page, where you can also add it to your calendar.`,
        bookingRows(b, [["Medic", esc(emtName)]]),
        { label: "View your events", url: `${origin}/events` }
      ),
    }
  }
  return {
    subject: `${emtName} declined your request for ${b.eventName}`,
    html: shell(
      "Your request was declined",
      `${esc(emtName)} can't cover this event. Your event details are saved — browse other verified personnel and send a new request.`,
      bookingRows(b),
      { label: "Browse personnel", url: `${origin}/personnel` }
    ),
  }
}
