import { NextResponse } from "next/server"
import connectToDatabase from "../../../../lib/db"
import Job from "../../../../models/Job"
import Quote from "../../../../models/Quote"
import { handleProtectedRoute } from "../../../../lib/auth"
import { broadcastJobUpdate } from "../../../../lib/websocket-utils"

// Get job by ID
export async function GET(req, { params }) {
  try {
    await connectToDatabase()

    // Check authentication
    const authResult = await handleProtectedRoute(req)
    if (!authResult.success) {
      return NextResponse.json({ success: false, message: authResult.message }, { status: authResult.status || 401 })
    }

    // Get job
    const job = await Job.findById(params.id)
      .populate("postedBy", "name email avatar")
      .populate("hiredProvider", "name email avatar")

    if (!job) {
      return NextResponse.json({ success: false, message: "Job not found" }, { status: 404 })
    }

    // Get quotes for this job
    const quotes = await Quote.find({ job: params.id }).populate("provider", "name email avatar")

    return NextResponse.json({
      success: true,
      job,
      quotes: quotes || [],
    })
  } catch (error) {
    console.error("Get job error:", error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}

// Update job
export async function PUT(req, { params }) {
  try {
    await connectToDatabase()

    // Check authentication
    const authResult = await handleProtectedRoute(req)
    if (!authResult.success) {
      return NextResponse.json({ success: false, message: authResult.message }, { status: authResult.status || 401 })
    }

    const jobId = params.id
    const updates = await req.json()

    // Get job
    const job = await Job.findById(jobId)
    if (!job) {
      return NextResponse.json({ success: false, message: "Job not found" }, { status: 404 })
    }

    // Check if user is the job poster or an admin
    if (job.postedBy.toString() !== authResult.user._id.toString() && authResult.user.userType !== "Admin") {
      return NextResponse.json({ success: false, message: "Not authorized to update this job" }, { status: 403 })
    }

    // Update job
    const updatedJob = await Job.findByIdAndUpdate(jobId, updates, { new: true })
      .populate("postedBy", "name email avatar")
      .populate("hiredProvider", "name email avatar")

    // Broadcast job update via WebSocket
    try {
      broadcastJobUpdate(jobId, { action: "updated", job: updatedJob })
    } catch (error) {
      console.error("Error broadcasting job update:", error)
      // Non-critical error, continue execution
    }

    return NextResponse.json({
      success: true,
      job: updatedJob,
    })
  } catch (error) {
    console.error("Update job error:", error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}

// Delete job
export async function DELETE(req, { params }) {
  try {
    await connectToDatabase()

    // Check authentication
    const authResult = await handleProtectedRoute(req)
    if (!authResult.success) {
      return NextResponse.json({ success: false, message: authResult.message }, { status: authResult.status || 401 })
    }

    const jobId = params.id

    // Get job
    const job = await Job.findById(jobId)
    if (!job) {
      return NextResponse.json({ success: false, message: "Job not found" }, { status: 404 })
    }

    // Check if user is the job poster or an admin
    if (job.postedBy.toString() !== authResult.user._id.toString() && authResult.user.userType !== "Admin") {
      return NextResponse.json({ success: false, message: "Not authorized to delete this job" }, { status: 403 })
    }

    // Check if job can be deleted
    if (job.status !== "active" && job.status !== "cancelled") {
      return NextResponse.json(
        { success: false, message: "Cannot delete a job that is in progress or completed" },
        { status: 400 },
      )
    }

    // Delete job
    await Job.findByIdAndDelete(jobId)

    // Delete associated quotes
    await Quote.deleteMany({ job: jobId })

    // Broadcast job deletion via WebSocket
    try {
      broadcastJobUpdate(jobId, { action: "deleted", jobId })
    } catch (error) {
      console.error("Error broadcasting job deletion:", error)
      // Non-critical error, continue execution
    }

    return NextResponse.json({
      success: true,
      message: "Job deleted successfully",
    })
  } catch (error) {
    console.error("Delete job error:", error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}
