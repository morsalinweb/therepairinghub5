import { NextResponse } from "next/server"
import { clerkClient } from "@clerk/clerk-sdk-node"
import connectToDatabase from "../../../../lib/db"
import User from "../../../../models/User"
import DeletedUser from "../../../../models/DeletedUser"
import { auth } from "@clerk/nextjs/server"

// Get user by ID
export async function GET(req, { params }) {
  try {
    await connectToDatabase()

    const { id } = params

    // Find user in our database
    const user = await User.findOne({ clerkId: id }).select("-password")

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
        clerkId: user.clerkId,
        phone: user.phone,
        paypalEmail: user.paypalEmail,
      },
    })
  } catch (error) {
    console.error("Error fetching user:", error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}

// Update user
export async function PUT(req, { params }) {
  try {
    await connectToDatabase()
    const { userId } = auth()

    if (!userId) {
      return NextResponse.json({ success: false, message: "Not authenticated" }, { status: 401 })
    }

    const { id } = params
    const data = await req.json()

    // Security check - users can only update their own profile unless they're an admin
    const requestingUser = await User.findOne({ clerkId: userId })
    if (id !== userId && requestingUser.userType !== "Admin") {
      return NextResponse.json({ success: false, message: "Not authorized to update this user" }, { status: 403 })
    }

    // Find and update user
    const user = await User.findOneAndUpdate(
      { clerkId: id },
      { $set: data },
      { new: true, runValidators: true },
    ).select("-password")

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
        phone: user.phone,
        status: user.status,
        clerkId: user.clerkId,
        paypalEmail: user.paypalEmail,
      },
    })
  } catch (error) {
    console.error("Error updating user:", error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}

// Delete user
export async function DELETE(req, { params }) {
  try {
    await connectToDatabase()
    const { userId } = auth()

    if (!userId) {
      return NextResponse.json({ success: false, message: "Not authenticated" }, { status: 401 })
    }

    const { id } = params

    // Security check - users can only delete their own account unless they're an admin
    const requestingUser = await User.findOne({ clerkId: userId })
    if (id !== userId && requestingUser.userType !== "Admin") {
      return NextResponse.json({ success: false, message: "Not authorized to delete this user" }, { status: 403 })
    }

    // Find user
    const user = await User.findOne({ clerkId: id })

    if (!user) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 })
    }

    // Create a record in DeletedUser collection
    await DeletedUser.create({
      name: user.name,
      email: user.email,
      userType: user.userType,
      phone: user.phone,
      clerkId: user.clerkId,
      deletedAt: new Date(),
      metadata: {
        address: user.address,
        bio: user.bio,
        skills: user.skills,
      },
    })

    // Delete user from our database
    await User.findByIdAndDelete(user._id)

    // Delete user from Clerk
    try {
      await clerkClient.users.deleteUser(id)
    } catch (clerkError) {
      console.error("Error deleting user from Clerk:", clerkError)
      // Continue with the process even if Clerk deletion fails
    }

    return NextResponse.json({ success: true, message: "User deleted successfully" })
  } catch (error) {
    console.error("Error deleting user:", error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}
