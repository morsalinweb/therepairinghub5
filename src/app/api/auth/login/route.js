import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import connectToDatabase from "@/lib/db"
import User from "@/models/User"

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

    const user = await User.findOne({ email })

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

    // Create JWT Token
    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET || "fallback_secret_do_not_use_in_production",
      { expiresIn: "7d" },
    )

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
      token: token,
    })
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
