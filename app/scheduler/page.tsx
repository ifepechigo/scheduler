import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Sidebar } from "@/components/sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Plus, AlertCircle, Clock, Sparkles } from "lucide-react"
import Link from "next/link"
import { formatDate, getWeekDates, getWeekStart, formatDateRange } from "@/lib/utils/date"
import { ShiftCard } from "@/components/shift-card"

export default async function SchedulerPage({
  searchParams,
}: {
  searchParams: { week?: string }
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

  if (!profile) {
    redirect("/auth/login")
  }

  // Get current week
  const weekParam = searchParams.week
  const currentDate = weekParam ? new Date(weekParam) : new Date()
  const weekStart = getWeekStart(currentDate)
  const weekDates = getWeekDates(weekStart)
  const weekEnd = weekDates[weekDates.length - 1]

  // Get shifts for the week
  const { data: shifts } = await supabase
    .from("shifts")
    .select(
      `
      *,
      employee:profiles!shifts_employee_id_fkey(id, full_name)
    `,
    )
    .gte("shift_date", formatDate(weekStart))
    .lte("shift_date", formatDate(weekEnd))
    .order("shift_date")
    .order("start_time")

  // Get employees for the department (if manager)
  const { data: employees } = await supabase
    .from("profiles")
    .select("id, full_name, department_id")
    .eq("role", "employee")

  // Group shifts by date and employee
  const shiftsByDate: Record<string, any[]> = {}
  shifts?.forEach((shift) => {
    const dateKey = shift.shift_date
    if (!shiftsByDate[dateKey]) {
      shiftsByDate[dateKey] = []
    }
    shiftsByDate[dateKey].push(shift)
  })

  // Get unique employees who have shifts this week
  const employeesWithShifts = new Set<string>()
  shifts?.forEach((shift) => {
    if (shift.employee_id) {
      employeesWithShifts.add(shift.employee_id)
    }
  })

  // Calculate stats
  const unassignedShifts = shifts?.filter((s) => !s.employee_id).length || 0
  const totalHours =
    shifts?.reduce((acc, shift) => {
      const start = new Date(`2000-01-01T${shift.start_time}`)
      const end = new Date(`2000-01-01T${shift.end_time}`)
      const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
      return acc + hours
    }, 0) || 0

  // Navigation dates
  const prevWeek = new Date(weekStart)
  prevWeek.setDate(prevWeek.getDate() - 7)
  const nextWeek = new Date(weekStart)
  nextWeek.setDate(nextWeek.getDate() + 7)

  return (
    <div className="flex h-screen">
      <Sidebar user={profile} />
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">
                {profile.role === "employee" ? "My Schedule" : "Review & Publish Schedule"}
              </h1>
              <p className="text-muted-foreground">
                {profile.role === "employee"
                  ? "View your upcoming shifts"
                  : "Review the generated schedule, resolve any conflicts, and publish it for the team."}
              </p>
            </div>
            {profile.role !== "employee" && (
              <div className="flex gap-2">
                <Button variant="outline">
                  <Sparkles className="mr-2 h-4 w-4" />
                  Auto-Generate Schedule
                </Button>
                <Button>Publish Schedule</Button>
              </div>
            )}
          </div>

          {profile.role !== "employee" && (
            <div className="mb-6 grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Unassigned Shifts</CardTitle>
                  <AlertCircle className="h-4 w-4 text-orange-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{unassignedShifts}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Conflicts</CardTitle>
                  <AlertCircle className="h-4 w-4 text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">0</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Scheduled Hours</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{Math.round(totalHours)}</div>
                </CardContent>
              </Card>
            </div>
          )}

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Button variant="outline" size="icon" asChild>
                    <Link href={`/scheduler?week=${formatDate(prevWeek)}`}>
                      <ChevronLeft className="h-4 w-4" />
                    </Link>
                  </Button>
                  <CardTitle>{formatDateRange(weekStart, weekEnd)}</CardTitle>
                  <Button variant="outline" size="icon" asChild>
                    <Link href={`/scheduler?week=${formatDate(nextWeek)}`}>
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
                {profile.role !== "employee" && (
                  <Button asChild variant="outline">
                    <Link href="/scheduler/create-shift">
                      <Plus className="mr-2 h-4 w-4" />
                      Create Shift
                    </Link>
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="p-3 text-left font-medium">Employee</th>
                      {weekDates.map((date) => (
                        <th key={date.toISOString()} className="min-w-32 p-3 text-left font-medium">
                          <div>{date.toLocaleDateString("en-US", { weekday: "short" })}</div>
                          <div className="text-sm font-normal text-muted-foreground">
                            {date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from(employeesWithShifts).map((employeeId) => {
                      const employee = shifts?.find((s) => s.employee_id === employeeId)?.employee as any
                      return (
                        <tr key={employeeId} className="border-b">
                          <td className="p-3 font-medium">{employee?.full_name}</td>
                          {weekDates.map((date) => {
                            const dateKey = formatDate(date)
                            const dayShifts = shiftsByDate[dateKey]?.filter((s) => s.employee_id === employeeId) || []
                            return (
                              <td key={date.toISOString()} className="p-3">
                                {dayShifts.length > 0 ? (
                                  <div className="space-y-2">
                                    {dayShifts.map((shift) => (
                                      <ShiftCard key={shift.id} shift={shift} />
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-center text-sm text-muted-foreground">Off</div>
                                )}
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}

                    {unassignedShifts > 0 && profile.role !== "employee" && (
                      <tr className="border-b">
                        <td className="p-3 font-medium">Unassigned</td>
                        {weekDates.map((date) => {
                          const dateKey = formatDate(date)
                          const dayShifts = shiftsByDate[dateKey]?.filter((s) => !s.employee_id) || []
                          return (
                            <td key={date.toISOString()} className="p-3">
                              {dayShifts.length > 0 ? (
                                <div className="space-y-2">
                                  {dayShifts.map((shift) => (
                                    <ShiftCard key={shift.id} shift={shift} isUnassigned />
                                  ))}
                                </div>
                              ) : null}
                            </td>
                          )
                        })}
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
