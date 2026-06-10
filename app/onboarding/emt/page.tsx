import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { OnboardingForm } from "./onboarding-form"

export const metadata = { title: "EMT Onboarding — Standby" }

export default async function EMTOnboardingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/auth?role=emt&next=/onboarding/emt")

  // Already onboarded — send to dashboard
  const { data: existing } = await supabase
    .from("emt_profiles")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle()

  if (existing) redirect("/emt-dashboard")

  return <OnboardingForm userId={user.id} />
}
