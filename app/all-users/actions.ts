"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { logAuditEvent } from "@/lib/audit"

export async function deleteUser(userId: string, reason: string) {
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

  // Check if target is an admin
  const { data: targetProfile } = await supabase.from("profiles").select("*").eq("id", userId).single()

  if (targetProfile?.role === "admin" && !profile.is_super_admin) {
    return { error: "Only the super admin can remove other admins" }
  }

  // Delete user
  const { error } = await supabase.from("profiles").delete().eq("id", userId)

  if (error) {
    return { error: error.message }
  }

  await logAuditEvent("delete_user", userId, {
    deleted_by: profile.full_name,
    reason,
  })

  revalidatePath("/all-users")
  return { success: true }
}

export async function requestAdminAction(targetAdminId: string, actionType: string, reason: string) {
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

  const { error } = await supabase.from("admin_action_approvals").insert({
    requesting_admin_id: user.id,
    target_admin_id: targetAdminId,
    action_type: actionType,
    reason,
  })

  if (error) {
    return { error: error.message }
  }

  await logAuditEvent("request_admin_action", targetAdminId, {
    requested_by: profile.full_name,
    action_type: actionType,
    reason,
  })

  revalidatePath("/all-users")
  return { success: true, message: "Request sent to super admin for approval" }
}

export async function checkAdminActionPermission(targetUserId: string, actionType: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { allowed: false, reason: "Not authenticated" }
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  if (!profile || profile.role !== "admin") {
    return { allowed: false, reason: "Not an admin" }
  }

  // Check if target is an admin
  const { data: targetProfile } = await supabase.from("profiles").select("*").eq("id", targetUserId).single()

  if (targetProfile?.role !== "admin") {
    // Not an admin, regular admin can perform action
    return { allowed: true }
  }

  // Target is an admin, check if current user is super admin
  if (profile.is_super_admin) {
    return { allowed: true }
  }

  // Check if there's an approved request
  const { data: approval } = await supabase
    .from("admin_action_approvals")
    .select("*")
    .eq("requesting_admin_id", user.id)
    .eq("target_admin_id", targetUserId)
    .eq("action_type", actionType)
    .eq("status", "approved")
    .single()

  if (approval) {
    return { allowed: true }
  }

  return { allowed: false, reason: "Requires super admin approval", needsApproval: true }
}

export async function assignUserToDepartment(userId: string, departmentId: string | null) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: "Unauthorized" }
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  if (!profile || profile.role !== "admin") {
    return { error: "Unauthorized - Admin access required" }
  }

  // Get target user info
  const { data: targetUser } = await supabase.from("profiles").select("full_name, role").eq("id", userId).single()

  if (!targetUser) {
    return { error: "User not found" }
  }

  console.log("[v0] Updating department for user:", userId, "to:", departmentId)
  const { error, data: updatedProfile } = await supabase
    .from("profiles")
    .update({ department_id: departmentId })
    .eq("id", userId)
    .select()
    .single()

  if (error) {
    console.log("[v0] Update error:", error)
    return { error: error.message }
  }

  console.log("[v0] Update successful:", updatedProfile)

  // Get department name for logging
  let departmentName = "No department"
  if (departmentId) {
    const { data: dept } = await supabase.from("departments").select("name").eq("id", departmentId).single()
    departmentName = dept?.name || departmentId
  }

  // Log the action
  await logAuditEvent("assign_department", userId, {
    assigned_by: profile.full_name,
    department: departmentName,
    user_name: targetUser.full_name,
  })

  // Create notification for the user
  await supabase.from("notifications").insert({
    user_id: userId,
    type: "department_change",
    title: "Department Assignment Updated",
    message: `You have been assigned to ${departmentName} by ${profile.full_name}`,
  })

  console.log("[v0] Revalidating paths...")
  revalidatePath("/all-users", "page")
  revalidatePath(`/all-users/${userId}`, "page")
  revalidatePath("/managers", "page")
  revalidatePath("/departments", "page")
  revalidatePath("/dashboard", "page")
  revalidatePath("/scheduler", "page")

  return { success: true, message: `User assigned to ${departmentName}` }
}
