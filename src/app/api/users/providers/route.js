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
    const userType = searchParams.get("userType")
    const services = searchParams.get("services")
    const location = searchParams.get("location")
    const limit = Number.parseInt(searchParams.get("limit") || "50")
    const page = Number.parseInt(searchParams.get("page") || "1")
    const skip = (page - 1) * limit

    // Build query
    const query = {}

    if (userType) {
      query.userType = userType
    }

    if (services) {
      query.services = { $regex: services, $options: "i" }
    }

    if (location) {
      query.location = { $regex: location, $options: "i" }
    }

    // Get users
    const users = await User.find(query)
      .select("name email avatar bio services location userType")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)

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
    console.error("Get users error:", error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}
