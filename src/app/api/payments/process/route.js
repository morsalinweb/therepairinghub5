import { NextResponse } from "next/server"
import connectToDatabase from "../../../../lib/db"
import Job from "../../../../models/Job"
import Transaction from "../../../../models/Transaction"
import { handleProtectedRoute } from "../../../../lib/auth"
import { broadcastJobUpdate } from "../../../../lib/websocket-utils"

export async function POST(req) {
  try {
    await connectToDatabase()

    // Check authentication
    const authResult = await handleProtectedRoute(req, ["Buyer", "Admin"])
    if (!authResult.success) {
      return authResult
    }

    const { jobId, providerId, amount, paymentMethod } = await req.json()

    // Validate input
    if (!jobId || !providerId || !amount || !paymentMethod) {
      return NextResponse.json({ success: false, message: "Please provide all required fields" }, { status: 400 })
    }

    // Find job
    const job = await Job.findById(jobId)
    if (!job) {
      return NextResponse.json({ success: false, message: "Job not found" }, { status: 404 })
    }

    // Check if user is the job poster
    if (job.postedBy.toString() !== authResult.user._id.toString() && authResult.user.userType !== "Admin") {
      return NextResponse.json(
        { success: false, message: "Not authorized to make payment for this job" },
        { status: 403 },
      )
    }

    // Check if job is active
    if (job.status !== "active") {
      return NextResponse.json({ success: false, message: "Can only hire for active jobs" }, { status: 400 })
    }

    // Calculate service fee (10%)
    const serviceFee = Math.round(amount * 0.1 * 100) / 100
    const totalAmount = amount + serviceFee

    // Create transaction record
    const transaction = await Transaction.create({
      job: jobId,
      customer: authResult.user._id,
      provider: providerId,
      amount: totalAmount,
      serviceFee,
      type: "job_payment",
      paymentMethod,
      status: "completed", // For simplicity, we're marking it as completed immediately
      paymentId: `PAY-${Date.now()}`,
    })

    // Update job with transaction ID
    job.transactionId = transaction._id
    job.paymentStatus = "in_escrow"
    await job.save()

    // Broadcast job update
    broadcastJobUpdate(job._id, { action: "payment", job })

    return NextResponse.json({
      success: true,
      transaction,
      message: "Payment processed successfully",
    })
  } catch (error) {
    console.error("Payment processing error:", error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}
