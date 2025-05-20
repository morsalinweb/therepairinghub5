import { NextResponse } from "next/server"
import connectToDatabase from "../../../../lib/db"
import { handleProtectedRoute } from "../../../../lib/auth"
import { auth } from "@clerk/nextjs/server"
import User from "../../../../models/User"

export async function GET(req) {
  try {
    await connectToDatabase()

    // Try to get user from Clerk first
    const { userId } = auth()

    if (userId) {
      // Find user in our database
      const user = await User.findOne({ clerkId: userId }).select("-password")

      if (user) {
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
            clerkId: user.clerkId,
          },
        })
      }
    }

    // Fallback to JWT token authentication
    const authResult = await handleProtectedRoute(req)
    if (!authResult.success) {
      return NextResponse.json({ success: false, message: authResult.message }, { status: 401 })
    }

    // Return user data
    return NextResponse.json({
      success: true,
      user: {
        _id: authResult.user._id,
        email: authResult.user.email,
        name: authResult.user.name,
        phone: authResult.user.phone,
        userType: authResult.user.userType,
        bio: authResult.user.bio,
        avatar: authResult.user.avatar,
        services: authResult.user.services,
        status: authResult.user.status,
        createdAt: authResult.user.createdAt,
      },
    })
  } catch (error) {
    console.error("Get user error:", error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}
