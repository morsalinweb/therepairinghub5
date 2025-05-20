import { NextResponse } from "next/server"
import connectToDatabase from "@/lib/db"
import User from "@/models/User"

export async function GET(req, { params }) {
  try {
    await connectToDatabase()

    const clerkId = params.id

    if (!clerkId) {
      return NextResponse.json({ success: false, message: "Clerk ID is required" }, { status: 400 })
    }

    console.log("Looking up user with Clerk ID:", clerkId)

    // Find user by Clerk ID
    const user = await User.findOne({ clerkId })

    if (!user) {
      console.log("User not found with Clerk ID:", clerkId)
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 })
    }

    console.log("Found user:", user._id)

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
        clerkId: user.clerkId,
        skills: user.skills,
        paypalEmail: user.paypalEmail,
      },
    })
  } catch (error) {
    console.error("Get user by Clerk ID error:", error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}
