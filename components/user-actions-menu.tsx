"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MoreVertical, Eye, Edit, Trash2, Shield, Bell } from "lucide-react"
import { deleteUser, requestAdminAction, checkAdminActionPermission } from "@/app/all-users/actions"
import { sendManagerNotification } from "@/app/managers/actions"
import { useToast } from "@/hooks/use-toast"

interface UserActionsMenuProps {
  userId: string
  userName: string
  userRole: string
  currentUserIsSuperAdmin: boolean
}

export function UserActionsMenu({ userId, userName, userRole, currentUserIsSuperAdmin }: UserActionsMenuProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showApprovalDialog, setShowApprovalDialog] = useState(false)
  const [showNotificationDialog, setShowNotificationDialog] = useState(false)
  const [deleteReason, setDeleteReason] = useState("")
  const [approvalReason, setApprovalReason] = useState("")
  const [notificationTitle, setNotificationTitle] = useState("")
  const [notificationMessage, setNotificationMessage] = useState("")
  const [pendingAction, setPendingAction] = useState<"view" | "edit" | "remove" | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleAction = async (action: "view" | "edit" | "remove") => {
    if (userRole === "admin" && !currentUserIsSuperAdmin) {
      // Check if permission is needed
      const permission = await checkAdminActionPermission(userId, action)

      if (!permission.allowed && permission.needsApproval) {
        setPendingAction(action)
        setShowApprovalDialog(true)
        return
      }

      if (!permission.allowed) {
        toast({
          title: "Permission Denied",
          description: permission.reason || "You don't have permission to perform this action",
          variant: "destructive",
        })
        return
      }
    }

    // Perform the action
    if (action === "view") {
      router.push(`/all-users/${userId}`)
    } else if (action === "edit") {
      router.push(`/all-users/${userId}?tab=profile`)
    } else if (action === "remove") {
      setShowDeleteDialog(true)
    }
  }

  const handleRequestApproval = async () => {
    if (!pendingAction) return

    setIsLoading(true)
    const result = await requestAdminAction(userId, pendingAction, approvalReason)
    setIsLoading(false)

    if (result.error) {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      })
    } else {
      toast({
        title: "Request Sent",
        description: result.message || "Your request has been sent to the super admin",
      })
      setShowApprovalDialog(false)
      setApprovalReason("")
      setPendingAction(null)
    }
  }

  const handleDelete = async () => {
    setIsLoading(true)
    const result = await deleteUser(userId, deleteReason)
    setIsLoading(false)

    if (result.error) {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      })
    } else {
      toast({
        title: "User Removed",
        description: `${userName} has been removed from the system`,
      })
      setShowDeleteDialog(false)
      router.refresh()
    }
  }

  const handleSendNotification = async () => {
    setIsLoading(true)
    const result = await sendManagerNotification(userId, notificationTitle, notificationMessage)
    setIsLoading(false)

    if (result.error) {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      })
    } else {
      toast({
        title: "Notification Sent",
        description: `Notification sent to ${userName}`,
      })
      setShowNotificationDialog(false)
      setNotificationTitle("")
      setNotificationMessage("")
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => handleAction("view")}>
            <Eye className="mr-2 h-4 w-4" />
            View Profile
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleAction("edit")}>
            <Edit className="mr-2 h-4 w-4" />
            Edit User
          </DropdownMenuItem>
          {(userRole === "manager" || userRole === "employee") && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowNotificationDialog(true)}>
                <Bell className="mr-2 h-4 w-4" />
                Send Notification
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => handleAction("remove")} className="text-destructive">
            <Trash2 className="mr-2 h-4 w-4" />
            Remove User
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {userName}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the user and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="reason">Reason for removal (required)</Label>
            <Textarea
              id="reason"
              placeholder="Enter reason for removing this user..."
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={!deleteReason.trim() || isLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLoading ? "Removing..." : "Remove User"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Approval Request Dialog */}
      <AlertDialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-amber-500" />
              Super Admin Approval Required
            </AlertDialogTitle>
            <AlertDialogDescription>
              {userName} is an admin. You need approval from the super admin to {pendingAction} this user.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="approval-reason">Reason for request (required)</Label>
            <Textarea
              id="approval-reason"
              placeholder="Explain why you need to perform this action..."
              value={approvalReason}
              onChange={(e) => setApprovalReason(e.target.value)}
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingAction(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRequestApproval} disabled={!approvalReason.trim() || isLoading}>
              {isLoading ? "Sending..." : "Request Approval"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Notification Dialog */}
      <Dialog open={showNotificationDialog} onOpenChange={setShowNotificationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Notification to {userName}</DialogTitle>
            <DialogDescription>Send a notification about status updates or important information.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="notification-title">Title</Label>
              <Input
                id="notification-title"
                placeholder="e.g., Account Status Update"
                value={notificationTitle}
                onChange={(e) => setNotificationTitle(e.target.value)}
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="notification-message">Message</Label>
              <Textarea
                id="notification-message"
                placeholder="Enter your message..."
                value={notificationMessage}
                onChange={(e) => setNotificationMessage(e.target.value)}
                className="mt-2"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNotificationDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSendNotification}
              disabled={!notificationTitle.trim() || !notificationMessage.trim() || isLoading}
            >
              {isLoading ? "Sending..." : "Send Notification"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
