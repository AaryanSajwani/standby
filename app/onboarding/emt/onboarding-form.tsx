"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronDown, Upload, X, Check } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const CERT_LEVELS = [
  { label: "First Responder", value: "first_responder" },
  { label: "EMT-Basic (EMT-B)", value: "emt_b" },
  { label: "Advanced EMT (AEMT)", value: "aemt" },
  { label: "Paramedic (EMT-P)", value: "emt_p" },
]

const SPECIALIZATIONS = [
  "Concerts",
  "Festivals",
  "Sports",
  "Corporate",
  "Film & TV",
  "Private Events",
  "Outdoor Events",
  "High-Risk Events",
]

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
  "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
]

interface FormData {
  // Step 1
  fullName: string
  city: string
  state: string
  bio: string
  // Step 2
  certLevel: string
  licenseNumber: string
  licenseState: string
  licenseExpiry: string
  certFile: File | null
  // Step 3
  hourlyRate: string
  serviceRadius: string
  specializations: string[]
}

const EMPTY: FormData = {
  fullName: "", city: "", state: "", bio: "",
  certLevel: "", licenseNumber: "", licenseState: "", licenseExpiry: "", certFile: null,
  hourlyRate: "", serviceRadius: "", specializations: [],
}

const STEPS = ["Basics", "Credentials", "Marketplace"]

function StepBar({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0">
      {STEPS.map((label, i) => {
        const n = i + 1
        const done = n < current
        const active = n === current
        return (
          <div key={label} className="flex items-center">
            <div className="flex items-center gap-2 px-4 py-3">
              <span
                className={[
                  "w-5 h-5 flex items-center justify-center font-mono text-[10px] border",
                  done
                    ? "bg-primary border-primary text-primary-foreground"
                    : active
                    ? "border-primary text-primary"
                    : "border-border text-muted-foreground",
                ].join(" ")}
              >
                {done ? <Check className="w-3 h-3" /> : n}
              </span>
              <span
                className={[
                  "font-mono text-xs uppercase tracking-widest",
                  active ? "text-foreground" : "text-muted-foreground",
                ].join(" ")}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className="w-8 h-px bg-border" />
            )}
          </div>
        )
      })}
    </div>
  )
}

function SelectField({
  label,
  value,
  onChange,
  options,
  required,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { label: string; value: string }[]
  required?: boolean
}) {
  return (
    <div className="flex flex-col gap-2">
      <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {label} {required && <span className="text-primary">*</span>}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          className="w-full h-10 px-3 pr-10 bg-input border border-input-border text-foreground font-mono text-sm appearance-none focus:outline-none focus:border-primary"
        >
          <option value="">Select…</option>
          {options.map((o) => (
            <option key={o.value} value={o.value} className="bg-popover">
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
      </div>
    </div>
  )
}

export function OnboardingForm({ userId }: { userId: string }) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<FormData>(EMPTY)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (patch: Partial<FormData>) =>
    setForm((prev) => ({ ...prev, ...patch }))

  const toggleSpec = (s: string) =>
    set({
      specializations: form.specializations.includes(s)
        ? form.specializations.filter((x) => x !== s)
        : [...form.specializations, s],
    })

  const step1Valid = form.fullName.trim() && form.city.trim() && form.state
  const step2Valid =
    form.certLevel && form.licenseNumber.trim() && form.licenseState && form.licenseExpiry
  const step3Valid =
    form.hourlyRate && Number(form.hourlyRate) > 0 &&
    form.serviceRadius && Number(form.serviceRadius) > 0

  const handleSubmit = async () => {
    setSubmitting(true)
    setError(null)
    const supabase = createClient()

    try {
      // Upload cert document if provided
      let certDocumentPath: string | null = null
      if (form.certFile) {
        const ext = form.certFile.name.split(".").pop()
        const path = `${userId}/cert_${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from("certifications")
          .upload(path, form.certFile, { upsert: true })
        if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`)
        certDocumentPath = path
      }

      // Update profile full_name
      await supabase
        .from("profiles")
        .update({ full_name: form.fullName.trim() })
        .eq("id", userId)

      // Insert emt_profiles row
      const { error: insertError } = await supabase.from("emt_profiles").insert({
        user_id: userId,
        cert_level: form.certLevel,
        license_number: form.licenseNumber.trim(),
        license_state: form.licenseState,
        license_expiry: form.licenseExpiry,
        cert_document_path: certDocumentPath,
        hourly_rate: Number(form.hourlyRate),
        service_radius_miles: Number(form.serviceRadius),
        city: form.city.trim(),
        state: form.state,
        specializations: form.specializations,
        bio: form.bio.trim() || null,
        available: false,
        verified: false,
      })

      if (insertError) throw new Error(insertError.message)

      router.push("/emt-dashboard")
      router.refresh()
    } catch (e) {
      setError((e as Error).message)
      setSubmitting(false)
    }
  }

  const stateOptions = US_STATES.map((s) => ({ label: s, value: s }))

  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-start pt-10 px-4 pb-16">
      <div className="w-full max-w-xl flex flex-col gap-0 border border-border bg-card">

        {/* Header */}
        <div className="border-b border-border px-6 py-5">
          <span className="font-mono text-[10px] uppercase tracking-widest text-primary">
            EMT Portal
          </span>
          <h1 className="text-foreground text-xl font-semibold mt-1">
            Complete your EMT profile
          </h1>
          <p className="text-muted-foreground text-xs mt-1.5 leading-relaxed">
            Your credentials will be reviewed before you appear in the marketplace.
          </p>
        </div>

        {/* Step bar */}
        <div className="border-b border-border px-2 py-1">
          <StepBar current={step} />
        </div>

        {/* Error */}
        {error && (
          <div className="mx-6 mt-5 border border-destructive/30 bg-destructive/5 px-4 py-3">
            <p className="font-mono text-xs text-destructive">{error}</p>
          </div>
        )}

        {/* Step 1: Basics */}
        {step === 1 && (
          <div className="px-6 py-6 flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Full name <span className="text-primary">*</span>
              </label>
              <Input
                value={form.fullName}
                onChange={(e) => set({ fullName: e.target.value })}
                placeholder="Jane Smith"
                className="rounded-none font-mono text-sm h-10"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  City <span className="text-primary">*</span>
                </label>
                <Input
                  value={form.city}
                  onChange={(e) => set({ city: e.target.value })}
                  placeholder="Chicago"
                  className="rounded-none font-mono text-sm h-10"
                />
              </div>
              <SelectField
                label="State"
                value={form.state}
                onChange={(v) => set({ state: v })}
                options={stateOptions}
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Bio{" "}
                <span className="text-muted-foreground/60 normal-case tracking-normal">
                  (optional)
                </span>
              </label>
              <textarea
                value={form.bio}
                onChange={(e) => set({ bio: e.target.value })}
                placeholder="Brief background — event experience, specializations, approach to patient care…"
                maxLength={400}
                rows={4}
                className="w-full px-3 py-2.5 bg-input border border-input-border text-foreground placeholder:text-placeholder font-mono text-sm resize-none focus:outline-none focus:border-primary"
              />
              <span className="font-mono text-[10px] text-muted-foreground text-right tabular-nums">
                {form.bio.length}/400
              </span>
            </div>
          </div>
        )}

        {/* Step 2: Credentials */}
        {step === 2 && (
          <div className="px-6 py-6 flex flex-col gap-5">
            <SelectField
              label="Certification level"
              value={form.certLevel}
              onChange={(v) => set({ certLevel: v })}
              options={CERT_LEVELS}
              required
            />

            <div className="flex flex-col gap-2">
              <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                License number <span className="text-primary">*</span>
              </label>
              <Input
                value={form.licenseNumber}
                onChange={(e) => set({ licenseNumber: e.target.value })}
                placeholder="IL-EMT-123456"
                className="rounded-none font-mono text-sm h-10"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <SelectField
                label="License state"
                value={form.licenseState}
                onChange={(v) => set({ licenseState: v })}
                options={stateOptions}
                required
              />
              <div className="flex flex-col gap-2">
                <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  Expiry date <span className="text-primary">*</span>
                </label>
                <Input
                  type="date"
                  value={form.licenseExpiry}
                  onChange={(e) => set({ licenseExpiry: e.target.value })}
                  className="rounded-none font-mono text-sm h-10"
                />
              </div>
            </div>

            {/* Certificate upload */}
            <div className="flex flex-col gap-2">
              <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Certificate document{" "}
                <span className="text-muted-foreground/60 normal-case tracking-normal">
                  (JPG, PNG, or PDF — max 10 MB)
                </span>
              </label>
              {form.certFile ? (
                <div className="flex items-center justify-between border border-border px-3 py-2.5 bg-surface">
                  <span className="font-mono text-xs text-foreground truncate">
                    {form.certFile.name}
                  </span>
                  <button
                    onClick={() => set({ certFile: null })}
                    className="ml-3 text-muted-foreground hover:text-foreground transition-colors shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="flex items-center gap-2 border border-border border-dashed px-3 py-4 cursor-pointer hover:border-primary/50 transition-colors group">
                  <Upload className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  <span className="font-mono text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                    Click to upload
                  </span>
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,.pdf"
                    className="hidden"
                    onChange={(e) => set({ certFile: e.target.files?.[0] ?? null })}
                  />
                </label>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Marketplace */}
        {step === 3 && (
          <div className="px-6 py-6 flex flex-col gap-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  Hourly rate (USD) <span className="text-primary">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm text-muted-foreground">
                    $
                  </span>
                  <Input
                    type="number"
                    min={20}
                    max={300}
                    value={form.hourlyRate}
                    onChange={(e) => set({ hourlyRate: e.target.value })}
                    placeholder="65"
                    className="rounded-none font-mono text-sm h-10 pl-7"
                  />
                </div>
                <span className="font-mono text-[10px] text-muted-foreground">
                  Typical: $35–45 FR · $50–70 EMT-B · $85–135 Paramedic
                </span>
              </div>

              <div className="flex flex-col gap-2">
                <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  Service radius (miles) <span className="text-primary">*</span>
                </label>
                <Input
                  type="number"
                  min={5}
                  max={300}
                  value={form.serviceRadius}
                  onChange={(e) => set({ serviceRadius: e.target.value })}
                  placeholder="50"
                  className="rounded-none font-mono text-sm h-10"
                />
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Specializations{" "}
                <span className="text-muted-foreground/60 normal-case tracking-normal">
                  (select all that apply)
                </span>
              </label>
              <div className="flex flex-wrap gap-2">
                {SPECIALIZATIONS.map((s) => {
                  const active = form.specializations.includes(s)
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleSpec(s)}
                      className={[
                        "font-mono text-[10px] uppercase tracking-wider border px-2.5 py-1 transition-colors",
                        active
                          ? "bg-primary border-primary text-primary-foreground"
                          : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground",
                      ].join(" ")}
                    >
                      {s}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Summary before submit */}
            <div className="border border-border bg-surface px-4 py-3 flex flex-col gap-1.5 mt-2">
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Your listing
              </span>
              <p className="text-sm text-foreground font-medium">{form.fullName}</p>
              <p className="font-mono text-xs text-muted-foreground">
                {CERT_LEVELS.find((c) => c.value === form.certLevel)?.label} ·{" "}
                {form.city}, {form.state} · up to {form.serviceRadius} mi ·{" "}
                <span className="text-foreground">${form.hourlyRate}/hr</span>
              </p>
              <p className="font-mono text-[10px] text-muted-foreground mt-1">
                Submitted as <span className="text-risk-medium">unverified</span> — your
                credentials will be reviewed before you appear in the marketplace.
              </p>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="border-t border-border px-6 py-4 flex items-center justify-between">
          {step > 1 ? (
            <Button
              variant="outline"
              className="rounded-none font-mono text-xs uppercase tracking-wider"
              onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)}
            >
              Back
            </Button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <Button
              className="rounded-none font-mono text-xs uppercase tracking-wider"
              disabled={step === 1 ? !step1Valid : !step2Valid}
              onClick={() => setStep((s) => (s + 1) as 1 | 2 | 3)}
            >
              Continue
            </Button>
          ) : (
            <Button
              className="rounded-none font-mono text-xs uppercase tracking-wider"
              disabled={!step3Valid || submitting}
              onClick={handleSubmit}
            >
              {submitting ? "Submitting…" : "Submit profile"}
            </Button>
          )}
        </div>
      </div>
    </main>
  )
}
