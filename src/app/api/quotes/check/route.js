import { NextResponse } from "next/server"
import connectToDatabase from "../../../../lib/db"
import User from "../../../../models/User"
import { handleProtectedRoute } from "../../../../lib/auth"

export async function GET(req) {
  try {
    await connectToDatabase()

    // Check authentication
    const authResult = await handleProtectedRoute(req)
    if (!authResult.success) {
      return authResult
    }

    // Get query parameters
    const { searchParams } = new URL(req.url)
    const jobId = searchParams.get("job")
    const userId = searchParams.get("user") || authResult.user._id

    // Validate input
    if (!jobId) {
      return NextResponse.json({ success: false, message: "Please provide job ID" }, { status: 400 })
    }

    // Check if user has submitted a quote for this job
    const user = await User.findById(userId)
    if (!user) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 })
    }

    const exists = user.quotedJobs.some((qj) => qj.job.toString() === jobId)

    return NextResponse.json({
      success: true,
      exists,
    })
  } catch (error) {
    console.error("Check quote error:", error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}
