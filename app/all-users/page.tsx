import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Sidebar } from "@/components/sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { UserPlus, Mail, Shield, UserCog, User } from "lucide-react"
import Link from "next/link"
import { UserActionsMenu } from "@/components/user-actions-menu"
import { UserFilters } from "@/components/user-filters"
import { DepartmentCell } from "@/components/department-cell"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function AllUsersPage({
  searchParams,
}: {
  searchParams: { role?: string; department?: string; search?: string }
}) {
  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  if (!profile || profile.role !== "admin") {
    redirect("/dashboard")
  }

  console.log("[v0] Fetching users at:", new Date().toISOString())

  let query = supabase.from("profiles").select(`
    *,
    departments!department_id (
      id,
      name
    )
  `)

  // Apply filters
  if (searchParams.role && searchParams.role !== "all") {
    query = query.eq("role", searchParams.role)
  }

  if (searchParams.department && searchParams.department !== "all") {
    query = query.eq("department_id", searchParams.department)
  }

  if (searchParams.search) {
    query = query.ilike("full_name", `%${searchParams.search}%`)
  }

  const { data: users, error: usersError } = await query.order("full_name")

  // Get departments for filter
  const { data: departments } = await supabase.from("departments").select("id, name").order("name")

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return <Shield className="h-4 w-4" />
      case "manager":
        return <UserCog className="h-4 w-4" />
      default:
        return <User className="h-4 w-4" />
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-purple-100 text-purple-800"
      case "manager":
        return "bg-blue-100 text-blue-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="flex h-screen">
      <Sidebar user={profile} />
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">All Users</h1>
              <p className="text-muted-foreground">Manage all users and their roles across the organization</p>
            </div>
            <Button asChild>
              <Link href="/all-users/invite">
                <UserPlus className="mr-2 h-4 w-4" />
                Invite User
              </Link>
            </Button>
          </div>

          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle>Users ({users?.length || 0})</CardTitle>
                <UserFilters departments={departments || []} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="p-3 text-left font-medium">User</th>
                      <th className="p-3 text-left font-medium">Role</th>
                      <th className="p-3 text-left font-medium">Department</th>
                      <th className="p-3 text-left font-medium">Email</th>
                      <th className="p-3 text-center font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users?.map((userItem) => (
                      <tr key={userItem.id} className="border-b transition-colors hover:bg-muted/50">
                        <td className="p-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                              {userItem.full_name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{userItem.full_name}</span>
                                {userItem.is_super_admin && (
                                  <Badge variant="outline" className="border-amber-500 text-amber-600">
                                    <Shield className="mr-1 h-3 w-3" />
                                    Super Admin
                                  </Badge>
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground">ID: {userItem.id.slice(0, 8)}...</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <Badge className={getRoleBadgeColor(userItem.role)}>
                            <span className="mr-1">{getRoleIcon(userItem.role)}</span>
                            <span className="capitalize">{userItem.role}</span>
                          </Badge>
                        </td>
                        <td className="p-3">
                          <DepartmentCell
                            userId={userItem.id}
                            userName={userItem.full_name}
                            departmentName={userItem.departments?.name || null}
                            currentDepartmentId={userItem.department_id}
                            departments={departments || []}
                            isSuperAdmin={profile.is_super_admin || false}
                          />
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Mail className="h-4 w-4" />
                            <span>{userItem.email || "No email"}</span>
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <UserActionsMenu
                            userId={userItem.id}
                            userName={userItem.full_name}
                            userRole={userItem.role}
                            currentUserIsSuperAdmin={profile.is_super_admin || false}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {(!users || users.length === 0) && (
                <div className="flex flex-col items-center justify-center py-12">
                  <User className="mb-4 h-12 w-12 text-muted-foreground" />
                  <h3 className="mb-2 text-lg font-semibold">No users found</h3>
                  <p className="text-sm text-muted-foreground">
                    {usersError ? `Error: ${usersError.message}` : "Try adjusting your filters or search query"}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
