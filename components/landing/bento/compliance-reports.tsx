import { Check, FileText, Download } from "lucide-react"

const SECTIONS = [
  "Event risk classification",
  "Staffing ratio justification",
  "Equipment requirements",
  "Medical command structure",
  "Emergency access plan",
]

export default function ComplianceReportsIllustration() {
  return (
    <div className="w-full h-full flex flex-col justify-center px-4 pb-4 gap-3">
      <div className="rounded-lg border border-border/60 bg-background/30 overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border/40 bg-card/40">
          <FileText className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-mono text-muted-foreground">AHJ_Report_2024_WildFire_Music.pdf</span>
        </div>
        <div className="p-3 flex flex-col gap-1.5">
          {SECTIONS.map((section) => (
            <div key={section} className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-emerald-400/20 flex items-center justify-center flex-shrink-0">
                <Check className="w-2.5 h-2.5 text-emerald-400" strokeWidth={3} />
              </div>
              <span className="text-xs text-muted-foreground">{section}</span>
            </div>
          ))}
        </div>
      </div>
      <button className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary/10 border border-primary/20 px-3 py-2 hover:bg-primary/20 transition-colors">
        <Download className="w-3.5 h-3.5 text-primary" />
        <span className="text-xs font-medium text-primary">Export for AHJ submission</span>
      </button>
    </div>
  )
}
