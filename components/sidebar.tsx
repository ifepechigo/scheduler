"use client"

import { cn } from "@/lib/utils"
import {
  BarChart3,
  Calendar,
  LayoutDashboard,
  Settings,
  Users,
  Building2,
  LogOut,
  Clock,
  UserCog,
  UserCheck,
} from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import type { Profile } from "@/lib/types"

interface SidebarProps {
  user: Profile
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/auth/login")
    router.refresh()
  }

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["admin", "manager", "employee"] },
    { name: "Scheduler", href: "/scheduler", icon: Calendar, roles: ["admin", "manager"] },
    { name: "Time Off", href: "/time-off", icon: Clock, roles: ["admin", "manager"] },
    { name: "Availability", href: "/employees", icon: Users, roles: ["manager"] },
    { name: "All Users", href: "/all-users", icon: UserCog, roles: ["admin"] },
    { name: "Managers", href: "/managers", icon: UserCheck, roles: ["admin"] },
    { name: "Departments", href: "/departments", icon: Building2, roles: ["admin"] },
    { name: "Reports", href: "/reports", icon: BarChart3, roles: ["admin", "manager"] },
    { name: "Settings", href: "/settings", icon: Settings, roles: ["admin", "manager", "employee"] },
  ]

  const filteredNavigation = navigation.filter((item) => item.roles.includes(user.role))

  return (
    <div className="flex h-full w-64 flex-col border-r bg-background">
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <Calendar className="h-6 w-6 text-primary" />
        <span className="text-lg font-semibold">Schedul.io</span>
      </div>

      <div className="flex flex-1 flex-col gap-1 p-4">
        <div className="mb-4 flex items-center gap-3 rounded-lg bg-muted p-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
            {user.full_name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="truncate text-sm font-medium">{user.full_name}</p>
            <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
          </div>
        </div>

        <nav className="flex flex-col gap-1">
          {filteredNavigation.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="h-5 w-5" />
                {item.name}
              </Link>
            )
          })}
        </nav>
      </div>

      <div className="border-t p-4">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <LogOut className="h-5 w-5" />
          Log out
        </button>
      </div>
    </div>
  )
}
