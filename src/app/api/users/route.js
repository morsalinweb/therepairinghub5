import { NextResponse } from "next/server"
import connectToDatabase from "@/lib/db"
import User from "@/models/User"
import bcrypt from "bcryptjs"

// Create a new user
export async function POST(req) {
  try {
    await connectToDatabase()

    const userData = await req.json()

    // Check if user already exists
    const existingUser = await User.findOne({ email: userData.email })

    if (existingUser) {
      return NextResponse.json({ success: false, message: "User already exists with this email" }, { status: 400 })
    }

    // Hash password if provided
    if (userData.password) {
      const salt = await bcrypt.genSalt(10)
      userData.password = await bcrypt.hash(userData.password, salt)
    }

    // Create user
    const user = await User.create({
      name: userData.name,
      email: userData.email,
      phone: userData.phone,
      userType: userData.userType,
      password: userData.password,
      clerkId: userData.clerkId,
      isActive: true,
      status: "active",
    })

    // Remove password from response
    const userResponse = user.toObject()
    delete userResponse.password

    return NextResponse.json({ success: true, user: userResponse })
  } catch (error) {
    console.error("Error creating user:", error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}

// Get all users (admin only)
export async function GET(req) {
  try {
    await connectToDatabase()

    // Check if user is admin (implement your auth check here)
    // const { searchParams } = new URL(req.url)
    // const isAdmin = await checkIfAdmin(req)

    // if (!isAdmin) {
    //   return NextResponse.json({ success: false, message: "Not authorized" }, { status: 403 })
    // }

    const users = await User.find().select("-password")

    return NextResponse.json({ success: true, users })
  } catch (error) {
    console.error("Error fetching users:", error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}
