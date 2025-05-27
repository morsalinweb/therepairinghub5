import { NextResponse } from "next/server"
import connectToDatabase from "../../../../lib/db"
import User from "../../../../models/User"
import { handleProtectedRoute } from "../../../../lib/auth"

// Force dynamic rendering
export const dynamic = "force-dynamic"

export async function GET(req) {
  try {
    await connectToDatabase()

    // Check authentication (optional for public provider listing)
    const authResult = await handleProtectedRoute(req, null, false)

    const { searchParams } = new URL(req.url)
    const search = searchParams.get("search")
    const skills = searchParams.get("skills")
    const limit = Number.parseInt(searchParams.get("limit") || "20")
    const page = Number.parseInt(searchParams.get("page") || "1")

    // Build query for providers
    const query = { userType: "Seller", status: "active" }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { bio: { $regex: search, $options: "i" } },
        { skills: { $regex: search, $options: "i" } },
      ]
    }

    if (skills) {
      query.skills = { $regex: skills, $options: "i" }
    }

    // Calculate pagination
    const skip = (page - 1) * limit

    // Get providers
    const providers = await User.find(query)
      .select("name bio avatar skills rating reviewCount totalEarnings createdAt")
      .sort({ rating: -1, reviewCount: -1 })
      .skip(skip)
      .limit(limit)

    // Get total count
    const total = await User.countDocuments(query)

    return NextResponse.json({
      success: true,
      count: providers.length,
      total,
      pagination: {
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
      providers,
    })
  } catch (error) {
    console.error("Get providers error:", error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}
