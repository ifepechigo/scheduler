"use client"

import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useTransition } from "react"

interface UserFiltersProps {
  departments: { id: string; name: string }[]
}

export function UserFilters({ departments }: UserFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const updateFilters = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value === "all" || !value) {
      params.delete(key)
    } else {
      params.set(key, value)
    }
    startTransition(() => {
      router.push(`/all-users?${params.toString()}`)
    })
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search users..."
          className="pl-9 sm:w-64"
          defaultValue={searchParams.get("search") || ""}
          onChange={(e) => {
            const value = e.target.value
            const params = new URLSearchParams(searchParams.toString())
            if (value) {
              params.set("search", value)
            } else {
              params.delete("search")
            }
            startTransition(() => {
              router.push(`/all-users?${params.toString()}`)
            })
          }}
        />
      </div>
      <Select defaultValue={searchParams.get("role") || "all"} onValueChange={(value) => updateFilters("role", value)}>
        <SelectTrigger className="w-full sm:w-40">
          <SelectValue placeholder="All Roles" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Roles</SelectItem>
          <SelectItem value="admin">Admin</SelectItem>
          <SelectItem value="manager">Manager</SelectItem>
          <SelectItem value="employee">Employee</SelectItem>
        </SelectContent>
      </Select>
      <Select
        defaultValue={searchParams.get("department") || "all"}
        onValueChange={(value) => updateFilters("department", value)}
      >
        <SelectTrigger className="w-full sm:w-40">
          <SelectValue placeholder="All Departments" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Departments</SelectItem>
          {departments?.map((dept) => (
            <SelectItem key={dept.id} value={dept.id}>
              {dept.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
