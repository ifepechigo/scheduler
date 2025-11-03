import { createClient } from "@/lib/supabase/server"

export async function logAuditEvent(action: string, targetUserId?: string, details?: Record<string, any>) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return

    await supabase.from("audit_logs").insert({
      admin_id: user.id,
      action,
      target_user_id: targetUserId,
      details,
    })
  } catch (error) {
    console.error("[v0] Failed to log audit event:", error)
  }
}
