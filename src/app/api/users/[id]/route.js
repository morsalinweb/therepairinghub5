// api/users/[id]/route.js
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
        skills: user.skills,
        phone: user.phone,
        address: user.address,
        paypalEmail: user.paypalEmail,
        rating: user.rating,
        reviewCount: user.reviewCount,
        status: user.status,
        availableBalance: user.availableBalance,
        totalEarnings: user.totalEarnings,
        totalSpending: user.totalSpending,
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
    const updateData = await req.json()
    const { name, bio, avatar, services, skills, phone, address, paypalEmail, currentPassword, newPassword } =
      updateData

    // Check if user is updating their own profile or is an admin
    if (authResult.user._id.toString() !== userId && authResult.user.userType !== "Admin") {
      return NextResponse.json({ success: false, message: "Not authorized to update this user" }, { status: 403 })
    }

    // Find user with password for password change
    const user = await User.findById(userId).select("+password")
    if (!user) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 })
    }

    // Handle password change
    if (currentPassword && newPassword) {
      const isCurrentPasswordValid = await user.matchPassword(currentPassword)
      if (!isCurrentPasswordValid) {
        return NextResponse.json({ success: false, message: "Current password is incorrect" }, { status: 400 })
      }

      if (newPassword.length < 6) {
        return NextResponse.json(
          { success: false, message: "New password must be at least 6 characters" },
          { status: 400 },
        )
      }

      user.password = newPassword // This will trigger the pre-save hook to hash it
    }

    // Update other user fields
    if (name !== undefined) user.name = name
    if (bio !== undefined) user.bio = bio
    if (avatar !== undefined) user.avatar = avatar
    if (services !== undefined) user.services = Array.isArray(services) ? services : []
    if (skills !== undefined) user.skills = Array.isArray(skills) ? skills : []
    if (phone !== undefined) user.phone = phone
    if (address !== undefined) user.address = address
    if (paypalEmail !== undefined) user.paypalEmail = paypalEmail

    // Save updated user
    await user.save()

    // Return user without password
    const updatedUser = await User.findById(userId).select("-password")

    return NextResponse.json({
      success: true,
      user: {
        _id: updatedUser._id,
        email: updatedUser.email,
        name: updatedUser.name,
        userType: updatedUser.userType,
        bio: updatedUser.bio,
        avatar: updatedUser.avatar,
        services: updatedUser.services,
        skills: updatedUser.skills,
        phone: updatedUser.phone,
        address: updatedUser.address,
        paypalEmail: updatedUser.paypalEmail,
        rating: updatedUser.rating,
        reviewCount: updatedUser.reviewCount,
        status: updatedUser.status,
        availableBalance: updatedUser.availableBalance,
        totalEarnings: updatedUser.totalEarnings,
        totalSpending: updatedUser.totalSpending,
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
