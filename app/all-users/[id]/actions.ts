"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { logAuditEvent } from "@/lib/audit"

export async function updateUserProfile(userId: string, formData: FormData) {
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

  const fullName = formData.get("fullName") as string
  const role = formData.get("role") as string
  const department = formData.get("department") as string
  const status = formData.get("status") as string

  // Get old profile data to compare changes
  const { data: oldProfile } = await supabase.from("profiles").select("*").eq("id", userId).single()

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: fullName,
      role,
      department_id: department === "none" ? null : department,
      status,
    })
    .eq("id", userId)

  if (error) {
    return { error: error.message }
  }

  await logAuditEvent("update_user_profile", userId, {
    updated_by: profile.full_name,
    changes: { fullName, role, department, status },
  })

  let notificationMessage = ""
  if (oldProfile?.role !== role) {
    notificationMessage += `Your role has been changed to ${role}. `
  }
  if (oldProfile?.department_id !== (department === "none" ? null : department)) {
    notificationMessage += `Your department has been updated. `
  }
  if (oldProfile?.status !== status) {
    notificationMessage += `Your account status has been changed to ${status}. `
  }

  if (notificationMessage) {
    await supabase.from("notifications").insert({
      user_id: userId,
      type: "profile_update",
      title: "Profile Updated",
      message: notificationMessage.trim(),
      is_read: false,
    })
  }

  revalidatePath(`/all-users/${userId}`)
  revalidatePath("/all-users")
  return { success: true }
}

export async function suspendUser(userId: string, reason: string) {
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

  const { error } = await supabase.from("profiles").update({ status: "suspended" }).eq("id", userId)

  if (error) {
    return { error: error.message }
  }

  await logAuditEvent("suspend_user", userId, {
    suspended_by: profile.full_name,
    reason,
  })

  revalidatePath(`/all-users/${userId}`)
  return { success: true }
}

export async function activateUser(userId: string) {
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

  const { error } = await supabase.from("profiles").update({ status: "active" }).eq("id", userId)

  if (error) {
    return { error: error.message }
  }

  await logAuditEvent("activate_user", userId, {
    activated_by: profile.full_name,
  })

  revalidatePath(`/all-users/${userId}`)
  return { success: true }
}

export async function updateTimeOffRequest(requestId: string, status: "approved" | "denied", notes?: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: "Unauthorized" }
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  if (!profile || (profile.role !== "admin" && profile.role !== "manager")) {
    return { error: "Unauthorized" }
  }

  const { error } = await supabase
    .from("time_off_requests")
    .update({
      status,
      notes,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", requestId)

  if (error) {
    return { error: error.message }
  }

  await logAuditEvent("update_time_off_request", requestId, {
    reviewed_by: profile.full_name,
    status,
    notes,
  })

  revalidatePath(`/all-users`)
  return { success: true }
}

export async function exportUserData(userId: string) {
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

  // Fetch all user data
  const [profileData, shiftsData, availabilityData, timeOffData] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).single(),
    supabase.from("shifts").select("*").eq("employee_id", userId),
    supabase.from("availability").select("*").eq("employee_id", userId),
    supabase.from("time_off_requests").select("*").eq("employee_id", userId),
  ])

  await logAuditEvent("export_user_data", userId, {
    exported_by: profile.full_name,
  })

  return {
    success: true,
    data: {
      profile: profileData.data,
      shifts: shiftsData.data,
      availability: availabilityData.data,
      timeOff: timeOffData.data,
    },
  }
}

export async function assignShiftToUser(
  userId: string,
  shiftDate: string,
  startTime: string,
  endTime: string,
  departmentId: string,
  role: string,
) {
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

  const { error } = await supabase.from("shifts").insert({
    employee_id: userId,
    department_id: departmentId,
    shift_date: shiftDate,
    start_time: startTime,
    end_time: endTime,
    role,
    status: "published",
  })

  if (error) {
    return { error: error.message }
  }

  await logAuditEvent("assign_shift", userId, {
    assigned_by: profile.full_name,
    shift_date: shiftDate,
    start_time: startTime,
    end_time: endTime,
  })

  // Send notification to user
  await supabase.from("notifications").insert({
    user_id: userId,
    type: "shift_assigned",
    title: "New Shift Assigned",
    message: `You have been assigned a shift on ${shiftDate} from ${startTime} to ${endTime}.`,
    is_read: false,
  })

  revalidatePath(`/all-users/${userId}`)
  return { success: true }
}

export async function deleteShift(shiftId: string, userId: string) {
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

  const { error } = await supabase.from("shifts").delete().eq("id", shiftId)

  if (error) {
    return { error: error.message }
  }

  await logAuditEvent("delete_shift", userId, {
    deleted_by: profile.full_name,
    shift_id: shiftId,
  })

  revalidatePath(`/all-users/${userId}`)
  return { success: true }
}
