import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Sidebar } from "@/components/sidebar"
import { UserActionsMenu } from "@/components/user-actions-menu"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, UserPlus, UserCheck } from "lucide-react"
import Link from "next/link"

export default async function ManagersPage({
  searchParams,
}: {
  searchParams: { search?: string; department?: string }
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  if (!profile || profile.role !== "admin") {
    redirect("/dashboard")
  }

  // Fetch all managers
  let query = supabase.from("profiles").select("*").eq("role", "manager")

  if (searchParams.search) {
    query = query.or(`full_name.ilike.%${searchParams.search}%,email.ilike.%${searchParams.search}%`)
  }

  const { data: managers, error } = await query.order("full_name")

  console.log("[v0] Managers query result:", { managers, error })

  // Fetch all departments for lookup
  const { data: departments } = await supabase.from("departments").select("*")
  const departmentMap = new Map(departments?.map((d) => [d.id, d.name]) || [])

  // Get employee counts for each manager
  const managerIds = managers?.map((m) => m.id) || []
  const { data: employeeCounts } = await supabase
    .from("profiles")
    .select("manager_id")
    .in("manager_id", managerIds)
    .eq("role", "employee")

  const employeeCountMap = new Map<string, number>()
  employeeCounts?.forEach((e) => {
    const count = employeeCountMap.get(e.manager_id) || 0
    employeeCountMap.set(e.manager_id, count + 1)
  })

  return (
    <div className="flex h-screen">
      <Sidebar user={profile} />
      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto p-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Managers</h1>
              <p className="text-muted-foreground">View and manage all managers in the system</p>
            </div>
            <Link href="/all-users">
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                Promote to Manager
              </Button>
            </Link>
          </div>

          <div className="mb-6 flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search managers..."
                className="pl-9"
                name="search"
                defaultValue={searchParams.search}
              />
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-destructive bg-destructive/10 p-4">
              <p className="text-sm text-destructive">Error loading managers: {error.message}</p>
            </div>
          )}

          {!managers || managers.length === 0 ? (
            <div className="rounded-lg border border-dashed p-12 text-center">
              <UserCheck className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No managers found</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {searchParams.search
                  ? "Try adjusting your search criteria"
                  : "Promote users to manager role to get started"}
              </p>
            </div>
          ) : (
            <div className="rounded-lg border">
              <table className="w-full">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="p-4 text-left text-sm font-medium">Manager</th>
                    <th className="p-4 text-left text-sm font-medium">Email</th>
                    <th className="p-4 text-left text-sm font-medium">Department</th>
                    <th className="p-4 text-left text-sm font-medium">Team Size</th>
                    <th className="p-4 text-left text-sm font-medium">Status</th>
                    <th className="p-4 text-right text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {managers.map((manager) => (
                    <tr key={manager.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                            {manager.full_name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium">{manager.full_name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">{manager.email}</td>
                      <td className="p-4 text-sm">
                        {manager.department_id ? departmentMap.get(manager.department_id) || "Unknown" : "Unassigned"}
                      </td>
                      <td className="p-4 text-sm">{employeeCountMap.get(manager.id) || 0} employees</td>
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            manager.status === "active" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                          }`}
                        >
                          {manager.status || "active"}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <UserActionsMenu user={manager} currentUserRole="admin" isSuperAdmin={profile.is_super_admin} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
