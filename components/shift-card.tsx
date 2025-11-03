"use client"

import { cn } from "@/lib/utils"
import { formatTime } from "@/lib/utils/date"
import type { Shift } from "@/lib/types"
import { AlertCircle } from "lucide-react"

interface ShiftCardProps {
  shift: Shift & { employee?: { full_name: string } }
  isConflict?: boolean
  isUnassigned?: boolean
  onClick?: () => void
}

export function ShiftCard({ shift, isConflict, isUnassigned, onClick }: ShiftCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative w-full rounded-lg border p-3 text-left transition-all hover:shadow-md",
        isConflict && "border-red-300 bg-red-50 text-red-900",
        isUnassigned && "border-orange-300 border-dashed bg-orange-50 text-orange-900",
        !isConflict && !isUnassigned && "border-blue-300 bg-blue-50 text-blue-900",
      )}
    >
      {isConflict && <AlertCircle className="absolute right-2 top-2 h-4 w-4 text-red-600" />}
      <div className="font-semibold">
        {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
      </div>
      <div className="text-sm">{shift.employee?.full_name || "Unassigned"}</div>
      {shift.notes && <div className="mt-1 text-xs opacity-75">{shift.notes}</div>}
      {isUnassigned && <div className="mt-2 text-xs font-medium text-blue-600">Assign</div>}
    </button>
  )
}
