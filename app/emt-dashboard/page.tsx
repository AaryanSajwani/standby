import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { DashboardContent } from "./dashboard-content"

export const metadata = { title: "EMT Dashboard — Standby" }

export default async function EMTDashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/auth?role=emt&next=/emt-dashboard")

  // No emt_profiles row → onboarding not complete
  const { data: emtProfile } = await supabase
    .from("emt_profiles")
    .select("verified")
    .eq("user_id", user.id)
    .maybeSingle()

  if (!emtProfile) redirect("/onboarding/emt")

  const displayName =
    user.user_metadata?.full_name ??
    user.user_metadata?.name ??
    user.email?.split("@")[0] ??
    "EMT"

  return (
    <DashboardContent
      displayName={displayName}
      verified={emtProfile.verified}
    />
  )
}
