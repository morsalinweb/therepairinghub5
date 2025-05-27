import { NextResponse } from "next/server"
import connectToDatabase from "../../../../lib/db"
import Job from "../../../../models/Job"
import { handleProtectedRoute } from "../../../../lib/auth"

// Force dynamic rendering
export const dynamic = "force-dynamic"

// Get all jobs (admin only)
export async function GET(req) {
  try {
    await connectToDatabase()

    // Check authentication
    const authResult = await handleProtectedRoute(req, ["Admin"])
    if (!authResult.success) {
      return authResult
    }

    // Get query parameters
    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status")
    const category = searchParams.get("category")
    const search = searchParams.get("search")
    const limit = Number.parseInt(searchParams.get("limit") || "20")
    const page = Number.parseInt(searchParams.get("page") || "1")

    // Build query
    const query = {}
    if (status) query.status = status
    if (category) query.category = category
    if (search) {
      query.$or = [{ title: { $regex: search, $options: "i" } }, { description: { $regex: search, $options: "i" } }]
    }

    // Calculate pagination
    const skip = (page - 1) * limit

    // Get jobs
    const jobs = await Job.find(query)
      .populate("postedBy", "name email")
      .populate("hiredProvider", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)

    // Get total count
    const total = await Job.countDocuments(query)

    return NextResponse.json({
      success: true,
      count: jobs.length,
      total,
      pagination: {
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
      jobs,
    })
  } catch (error) {
    console.error("Admin get jobs error:", error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}
