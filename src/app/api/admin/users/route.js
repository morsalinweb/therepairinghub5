import { NextResponse } from "next/server"
import connectToDatabase from "../../../../lib/db"
import User from "../../../../models/User"
import { handleProtectedRoute } from "../../../../lib/auth"

// Force dynamic rendering
export const dynamic = "force-dynamic"

// Get all users (admin only)
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
    const userType = searchParams.get("userType")
    const status = searchParams.get("status")
    const search = searchParams.get("search")
    const limit = Number.parseInt(searchParams.get("limit") || "20")
    const page = Number.parseInt(searchParams.get("page") || "1")

    // Build query
    const query = {}
    if (userType) query.userType = userType
    if (status) query.status = status
    if (search) {
      query.$or = [{ name: { $regex: search, $options: "i" } }, { email: { $regex: search, $options: "i" } }]
    }

    // Calculate pagination
    const skip = (page - 1) * limit

    // Get users
    const users = await User.find(query).select("-password").sort({ createdAt: -1 }).skip(skip).limit(limit)

    // Get total count
    const total = await User.countDocuments(query)

    return NextResponse.json({
      success: true,
      count: users.length,
      total,
      pagination: {
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
      users,
    })
  } catch (error) {
    console.error("Admin get users error:", error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}
