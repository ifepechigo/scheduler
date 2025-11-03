"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { assignUserToDepartment } from "@/app/all-users/actions"
import { useToast } from "@/hooks/use-toast"

interface AssignDepartmentDialogProps {
  userId: string
  userName: string
  currentDepartmentId: string | null
  departments: Array<{ id: string; name: string }>
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function AssignDepartmentDialog({
  userId,
  userName,
  currentDepartmentId,
  departments,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: AssignDepartmentDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [selectedDepartment, setSelectedDepartment] = useState<string>(currentDepartmentId || "none")
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const open = controlledOpen !== undefined ? controlledOpen : internalOpen
  const setOpen = controlledOnOpenChange || setInternalOpen

  useEffect(() => {
    setSelectedDepartment(currentDepartmentId || "none")
  }, [currentDepartmentId, open])

  const handleAssign = async () => {
    setIsLoading(true)
    try {
      const departmentId = selectedDepartment === "none" ? null : selectedDepartment

      console.log("[v0] Assigning user to department:", { userId, departmentId })

      const result = await assignUserToDepartment(userId, departmentId)

      if (result.error) {
        console.log("[v0] Assignment error:", result.error)
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        })
      } else {
        console.log("[v0] Assignment successful:", result.message)
        toast({
          title: "Success",
          description: result.message,
        })
        setOpen(false)
        router.refresh()
      }
    } catch (error) {
      console.log("[v0] Assignment exception:", error)
      toast({
        title: "Error",
        description: "Failed to assign department",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Department</DialogTitle>
          <DialogDescription>Assign {userName} to a department</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Department</label>
            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger>
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Department</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleAssign} disabled={isLoading}>
            {isLoading ? "Assigning..." : "Assign"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
