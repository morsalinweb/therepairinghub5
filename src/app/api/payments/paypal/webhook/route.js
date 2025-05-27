import { NextResponse } from "next/server"
import { headers } from "next/headers"
import connectToDatabase from "../../../../../lib/db"
import Transaction from "../../../../../models/Transaction"
import Job from "../../../../../models/Job"
import User from "../../../../../models/User"
import Notification from "../../../../../models/Notification"
import { sendNotification } from "../../../../../lib/websocket-utils"

export async function POST(req) {
  try {
    await connectToDatabase()

    // Verify PayPal webhook signature
    const headersList = headers()
    const paypalSignature = headersList.get("paypal-transmission-sig")
    const paypalCertUrl = headersList.get("paypal-cert-url")
    const paypalTransmissionId = headersList.get("paypal-transmission-id")
    const paypalTransmissionTime = headersList.get("paypal-transmission-time")

    const webhookId = process.env.PAYPAL_WEBHOOK_ID
    const requestBody = await req.text()

    // In a production environment, you would verify the signature here
    // For this demo, we'll skip the verification

    const event = JSON.parse(requestBody)

    // Handle the event
    switch (event.event_type) {
      case "CHECKOUT.ORDER.APPROVED":
        await handleOrderApproved(event)
        break
      case "PAYMENT.CAPTURE.COMPLETED":
        await handlePaymentCaptured(event)
        break
      case "PAYMENT.CAPTURE.DENIED":
        await handlePaymentDenied(event)
        break
      default:
        console.log(`Unhandled event type: ${event.event_type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("PayPal webhook error:", error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}

// Handle order approved
async function handleOrderApproved(event) {
  try {
    const orderId = event.resource.id

    // Find transaction by order ID
    const transaction = await Transaction.findOne({ paymentId: orderId })
    if (!transaction) {
      console.error("Transaction not found for order:", orderId)
      return
    }

    // Update transaction status
    transaction.status = "pending_capture"
    await transaction.save()

    console.log("PayPal order approved for transaction:", transaction._id)
  } catch (error) {
    console.error("Error handling order approved:", error)
  }
}

// Handle payment captured
async function handlePaymentCaptured(event) {
  try {
    const captureId = event.resource.id
    const orderId = event.resource.supplementary_data?.related_ids?.order_id

    if (!orderId) {
      console.error("Order ID not found in payment capture event")
      return
    }

    // Find transaction by order ID
    const transaction = await Transaction.findOne({ paymentId: orderId })
    if (!transaction) {
      console.error("Transaction not found for order:", orderId)
      return
    }

    // Update transaction status
    transaction.status = "in_escrow"
    await transaction.save()

    // Get the job
    const job = await Job.findById(transaction.job)
    if (!job) {
      console.error("Job not found for transaction:", transaction._id)
      return
    }

    // Set escrow end date (default 1 minute from now)
    const escrowPeriodMinutes = Number.parseInt(process.env.ESCROW_PERIOD_MINUTES || "1", 10)
    const escrowEndDate = new Date(Date.now() + escrowPeriodMinutes * 60 * 1000)

    // Update job status
    job.status = "in_progress"
    job.paymentStatus = "in_escrow"
    job.escrowEndDate = escrowEndDate
    job.transactionId = transaction._id
    await job.save()

    // Update buyer's spending
    await User.findByIdAndUpdate(transaction.customer, {
      $inc: { totalSpending: transaction.amount },
    })

    // Create notification for job poster
    const notification = await Notification.create({
      recipient: transaction.customer,
      type: "payment",
      message: `Payment successful for job: ${job.title}. Provider has been hired.`,
      relatedId: transaction._id,
      onModel: "Transaction",
    })

    // Send real-time notification
    sendNotification(transaction.customer, notification)

    // Create notification for provider
    const providerNotification = await Notification.create({
      recipient: job.hiredProvider,
      type: "job_assigned",
      message: `You have been hired for the job: ${job.title}. Payment has been received.`,
      relatedId: job._id,
      onModel: "Job",
    })

    // Send real-time notification to provider
    sendNotification(job.hiredProvider, providerNotification)

    console.log("PayPal payment captured for transaction:", transaction._id)

    // Schedule job completion after escrow period
    scheduleJobCompletion(job._id, escrowEndDate)
  } catch (error) {
    console.error("Error handling payment captured:", error)
  }
}

// Handle payment denied
async function handlePaymentDenied(event) {
  try {
    const captureId = event.resource.id
    const orderId = event.resource.supplementary_data?.related_ids?.order_id

    if (!orderId) {
      console.error("Order ID not found in payment denied event")
      return
    }

    // Find transaction by order ID
    const transaction = await Transaction.findOne({ paymentId: orderId })
    if (!transaction) {
      console.error("Transaction not found for order:", orderId)
      return
    }

    // Update transaction status
    transaction.status = "failed"
    await transaction.save()

    // Get job
    const job = await Job.findById(transaction.job)
    if (!job) {
      console.error("Job not found for transaction:", transaction._id)
      return
    }

    // Reset job status if payment failed
    job.status = "active"
    job.hiredProvider = null
    job.paymentStatus = "pending"
    await job.save()

    // Create notification for job poster
    const notification = await Notification.create({
      recipient: transaction.customer,
      type: "payment",
      message: `Payment failed for job: ${job.title}. Please try again.`,
      relatedId: transaction._id,
      onModel: "Transaction",
    })

    // Send real-time notification
    sendNotification(transaction.customer, notification)

    console.log("PayPal payment denied for transaction:", transaction._id)
  } catch (error) {
    console.error("Error handling payment denied:", error)
  }
}

// Schedule job completion after escrow period
async function scheduleJobCompletion(jobId, escrowEndDate) {
  const timeUntilCompletion = new Date(escrowEndDate).getTime() - Date.now()

  if (timeUntilCompletion <= 0) {
    // If escrow period has already passed, complete job immediately
    await completeJob(jobId)
    return
  }

  // Schedule job completion
  setTimeout(async () => {
    await completeJob(jobId)
  }, timeUntilCompletion)

  console.log(`Job ${jobId} scheduled for completion in ${timeUntilCompletion}ms`)
}

// Complete job and release payment
async function completeJob(jobId) {
  try {
    const job = await Job.findById(jobId)

    if (!job) {
      console.error("Job not found for completion:", jobId)
      return
    }

    // Only complete jobs that are still in escrow
    if (job.status === "in_progress" && job.paymentStatus === "in_escrow") {
      // Get transaction
      const transaction = await Transaction.findById(job.transactionId)
      if (!transaction) {
        console.error("Transaction not found for job:", jobId)
        return
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
        recipient: transaction.customer,
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
      sendNotification(transaction.customer, buyerNotification)
      sendNotification(job.hiredProvider, providerNotification)

      console.log(`Job ${jobId} completed and payment released automatically`)
    }
  } catch (error) {
    console.error("Error completing job:", error)
  }
}
