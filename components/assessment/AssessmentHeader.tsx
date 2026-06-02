"use client"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

export function AssessmentHeader() {
  return (
    <header className="h-14 border-b border-border bg-surface flex items-center justify-between px-6">
      <div className="flex items-center gap-5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 border border-foreground flex items-center justify-center">
            <div className="w-2 h-2 bg-foreground" />
          </div>
          <span className="font-mono text-sm font-semibold tracking-tight">STANDBY</span>
        </div>

        <Separator orientation="vertical" className="h-4" />

        <span className="text-sm text-muted-foreground">Medical Risk Assessment</span>
      </div>

      <div className="flex items-center gap-4">
        <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
          New Assessment
        </span>
        <Button variant="outline" size="sm" className="font-mono text-xs">
          Save Draft
        </Button>
      </div>
    </header>
  )
}
