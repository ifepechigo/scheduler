"use client"

import { useState } from "react"
import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { deleteDepartment } from "@/app/departments/actions"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

interface DeleteDepartmentDialogProps {
  departmentId: string
  departmentName: string
  employeeCount: number
}

export function DeleteDepartmentDialog({ departmentId, departmentName, employeeCount }: DeleteDepartmentDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [open, setOpen] = useState(false)
  const router = useRouter()

  const handleDelete = async () => {
    setIsDeleting(true)
    const result = await deleteDepartment(departmentId)

    if (result.success) {
      toast.success("Department deleted successfully")
      setOpen(false)
      router.refresh()
    } else {
      toast.error(result.error || "Failed to delete department")
    }
    setIsDeleting(false)
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50">
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Department</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete <strong>{departmentName}</strong>?
            {employeeCount > 0 && (
              <span className="mt-2 block text-red-600">
                This department has {employeeCount} employee(s). Please reassign them before deleting.
              </span>
            )}
            {employeeCount === 0 && <span className="mt-2 block">This action cannot be undone.</span>}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              handleDelete()
            }}
            disabled={isDeleting || employeeCount > 0}
            className="bg-red-600 hover:bg-red-700"
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
