import { NextResponse } from "next/server"
import connectToDatabase from "../../../../../lib/db"
import User from "../../../../../models/User"
import { handleProtectedRoute } from "../../../../../lib/auth"

export async function PUT(req, { params }) {
  try {
    await connectToDatabase()

    // Check authentication
    const authResult = await handleProtectedRoute(req)
    if (!authResult.success) {
      return authResult
    }

    const userId = params.id
    const { avatar } = await req.json()

    // Check if user is updating their own avatar or is an admin
    if (authResult.user._id.toString() !== userId && authResult.user.userType !== "Admin") {
      return NextResponse.json({ success: false, message: "Not authorized to update this user" }, { status: 403 })
    }

    // Find user
    const user = await User.findById(userId)
    if (!user) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 })
    }

    // Update avatar
    user.avatar = avatar
    await user.save()

    return NextResponse.json({
      success: true,
      message: "Avatar updated successfully",
      user: {
        _id: user._id,
        avatar: user.avatar,
      },
    })
  } catch (error) {
    console.error("Update avatar error:", error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}
