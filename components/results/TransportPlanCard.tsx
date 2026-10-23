import { TriangleAlert } from "lucide-react"
import { transportPlanInfo, type TransportAssessment } from "@/lib/assessment"

interface TransportPlanCardProps {
  transport: TransportAssessment
  transportPlan: string
}

// Patient transport section of the risk report. Prints (no print:hidden) — the
// AHJ document has to answer "how does a patient get to a hospital?". Standby
// staffs on-site personnel only; this card recommends, it never offers a rig.
export function TransportPlanCard({ transport, transportPlan }: TransportPlanCardProps) {
  const { recommendation, triggers, status, hospital, advisories } = transport

  // A name is only ever present when the distance came from auto-fill (a manual
  // distance edit clears it), so name ⇔ straight-line measurement.
  const nearestEr =
    hospital.name !== null ? (
      <>
        {hospital.name}
        {hospital.miles !== null && (
          <>
            {" · "}
            <span className="font-mono tabular-nums">{hospital.miles}</span> mi straight-line
          </>
        )}
        {hospital.erConfirmed === false && <span className="text-muted-foreground"> (ER not confirmed)</span>}
      </>
    ) : hospital.miles !== null ? (
      <>
        <span className="font-mono tabular-nums">{hospital.miles}</span> mi{" "}
        <span className="text-muted-foreground">(entered manually)</span>
      </>
    ) : (
      <span className="text-muted-foreground">Not specified</span>
    )

  return (
    <section className="border border-border bg-card p-6">
      <h2 className="font-mono text-xs tracking-[0.2em] text-muted-foreground uppercase mb-4">
        Patient Transport
      </h2>

      <dl className="flex flex-col divide-y divide-border border-y border-border">
        <Row label="Recommendation">
          <span className="font-medium">
            {recommendation === "DEDICATED_UNIT" ? "Dedicated unit recommended" : "911 / Local EMS"}
          </span>
          {triggers.length > 0 && (
            <ul className="mt-1.5 flex flex-col gap-1">
              {triggers.map((t) => (
                <li key={t} className="text-sm text-foreground/80 tabular-nums">
                  {t}
                </li>
              ))}
            </ul>
          )}
        </Row>
        <Row label="Nearest ER">{nearestEr}</Row>
        <Row label="Organizer arrangement">
          {transportPlanInfo(transportPlan)?.label ?? <span className="text-muted-foreground">Not specified</span>}
        </Row>
      </dl>

      {status === "GAP" && (
        <p className="mt-4 border border-risk-high bg-risk-high/5 px-4 py-3 text-sm text-risk-high leading-relaxed">
          Gap: this event profile warrants a dedicated transport unit, but none is arranged. Contract one
          through a licensed ambulance provider, or document the 911-only rationale in the medical plan.
        </p>
      )}
      {status === "ACTION_NEEDED" && (
        <p className="mt-4 border border-risk-medium bg-risk-medium/5 px-4 py-3 text-sm text-risk-medium leading-relaxed">
          Action needed: confirm how patients will be transported before the event.
        </p>
      )}

      {advisories.length > 0 && (
        <ul className="mt-4 flex flex-col gap-2">
          {advisories.map((a) => (
            <li key={a} className="flex gap-3 text-sm text-foreground/80 leading-relaxed">
              <TriangleAlert aria-hidden className="w-3.5 h-3.5 text-risk-medium shrink-0 mt-1" />
              <span>{a}</span>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-4 text-xs text-muted-foreground leading-relaxed">
        Standby staffs on-site medical personnel. Standby does not provide ambulances or patient transport.
      </p>
    </section>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-1 sm:gap-4 py-3">
      <dt className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground sm:pt-1">{label}</dt>
      <dd className="text-sm text-foreground leading-relaxed">{children}</dd>
    </div>
  )
}
