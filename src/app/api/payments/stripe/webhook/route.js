// 
import { NextResponse } from "next/server"
import { headers } from "next/headers"
import Stripe from "stripe"
import connectToDatabase from "../../../../../lib/db"
import Transaction from "../../../../../models/Transaction"
import Job from "../../../../../models/Job"
import Notification from "../../../../../models/Notification"
import { sendNotification } from "../../../../../lib/websocket-utils"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET

export async function POST(req) {
  try {
    await connectToDatabase()

    const body = await req.text()
    const headersList = headers()
    const signature = headersList.get("stripe-signature")

    let event

    try {
      event = stripe.webhooks.constructEvent(body, signature, endpointSecret)
    } catch (err) {
      console.error(`Webhook signature verification failed: ${err.message}`)
      return NextResponse.json({ success: false, message: `Webhook Error: ${err.message}` }, { status: 400 })
    }

    // Handle the event
    switch (event.type) {
      case "payment_intent.succeeded":
        const paymentIntent = event.data.object
        await handleSuccessfulPayment(paymentIntent)
        break
      case "payment_intent.payment_failed":
        const failedPayment = event.data.object
        await handleFailedPayment(failedPayment)
        break
      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Stripe webhook error:", error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}

// Handle successful payment
async function handleSuccessfulPayment(paymentIntent) {
  try {
    // Find transaction
    const transaction = await Transaction.findOne({ paymentId: paymentIntent.id })
    if (!transaction) {
      console.error("Transaction not found for payment intent:", paymentIntent.id)
      return
    }

    // Update transaction status
    transaction.status = "in_escrow"
    await transaction.save()

    // Update job payment status
    const job = await Job.findByIdAndUpdate(
      transaction.job,
      { paymentStatus: "in_escrow", transactionId: transaction._id },
      { new: true },
    )

    // Create notification for job poster
    const notification = await Notification.create({
      recipient: transaction.customer,
      type: "payment",
      message: `Payment successful for job: ${job.title}. Funds are now in escrow.`,
      relatedId: transaction._id,
      onModel: "Transaction",
    })

    // Send real-time notification
    sendNotification(transaction.customer, notification)

    console.log("Payment successful for transaction:", transaction._id)
  } catch (error) {
    console.error("Error handling successful payment:", error)
  }
}

// Handle failed payment
async function handleFailedPayment(paymentIntent) {
  try {
    // Find transaction
    const transaction = await Transaction.findOne({ paymentId: paymentIntent.id })
    if (!transaction) {
      console.error("Transaction not found for payment intent:", paymentIntent.id)
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

    console.log("Payment failed for transaction:", transaction._id)
  } catch (error) {
    console.error("Error handling failed payment:", error)
  }
}
