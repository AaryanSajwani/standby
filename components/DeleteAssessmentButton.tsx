"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Trash2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface DeleteAssessmentButtonProps {
  ids: string[] // every saved version of the event — deleting removes the whole group
  eventName: string
}

type Phase = "idle" | "confirm" | "deleting" | "error"

export function DeleteAssessmentButton({ ids, eventName }: DeleteAssessmentButtonProps) {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>("idle")
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => { if (resetTimer.current) clearTimeout(resetTimer.current) }, [])

  const armConfirm = () => {
    setPhase("confirm")
    if (resetTimer.current) clearTimeout(resetTimer.current)
    resetTimer.current = setTimeout(() => setPhase((p) => (p === "confirm" ? "idle" : p)), 5000)
  }

  const handleDelete = async () => {
    if (resetTimer.current) clearTimeout(resetTimer.current)
    setPhase("deleting")
    const supabase = createClient()
    const { error } = await supabase.from("assessments").delete().in("id", ids)
    if (error) {
      console.error("[DeleteAssessmentButton] delete failed:", error.message)
      setPhase("error")
      resetTimer.current = setTimeout(() => setPhase("idle"), 4000)
      return
    }
    router.refresh()
  }

  if (phase === "confirm" || phase === "deleting") {
    return (
      <button
        type="button"
        onClick={handleDelete}
        disabled={phase === "deleting"}
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "rounded-none font-mono text-[10px] uppercase tracking-wider gap-1.5",
          "border-risk-high/40 text-risk-high hover:text-risk-high"
        )}
      >
        <Trash2 className="w-3.5 h-3.5" />
        {phase === "deleting" ? "Deleting…" : "Delete assessment?"}
      </button>
    )
  }

  if (phase === "error") {
    return (
      <span className="font-mono text-[10px] uppercase tracking-wider text-risk-high px-2 py-0.5 border border-risk-high/40">
        Delete failed
      </span>
    )
  }

  return (
    <button
      type="button"
      onClick={armConfirm}
      title={`Delete assessment — ${eventName}`}
      className={cn(
        buttonVariants({ variant: "outline", size: "sm" }),
        "rounded-none px-2 text-muted-foreground hover:text-risk-high"
      )}
    >
      <Trash2 className="w-3.5 h-3.5" />
      <span className="sr-only">Delete assessment — {eventName}</span>
    </button>
  )
}
