import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Sidebar } from "@/components/sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Users, Building2, UserCog } from "lucide-react"
import Link from "next/link"
import { NotificationsPanel } from "@/components/notifications-panel"

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) {
    redirect("/auth/login")
  }

  // Get user profile
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  if (!profile) {
    redirect("/auth/login")
  }

  // Get statistics based on role
  let stats = {
    departments: 0,
    managers: 0,
    employees: 0,
    pendingRequests: 0,
  }

  let managerStats = {
    teamMembers: 0,
    upcomingShifts: 0,
    pendingTimeOff: 0,
    availableToday: 0,
  }

  if (profile.role === "admin") {
    const [{ count: deptCount }, { count: managerCount }, { count: empCount }, { count: pendingCount }] =
      await Promise.all([
        supabase.from("departments").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "manager"),
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("time_off_requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
      ])

    stats = {
      departments: deptCount || 0,
      managers: managerCount || 0,
      employees: empCount || 0,
      pendingRequests: pendingCount || 0,
    }
  }

  if (profile.role === "manager" && profile.department_id) {
    const today = new Date().toISOString().split("T")[0]
    const weekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]

    const [{ count: teamCount }, { count: shiftsCount }, { count: pendingTimeOffCount }, { data: availabilityData }] =
      await Promise.all([
        supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("department_id", profile.department_id)
          .eq("role", "employee"),
        supabase
          .from("shifts")
          .select("*", { count: "exact", head: true })
          .eq("department_id", profile.department_id)
          .gte("date", today)
          .lte("date", weekFromNow),
        supabase
          .from("time_off_requests")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending")
          .in(
            "user_id",
            supabase.from("profiles").select("id").eq("department_id", profile.department_id).eq("role", "employee"),
          ),
        supabase
          .from("availability")
          .select("status")
          .eq("date", today)
          .in(
            "user_id",
            supabase.from("profiles").select("id").eq("department_id", profile.department_id).eq("role", "employee"),
          )
          .eq("status", "available"),
      ])

    managerStats = {
      teamMembers: teamCount || 0,
      upcomingShifts: shiftsCount || 0,
      pendingTimeOff: pendingTimeOffCount || 0,
      availableToday: availabilityData?.length || 0,
    }
  }

  // Get department employee counts for chart
  const { data: departments } = await supabase.from("departments").select(`
      id,
      name,
      profiles:profiles(count)
    `)

  const departmentData =
    departments?.map((dept) => ({
      name: dept.name,
      count: (dept.profiles as any)?.[0]?.count || 0,
    })) || []

  return (
    <div className="flex h-screen">
      <Sidebar user={profile} />
      <div className="flex-1 overflow-auto">
        <div className="sticky top-0 z-10 flex items-center justify-end border-b bg-background p-4">
          <NotificationsPanel userId={profile.id} />
        </div>

        <div className="p-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">
                {profile.role === "admin"
                  ? "Admin Dashboard"
                  : profile.role === "manager"
                    ? "Manager Dashboard"
                    : "Dashboard"}
              </h1>
              <p className="text-muted-foreground">
                Welcome back, {profile.full_name}. Here&apos;s a summary of{" "}
                {profile.role === "manager" ? "your team" : "the system"}.
              </p>
            </div>
            {profile.role === "admin" && (
              <Button asChild>
                <Link href="/departments/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Department
                </Link>
              </Button>
            )}
          </div>

          {profile.role === "admin" && (
            <>
              <div className="mb-8 grid gap-4 md:grid-cols-3">
                <Link href="/departments">
                  <Card className="transition-colors hover:bg-muted/50">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Total Departments</CardTitle>
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">{stats.departments}</div>
                    </CardContent>
                  </Card>
                </Link>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Managers</CardTitle>
                    <UserCog className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      {stats.managers}{" "}
                      {stats.pendingRequests > 0 && (
                        <span className="text-base font-normal text-orange-600">({stats.pendingRequests} pending)</span>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Link href="/all-users">
                  <Card className="transition-colors hover:bg-muted/50">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">{stats.employees}</div>
                    </CardContent>
                  </Card>
                </Link>
              </div>

              <div className="grid gap-8 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Employees per Department</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex h-64 items-end justify-around gap-2">
                      {departmentData.map((dept, index) => {
                        const maxCount = Math.max(...departmentData.map((d) => d.count), 1)
                        const height = (dept.count / maxCount) * 100
                        const isHighest = dept.count === maxCount && maxCount > 0
                        return (
                          <div key={dept.name} className="flex flex-1 flex-col items-center gap-2">
                            <div
                              className={cn(
                                "w-full rounded-t-lg transition-all",
                                isHighest ? "bg-primary" : "bg-primary/30",
                              )}
                              style={{ height: `${height}%`, minHeight: dept.count > 0 ? "20px" : "0" }}
                            />
                            <span className="text-xs text-muted-foreground">{dept.name}</span>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Shift Fulfillment Rate</CardTitle>
                  </CardHeader>
                  <CardContent className="flex items-center justify-center">
                    <div className="relative h-48 w-48">
                      <svg className="h-full w-full -rotate-90 transform">
                        <circle
                          cx="96"
                          cy="96"
                          r="80"
                          stroke="currentColor"
                          strokeWidth="16"
                          fill="transparent"
                          className="text-muted"
                        />
                        <circle
                          cx="96"
                          cy="96"
                          r="80"
                          stroke="currentColor"
                          strokeWidth="16"
                          fill="transparent"
                          strokeDasharray={`${2 * Math.PI * 80}`}
                          strokeDashoffset={`${2 * Math.PI * 80 * (1 - 0.96)}`}
                          className="text-teal-500"
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-4xl font-bold">96%</span>
                        <span className="text-sm text-muted-foreground">Last 30 days</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}

          {profile.role === "manager" && (
            <>
              <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Team Members</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{managerStats.teamMembers}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Upcoming Shifts</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{managerStats.upcomingShifts}</div>
                    <p className="text-xs text-muted-foreground">Next 7 days</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
                    <UserCog className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{managerStats.pendingTimeOff}</div>
                    <p className="text-xs text-muted-foreground">Time-off requests</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Available Today</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{managerStats.availableToday}</div>
                    <p className="text-xs text-muted-foreground">Team members</p>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Button asChild variant="outline" className="h-auto justify-start p-4 bg-transparent">
                        <Link href="/scheduler">
                          <div className="flex items-center gap-3">
                            <div className="text-left">
                              <div className="font-semibold">Schedule</div>
                              <div className="text-xs text-muted-foreground">View and manage shifts</div>
                            </div>
                          </div>
                        </Link>
                      </Button>
                      <Button asChild variant="outline" className="h-auto justify-start p-4 bg-transparent">
                        <Link href="/employees">
                          <div className="flex items-center gap-3">
                            <Users className="h-5 w-5" />
                            <div className="text-left">
                              <div className="font-semibold">Team Availability</div>
                              <div className="text-xs text-muted-foreground">Check who's available</div>
                            </div>
                          </div>
                        </Link>
                      </Button>
                      <Button asChild variant="outline" className="h-auto justify-start p-4 bg-transparent">
                        <Link href="/time-off">
                          <div className="flex items-center gap-3">
                            <UserCog className="h-5 w-5" />
                            <div className="text-left">
                              <div className="font-semibold">Time-Off Requests</div>
                              <div className="text-xs text-muted-foreground">Review pending requests</div>
                            </div>
                          </div>
                        </Link>
                      </Button>
                      <Button asChild variant="outline" className="h-auto justify-start p-4 bg-transparent">
                        <Link href="/scheduler/create-shift">
                          <div className="flex items-center gap-3">
                            <Plus className="h-5 w-5" />
                            <div className="text-left">
                              <div className="font-semibold">Create Shift</div>
                              <div className="text-xs text-muted-foreground">Add new shift</div>
                            </div>
                          </div>
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Team Overview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between border-b pb-3">
                        <span className="text-sm text-muted-foreground">Total Team Members</span>
                        <span className="text-lg font-semibold">{managerStats.teamMembers}</span>
                      </div>
                      <div className="flex items-center justify-between border-b pb-3">
                        <span className="text-sm text-muted-foreground">Available Today</span>
                        <span className="text-lg font-semibold text-green-600">{managerStats.availableToday}</span>
                      </div>
                      <div className="flex items-center justify-between border-b pb-3">
                        <span className="text-sm text-muted-foreground">Shifts This Week</span>
                        <span className="text-lg font-semibold">{managerStats.upcomingShifts}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Pending Requests</span>
                        <span className="text-lg font-semibold text-orange-600">{managerStats.pendingTimeOff}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}

          {profile.role === "employee" && (
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>My Schedule</CardTitle>
                </CardHeader>
                <CardContent>
                  <Button asChild className="w-full">
                    <Link href="/scheduler">View My Shifts</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
