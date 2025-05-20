import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { formatDistanceToNow } from "date-fns"

export default function JobStatusBadge({ status, escrowEndDate }) {
  const getStatusColor = (status) => {
    switch (status) {
      case "active":
        return "bg-blue-500 hover:bg-blue-600"
      case "in_progress":
        return "bg-amber-500 hover:bg-amber-600"
      case "completed":
        return "bg-green-500 hover:bg-green-600"
      case "cancelled":
        return "bg-red-500 hover:bg-red-600"
      case "pending_payment":
        return "bg-purple-500 hover:bg-purple-600"
      default:
        return "bg-gray-500 hover:bg-gray-600"
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case "active":
        return "Open"
      case "in_progress":
        return "In Progress"
      case "completed":
        return "Completed"
      case "cancelled":
        return "Cancelled"
      case "pending_payment":
        return "Pending Payment"
      default:
        return status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, " ")
    }
  }

  const renderBadge = () => {
    const badgeClass = getStatusColor(status)
    const statusText = getStatusText(status)

    if (status === "in_progress" && escrowEndDate) {
      const endDate = new Date(escrowEndDate)
      const timeRemaining = formatDistanceToNow(endDate, { addSuffix: true })

      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge className={badgeClass}>{statusText}</Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>Auto-completes {timeRemaining}</p>
              <p className="text-xs mt-1">({endDate.toLocaleString()})</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )
    }

    return <Badge className={badgeClass}>{statusText}</Badge>
  }

  return renderBadge()
}
