import { NextResponse } from "next/server"
import connectToDatabase from "@/lib/db"
import Job from "@/models/Job"
import { handleProtectedRoute } from "@/lib/auth"

export async function GET(req, { params }) {
  try {
    await connectToDatabase()

    // Check authentication
    const authResult = await handleProtectedRoute(req)
    if (!authResult.success) {
      return NextResponse.json({ success: false, message: authResult.message }, { status: 401 })
    }

    const userId = params.id
    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status")
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "10")

    // Build query
    const query = { postedBy: userId }
    if (status) query.status = status

    // Get total count
    const total = await Job.countDocuments(query)

    // Get jobs with pagination
    const jobs = await Job.find(query)
      .populate({
        path: "postedBy",
        select: "name avatar",
      })
      .populate({
        path: "hiredProvider",
        select: "name avatar rating",
      })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)

    return NextResponse.json({
      success: true,
      jobs,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Get user jobs error:", error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}
