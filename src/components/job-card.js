"use client"

import Link from "next/link"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MapPin, Calendar, DollarSign } from "lucide-react"
import { jobAPI } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { useState } from "react"

export default function JobCard({ job, userType }) {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const getStatusBadge = (status) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500">Active</Badge>
      case "completed":
        return <Badge className="bg-blue-500">Completed</Badge>
      case "in_progress":
        return <Badge className="bg-yellow-500">In Progress</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const handleCancelJob = async () => {
    if (!confirm("Are you sure you want to cancel this job?")) return

    setIsLoading(true)
    try {
      const { success } = await jobAPI.updateJob(job._id, { status: "cancelled" })
      if (success) {
        toast({
          title: "Job cancelled",
          description: "The job has been cancelled successfully.",
        })
        // Refresh the page to show updated status
        window.location.reload()
      }
    } catch (error) {
      console.error("Cancel job error:", error)
      toast({
        title: "Cancellation failed",
        description: error.response?.data?.message || "There was a problem cancelling the job.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleMarkComplete = async () => {
    if (!confirm("Are you sure you want to mark this job as completed?")) return

    setIsLoading(true)
    try {
      const { success } = await jobAPI.updateJob(job._id, { status: "completed" })
      if (success) {
        toast({
          title: "Job completed",
          description: "The job has been marked as completed successfully.",
        })
        // Refresh the page to show updated status
        window.location.reload()
      }
    } catch (error) {
      console.error("Mark complete error:", error)
      toast({
        title: "Action failed",
        description: error.response?.data?.message || "There was a problem marking the job as completed.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="h-full">
      <CardContent className="pt-6">
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-xl font-semibold line-clamp-2">{job.title}</h3>
          {getStatusBadge(job.status)}
        </div>
        <p className="text-gray-600 dark:text-gray-300 mb-4 line-clamp-3">{job.description}</p>
        <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
          <div className="flex items-center">
            <DollarSign className="h-4 w-4 mr-2 flex-shrink-0" />
            <span>${job.price}</span>
          </div>
          <div className="flex items-center">
            <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
            <span>{job.location}</span>
          </div>
          <div className="flex items-center">
            <Calendar className="h-4 w-4 mr-2 flex-shrink-0" />
            <span>{new Date(job.date).toLocaleDateString()}</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="border-t pt-4 flex justify-between">
        <Link href={`/jobs/${job._id}`}>
          <Button variant="outline">View Details</Button>
        </Link>
        {userType === "Buyer" && job.status === "active" && (
          <Button
            variant="outline"
            className="text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600"
            onClick={handleCancelJob}
            disabled={isLoading}
          >
            Cancel
          </Button>
        )}
        {userType === "Seller" && job.status === "active" && (
          <Link href={`/jobs/${job._id}`}>
            <Button>Send Quote</Button>
          </Link>
        )}
        {userType === "Buyer" && job.status === "in_progress" && (
          <Button onClick={handleMarkComplete} disabled={isLoading}>
            Mark Complete
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
