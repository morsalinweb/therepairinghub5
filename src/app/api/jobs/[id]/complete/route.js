import { NextResponse } from "next/server"
import connectToDatabase from "../../../../lib/db"
import Job from "../../../../models/Job"
import Transaction from "../../../../models/Transaction"
import User from "../../../../models/User"
import Notification from "../../../../models/Notification"
import { handleProtectedRoute } from "../../../../lib/auth"
import { sendNotification } from "../../../../lib/socket"

export async function POST(req, { params }) {
  try {
    await connectToDatabase()

    // Check authentication
    const authResult = await handleProtectedRoute(req)
    if (!authResult.success) {
      return authResult
    }

    const userId = authResult.user._id
    const jobId = params.id

    // Get job
    const job = await Job.findById(jobId)
    if (!job) {
      return NextResponse.json({ success: false, message: "Job not found" }, { status: 404 })
    }

    // Check if user is authorized to complete this job
    if (job.postedBy.toString() !== userId.toString() && job.hiredProvider?.toString() !== userId.toString()) {
      return NextResponse.json({ success: false, message: "Not authorized to complete this job" }, { status: 403 })
    }

    // Check if job is in progress
    if (job.status !== "in_progress") {
      return NextResponse.json({ success: false, message: "Job is not in progress" }, { status: 400 })
    }

    // Get transaction
    const transaction = await Transaction.findById(job.transactionId)
    if (!transaction) {
      return NextResponse.json({ success: false, message: "Transaction not found" }, { status: 404 })
    }

    // Update transaction
    transaction.provider = job.hiredProvider
    transaction.status = "released"
    await transaction.save()

    // Update job
    job.status = "completed"
    job.paymentStatus = "released"
    job.completedAt = new Date()
    await job.save()

    // Calculate provider amount (minus service fee)
    const providerAmount = transaction.amount - transaction.serviceFee

    // Update provider's available balance and total earnings
    await User.findByIdAndUpdate(job.hiredProvider, {
      $inc: {
        availableBalance: providerAmount,
        totalEarnings: providerAmount,
      },
    })

    // Create notifications
    const buyerNotification = await Notification.create({
      recipient: job.postedBy,
      type: "job_completed",
      message: `Your job "${job.title}" has been completed and payment has been released to the provider.`,
      relatedId: job._id,
      onModel: "Job",
    })

    const providerNotification = await Notification.create({
      recipient: job.hiredProvider,
      type: "payment",
      message: `Payment for job "${job.title}" has been released to your account. Your available balance has been updated.`,
      relatedId: transaction._id,
      onModel: "Transaction",
    })

    // Send real-time notifications
    sendNotification(job.postedBy, buyerNotification)
    sendNotification(job.hiredProvider, providerNotification)

    return NextResponse.json({
      success: true,
      message: "Job marked as completed and payment released",
      job,
    })
  } catch (error) {
    console.error("Complete job error:", error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}
