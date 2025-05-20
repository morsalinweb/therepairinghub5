// api/auth/register/route.js
import { NextResponse } from "next/server"
import connectToDatabase from "../../../../lib/db"
import User from "../../../../models/User"
import { generateToken } from "../../../../lib/auth"

export async function POST(req) {
  try {
    await connectToDatabase()

    const { name, email, password, userType } = await req.json()

    // Check if user already exists
    const userExists = await User.findOne({ email })
    if (userExists) {
      return NextResponse.json({ success: false, message: "User with this email already exists" }, { status: 400 })
    }

    // Create user with empty arrays for relationships
    const user = await User.create({
      name,
      email,
      password,
      userType: userType || "Buyer",
      isActive: true,
      postedJobs: [],
      quotes: [],
      reviews: [],
      conversations: [],
      notifications: [],
      savedJobs: [],
      transactions: [],
    })

    // Generate token
    const token = generateToken(user._id)

    // Set cookie
    const response = NextResponse.json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        userType: user.userType,
        avatar: user.avatar,
        isActive: user.isActive,
      },
    })

    // Set cookie with token
    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: "/",
    })

    return response
  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}
