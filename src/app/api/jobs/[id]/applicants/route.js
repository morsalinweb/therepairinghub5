import { NextResponse } from "next/server"
import connectToDatabase from "../../../../../lib/db"
import Job from "../../../../../models/Job"
import User from "../../../../../models/User"
import { handleProtectedRoute } from "../../../../../lib/auth"

// Get applicants for a job
export async function GET(req, { params }) {
  try {
    await connectToDatabase()

    // Check authentication
    const authResult = await handleProtectedRoute(req)
    if (!authResult.success) {
      return authResult
    }

    const jobId = params.id

    // Find job
    const job = await Job.findById(jobId)
    if (!job) {
      return NextResponse.json({ success: false, message: "Job not found" }, { status: 404 })
    }

    // Check if user is the job poster or an admin
    if (job.postedBy.toString() !== authResult.user._id.toString() && authResult.user.userType !== "Admin") {
      return NextResponse.json(
        { success: false, message: "Not authorized to view applicants for this job" },
        { status: 403 },
      )
    }

    // Find all users who have applied for this job
    const applicants = await User.find({ "applications.job": jobId }, "name email phone avatar bio services location")

    return NextResponse.json({
      success: true,
      applicants,
    })
  } catch (error) {
    console.error("Get job applicants error:", error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}
