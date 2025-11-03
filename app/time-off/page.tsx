"use client"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { useState, useEffect } from "react"

export default function TimeOffPage() {
  const [sickEmployee, setSickEmployee] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [employees, setEmployees] = useState<any[]>([])
  const [shifts, setShifts] = useState<any[]>([])
  const [availableEmployees, setAvailableEmployees] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const fetchEmployees = async () => {
      const supabase = createClient()
      const { data } = await supabase.from("profiles").select("*").eq("role", "employee")
      setEmployees(data || [])
    }
    fetchEmployees()
  }, [])

  const handleSearch = async () => {
    if (!sickEmployee || !startDate || !endDate) return

    setIsLoading(true)
    const supabase = createClient()

    // Get shifts for the sick employee during the period
    const { data: shiftsData } = await supabase
      .from("shifts")
      .select(
        `
        *,
        employee:profiles!shifts_employee_id_fkey(full_name)
      `,
      )
      .eq("employee_id", sickEmployee)
      .gte("shift_date", startDate)
      .lte("shift_date", endDate)
      .order("shift_date")
      .order("start_time")

    setShifts(shiftsData || [])

    // Get available employees (those without conflicting shifts)
    const { data: allEmployees } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "employee")
      .neq("id", sickEmployee)

    setAvailableEmployees(allEmployees || [])
    setIsLoading(false)
  }

  const handleAssign = async (shiftId: string, employeeId: string) => {
    const supabase = createClient()

    const { error } = await supabase.from("shifts").update({ employee_id: employeeId }).eq("id", shiftId)

    if (!error) {
      // Refresh shifts
      handleSearch()
    }
  }

  const handlePauseShifts = async () => {
    if (!sickEmployee || !startDate || !endDate) return

    const supabase = createClient()

    // Update all shifts to unassigned
    await supabase
      .from("shifts")
      .update({ employee_id: null, notes: "Sick leave - needs replacement" })
      .eq("employee_id", sickEmployee)
      .gte("shift_date", startDate)
      .lte("shift_date", endDate)

    handleSearch()
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Manage Sick Leave</h1>
        <p className="text-muted-foreground">
          Select the employee calling in sick to view their upcoming shifts and find replacements.
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Sick Leave Period</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="employee">Sick Employee</Label>
              <Select value={sickEmployee} onValueChange={setSickEmployee}>
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input id="startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input id="endDate" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <Button onClick={handleSearch} disabled={!sickEmployee || !startDate || !endDate || isLoading}>
              {isLoading ? "Searching..." : "Find Shifts"}
            </Button>
            {shifts.length > 0 && (
              <Button variant="destructive" onClick={handlePauseShifts}>
                Pause All Shifts for Selected Period
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {shifts.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Shifts to Cover ({shifts.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {shifts.map((shift) => {
                  const isCovered = shift.employee_id !== sickEmployee
                  return (
                    <div key={shift.id} className="flex items-center justify-between rounded-lg border p-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant={isCovered ? "default" : "secondary"}>
                            {new Date(shift.shift_date).toLocaleDateString("en-US", {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                            })}
                          </Badge>
                          {isCovered && (
                            <Badge variant="outline" className="bg-green-50 text-green-700">
                              Covered
                            </Badge>
                          )}
                        </div>
                        <div className="mt-1 font-medium">
                          {shift.start_time} - {shift.end_time}
                        </div>
                        {isCovered && (
                          <div className="mt-1 text-sm text-muted-foreground">
                            Covered by {(shift.employee as any)?.full_name}
                          </div>
                        )}
                      </div>
                      {!isCovered && (
                        <Button variant="outline" size="sm">
                          Find
                        </Button>
                      )}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Available Team Members</CardTitle>
                <Select defaultValue="all">
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Filter by Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {availableEmployees.map((emp) => (
                  <div key={emp.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        {emp.full_name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium">{emp.full_name}</div>
                        <div className="text-sm capitalize text-muted-foreground">{emp.role}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-green-50 text-green-700">
                        Available
                      </Badge>
                      <Button
                        size="sm"
                        onClick={() => {
                          if (shifts[0]) {
                            handleAssign(shifts[0].id, emp.id)
                          }
                        }}
                      >
                        Assign
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
