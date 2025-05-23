// api/auth/login/route.js
import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import connectToDatabase from "@/lib/db"
import User from "@/models/User"
import { generateToken, setTokenCookie } from "@/lib/auth"

export async function POST(req) {
  try {
    await connectToDatabase()

    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json(
        {
          success: false,
          message: "Please provide email and password",
        },
        { status: 400 },
      )
    }

    // const user = await User.findOne({ email }).select("+password")

    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid credentials",
        },
        { status: 401 },
      )
    }

    // Make sure user.password exists before comparing
    if (!user.password) {
      return NextResponse.json(
        {
          success: false,
          message: "Account error. Please contact support.",
        },
        { status: 500 },
      )
    }

    const isPasswordMatched = await bcrypt.compare(password, user.password)

    if (!isPasswordMatched) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid credentials",
        },
        { status: 401 },
      )
    }

    // Generate JWT token using the same function as registration
    const token = generateToken(user._id)

    // Create response with same structure as registration
    const response = NextResponse.json({
      success: true,
      token,
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

    // Set token cookie - this is crucial for frontend authentication
    setTokenCookie(response, token)

    return response
  } catch (error) {
    console.error("LOGIN_ERROR", error)
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Internal Server Error",
      },
      { status: 500 },
    )
  }
}