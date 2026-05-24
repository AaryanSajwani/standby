"use client"

interface StepIndicatorProps {
  currentStep: number
  totalSteps: number
}

export function StepIndicator({ currentStep, totalSteps }: StepIndicatorProps) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
        <div
          key={step}
          className={`
            w-8 h-1
            ${step === currentStep
              ? "bg-accent-functional"
              : step < currentStep
                ? "bg-foreground/60"
                : "bg-border"
            }
          `}
        />
      ))}
    </div>
  )
}
