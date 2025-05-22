import { NextResponse } from "next/server"
import connectToDatabase from "@/lib/db"
import User from "@/models/User"
import { verifyToken } from "@/lib/auth"

export async function GET(req) {
  try {
    await connectToDatabase()

    // Get token from Authorization header
    const authHeader = req.headers.get("Authorization")
    const headerToken = authHeader ? authHeader.split(" ")[1] : null

    // Get token from cookie
    const cookieToken = req.cookies.get("token")?.value

    // Use token from header or cookie
    const token = headerToken || cookieToken

    if (!token) {
      console.log("No token found in request")
      return NextResponse.json({ success: false, message: "Not authenticated" }, { status: 401 })
    }

    // Verify token
    const decoded = verifyToken(token)
    if (!decoded) {
      console.log("Invalid token")
      return NextResponse.json({ success: false, message: "Invalid token" }, { status: 401 })
    }

    // Find user by ID
    const user = await User.findById(decoded.userId)
    if (!user) {
      console.log("User not found for token")
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 })
    }

    // Return user data
    return NextResponse.json({
      success: true,
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        userType: user.userType,
        bio: user.bio,
        avatar: user.avatar,
        services: user.services,
        status: user.status,
        createdAt: user.createdAt,
      },
    })
  } catch (error) {
    console.error("Auth me error:", error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}
