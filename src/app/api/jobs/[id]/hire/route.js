import { NextResponse } from "next/server"
import connectToDatabase from "../../../../../lib/db"
import Job from "../../../../../models/Job"
import User from "../../../../../models/User"
import { handleProtectedRoute } from "../../../../../lib/auth"

// Hire a provider for a job
export async function POST(req, { params }) {
  try {
    await connectToDatabase()

    // Check authentication
    const authResult = await handleProtectedRoute(req, ["Buyer", "Admin"])
    if (!authResult.success) {
      return authResult
    }

    const jobId = params.id
    const { providerId } = await req.json()

    // Validate input
    if (!providerId) {
      return NextResponse.json({ success: false, message: "Please provide provider ID" }, { status: 400 })
    }

    // Find job
    const job = await Job.findById(jobId)
    if (!job) {
      return NextResponse.json({ success: false, message: "Job not found" }, { status: 404 })
    }

    // Check if user is authorized to hire for this job
    const isJobPoster = job.postedBy.toString() === authResult.user._id.toString()
    const isAdmin = authResult.user.userType === "Admin"

    if (!isJobPoster && !isAdmin) {
      return NextResponse.json({ success: false, message: "Not authorized to hire for this job" }, { status: 403 })
    }

    // Check if job is active
    if (job.status !== "active") {
      return NextResponse.json({ success: false, message: "Can only hire for active jobs" }, { status: 400 })
    }

    // Check if provider has submitted a quote
    const provider = await User.findOne(
      {
        _id: providerId,
        "quotedJobs.job": jobId,
      },
      { "quotedJobs.$": 1 },
    )

    if (!provider) {
      return NextResponse.json(
        { success: false, message: "Provider has not submitted a quote for this job" },
        { status: 400 },
      )
    }

    // Update job status and hired provider
    const updatedJob = await Job.findByIdAndUpdate(
      jobId,
      {
        status: "in_progress",
        hiredProvider: providerId,
        paymentStatus: "paid", // Assuming payment is processed before hiring
      },
      { new: true },
    )
      .populate("postedBy", "name email avatar")
      .populate("hiredProvider", "name email avatar")

    // Update job in user's postedJobs array
    await User.updateOne(
      {
        _id: job.postedBy,
        "postedJobs.jobId": jobId,
      },
      {
        $set: {
          "postedJobs.$.status": "in_progress",
          "postedJobs.$.hiredProvider": providerId,
          "postedJobs.$.updatedAt": new Date(),
        },
      },
    )

    // Update provider's quote status
    await User.updateOne(
      {
        _id: providerId,
        "quotedJobs.job": jobId,
      },
      {
        $set: {
          "quotedJobs.$.quote.status": "accepted",
        },
      },
    )

    // Update other providers' quote statuses to rejected
    await User.updateMany(
      {
        _id: { $ne: providerId },
        "quotedJobs.job": jobId,
      },
      {
        $set: {
          "quotedJobs.$.quote.status": "rejected",
        },
      },
    )

    // Create notification for hired provider
    await User.updateOne(
      { _id: providerId },
      {
        $push: {
          notifications: {
            type: "hire",
            message: `You've been hired for job: ${job.title}`,
            sender: authResult.user._id,
            relatedId: job._id,
            onModel: "Job",
            read: false,
            createdAt: new Date(),
          },
        },
      },
    )

    // Create transaction records
    const quoteAmount = provider.quotedJobs[0].quote.price
    const serviceFee = quoteAmount * 0.1 // 10% service fee

    // Add transaction to buyer's record (payment to escrow)
    await User.updateOne(
      { _id: job.postedBy },
      {
        $push: {
          transactions: {
            type: "escrow",
            amount: -quoteAmount,
            job: jobId,
            otherParty: providerId,
            status: "completed",
            description: `Payment to escrow for job: ${job.title}`,
            createdAt: new Date(),
          },
        },
      },
    )

    // Add transaction to provider's record (payment in escrow)
    await User.updateOne(
      { _id: providerId },
      {
        $inc: {
          "financialSummary.inEscrow": quoteAmount - serviceFee,
        },
        $push: {
          transactions: {
            type: "escrow",
            amount: quoteAmount - serviceFee,
            job: jobId,
            otherParty: job.postedBy,
            status: "pending",
            serviceFee,
            description: `Payment in escrow for job: ${job.title}`,
            createdAt: new Date(),
          },
        },
      },
    )

    return NextResponse.json({
      success: true,
      job: updatedJob,
    })
  } catch (error) {
    console.error("Hire provider error:", error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}
