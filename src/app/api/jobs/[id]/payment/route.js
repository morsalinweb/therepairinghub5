import { NextResponse } from "next/server"
import connectToDatabase from "../../../../../lib/db"
import Job from "../../../../../models/Job"
import Quote from "../../../../../models/Quote"
import User from "../../../../../models/User"
import Notification from "../../../../../models/Notification"
import { handleProtectedRoute } from "../../../../../lib/auth"
import { processStripePayment, processPayPalPayment } from "../../../../../lib/payment"
import { sendNotification, broadcastJobUpdate } from "../../../../../lib/websocket-utils"

export async function POST(req, { params }) {
  try {
    await connectToDatabase()

    // Check authentication
    const authResult = await handleProtectedRoute(req, ["Buyer", "Admin"])
    if (!authResult.success) {
      return NextResponse.json({ success: false, message: authResult.message }, { status: authResult.status || 401 })
    }

    const jobId = params.id
    const { providerId, paymentMethod, createQuote, amount } = await req.json()

    // Validate input
    if (!providerId || !paymentMethod) {
      return NextResponse.json(
        {
          success: false,
          message: "Please provide provider ID and payment method",
        },
        { status: 400 },
      )
    }

    // Find job
    const job = await Job.findById(jobId)
    if (!job) {
      return NextResponse.json(
        {
          success: false,
          message: "Job not found",
        },
        { status: 404 },
      )
    }

    // Check if user is the job poster or an admin
    if (job.postedBy.toString() !== authResult.user._id.toString() && authResult.user.userType !== "Admin") {
      return NextResponse.json(
        {
          success: false,
          message: "Not authorized to hire for this job",
        },
        { status: 403 },
      )
    }

    // Check if job is active
    if (job.status !== "active") {
      return NextResponse.json(
        {
          success: false,
          message: "Can only hire for active jobs",
        },
        { status: 400 },
      )
    }

    // Find provider
    const provider = await User.findById(providerId)
    if (!provider) {
      return NextResponse.json(
        {
          success: false,
          message: "Provider not found",
        },
        { status: 404 },
      )
    }

    // Check if provider has submitted a quote
    let quote = await Quote.findOne({ job: jobId, provider: providerId })

    // If no quote exists and createQuote flag is true, create a quote
    if (!quote && createQuote) {
      console.log("Creating auto-generated quote for direct hire")
      quote = await Quote.create({
        job: jobId,
        provider: providerId,
        price: amount ? amount / 1.1 : job.price, // Use the provided amount (minus fee) or job price
        message: "Auto-generated quote for direct hire",
        status: "pending",
      })

      // Make sure the quote was created
      if (!quote) {
        return NextResponse.json(
          {
            success: false,
            message: "Failed to create quote automatically",
          },
          { status: 500 },
        )
      }
    } else if (!quote) {
      return NextResponse.json(
        {
          success: false,
          message: "Provider has not submitted a quote for this job",
        },
        { status: 400 },
      )
    }

    // Process payment based on method
    let paymentResult
    const jobTitle = job.title || "Job Service"

    try {
      if (paymentMethod === "card") {
        paymentResult = await processStripePayment(amount || quote.price, jobId, authResult.user._id, jobTitle)
      } else if (paymentMethod === "paypal") {
        paymentResult = await processPayPalPayment(amount || quote.price, jobId, authResult.user._id, jobTitle)
      } else {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid payment method",
          },
          { status: 400 },
        )
      }
    } catch (error) {
      console.error("Payment processing error:", error)
      return NextResponse.json(
        {
          success: false,
          message: error.message || "Failed to process payment",
        },
        { status: 400 },
      )
    }

    if (!paymentResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: paymentResult.error,
        },
        { status: 400 },
      )
    }

    // Update job - but don't mark as completed yet, keep as pending payment
    job.hiredProvider = providerId

    try {
      // For both PayPal and Stripe, we need to wait for payment confirmation
      // Keep job as "active" until payment is confirmed
      job.status = "active"
      job.paymentStatus = "pending"

      if (paymentResult.transaction && paymentResult.transaction._id) {
        job.transactionId = paymentResult.transaction._id
      }

      await job.save()
    } catch (error) {
      console.error("Error updating job status:", error)
      return NextResponse.json(
        {
          success: false,
          message: `Failed to update job status: ${error.message}`,
        },
        { status: 500 },
      )
    }

    // Update quote
    quote.status = "accepted"
    await quote.save()

    // Create notification for provider
    try {
      const notification = await Notification.create({
        recipient: providerId,
        sender: authResult.user._id,
        type: "hired",
        message: `You have been hired for the job: ${job.title}`,
        relatedId: job._id,
        onModel: "Job",
      })

      // Send real-time notification via WebSocket
      sendNotification(providerId.toString(), notification)
    } catch (notificationError) {
      console.error("Error creating notification:", notificationError)
      // Don't fail the payment for notification errors
    }

    // Broadcast job update via WebSocket
    try {
      broadcastJobUpdate(jobId, {
        action: "hired",
        job: job._id,
        providerId,
        message: `Provider has been hired for job: ${job.title}`,
      })

      // Send specific notifications to relevant parties
      sendNotification(job.postedBy.toString(), {
        type: "job_update",
        message: `Provider has been hired for job: ${job.title}`,
        job: job._id,
      })

      sendNotification(providerId.toString(), {
        type: "job_update",
        message: `You've been hired for job: ${job.title}`,
        job: job._id,
      })
    } catch (error) {
      console.error("Error sending job update notifications:", error)
      // Non-critical error, continue execution
    }

    // Populate job with related data
    await job.populate("postedBy", "name email avatar")
    await job.populate("hiredProvider", "name email avatar")

    return NextResponse.json({
      success: true,
      job,
      message: "Please complete your payment to hire this provider",
      payment: {
        method: paymentMethod,
        ...paymentResult,
      },
    })
  } catch (error) {
    console.error("Payment and hire error:", error)
    return NextResponse.json(
      {
        success: false,
        message: error.message || "An unexpected error occurred",
      },
      { status: 500 },
    )
  }
}
