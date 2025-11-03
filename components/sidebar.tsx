"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { LayoutDashboard, Users, Building2, Calendar, LogOut } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/auth/login")
    router.refresh()
  }

  const links = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/all-users", label: "All Users", icon: Users },
    { href: "/departments", label: "Departments", icon: Building2 },
    { href: "/schedule", label: "Schedule", icon: Calendar },
  ]

  return (
    <div className="flex h-full w-64 flex-col border-r bg-background">
      <div className="p-6">
        <h2 className="text-2xl font-bold">Scheduler</h2>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {links.map((link) => {
          const Icon = link.icon
          return (
            <Link key={link.href} href={link.href}>
              <Button variant={pathname === link.href ? "secondary" : "ghost"} className="w-full justify-start">
                <Icon className="mr-2 h-4 w-4" />
                {link.label}
              </Button>
            </Link>
          )
        })}
      </nav>
      <div className="p-4">
        <Button variant="outline" className="w-full bg-transparent" onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>
    </div>
  )
}
