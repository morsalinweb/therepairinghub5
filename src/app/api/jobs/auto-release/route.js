import { NextResponse } from "next/server"
import connectToDatabase from "../../../../lib/db"
import Job from "../../../../models/Job"
import Notification from "../../../../models/Notification"
import { releasePayment } from "../../../../lib/payment"
import { sendNotification } from "../../../../lib/websocket-utils"

// This endpoint would be called by a cron job or scheduled task
export async function POST(req) {
  try {
    await connectToDatabase()

    // Get API key from request headers for security
    const apiKey = req.headers.get("x-api-key")
    if (apiKey !== process.env.CRON_API_KEY) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    // Find jobs that are in progress with payment in escrow for more than 10 days
    const tenDaysAgo = new Date()
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10)

    const jobs = await Job.find({
      status: "in_progress",
      paymentStatus: "in_escrow",
      updatedAt: { $lt: tenDaysAgo },
    }).populate("postedBy hiredProvider")

    const results = []

    // Process each job
    for (const job of jobs) {
      try {
        // Release payment
        const paymentResult = await releasePayment(job._id)

        if (paymentResult.success) {
          // Update job status
          job.status = "completed"
          job.paymentStatus = "released"
          await job.save()

          // Create notifications
          const buyerNotification = await Notification.create({
            recipient: job.postedBy._id,
            type: "system",
            message: `Payment for job "${job.title}" has been automatically released after 10 days.`,
            relatedId: job._id,
            onModel: "Job",
          })

          const sellerNotification = await Notification.create({
            recipient: job.hiredProvider._id,
            type: "payment",
            message: `Payment for job "${job.title}" has been released to your account.`,
            relatedId: job._id,
            onModel: "Job",
          })

          // Send real-time notifications
          sendNotification(job.postedBy._id, buyerNotification)
          sendNotification(job.hiredProvider._id, sellerNotification)

          results.push({
            jobId: job._id,
            status: "success",
            message: "Payment released successfully",
          })
        } else {
          results.push({
            jobId: job._id,
            status: "error",
            message: paymentResult.error,
          })
        }
      } catch (error) {
        console.error(`Error processing job ${job._id}:`, error)
        results.push({
          jobId: job._id,
          status: "error",
          message: error.message,
        })
      }
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      results,
    })
  } catch (error) {
    console.error("Auto-release error:", error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}
