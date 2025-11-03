"use client"

import { useState } from "react"
import { MoreVertical } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { AssignDepartmentDialog } from "@/components/assign-department-dialog"

interface DepartmentCellProps {
  userId: string
  userName: string
  departmentName: string | null
  currentDepartmentId: string | null
  departments: Array<{ id: string; name: string }>
  isSuperAdmin: boolean
}

export function DepartmentCell({
  userId,
  userName,
  departmentName,
  currentDepartmentId,
  departments,
  isSuperAdmin,
}: DepartmentCellProps) {
  const [showAssignDialog, setShowAssignDialog] = useState(false)

  const menuText = departmentName ? "Reassign Department" : "Assign Department"

  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-sm">
        {departmentName ? departmentName : <span className="text-muted-foreground">No department</span>}
      </span>

      {isSuperAdmin && (
        <>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">Department actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowAssignDialog(true)}>{menuText}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <AssignDepartmentDialog
            userId={userId}
            userName={userName}
            currentDepartmentId={currentDepartmentId}
            departments={departments}
            open={showAssignDialog}
            onOpenChange={setShowAssignDialog}
          />
        </>
      )}
    </div>
  )
}
