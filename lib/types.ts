export interface Profile {
  id: string
  email: string
  full_name: string
  role: "admin" | "manager" | "employee"
  department_id: string | null
  is_super_admin: boolean
  status: "active" | "suspended"
  created_at: string
  updated_at: string
}

export interface Department {
  id: string
  name: string
  description: string | null
  created_at: string
  updated_at: string
}

export interface Shift {
  id: string
  user_id: string
  department_id: string
  start_time: string
  end_time: string
  status: "scheduled" | "completed" | "cancelled"
  created_at: string
  updated_at: string
}

export interface TimeOffRequest {
  id: string
  user_id: string
  start_date: string
  end_date: string
  reason: string
  status: "pending" | "approved" | "denied"
  created_at: string
  updated_at: string
}
