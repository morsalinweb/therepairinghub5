import { NextResponse } from "next/server"
import connectToDatabase from "../../../../lib/db"
import User from "../../../../models/User"
import { generateToken, setTokenCookie } from "../../../../lib/auth"

export async function POST(req) {
  try {
    await connectToDatabase()

    const { email, password } = await req.json()

    // Validate input
    if (!email || !password) {
      return NextResponse.json({ success: false, message: "Please provide email and password" }, { status: 400 })
    }

    // Find user
    const user = await User.findOne({ email }).select("+password")
    if (!user) {
      return NextResponse.json({ success: false, message: "Invalid credentials" }, { status: 401 })
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password)
    if (!isMatch) {
      return NextResponse.json({ success: false, message: "Invalid credentials" }, { status: 401 })
    }

    // Check if user is active - check both status and isActive fields for compatibility
    if ((user.status && user.status !== "active") || user.isActive === false) {
      // Automatically activate the account if it's inactive
      user.isActive = true
      if (user.status) user.status = "active"
      await user.save()

      // Continue with login since we've activated the account
    }

    // Generate token
    const token = generateToken(user._id)

    // Create response
    const response = NextResponse.json({
      success: true,
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        userType: user.userType,
      },
    })

    // Set token cookie
    setTokenCookie(response, token)

    return response
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}
