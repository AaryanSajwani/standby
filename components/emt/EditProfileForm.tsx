"use client"

import { useState } from "react"
import { ChevronDown, Pencil } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SPECIALIZATIONS, US_STATES } from "@/lib/emt"

// Non-credential profile fields an EMT can freely edit after onboarding. All of
// these are owner-updatable emt_profiles columns (column grant in the auth
// skill migration) plus full_name on profiles — no credential PII, no
// verification state, so no re-review is triggered. License / cert edits are
// deliberately NOT here: changing a verified credential must re-queue admin
// review, which is a separate server-side flow.
export interface EmtProfileValues {
  fullName: string
  bio: string
  city: string
  state: string
  serviceRadius: string
  specializations: string[]
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: string[]
}) {
  return (
    <div className="flex flex-col gap-2">
      <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {label} <span className="text-primary">*</span>
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-10 px-3 pr-10 bg-input border border-input-border text-foreground font-mono text-sm appearance-none focus:outline-none focus:border-primary"
        >
          <option value="">Select…</option>
          {options.map((o) => (
            <option key={o} value={o} className="bg-popover">
              {o}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
      </div>
    </div>
  )
}

export function EditProfileForm({
  userId,
  initial,
  onSaved,
}: {
  userId: string
  initial: EmtProfileValues
  /** Bubble the saved values up so the dashboard header/name stay in sync. */
  onSaved?: (values: EmtProfileValues) => void
}) {
  const [editing, setEditing] = useState(false)
  const [saved, setSaved] = useState<EmtProfileValues>(initial)
  const [form, setForm] = useState<EmtProfileValues>(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (patch: Partial<EmtProfileValues>) =>
    setForm((prev) => ({ ...prev, ...patch }))

  const toggleSpec = (s: string) =>
    set({
      specializations: form.specializations.includes(s)
        ? form.specializations.filter((x) => x !== s)
        : [...form.specializations, s],
    })

  const startEdit = () => {
    setForm(saved)
    setError(null)
    setEditing(true)
  }

  const cancel = () => {
    setForm(saved)
    setError(null)
    setEditing(false)
  }

  const valid =
    form.fullName.trim() &&
    form.city.trim() &&
    form.state &&
    Number(form.serviceRadius) > 0

  const save = async () => {
    if (!form.fullName.trim()) return setError("Enter your full name.")
    if (!form.city.trim() || !form.state) return setError("Enter your city and state.")
    const radius = Number(form.serviceRadius)
    // DB sanity bound (migration 0007): service_radius_miles between 1 and 500.
    if (!(radius > 0)) return setError("Enter a valid service radius.")
    if (radius < 1 || radius > 500) return setError("Service radius must be between 1 and 500 miles.")

    setSaving(true)
    setError(null)
    const supabase = createClient()

    // full_name lives on profiles; the rest on emt_profiles. Both are
    // owner-scoped by RLS (.eq user id is the row the policy allows).
    const { error: profileErr } = await supabase
      .from("profiles")
      .update({ full_name: form.fullName.trim() })
      .eq("id", userId)
    if (profileErr) {
      setError(`Could not save name: ${profileErr.message}`)
      setSaving(false)
      return
    }

    const { error: emtErr } = await supabase
      .from("emt_profiles")
      .update({
        bio: form.bio.trim() || null,
        city: form.city.trim(),
        state: form.state,
        service_radius_miles: radius,
        specializations: form.specializations,
      })
      .eq("user_id", userId)
    if (emtErr) {
      setError(`Could not save profile: ${emtErr.message}`)
      setSaving(false)
      return
    }

    const next: EmtProfileValues = {
      ...form,
      fullName: form.fullName.trim(),
      city: form.city.trim(),
      bio: form.bio.trim(),
    }
    setSaved(next)
    setForm(next)
    setSaving(false)
    setEditing(false)
    onSaved?.(next)
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Your profile</h2>
        {!editing && (
          <Button
            size="sm"
            variant="outline"
            onClick={startEdit}
            className="rounded-xl font-mono text-[10px] uppercase tracking-wider shrink-0"
          >
            <Pencil className="w-3 h-3 mr-1.5" />Edit profile
          </Button>
        )}
      </div>

      <div className="border border-border bg-card px-5 py-5">
        {editing ? (
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Full name <span className="text-primary">*</span>
              </label>
              <Input
                value={form.fullName}
                onChange={(e) => set({ fullName: e.target.value })}
                placeholder="Jane Smith"
                className="rounded-xl font-mono text-sm h-10"
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
                  className="rounded-xl font-mono text-sm h-10"
                />
              </div>
              <SelectField
                label="State"
                value={form.state}
                onChange={(v) => set({ state: v })}
                options={[...US_STATES]}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Service radius (miles) <span className="text-primary">*</span>
              </label>
              <Input
                type="number"
                min={1}
                max={500}
                value={form.serviceRadius}
                onChange={(e) => set({ serviceRadius: e.target.value })}
                placeholder="50"
                className="rounded-xl font-mono text-sm h-10 max-w-[12rem]"
              />
              <span className="font-mono text-[10px] text-muted-foreground">
                How far you&apos;ll travel for a shift. Organizers within this range can find you.
              </span>
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Bio{" "}
                <span className="text-muted-foreground/60 normal-case tracking-normal">(optional)</span>
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

            <div className="flex flex-col gap-3">
              <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Specializations{" "}
                <span className="text-muted-foreground/60 normal-case tracking-normal">(select all that apply)</span>
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

            {error && (
              <p className="font-mono text-xs text-destructive">{error}</p>
            )}

            <div className="flex items-center gap-2 border-t border-border pt-4">
              <Button
                disabled={!valid || saving}
                onClick={save}
                className="rounded-xl font-mono text-xs uppercase tracking-wider"
              >
                {saving ? "Saving…" : "Save changes"}
              </Button>
              <Button
                variant="ghost"
                disabled={saving}
                onClick={cancel}
                className="rounded-xl font-mono text-xs uppercase tracking-wider"
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-0.5">
              <span className="text-foreground font-medium text-base">{saved.fullName || "—"}</span>
              <span className="font-mono text-xs text-muted-foreground">
                {saved.city ? `${saved.city}, ${saved.state}` : "Location not set"}
                {saved.serviceRadius ? ` · up to ${saved.serviceRadius} mi` : ""}
              </span>
            </div>

            {saved.bio ? (
              <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">{saved.bio}</p>
            ) : (
              <p className="font-mono text-xs text-muted-foreground/70">No bio yet — add one so organizers know your background.</p>
            )}

            {saved.specializations.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {saved.specializations.map((s) => (
                  <span
                    key={s}
                    className="font-mono text-[10px] uppercase tracking-wider border border-border text-muted-foreground px-2.5 py-1"
                  >
                    {s}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
