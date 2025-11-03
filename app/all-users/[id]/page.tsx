import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Sidebar } from "@/components/sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  ArrowLeft,
  Calendar,
  Clock,
  Shield,
  UserX,
  UserCheck,
  Download,
  AlertTriangle,
  CheckCircle,
  XCircle,
  MessageSquare,
} from "lucide-react"
import Link from "next/link"
import { logAuditEvent } from "@/lib/audit"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  updateUserProfile,
  suspendUser,
  activateUser,
  updateTimeOffRequest,
  exportUserData,
  assignShiftToUser,
  deleteShift,
} from "./actions"
import { Separator } from "@/components/ui/separator"

export default async function EditUserPage({ params }: { params: { id: string } }) {
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

  await logAuditEvent("view_user_profile", params.id, {
    viewed_by: profile.full_name,
  })

  // Get user to edit
  const { data: userToEdit } = await supabase
    .from("profiles")
    .select(`
      *,
      departments (
        id,
        name
      )
    `)
    .eq("id", params.id)
    .single()

  if (!userToEdit) {
    redirect("/all-users")
  }

  const { data: shifts } = await supabase
    .from("shifts")
    .select("*, departments(name)")
    .eq("employee_id", params.id)
    .order("shift_date", { ascending: true })

  const now = new Date()
  const upcomingShifts = shifts?.filter((s) => new Date(s.shift_date) >= now) || []
  const pastShifts = shifts?.filter((s) => new Date(s.shift_date) < now) || []

  const { data: timeOffRequests } = await supabase
    .from("time_off_requests")
    .select("*")
    .eq("employee_id", params.id)
    .order("created_at", { ascending: false })

  const { data: availability } = await supabase
    .from("availability")
    .select("*")
    .eq("employee_id", params.id)
    .order("week_start_date", { ascending: false })
    .limit(1)
    .single()

  const { data: auditLogs } = await supabase
    .from("audit_logs")
    .select("*")
    .eq("user_id", params.id)
    .order("created_at", { ascending: false })
    .limit(20)

  // Get all departments
  const { data: departments } = await supabase.from("departments").select("id, name").order("name")

  const totalHours =
    shifts?.reduce((acc, shift) => {
      const start = new Date(`2000-01-01T${shift.start_time}`)
      const end = new Date(`2000-01-01T${shift.end_time}`)
      const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
      return acc + hours
    }, 0) || 0

  return (
    <div className="flex h-screen">
      <Sidebar user={profile} />
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          <div className="mb-8">
            <Button variant="ghost" asChild className="mb-4">
              <Link href="/all-users">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to All Users
              </Link>
            </Button>
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold">{userToEdit.full_name}</h1>
                <p className="text-muted-foreground">
                  {userToEdit.email} • {userToEdit.role}
                </p>
              </div>
              <div className="flex gap-2">
                <form action={exportUserData.bind(null, params.id)}>
                  <Button type="submit" variant="outline" size="sm">
                    <Download className="mr-2 h-4 w-4" />
                    Export Data
                  </Button>
                </form>
                {userToEdit.status === "active" ? (
                  <form action={suspendUser.bind(null, params.id, "Admin action")}>
                    <Button type="submit" variant="outline" size="sm" className="text-destructive bg-transparent">
                      <UserX className="mr-2 h-4 w-4" />
                      Suspend User
                    </Button>
                  </form>
                ) : (
                  <form action={activateUser.bind(null, params.id)}>
                    <Button type="submit" variant="outline" size="sm" className="text-green-600 bg-transparent">
                      <UserCheck className="mr-2 h-4 w-4" />
                      Activate User
                    </Button>
                  </form>
                )}
              </div>
            </div>
          </div>

          <Alert className="mb-6 border-blue-200 bg-blue-50">
            <Shield className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-sm text-blue-900">
              <strong>Privacy Notice:</strong> This profile view is logged for GDPR compliance. Only access user data
              when necessary for legitimate business purposes.
            </AlertDescription>
          </Alert>

          {userToEdit.status === "suspended" && (
            <Alert className="mb-6 border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-sm text-red-900">
                <strong>User Suspended:</strong> This user account is currently suspended and cannot access the system.
              </AlertDescription>
            </Alert>
          )}

          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList>
              <TabsTrigger value="profile">Profile & Permissions</TabsTrigger>
              <TabsTrigger value="shifts">Shifts & Schedule</TabsTrigger>
              <TabsTrigger value="availability">Availability</TabsTrigger>
              <TabsTrigger value="timeoff">Time Off Requests</TabsTrigger>
              <TabsTrigger value="audit">Audit Logs</TabsTrigger>
              <TabsTrigger value="privacy">Privacy & Data</TabsTrigger>
            </TabsList>

            <TabsContent value="profile">
              <div className="max-w-2xl space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>User Information</CardTitle>
                    <CardDescription>Manage user role, department, and account status</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form action={updateUserProfile.bind(null, params.id)} className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="fullName">Full Name</Label>
                        <Input id="fullName" name="fullName" defaultValue={userToEdit.full_name} required />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" defaultValue={userToEdit.email || ""} disabled />
                        <p className="text-sm text-muted-foreground">Email cannot be changed</p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="role">Role</Label>
                        <Select name="role" defaultValue={userToEdit.role}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="employee">Employee</SelectItem>
                            <SelectItem value="manager">Manager</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-sm text-muted-foreground">
                          Admins have full access, managers can schedule their team, employees can view their shifts
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="department">Department</Label>
                        <Select name="department" defaultValue={userToEdit.department_id || "none"}>
                          <SelectTrigger>
                            <SelectValue placeholder={userToEdit.departments?.name || "No Department"} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No Department</SelectItem>
                            {departments?.map((dept) => (
                              <SelectItem key={dept.id} value={dept.id}>
                                {dept.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="status">Account Status</Label>
                        <Select name="status" defaultValue={userToEdit.status || "active"}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="suspended">Suspended</SelectItem>
                            <SelectItem value="terminated">Terminated</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-sm text-muted-foreground">
                          Suspended users cannot log in. Terminated users are archived.
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <Button type="submit">Save Changes</Button>
                        <Button type="button" variant="outline" asChild>
                          <Link href="/all-users">Cancel</Link>
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Admin Actions</CardTitle>
                    <CardDescription>Administrative operations for this user</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button variant="outline" className="w-full justify-start bg-transparent" size="sm">
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Send Direct Message
                    </Button>
                    <Button variant="outline" className="w-full justify-start bg-transparent" size="sm">
                      <Calendar className="mr-2 h-4 w-4" />
                      Assign to Shift
                    </Button>
                    <Separator />
                    <p className="text-xs text-muted-foreground">All actions are logged for audit purposes</p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="shifts" className="space-y-6">
              <div className="grid gap-6 md:grid-cols-3">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Total Shifts</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{shifts?.length || 0}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Upcoming Shifts</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{upcomingShifts.length}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{totalHours.toFixed(1)}h</div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Assign New Shift</CardTitle>
                  <CardDescription>Create a new shift assignment for this employee</CardDescription>
                </CardHeader>
                <CardContent>
                  <form
                    action={async (formData: FormData) => {
                      "use server"
                      const shiftDate = formData.get("shiftDate") as string
                      const startTime = formData.get("startTime") as string
                      const endTime = formData.get("endTime") as string
                      const departmentId = formData.get("departmentId") as string
                      const role = formData.get("role") as string
                      await assignShiftToUser(params.id, shiftDate, startTime, endTime, departmentId, role)
                    }}
                    className="space-y-4"
                  >
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="shiftDate">Date</Label>
                        <Input id="shiftDate" name="shiftDate" type="date" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="departmentId">Department</Label>
                        <Select name="departmentId" required>
                          <SelectTrigger>
                            <SelectValue placeholder="Select department" />
                          </SelectTrigger>
                          <SelectContent>
                            {departments?.map((dept) => (
                              <SelectItem key={dept.id} value={dept.id}>
                                {dept.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="startTime">Start Time</Label>
                        <Input id="startTime" name="startTime" type="time" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="endTime">End Time</Label>
                        <Input id="endTime" name="endTime" type="time" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="role">Role</Label>
                        <Input id="role" name="role" placeholder="e.g., Cashier, Server" required />
                      </div>
                    </div>
                    <Button type="submit">
                      <Calendar className="mr-2 h-4 w-4" />
                      Assign Shift
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Upcoming Shifts</CardTitle>
                  <CardDescription>Future scheduled shifts for this employee</CardDescription>
                </CardHeader>
                <CardContent>
                  {upcomingShifts.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No upcoming shifts scheduled</p>
                  ) : (
                    <div className="space-y-3">
                      {upcomingShifts.map((shift) => (
                        <div key={shift.id} className="flex items-center justify-between rounded-lg border p-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">
                                {new Date(shift.shift_date).toLocaleDateString("en-US", {
                                  weekday: "short",
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Clock className="h-4 w-4" />
                              <span>
                                {shift.start_time} - {shift.end_time}
                              </span>
                            </div>
                            {shift.departments && (
                              <Badge variant="secondary" className="mt-1">
                                {shift.departments.name}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={
                                shift.status === "published"
                                  ? "default"
                                  : shift.status === "draft"
                                    ? "secondary"
                                    : "outline"
                              }
                            >
                              {shift.status}
                            </Badge>
                            <form action={deleteShift.bind(null, shift.id, params.id)}>
                              <Button type="submit" variant="ghost" size="sm" className="text-destructive">
                                <UserX className="h-4 w-4" />
                              </Button>
                            </form>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Past Shifts</CardTitle>
                  <CardDescription>Completed shifts (last 10)</CardDescription>
                </CardHeader>
                <CardContent>
                  {pastShifts.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No past shifts</p>
                  ) : (
                    <div className="space-y-3">
                      {pastShifts.slice(0, 10).map((shift) => (
                        <div key={shift.id} className="flex items-center justify-between rounded-lg border p-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">
                                {new Date(shift.shift_date).toLocaleDateString("en-US", {
                                  weekday: "short",
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Clock className="h-4 w-4" />
                              <span>
                                {shift.start_time} - {shift.end_time}
                              </span>
                            </div>
                            {shift.departments && (
                              <Badge variant="secondary" className="mt-1">
                                {shift.departments.name}
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="availability">
              <Card>
                <CardHeader>
                  <CardTitle>Employee Availability</CardTitle>
                  <CardDescription>Current availability preferences and constraints</CardDescription>
                </CardHeader>
                <CardContent>
                  {!availability ? (
                    <p className="text-sm text-muted-foreground">No availability set for this employee</p>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-7 gap-2">
                        {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => {
                          const dayKey = day.toLowerCase() as keyof typeof availability
                          const status = availability[dayKey] as string
                          return (
                            <div key={day} className="text-center">
                              <div className="text-sm font-medium mb-2">{day.slice(0, 3)}</div>
                              <Badge
                                variant={
                                  status === "available" ? "default" : status === "preferred" ? "secondary" : "outline"
                                }
                                className="w-full"
                              >
                                {status || "N/A"}
                              </Badge>
                            </div>
                          )
                        })}
                      </div>
                      <div className="pt-4 border-t">
                        <p className="text-sm text-muted-foreground">
                          Last updated:{" "}
                          {availability.updated_at ? new Date(availability.updated_at).toLocaleDateString() : "Never"}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="timeoff">
              <Card>
                <CardHeader>
                  <CardTitle>Time Off Requests</CardTitle>
                  <CardDescription>Manage employee time-off requests and approvals</CardDescription>
                </CardHeader>
                <CardContent>
                  {!timeOffRequests || timeOffRequests.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No time-off requests</p>
                  ) : (
                    <div className="space-y-3">
                      {timeOffRequests.map((request) => (
                        <div key={request.id} className="rounded-lg border p-4 space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium capitalize">{request.type}</span>
                                <Badge
                                  variant={
                                    request.status === "approved"
                                      ? "default"
                                      : request.status === "denied"
                                        ? "destructive"
                                        : "secondary"
                                  }
                                >
                                  {request.status}
                                </Badge>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {new Date(request.start_date).toLocaleDateString()} -{" "}
                                {new Date(request.end_date).toLocaleDateString()}
                              </div>
                              {request.reason && <p className="text-sm text-muted-foreground mt-2">{request.reason}</p>}
                            </div>
                          </div>
                          {request.status === "pending" && (
                            <div className="flex gap-2 pt-2 border-t">
                              <form action={updateTimeOffRequest.bind(null, request.id, "approved")}>
                                <Button type="submit" size="sm" variant="default">
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  Approve
                                </Button>
                              </form>
                              <form action={updateTimeOffRequest.bind(null, request.id, "denied")}>
                                <Button
                                  type="submit"
                                  size="sm"
                                  variant="outline"
                                  className="text-destructive bg-transparent"
                                >
                                  <XCircle className="mr-2 h-4 w-4" />
                                  Deny
                                </Button>
                              </form>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="audit">
              <Card>
                <CardHeader>
                  <CardTitle>Audit Logs</CardTitle>
                  <CardDescription>Recent activity and changes for this user (last 20 events)</CardDescription>
                </CardHeader>
                <CardContent>
                  {!auditLogs || auditLogs.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No audit logs available</p>
                  ) : (
                    <div className="space-y-2">
                      {auditLogs.map((log) => (
                        <div key={log.id} className="flex items-start gap-3 text-sm border-b pb-2 last:border-0">
                          <div className="flex-1">
                            <div className="font-medium">{log.action.replace(/_/g, " ").toUpperCase()}</div>
                            <div className="text-muted-foreground text-xs">
                              {new Date(log.created_at).toLocaleString()}
                            </div>
                            {log.metadata && (
                              <div className="text-xs text-muted-foreground mt-1">
                                {JSON.stringify(log.metadata, null, 2)}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="privacy">
              <Card>
                <CardHeader>
                  <CardTitle>Privacy & Data Management</CardTitle>
                  <CardDescription>GDPR compliance and data protection information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-medium mb-2">Data Stored</h3>
                      <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                        <li>Personal information (name, email)</li>
                        <li>Employment details (role, department)</li>
                        <li>Shift schedules and availability</li>
                        <li>Time-off requests</li>
                      </ul>
                    </div>

                    <div>
                      <h3 className="font-medium mb-2">GDPR Consent</h3>
                      <div className="flex items-center gap-2">
                        <Badge variant={userToEdit.gdpr_consent ? "default" : "secondary"}>
                          {userToEdit.gdpr_consent ? "Consent Given" : "Pending Consent"}
                        </Badge>
                        {userToEdit.gdpr_consent_date && (
                          <span className="text-sm text-muted-foreground">
                            on {new Date(userToEdit.gdpr_consent_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      <h3 className="font-medium mb-2">Data Retention</h3>
                      <p className="text-sm text-muted-foreground">
                        User data is retained for the duration of employment plus 7 years as required by law.
                      </p>
                    </div>

                    <div className="pt-4 border-t">
                      <h3 className="font-medium mb-3">Data Subject Rights</h3>
                      <div className="space-y-2">
                        <Button variant="outline" size="sm" className="w-full justify-start bg-transparent">
                          Export User Data (GDPR Request)
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full justify-start text-destructive bg-transparent"
                        >
                          Request Data Deletion
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        These actions are logged and may require additional verification
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
