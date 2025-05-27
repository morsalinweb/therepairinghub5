// /api/payments/create-payment-intent/route.js
import { NextResponse } from "next/server"
import Stripe from "stripe"
import connectToDatabase from "../../../../lib/db"
import Job from "../../../../models/Job"
import { handleProtectedRoute } from "../../../../lib/auth"

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export async function POST(req) {
  try {
    await connectToDatabase()

    // Check authentication
    const authResult = await handleProtectedRoute(req, ["Buyer", "Admin"])
    if (!authResult.success) {
      return authResult
    }

    const { jobId, providerId } = await req.json()

    // Validate input
    if (!jobId || !providerId) {
      return NextResponse.json({ success: false, message: "Job ID and provider ID are required" }, { status: 400 })
    }

    // Find job
    const job = await Job.findById(jobId)
    if (!job) {
      return NextResponse.json({ success: false, message: "Job not found" }, { status: 404 })
    }

    // Check if user is the job poster or an admin
    if (job.postedBy.toString() !== authResult.user._id.toString() && authResult.user.userType !== "Admin") {
      return NextResponse.json(
        { success: false, message: "Not authorized to create payment for this job" },
        { status: 403 },
      )
    }

    // Check if job is active
    if (job.status !== "active") {
      return NextResponse.json({ success: false, message: "Can only create payment for active jobs" }, { status: 400 })
    }

    // Calculate service fee (10%)
    const serviceFee = Math.round(job.price * 0.1 * 100) / 100
    const totalAmount = job.price + serviceFee

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(totalAmount * 100), // Convert to cents
      currency: "usd",
      description: `Payment for job: ${job.title}`,
      metadata: {
        jobId,
        providerId,
        serviceFee: serviceFee.toString(),
      },
    })

    return NextResponse.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
    })
  } catch (error) {
    console.error("Create payment intent error:", error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}
