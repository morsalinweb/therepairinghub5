import { NextResponse } from "next/server"
import connectToDatabase from "../../../../lib/db"
import User from "../../../../models/User"
import { handleProtectedRoute } from "../../../../lib/auth"

// Get user by ID
export async function GET(req, { params }) {
  try {
    await connectToDatabase()

    // Check authentication
    const authResult = await handleProtectedRoute(req)
    if (!authResult.success) {
      return authResult
    }

    const userId = params.id

    // Find user
    const user = await User.findById(userId).select("-password")
    if (!user) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        userType: user.userType,
        bio: user.bio,
        avatar: user.avatar,
        services: user.services,
        status: user.status,
        createdAt: user.createdAt,
      },
    })
  } catch (error) {
    console.error("Get user error:", error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}

// Update user
export async function PUT(req, { params }) {
  try {
    await connectToDatabase()

    // Check authentication
    const authResult = await handleProtectedRoute(req)
    if (!authResult.success) {
      return authResult
    }

    const userId = params.id
    const { name, bio, avatar, services, phone } = await req.json()

    // Check if user is updating their own profile or is an admin
    if (authResult.user._id.toString() !== userId && authResult.user.userType !== "Admin") {
      return NextResponse.json({ success: false, message: "Not authorized to update this user" }, { status: 403 })
    }

    // Find user
    const user = await User.findById(userId)
    if (!user) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 })
    }

    // Update user fields
    if (name) user.name = name
    if (bio) user.bio = bio
    if (avatar) user.avatar = avatar
    if (services) user.services = services
    if (phone) user.phone = phone

    // Save updated user
    await user.save()

    return NextResponse.json({
      success: true,
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        userType: user.userType,
        bio: user.bio,
        avatar: user.avatar,
        services: user.services,
        phone: user.phone,
        status: user.status,
      },
    })
  } catch (error) {
    console.error("Update user error:", error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}

// Delete user
export async function DELETE(req, { params }) {
  try {
    await connectToDatabase()

    // Check authentication
    const authResult = await handleProtectedRoute(req)
    if (!authResult.success) {
      return authResult
    }

    const userId = params.id

    // Check if user is deleting their own account or is an admin
    if (authResult.user._id.toString() !== userId && authResult.user.userType !== "Admin") {
      return NextResponse.json({ success: false, message: "Not authorized to delete this user" }, { status: 403 })
    }

    // Find and delete user
    const user = await User.findByIdAndDelete(userId)
    if (!user) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: "User deleted successfully",
    })
  } catch (error) {
    console.error("Delete user error:", error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}
