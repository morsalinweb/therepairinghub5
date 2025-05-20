import { NextResponse } from "next/server"
import connectToDatabase from "@/lib/db"
import Quote from "@/models/Quote"
import Job from "@/models/Job"
import User from "@/models/User"
import Notification from "@/models/Notification"
import { handleProtectedRoute } from "@/lib/auth"
import { eventEmitter } from "@/lib/websocket-client"

export async function GET(req) {
  try {
    await connectToDatabase()

    // Check authentication
    const authResult = await handleProtectedRoute(req)
    if (!authResult.success) {
      return authResult
    }

    const { searchParams } = new URL(req.url)
    const jobId = searchParams.get("job")

    if (!jobId) {
      return NextResponse.json({ success: false, message: "Job ID is required" }, { status: 400 })
    }

    // Get quotes for the job
    const quotes = await Quote.find({ job: jobId })
      .populate({
        path: "provider",
        select: "name avatar rating reviewCount",
      })
      .sort({ createdAt: -1 })

    return NextResponse.json({
      success: true,
      quotes,
    })
  } catch (error) {
    console.error("Get quotes error:", error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}

export async function POST(req) {
  try {
    await connectToDatabase()

    // Check authentication
    const authResult = await handleProtectedRoute(req)
    if (!authResult.success) {
      return authResult
    }

    const userId = authResult.user._id
    const data = await req.json()
    const { jobId, price, message, image } = data

    // Validate input
    if (!jobId || !price || !message) {
      return NextResponse.json({ success: false, message: "Job ID, price, and message are required" }, { status: 400 })
    }

    // Check if job exists
    const job = await Job.findById(jobId)
    if (!job) {
      return NextResponse.json({ success: false, message: "Job not found" }, { status: 404 })
    }

    // Check if user has already submitted a quote for this job
    const existingQuote = await Quote.findOne({ job: jobId, provider: userId })
    if (existingQuote) {
      return NextResponse.json(
        { success: false, message: "You have already submitted a quote for this job" },
        { status: 400 },
      )
    }

    // Create quote
    const quote = await Quote.create({
      job: jobId,
      provider: userId,
      price,
      message,
      image,
    })

    // Add quote to user's quotes array
    await User.findByIdAndUpdate(userId, {
      $push: { quotes: quote._id },
    })

    // Populate provider info
    await quote.populate("provider", "name email avatar userType")

    // Create notification for job poster
    const notification = await Notification.create({
      recipient: job.postedBy,
      sender: userId,
      type: "quote",
      message: `You have received a new quote for your job "${job.title}".`,
      relatedId: quote._id,
      onModel: "Quote",
    })

    // Send real-time notification
    if (typeof window !== "undefined") {
      eventEmitter.emit(`notification_${job.postedBy}`, notification)
    }

    return NextResponse.json({
      success: true,
      message: "Quote submitted successfully",
      quote,
    })
  } catch (error) {
    console.error("Submit quote error:", error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}
