"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { StepIndicator } from "./StepIndicator"
import { EventDetailsForm } from "./EventDetailsForm"
import { VenueConditionsForm } from "./VenueConditionsForm"
import { WeatherExposureForm } from "./WeatherExposureForm"
import { MedicalResourcesForm } from "./MedicalResourcesForm"
import { EmergencyAccessForm } from "./EmergencyAccessForm"
import { RiskProfilePanel } from "./RiskProfilePanel"
import { EMPTY_FORM_DATA, type AssessmentFormData } from "@/types/assessment"

const STEP_LABELS = [
  "Event Details",
  "Venue Conditions",
  "Weather Exposure",
  "Medical Resources",
  "Emergency Access",
]

export function AssessmentIntakeForm() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<AssessmentFormData>(EMPTY_FORM_DATA)

  const handleFormChange = (data: Partial<AssessmentFormData>) => {
    setFormData((prev) => ({ ...prev, ...data }))
  }

  const handleNext = () => {
    if (currentStep < 5) {
      setCurrentStep((s) => s + 1)
    } else {
      router.push("/results")
    }
  }

  const handleBack = () => {
    setCurrentStep((s) => Math.max(1, s - 1))
  }

  const sharedProps = { formData, onChange: handleFormChange, onNext: handleNext }

  const renderStep = () => {
    switch (currentStep) {
      case 1: return <EventDetailsForm {...sharedProps} />
      case 2: return <VenueConditionsForm {...sharedProps} onBack={handleBack} />
      case 3: return <WeatherExposureForm {...sharedProps} onBack={handleBack} />
      case 4: return <MedicalResourcesForm {...sharedProps} onBack={handleBack} />
      case 5: return <EmergencyAccessForm {...sharedProps} onBack={handleBack} />
    }
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Step Progress Bar */}
      <div className="border-b border-border bg-surface px-6 py-4 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">
              Step {currentStep} of 5
            </div>
            <StepIndicator currentStep={currentStep} totalSteps={5} />
          </div>
          <div className="text-right">
            <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">
              Current Phase
            </div>
            <div className="text-sm font-medium">{STEP_LABELS[currentStep - 1]}</div>
          </div>
        </div>
      </div>

      {/* Main Content - Split Screen */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 min-h-0">
        <div className="border-r border-border bg-card overflow-auto">
          {renderStep()}
        </div>
        <div className="bg-surface hidden lg:block overflow-auto">
          <RiskProfilePanel formData={formData} />
        </div>
      </div>
    </div>
  )
}
