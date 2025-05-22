import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import connectToDatabase from "@/lib/db"
import User from "@/models/User"
import { generateToken, setTokenCookie } from "@/lib/auth"

export async function POST(req) {
  try {
    await connectToDatabase()

    const { name, email, password, userType, phone } = await req.json()

    // Check if user already exists
    const userExists = await User.findOne({ email })
    if (userExists) {
      return NextResponse.json({ success: false, message: "User already exists" }, { status: 400 })
    }

    // Hash password
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)

    // Create user
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      userType,
      phone,
    })

    // Generate JWT token
    const token = generateToken(user._id)

    // Create response
    const response = NextResponse.json({
      success: true,
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        userType: user.userType,
      },
    })

    // Set token cookie
    setTokenCookie(response, token)

    return response
  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}
