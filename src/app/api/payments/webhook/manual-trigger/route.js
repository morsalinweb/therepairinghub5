import { NextResponse } from "next/server"
import connectToDatabase from "../../../../../lib/db"
import Transaction from "../../../../../models/Transaction"
import Job from "../../../../../models/Job"
import User from "../../../../../models/User"
import Notification from "../../../../../models/Notification"

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

    const { jobId, action = "complete" } = await req.json()

    if (!jobId) {
      return NextResponse.json({ success: false, message: "Job ID is required" }, { status: 400 })
    }

    console.log("Manual webhook trigger for job:", jobId, "action:", action)

    // Find the job
    const job = await Job.findById(jobId)
    if (!job) {
      return NextResponse.json({ success: false, message: "Job not found" }, { status: 404 })
    }

    if (action === "complete") {
      // Complete the job and release payment
      return await completeJobManually(job)
    } else {
      // Start escrow process
      return await startEscrowProcess(job)
    }
  } catch (error) {
    console.error("Manual webhook trigger error:", error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}

async function startEscrowProcess(job) {
  // Find the most recent transaction for this job
  const transaction = await Transaction.findOne({ job: job._id }).sort({ createdAt: -1 })
  if (!transaction) {
    return NextResponse.json({ success: false, message: "No transaction found for this job" }, { status: 404 })
  }

  console.log("Found transaction:", transaction._id, "status:", transaction.status)

  // Update transaction status
  transaction.status = "in_escrow"
  await transaction.save()

  // Set escrow end date
  const escrowPeriodMinutes = Number.parseInt(process.env.ESCROW_PERIOD_MINUTES || "1", 10)
  const escrowEndDate = new Date(Date.now() + escrowPeriodMinutes * 60 * 1000)

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
    })
  }

  return NextResponse.json({
    success: true,
    message: "Escrow process started successfully",
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
}

async function completeJobManually(job) {
  // Find the transaction
  const transaction = await Transaction.findOne({ job: job._id }).sort({ createdAt: -1 })
  if (!transaction) {
    return NextResponse.json({ success: false, message: "No transaction found for this job" }, { status: 404 })
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
  const serviceFee = transaction.serviceFee || transaction.amount * 0.1 // 10% service fee
  const providerAmount = transaction.amount - serviceFee

  // Update provider's available balance and total earnings
  await User.findByIdAndUpdate(job.hiredProvider, {
    $inc: {
      balance: providerAmount,
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

  console.log(`Job ${job._id} completed and payment released manually`)

  return NextResponse.json({
    success: true,
    message: "Job completed and payment released successfully",
    job: {
      id: job._id,
      status: job.status,
      paymentStatus: job.paymentStatus,
      completedAt: job.completedAt,
    },
    transaction: {
      id: transaction._id,
      status: transaction.status,
      providerAmount,
      serviceFee,
    },
  })
}
