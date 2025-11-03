"use server"

import { createClient } from "@/lib/supabase/server"

export async function checkIfFirstUser() {
  const supabase = await createClient()

  // Check if any admin users exist
  const { data: admins, error } = await supabase.from("profiles").select("id").eq("role", "admin").limit(1)

  if (error) {
    console.error("[v0] Error checking for admins:", error)
    return false
  }

  // If no admins exist, this is the first user
  return !admins || admins.length === 0
}

export async function validateAdminCode(code: string) {
  // Check against environment variable for admin backdoor code
  const adminCode = process.env.ADMIN_SIGNUP_CODE

  if (!adminCode) {
    return false
  }

  return code === adminCode
}
