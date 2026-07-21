import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { safeInternalPath } from "@/lib/security"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  // User input from the magic-link/OAuth round-trip — sanitize before redirecting
  const next = safeInternalPath(searchParams.get("next"))
  const role = searchParams.get("role")

  if (!code) {
    return NextResponse.redirect(`${origin}/auth?error=callback_failed`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(`${origin}/auth?error=callback_failed`)
  }

  // After code exchange the session is live — set role on user metadata and profile.
  // The DB trigger fires on auth.users INSERT (first sign-up) and reads raw_user_meta_data.
  // For OAuth flows the trigger runs before we can inject the role, so we upsert here too.
  if (role === "emt" || role === "organizer") {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) {
      // Update user metadata so the trigger can read it on future sign-ups
      await supabase.auth.updateUser({ data: { role } })

      // Upsert the profile row with the correct role (handles both new and returning users)
      await supabase.from("profiles").upsert(
        { id: user.id, role },
        { onConflict: "id" }
      )
    }
  }

  return NextResponse.redirect(`${origin}${next}`)
}
