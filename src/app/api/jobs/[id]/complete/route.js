import { NextResponse } from "next/server"
import connectToDatabase from "../../../../../lib/db"
import Job from "../../../../../models/Job"
import User from "../../../../../models/User"
import Transaction from "../../../../../models/Transaction"
import Notification from "../../../../../models/Notification"
import { handleProtectedRoute } from "../../../../../lib/auth"

export async function POST(req) {
  try {
    await connectToDatabase()

    // Check authentication
    const authResult = await handleProtectedRoute(req)
    if (!authResult.success) {
      return authResult
    }

    const { id: jobId } = req.nextUrl.pathname.split("/").slice(-2, -1)

    console.log("Completing job:", { jobId, userId: authResult.user._id })

    // Find the job
    const job = await Job.findById(jobId).populate("postedBy", "name email").populate("hiredProvider", "name email")

    if (!job) {
      return NextResponse.json({ success: false, message: "Job not found" }, { status: 404 })
    }

    // Check if job is in progress
    if (job.status !== "in_progress") {
      return NextResponse.json({ success: false, message: "Job is not in progress" }, { status: 400 })
    }

    // Check if user is authorized to complete the job (job poster or auto-completion)
    const isJobPoster = job.postedBy._id.toString() === authResult.user._id.toString()
    const isAutoComplete = req.headers.get("x-auto-complete") === "true"

    if (!isJobPoster && !isAutoComplete) {
      return NextResponse.json(
        { success: false, message: "Only the job poster can mark the job as completed" },
        { status: 403 },
      )
    }

    // If manual completion by job poster, check if escrow period has ended
    if (isJobPoster && !isAutoComplete) {
      const now = new Date()
      const escrowEndDate = new Date(job.escrowEndDate)

      if (now < escrowEndDate) {
        const timeRemaining = Math.ceil((escrowEndDate - now) / 1000)
        return NextResponse.json(
          {
            success: false,
            message: `Please wait ${timeRemaining} seconds before marking the job as completed`,
          },
          { status: 400 },
        )
      }
    }

    // Update job status to completed
    const updatedJob = await Job.findByIdAndUpdate(
      jobId,
      {
        status: "completed",
        completedAt: new Date(),
      },
      { new: true },
    )
      .populate("postedBy", "name email avatar")
      .populate("hiredProvider", "name email avatar")

    // Release payment to provider
    if (job.hiredProvider) {
      await User.findByIdAndUpdate(job.hiredProvider._id, {
        $inc: {
          availableBalance: job.price,
          totalEarnings: job.price,
        },
      })

      // Update transaction status
      await Transaction.findOneAndUpdate({ job: jobId, type: "job_payment" }, { status: "completed" })

      // Create notification for provider
      await Notification.create({
        recipient: job.hiredProvider._id,
        sender: authResult.user._id,
        type: "job_completed",
        message: `Job completed: ${job.title}. Payment has been released.`,
        relatedId: jobId,
        onModel: "Job",
      })
    }

    // Create notification for job poster if auto-completed
    if (isAutoComplete) {
      await Notification.create({
        recipient: job.postedBy._id,
        sender: job.hiredProvider._id,
        type: "job_completed",
        message: `Job auto-completed: ${job.title}. Escrow period has ended.`,
        relatedId: jobId,
        onModel: "Job",
      })
    }

    console.log("Job completed successfully:", updatedJob)

    return NextResponse.json({
      success: true,
      message: "Job completed successfully",
      job: updatedJob,
    })
  } catch (error) {
    console.error("Complete job error:", error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}
