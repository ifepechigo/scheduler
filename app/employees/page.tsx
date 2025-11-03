import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Sidebar } from "@/components/sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronLeft, ChevronRight, Search } from "lucide-react"
import Link from "next/link"
import { formatDate, getWeekDates, getWeekStart, formatDateRange } from "@/lib/utils/date"
import { cn } from "@/lib/utils"

export default async function EmployeesPage({ searchParams }: { searchParams: { week?: string } }) {
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

  // Get all employees
  const { data: employees } = await supabase
    .from("profiles")
    .select("id, full_name, role, department_id, departments(name)")
    .order("full_name")

  // Get availability for the week
  const { data: availability } = await supabase
    .from("availability")
    .select("*")
    .gte("date", formatDate(weekStart))
    .lte("date", formatDate(weekEnd))

  // Group availability by employee and date
  const availabilityMap: Record<string, Record<string, any>> = {}
  availability?.forEach((avail) => {
    if (!availabilityMap[avail.employee_id]) {
      availabilityMap[avail.employee_id] = {}
    }
    availabilityMap[avail.employee_id][avail.date] = avail
  })

  // Navigation dates
  const prevWeek = new Date(weekStart)
  prevWeek.setDate(prevWeek.getDate() - 7)
  const nextWeek = new Date(weekStart)
  nextWeek.setDate(nextWeek.getDate() + 7)

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "bg-green-100 text-green-800"
      case "preferred":
        return "bg-orange-100 text-orange-800"
      case "unavailable":
        return "bg-gray-200 text-gray-700"
      default:
        return "bg-gray-100 text-gray-600"
    }
  }

  return (
    <div className="flex h-screen">
      <Sidebar user={profile} />
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">Employee Availability</h1>
            <p className="text-muted-foreground">View employee availability to plan shifts effectively</p>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Button variant="outline" size="icon" asChild>
                    <Link href={`/employees?week=${formatDate(prevWeek)}`}>
                      <ChevronLeft className="h-4 w-4" />
                    </Link>
                  </Button>
                  <CardTitle>{formatDateRange(weekStart, weekEnd)}</CardTitle>
                  <Button variant="outline" size="icon" asChild>
                    <Link href={`/employees?week=${formatDate(nextWeek)}`}>
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Select defaultValue="all">
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Team: All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Team: All</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select defaultValue="all">
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Role: All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Role: All</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline">
                    <Search className="mr-2 h-4 w-4" />
                    Search Employee
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="p-3 text-left font-medium">Employee</th>
                      {weekDates.map((date) => (
                        <th key={date.toISOString()} className="min-w-32 p-3 text-center font-medium">
                          <div>{date.toLocaleDateString("en-US", { weekday: "long" })}</div>
                          <div className="text-sm font-normal text-muted-foreground">
                            {date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </div>
                        </th>
                      ))}
                      <th className="p-3 text-center font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees?.map((employee) => {
                      const empAvailability = availabilityMap[employee.id] || {}
                      return (
                        <tr key={employee.id} className="border-b">
                          <td className="p-3">
                            <div className="font-medium">{employee.full_name}</div>
                            <div className="text-sm text-muted-foreground capitalize">
                              {employee.role}
                              {(employee.departments as any)?.name && ` • ${(employee.departments as any).name}`}
                            </div>
                          </td>
                          {weekDates.map((date) => {
                            const dateKey = formatDate(date)
                            const avail = empAvailability[dateKey]
                            const status = avail?.status || "available"
                            return (
                              <td key={date.toISOString()} className="p-3">
                                <div className="flex justify-center">
                                  <span
                                    className={cn(
                                      "rounded-full px-3 py-1 text-xs font-medium capitalize",
                                      getStatusColor(status),
                                    )}
                                  >
                                    {status}
                                  </span>
                                </div>
                              </td>
                            )
                          })}
                          <td className="p-3 text-center">
                            <Button variant="link" size="sm" asChild>
                              <Link href={`/employees/${employee.id}/availability`}>Request Update</Link>
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 flex items-center gap-6 border-t pt-4">
                <div className="text-sm font-medium">Legend</div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-green-500" />
                  <span className="text-sm">Available</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-orange-500" />
                  <span className="text-sm">Preferred</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-gray-400" />
                  <span className="text-sm">Unavailable</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
