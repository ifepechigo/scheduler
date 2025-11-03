"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { logAuditEvent } from "@/lib/audit"

export async function deleteDepartment(departmentId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Unauthorized" }
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

  if (!profile || profile.role !== "admin") {
    return { success: false, error: "Only admins can delete departments" }
  }

  // Check if department has employees
  const { count } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("department_id", departmentId)

  if (count && count > 0) {
    return {
      success: false,
      error: `Cannot delete department with ${count} employee(s). Please reassign employees first.`,
    }
  }

  // Delete the department
  const { error } = await supabase.from("departments").delete().eq("id", departmentId)

  if (error) {
    return { success: false, error: error.message }
  }

  // Log the deletion
  await logAuditEvent(supabase, user.id, "department_deleted", "departments", departmentId, {
    action: "delete_department",
  })

  revalidatePath("/departments")
  revalidatePath("/dashboard")

  return { success: true }
}
