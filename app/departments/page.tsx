import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Sidebar } from "@/components/sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Users, Building2 } from "lucide-react"
import Link from "next/link"
import { DeleteDepartmentDialog } from "@/components/delete-department-dialog"

export default async function DepartmentsPage() {
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

  const { data: departments, error: deptError } = await supabase
    .from("departments")
    .select("*")
    .order("created_at", { ascending: false })

  console.log("[v0] Departments query result:", { departments, error: deptError })

  // Get employee counts separately for each department
  const departmentsWithCounts = await Promise.all(
    (departments || []).map(async (dept) => {
      const { count } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("department_id", dept.id)

      const { data: manager } = await supabase.from("profiles").select("full_name").eq("id", dept.manager_id).single()

      return {
        ...dept,
        employeeCount: count || 0,
        managerName: manager?.full_name || null,
      }
    }),
  )

  console.log("[v0] Departments with counts:", departmentsWithCounts)

  return (
    <div className="flex h-screen">
      <Sidebar user={profile} />
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Departments</h1>
              <p className="text-muted-foreground">Manage departments and assign managers</p>
            </div>
            <Button asChild>
              <Link href="/departments/new">
                <Plus className="mr-2 h-4 w-4" />
                Add Department
              </Link>
            </Button>
          </div>

          {deptError && (
            <Card className="mb-4 border-red-500">
              <CardContent className="pt-6">
                <p className="text-sm text-red-600">Error loading departments: {deptError.message}</p>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {departmentsWithCounts?.map((dept) => (
              <Card key={dept.id}>
                <CardHeader>
                  <CardTitle>{dept.name}</CardTitle>
                  <CardDescription>{dept.description || "No description"}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>{dept.employeeCount} employees</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/departments/${dept.id}`}>View</Link>
                      </Button>
                      <DeleteDepartmentDialog
                        departmentId={dept.id}
                        departmentName={dept.name}
                        employeeCount={dept.employeeCount}
                      />
                    </div>
                  </div>
                  {dept.managerName && (
                    <p className="mt-2 text-sm text-muted-foreground">Manager: {dept.managerName}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {(!departmentsWithCounts || departmentsWithCounts.length === 0) && !deptError && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Building2 className="mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="mb-2 text-lg font-semibold">No departments yet</h3>
                <p className="mb-4 text-sm text-muted-foreground">Get started by creating your first department</p>
                <Button asChild>
                  <Link href="/departments/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Department
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
