"use client"

export function AssessmentHeader() {
  return (
    <header className="h-14 border-b border-border bg-surface flex items-center justify-between px-6">
      <div className="flex items-center gap-6">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 border border-foreground flex items-center justify-center">
            <div className="w-2 h-2 bg-foreground" />
          </div>
          <span className="font-mono text-sm font-medium tracking-tight">STANDBY</span>
        </div>

        {/* Nav Divider */}
        <div className="h-4 w-px bg-border" />

        {/* Current Section */}
        <span className="text-sm text-muted-foreground">
          Medical Risk Assessment
        </span>
      </div>

      <div className="flex items-center gap-4">
        <span className="text-xs font-mono text-muted-foreground">
          NEW ASSESSMENT
        </span>
        <button className="h-8 px-3 text-xs font-mono border border-border text-muted-foreground hover:text-foreground hover:border-foreground transition-colors">
          Save Draft
        </button>
      </div>
    </header>
  )
}
