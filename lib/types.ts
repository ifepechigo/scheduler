export type UserRole = "admin" | "manager" | "employee"
export type AvailabilityStatus = "available" | "preferred" | "unavailable"
export type ShiftStatus = "draft" | "published" | "completed"

export interface Profile {
  id: string
  email: string
  full_name: string
  role: UserRole
  department_id: string | null
  created_at: string
  updated_at: string
}

export interface Department {
  id: string
  name: string
  description: string | null
  manager_id: string | null
  created_at: string
  updated_at: string
}

export interface ShiftTemplate {
  id: string
  name: string
  start_time: string
  end_time: string
  department_id: string
  required_employees: number
  created_by: string | null
  created_at: string
}

export interface Shift {
  id: string
  template_id: string | null
  department_id: string
  employee_id: string | null
  shift_date: string
  start_time: string
  end_time: string
  status: ShiftStatus
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Availability {
  id: string
  employee_id: string
  date: string
  status: AvailabilityStatus
  notes: string | null
  created_at: string
  updated_at: string
}

export interface TimeOffRequest {
  id: string
  employee_id: string
  start_date: string
  end_date: string
  reason: string | null
  status: string
  approved_by: string | null
  created_at: string
  updated_at: string
}

export interface Notification {
  id: string
  user_id: string
  title: string
  message: string
  type: string
  read: boolean
  action_url: string | null
  created_at: string
}
