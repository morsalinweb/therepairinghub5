import { NextResponse } from "next/server"
import connectToDatabase from "../../../../../lib/db"
import Transaction from "../../../../../models/Transaction"
import Job from "../../../../../models/Job"
import User from "../../../../../models/User"
import Notification from "../../../../../models/Notification"
import { sendNotification } from "../../../../../lib/socket"

// This endpoint is for development/testing only
export async function POST(req) {
  // Only allow in development environment
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { success: false, message: "This endpoint is only available in development mode" },
      { status: 403 },
    )
  }

  try {
    await connectToDatabase()

    const { jobId } = await req.json()

    if (!jobId) {
      return NextResponse.json({ success: false, message: "Job ID is required" }, { status: 400 })
    }

    console.log("Manual webhook trigger for job:", jobId)

    // Find the job
    const job = await Job.findById(jobId)
    if (!job) {
      return NextResponse.json({ success: false, message: "Job not found" }, { status: 404 })
    }

    // Find the most recent transaction for this job
    const transaction = await Transaction.findOne({ job: jobId }).sort({ createdAt: -1 })
    if (!transaction) {
      return NextResponse.json({ success: false, message: "No transaction found for this job" }, { status: 404 })
    }

    console.log("Found transaction:", transaction._id, "status:", transaction.status)

    // Update transaction status
    transaction.status = "in_escrow"
    await transaction.save()

    // Set escrow end date (default 24 hours from now)
    const escrowPeriodMinutes = Number.parseInt(process.env.ESCROW_PERIOD_MINUTES || "1", 10);
    const escrowEndDate = new Date(Date.now() + escrowPeriodMinutes * 60 * 1000);


    // Update job status
    job.status = "in_progress"
    job.paymentStatus = "in_escrow"
    job.escrowEndDate = escrowEndDate
    job.transactionId = transaction._id
    await job.save()

    console.log("Updated job status to in_progress, escrow end date:", escrowEndDate)

    // Update buyer's spending
    if (transaction.customer) {
      await User.findByIdAndUpdate(transaction.customer, {
        $inc: { totalSpending: transaction.amount },
        $addToSet: { transactions: transaction._id },
      })
    }

    // Create notification for job poster
    if (job.postedBy) {
      const notification = await Notification.create({
        recipient: job.postedBy,
        type: "payment",
        message: `Payment successful for job: ${job.title}. Funds are now in escrow.`,
        relatedId: transaction._id,
        onModel: "Transaction",
      })

      // Add notification to user's notifications array
      await User.findByIdAndUpdate(job.postedBy, {
        $addToSet: { notifications: notification._id },
      })

      // Send real-time notification
      sendNotification(job.postedBy, notification)
    }

    // Create notification for provider if one is hired
    if (job.hiredProvider) {
      const providerNotification = await Notification.create({
        recipient: job.hiredProvider,
        type: "job_assigned",
        message: `You have been hired for the job: ${job.title}. Payment has been received.`,
        relatedId: job._id,
        onModel: "Job",
      })

      // Add notification to provider's notifications array
      await User.findByIdAndUpdate(job.hiredProvider, {
        $addToSet: { notifications: providerNotification._id },
      })

      // Send real-time notification
      sendNotification(job.hiredProvider, providerNotification)
    }

    // Schedule job completion after escrow period
    const timeUntilCompletion = new Date(escrowEndDate).getTime() - Date.now()
    console.log(
      `Job ${jobId} scheduled for completion in ${timeUntilCompletion}ms (${new Date(Date.now() + timeUntilCompletion).toLocaleString()})`,
    )

    return NextResponse.json({
      success: true,
      message: "Manual webhook processing completed successfully",
      job: {
        id: job._id,
        status: job.status,
        paymentStatus: job.paymentStatus,
        escrowEndDate,
      },
      transaction: {
        id: transaction._id,
        status: transaction.status,
      },
    })
  } catch (error) {
    console.error("Manual webhook trigger error:", error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}
