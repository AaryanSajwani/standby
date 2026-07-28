import { certLabel } from "@/lib/emt"
import { cn } from "@/lib/utils"

// Certification tier badge — the EMR vs EMT-B distinction, rendered consistently
// on every dashboard and roster. Presentational + hook-free, so it works in both
// server and client components. Tiers are visually distinguished (not just
// labelled) so the level is scannable at a glance: EMT-B (higher clinical tier)
// carries the primary accent; EMR is neutral. Semantic tokens only (brand rule).
export function CertBadge({
  level,
  className,
}: {
  level: string | null | undefined
  className?: string
}) {
  const label = certLabel(level)
  if (!label) return null
  // Accent the higher tier; anything else (EMR / legacy) stays neutral.
  const accented = level === "emt_b" || level === "aemt" || level === "emt_p"
  return (
    <span
      title={`Certification: ${label}`}
      className={cn(
        "inline-flex items-center font-mono text-[10px] uppercase tracking-widest border px-1.5 py-0.5 shrink-0",
        accented
          ? "border-primary/40 bg-primary/5 text-primary"
          : "border-border bg-transparent text-muted-foreground",
        className
      )}
    >
      {label}
    </span>
  )
}
