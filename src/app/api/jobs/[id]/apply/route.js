import { NextResponse } from "next/server"
import connectToDatabase from "../../../../../lib/db"
import Job from "../../../../../models/Job"
import User from "../../../../../models/User"
import Notification from "../../../../../models/Notification"
import { handleProtectedRoute } from "../../../../../lib/auth"
import { broadcastJobUpdate, sendNotification } from "../../../../../lib/websocket-utils"

// Apply for a job
export async function POST(req, { params }) {
  try {
    await connectToDatabase()

    // Check authentication
    const authResult = await handleProtectedRoute(req, ["Seller"])
    if (!authResult.success) {
      return authResult
    }

    const jobId = params.id

    // Find job
    const job = await Job.findById(jobId)
    if (!job) {
      return NextResponse.json({ success: false, message: "Job not found" }, { status: 404 })
    }

    // Check if job is active
    if (job.status !== "active") {
      return NextResponse.json({ success: false, message: "Can only apply for active jobs" }, { status: 400 })
    }

    // Check if user has already applied
    const applicant = await User.findOne({
      _id: authResult.user._id,
      "applications.job": jobId,
    })

    if (applicant) {
      return NextResponse.json({ success: false, message: "You have already applied for this job" }, { status: 400 })
    }

    // Add job to user's applications
    await User.findByIdAndUpdate(authResult.user._id, {
      $push: { applications: { job: jobId, appliedAt: new Date() } },
    })

    // Create notification for job poster
    const notification = await Notification.create({
      recipient: job.postedBy,
      sender: authResult.user._id,
      type: "job_application",
      message: `${authResult.user.name || authResult.user.email} has applied for your job: ${job.title}`,
      relatedId: job._id,
      onModel: "Job",
    })

    // Send real-time notification
    sendNotification(job.postedBy.toString(), notification)

    // Broadcast job update
    broadcastJobUpdate(job._id, {
      action: "application",
      jobId: job._id,
      applicantId: authResult.user._id,
    })

    return NextResponse.json({
      success: true,
      message: "Successfully applied for job",
    })
  } catch (error) {
    console.error("Apply for job error:", error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}
