"use client"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useRouter, useParams } from "next/navigation"
import { useState, useEffect } from "react"
import { formatDate, getWeekDates, getWeekStart } from "@/lib/utils/date"
import { cn } from "@/lib/utils"
import { ChevronLeft, ChevronRight } from "lucide-react"

export default function EmployeeAvailabilityPage() {
  const params = useParams()
  const router = useRouter()
  const employeeId = params.id as string

  const [employee, setEmployee] = useState<any>(null)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [availability, setAvailability] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const weekStart = getWeekStart(currentDate)
  const weekDates = getWeekDates(weekStart)

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient()

      // Get employee info
      const { data: empData } = await supabase.from("profiles").select("*").eq("id", employeeId).single()
      setEmployee(empData)

      // Get availability for the week
      const weekEnd = weekDates[weekDates.length - 1]
      const { data: availData } = await supabase
        .from("availability")
        .select("*")
        .eq("employee_id", employeeId)
        .gte("date", formatDate(weekStart))
        .lte("date", formatDate(weekEnd))

      const availMap: Record<string, string> = {}
      availData?.forEach((avail) => {
        availMap[avail.date] = avail.status
      })
      setAvailability(availMap)
    }

    fetchData()
  }, [employeeId, currentDate])

  const handleStatusChange = (date: string, status: string) => {
    setAvailability((prev) => ({
      ...prev,
      [date]: status,
    }))
  }

  const handleSave = async () => {
    setIsLoading(true)
    setError(null)

    const supabase = createClient()

    try {
      // Delete existing availability for these dates
      const dates = Object.keys(availability)
      await supabase.from("availability").delete().eq("employee_id", employeeId).in("date", dates)

      // Insert new availability
      const records = Object.entries(availability).map(([date, status]) => ({
        employee_id: employeeId,
        date,
        status,
      }))

      const { error: insertError } = await supabase.from("availability").insert(records)

      if (insertError) throw insertError

      router.push("/employees")
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "border-green-500 bg-green-50 text-green-900"
      case "preferred":
        return "border-orange-500 bg-orange-50 text-orange-900"
      case "unavailable":
        return "border-gray-400 bg-gray-100 text-gray-700"
      default:
        return "border-gray-300 bg-white text-gray-600"
    }
  }

  const prevWeek = () => {
    const newDate = new Date(currentDate)
    newDate.setDate(newDate.getDate() - 7)
    setCurrentDate(newDate)
  }

  const nextWeek = () => {
    const newDate = new Date(currentDate)
    newDate.setDate(newDate.getDate() + 7)
    setCurrentDate(newDate)
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle>Update Availability</CardTitle>
          <CardDescription>
            {employee?.full_name && `Set availability preferences for ${employee.full_name}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 flex items-center justify-center gap-4">
            <Button variant="outline" size="icon" onClick={prevWeek}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-lg font-medium">
              {weekStart.toLocaleDateString("en-US", { month: "long", day: "numeric" })} -{" "}
              {weekDates[6].toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </div>
            <Button variant="outline" size="icon" onClick={nextWeek}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {weekDates.map((date) => {
              const dateKey = formatDate(date)
              const status = availability[dateKey] || "available"
              return (
                <div key={dateKey} className={cn("rounded-lg border-2 p-4", getStatusColor(status))}>
                  <div className="mb-2 font-medium">{date.toLocaleDateString("en-US", { weekday: "long" })}</div>
                  <div className="mb-3 text-sm text-muted-foreground">
                    {date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </div>
                  <Select value={status} onValueChange={(value) => handleStatusChange(dateKey, value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="available">Available</SelectItem>
                      <SelectItem value="preferred">Preferred</SelectItem>
                      <SelectItem value="unavailable">Unavailable</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )
            })}
          </div>

          {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

          <div className="mt-6 flex gap-2">
            <Button type="button" variant="outline" onClick={() => router.back()} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isLoading} className="flex-1">
              {isLoading ? "Saving..." : "Save Availability"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
