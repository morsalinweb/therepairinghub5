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
    const { providerId } = await req.json()

    console.log("Hiring provider:", { jobId, providerId, userId: authResult.user._id })

    // Validate input
    if (!providerId) {
      return NextResponse.json({ success: false, message: "Provider ID is required" }, { status: 400 })
    }

    // Find the job
    const job = await Job.findById(jobId).populate("postedBy", "name email")

    if (!job) {
      return NextResponse.json({ success: false, message: "Job not found" }, { status: 404 })
    }

    // Check if user is the job poster
    if (job.postedBy._id.toString() !== authResult.user._id.toString()) {
      return NextResponse.json({ success: false, message: "Only the job poster can hire providers" }, { status: 403 })
    }

    // Check if job is still active
    if (job.status !== "active") {
      return NextResponse.json({ success: false, message: "Can only hire for active jobs" }, { status: 400 })
    }

    // Find the provider
    const provider = await User.findById(providerId)
    if (!provider) {
      return NextResponse.json({ success: false, message: "Provider not found" }, { status: 404 })
    }

    // Set escrow end date to 1 minute from now
    const escrowEndDate = new Date()
    escrowEndDate.setMinutes(escrowEndDate.getMinutes() + 1)

    // Update job status and assign provider
    const updatedJob = await Job.findByIdAndUpdate(
      jobId,
      {
        status: "in_progress",
        hiredProvider: providerId,
        escrowEndDate: escrowEndDate,
      },
      { new: true },
    )
      .populate("postedBy", "name email avatar")
      .populate("hiredProvider", "name email avatar")

    // Create transaction record
    await Transaction.create({
      job: jobId,
      buyer: authResult.user._id,
      seller: providerId,
      amount: job.price,
      type: "job_payment",
      status: "completed",
      paymentMethod: "escrow",
      description: `Payment for job: ${job.title}`,
    })

    // Create notification for the hired provider
    await Notification.create({
      recipient: providerId,
      sender: authResult.user._id,
      type: "job_hired",
      message: `You have been hired for the job: ${job.title}`,
      relatedId: jobId,
      onModel: "Job",
    })

    console.log("Job updated successfully:", updatedJob)

    return NextResponse.json({
      success: true,
      message: "Provider hired successfully",
      job: updatedJob,
    })
  } catch (error) {
    console.error("Hire provider error:", error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}
