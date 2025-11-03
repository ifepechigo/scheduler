"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { logAuditEvent } from "@/lib/audit"

export async function sendManagerNotification(managerId: string, title: string, message: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: "Unauthorized" }
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  if (!profile || profile.role !== "admin") {
    return { error: "Unauthorized" }
  }

  // Create notification
  const { error } = await supabase.from("notifications").insert({
    user_id: managerId,
    type: "status_update",
    title,
    message,
    read: false,
  })

  if (error) {
    return { error: error.message }
  }

  await logAuditEvent("send_notification", managerId, {
    sent_by: profile.full_name,
    title,
    message,
  })

  revalidatePath("/managers")
  return { success: true }
}

export async function updateManagerStatus(managerId: string, status: string, reason?: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: "Unauthorized" }
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  if (!profile || profile.role !== "admin") {
    return { error: "Unauthorized" }
  }

  // Update manager status
  const { error } = await supabase.from("profiles").update({ status }).eq("id", managerId)

  if (error) {
    return { error: error.message }
  }

  // Send notification to manager
  const { data: manager } = await supabase.from("profiles").select("full_name").eq("id", managerId).single()

  await supabase.from("notifications").insert({
    user_id: managerId,
    type: "status_update",
    title: "Account Status Updated",
    message: `Your account status has been changed to ${status}${reason ? `: ${reason}` : ""} by ${profile.full_name}`,
    read: false,
  })

  await logAuditEvent("update_manager_status", managerId, {
    updated_by: profile.full_name,
    new_status: status,
    reason,
  })

  revalidatePath("/managers")
  return { success: true }
}
